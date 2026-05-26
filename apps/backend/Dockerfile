FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /repo

COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY apps/backend/package.json apps/backend/tsconfig.json apps/backend/tsconfig.build.json apps/backend/nest-cli.json apps/backend/

RUN pnpm install --frozen-lockfile=false

COPY packages/shared/src packages/shared/src
COPY apps/backend/src apps/backend/src

RUN pnpm --filter @ct-agent/shared build \
    && pnpm --filter backend build

FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /repo

ENV NODE_ENV=production

COPY --from=builder /repo/pnpm-workspace.yaml /repo/package.json /repo/tsconfig.base.json ./
COPY --from=builder /repo/packages/shared/package.json packages/shared/
COPY --from=builder /repo/packages/shared/dist packages/shared/dist
COPY --from=builder /repo/apps/backend/package.json apps/backend/
COPY --from=builder /repo/apps/backend/dist apps/backend/dist

RUN pnpm install --prod --frozen-lockfile=false

EXPOSE 3000

WORKDIR /repo/apps/backend
CMD ["node", "dist/main.js"]
