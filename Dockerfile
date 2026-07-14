
# Dockerfile based on pnpm recommended dockerfile for node.
# DB container must be running first.
# NextJS standalone output is not currently working, so use this instead of the nextjs example.

# for further discussion see: https://github.com/payloadcms/payload/discussions/7423#discussioncomment-10235308

# Base w/ corepack + build tools (needed for Sharp)
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apk add --no-cache libc6-compat build-base gcc autoconf automake zlib-dev libpng-dev nasm

WORKDIR /app

# Install dependencies — copy only lockfile + manifest so this layer caches across code-only changes
FROM base AS install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build NextJS for prod
FROM base AS build
ARG DATABASE_URI
ENV DATABASE_URI=$DATABASE_URI
ENV NODE_ENV=production

COPY . .
COPY --from=install /app/node_modules ./node_modules

# if migrate is true, run payload migration
# RUN if [[ -z "$MIGRATE" ]] ; then pnpm migrate ; else echo "No migration." ; fi

RUN pnpm build

# Runtime stage — lean image without build tools
FROM node:22-alpine AS run
RUN apk add --no-cache libc6-compat

WORKDIR /app
ENV NODE_OPTIONS=--no-deprecation

COPY --from=install /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY package.json ./

EXPOSE $EXPOSE_PORT
# Invoke next directly instead of `pnpm start` — pnpm's implicit
# "verify deps before run" check re-triggers a real `pnpm install` on every
# container start (this stage has no pnpm-lock.yaml/pnpm-workspace.yaml to
# satisfy it), which re-downloads pnpm via corepack and re-hits the
# ignored-builds gate. Dependencies are already baked into node_modules above.
CMD ["node_modules/.bin/next", "start"]
