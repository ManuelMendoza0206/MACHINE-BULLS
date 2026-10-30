# syntax=docker/dockerfile:1
# StyleMe frontend — Next.js (App Router).
#
# Next inlinea las NEXT_PUBLIC_* en BUILD time (van al bundle del navegador),
# así que van como ARG/ENV antes de `next build`. El navegador habla con
# http://localhost:8000 directamente: no hay proxy ni runtime rewriting.
FROM node:20-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ARG NEXT_PUBLIC_VTON_POLL_TIMEOUT_MS=90000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_VTON_POLL_TIMEOUT_MS=$NEXT_PUBLIC_VTON_POLL_TIMEOUT_MS

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
