# SanguiBlog 前端 Dockerfile
# 多阶段构建：Node 构建 -> Nginx 服务
# 构建上下文为仓库根目录

FROM node:20-alpine AS builder
WORKDIR /build
COPY SanguiBlog-front/package.json SanguiBlog-front/package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY SanguiBlog-front/ ./
RUN npm run build

FROM nginx:alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /build/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
    CMD wget -qO- http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
