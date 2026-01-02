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

    *   安全响应头：`SecurityConfig` 统一下发 CSP、Referrer-Policy、X-Frame-Options、HSTS（仅 https 生效）、Permissions-Policy、X-Content-Type-Options 等浏览器安全头，作为前端 XSS 清洗之外的第二道防线；若前端由 Nginx/静态站点独立托管，建议在该层同样配置这些头（因为后端只会给 API/静态资源响应加头，无法覆盖前端 `index.html` 的响应头）。

    *   错误码语义：后端接口统一返回 `ApiResponse` 结构；参数/业务校验错误一般返回 400（`IllegalArgumentException`/校验异常），资源不存在返回 404（`NotFoundException`），未捕获异常返回 500（生产环境对外统一“服务器内部错误”）。

*   **内容管理**:

    *   `PostController`: 处理文章的 CRUD。

    *   `Post` 实体: 存储 `contentMd` (Markdown 原文) 和 `contentHtml` (渲染后的 HTML)。



### 3.2 前端架构

单页应用，入口为 `src/main.jsx` -> `AppFull.jsx`。

*   **入口文件**：实际构建入口为 `SanguiBlog-front/src/main.jsx`（`createRoot`）→ `SanguiBlog-front/src/App.jsx`（路由壳）→ `SanguiBlog-front/src/AppFull.jsx`（主流程编排）。仓库根目录历史上曾存在一个同名 `App.jsx` 原型文件，现已移除以避免误改。

*   **AppFull 拆分**：后台管理相关组件迁移到 `src/appfull/AdminPanel.jsx`，共享常量/工具抽离到 `src/appfull/shared.js`；前台视图拆分到 `src/appfull/public/`，通用 UI 组件拆分到 `src/appfull/ui/`，`AppFull.jsx` 仅保留主流程编排；其中首页组合视图已抽离为 `src/appfull/public/HomeView.jsx`，页脚抽离为 `src/appfull/ui/SiteFooter.jsx`，避免单文件体量过大。



*   **路由（`SanguiBlog-front/src/App.jsx` + 页面壳）**:

    *   `/`: 首页 (Hero + 文章列表)

    *   `/archive`: 归档视图

    *   `/about`: 关于页

    *   `/article/:id`: 文章详情页

    *   `/tools` / `/tools/:id`: 工具中心列表 / 工具详情页（`/games` 兼容跳转）

    *   `/admin/*`: 后台管理面板 (Dashboard, 编辑器等)

*   **视图-路由联动**：前台导航通过 `setView()` 触发 `onViewChange`，统一由 `src/pages/viewNavigation.js` 维护视图到 URL 的映射，保证“归档/关于/工具/文章详情”等视图切换时 URL 同步更新，便于 SEO 与日志追踪；当处于 `/admin/*` 子路由时不会被强制拉回 `/admin`。
*   **站点地图与 robots**：后端提供 `GET /sitemap.xml`（XML）与 `GET /robots.txt`（文本），用于搜索引擎抓取；`/sitemap.xml` 会从数据库聚合已发布文章（`/article/:id`）与已启用工具页（`/tools/:id`）并生成 URL 列表，且通过内存缓存 + 变更标记 + 定时刷新自动更新；当 URL 总数超过 `site.sitemap.max-urls-per-file`（默认 45000）时，`/sitemap.xml` 会返回 `<sitemapindex>` 索引，分片 sitemap 通过 `GET /sitemap.xml?page=1..N` 获取（同一路径仅使用 query 参数，部署层通常无需额外新增 Nginx location）。此外，`/sitemap.xml` 与 `/robots.txt` 均支持 `ETag/If-None-Match`，命中时返回 304 以降低爬虫反复抓取的带宽与 CPU 成本。`/robots.txt` 会指向 `Sitemap: https://<域名>/sitemap.xml`，并默认禁止抓取 `/admin` 与 `/api/`。部署时若使用 Nginx 托管前端静态站点并启用 `try_files $uri /index.html`（SPA 回退），需在其前面显式添加 `location = /sitemap.xml` 与 `location = /robots.txt` 转发到后端，否则会被回退到前端首页导致“访问 /sitemap.xml 自动跳回 /”。
*   **用户头像跳转**：前台导航点击用户头像时，若当前不在后台则进入 `/admin`，若已在后台则进入 `/admin/profile`，避免登录后直接跳过后台首页。

*   **全局错误过滤 (`src/main.jsx`)**:

    *   监听 `unhandledrejection`，仅忽略浏览器扩展常见的 `A listener indicated an asynchronous response...` 噪声报错，避免控制台误报；若需要排查扩展或消息通道问题，可暂时移除此过滤。

*   **状态管理 (`hooks/useBlogData.jsx`)**:

    *   使用 React Context (`BlogContext`) 管理全局状态：`user`, `posts`, `categories`。

    *   封装了所有 API 调用 (`loadPosts`, `doLogin` 等)。

*   **API 层 (`api.js`)**:

    *   统一封装 `fetch` 请求。

    *   自动携带 `localStorage` 中的 `sg_token`。

    *   `API_BASE`: 默认为 `http://localhost:8080/api`。

    *   接口报错时优先解析 JSON，若包含 `message`/`msg` 字段则只返回该文本给前台提示，避免把整段响应 JSON 暴露给终端用户。

*   **前端日志与提示规范**：

    *   禁止在生产代码中使用 `alert()` 作为提示手段；后台操作提示优先使用 `src/appfull/AdminPanel.jsx` 的 `AdminNoticeBar + useTimedNotice` 体系（非打断式），前台的彩蛋/交互提示应使用页面内提示组件或状态提示，而非系统弹窗。

    *   控制台输出统一走 `src/utils/logger.js`：开发环境允许 `debug/info/warn` 全量打印；生产环境仅对 `warn` 做采样输出（默认 0.12），可用前端环境变量 `VITE_LOG_SAMPLE_RATE` 调整（0~1）。

    *   错误上报扩展点：`logger.error(message, error, context)` 会尝试调用 `window.Sentry.captureException`（若存在），便于后续接入 Sentry/监控平台；对用户可见的提示文本应保持“可理解 + 不泄露内部实现细节”。

*   **归档视图 (`ArchiveView`)**：

    *   归档页先请求 `/api/posts/archive/summary` 获取“年/月 + 数量 + 最近更新时间”的摘要结构（含 `totalCount/totalYears/lastUpdated`），用于构建时间线与右侧“月份速选”面板；不再一次性拉取全量文章。

    *   当月份区块进入视口或手动点击“加载本月文章”时，再调用 `/api/posts/archive/month?year=YYYY&month=MM&page=1&size=200` 拉取该月文章列表；前端会缓存已加载月份，点击“刷新归档”会清空缓存并重新拉取摘要。

    *   文章卡片展示“父分类 / 子分类”胶囊：父分类为白底黑字描边胶囊（含 FolderPlus 图标），子分类为浅灰描边胶囊；标签整体右对齐，分类居左，保持阅读/评论排版不变。

    *   自 V2.1.224 起，归档页文章卡片的标签列表会做稳定排序（前后端一致），避免因后端标签集合无序导致“加载后标签顺序变化”的视觉抖动。

    *   右侧“月份速选”平滑跳转时会按 `headerHeight + 16px` 预留滚动余量（`scroll-margin-top`），避免固定导航占位导致落点越过月份标题或首篇文章。

    *   “快速跳转”面板：采用 sticky，顶距 = 导航高度 + 48px，`margin-top` 动态对齐当前选中月份锚点（初始为最新月份）；滚动或点击月份都会实时重算锚点位置并平滑移位后吸顶，避免停留在旧月份。

    *   每个条目展示标题、日期、分类、标签、阅读/评论统计，点击后通过 `setArticleId + setView('article')` 跳转文章详情。

    *   若 `site.asset-base-url` 带路径前缀，`buildAssetUrl` 会自动去除重复段，保障归档页图片展示一致。

*   首页文章卡片所展示的“浏览量 / 评论数”直接读取后端 `PostSummaryDto` 中的 `viewsCount` 与 `comments` 字段，其中评论数统计口径为 `APPROVED` 状态；为避免列表页 N+1，分页接口会先按 postId 批量 group by 统计评论数再回填到 DTO。

*   首页文章卡片若发布时间在 7 天内，会在卡片外围叠加呼吸光圈与流光扫边的赛博描边，并在标题旁短暂保留 “NEW” 徽章，突出近一周的新内容。

