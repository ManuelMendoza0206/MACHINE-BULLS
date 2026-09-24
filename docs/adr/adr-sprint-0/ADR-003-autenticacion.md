# ADR 003 — Autenticación: Supabase Auth

Estado: aceptado
Fecha: 2026-08-26

## Contexto

El modelo User en plan-base.md sección 10.1 no define password_hash. El proyecto ya usa PostgreSQL con pgvector en Supabase.

## Decision

Usamos Supabase Auth. El frontend registra y autentica con @supabase/ssr. Cada inserción en auth.users crea la fila correspondiente en public.User mediante un trigger en la base de datos.

## Alternativas

Una autenticación artesanal con tablas propias, hash con bcrypt y rotación manual queda descartada. Construir el flujo de registro, login, recuperación de contraseña y renovación de sesión consume tiempo de sprint y abre vectores de ataque que ya están resueltos en un servicio probado.

## Consecuencias

No mantenemos lógica de contraseñas. La sincronización por trigger evita el estado intermedio de usuario autenticado sin fila en public.User. Dependemos de las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY y de un degradé a modo público cuando faltan.

