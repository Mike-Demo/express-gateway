# Fix candidate (branch ce-debug): identical to Dockerfile.demo except the
# base image is Debian slim (glibc) instead of Alpine (musl).
FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production \
    EG_CONFIG_DIR=/app/lib/config \
    EG_DISABLE_CONFIG_WATCH=true \
    EG_HTTP_PORT=8080

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY lib ./lib

EXPOSE 8080

CMD ["node", "-e", "require('/app/lib')().run();"]
