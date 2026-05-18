FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json

RUN npm ci --workspace backend --include-workspace-root=false

COPY backend/tsconfig.json backend/tsconfig.json
COPY backend/src backend/src

RUN npm run build --workspace backend

FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json

RUN npm ci --omit=dev --workspace backend --include-workspace-root=false && npm cache clean --force

COPY --from=builder /app/backend/dist backend/dist

EXPOSE 4000

CMD ["npm", "run", "start", "--workspace", "backend"]
