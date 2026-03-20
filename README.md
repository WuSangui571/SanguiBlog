# SanguiBlog 部署与开发指南

SanguiBlog 是一个前后端分离的个人博客系统：后端基于 Spring Boot + MySQL，前端基于 React + Vite（SPA）。本文面向部署/运维与本地开发，提供从环境准备到上线的最小可用流程与常见问题排查。

> 当前站点版本号：`V2.2.1`（统一由后端 `site.version` 提供，首页 Banner 展示为 `SANGUI BLOG // <version>`）
>
> `V2.2.x` 延续了 `V2.2.0` 引入的 AI 助理体系：包含登录用户多轮会话、博客文章 RAG、当前文章页上下文增强、超级管理员知识库导入与后台 AI 会话审计。

## 1. 目录索引

- 发布说明目录：`release/`（当前仓库内最新现有对外 release 文档仍为 `release/V2.2.0.md`）
- Nginx 反代示例：`fake-nginx-config/nginx.conf`
- 环境切换说明：`ChangeEnv.md`
- 数据库初始化脚本：`sanguiblog_db.sql`

## 2. 项目结构

```
├─ SanguiBlog-server/      # Spring Boot 服务端（REST API、鉴权、站点地图等）
├─ SanguiBlog-front/       # React 单页应用（访客端 + 管理端 UI）
├─ uploads/                # 默认上传目录（生产环境建议挂载到持久化存储）
├─ release/                # Release Notes（例如 V2.1.287 / V2.2.0，当前未单独新增 V2.2.1 发布文档）
├─ sanguiblog_db.sql       # 初始化建库脚本（表结构 + 基础数据）
└─ README.md               # 本文档
```

## 3. 环境准备

| 组件 | 版本建议 | 说明 |
| --- | --- | --- |
| JDK | 21 | 后端 `pom.xml` 指定 `java.version=21` |
| Maven | 3.9.x | 构建/打包后端 |
| Node.js | ≥ 18（建议 20） | 构建前端 |
| MySQL | ≥ 8.0 | 主业务数据库，建议 UTF8MB4 |
| PostgreSQL | 13+（可选） | 仅在启用博客/知识库 RAG 时需要，需安装 PgVector 扩展 |
| Git | 任意近期版本 | 拉取代码 |

> Windows / Linux 均可部署。生产环境建议：在 CI/构建机完成前后端构建，线上仅部署产物（后端 Jar + 前端 dist + 持久化 uploads）。
>
> 如果你暂时不启用 AI RAG，则 PostgreSQL / PgVector 不是必需项；只使用基础 AI 聊天时，MySQL 仍是唯一必需数据库。

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
4. 如果你准备启用 AI 聊天相关新功能，请确保根目录 `sanguiblog_db.sql` 已同步到当前版本，里面已包含：
   - AI 会话与消息表
   - 博客 RAG 跟踪表
   - 超级管理员文本知识库表

## 5. 后端配置与启动（SanguiBlog-server）
后端配置文件：
- 通用配置（提交 Git）：`SanguiBlog-server/src/main/resources/application.yaml`
- 私有配置（不提交 Git）：`SanguiBlog-server/src/main/resources/application-local.yaml`

`application.yaml` 已通过 `spring.config.import` 引入 `application-local.yaml`，用于加载数据库/JWT/站点等私有配置。

`application-local.yaml` 示例（请按实际环境修改）：
```yaml
spring:
  datasource:
    url: jdbc:mysql://127.0.0.1:3306/sanguiblog_db?useSSL=true&serverTimezone=Asia/Shanghai&characterEncoding=utf-8
    username: your_db_user
    password: your_db_password
    driver-class-name: com.mysql.cj.jdbc.Driver
  ai:
    dashscope:
      api-key: your_dashscope_api_key

jwt:
  secret: your_jwt_secret

storage:
  base-path: /path/to/uploads

security:
  cors:
    allowed-origins: >
      https://sangui.top,
      https://www.sangui.top,
      http://localhost:5173

site:
  base-url: https://www.sangui.top
  allowed-hosts: sangui.top,www.sangui.top
  asset-base-url: https://www.sangui.top/uploads
```