*   首页底部版权信息来自 `/site/meta.footer`，支持在 `application.yaml` 的 `site.footer.*` 中自定义年份、品牌、备案号/链接以及 Powered by 文案；备案号始终以新窗口打开工信部或自定义链接。
*   首页“系统状态”数据来自 `/api/site/meta.stats`，统计口径仅覆盖 `status=PUBLISHED` 的文章：文章数、浏览量、评论量、标签数与最后更新时间均基于已发布文章聚合。

*   “全部标签”区展示真实标签列表，点击任意标签会立即过滤右侧文章列表，只保留包含该标签的文章，再次点击或点击“清除筛选”即可恢复全部文章。
*   前端未连后端时，首页作者头像与文章列表使用“加载中”占位（SVG 头像 + 2 条 loading 卡片），接口返回后由真实数据覆盖，无额外分支逻辑。
*   首页作者卡片的“个人简介”支持 HTML 渲染（`dangerouslySetInnerHTML`），仅用于站长资料展示，内容来源于后台个人资料的 `bio` 字段。
*   上传策略：文章资源单文件 ≤20MB、单次总量 ≤50MB（后端 `UploadController` 校验）；Spring `multipart` 全局上限 60MB。部署 Nginx 时需将站点级 `client_max_body_size` 配置为 `60m` 及以上，否则会返回 413。
*   自 V1.3.101 起，ArticleList 在页码、一级/二级分类或 “Reset Filters” 改变筛选时都会统一调用 `scrollToPostsTop()`，再次点击已激活的一级分类会退回到“全部”并折叠子分类；首页 Hero 文案与分页金句分别读取 `application.yaml` 中的 `site.hero.tagline` 与 `site.home.signature-quote`，默认仍为 “拒绝平庸…” 与 “阻挡你的不是别人…”，并移除了列表包裹层的 `flex:1` 占位以避免分页下沉。
*   自 V2.1.29 起，文章列表上方新增关键词搜索条（标题/摘要模糊匹配），实时过滤并重置到第 1 页；“清空”按钮只移除关键词，保留分类/标签筛选，右侧同时展示当前匹配篇数，分页与滚动逻辑保持不变。
*   自 V1.3.102 起，首页作者头像新增“转速过快”彩蛋：400ms 内连续点击 ≥4 次会随机弹出提示；V1.3.103 起提示面板改为居中赛博弹窗（pointer-events: none，2s 自动淡出）；V1.3.104+ 若短时间内高频点击（默认阈值 10 次）会触发“眼冒金星”全屏动画并锁定旋转，V1.3.105 起冷却时间拉长至 60 秒，可通过 `SPIN_WARNINGS`、`MEGA_SPIN_THRESHOLD`、`SPIN_LOCK_DURATION` 调整。
*   自 V1.3.106 起，主题切换按钮支持“超频模式”彩蛋：450ms 内连续点击 ≥6 次会触发 15 秒全屏矩阵光效与提示；V1.3.107 起冷却提示在超频展示期间自动抑制，避免消息互相覆盖，可通过 `THEME_SPREE_THRESHOLD`、`THEME_SPREE_DURATION`、`THEME_LOCK_DURATION` 调整。
*   自 V1.3.108 起，顶部“首页 / 归档 / 关于”导航点击后会自动平滑回到页面顶部，防止切换视图时视口停留在中部。
*   自 V1.3.109 起，文章详情页左上角的“首页”按钮在返回后会自动滚动至 `#posts` 区域（第一篇文章位置），保持与主页入口一致的体验。
*   自 V2.1.156 起，文章详情页作者信息区在头像右侧展示该文章标签，标签优先读取 `PostSummaryDto.tags`（必要时兼容标签对象）；若标签为空则不渲染该区域。
*   自 V2.1.195 起，文章详情页正文结束后新增“上一篇 / 下一篇”快捷卡片，基于首页已发布文章顺序提供前后篇跳转与摘要信息展示。
*   自 V2.1.197 起，文章详情页在正文结束位置增加“正文到此结束”分界线，并优化前后篇卡片排版与按钮区，视觉更规整。
*   自 V2.1.198 起，前后篇卡片改为仅展示标题与元信息，不再显示摘要，左右高度更一致。
*   自 V2.1.199 起，评论快捷跳转采用二次定位避免首点击落点偏移；前后篇卡片移除箭头与按钮，仅保留整卡可点的规整布局。
*   自 V2.1.200 起，前后篇卡片取消外层大卡片包裹，改为标题提示 + 双卡片并列展示。
*   自 V2.1.201 起，正文结束分界线下新增“同分类推荐”模块，最多展示 3 篇同分类文章并支持快速跳转。
*   自 V2.1.202 起，文章详情页新增目录浮层（自动抓取 h2/h3），桌面端固定侧栏展示，移动端使用抽屉样式。
*   自 V2.1.203 起，目录浮层改为简洁列表样式（去除按钮包围感），隐藏横向滚动条，并支持桌面端“收起/展开”。
*   自 V2.1.204 起，目录浮层左侧与顶部“评论”按钮左侧对齐，保持垂直节奏一致。
*   自 V2.1.205 起，目录浮层与同分类推荐/前后篇卡片统一为直角边缘样式。
*   自 V2.1.206 起，目录浮层抓取 h1/h2/h3，便于完整浏览章节层级。
*   自 V2.1.207 起，目录浮层在文章入场动画结束后重新计算定位，确保首次访问时与“评论”按钮左对齐。
*   自 V2.1.272 起，目录浮层支持区分一/二/三级标题缩进层级（增强层级感），并修复暗色模式下目录滚动条轨道背景仍为白色的问题。
*   自 V2.1.273 起，目录浮层升级为树形引导线（类似文件树）：通过多级竖线 + 横向连接线直观标识 h1/h2/h3 层级关系，进一步提升目录扫读与定位效率。
*   自 V2.1.88 起，移动端启用汉堡抽屉导航：包含首页/归档/关于/工具、登录/后台入口、主题/背景开关与首页分页设置，打开时锁定 body 滚动防止底层页面可操作；系统状态条在小屏改为横向滑动（snap）并保持 sticky，避免统计项溢出，同时桌面端排版与交互保持不变。
*   自 V2.1.157 起，移动端首页仅保留“首页信息 + 系统状态 + 文章搜索 + 文章列表”，作者卡片/分类导航/最新评论/全部标签在小屏隐藏，需要的功能统一通过顶部黄色按钮进入。
*   自 V2.1.158 起，移动端“返回顶部”按钮轻触即可触发回顶，拖拽仍保持原有可移动逻辑，避免触控端无法点击的问题。
*   自 V2.1.159 起，移动端导航抽屉按钮可正常打开菜单，避免因视图切换监听过度导致的“点击无响应”，登录入口同步恢复可用。
*   自 V2.1.160 起，后台移动端默认收起左侧导航，顶部“菜单”按钮可展开抽屉；主体区域开启横向滚动以适配表格等宽内容，桌面端布局保持不变。
*   自 V2.1.93 起，漂浮的“返回顶部”按钮改用非被动的 `touchstart` 监听并设置 `touch-action: none`，移动端拖动时不再出现 `Unable to preventDefault inside passive event listener` 报错，拖拽与回顶交互保持原有逻辑。



### 3.3 Markdown 渲染策略

*   `ArticleDetail` 组件优先使用 `contentMd`，通过 `ReactMarkdown` 渲染；若后端仅返回 `contentHtml` 则采用 `dangerouslySetInnerHTML` 兜底。

*   插件链：

    *   `remark-gfm`: 表格、任务列表、删除线等 GitHub 风格扩展。

    *   `remark-math` + `rehype-katex`: 支持 `$...$` 行内、`$$...$$` 块级公式，样式依赖 `katex/dist/katex.min.css`（在 `AppFull.jsx` 头部全局引入）。

    *   自 V2.1.225 起，Markdown 渲染移除 `rehype-raw`（不再执行原生 HTML），并加入 `rehype-sanitize` 对链接协议等进行清洗，降低存储型 XSS 风险（例如阻断 `javascript:` 链接）。

    *   HTML 兜底路径（`contentHtml` / `dangerouslySetInnerHTML`）会在前端使用 `DOMPurify` 做二次清洗后再渲染（包含 KaTeX 的 MathML 白名单），并同样用于作者简介等富文本字段，避免后台配置/内容误写入脚本导致全站被注入。

    *   **扩展高亮**：通过自定义 `remarkHighlight` 插件把 `==文本==` 转换为 `<mark>` 标签，兼容 Markdown 与 HTML 渲染路径，便于作者强调关键词。

