# Multi-stage build for optimized production image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set production environment variables for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Set all NEXT_PUBLIC_ vars at build time
ENV NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDT960YVCmsPyKDaj47k586y9K6DCkKZyo
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=inspira-grid-c2e1a.firebaseapp.com
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=inspira-grid-c2e1a
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=inspira-grid-c2e1a.firebasestorage.app
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=210611264492
ENV NEXT_PUBLIC_FIREBASE_APP_ID=1:210611264492:web:f63a6c7c7c26526ff97ec9
ENV NEXT_PUBLIC_USE_EMULATOR=false
ENV NEXT_PUBLIC_PUSHER_KEY=0e008b4f798e236d3a63
ENV NEXT_PUBLIC_PUSHER_CLUSTER=ap2
ENV NEXT_PUBLIC_ENABLE_REAL_TIME=false
ENV NEXT_PUBLIC_DISABLE_SOCKET=true
ENV NEXT_PUBLIC_ENABLE_ANALYTICS=true
ENV NEXT_PUBLIC_APP_ENV=production

# Build Next.js app
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
