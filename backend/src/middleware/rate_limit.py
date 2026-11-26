"""Sliding-window rate limiting backed by Redis, with an in-process fallback."""

from __future__ import annotations

import collections
import hashlib
import ipaddress
import logging
import time
from collections.abc import Callable
from typing import Protocol

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger(__name__)


def parse_rate_limit(limit_str: str) -> tuple[int, float]:
    parts = limit_str.split("/")
    if len(parts) != 2:
        raise ValueError(f"Formato de rate limit invalido: {limit_str}")
    count = int(parts[0])
    unit = parts[1].strip().lower()
    seconds = {
        "s": 1.0, "sec": 1.0, "second": 1.0, "seconds": 1.0,
        "segundo": 1.0, "segundos": 1.0,
        "m": 60.0, "min": 60.0, "minute": 60.0, "minutes": 60.0,
        "minuto": 60.0, "minutos": 60.0,
        "h": 3600.0, "hr": 3600.0, "hour": 3600.0, "hours": 3600.0,
        "hora": 3600.0, "horas": 3600.0,
        "d": 86400.0, "day": 86400.0, "days": 86400.0, "dia": 86400.0, "dias": 86400.0,
    }
    if count <= 0 or unit not in seconds:
        raise ValueError(f"Límite inválido: {limit_str}")
    return count, seconds[unit]


class RateLimitStore(Protocol):
    async def hit(self, key: str, limit: int, window: float) -> tuple[bool, int, int]: ...


class MemoryStore:
    """Fallback para desarrollo aislado y tests; no distribuye estado entre procesos."""

    def __init__(self) -> None:
        self._history: dict[str, collections.deque[float]] = collections.defaultdict(collections.deque)

    async def hit(self, key: str, limit: int, window: float) -> tuple[bool, int, int]:
        now = time.time()
        queue = self._history[key]
        cutoff = now - window
        while queue and queue[0] <= cutoff:
            queue.popleft()
        if len(queue) >= limit:
            retry = max(1, int(window - (now - queue[0])))
            return False, 0, retry
        queue.append(now)
        return True, max(0, limit - len(queue)), 0


_REDIS_SLIDING_WINDOW = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
local count = redis.call('ZCARD', key)
if count >= limit then
  local first = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  return {0, 0, math.max(1, math.ceil(window - (now - tonumber(first[2]))))}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
return {1, limit - count - 1, 0}
"""


class RedisStore:
    def __init__(self, redis_url: str) -> None:
        from redis.asyncio import Redis

        self.client = Redis.from_url(redis_url, decode_responses=True)

    async def hit(self, key: str, limit: int, window: float) -> tuple[bool, int, int]:
        import uuid

        now_ms = int(time.time() * 1000)
        result = await self.client.eval(
            _REDIS_SLIDING_WINDOW,
            1,
            f"styleme:ratelimit:{key}",
            now_ms,
            int(window * 1000),
            limit,
            f"{now_ms}:{uuid.uuid4().hex}",
        )
        return bool(int(result[0])), int(result[1]), int(result[2])


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        limits: dict[str, str] | None = None,
        redis_url: str | None = None,
        trusted_proxy_ips: tuple[str, ...] = (),
        store: RateLimitStore | None = None,
    ) -> None:
        super().__init__(app)
        self.limits: dict[str, tuple[int, float]] = {}
        for route, value in (limits or {}).items():
            parsed = parse_rate_limit(value)
            clean = route.rstrip("/")
            self.limits[clean] = parsed
            if not clean.startswith("/api/v1"):
                self.limits[f"/api/v1{clean}"] = parsed
        self.trusted_proxy_ips = tuple(ipaddress.ip_network(v, strict=False) for v in trusted_proxy_ips)
        self.store: RateLimitStore = store or (RedisStore(redis_url) if redis_url else MemoryStore())
        self.fallback_store = MemoryStore()

    def _get_client_identifier(self, request: Request) -> str:
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            token_hash = hashlib.sha256(auth[7:].encode()).hexdigest()
            return f"user:{token_hash}"

        peer = request.client.host if request.client else "127.0.0.1"
        try:
            peer_ip = ipaddress.ip_address(peer)
            trusted = any(peer_ip in network for network in self.trusted_proxy_ips)
        except ValueError:
            trusted = False
        forwarded = request.headers.get("x-forwarded-for")
        if trusted and forwarded:
            return f"ip:{forwarded.split(',')[0].strip()}"
        return f"ip:{peer}"

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.method not in ("POST", "PUT", "PATCH", "DELETE"):
            return await call_next(request)
        path = request.url.path.rstrip("/")
        match = next(((route, val) for route, val in self.limits.items()
                      if path == route or path.endswith(route)), None)
        if match is None:
            return await call_next(request)
        route, (limit, window) = match
        tracker_key = f"{self._get_client_identifier(request)}:{route}"
        try:
            allowed, remaining, retry_after = await self.store.hit(tracker_key, limit, window)
        except Exception as exc:  # noqa: BLE001 - Redis failures use the documented local fallback.
            logger.warning("Rate limit Redis no disponible; fallback local temporal: %s", exc)
            self.store = self.fallback_store
            allowed, remaining, retry_after = await self.store.hit(tracker_key, limit, window)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": f"Límite excedido para {route}; reintenta en {retry_after}s."},
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time() + retry_after)),
                },
            )
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