*   标题锚点：`AppFull.jsx` 自定义 `createHeading` 渲染器为 `h1-h6` 自动生成 `id`（兼容中文 slug 并支持重名去重），每次渲染都会重置 slug 映射，避免重复渲染导致 `xxx-2` 等随机锚点；同时拦截 Markdown 中 `href="#..."` 的点击事件，若直接匹配不到元素则自动尝试 slug 化后的 ID 并回退到原始 `#标题`，确保 `[目录](#某标题)` 语法能准确跳转。

*   代码块渲染保持自定义的 Neo-Brutalism 包装（窗口按钮 + 阴影），行内代码继续使用定制逻辑裁剪反引号，保证视觉一致性。
*   文章页代码块新增“复制”按钮（Mac 窗口风格右侧），点击即复制整段代码并弹出 “已复制” 状态，依赖浏览器 `navigator.clipboard`。
*   关于页（/about）复用同款代码块复制交互，视觉与文章页一致。



### 3.4 后台标签管理



*   `/admin/taxonomy` 页面由 `TaxonomyView` 负责，支持标签的新增、编辑、删除、刷新、分页与模糊搜索（按名称/slug），界面提供实时表格与行内编辑体验。

*   所有操作调用受保护的 `/api/admin/tags` 接口（POST/PUT/DELETE/GET），需 `ADMIN` 及以上权限；接口层会校验名称与 slug 唯一性，并在后端自动生成 slug（兼容中文）。

*   公共 `/api/tags` 接口保留只读模式，前台依旧可以匿名获取标签列表；后台则通过新增的 admin API 获得包含描述、时间戳、分页信息的完整版数据。



### 3.5 后台文章管理



*   `/admin/posts` 页面由 `PostsView` 负责，提供文章分页列表、关键字搜索、按分类筛选，并将“编辑”按钮跳转到独立的 `/admin/posts/edit` 页；列表侧仅做导航入口，不再行内修改正文或元信息。

*   列表首列只显示标题，Slug 仅做后台检索用；同时根据 `status` 值为每行附加绿色/琥珀色/灰色底纹，分别对应“已发布 / 草稿 / 已归档”，管理员无需点进详情即可直观分辨状态。

*   `/admin/posts/edit` 由 `EditPostView` 渲染，支持通过 URL 携带 `postId` 定位文章；若未携带参数，会先列出可选文章供管理员点选。页面可同步编辑标题、Slug、摘要、主题色、状态、分类、标签及 Markdown 正文，色盘/预设颜色会直接写入 `theme_color`（如 `bg-[#FF0080]`）。

*   对应的 `GET /api/admin/posts/{id}` 返回 `AdminPostDetailDto`，包含 Markdown 正文与标签/分类 ID；保存时调用 `PUT /api/posts/{id}` 仍沿用 `SavePostRequest`，后端在更新主题色的同时继续校验 slug 唯一性、分类存在性并维护 `post_tags`。

*   保存成功后会在右上角弹出霓虹风格提示栏，4 秒后自动收起，管理员也可点击关闭；失败时仍以内联红字提示，确保错误信息不会被遮挡。



### 3.6 管理端个人资料

*   顶部导航头像会打开 `/admin/profile`，页面包含头像上传、基础资料、Bio、GitHub、密码重置和只读账户信息等模块（微信二维码字段已废弃，不再显示）。

*   头像上传保存至 `src/main/resources/static/avatar`，数据库仅存储文件名；响应给前端时自动补全 `/avatar/<filename>`，同时在更新时删除旧文件，防止残留。

*   头像上传走 `/api/upload/avatar`，成功后立即调用 `updateProfile` 持久化路径；密码修改需先验证原密码，通过后输入新密码才可提交。

*   页面支持暗色模式，并提供明确的状态提示与校验反馈。
*   数据库字段 `users.bio` 已扩展为 `TEXT`，支持更长的个人简介内容。



### 3.7 后台文章发布

*   `/admin/create-post` 页面采用“自动预留 slug + 光标插图”的流程：进入页面即调用 `/api/upload/post-assets/reserve` 申请唯一资源目录，Markdown 编辑区右上方的“插入图片”按钮会在当前光标处上传所选图片，直接写入 `/uploads/<slug>/` 后马上把对应 Markdown 片段插入正文。

*   封面图：新增 `posts.cover_image (VARCHAR(512))`，上传接口为 `POST /api/upload/post-cover`（单文件、≤10MB，需登录），目录固定在 `/uploads/covers/<postSlug>/`。`coverImage` 字段随 `POST/PUT /api/posts/{id}` 一起保存，`PostSummaryDto` 与 `AdminPostDetailDto/PostAdminDto` 已返回封面路径，前端首页卡片、发布/编辑页直接读取。

*   资源标识卡片内置主题色选择器，可直接输入 `bg-[#xxxxxx]` 类名、使用色盘或点选 6 个预设颜色，提交时会作为 `theme_color` 存入数据库，CreatePost 与 EditPost 均复用同一组件，确保展示色与后台数据一致。

*   Markdown 文件通过本地读取填充正文：标题若为空，会取文件名去除扩展名后再去掉首个 “-” 及之前的部分作为文章名（如 `073-ngrok 本地外网测试.md` → `ngrok 本地外网测试`）；摘要优先解析首个以 `>` 开头的行（去掉 `>` 后的内容），若未匹配到会提示“未识别摘要格式，请手动填写摘要”，并回退到正文前 160 字。被识别的摘要行会从正文中移除后再填充编辑器，避免重复出现；正文会扫描 `![alt](url)` 形式的图片语法并在上传提示区醒目标示“本文检测到 X 张图片”，便于确认资源齐全。发布步骤顺序为“Step1 选择二级分类 → Step2 选择标签 → Step3 资源标识”，二级分类自动配色仅在用户未手动改色时生效（最多 6 个预设色），可随时手动改色；发布页“重新生成”仅生成 slug 不改颜色，“重置为默认色”可恢复默认主题色，“清空表单”会重置到首个父类 + 首个子类并按预设色上色。
*   版本号来源：统一读取后端 `site.version`，前端不再硬编码回退；更新版本时仅需修改 `application.yaml` 中的 `site.version`。
*   系统设置（/admin/settings，SUPER_ADMIN，需 `SYSTEM_CLEAN_STORAGE`）：包含“游戏页面管理 / 未引用图片清理 / 空目录清理”三个维护模块。未引用图片清理通过 `/api/admin/maintenance/unused-assets` 扫描 uploads/posts 与 uploads/covers 中未被文章正文、文章封面字段或关于页 Markdown 引用的图片，支持多选+弹窗二次确认删除（`/unused-assets/delete`）；空目录清理通过 `/api/admin/maintenance/empty-folders` 扫描 uploads/posts 下空文件夹并批量删除（`/empty-folders/delete`）。
*   发布/编辑页批量图片上传（V1.3.120 起发布页，V1.3.121 编辑页同步）：上传多图后按文件名匹配 Markdown 中的本地占位路径（如 `![alt](D:\xxx\abc.jpg)`），自动替换为上传后的 `/uploads/...` 路径，未匹配的图片追加到正文；提示“已上传 X 张，匹配替换 Y 张”，若匹配数小于检测到的图片数则提示手动补充。
*   首页文章分页：前端首页列表改为调用后端分页接口 `GET /api/posts?page=&size=&categoryId=&tagId=&keyword=`（仅返回已发布文章），不再一次性拉取大量文章；分页容量可在顶部“系统设置”里选择 5/10/20 条并存本地，切换后重置到第 1 页；页码超过 7 位时自动插入省略号，保持列表不拥挤；后端对 `size` 做上限（≤50）并支持“父分类 = 含子分类文章”的筛选语义。
*   文章详情页邻居/推荐：`GET /api/posts/{id}/neighbors` 返回 `{ prev, next, related }`（均为 `PostSummaryDto`），用于前端展示上一篇/下一篇与同分类推荐，避免依赖首页全量文章列表。
*   鉴权：前端请求前会检测 JWT `exp`（含 Base64URL 补位兼容），若已过期则清空本地 token；对需要登录的接口会抛出 401 并提示重新登录，避免 silent 403；对公开读取接口（如 `/posts`、`/site/meta`、`/categories`、`/tags` 等）即便检测到 token 已过期，也会继续以访客身份请求，避免首屏报错；当携带旧 token 访问公开读取接口返回 401 时，会先清理本地 token 并对该请求自动无鉴权重试一次，避免访客首次打开页面被历史登录态影响而需要手动刷新；恢复登录态时若返回 401/403 也会清理本地 token，避免卡死在无权限状态；埋点类公共请求（如 `/analytics/page-view`）若返回 401 会静默处理，不触发会话失效弹窗。
*   安全链放行：`/api/posts/**`、`/api/comments/**` 仅放行 `GET`，写操作统一走认证与权限校验，避免写接口被误放开。
*   会话超时弹窗：前端收到 401、权限接口 403 或检测到 token 过期时，会触发全局“会话已失效”弹窗，提示长时间未操作已自动退出；确认后跳转登录页，同时清理本地登录态，避免后台页面继续显示 403。

