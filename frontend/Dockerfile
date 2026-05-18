FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json

RUN npm ci --workspace frontend --include-workspace-root=false

COPY frontend frontend

RUN npm run build --workspace frontend

FROM nginx:1.27-alpine AS runner

ENV BACKEND_UPSTREAM=http://backend:4000

COPY frontend/docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
