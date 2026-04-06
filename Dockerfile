FROM node:20-alpine AS base
RUN npm install -g pnpm

# ── deps: install all dependencies ────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── builder: compile Next.js ───────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# Railway passes Variables as Docker build args — declare them so Next.js
# can bake NEXT_PUBLIC_* values into the client bundle at build time.
ARG NEXT_PUBLIC_PRIVY_APP_ID
ENV NEXT_PUBLIC_PRIVY_APP_ID=$NEXT_PUBLIC_PRIVY_APP_ID
ARG NEXT_PUBLIC_RPC_URL
ENV NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL
ARG NEXT_PUBLIC_CHAIN_ID
ENV NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID
ARG NEXT_PUBLIC_MARKET_CONTRACT
ENV NEXT_PUBLIC_MARKET_CONTRACT=$NEXT_PUBLIC_MARKET_CONTRACT
ARG NEXT_PUBLIC_FACTORY_CONTRACT
ENV NEXT_PUBLIC_FACTORY_CONTRACT=$NEXT_PUBLIC_FACTORY_CONTRACT
ARG NEXT_PUBLIC_POSITIONS_CONTRACT
ENV NEXT_PUBLIC_POSITIONS_CONTRACT=$NEXT_PUBLIC_POSITIONS_CONTRACT
ARG NEXT_PUBLIC_ORACLE_URL
ENV NEXT_PUBLIC_ORACLE_URL=$NEXT_PUBLIC_ORACLE_URL
ARG NEXT_PUBLIC_RISK_URL
ENV NEXT_PUBLIC_RISK_URL=$NEXT_PUBLIC_RISK_URL
ARG NEXT_PUBLIC_INTELLIGENCE_URL
ENV NEXT_PUBLIC_INTELLIGENCE_URL=$NEXT_PUBLIC_INTELLIGENCE_URL
ARG NEXT_PUBLIC_ENABLED_PLATFORMS
ENV NEXT_PUBLIC_ENABLED_PLATFORMS=$NEXT_PUBLIC_ENABLED_PLATFORMS
ARG NEXT_PUBLIC_METAMASK_ANALYTICS_ENDPOINT
ENV NEXT_PUBLIC_METAMASK_ANALYTICS_ENDPOINT=$NEXT_PUBLIC_METAMASK_ANALYTICS_ENDPOINT

RUN pnpm build

# ── runner: minimal production image ──────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Static assets
COPY --from=builder /app/public ./public

# Give ownership of .next to nextjs user
RUN mkdir .next && chown nextjs:nodejs .next

# Standalone output — everything the server needs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Railway injects PORT; fallback to 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000
CMD ["node", "server.js"]