*   仅支持选择二级分类（先点一级分类再点下方子类），以及至少一个标签；三项均完成后才能启用“立即发布”按钮，避免漏填元数据。

*   发布会调用 `POST /api/posts`，其中 `slug` 必须传入预留得到的目录名称；后端会校验唯一性并在必要时创建空目录，确保数据库与磁盘一一对应。

*   发布成功会触发同样的右上角提示栏，用于展示文章 ID 等摘要信息，提醒管理员等待 4 秒即可自动消失或手动关闭；若失败仍在按钮下方互斥显示红字错误，避免重复反馈。
*   后台编辑页快捷跳转：`GET /api/admin/posts/{id}/siblings` 返回 `{ prevId, nextId }`，按首页发布时间顺序提供上一篇/下一篇 ID，便于在编辑页一键切换并自动回填表单。



### 3.8 用户管理

*   `/admin/users` 页面由 `UserManagementView` 渲染，左侧表格可按关键词、角色和分页浏览全部后台账号，右侧表单同时支持创建/编辑，密码字段无需原密码即可重置。

*   创建/更新接口均允许填写基础资料（用户名、显示名、邮箱、头衔、简介、GitHub、微信二维码）并直接选择角色；表单新增头像上传控件，沿用 `/api/upload/avatar` 上传后立即写入 `avatarUrl`，列表中也会显示缩略头像以便校对。后端 `AdminUserService` 会像个人资料页一样规范化 `avatarUrl` 并在写入新路径后删除旧头像文件，确保数据库与文件系统保持一致。

*   创建用户时默认角色会优先选用 `USER`（若存在），防止误把新账号设为 SUPER_ADMIN；只读信息（ID、创建时间、最近登录）在表单下方展示，仍不可手动修改。

*   对应后端接口：

    *   `GET /api/admin/users`（支持 `keyword`、`role`、`page`、`size`）返回 `PageResponse<AdminUserDto>`；

    *   `GET /api/admin/users/{id}` / `POST /api/admin/users` / `PUT /api/admin/users/{id}` / `DELETE /api/admin/users/{id}` 完成完整 CRUD；

    *   `GET /api/admin/users/roles` 返回可选角色列表（`code` + `name`），供前端下拉框使用。



### 3.9 Backoffice Comment Management

*   **界面**：`/admin/comments` 由筛选区 + 文章候选列表 + 评论概览三部分组成。筛选区支持“全部文章/指定文章”切换、状态和关键字过滤，并提供刷新按钮；文章列表用于分页加载文章标题，方便快速定位；概览卡片会展示当前范围、筛选状态与符合条件的总数。

*   **列表操作**：评论表格展示 ID、所属文章、作者/IP/时间、内容与状态。拥有 `COMMENT_REVIEW` 的账号可以在表格行内编辑内容及状态（APPROVED/PENDING/REJECTED/SPAM），拥有 `COMMENT_DELETE` 的账号可以直接删除任意评论；`COMMENT_REPLY` 控制是否可在后台以官方身份回复评论。

*   **后台回复**：页底提供“发布后台回复”表单，可选择文章、填写显示作者、指定父级评论并提交内容。该表单依旧调用公开的 `POST /api/posts/{id}/comments`，从而保持与前台访客评论一致的流程。

*   **接口**：`GET /api/admin/comments` 提供分页数据（`PageResponse<AdminCommentItemDto>`），`PUT /api/admin/comments/{id}` 只接受 `{content,status}` 字段用于审核/改写，`DELETE /api/admin/comments/{id}` 删除单条评论及其子节点。所有操作都依赖 `CommentService.searchComments/updateCommentAsAdmin/deleteComment`。

*   **权限**：`COMMENT_VIEW/COMMENT_CREATE/COMMENT_REPLY/COMMENT_REVIEW/COMMENT_DELETE` 分别对应查看、后台创建、后台回复、审核、删除，各项权限既影响前端按钮是否渲染，也由后端 `@PreAuthorize` 强制校验；超级管理员天然拥有全部权限。



### 3.10 Analytics for Admin

*   GET /api/admin/analytics/summary?days=<1|7|30|-1>&top=<5>&recent=<30> 聚合文章表(views_count/comments_count/status=PUBLISHED)、analytics_page_views（PV/UV/登录PV/14 日趋势）与 analytics_traffic_sources，并把“全部历史”请求映射为 days = -1/rangeDays = 0，返回新的 AdminAnalyticsSummaryDto。UV 去重优先使用 user_id，其次使用 viewer_ip。

*   Dashboard 复用 AnalyticsSummaryContext，rangeDays 优先读取 overview.rangeDays；概览卡片统一展示：累计浏览、评论总数、区间 PV、区间 UV、文章总数、评论总数（实时 comments 表），eload(range) 触发 1/7/30/全部区间切换。

*   访问日志页（/admin/analytics）当前包含“概览 + 区间筛选”、“最近 14 天 PV/UV 折线”、“流量来源”和“实时访问日志”四块，热门文章/最新访问/紧急广播已下线；SUPER_ADMIN 可在表格中单条或勾选批量删除访问日志。

*   AnalyticsService.recordPageView 负责写入 analytics_page_views 并同步流量来源：PV 端使用 Caffeine（IP+post）做 10 分钟 TTL 内存限流，并配合 10 分钟数据库去重（重启/缓存淘汰时兜底确保不重复计数）；SUPER_ADMIN 仅当 pageTitle/referrer 含 admin 时跳过；若前端埋点失败，PostService.incrementViews 会即时构造 PageViewRequest 再兜底写入。自 V1.3.96 起，DELETE `/api/admin/analytics/page-views/me` 会先删除 user_id=本人 的日志，再依据这些记录包含的全部 viewer_ip 清理 user_id 为空且 IP 命中的访客日志，从而把登录前的自访数据一并抹掉（多 IP 会逐一匹配）。V1.3.110 起新增单条/批量删除接口，只对 SUPER_ADMIN 开放。


*   updateTrafficSourceStat classifies referrers (search engine / social media / specific domain / Direct / None) and updates analytics_traffic_sources(stat_date, source_label, visits, percentage).



### 3.11 Permissions Matrix

*   /admin/permissions shows the role ? permission matrix (batch select + save). AdminNoticeBar + useTimedNotice surfaces success/error and blocks non SUPER_ADMIN visits.

*   GET /api/admin/permissions, GET /api/admin/permissions/{roleCode}, PUT /api/admin/permissions/{roleCode} are handled by PermissionService, backed by PermissionDefinition. Saving will update 

ole_permissions in bulk.

*   权限初始化已合并进 `sanguiblog_db.sql`（含权限列表与角色映射）；只允许 ADMIN/SUPER_ADMIN 访问 `/admin/permissions`。
*   自 V2.1.30 起，`DataInitializer.ensureDefaultPermissions` 仅在角色尚无权限映射时才写入默认矩阵，避免重启时覆盖后台已保存的自定义权限；SUPER_ADMIN 仍会自动补齐新增加的权限代码。

*   所有后台控制器及 `/api/posts` 写操作均使用 `PERM_*` 权限码进行 `@PreAuthorize` 校验，与 `PermissionDefinition` 中的 code 一一对应；`SUPER_ADMIN` 默认拥有全部权限，其余角色必须在矩阵中勾选后才能调用相应 API。

*   前端通过全局 `PermissionContext` 缓存 `/api/permissions/me` 返回的 code 列表，导航菜单和具体按钮都会依据 `hasPermission(code)` 结果展示/隐藏，确保 UI 与后端策略一致。



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

4.  登录防刷：同一 IP 10 分钟内连续 3 次登录失败后强制验证码，验证码为 4 位字母/数字扭曲图。前端在出现“验证码”提示后调用 `GET /api/auth/captcha` 获取 `imageBase64`，登录时需在 body 中额外提交 `captcha` 字段。4.1 前端验证码刷新节流：登录页点击图片/按钮刷新验证码时会带 `force=true` 触发后端跳过 60s 复用缓存，并在前端本地施加 5 秒冷却（与后端二级速率限制一致）；冷却未结束继续刷新会提示“刷新过快，请X秒后再试”并直接返回。

