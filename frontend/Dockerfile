# syntax=docker/dockerfile:1

ARG BUN_VERSION=1.4.2

FROM oven/bun:${BUN_VERSION}
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["bun", "dev"]
