# Alpine, about 100 MB smaller: sharp and better-sqlite3 both ship musl builds,
# and the pull request check runs the image and converts a photo to prove it.
FROM node:24-alpine AS base
WORKDIR /app
COPY package.json package-lock.json .npmrc ./

FROM base AS build
# The npm cache survives between builds, so unchanged packages aren't fetched again.
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build

FROM base AS deps
# better-sqlite3 ships every platform's binary and SQLite's sources for compiling
# one; the image needs only the binary it loads here, which it reports itself.
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev \
  && keep="$(node -p "require('./node_modules/better-sqlite3/lib/binding.js').getPrebuildPath()")" \
  && test -f "$keep" \
  && find node_modules/better-sqlite3/prebuilds -type f ! -name "$(basename "$keep")" -delete \
  && rm -rf node_modules/better-sqlite3/deps node_modules/better-sqlite3/src

FROM node:24-alpine
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Only what runs: the TypeScript build caches beside them aren't needed.
COPY --from=build /app/dist/server ./dist/server
COPY --from=build /app/dist/shared ./dist/shared
COPY --from=build /app/dist/client ./dist/client
COPY drizzle ./drizzle
COPY package.json ./
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://localhost:' + process.env.PORT + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "dist/server/index.js"]