5.  登录校验与提示：用户名长度 3-32、密码 6-64，均限制为可打印 ASCII；后端在登录失败时会返回 `captchaRequired` 和 `remainingAttempts`（距离强制验证码前的剩余尝试次数，命中阈值后为 0），前端直接据此决定是否展示验证码与提示。

6.  验证码服务限流与缓存：`/api/auth/captcha` 以 IP+UA 为键，5s 内重复请求会被拒绝，生成后的验证码在 60s 内复用同一张图，TTL 5 分钟。

7.  全局登录/验证码限流：`/api/auth/login` IP 级 10 分钟 30 次内控制；`/api/auth/captcha` IP 级 1 分钟 10 次（同时 5s 二级速率限制），超出将返回“请求过于频繁，请稍后再试”。



---



### 4.3 API 响应结构说明

*   **文章详情 (`/api/posts/{id}`)**:

    *   返回 `PostDetailDto`，包含 `summary` (PostSummaryDto), `contentMd`, `contentHtml`。

*   **文章详情 (`/api/posts/{id}`)**:

    *   返回 `PostDetailDto`，包含 `summary` (PostSummaryDto), `contentMd`, `contentHtml`。

    *   **关键**: 文章的元数据（标题、作者、分类、摘要等）都在 `summary` 字段中，且为扁平化结构（如 `authorName`, `category` 为字符串），而非嵌套对象。

    *   前端 `ArticleDetail` 组件需优先从 `articleData.summary` 获取这些信息。



### 4.4 静态资源与头像存储 (Static Resources & Avatars)

*   **根路径配置**：`application.yaml` 暴露 `storage.base-path`（支持环境变量 `STORAGE_BASE_PATH`），默认值为相对路径 `uploads`（跨平台，通常对应项目/部署目录下的 `uploads/`）；生产环境建议显式设置 `STORAGE_BASE_PATH=/home/sangui/uploads`（或你的实际挂载目录），避免因工作目录变化导致落盘位置漂移。应用启动时会自动创建根目录以及 `avatar/`、`posts/` 等必要子目录。

*   **站点版本**：`application.yaml` 提供 `site.version`，后端会在 `/api/site/meta` 中返回该值；前端首页 Banner 直接读取该字段显示 `SANGUI BLOG // <version>`，统一版本号来源。

*   **站长工具验证（Bing/Google/Baidu/360）**：
    *   必应站长工具（Bing Webmaster Tools）验证采用 `msvalidate.01` 的 HTML `<meta>` 标记。
    *   Google Search Console 验证采用 `google-site-verification` 的 HTML `<meta>` 标记。
    *   百度站长平台验证采用 `baidu-site-verification` 的 HTML `<meta>` 标记。
    *   360 站长平台验证采用 `360-site-verification` 的 HTML `<meta>` 标记。
    *   以上验证标记统一放置于 `SanguiBlog-front/index.html` 的 `<head>` 中（位于首个 `<body>` 之前）。注意：即使验证成功后也需要长期保留对应 `<meta>` 标记，否则会失去“已验证”状态。

*   **数据库与 JWT 凭证**：`spring.datasource.username/password` 会优先读取 `DB_USERNAME` / `DB_PASSWORD`，若未设置则兼容 Spring Boot 原生的 `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD`；`jwt.secret` 亦支持 `JWT_SECRET` 或 `SPRING_JWT_SECRET`。仓库中不再保存明文，生产与本地环境需通过系统环境变量或额外的 `application-local.yaml`（自行创建并忽略）提供真实值。

*   **目录结构**：头像、文章图片、附件等均放置在根目录下的独立子目录，例如文章资源统一保存在 `<base-path>/posts/<slug>/`。后续扩展新的资源类型时只需在该根目录内再创建子目录即可，部署与备份流程保持一致。

*   **数据库字段**：`users.avatar_url` 保存头像文件名或 `avatar/` 相对路径；`posts.slug` 现改为记录文章图片文件夹的相对路径（如 `posts/20241124/abc123`），后端返回数据时会携带该路径以便前端按需拼接。

*   **静态映射**：`WebConfig` 将 `/avatar/**` 与 `/uploads/**` 映射到实际文件系统目录，无需重新打包 `static/` 资源即可即时读取最新上传内容。文章图片可直接通过 `http://<server>/uploads/<slug>/xxx.png` 访问。
*   **上传安全**：`/api/upload/avatar` 与 `/api/upload/post-assets` 仅接受常见图片扩展（png/jpg/jpeg/webp/gif/avif），校验文件头 `Content-Type`，头像单文件上限 2MB，文章资源单文件 8MB、单次最多 10 个且总量不超过 30MB，超限或类型不符直接返回 400；后端仍使用 `StoragePathResolver` 归一化路径并阻止目录穿越。

*   **前端处理**：`/admin/create-post` 的“插入图片”按钮会携带预留的 `slug` 调用 `/api/upload/post-assets`，后端在不清空目录的情况下追加文件并返回 `files`、`urls` 以及用分号拼接好的 `joined` 字符串；前端据此插入 Markdown，若需要把图片地址落库可直接使用 `joined`。`slug` 现改为按需懒生成：仅在首次上传图片或点击“立即发布”时才调用 `/api/upload/post-assets/reserve`，生成后在同一编辑会话内复用，发布成功会清空该值以避免产生空目录。

*   **静态资源域名**：`site.asset-base-url` 支持占位 `${ASSET_BASE_URL:http://localhost:${server.port}/uploads}`，后端 `/api/site/meta` 会把该值透传给前端，`buildAssetUrl` 优先使用该值；若未配置，则依次回落到 `VITE_ASSET_ORIGIN` → `VITE_API_BASE` 对应域名 → `window.location.origin` → `http://localhost:8080`。若 `asset-base-url` 本身带有路径（如 `https://cdn.example.com/uploads`），前端会自动去重重复的 `uploads/` 段，不会生成 `uploads/uploads/...`；当页面以 HTTPS 访问而传入的域名仍为 `http://` 时，会自动升级为 `https://` 后再生成资源 URL，从源头消除 Mixed Content 告警（前提是资源域名已支持 HTTPS）。
*   **图片回退重试**：`ImageWithFallback` 在 `src` 发生变化时会自动重置错误状态，允许资源域名或登录态更新后重新请求真实图片，避免导航头像在首次加载失败后长期停留在默认占位。

*   **文章图片预览**：文章详情页会为 Markdown/HTML 中的所有 `<img>` 元素注入 `cursor-zoom-in` 样式，并在点击时打开全屏遮罩预览，图片路径自动经过 `resolveAssetPath` 补全，关闭遮罩后恢复页面滚动。



### 4.5 评论与楼中楼

*   数据结构：`comments` 表含 `parent_comment_id` 外键（见 `sanguiblog_db.sql`），配合 `ON DELETE SET NULL` 可形成任意深度的树形结构。SQL 文件附带了多条带父级关系的测试评论，可直接导入 MySQL 验证联动效果。

*   后端：`CommentService#listByPost` 会按 `parent_comment_id` 构建树形 `CommentDto.replies`，前端无需再次聚合；新增、删除、编辑均会触发 `loadComments(postId)` 重新拉取。

*   头像：若评论由登录用户提交，渲染时优先读取用户当前 `avatar_url`，保证更新头像后历史评论也能展示最新形象；匿名评论则退回 `author_avatar_url` 字段。

*   前端：`AppFull.jsx` 中的 `CommentsSection` 递归渲染 `replies`，支持楼中楼展示，但从交互上限制两层（顶层评论 + 一次回复），超过一层的节点不再出现“回复”按钮；评论总数通过递归统计所有层级，UI 会同步显示。

*   为兼顾阅读体验与交流效率，当前实现允许用户回复任意楼层，但当回复目标处于第二层时，仍会以“二级评论”形式展示，并在内容前自动附加 `@原作者：` 以指示引用对象；提交到后端的 `parentId` 始终指向顶层楼层，保持数据结构一致。

*   接口补充：`GET /api/comments/recent?size=5` 会返回最近通过审核的若干条评论（默认 5 条，上限 20），每条带有 `postId/postTitle/postSlug` 便于前端跳转对应文章。首页左侧的“最新评论”模块直接消费该接口，并在评论增删改后由 `useBlogData` 自动刷新。

