# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.4.2
WORKDIR /usr/src/app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000/tcp
CMD ["bun", "run", "start:dev"]
