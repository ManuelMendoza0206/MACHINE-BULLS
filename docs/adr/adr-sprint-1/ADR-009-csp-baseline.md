# ADR 009 — CSP baseline con `'unsafe-inline'` en `script-src`

Estado: aceptado
Fecha: 2026-08-31

## Contexto

El scaffold necesitaba una Content-Security-Policy real desde Sprint 0, no un placeholder.
Next.js inyecta scripts de arranque inline (hidratación, RSC payload) y el proyecto usa rutas
prerenderizadas estáticamente. Una CSP estricta basada en nonce + `strict-dynamic` para
`script-src` exige inyectar un nonce por request, lo que requiere renderizado dinámico — rompe
la hidratación de las rutas estáticas sin forzarlas todas a dinámicas primero. Commit `9366b6d`
("FIX(P0#2-P0#9): Real fixes for blockers") introduce una primera CSP con `unsafe-inline`;
commit `5333dd8` ("chore(sprint-0): make the scaffold actually build...", 31-ago-2026) la deja
como baseline enforced (con el resto de headers de seguridad — `X-Content-Type-Options`,
`X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`).

## Decision

`next.config.js` aplica una CSP enforced (no report-only) con `default-src 'self'`,
`frame-ancestors 'none'`, `object-src 'none'`, `img-src` acotado a Cloudinary, `connect-src`
acotado a la API propia + Supabase — pero `script-src` conserva `'self' 'unsafe-inline'`
(`'unsafe-eval'` solo en dev). El código deja escrito el motivo en un comentario junto a la
constante `csp`, no solo en este documento.

## Alternativas

Nonce + `strict-dynamic` en `script-src` — la alternativa más segura — se evaluó explícitamente
y se descartó para el scaffold por el conflicto con el prerender estático descrito arriba, no
por desconocerla. Queda como *follow-up* explícito, no como decisión cerrada: endurecerla vía
`middleware.ts`/`proxy.ts` en las rutas autenticadas (dinámicas), donde inyectar un nonce por
request no rompe nada.

## Consecuencias

El sitio queda protegido contra la mayoría de vectores de inyección de contenido/clickjacking
(`frame-ancestors`, `object-src`, headers de seguridad estándar), pero `'unsafe-inline'` en
`script-src` significa que la CSP **no** mitiga XSS vía inyección de `<script>` inline si
existiera un vector — la protección real contra XSS en este proyecto sigue dependiendo de que
React escape el DOM correctamente, no de la CSP. Esto es una brecha conocida y aceptada, no
accidental. Pendiente (dueño: track de infra, no asignado a un sprint concreto todavía):
mover `script-src` a nonce + `strict-dynamic` en las rutas autenticadas.
