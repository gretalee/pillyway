FROM node:24-alpine AS builder
WORKDIR /app

# Copy manifest and schema first so yarn install (and prisma generate) is cached
# separately from source changes
COPY package.json yarn.lock ./
COPY prisma/ ./prisma/
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

# ---- Runtime stage ----
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3033
CMD ["node", "dist/main"]
