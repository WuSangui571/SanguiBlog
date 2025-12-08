## Multi-stage build for SanguiBlog frontend
# Stage 1: build SPA with Node 20
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE envs can be overridden at build time
ARG VITE_API_BASE=http://localhost:8080/api
ARG VITE_ASSET_ORIGIN=
ENV VITE_API_BASE=$VITE_API_BASE \
    VITE_ASSET_ORIGIN=$VITE_ASSET_ORIGIN
RUN npm run build

# Stage 2: serve with Nginx
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html
COPY --from=build /app/dist/ ./

# Nginx config for SPA + /api proxy (override at deploy if needed)
COPY <<'NGINX_CONF' /etc/nginx/conf.d/default.conf
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;

  location /api/ {
    proxy_pass http://backend:8080/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    try_files $uri /index.html;
  }
}
NGINX_CONF

EXPOSE 80
