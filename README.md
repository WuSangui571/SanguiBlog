# SanguiBlog 部署指南

SanguiBlog 是一个前后端分离的个人博客系统，后端使用 Spring Boot + MySQL，前端由 React + Vite 驱动。本指南面向部署与运维场景，帮助你从零搭建一套可在线访问的博客站点。

---

## 1. 项目结构

```
├─ SanguiBlog-server/      # Spring Boot 服务端（REST API、管理后台接口）
├─ SanguiBlog-front/       # React 单页应用（访客端 + 管理端 UI）
├─ uploads/                # 运行期上传目录（图片、附件、头像等）
├─ sanguiblog_db.sql       # 完整建库脚本
└─ README.md               # 当前部署指南
```

---

## 2. 环境准备

| 组件 | 版本建议 | 说明 |
| --- | --- | --- |
| JDK | 17 | 需启用 `JAVA_HOME` |
| Maven | 3.9.x | 用于构建后端 |
| Node.js | ≥ 18 (建议 20) | 配合 npm 或 pnpm 构建前端 |
| MySQL | ≥ 8.0 | 使用 UTF8MB4 字符集 |
| Git | 任意近期版本 | 用于拉取代码 |

> Windows 和 Linux 均可部署。生产环境建议将 Node/Maven 安装在 CI 或构建机上，线上仅保留构建产物。

---

## 3. 初始化数据库

1. 登录 MySQL：
   ```bash
   mysql -u root -p
   ```
2. 执行建库脚本（根据实际路径调整）：
   ```sql
   DROP DATABASE IF EXISTS sanguiblog_db;
   CREATE DATABASE sanguiblog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
   USE sanguiblog_db;
   SOURCE D:/02-WorkSpace/02-Java/SanguiBlog/sanguiblog_db.sql;
   ```
3. 创建具有读写权限的业务账号，并在后端配置文件中填入用户名与密码。

---

## 4. 配置并启动后端

1. 复制 `src/main/resources/application-example.yml`（若存在）或在 `application.yml` 中补齐以下内容：
   ```yaml
   spring:
     datasource:
       url: jdbc:mysql://127.0.0.1:3306/sanguiblog_db?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
       username: <你的数据库用户>
       password: <你的数据库密码>
   uploads:
     base-path: D:/02-WorkSpace/02-Java/SanguiBlog/uploads
   ```
2. 构建 Jar：
   ```bash
   cd SanguiBlog-server
   mvn clean package -DskipTests
   ```
3. 启动：
   ```bash
   java -jar target/sanguiblog-server.jar
   ```
4. 默认服务端口见 `application.yml`（通常为 `8080`）。若需自定义，修改 `server.port` 后重启即可。

---

## 5. 构建并部署前端

1. 在 `SanguiBlog-front/.env` 或 `.env.production` 中配置 API 地址：
   ```
   VITE_API_BASE=https://your-domain.com/api
   VITE_ASSET_ORIGIN=https://your-cdn.com
   ```
2. 安装依赖并构建：
   ```bash
   cd SanguiBlog-front
   npm install
   npm run build
   ```
3. 将 `dist/` 目录上传至任意静态资源服务器（Nginx、OSS、Vercel 等）。Nginx 示例：
   ```
   server {
     listen 80;
     server_name blog.example.com;
     root /var/www/sanguiblog/dist;
     location / {
       try_files $uri /index.html;
     }
     location /api/ {
       proxy_pass http://127.0.0.1:8080/api/;
     }
   }
   ```
4. 若启用了 HTTPS，请同步更新后端允许的跨域源（`SecurityConfig` 或 `application.yml` 中的 CORS 配置）。

---

## 6. 本地开发 & 调试

1. 打开两个终端：
   - **后端**：`cd SanguiBlog-server && mvn spring-boot:run`
   - **前端**：`cd SanguiBlog-front && npm run dev`
2. 默认开发地址：
   - 前端：http://localhost:5173
   - 后端：http://localhost:8080
3. 如果出现 CORS 报错，请在后端的跨域配置中加入 `http://localhost:5173` 与 `http://127.0.0.1:5173`。

---

## 7. 静态资源与上传目录

- 所有上传内容统一写入仓库根目录下的 `uploads/`。生产环境请将该目录挂载到持久化存储，并定期备份。
- 前端引用资源（头像、文章图片）时，路径形如 `/uploads/<slug>/cover.png` 或 `/avatar/<filename>`，由后端静态映射提供。
- 若部署到 CDN，可通过设置 `VITE_ASSET_ORIGIN` 让前端在构建时生成完整的 CDN URL。

---

## 8. 常见问题排查

| 现象 | 可能原因 | 解决方案 |
| --- | --- | --- |
| 前端接口 404 | Nginx 未做 `/api` 转发 | 按上方示例增加 `location /api` 并重载 Nginx |
| 上传失败/找不到文件 | `uploads/` 目录无写权限或路径配置错误 | 赋予可写权限，确保 `uploads.base-path` 指向绝对路径 |
| 登录后接口 401 | Token 失效或浏览器阻止三方 Cookie | 清理本地存储或确认后端允许的域名一致 |
| 静态资源跨域 | CDN 域名未在后端 CORS 白名单 | 在后端配置中加入对应 `origin` |

如需更多架构或接口说明，请查阅根目录下的 `NOTE.md`。

