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
*   **配置**: `src/main/resources/application.yaml`
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
*   首页文章卡片所展示的“浏览量 / 评论数”直接读取后端 `PostSummaryDto` 中的 `viewsCount` 与 `comments` 字段，其中评论数由后端实时统计 `APPROVED` 状态的评论数量。

### 3.3 Markdown 渲染策略
*   `ArticleDetail` 组件优先使用 `contentMd`，通过 `ReactMarkdown` 渲染；若后端仅返回 `contentHtml` 则采用 `dangerouslySetInnerHTML` 兜底。
*   插件链：
    *   `remark-gfm`: 表格、任务列表、删除线等 GitHub 风格扩展。
    *   `remark-math` + `rehype-katex`: 支持 `$...$` 行内、`$$...$$` 块级公式，样式依赖 `katex/dist/katex.min.css`（在 `AppFull.jsx` 头部全局引入）。
    *   `rehype-raw`: 允许 Markdown 中的原生 HTML（如 `<p style="color:red">`）直接渲染，满足自定义排版需求。
    *   **扩展高亮**：通过自定义 `remarkHighlight` 插件把 `==文本==` 转换为 `<mark>` 标签，兼容 Markdown 与 HTML 渲染路径，便于作者强调关键词。
*   标题锚点：`AppFull.jsx` 自定义 `createHeading` 渲染器为 `h1-h6` 自动生成 `id`（兼容中文 slug 并支持重名去重），每次渲染都会重置 slug 映射，避免重复渲染导致 `xxx-2` 等随机锚点；同时拦截 Markdown 中 `href="#..."` 的点击事件，若直接匹配不到元素则自动尝试 slug 化后的 ID 并回退到原始 `#标题`，确保 `[目录](#某标题)` 语法能准确跳转。
*   代码块渲染保持自定义的 Neo-Brutalism 包装（窗口按钮 + 阴影），行内代码继续使用定制逻辑裁剪反引号，保证视觉一致性。

### 3.4 后台标签管理

*   `/admin/taxonomy` 页面由 `TaxonomyView` 负责，支持标签的新增、编辑、删除、刷新、分页与模糊搜索（按名称/slug），界面提供实时表格与行内编辑体验。
*   所有操作调用受保护的 `/api/admin/tags` 接口（POST/PUT/DELETE/GET），需 `ADMIN` 及以上权限；接口层会校验名称与 slug 唯一性，并在后端自动生成 slug（兼容中文）。
*   公共 `/api/tags` 接口保留只读模式，前台依旧可以匿名获取标签列表；后台则通过新增的 admin API 获得包含描述、时间戳、分页信息的完整版数据。

### 3.5 后台文章管理

*   `/admin/posts` 页面由 `PostsView` 负责，提供文章分页列表、关键字搜索、按分类筛选，并将“编辑”按钮跳转到独立的 `/admin/posts/edit` 页；列表侧仅做导航入口，不再行内修改正文或元信息。
*   `/admin/posts/edit` 由 `EditPostView` 渲染，支持通过 URL 携带 `postId` 定位文章；若未携带参数，会先列出可选文章供管理员点选。页面可同步编辑标题、Slug、摘要、主题色、状态、分类、标签及 Markdown 正文，色盘/预设颜色会直接写入 `theme_color`（如 `bg-[#FF0080]`）。
*   对应的 `GET /api/admin/posts/{id}` 返回 `AdminPostDetailDto`，包含 Markdown 正文与标签/分类 ID；保存时调用 `PUT /api/posts/{id}` 仍沿用 `SavePostRequest`，后端在更新主题色的同时继续校验 slug 唯一性、分类存在性并维护 `post_tags`。

### 3.6 管理端个人资料
*   顶部导航头像会打开 `/admin/profile`，页面包含头像上传、基础资料、Bio、GitHub、密码重置和只读账户信息等模块（微信二维码字段已废弃，不再显示）。
*   头像上传保存至 `src/main/resources/static/avatar`，数据库仅存储文件名；响应给前端时自动补全 `/avatar/<filename>`，同时在更新时删除旧文件，防止残留。
*   头像上传走 `/api/upload/avatar`，成功后立即调用 `updateProfile` 持久化路径；密码修改需先验证原密码，通过后输入新密码才可提交。
*   页面支持暗色模式，并提供明确的状态提示与校验反馈。

### 3.7 后台文章发布
*   `/admin/create-post` 页面采用“自动预留 slug + 光标插图”的流程：进入页面即调用 `/api/upload/post-assets/reserve` 申请唯一资源目录，Markdown 编辑区右上方的“插入图片”按钮会在当前光标处上传所选图片，直接写入 `/uploads/<slug>/` 后马上把对应 Markdown 片段插入正文。
*   资源标识卡片内置主题色选择器，可直接输入 `bg-[#xxxxxx]` 类名、使用色盘或点选 6 个预设颜色，提交时会作为 `theme_color` 存入数据库，CreatePost 与 EditPost 均复用同一组件，确保展示色与后台数据一致。
*   Markdown 文件通过本地读取填充正文，若标题输入框仍为空会自动使用文件名（去除扩展名）；摘要可自定义，也可以在提交前由正文前 160 字自动生成。
*   仅支持选择二级分类（先点一级分类再点下方子类），以及至少一个标签；三项均完成后才能启用“立即发布”按钮，避免漏填元数据。
*   发布会调用 `POST /api/posts`，其中 `slug` 必须传入预留得到的目录名称；后端会校验唯一性并在必要时创建空目录，确保数据库与磁盘一一对应。

