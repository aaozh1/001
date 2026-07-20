# MatList production image (see docs/DEPLOY.md — ทางเลือก A).
#
# Single-stage on purpose: pdfkit/fontkit/exceljs are serverExternalPackages
# that read files from node_modules at runtime, and assets/fonts ships the Thai
# PDF font — keeping the full app tree avoids standalone-tracing surprises.
# Build context must be the REPO ROOT:  docker build -f deploy/Dockerfile .
FROM node:22-bookworm-slim

# openssl: required by Prisma engines.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Build needs the Prisma client; DATABASE_URL is not required at build time.
RUN npx prisma generate && npm run build

EXPOSE 3000
# Apply pending migrations, then serve. (Seeding is a manual, dev-only step.)
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
