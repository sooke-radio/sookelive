
# Dockerfile based on pnpm recommended dockerfile for node.
# DB container must be running first.
# NextJS standalone output is not currently working, so use this instead of the nextjs example.

# for further discussion see: https://github.com/payloadcms/payload/discussions/7423#discussioncomment-10235308

# Base w/ corepack
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
ARG MIGRATE
ARG DATABASE_URI

# Install dependencies only when needed
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

# Add these lines to install Sharp dependencies
RUN apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev nasm

#copy app files
COPY . /app
WORKDIR /app

# INSTALL prod dependencies
FROM base AS install

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# BUILD NextJS for Prod
FROM base AS build

ARG DATABASE_URI
ENV DATABASE_URI=$DATABASE_URI

RUN NODE_ENV=production

COPY --from=install /app/node_modules /app/node_modules

# if migrate is true, run payload migration
# RUN if [[ -z "$MIGRATE" ]] ; then pnpm migrate ; else echo "No migration." ; fi

# build app
RUN pnpm build;


# Copy built app and RUN
FROM base

COPY --from=install /app/node_modules /app/node_modules
COPY --from=build /app/.next /app/.next

EXPOSE $EXPOSE_PORT
CMD [ "pnpm", "start"]