*   安全策略：`/api/comments/recent` 现已加入 Spring Security 的匿名白名单（`SecurityConfig` 中 `permitAll` 列表），未登录访客也可正常获取最新评论；评论的新增、编辑、删除仍受 `/api/posts/**` 写操作权限控制，不会被此调整放开。

*   交互：从首页“最新评论”点击评论文本会直接跳转到对应文章详情的开头（不再锚定具体评论），提示文案通过 `title="来自《文章》"` 告知来源，保持体验一致且避免滚动失败。

*   管理权限：登录用户若拥有 `COMMENT_REVIEW` 或 `COMMENT_DELETE`，会在文章详情页的评论项中额外看到“编辑”“删除”按钮；这些操作仍调用 `/api/posts/{postId}/comments/{commentId}`，后端依据 `PERM_*` 判定是否允许越权处理。

*   安全校验：自 V1.3.21 起，所有 `/api/posts/{postId}/comments/{commentId}` 写操作都会在 Service 层验证评论是否属于当前文章，若 `commentId` 不隶属于 `postId`，后端直接返回 400 以阻断 IDOR；管理员使用 `/api/admin/comments/{id}` 仍可跨文章处理。



### 4.6 评论通知（信封红点）

*   数据表：新增 `comment_notifications`，字段含 `recipient_id`（接收人）、`comment_id`、`post_id`、`comment_author_name`、`comment_excerpt`、`is_read`、时间戳，外键均启用 `ON DELETE CASCADE`，避免评论/文章删除后残留脏数据。
*   生成规则：`CommentService#create` 保存成功后调用 `NotificationService#createForComment`。接收人包含：① 文章作者；② 被回复的评论作者（仅当其是登录用户），并会避开“自己回复自己”。内容截断 150 字并保留当时的昵称快照。
*   接口：`GET /api/notifications/unread?limit=20`（返回 `{items,total}`，按时间倒序）、`POST /api/notifications/{id}/read`（单条已读）、`POST /api/notifications/read-all`（全部已读）；均需登录。
*   前端：导航栏新增信封按钮（桌面与移动均可见），每 60 秒轮询未读并显示红点数量；点击弹窗可查看来源昵称、片段、时间与文章标题，点击任意条目跳转文章并标记已读，支持“一键全部已读”。


### 4.7 Data Collection
* PV 采集
  * POST `/api/analytics/page-view`：前端在首页/Archive/Admin/工具/关于等视图中调用 `recordPageView`，提交 `PageViewRequest(postId,pageTitle,referrer,geo,userAgent,clientIp,sourceLabel)`；后台 `AnalyticsController` 通过 `IpUtils` 解析真实 IP、记录 UA 并结合 JWT 判定 `userId`，`referrer` 为空时记为“直接访问”。
  * 自 V2.1.27 起，工具中心：`/tools` 列表仍按原样打点（`/games` 兼容跳转），进入具体游戏（内置详情或外链打开）时会写入 `pageTitle = Game: <游戏名>`，`sourceLabel = 游戏详情-<游戏名>`，与其它页面日志格式一致，便于在后台访问日志中定位具体游戏。
  * 自 V2.1.186 起，关于页 `/about` 也会写入访问日志（`pageTitle = About`），与首页/归档/工具保持一致，便于在后台访问日志中统计与检索。
  * 自 V2.1.270 起，后端会将 `GET /sitemap.xml` 与 `GET /robots.txt` 的访问也写入 `analytics_page_views`（`pageTitle = sitemap.xml/robots.txt`），便于超级管理员在后台访问日志（`/admin/analytics`）检索爬虫/访客对站点地图的抓取行为；为避免搜索引擎高频抓取导致日志膨胀，默认对同一 IP + 同一页面做 10 分钟内存限流（10 分钟内最多记 1 条）。
  * 自 V2.1.271 起，`/sitemap.xml` 支持当 URL 规模超出阈值时返回 `<sitemapindex>` 并通过 `page` 参数分片拉取（`/sitemap.xml?page=1..N`），同时 `/sitemap.xml` 与 `/robots.txt` 支持 `ETag/If-None-Match` 条件请求以返回 304，降低爬虫重复抓取成本。
  * 若前端打点失败，`PostController` → `PostService.incrementViews` 仍会执行 +1，并调用 `recordAnalyticsPageView` 写入 `analytics_page_views`；同时使用 Caffeine（IP+post）做 10 分钟 TTL 限流 + 10 分钟数据库去重，避免刷量并降低短时间重复请求的 DB 压力。
  * 自 V1.3.93 起，文章详情页仅保留后端埋点（`PostService.recordAnalyticsPageView`），前端不再重复调用 `recordPageView`，确保单次访问仅计一次 PV；为解决 SPA 下 `document.referrer` 不可靠的问题，前端在请求文章详情 `GET /api/posts/{id}` 时会附带 `X-SG-Referrer`（外部来源或站内上一页 URL）与可选的 `X-SG-Source-Label`（站内跳转中文描述），后端据此写入正确来源。
  * 自 V2.1.223 起，访问不存在的文章（例如 `/article/999999` 或 `/article/xxxx`）会在前端明确展示 404；不再回退展示 `MOCK_POSTS[0]`（最新文章占位）导致的“标题/摘要像对、正文为空”的错觉。
  * 自 V1.3.94 起，AppFull.jsx 在 Home/Archive/Admin 视图外层增加 `claimAutoPageView/resetAutoPageViewGuard` 守卫，避免 React StrictMode 或多重渲染导致的 analytics_page_views 连续重复记录（同一视图 key 不变时不会重复写入；切换到其它视图会重置标记）。
  * 自 V2.1.250 起，首页访问日志 `pageTitle` 由 `Home` 调整为 `home(当前页/总页数)`（例如 `home(1/16)`）；由于首页 URL 不体现页码，前端会在文章列表分页请求完成后，根据 `postsPage.page + postsPage.total/pageSize` 计算并写入标题，同时将守卫 key 细化为 `home-<page>-<totalPages>-size-<pageSize>`，从而支持“翻页也能打点”，且同一页不会重复记录。
* 数据落库
* `viewer_ip`：优先读取 `X-Forwarded-For`/`X-Real-IP`。前端默认通过同源接口 `GET /api/analytics/client-ip` 获取归一化 IP，若拿到的不是回环地址则随 PV 请求附带 `clientIp`；若返回仍是 `127.0.0.1`/`::1` 且需要公网地址，可在前端 `.env` 设置 `VITE_ENABLE_PUBLIC_IP_FETCH=true`（可选用 `VITE_PUBLIC_IP_ENDPOINT` 覆盖默认 `https://api.ipify.org?format=json`）启用公网兜底。默认不再直接访问外网 IP 服务，避免公司/校园网络拦截导致控制台报错。
  * `referrer_url`：自 V1.3.87 起记录中文来源描述。站内跳转来源优先使用前端上报的 `sourceLabel`（例如“来自首页/归档页/站内文章”等，基于 `viewNavigation.js` 在跳转前写入的 `sessionStorage: sg_prev_url`），外部来源则由后端解析 `referrer` 并识别搜索引擎：若 referrer 含关键词参数，会展示为“谷歌：MyBatis 源码解析”这类格式；若无法拿到关键词则展示“来自搜索引擎：谷歌”。若前端埋点失败，兜底记录为“系统兜底（前端埋点失败）”。
  * `analytics_traffic_sources`：自 V1.3.88 起表结构默认 `CURRENT_TIMESTAMP`，实体也通过 `@CreationTimestamp/@UpdateTimestamp` 自动填充，避免 `created_at/updated_at` 为 NULL；V1.3.90 起 `updateTrafficSourceStat` 直接调用 `INSERT ... ON DUPLICATE KEY UPDATE`，数据库负责自增 visits，再无 Hibernate Session 冲突；V1.3.92 之后在服务层重新查询当天来源并以 `BigDecimal` 精确计算占比（四舍五入 2 位），写回 `percentage` 供仪表盘直接消费；统计维度对搜索引擎会聚合到引擎名（如“谷歌/百度”），避免关键词导致来源表维度爆炸。
  * `user_id`：根据 JWT 中的主体 ID 关联 `users` 表，未登录访客则写入 `NULL`。
  * `geo_location`：默认通过 `GeoIpService` 调用 ipapi.co 反查；前端传入的 `geo`（本地时区）仅作兜底。
