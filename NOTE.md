# SanguiBlog 技术手册 (Technical Manual)

> **文档生成时间**: 2025-11-23
> **适用对象**: 后端开发人员、前端开发人员、运维人员
> **项目状态**: 开发中 (Active Development)

## 1. 项目概述 (Project Overview)

SanguiBlog 是一个前后端分离的个人博客系统。
- **后端**: 基于 Spring Boot 3.2.5 构建的 RESTful API 服务。
- **前端**: 基于 React 19 + Vite 构建的单页应用 (SPA)，使用 TailwindCSS 进行样式设计。
- **核心目标**: 提供高性能、高交互性的博客阅读与管理体验。

---

## 2. 技术栈 (Tech Stack)

### 2.1 后端 (SanguiBlog-server)
| 技术 | 版本 | 说明 |
| :--- | :--- | :--- |
| **Java** | **21** | 使用最新 LTS 版本，利用新特性 (Virtual Threads 等潜力) |
| **Spring Boot** | 3.2.5 | 核心框架 |
| **Database** | MySQL 8.0+ | 数据存储 |
| **ORM** | Spring Data JPA | 数据持久层 |
| **Security** | Spring Security + JJWT (0.11.5) | 无状态认证 (Stateless Auth) |
| **API Docs** | SpringDoc OpenAPI (Swagger) 2.5.0 | 接口文档 (`/swagger-ui.html`) |
| **Utils** | Lombok, Commonmark | 代码简化与 Markdown 处理 |

### 2.2 前端 (SanguiBlog-front)
| 技术 | 版本 | 说明 |
| :--- | :--- | :--- |
| **React** | **19.2.0** | 使用最新的 React 核心 |
| **Build Tool** | Vite 7.2.4 | 极速构建工具 |
| **Router** | React Router DOM 7.1.1 | 路由管理 |
| **Styling** | **TailwindCSS 4.1.17** | 原子化 CSS 框架 (v4 版本) |
| **UI/Icons** | Lucide React | 图标库 |
| **Animation** | Framer Motion 12.x | 复杂动画实现 |
| **Markdown** | React Markdown + Remark GFM | 前端 Markdown 渲染 |

---

## 3. 架构与代码实现 (Architecture & Implementation)

### 3.1 后端架构
采用标准的 Spring Boot 分层架构：
`Controller` (API 层) -> `Service` (业务逻辑) -> `Repository` (数据访问) -> `Database`

*   **入口**: `com.sangui.sanguiblog.SanguiBlogServerApplication`
*   **配置**: `src/main/resources/application.yaml`
    *   **端口**: 8080
    *   **JPA**: `ddl-auto: none` (**注意**: 数据库表结构不会自动更新，需手动维护 SQL)
    *   **JWT**: 密钥配置在 `jwt.secret`，默认有效期 180 分钟。

#### 关键模块
*   **认证 (Auth)**:
    *   `SecurityConfig.java`: 配置了安全过滤器链。`/api/auth/login` 公开，写操作 (`POST/PUT/DELETE`) 需 `ADMIN` 权限。
    *   `JwtAuthenticationFilter`: 拦截请求，解析 `Authorization: Bearer <token>` 头。
*   **内容管理**:
    *   `PostController`: 处理文章的 CRUD。
    *   `Post` 实体: 存储 `contentMd` (Markdown 原文) 和 `contentHtml` (渲染后的 HTML)。

### 3.2 前端架构
单页应用，入口为 `src/main.jsx` -> `AppFull.jsx`。

*   **路由 (`AppFull.jsx`)**:
    *   `/`: 首页 (Hero + 文章列表)
    *   `/posts/:id`: 文章详情页
    *   `/admin/*`: 后台管理面板 (Dashboard, 编辑器等)
*   **状态管理 (`hooks/useBlogData.jsx`)**:
    *   使用 React Context (`BlogContext`) 管理全局状态：`user`, `posts`, `categories`。
    *   封装了所有 API 调用 (`loadPosts`, `doLogin` 等)。
*   **API 层 (`api.js`)**:
    *   统一封装 `fetch` 请求。
    *   自动携带 `localStorage` 中的 `sg_token`。
    *   `API_BASE`: 默认为 `http://localhost:8080/api`。

