# Base image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps --loglevel=error

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
ARG DEPLOYMENT_VERSION
ENV DEPLOYMENT_VERSION=${DEPLOYMENT_VERSION}
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED=1

# Dummy DATABASE_URL for build time (Prisma requirement)
# If your build needs to fetch real data from DB, this might still fail.
ENV DATABASE_URL="mysql://riwaya_user:riwaya_pass@127.0.0.1:3906/riwaya_db"

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
# Ensure no stale host cache is present if .dockerignore failed
RUN rm -rf .next
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

RUN apk add --no-cache mysql-client perl exiftool su-exec libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Créer tous les sous-dossiers d'upload avec les bonnes permissions
RUN mkdir -p .next \
    public/uploads/books \
    public/uploads/posts \
    public/uploads/marketing \
    public/uploads/creatives \
    public/uploads/videos \
    backups \
    && chown -R nextjs:nodejs .next public/uploads backups

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Entrypoint: crée les dossiers d'upload puis démarre
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