### 5.1 必配项（建议写入 application-local.yaml 或用环境变量注入）

- 数据库：`spring.datasource.url/username/password`（写入 `application-local.yaml` 或环境变量）
  - 兼容环境变量：`SPRING_DATASOURCE_URL` / `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD`（也可用 `DB_URL` / `DB_USERNAME` / `DB_PASSWORD`）
- JWT 密钥：`jwt.secret`（写入 `application-local.yaml` 或环境变量 `JWT_SECRET`）
- 上传目录：`storage.base-path`（写入 `application-local.yaml` 或环境变量 `STORAGE_BASE_PATH`）

### 5.2 端口与跨域

- 服务端口：`server.port`（仓库默认 `8080`）
- CORS：`security.cors.allowed-origins`（写入 `application-local.yaml` 或环境变量 `SECURITY_CORS_ALLOWED_ORIGINS`）

### 5.3 启动方式

开发模式（本地调试）：
```bash
cd SanguiBlog-server
mvn spring-boot:run
```

生产模式（构建 Jar 后运行）：
```bash
cd SanguiBlog-server
mvn -DskipTests package
java -jar target/SanguiBlog-server-*.jar
```

### 5.4 AI 助理与 RAG（V2.2.0+）

`V2.2.0` 起，项目已内置 AI 助理；当前 `V2.2.1` 延续并完善了该能力。能力包括：

- 站点前台 AI 聊天入口
- 登录用户多轮会话与历史会话管理
- 基于已发布博客文章的 RAG 检索增强
- 文章详情页“当前页面内容”临时上下文总结
- 超级管理员文本知识库导入
- 后台 AI 会话审计

基础 AI 聊天至少需要：

- `SPRING_AI_DASHSCOPE_API_KEY` 或 `AI_DASHSCOPE_API_KEY`

如需启用博客/知识库 RAG，还需要额外准备 PostgreSQL + PgVector，并配置：

```bash
AI_RAG_ENABLED=true
AI_RAG_SYNC_ON_STARTUP=true
AI_RAG_PGVECTOR_URL=jdbc:postgresql://127.0.0.1:5432/sanguiblog_ai
AI_RAG_PGVECTOR_USERNAME=your_pg_user
AI_RAG_PGVECTOR_PASSWORD=your_pg_password
AI_RAG_PGVECTOR_SCHEMA=public
AI_RAG_PGVECTOR_TABLE=vector_store
AI_RAG_PGVECTOR_INITIALIZE_SCHEMA=false
AI_DASHSCOPE_EMBEDDING_MODEL=text-embedding-v4
```

说明：

- 首次建 `vector_store` 表时，可临时将 `AI_RAG_PGVECTOR_INITIALIZE_SCHEMA=true`，建表成功后建议改回 `false`
- AI 入口支持在后台 `/admin/settings` 的 `AI助理` 分组中统一开启/关闭
- 超级管理员可在后台管理 AI 知识库与 AI 会话审计

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

本地开发（可选）：
```bash
cd SanguiBlog-front
npm install
npm run dev
```
默认开发地址：`http://localhost:5173`。

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

## 8. sitemap/robots 说明（V2.1.275+）

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
| AI 聊天不可用 | DashScope Key 未配置，或后台已关闭 AI 助理 | 检查 `SPRING_AI_DASHSCOPE_API_KEY` / `/admin/settings -> AI助理` |
| AI RAG 不生效 | `AI_RAG_ENABLED` 未开启，或 PgVector 未就绪 | 检查 PostgreSQL / PgVector、`vector_store`、启动同步日志 |
| 控制台出现 `content_script.js` 报错 | 浏览器扩展注入脚本噪声 | 无痕窗口/禁用扩展验证（通常与站点无关） |

如需了解更深入的实现细节，可参考仓库内的历史发布说明与源码注释。