* 管理端读取
  * GET `/api/admin/analytics/summary` 聚合 PV、UV、来源、热门文章、最近访问等指标，用于仪表盘。
  * GET `/api/admin/analytics/page-views?page=&size=` 返回 `analytics_page_views` 分页结果（含 viewed_at/IP/Geo/userId/username/display_name/avatarUrl 等），供后台“访问日志”实时记录使用；自 V2.1.253 起支持筛选参数：`ip`（精确匹配 viewer_ip）、`keyword`（模糊匹配 page_title/referrer_url/geo_location/post.title/post.slug）、`loggedIn`（true/false）、`postId`、`start`/`end`（yyyy-MM-dd，按 viewed_at 区间过滤，end 为包含当天）。
  * 自 V2.1.251 起，后台访问日志（`/admin/analytics`）分页区由仅“上一页/下一页”升级为“数字页码”按钮，可直接跳转到指定页；与“条数/页”联动，切换每页条数会自动回到第 1 页，避免页码越界。
  * DELETE `/api/admin/analytics/page-views/{id}` 仅 SUPER_ADMIN 可用；存在时删除 1 条访问日志并返回受影响行数，不存在则返回 0。
  * DELETE `/api/admin/analytics/page-views?ids=<id>&ids=<id>` 仅 SUPER_ADMIN 可用；支持批量删除，内部先统计命中条数（countByIdIn），再执行 deleteAllByIdInBatch，空列表或全未命中时返回 0。
  * 访问日志页头像：前端复用用户列表的头像解析（avatar/avatarUrl/avatar_url → buildAssetUrl），无头像时以首字母色块兜底；头像悬停提示为 `id-username-display_name`，与用户管理列表保持一致。自 V1.3.85 起，后端 `AdminAnalyticsSummaryDto.RecentVisit` 直接返回 `display_name` 字段，前端也会将缺少目录层级的存储路径归一化为 `/uploads/avatar/<file>`，避免因裸文件名导致破图或昵称缺失。
  * DELETE `/api/admin/analytics/page-views/me` 仅 SUPER_ADMIN 可用；V1.3.96 起会先收集该账号历史日志中的全部 viewer_ip，再连同 user_id 为空且 IP 命中的访客记录一并清理，避免登录前遗留的自访数据被漏删。
  * 自 V2.1.252 起，清理“我的访问日志”时会额外删除 `viewer_ip = 127.0.0.1` 且 `user_id` 为空的记录，用于处理本地/反代环境下匿名日志被写成回环地址而无法通过“关联 IP”命中的残留问题。

### 4.7 Initial Accounts & Default Passwords

*   DataInitializer now only ensures the default roles exist and assigns them to `sangui` / `admin_user1` / `editor_user2` when these users lack a role; it no longer changes or resets their passwords automatically.

*   There is no longer any `app.bootstrap.*-password` override. Operators must rotate credentials manually（SQL 或后台重置均可），并在首次登录后及时修改密码且不要把默认口令写入代码库/脚本。

*   After each manual reset, verify `/admin/profile` 可正常登录，并在 NOTE 中同步记录密码策略（仅写流程，不写明口令）。



## 5. 易错点与注意事项 (Common Pitfalls & Gotchas)



### ⚠️ 1. 数据来源混合 (Hybrid Data Source)

**现状**: 前端主流程已接入真实 API，少量 Mock 仅保留作兜底。

*   **文章/评论**: 主要走真实 API (`useBlogData` -> `api.js`)。

*   **后台仪表盘 (Dashboard)**：`DashboardView` 默认消费 `/api/admin/analytics/summary` 的 `overview/dailyTrends/trafficSources`。`TrendChart` 采用纯 SVG 折线+面积填充；当选择 7/14/30/全部(30 天) 时，若接口趋势数据不足或全 0，会自动拉取最近 1500 条 `/api/admin/analytics/page-views` 在前端聚合对应天数 PV/UV 并标注“访问日志聚合”，避免有数据却空图的误判。



### ⚠️ 2. 数据库 Schema 维护

*   **配置**: `spring.jpa.hibernate.ddl-auto = none`

*   **后果**: 修改 Java Entity (`User`, `Post` 等) **不会** 自动更新数据库表结构。

*   **操作**: 每次修改字段，必须手动编写 SQL 并在数据库中执行 `ALTER TABLE`。



### ⚠️ 3. 跨域 (CORS)

*   请在 `application.yaml` 中配置 `security.cors.allowed-origins`，至少包含你实际访问前端的域名/端口，例如：

    *   `https://sangui.top` / `https://www.sangui.top`

    *   `http://localhost:5173` / `http://127.0.0.1:5173`（本地前端）

    *   其它你实际使用的本地端口（如 `5174/8082/3000` 等）

*   **后果**：若未放行，会被浏览器 CORS 策略直接拦截，表现为前端请求失败、控制台提示跨域错误。


### ⚠️ 4. React 19 兼容性

*   项目使用了 React 19 (RC/Beta 阶段特性)。

*   **注意**: 某些第三方库可能尚未完全适配 React 19。如果遇到奇怪的渲染错误，检查 `package.json` 中的依赖版本。



### ⚠️ 5. 紧急广播 (System Broadcast)

*   前端通过 `EmergencyBar` 展示广播，按 `style` 渲染：`ALERT`（红色闪烁紧急）与 `ANNOUNCE`（暖色庆典公告）。
*   `ANNOUNCE` 目前改为纯红金/香槟金渐变底，不再叠加烟花或彩带等装饰；后台 `/admin/settings` 的广播预览保持同款配色与简洁布局。

*   广播记录字段：`content`、`active`、`style`（默认 `ALERT`，对应 `system_broadcasts.style`），后端 `SiteService.updateBroadcast` 会兜底非法取值。

*   SUPER_ADMIN 可在 `/admin/settings` 顶部卡片配置广播：填写文案、选择紧急/庆典风格并开启/关闭，保存即调用 `POST /api/site/broadcast` 并即时同步前台通知条。
*   接口权限：`POST /api/site/broadcast` 现要求 SUPER_ADMIN（需携带 JWT），服务端会记录 `created_by`，未授权请求返回 403。
*   用户点击广播关闭按钮后，前端会将关闭状态写入 `sessionStorage`（`sangui-broadcast-dismissed`），在当前浏览器会话内不再展示；关闭标签页/浏览器后会恢复显示。

*   `/api/site/meta.broadcast` 用于刷新前端初始广播，请确认数据库表 `system_broadcasts` 已持久化最新记录。

*   自 V2.1.227 起，后端不再使用 `System.out.println` 输出广播请求/内容，改为 slf4j 结构化日志；为避免泄露与污染日志，广播内容不会完整打印，仅记录长度与状态信息。



### ⚠️ 6. 全局异常处理（错误信息泄露）

*   后端统一由 `GlobalExceptionHandler` 处理未捕获异常。自 V2.1.226 起：生产环境（无 `dev/local` profile）对外固定返回“服务器内部错误”，避免把堆栈/内部实现细节泄露给前端；同时服务端使用 `log.error` 记录完整堆栈便于排查。

*   若需要在本地调试时查看真实异常 message，可通过设置 `SPRING_PROFILES_ACTIVE=dev`（或 `local`）启用“对外返回异常 message”的调试模式；上线环境请勿启用该 profile。



### ⚠️ 7. 仓库体积与重复入口（误维护风险）

*   **前端真实入口**在 `SanguiBlog-front/src/main.jsx`，不要在仓库根目录新增/保留“看起来像入口”的同名文件，否则后续维护者容易误改。

*   **大文件治理**：避免把 `SanguiBlog-front/node_modules/`、`SanguiBlog-server/target/`、`uploads/` 等构建产物/运行时文件提交到 Git；如果确实需要共享图片/封面，建议走对象存储/CDN，或采用 Git LFS（按团队习惯二选一）。

*   **Legacy 收拢**：对“已弃用但暂时保留”的旧组件/资源，统一迁入 `SanguiBlog-front/src/legacy/` 并在 `SanguiBlog-front/src/legacy/README.md` 写明弃用原因与使用规范，避免同一功能出现多份实现导致误维护。

*   **文档编码**：仓库内 Markdown 文档建议统一为 UTF-8（无 BOM），并避免零宽字符/控制字符混入，防止后续复制、搜索、正则匹配时出现“看不见但影响结果”的协作问题。



---



## 6. 快速开始 (Quick Start)

- 环境切换：在仓库根目录执行 `./scripts/switch-env.ps1 dev|prod`，会同时更新后端 `application.yaml` 与前端 `.env.local`。
- 同步生产端游戏 uploads：在仓库根目录执行 `./scripts/sync-uploads.bat`（内部调用 `scripts/sync-uploads.ps1`），会将生产端 `REMOTE_DIR`（默认 `/home/sangui/uploads/games`）镜像到本地 `uploads/games`（只读生产端；冲突以生产端为准，本地会覆盖/删除差异文件）。

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