### 3.8 用户管理
*   `/admin/users` 页面由 `UserManagementView` 渲染，左侧表格可按关键词、角色和分页浏览全部后台账号，右侧表单同时支持创建/编辑，密码字段无需原密码即可重置。
*   创建/更新接口均允许填写基础资料（用户名、显示名、邮箱、头衔、简介、GitHub、微信二维码）并直接选择角色；只读信息（ID、创建时间、最近登录）在表单下方展示，仍不可手动修改。
*   对应后端接口：
    *   `GET /api/admin/users`（支持 `keyword`、`role`、`page`、`size`）返回 `PageResponse<AdminUserDto>`；
    *   `GET /api/admin/users/{id}` / `POST /api/admin/users` / `PUT /api/admin/users/{id}` / `DELETE /api/admin/users/{id}` 完成完整 CRUD；
    *   `GET /api/admin/users/roles` 返回可选角色列表（`code` + `name`），供前端下拉框使用。


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
*   **根路径配置**：`application.yaml` 暴露 `storage.base-path`（支持环境变量 `STORAGE_BASE_PATH`），用于指定所有本地静态资源的根目录，默认值为仓库根目录下的 `uploads`。应用启动时会自动创建根目录以及 `avatar/`、`posts/` 等必要子目录。
*   **目录结构**：头像、文章图片、附件等均放置在根目录下的独立子目录，例如文章资源统一保存在 `<base-path>/posts/<slug>/`。后续扩展新的资源类型时只需在该根目录内再创建子目录即可，部署与备份流程保持一致。
*   **数据库字段**：`users.avatar_url` 保存头像文件名或 `avatar/` 相对路径；`posts.slug` 现改为记录文章图片文件夹的相对路径（如 `posts/20241124/abc123`），后端返回数据时会携带该路径以便前端按需拼接。
*   **静态映射**：`WebConfig` 将 `/avatar/**` 与 `/uploads/**` 映射到实际文件系统目录，无需重新打包 `static/` 资源即可即时读取最新上传内容。文章图片可直接通过 `http://<server>/uploads/<slug>/xxx.png` 访问。
*   **前端处理**：`/admin/create-post` 的“插入图片”按钮会携带预留的 `slug` 调用 `/api/upload/post-assets`，后端在不清空目录的情况下追加文件并返回 `files`、`urls` 以及用分号拼接好的 `joined` 字符串；前端据此插入 Markdown，若需要把图片地址落库可直接使用 `joined`。`slug` 现改为按需懒生成：仅在首次上传图片或点击“立即发布”时才调用 `/api/upload/post-assets/reserve`，生成后在同一编辑会话内复用，发布成功会清空该值以避免产生空目录。
*   **静态资源域名**：前端通过 `VITE_ASSET_ORIGIN`（默认继承 `VITE_API_BASE` 的域名部分）来拼接 `/uploads/**` 与 `/avatar/**` 绝对地址，部署到 CDN 或反向代理节点时只需设置此变量即可确保 Markdown/HTML 图片与头像访问正确主机。
*   **文章图片预览**：文章详情页会为 Markdown/HTML 中的所有 `<img>` 元素注入 `cursor-zoom-in` 样式，并在点击时打开全屏遮罩预览，图片路径自动经过 `resolveAssetPath` 补全，关闭遮罩后恢复页面滚动。

### 4.5 评论与楼中楼
*   数据结构：`comments` 表含 `parent_comment_id` 外键（见 `sanguiblog_db.sql`），配合 `ON DELETE SET NULL` 可形成任意深度的树形结构。SQL 文件附带了多条带父级关系的测试评论，可直接导入 MySQL 验证联动效果。
*   后端：`CommentService#listByPost` 会按 `parent_comment_id` 构建树形 `CommentDto.replies`，前端无需再次聚合；新增、删除、编辑均会触发 `loadComments(postId)` 重新拉取。
*   头像：若评论由登录用户提交，渲染时优先读取用户当前 `avatar_url`，保证更新头像后历史评论也能展示最新形象；匿名评论则退回 `author_avatar_url` 字段。
*   前端：`AppFull.jsx` 中的 `CommentsSection` 递归渲染 `replies`，支持楼中楼展示，但从交互上限制两层（顶层评论 + 一次回复），超过一层的节点不再出现“回复”按钮；评论总数通过递归统计所有层级，UI 会同步显示。
*   接口补充：`GET /api/comments/recent?size=5` 会返回最近通过审核的若干条评论（默认 5 条，上限 20），每条带有 `postId/postTitle/postSlug` 便于前端跳转对应文章。首页左侧的“最新评论”模块直接消费该接口，并在评论增删改后由 `useBlogData` 自动刷新。
*   交互：从首页“最新评论”点击评论文本会直接跳转到对应文章详情的开头（不再锚定具体评论），提示文案通过 `title="来自《文章》"` 告知来源，保持体验一致且避免滚动失败。

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
