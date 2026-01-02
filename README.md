# SanguiBlog 部署与开发指南

SanguiBlog 是一个前后端分离的个人博客系统：后端基于 Spring Boot + MySQL，前端基于 React + Vite（SPA）。本文面向部署/运维与本地开发；更完整的技术手册请阅读根目录 `NOTE.md`。

> 当前站点版本号：`V2.1.275`（统一由后端 `site.version` 提供，首页 Banner 展示为 `SANGUI BLOG // <version>`）

## 1. 目录索引

- 发布说明：`release/V2.1.275.md`
- 变更流水账：`AGENTS-EDIT.md`
- 技术手册：`NOTE.md`

## 2. 项目结构

```
├─ SanguiBlog-server/      # Spring Boot 服务端（REST API、鉴权、站点地图等）
├─ SanguiBlog-front/       # React 单页应用（访客端 + 管理端 UI）
├─ uploads/                # 默认上传目录（生产环境建议挂载到持久化存储）
├─ release/                # Release Notes（例如 V2.1.249 / V2.1.275）
├─ sanguiblog_db.sql       # 初始化建库脚本（表结构 + 基础数据）
└─ README.md               # 本文档
```

## 3. 环境准备

| 组件 | 版本建议 | 说明 |
| --- | --- | --- |
| JDK | 21 | 后端 `pom.xml` 指定 `java.version=21` |
| Maven | 3.9.x | 构建/打包后端 |
| Node.js | ≥ 18（建议 20） | 构建前端 |
| MySQL | ≥ 8.0 | 建议 UTF8MB4 |
| Git | 任意近期版本 | 拉取代码 |

> Windows / Linux 均可部署。生产环境建议：在 CI/构建机完成前后端构建，线上仅部署产物（后端 Jar + 前端 dist + 持久化 uploads）。

## 4. 初始化数据库

1. 创建数据库（示例）：
   ```sql
   CREATE DATABASE sanguiblog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
   ```
2. 导入根目录 `sanguiblog_db.sql`：
   ```bash
   mysql -u root -p sanguiblog_db < sanguiblog_db.sql
   ```
3. 建议创建业务账号（读写权限），并在后端配置里配置用户名/密码（见下一节）。

## 5. 后端配置与启动（SanguiBlog-server）

后端配置文件：`SanguiBlog-server/src/main/resources/application.yaml`

### 5.1 必配项（建议用环境变量注入）

- 数据库：`spring.datasource.url/username/password`
  - 支持环境变量：`DB_USERNAME` / `DB_PASSWORD`（也兼容 Spring 标准变量）
- JWT 密钥：`JWT_SECRET`（必填，未提供会直接启动失败）
- 上传目录：`storage.base-path`
  - 支持环境变量：`STORAGE_BASE_PATH`

### 5.2 端口与跨域

- 服务端口：`server.port`（仓库默认 `8080`）
- CORS：`security.cors.allowed-origins`（开发端口 `5173/5174` 已在默认列表中）

### 5.3 启动方式

构建 Jar：
```bash
cd SanguiBlog-server
mvn clean package -DskipTests
```
启动（Jar 名称以实际构建产物为准，通常类似 `SanguiBlog-server-0.0.1-SNAPSHOT.jar`）：
```bash
java -jar target/SanguiBlog-server-0.0.1-SNAPSHOT.jar
```

## 6. 前端构建与部署（SanguiBlog-front）

前端 API 默认走同源 `/api`，生产环境通常无需额外配置。若你需要跨域/分域名部署，可在 `SanguiBlog-front/.env` 或 `.env.production` 设置：

```
VITE_API_BASE=/api
# 或：VITE_API_BASE=https://your-domain.com/api
VITE_API_ORIGIN=https://your-domain.com
VITE_ASSET_ORIGIN=https://your-domain.com
```

构建：
```bash
cd SanguiBlog-front
npm install
npm run build
```
构建产物在 `SanguiBlog-front/dist/`。

## 7. Nginx 反代建议（含 sitemap/robots）

如果你使用 SPA 回退（`try_files $uri /index.html`），务必让 `sitemap.xml/robots.txt` 优先走后端，否则会被回退到前端首页导致访问异常。

可参考仓库示例：`fake-nginx-config/nginx.conf`，核心片段如下（按需调整域名/端口/目录）：

```
server {
  root /var/www/sanguiblog/dist;
  index index.html;

  location = /sitemap.xml { proxy_pass http://127.0.0.1:8080/sitemap.xml; }
  location = /robots.txt  { proxy_pass http://127.0.0.1:8080/robots.txt; }

  location /api/ { proxy_pass http://127.0.0.1:8080/api/; }
  location /uploads/ { alias /your/storage/uploads/; }

  location / { try_files $uri /index.html; }
}
```

## 8. sitemap/robots 说明（V2.1.275）

- 站点地图：`GET /sitemap.xml`
  - URL 超阈值时返回 `<sitemapindex>`，并通过 `GET /sitemap.xml?page=1..N` 分片拉取
  - 支持 `ETag/If-None-Match` 命中返回 304
- robots：`GET /robots.txt`
  - 默认禁止抓取 `/admin` 与 `/api/`，并指向 `Sitemap: https://<域名>/sitemap.xml`

阈值配置项：`site.sitemap.max-urls-per-file`（默认 45000，对应环境变量 `SITE_SITEMAP_MAX_URLS_PER_FILE`）。

## 9. 常见问题排查

| 现象 | 可能原因 | 解决方案 |
| --- | --- | --- |
| 前端接口 404 | Nginx 未做 `/api/` 转发 | 增加 `location /api/` 并重载 Nginx |
| `/sitemap.xml` 打开变首页 | `try_files` 先于 sitemap location | 添加 `location = /sitemap.xml` 与 `location = /robots.txt` 并放在 `try_files` 前 |
| 上传失败/找不到文件 | `storage.base-path` 无写权限或 Nginx `/uploads/` 未映射 | 确保目录可写，配置 `alias` 或由后端静态映射提供 |
| 服务启动失败提示 JWT_SECRET | 未设置 JWT 密钥 | 设置环境变量 `JWT_SECRET` 后再启动 |
| 控制台出现 `content_script.js` 报错 | 浏览器扩展注入脚本噪声 | 无痕窗口/禁用扩展验证（通常与站点无关） |

更多架构与实现细节请查阅 `NOTE.md`。

