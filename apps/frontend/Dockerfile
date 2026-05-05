FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

# NEXT_PUBLIC_* vars are baked into the JS bundle at build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Kinde vars are required by the SDK when Next.js imports the auth route during
# "Collecting page data". They are declared here (builder stage only) so they
# are NOT baked into the final runtime image — docker-compose injects them at runtime.
ARG KINDE_ISSUER_URL
ENV KINDE_ISSUER_URL=$KINDE_ISSUER_URL
ARG KINDE_CLIENT_ID
ENV KINDE_CLIENT_ID=$KINDE_CLIENT_ID
ARG KINDE_CLIENT_SECRET
ENV KINDE_CLIENT_SECRET=$KINDE_CLIENT_SECRET
ARG KINDE_SITE_URL
ENV KINDE_SITE_URL=$KINDE_SITE_URL
ARG KINDE_POST_LOGOUT_REDIRECT_URL
ENV KINDE_POST_LOGOUT_REDIRECT_URL=$KINDE_POST_LOGOUT_REDIRECT_URL
ARG KINDE_POST_LOGIN_REDIRECT_URL
ENV KINDE_POST_LOGIN_REDIRECT_URL=$KINDE_POST_LOGIN_REDIRECT_URL

ENV NEXT_TELEMETRY_DISABLED=1

RUN yarn build

# ---- Runtime stage ----
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# standalone output bundles only the files needed to run the server
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