### 3.3 Markdown 渲染策略
*   `ArticleDetail` 组件优先使用 `contentMd`，通过 `ReactMarkdown` 渲染；若后端仅返回 `contentHtml` 则采用 `dangerouslySetInnerHTML` 兜底。
*   插件链：
    *   `remark-gfm`: 表格、任务列表、删除线等 GitHub 风格扩展。
    *   `remark-math` + `rehype-katex`: 支持 `$...$` 行内、`$$...$$` 块级公式，样式依赖 `katex/dist/katex.min.css`（在 `AppFull.jsx` 头部全局引入）。
    *   `rehype-raw`: 允许 Markdown 中的原生 HTML（如 `<p style="color:red">`）直接渲染，满足自定义排版需求。
*   标题锚点：`AppFull.jsx` 自定义 `createHeading` 渲染器为 `h1-h6` 自动生成 `id`（兼容中文 slug 并支持重名去重），每次渲染都会重置 slug 映射，避免重复渲染导致 `xxx-2` 等随机锚点；同时拦截 Markdown 中 `href="#..."` 的点击事件，若直接匹配不到元素则自动尝试 slug 化后的 ID 并回退到原始 `#标题`，确保 `[目录](#某标题)` 语法能准确跳转。
*   代码块渲染保持自定义的 Neo-Brutalism 包装（窗口按钮 + 阴影），行内代码继续使用定制逻辑裁剪反引号，保证视觉一致性。

### 3.4 后台标签管理
*   `/admin/taxonomy` 页面由 `TaxonomyView` 负责，支持标签的新增、编辑、删除、刷新、分页与模糊搜索（按名称/slug），界面提供实时表格与行内编辑体验。
*   所有操作调用受保护的 `/api/admin/tags` 接口（POST/PUT/DELETE/GET），需 `ADMIN` 及以上权限；接口层会校验名称与 slug 唯一性，并在后端自动生成 slug（兼容中文）。
*   公共 `/api/tags` 接口保留只读模式，前台依旧可以匿名获取标签列表；后台则通过新增的 admin API 获得包含描述、时间戳、分页信息的完整版数据。

### 3.5 后台文章管理
*   `/admin/posts` 页面由 `PostsView` 负责，提供文章分页列表、关键字搜索、按分类筛选，并支持行内编辑文章标题、Slug、摘要、状态、主题色、所属分类及标签；无需修改正文。
*   对应的 `/api/admin/posts` 接口提供分页查询与元数据更新（PUT），后端会校验 slug 唯一性、分类存在性，并在更新标签时重新绑定 `post_tags`。
*   更新操作不触碰 Markdown/HTML 内容，聚焦于基础元数据，避免误修改正文；分类下拉仅显示二级分类（以 “一级/二级” 形式呈现），状态显示为中文描述（草稿/已发布/已归档）。

### 3.6 管理端个人资料
*   顶部导航头像会打开 `/admin/profile`，页面包含头像上传、基础资料、社交信息、Bio、密码重置和只读账户信息等模块。
*   头像上传走 `/api/upload/avatar`，成功后立即调用 `updateProfile` 持久化路径；密码修改需先验证原密码，通过后输入新密码才可提交。
*   页面支持暗色模式，并提供明确的状态提示与校验反馈。

---

## 4. 数据存储与规则 (Data Storage & Rules)

### 4.1 核心数据库表
*   **`users`**: 用户表。
    *   `username`: 登录名 (唯一)。
    *   `role`: 角色 (`SUPER_ADMIN`, `ADMIN`, `USER`)。
    *   `password_hash`: BCrypt 加密后的密码。
*   **`posts`**: 文章表。
    *   `slug`: URL 友好的唯一标识符。
    *   `status`: 文章状态 (DRAFT, PUBLISHED)。
*   **`site_settings`**: 全局配置表。
    *   存储键值对 (Key-Value)，用于动态配置网站标题、SEO 设置等。

### 4.2 认证规则
1.  用户登录 -> 后端验证 -> 生成 JWT -> 返回 Token。
2.  前端将 Token 存入 `localStorage` (`key: "sg_token"`).
3.  前端每次请求 API 时，在 Header 中携带 `Authorization: Bearer <token>`；`checkAuth` 仅在后端明确返回 `401` 时才会清除本地 Token，避免偶发网络错误导致登录状态被误清空。

---

### 4.3 API 响应结构说明
*   **文章详情 (`/api/posts/{id}`)**:
    *   返回 `PostDetailDto`，包含 `summary` (PostSummaryDto), `contentMd`, `contentHtml`。