### 关于页维护

* 数据库：`about_page` 表保存 `content_md`、`content_html`、`updated_by`、`updated_at` 等字段，初始化脚本 (`sanguiblog_db.sql`) 会插入 `id=1` 的占位记录，避免新增时还要建行。

* 前台接口：`GET /api/about` 返回 Markdown/HTML，如果尚未配置内容则直接返回 `null` 供前端显示“敬请期待”。

* 后台接口（需 `SUPER_ADMIN`）：

  * GET `/api/admin/about` 拉取当前 Markdown 及渲染后的 HTML。

  * PUT `/api/admin/about` 保存新的 Markdown，服务端会同步渲染 HTML 并记录最后编辑人。

* 前端：站点 `/about` 页面直接消费 `/api/about`；后台“关于页”编辑器提供 Markdown 输入与附件上传，保存成功后刷新前台内容。

### 自定义 HTML / 游戏页面

- 数据库：新增表 `game_pages`，字段包含 `title`、`description`、`slug`、`file_path`、`status`（ACTIVE/DISABLED/DRAFT）、`sort_order`、`created_by/updated_by`、时间戳。初始化 SQL 已创建空表，并为 SUPER_ADMIN 注入 `GAME_MANAGE` 权限。

- 静态资源：HTML 文件落盘到 `uploads/games/{slug}/index.html`，对外访问路径 `/uploads/games/{slug}/index.html`；其中 `{slug}` 默认取上传的 HTML 文件名（去扩展名）。
  - 若文件名为英文/数字：会做 URL-safe 归一化（如 `register.html` -> `register`）。
  - 若文件名包含中文等非 ASCII 字符：会尽量保留 Unicode 字符（并过滤 Windows 不允许的目录字符与控制字符），避免退化成难读的 `game-xxxxxx`。
  - 若文件名不可用，会回落使用表单 `title` 生成。
  - 若同名目录/slug 已存在，会自动改为 `register2`、`register3`…（中文同理，如 `注册2`、`注册3`…）并在创建接口的 `message` 中提示上传人；存储路径由 `StoragePathResolver` 统一管理。

- 公共接口：
  - `GET /api/games`：返回所有 `ACTIVE` 状态的页面列表（包含 title/description/url/slug/updatedAt）。
  - `GET /api/games/{id}`：返回单页详情（ACTIVE 状态限制），前端通过 `iframe` 直接加载返回的 `url`。

- 管理接口（需 `PERM_GAME_MANAGE`，默认仅 SUPER_ADMIN）：
  - `GET /api/admin/games?page&size&keyword`：分页检索全部页面。
  - `POST /api/admin/games`：`multipart/form-data`，字段 `title`(必填)、`description`、`status`、`sortOrder`、`file`(必填 HTML)。
  - `PUT /api/admin/games/{id}`：同上，`file` 可选（为空则仅改元数据）。
  - `DELETE /api/admin/games/{id}`：删除记录并尝试清理对应目录。

- 前端：主导航为「工具」入口；`/tools` 仅展示可用页面列表（内容居中，两侧保留日/月背景，`/games` 兼容跳转），`/tools/:id` 通过 `iframe` 渲染上传的 HTML；工具卡片“进入”会先用 `buildAssetUrl` 解析 `game.url` 再新开标签，确保静态资源域名/路径生效，`AppFull.jsx` 需保持该工具函数导入。超级管理员在 `/admin/settings` 的“游戏页面管理”块完成上传/编辑/删除/上下线与排序，操作成功会刷新前台列表。

- 安全策略：为避免全站被第三方站点嵌入，默认 CSP 设置 `frame-ancestors 'none'` 且 `X-Frame-Options: DENY`；但游戏页需要站内 `iframe` 展示，因此服务端对 `/uploads/games/**` 单独放开为“仅允许同源嵌入”（`frame-ancestors 'self'` + `X-Frame-Options: SAMEORIGIN`），其它页面仍保持禁止嵌入。

### Swagger 安全策略

- 默认/生产环境：`springdoc.swagger-ui.enabled=false`、`api-docs.enabled=false`，杜绝接口模型暴露。

- 开发调试：设置环境变量 `SPRING_PROFILES_ACTIVE=dev`，加载 `application-dev.yaml` 自动开启 `/swagger-ui.html` 与 `/api-docs`；发布前务必移除该 profile。

### BotGuard 反爬风控（进程内内存态）

- **目标**：不追求“彻底阻断”，而是通过行为识别 + 轻度限速 + 必要时验证码验证，让自动化抓取变得低效且不稳定，同时尽量降低校园网/公司网/NAT 场景下的误伤。
- **实现位置**：统一 Web Filter（`com.sangui.sanguiblog.security.botguard.BotGuardFilter`），对进入应用的请求做基础信息采集与风险评分。
- **状态存储**：全部使用应用进程内短期内存结构（Caffeine + `RollingWindowCounter60s`），仅用于实时判断；不持久化、不跨重启保留，并通过 TTL/容量上限避免无限增长。
- **判定策略**：
  - 低分：直接放行。
  - 中分：随机增加少量响应延迟（默认 120~420ms）。
  - 中高分：仅在“搜索/翻页等高滥用接口”上触发验证码（见下方接口），避免对普通静态资源/无关路径反复打扰。
  - 高分且持续异常：短暂阻断（HTTP 429，携带 `Retry-After`）。
- **验证码接口**（对外开放）：
  - `GET /api/guard/captcha?force=false`：获取验证码（Base64 图片）。
  - `POST /api/guard/verify`：提交验证码，通过后服务端下发 `sg_guard`（默认名，可配置）的短期 Cookie，用于降低后续风险分并减少打扰。
- **响应约定**：
  - 触发验证码：HTTP 403，JSON 结构 `ApiResponse.fail("需要验证码", { captchaRequired, captchaUrl, verifyUrl, riskScore })`。
  - 触发阻断：HTTP 429，JSON 结构 `ApiResponse.fail("请求过于频繁，请稍后再试", { retryAfterSeconds, riskScore })`，同时返回 `Retry-After` 响应头。
- **多实例说明**：该风控为“单实例内生效”。若未来演进为多实例部署，各实例之间不会共享风险状态（这是当前阶段为了降低复杂度与误伤风险的设计取舍）。
- **可配置项**：`security.bot-guard.*`（见 `BotGuardProperties`，可调整阈值/延迟区间/验证码触发范围/阻断时长/Cookie 策略等）。

- **管理端白名单**：`/api/admin/**`、`/api/upload/**` 默认不参与 BotGuard 的 403/429 决策（避免在 JWT 鉴权之前误伤真实管理员操作）；这些路径由 Spring Security 负责认证与授权控制。

- **登录态接口白名单**：`/api/notifications/**`、`/api/users/**`、`/api/permissions/**` 默认不参与 BotGuard 的 403/429 决策，优先交由 Spring Security 返回 401/403（避免通知中心等 `isAuthenticated()` 接口在鉴权生效前被误判为异常并短封 429）。
- **已登录请求放行**：若请求头携带 `Authorization: Bearer <token>` 且 token 校验通过，BotGuard 将直接放行（不再返回 403/429）；权限与数据访问仍由 Spring Security 与业务侧校验负责。
- **静态资源保护**：BotGuard 的 429 短暂阻断仅对 `/api/**` 生效；页面入口与 CSS/JS 等静态资源即便命中短封窗口也不会被 429 打断（最多做业务侧正常加载/失败），避免“刷新后无样式/白屏”的用户体验问题。

### 角色初始化更新

- 自 V1.3.76 起，`DataInitializer` 仅创建基础角色（SUPER_ADMIN / ADMIN / USER）并同步默认权限，不再为固定用户名自动分配角色；请通过后台或 SQL 显式授予角色，避免弱口令账户被静默升权。

### 未引用图片清理（仅超级管理员）

- 后端提供 `/api/admin/maintenance/unused-assets`（GET 扫描）与 `/api/admin/maintenance/unused-assets/delete`（POST 删除，Body: paths[]）。

- 扫描范围：所有文章（任意状态）的 Markdown/HTML 与封面字段 coverImage，以及关于页的 Markdown/HTML 中引用的 `/uploads/posts/**` 与 `/uploads/covers/**` 资源；头像目录不在清理范围内。

- 删除前需二次确认；删除后会尝试清理空目录，作用于 `uploads/posts/` 与 `uploads/covers/` 下的图片扩展名文件。