*   **文章详情 (`/api/posts/{id}`)**:
    *   返回 `PostDetailDto`，包含 `summary` (PostSummaryDto), `contentMd`, `contentHtml`。
    *   **关键**: 文章的元数据（标题、作者、分类、摘要等）都在 `summary` 字段中，且为扁平化结构（如 `authorName`, `category` 为字符串），而非嵌套对象。
    *   前端 `ArticleDetail` 组件需优先从 `articleData.summary` 获取这些信息。

### 4.4 静态资源与头像存储 (Static Resources & Avatars)
*   **存储位置**: 后端 `src/main/resources/static/avatar/` 目录。
*   **数据库字段**: `User` 表的 `avatar_url` 字段存储相对路径，例如 `/sangui.jpg`。
*   **URL 映射规则**:
    *   Spring Boot 默认将 `static/` 目录映射到根路径 `/`。
    *   因此，文件 `static/avatar/sangui.jpg` 的访问 URL 为 `http://localhost:8080/avatar/sangui.jpg`。
*   **前端处理**:
    *   前端需检测数据库返回的路径。如果路径以 `/` 开头且不包含 `/avatar/` 或 `/uploads/`，则需自动补全 `/avatar` 前缀。
    *   示例: DB `/sangui.jpg` -> Frontend `http://localhost:8080/avatar/sangui.jpg`。

### 4.5 评论与楼中楼
*   数据结构：`comments` 表含 `parent_comment_id` 外键（见 `sanguiblog_db.sql`），配合 `ON DELETE SET NULL` 可形成任意深度的树形结构。SQL 文件附带了多条带父级关系的测试评论，可直接导入 MySQL 验证联动效果。
*   后端：`CommentService#listByPost` 会按 `parent_comment_id` 构建树形 `CommentDto.replies`，前端无需再次聚合；新增、删除、编辑均会触发 `loadComments(postId)` 重新拉取。
*   前端：`AppFull.jsx` 中的 `CommentsSection` 递归渲染 `replies`，支持楼中楼展示，但从交互上限制两层（顶层评论 + 一次回复），超过一层的节点不再出现“回复”按钮；评论总数通过递归统计所有层级，UI 会同步显示。

## 5. 易错点与注意事项 (Common Pitfalls & Gotchas)

### ⚠️ 1. 数据来源混合 (Hybrid Data Source)
**现状**: 前端代码中存在 **真实 API 数据** 与 **Mock 数据** 混用的情况。
*   **文章/评论**: 主要走真实 API (`useBlogData` -> `api.js`).
*   **后台仪表盘 (Dashboard)**: `AppFull.jsx` 中的 `DashboardView` 组件目前大量使用了 **`MOCK_ANALYTICS`** (硬编码数据)。
    *   **风险**: 管理员看到的“流量统计”可能不是实时的数据库数据。
    *   **建议**: 后续需将 Dashboard 对接 `/api/analytics` 接口。

### ⚠️ 2. 数据库 Schema 维护
*   **配置**: `spring.jpa.hibernate.ddl-auto = none`
*   **后果**: 修改 Java Entity (`User`, `Post` 等) **不会** 自动更新数据库表结构。
*   **操作**: 每次修改字段，必须手动编写 SQL 并在数据库中执行 `ALTER TABLE`。

### ⚠️ 3. 跨域配置 (CORS)
*   后端 `SecurityConfig.java` 中硬编码了允许的源：
    *   `http://localhost:5173`
    *   `http://127.0.0.1:5173`
    *   `http://localhost:5174`
    *   `http://127.0.0.1:5174`
    *   `http://localhost:3000`
*   **注意**: 如果前端部署在其他域名或端口，**必须** 修改后端代码并重新编译，否则会报 CORS 错误。

### ⚠️ 4. React 19 兼容性
*   项目使用了 React 19 (RC/Beta 阶段特性)。
*   **注意**: 某些第三方库可能尚未完全适配 React 19。如果遇到奇怪的渲染错误，检查 `package.json` 中的依赖版本。

### ⚠️ 5. 紧急广播 (System Broadcast)
*   前端实现了“紧急广播”功能 (`EmergencyBar`)。
*   **状态**: 目前广播状态可能仅保存在前端内存或简单的后端接口，刷新页面后的一致性需重点测试 (依赖 `/site/broadcast` 接口)。

---

## 6. 快速开始 (Quick Start)

### 后端启动
```bash
cd SanguiBlog-server
mvn spring-boot:run
# 确保 MySQL 运行在 3306，且数据库 sanguiblog_db 存在
```

### 前端启动
```bash
cd SanguiBlog-front
npm install
npm run dev
# 访问 http://localhost:5173
```
