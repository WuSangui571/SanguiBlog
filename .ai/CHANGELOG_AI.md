# AI Change Log（AI修改日志）

> 目的：记录每次由 AI 参与的改动，避免后续任务重复造轮子或破坏既有行为。
> 要求：每次合并前必须追加一条记录（倒序）。

---

## [2026-04-11] 让首页 Hero 文案贴合首屏画布淡出而不额外上飞
- 背景/需求：用户进一步说明，首页 Hero 文案不应额外向上漂移，而应像钉在首页画布上一样，保持与首页底部的相对距离稳定；参考模板 `newIndex/html/indexV11.html` 的感觉是文案随首屏画布存在，只缓慢透明淡出。
- 修改类型：fix
- 影响范围：首页 Hero 文案滚动位移、Hero 性能/滚动回归测试
- 变更摘要：
  1) 对照 `newIndex/html/indexV11.html` 后确认，模板里 Hero 文案主要是挂在首屏内容容器上淡出，不应像当前实现一样额外使用负向 `contentY` 让文字先往上飞走。
  2) 更新 `HeroPerformance.test.js`，锁定 Hero 文案继续使用更缓的透明度映射 `[0, 180, 520] -> [1, 0.9, 0]`，但禁止再声明 `const contentY = useTransform(...)`，并要求内容层 style 只绑定 `opacity: contentOpacity`。
  3) 在 `Hero.jsx` 中移除 `contentY` 位移映射和 `y: contentY` 样式绑定，只保留缓慢透明淡出，让文案相对首屏画布保持稳定。
  4) 未修改 Hero 结构、背景图、按钮、手机端首篇文章滚动目标或鼠标视差逻辑。
  5) 本次属于对上一轮 Hero 动效理解偏差的修正，不单独提升站点版本号。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/Hero.jsx`
  - `SanguiBlog-front/src/appfull/public/HeroPerformance.test.js`
  - `.ai/CHANGELOG_AI.md`
- 检索与复用策略：
  - 检索关键词：`contentY` / `useTransform` / `home-hero__content` / `hero-wrap` / `indexV11.html`
  - 候选实现：`Hero.jsx` 当前 contentY 位移、`Hero.jsx` contentOpacity 淡出、模板 `indexV11.html` 的 `hero-wrap` 行为、`homeRedesign.css` 的 sticky Hero 布局
  - 最终选择：原位删除额外位移，只复用现有透明度淡出链路，不新增动画系统
- 验证方式：
  - 执行 `node .\src\appfull\public\HeroPerformance.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\HeroScrollTarget.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-11] 放缓首页 Hero 文案随滚动淡出的节奏
- 背景/需求：用户反馈首页打开后，随着页面上滑，中间 Hero 文案透明消失太快；鼠标滚轮只滑动几小下时首页仍有大部分在屏幕内，但文案已经完全透明，希望文案多移动一会再消失，并且透明度更缓慢、渐进地变化。
- 修改类型：fix
- 影响范围：首页 Hero 首屏文案滚动淡出节奏、Hero 性能/滚动回归测试
- 变更摘要：
  1) 检索确认首页首屏文案淡出由 `Hero.jsx` 中的 `contentOpacity = useTransform(scrollY, [0, 80, 220], [1, 0.72, 0])` 控制，位移由 `contentY = useTransform(scrollY, [0, 220], [0, -96])` 控制，因此当前在约 220px 滚动距离就完全透明，确实偏快。
  2) 先更新 `HeroPerformance.test.js`，锁定新的透明度映射必须拉长到 `[0, 180, 520] -> [1, 0.9, 0]`，位移映射必须拉长到 `[0, 520] -> [0, -128]`，并禁止回退到旧的 `[0, 80, 220]` 与 `[0, 220]` 映射。
  3) 在 `Hero.jsx` 中只调整两条 `useTransform` 参数：滚到 180px 时文案仍保留 90% 不透明度，之后继续缓慢淡出，到 520px 才完全透明；位移也同步拉长，形成“多移动一会再消失”的节奏。
  4) 未修改 Hero 结构、背景图、CTA 按钮、手机端滚动目标或鼠标视差逻辑。
  5) 本次属于首页首屏动效体验微调，不单独提升站点版本号。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/Hero.jsx`
  - `SanguiBlog-front/src/appfull/public/HeroPerformance.test.js`
  - `.ai/CHANGELOG_AI.md`
- 检索与复用策略：
  - 检索关键词：`useTransform` / `scrollY` / `contentOpacity` / `contentY` / `home-hero__content`
  - 候选实现：`Hero.jsx` 文案透明度映射、`Hero.jsx` 文案位移映射、`homeRedesign.css` Hero 样式、`HeroPerformance.test.js` 现有 Hero 动效回归测试
  - 最终选择：原位调整 `Hero.jsx` 的滚动映射参数，复用现有 Framer Motion 动效链路，不新增状态或第二套动画
- 验证方式：
  - 执行 `node .\src\appfull\public\HeroPerformance.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\HeroScrollTarget.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-11] 去掉首页博主信息卡与全部标签卡的外层 hover 上浮
- 背景/需求：用户希望首页左侧“博主信息”卡片和“全部标签”卡片的外层卡片不再在鼠标悬浮时整体上浮，但要求“全部标签”卡片内部具体标签 chip 的 hover 上浮保留，其他区域保持不变。
- 修改类型：fix
- 影响范围：首页左侧博主信息卡、首页左侧全部标签卡、首页侧栏卡片最小回归测试
- 变更摘要：
  1) 检索确认首页左侧博主信息外层卡和全部标签外层卡都位于 `ArticleList.jsx`，当前仍复用默认 `home-ios-card` hover 行为；而首页最新评论外层卡已经通过 `home-ios-card--static` 关闭了整体上浮，可直接作为复用方案。
  2) 先更新 `ArticleList.test.js`，锁定“博主信息外层卡必须带 `home-ios-card--static` 且保留 `home-ios-card--overflow-visible`”“全部标签外层卡必须带 `home-ios-card--static`”“内部具体标签 chip 仍保留 `hover:-translate-y-0.5`”，确认源码级测试先失败后再修改。
  3) 在 `ArticleList.jsx` 中为博主信息外层卡补上 `home-ios-card--static`，同时保留 `home-ios-card--overflow-visible`，确保头像仍能外溢但卡片本体不再上浮。
  4) 为全部标签外层卡补上 `home-ios-card--static`，只取消整块卡片的 hover 上浮，不改内部标签按钮、清除筛选按钮和展开按钮的既有交互。
  5) 本次属于首页细节交互收敛，不单独提升站点版本号。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleList.test.js`
  - `.ai/CHANGELOG_AI.md`
- 检索与复用策略：
  - 检索关键词：`全部标签` / `home-ios-card--overflow-visible` / `home-ios-card--static` / `home-ios-chip`
  - 候选实现：`ArticleList.jsx` 博主信息卡、`ArticleList.jsx` 全部标签卡、`ArticleList.jsx` 最新评论卡、`homeRedesign.css` 里的 `home-ios-card--static`
  - 最终选择：复用现有 `home-ios-card--static`，只在两张外层卡上补类名，不新增样式类
- 验证方式：
  - 执行 `node .\src\appfull\public\ArticleList.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-11] 修复文章图片大图预览被首页按钮与 AI 入口压层并去掉右侧白线
- 背景/需求：用户反馈具体文章页中点击正文图片打开大图预览时，仍会看到并能点到“首页”悬浮按钮和右下角 AI 聊天入口；同时浏览器右侧会出现一条粗白线，希望大图预览期间这些浮层不再压在图片上且不可点击，并消除右侧白线。
- 修改类型：fix
- 影响范围：文章详情页图片预览浮层、文章页悬浮按钮层、AI 助手入口层、全局滚动条预留槽位样式、图片预览最小回归测试
- 变更摘要：
  1) 检索确认文章图片大图预览逻辑集中在 `ArticleDetail.jsx` 的 `previewImage` 状态与遮罩层，当前预览层 z-index 仅 `z-[80]`；文章页“首页/评论”浮层为单独 body portal，AI 入口同样是单独 body portal，因此在大图预览时仍可能压在图片层上。
  2) 新增 `ArticleDetailImagePreviewOverlay.test.js`，先锁定“打开大图时 html/body 必须挂专用状态类”“文章浮动按钮层和 AI 助手层必须暴露稳定类名”“大图预览层需要更高 z-index”“全局样式必须在预览态取消滚动条预留槽位并让相关浮层不可点击”，确认旧实现先失败后再修改。
  3) 在 `ArticleDetail.jsx` 中将大图预览打开态改为给 `html/body` 同步挂载 `sg-article-image-preview-open`，同时给文章浮动按钮 portal 容器补 `sg-article-floating-actions` 类名，并把图片预览遮罩层抬升到 `z-[220]`，确保预览层高于页面其他 portal。
  4) 在 `AiAssistantWidget.jsx` 的 portal 根层补 `sg-ai-assistant-layer` 类名，让文章大图预览期间可以通过全局样式统一隐藏并禁点整层 AI 入口/面板。
  5) 在 `src/index.css` 中新增图片预览打开态规则：取消 `scrollbar-gutter: stable` 的右侧预留槽位，强制 `html/body` 进入无滚动状态并统一置黑背景，同时让 `.sg-ai-assistant-layer` 与 `.sg-article-floating-actions` 在预览期间整体 `opacity: 0` 且 `pointer-events: none`，从而去掉右侧白线并屏蔽按钮点击。
  6) 本次属于文章详情页交互修复，不单独提升站点版本号。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
  - `SanguiBlog-front/src/index.css`
  - `SanguiBlog-front/src/appfull/public/ArticleDetailImagePreviewOverlay.test.js`
  - `.ai/CHANGELOG_AI.md`
- 检索与复用策略：
  - 检索关键词：`previewImage` / `createPortal` / `AiAssistantWidget` / `首页` / `scrollbar-gutter`
  - 候选实现：`ArticleDetail.jsx` 图片预览遮罩、`ArticleDetail.jsx` 悬浮按钮 portal、`AiAssistantWidget.jsx` body portal、`src/index.css` 全局滚动条 gutter 配置
  - 最终选择：继续复用现有图片预览和 AI 单入口实现，只补预览打开态的全局类名、稳定选择器与样式联动，不新建第二套预览或第二套 AI 入口
- 验证方式：
  - 执行 `node .\src\appfull\public\ArticleDetailImagePreviewOverlay.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\ArticleDetailFloatingButtons.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\ui\AiAssistantWidget.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-11] 同步将文章 404 页面适配为站点玻璃风格
- 背景/需求：用户在文章加载失败页玻璃化后，继续要求将具体文章页的 404“文章不存在”页面也适配为同一套玻璃风格。
- 修改类型：fix
- 影响范围：文章详情页 404 状态 UI、文章异常状态最小回归测试
- 变更摘要：
  1) 检索确认 404 状态同样集中在 `AppFull.jsx` 的 `articleState?.status === 'not_found'` 分支，且仍使用旧的黑边厚投影卡片与按钮。
  2) 在既有 `AppFullArticleErrorGlass.test.js` 中补充 404 状态断言，先验证其会因旧样式失败，再进行实现修改。
  3) 将 404 状态外层改为 `home-ios-card home-ios-card--static`，说明内容放入 `home-ios-inner-card`，并把“返回首页”切换为圆角玻璃按钮。
  4) 保留 `setView('home')` 返回首页行为不变，仅调整视觉风格和错误说明文案。
  5) 本次属于上一次文章异常状态玻璃化的同范围补齐，不单独提升站点版本号。
- 涉及文件：
  - `SanguiBlog-front/src/AppFull.jsx`
  - `SanguiBlog-front/src/appfull/AppFullArticleErrorGlass.test.js`
  - `.ai/CHANGELOG_AI.md`
- 检索与复用策略：
  - 检索关键词：`404：文章不存在` / `articleState?.status === 'not_found'` / `home-ios-card` / `home-ios-inner-card`
  - 候选实现：`AppFull.jsx` 文章加载态玻璃卡、`AppFull.jsx` 文章加载失败玻璃卡、`AboutView.jsx` 主体玻璃卡、`GlassPopupToast.jsx` 现有玻璃语言
  - 最终选择：原位修改 `not_found` 分支，直接复用刚统一的文章异常状态玻璃结构，不新增组件
- 验证方式：
  - 执行 `node .\src\appfull\AppFullArticleErrorGlass.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-11] 将文章加载失败页适配为站点玻璃风格
- 背景/需求：用户反馈具体文章页在文章加载失败时展示的“文章加载失败”页面仍是旧的黑边厚投影样式，希望适配到当前站点统一的玻璃风格；本次仅处理失败态页面，不扩大到 404 页面或其它状态页。
- 修改类型：fix
- 影响范围：文章详情页加载失败态 UI、错误态最小回归测试
- 变更摘要：
  1) 检索确认具体文章页失败态集中在 `AppFull.jsx` 的 `articleState?.status === 'error'` 分支，而同一分支前面的 `loading/idle` 态已经接入 `home-ios-card` / `home-ios-inner-card` 玻璃语言，可直接复用。
  2) 新增并先执行 `AppFullArticleErrorGlass.test.js`，锁定失败态必须使用玻璃主卡、错误信息必须落在内层玻璃卡片、操作按钮必须切到圆角玻璃按钮，同时禁止回退到旧的黑边厚投影容器。
  3) 将错误态页面外层改为 `home-ios-card home-ios-card--static`，顶部补轻量状态胶囊与分隔线，错误详情落入 `home-ios-inner-card`，文案层级与当前文章加载态保持一致。
  4) 将“重试加载”“返回首页”改成与站点现有玻璃体系一致的圆角按钮，保留原有交互逻辑不变，只调整视觉表达。
  5) 本次属于小范围前台视觉修复，不单独提升站点版本号。
- 涉及文件：
  - `SanguiBlog-front/src/AppFull.jsx`
  - `SanguiBlog-front/src/appfull/AppFullArticleErrorGlass.test.js`
  - `.ai/CHANGELOG_AI.md`
- 检索与复用策略：
  - 检索关键词：`文章加载失败` / `articleState?.status === 'error'` / `home-ios-card` / `home-ios-inner-card`
  - 候选实现：`AppFull.jsx` 文章加载态玻璃卡、`AboutView.jsx` 主体玻璃卡、`ArchiveView.jsx` 顶部操作区、`GlassPopupToast.jsx` 现有玻璃风格语言
  - 最终选择：原位修改 `AppFull.jsx` 的失败态分支，直接复用现有 `home-ios-card` / `home-ios-inner-card` 视觉体系，不新建第二套错误页组件
- 风险点：
  - 本次刻意不改 `not_found` 分支，避免在用户未提出的 404 页面上扩大影响范围；若后续希望统一 404 视觉，可再单独处理。
- 验证方式：
  - 执行 `node .\src\appfull\AppFullArticleErrorGlass.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-11] 修复主题超频玻璃提示引用未定义变量导致前端白屏
- 背景/需求：用户反馈上一轮彩蛋玻璃化后前端白屏，控制台报错 `Uncaught ReferenceError: headerHeight is not defined at SanGuiBlog (AppFull.jsx:1487:44)`。
- 修改类型：fix
- 影响范围：顶部主题超频/冷却玻璃提示定位、主题超频回归测试
- 变更摘要：
  1) 排查确认根因是 `AppFull.jsx` 中主题超频提示接入 `GlassPopupToast` 时错误引用了 `Navigation.jsx` 作用域里的 `headerHeight`，而 `SanGuiBlog` 组件实际只有 `layoutContextValue.headerHeight` 可用。
  2) 更新 `AppFullThemeOverdriveGlass.test.js`，锁定主题超频提示必须使用 `layoutContextValue.headerHeight`，并禁止再次写回 `headerHeight || NAVIGATION_HEIGHT` 这种未定义变量引用。
  3) 将主题超频提示的 `top` 改为 `getGlassPopupToastTop(layoutContextValue.headerHeight)`，复用当前页面已经提供给 `LayoutOffsetContext.Provider` 的真实头部高度，消除运行时 ReferenceError。
  4) 本次是 V2.2.20 内部回归修复，不单独提升站点版本号。
- 涉及文件：
  - `SanguiBlog-front/src/AppFull.jsx`
  - `SanguiBlog-front/src/appfull/AppFullThemeOverdriveGlass.test.js`
- 验证方式：
  - 执行 `node .\src\appfull\AppFullThemeOverdriveGlass.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\ArticleListEasterEggGlass.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\ui\GlassPopupToast.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-11] 将头像与主题切换彩蛋适配为玻璃风格并升级到 V2.2.20
- 背景/需求：用户反馈首页博主信息卡片头像的“转速过快/眼冒金星”彩蛋，以及顶部导航主题切换按钮的“超频模式”彩蛋仍是旧的黑边赛博风格，和当前站点玻璃体系不一致；希望优先复用现有站点玻璃弹出模板，若不适合则至少整体改成玻璃风格。
- 修改类型：fix
- 影响范围：首页头像彩蛋短提示、首页“眼冒金星模式”中心卡片、顶部主题超频/冷却提示、彩蛋最小回归测试、项目长期记忆、站点版本号
- 变更摘要：
  1) 检索确认头像彩蛋短提示与“眼冒金星模式”都集中在 `ArticleList.jsx`，其中短提示仍是 `SPIN ALERT` 黑边厚投影弹层，“眼冒金星模式”中心卡片仍是黑底金字粗边框；主题切换彩蛋的超频/冷却提示集中在 `AppFull.jsx`，同样使用独立的黑底厚投影层。
  2) 复用判断后选择“两段式处理”：所有短暂、非阻塞提示统一接入现有 `GlassPopupToast` 共享模板；`眼冒金星模式` 因为仍需保留全屏强状态氛围，不直接降级成普通 toast，而是保留全屏背景效果，仅把中心主卡改为首页同源玻璃卡片。
  3) 新增 `ArticleListEasterEggGlass.test.js` 与 `AppFullThemeOverdriveGlass.test.js`，先锁定头像短提示必须复用 `GlassPopupToast`、主题超频提示必须复用 `GlassPopupToast`，以及“眼冒金星模式”中心卡片必须改成玻璃风格；确认测试先失败后再实现。
  4) 在 `ArticleList.jsx` 中引入 `GlassPopupToast`，让头像连点触发的短提示统一走偏上玻璃模板；同时将“眼冒金星模式”中心提示重做为 `home-ios-card` 玻璃卡片，保留原有全屏星点/冷却氛围，不再使用旧黑底粗边框主卡。
  5) 在 `AppFull.jsx` 中引入 `GlassPopupToast`，让顶部主题切换按钮的“超频模式已开启 / 冷却中…”提示统一走与文章分享提示同源的玻璃模板；矩阵光效与主题 blast 背景动画保持不变。
  6) 将站点版本号从 `V2.2.19` 升级为 `V2.2.20`，同步更新后端 `site.version` 与中英文 README 当前版本说明，并在 `PROJECT_MEMORY.md` 记录这两个彩蛋已纳入站点统一玻璃提示体系。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
  - `SanguiBlog-front/src/AppFull.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleListEasterEggGlass.test.js`
  - `SanguiBlog-front/src/appfull/AppFullThemeOverdriveGlass.test.js`
  - `.ai/PROJECT_MEMORY.md`
  - `.ai/CHANGELOG_AI.md`
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `README.md`
  - `README.zh-CN.md`
- 检索与复用策略：
  - 检索关键词：`showSpinWarning` / `megaSpinActive` / `SPIN ALERT` / `眼冒金星模式` / `themeOverdriveNotice` / `themeOverdriveMessage` / `GlassPopupToast`
  - 候选实现：`ArticleList.jsx` 头像短提示、`ArticleList.jsx` 眼冒金星全屏层、`AppFull.jsx` 主题超频提示、`GlassPopupToast.jsx` 现有共享玻璃模板、`ArticleDetail.jsx` 对模板的既有复用方式
  - 最终选择：短提示复用现有 `GlassPopupToast`，强状态层保留原有业务氛围但改成玻璃主卡，不新增第二套提示模板
- 风险点：
  - `眼冒金星模式` 仍保留全屏星点与暗化氛围，只是中心卡片改成玻璃风格；不同浏览器下玻璃模糊的真实观感可能略有差异，但已尽量复用现有已验证样式语言。
  - 本次只调整头像彩蛋与主题超频提示的视觉表达，不改阈值、持续时间、锁定时长和背景光效逻辑。
- 验证方式：
  - 执行 `node .\src\appfull\public\ArticleListEasterEggGlass.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\AppFullThemeOverdriveGlass.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\ArticleList.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\ui\GlassPopupToast.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-11] 收短首页文章搜索占位文案
- 背景/需求：用户反馈首页“文章搜索”输入框的默认提示“输入关键词后按回车搜索（标题/摘要模糊匹配）”在手机端过长，末尾会被截断，希望改成更简短的文案。
- 修改类型：fix
- 影响范围：首页文章搜索输入框占位文案、首页搜索最小回归测试
- 变更摘要：
  1) 检索确认首页文章搜索输入框唯一实现位于 `ArticleList.jsx`，当前占位文案直接内联在该输入框上，不存在第二套首页搜索实现。
  2) 先更新 `ArticleList.test.js`，锁定首页搜索框应使用更短的占位文案，并禁止旧长文案回退；确认测试先失败后再修改源码。
  3) 将占位文案从“输入关键词后按回车搜索（标题/摘要模糊匹配）”收短为“请输入关键词搜索”，保留原有回车搜索、清空按钮、筛选统计与移动端样式不变。
  4) 本次属于极小范围的文案优化，不单独提升站点版本号。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleList.test.js`
- 检索与复用策略：
  - 检索关键词：`输入关键词后按回车搜索` / `文章搜索` / `placeholder=`
  - 候选实现：`ArticleList.jsx` 首页搜索输入框、`ArticleList.test.js` 首页列表最小回归测试、后台若干不相关搜索框占位文案
  - 最终选择：原位修改首页搜索框唯一占位文案，并复用现有 `ArticleList.test.js` 回归测试，不新增组件或常量
- 风险点：
  - 本次仅改文案，不影响搜索逻辑；若后续希望做更细的移动端文案适配，可再评估是否抽成常量或按视口差异化。
- 验证方式：
  - 执行 `node .\src\appfull\public\ArticleList.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-11] 修复首页 Hero 在手机端无法正确跳到首篇文章并升级到 V2.2.19
- 背景/需求：用户反馈首页 Hero 区“向下探索内容”按钮在电脑端正常，但手机端无法正确跳到下方内容；希望仅修改手机端行为，让它直接跳到第一篇文章位置，并跳过首页“文章搜索”卡片，电脑端保持不变。
- 修改类型：fix
- 影响范围：首页 Hero 按钮手机端滚动目标、首页首篇文章锚点、首页滚动回归测试、项目长期记忆、站点版本号
- 变更摘要：
  1) 检索确认当前首页滚动链路由 `Hero.jsx -> HomeView.jsx -> AppFull.jsx::scrollToPostsTop()` 统一驱动，而 `scrollToPostsTop()` 现优先滚到 `#home-status-strip`，这与手机端隐藏/弱化状态条后的页面结构不再一致，导致 Hero 的“向下探索内容”按钮在手机端落点不准确。
  2) 检索确认首页“文章搜索”卡片位于 `ArticleList.jsx` 的 `#posts` 容器内且在文章列表之前，因此如果仍旧滚到 `#posts`，手机端就无法满足“掠过搜索卡片、直接到第一篇文章”的要求。
  3) 新增 `src/appfull/public/HeroScrollTarget.test.js`，先锁定 Hero 必须显式识别手机端视口、手机端优先滚到 `#home-first-post`、桌面端继续复用既有 `onStartReading` 链路，并要求首页首篇文章卡片提供稳定锚点。
  4) 在 `Hero.jsx` 中为点击处理增加手机端分支：当视口宽度 `<= 768px` 时，优先查找并滚动到 `#home-first-post`；若首篇文章尚未渲染，则回退到原有 `onStartReading` / `#posts` 链路，避免无文章或首屏未加载时失效。
  5) 在 `ArticleList.jsx` 的首篇文章卡片上补充 `id="home-first-post"`，作为手机端 Hero 的唯一首篇文章落点；未改动搜索卡片本身、文章排序、桌面端滚动策略或其它首页交互。
  6) 将站点版本号从 `V2.2.18` 升级为 `V2.2.19`，同步更新后端 `site.version` 与中英文 README 当前版本说明，并在 `PROJECT_MEMORY.md` 记录“手机端 Hero 需优先滚到首篇文章锚点”的长期约定。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/Hero.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
  - `SanguiBlog-front/src/appfull/public/HeroScrollTarget.test.js`
  - `.ai/PROJECT_MEMORY.md`
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `README.md`
  - `README.zh-CN.md`
- 检索与复用策略：
  - 检索关键词：`向下探索内容` / `onScrollToPosts` / `scrollToPostsTop` / `home-status-strip` / `#posts` / `文章搜索` / `displayPosts.map`
  - 候选实现：`Hero.jsx` 的点击处理、`HomeView.jsx` 的传参链路、`AppFull.jsx` 的 `scrollToPostsTop()`、`ArticleList.jsx` 的搜索卡片与文章列表结构、`StatsStrip.jsx` 的 `#home-status-strip`
  - 最终选择：复用现有 Hero 与首页文章列表实现，只给手机端 Hero 增加“首篇文章锚点优先”分支，并在首篇文章卡片上补一个稳定 id，不新建第二套首页或第二套滚动系统
- 风险点：
  - 当前首篇文章锚点依赖首页文章列表至少渲染出一篇文章；若文章尚未加载完成或当前无文章，Hero 会回退到原有滚动链路，因此不会出现按钮失效，但手机端此时仍可能先落到 `#posts` 容器顶部。
  - 这次只修改 Hero 的手机端 CTA 行为；`AppFull.jsx` 中其它复用 `scrollToPostsTop()` 的链路仍保持既有逻辑，避免扩大影响范围。
- 验证方式：
  - 执行 `node .\src\appfull\public\HeroScrollTarget.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\HeroPerformance.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\ArticleList.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-11] 适配后台文章编辑器 Markdown 正文暗色滚动条并升级到 V2.2.18
- 背景/需求：用户反馈后台发布文章页 `/admin/create-post` 与修改文章页 `/admin/posts/edit?postId=xxx` 的“Markdown 正文”卡片在暗夜模式下若内容过长，会出现纵向滚动条，但当前滚动条轨道/滑块未适配暗色样式；要求只修复这两个正文编辑框的滚动条，其它区域保持不动。
- 修改类型：fix
- 影响范围：后台发布文章页 Markdown 正文 textarea、后台编辑文章页 Markdown 正文 textarea、后台编辑器滚动条最小回归测试、站点版本号
- 变更摘要：
  1) 检索确认 `/admin/create-post` 与 `/admin/posts/edit` 分别位于 `AdminPanel.jsx` 的 `CreatePostView` / `EditPostView`，两者各自渲染“Markdown 正文” textarea，但都只复用了 `inputClass`，没有接入项目现成的 `sg-scrollbar-dark` 暗色滚动条类。
  2) 新增 `AdminPostEditorScrollbar.test.js`，先锁定后台文章编辑器应统一复用 `getAdminMarkdownScrollbarClass(isDarkMode)`，并要求发布页与编辑页这两个 Markdown 正文 textarea 都显式拼接 `sg-scrollbar-dark / sg-scrollbar-light`。
  3) 在 `AdminPanel.jsx` 中新增 `getAdminMarkdownScrollbarClass(isDarkMode)`，并让 `CreatePostView` 与 `EditPostView` 的 Markdown 正文 textarea 都改用 `markdownTextareaScrollbarClass`，同时补 `overflow-y-auto`，从而在暗色模式下复用全局深色滚动条轨道/滑块样式。
  4) 未改动摘要框、封面区、标签区、列表区或其它后台滚动容器，只修复用户指出的两个 Markdown 正文编辑框。
  5) 将站点版本号从 `V2.2.17` 升级为 `V2.2.18`，同步更新后端 `site.version` 与中英文 README 当前版本说明。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/AdminPanel.jsx`
  - `SanguiBlog-front/src/appfull/AdminPostEditorScrollbar.test.js`
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `README.md`
  - `README.zh-CN.md`
- 检索与复用策略：
  - 检索关键词：`Markdown 正文` / `markdownEditorRef` / `textarea` / `sg-scrollbar-dark` / `sg-scrollbar-light` / `create-post` / `posts/edit`
  - 候选实现：`CreatePostView` 的 Markdown 正文 textarea、`EditPostView` 的 Markdown 正文 textarea、`src/index.css` 的 `sg-scrollbar-dark/light` 全局滚动条样式、`ArticleDetail.jsx` / `AiAssistantWidget.jsx` 等已接入暗色滚动条的实现
  - 最终选择：复用现有 `sg-scrollbar-dark/light` 全局样式，仅给后台文章正文编辑框补接滚动条类，不新增第二套滚动条 CSS
- 风险点：
  - 当前修复只覆盖后台文章正文 textarea；若未来还有新的长文本编辑区，也应优先复用同一个 helper，而不是再次手写滚动条类。
- 验证方式：
  - 执行 `node .\src\appfull\AdminPostEditorScrollbar.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-11] 将文章页玻璃复制提示沉淀为共享弹出模板并升级到 V2.2.17
- 背景/需求：用户确认文章页分享复制提示的视觉已满意，并要求把这套弹出卡片作为后续可复用模板沉淀下来，同时留下明确约定，后续新增同类弹出框时优先使用该设计。
- 修改类型：refactor
- 影响范围：前台玻璃弹出卡片复用模板、文章详情页分享提示接入方式、模板回归测试、项目长期记忆、站点版本号
- 变更摘要：
  1) 检索确认现有前端提示体系里，`ErrorToast` 是错误提示、`AdminNoticeBar` 是后台顶部通知、`StatsStrip` 的 tooltip 只是统计浮层，当前并不存在适合作为“前台玻璃弹出卡片模板”的共享组件。
  2) 新增 `src/appfull/ui/GlassPopupToast.jsx`，将文章页分享提示沉淀为共享模板：内置 body portal、偏上定位辅助方法 `getGlassPopupToastTop(...)`、仅位移入场、半透明渐变玻璃底、`backdropFilter/WebkitBackdropFilter` 以及 `translateZ(0) + backfaceVisibility` 首帧稳定兜底。
  3) `ArticleDetail.jsx` 改为直接复用 `GlassPopupToast`，分享复制提示不再内嵌私有 portal 结构；同时新增 `GlassPopupToast.test.js`，并更新 `ArticleDetailShareToast.test.js`，锁定“文章页必须复用共享模板，模板本身必须保持当前玻璃设计与动画参数”。
  4) 在 `PROJECT_MEMORY.md` 中补充长期约定：后续前台若要新增“非阻塞、短暂展示、位于屏幕偏上”的玻璃弹出卡片，应优先复用 `GlassPopupToast.jsx`，避免再次各页面各写一套。
  5) 将站点版本号从 `V2.2.16` 升级为 `V2.2.17`，同步更新后端 `site.version` 与中英文 README 当前版本说明。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/GlassPopupToast.jsx`
  - `SanguiBlog-front/src/appfull/ui/GlassPopupToast.test.js`
  - `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleDetailShareToast.test.js`
  - `.ai/PROJECT_MEMORY.md`
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `README.md`
  - `README.zh-CN.md`
- 检索与复用策略：
  - 检索关键词：`ErrorToast` / `AdminNoticeBar` / `createPortal` / `shareToastLayer` / `home-ios-card--static` / `GlassPopupToast`
  - 候选实现：`ArticleDetail.jsx` 的分享提示私有实现、`StatsStrip.jsx` 的 tooltip portal、`ErrorToast.jsx` 的错误提示、`AdminPanel.jsx` 的 `AdminNoticeBar`
  - 最终选择：新建单一共享模板 `GlassPopupToast.jsx` 并让文章页回接它，避免未来同类弹出框继续复制私有实现
- 风险点：
  - 当前模板更适合“前台非阻塞、短时出现、偏上定位”的玻璃提示，不适合直接替代错误提示、后台管理通知或需要交互按钮的模态层；后续若需求超出这个边界，应在复用基础上扩展，而不是再复制一套相似实现。
- 验证方式：
  - 执行 `node .\src\appfull\ui\GlassPopupToast.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\ArticleDetailShareToast.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\ArticleDetailFloatingButtons.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\ArticleDetailCodeBlockScrollbar.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-11] 恢复文章页分享复制提示的玻璃质感并保持首帧无延迟并升级到 V2.2.16
- 背景/需求：用户确认分享复制提示的位置和首帧延迟问题已经修好，但反馈当前卡片更像固定底色，不再像真正的玻璃；要求先评估能否在恢复玻璃质感的同时继续保持首帧无视觉延迟，若不能同时满足则保持现状不动。
- 修改类型：fix
- 影响范围：文章详情页分享复制提示卡片的玻璃背景表现、首帧合成稳定性、分享提示回归测试、站点版本号
- 变更摘要：
  1) 复盘当前实现后确认“玻璃感变弱”的根因是上一次为了兜底首帧稳定性，给分享提示卡片补上了更实的 `backgroundColor`，虽然消除了首帧延迟，但也把玻璃层的通透感压成了更像固定底色的观感。
  2) 更新 `ArticleDetailShareToast.test.js`，先锁定分享提示卡片必须恢复半透明渐变玻璃底，同时继续保留 `backdropFilter / WebkitBackdropFilter`，并增加 `translateZ(0)`、`backfaceVisibility: hidden` 这类首帧合成稳定性断言，防止再次在“玻璃感”和“首帧稳定”之间回退。
  3) 将分享提示卡片的内层背景从单纯 `backgroundColor` 改为半透明渐变玻璃底，并继续显式声明 `backdropFilter / WebkitBackdropFilter`；同时为卡片增加 `transform: translateZ(0)` 与 `backfaceVisibility: hidden`，在恢复玻璃质感的同时维持首帧无透明延迟。
  4) 将站点版本号从 `V2.2.15` 升级为 `V2.2.16`，同步更新后端 `site.version` 与中英文 README 当前版本说明。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleDetailShareToast.test.js`
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `README.md`
  - `README.zh-CN.md`
- 检索与复用策略：
  - 检索关键词：`shareToastLayer` / `backgroundColor` / `background:` / `backdropFilter` / `home-ios-card` / `ArticleDetailShareToast`
  - 候选实现：`ArticleDetail.jsx` 的分享提示 portal、`home-ios-card` 玻璃卡片基础样式、`ArticleDetailShareToast.test.js` 既有回归测试、`StatsStrip.jsx` 的 portal 浮层模式
  - 最终选择：继续复用同一套 `shareToastLayer`、`home-ios-card` 视觉语言和回归测试，只调整分享提示卡片内层背景与首帧合成兜底，不新增组件
- 风险点：
  - 玻璃感恢复后背景通透度会比上一版更高；当前已通过显式模糊和合成层兜底平衡视觉质感与稳定性，但不同移动端浏览器的真实观感仍可能略有差异。
- 验证方式：
  - 执行 `node .\src\appfull\public\ArticleDetailShareToast.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\ArticleDetailFloatingButtons.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\ArticleDetailCodeBlockScrollbar.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-11] 将文章页分享复制提示上移到屏幕偏上并修复首帧透明感并升级到 V2.2.15
- 背景/需求：用户反馈分享复制提示即使上移后仍不够显眼，希望显示在屏幕偏上的位置；同时提示卡片刚出现的一瞬间背景像是半透明的，过一会才有完整玻璃特效，需要一起修复。
- 修改类型：fix
- 影响范围：文章详情页分享复制提示位置、分享提示入场动效、分享提示回归测试、站点版本号
- 变更摘要：
  1) 检索确认问题集中在 `ArticleDetail.jsx` 的 `shareToastLayer`：一方面仍使用靠近底部的定位方式，另一方面入场动画包含 `opacity`，导致玻璃卡片和内容一起从透明淡入，看起来像玻璃背景慢半拍。
  2) 更新 `ArticleDetailShareToast.test.js`，先锁定分享提示应计算 `shareToastTop = Math.max(fixedTopOffset + 8, 104)` 并使用 `top` 定位到屏幕偏上，同时锁定入场动画只保留轻量位移，不再从透明或缩放状态开始。
  3) 将分享提示从底部定位改为 `top: shareToastTop`，让卡片稳定显示在屏幕偏上的位置；同时将入场动画改为仅 `y` 位移，并为玻璃卡片显式声明 `backgroundColor/backdropFilter/WebkitBackdropFilter`，首帧即保留玻璃背景观感，消除“先透明、后玻璃”的延迟感。
  4) 将站点版本号从 `V2.2.14` 升级为 `V2.2.15`，同步更新后端 `site.version` 与中英文 README 当前版本说明。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleDetailShareToast.test.js`
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `README.md`
  - `README.zh-CN.md`
- 检索与复用策略：
  - 检索关键词：`shareToastLayer` / `bottom:` / `top:` / `initial={{ opacity` / `home-ios-card` / `ArticleDetailShareToast`
  - 候选实现：`ArticleDetail.jsx` 的分享提示 portal、`ArticleDetailShareToast.test.js` 既有测试、`home-ios-card` 玻璃卡片样式、`StatsStrip.jsx` 的 portal 浮层模式
  - 最终选择：继续复用同一套 `shareToastLayer` 和玻璃卡片样式，只调整定位和入场动效，不新增组件
- 风险点：
  - 提示改到偏上位置后更容易被看见，但会更靠近文章头部区域；当前宽度较窄且不会阻塞交互，风险较低。
- 验证方式：
  - 执行 `node .\src\appfull\public\ArticleDetailShareToast.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\ArticleDetailFloatingButtons.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\ArticleDetailCodeBlockScrollbar.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-11] 上移文章页分享复制提示并升级到 V2.2.14
- 背景/需求：用户确认新版“链接已复制”提示风格更好，但反馈弹出的卡片位置过低，不刻意看时不容易感知；要求在保留现有风格的基础上把卡片位置调高一点。
- 修改类型：fix
- 影响范围：文章详情页分享复制成功提示位置、分享提示回归测试、站点版本号
- 变更摘要：
  1) 检索确认分享成功提示当前已集中在 `ArticleDetail.jsx` 的 `shareToastLayer` portal 中，定位由 `bottom: calc(24px + env(safe-area-inset-bottom, 0px))` 控制。
  2) 更新 `ArticleDetailShareToast.test.js`，先锁定分享提示应使用 `bottom: calc(72px + env(safe-area-inset-bottom, 0px))`，避免回退到过低的贴底位置。
  3) 将 `shareToastLayer` 的 bottom 从 `24px` 上移到 `72px`，保留原有卡片风格、portal 渲染、无布局抖动和 safe-area 兼容。
  4) 将站点版本号从 `V2.2.13` 升级为 `V2.2.14`，同步更新后端 `site.version` 与中英文 README 当前版本说明。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleDetailShareToast.test.js`
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `README.md`
  - `README.zh-CN.md`
- 检索与复用策略：
  - 检索关键词：`shareToastLayer` / `文章地址已放入剪贴板` / `bottom: 'calc(` / `ArticleDetailShareToast`
  - 候选实现：`ArticleDetail.jsx` 的分享提示 portal、`ArticleDetailShareToast.test.js` 既有回归测试、`StatsStrip.jsx` 的 body portal 浮层范式
  - 最终选择：原位调整 `shareToastLayer` 的 bottom 定位，不改分享按钮、不改提示组件结构、不新增组件
- 风险点：
  - 提示上移后更容易被看到，但也会比原来更靠近正文底部；当前宽度较窄且 `pointer-events-none`，不会阻塞用户点击页面。
- 验证方式：
  - 执行 `node .\src\appfull\public\ArticleDetailShareToast.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\ArticleDetailFloatingButtons.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\ArticleDetailCodeBlockScrollbar.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-11] 优化文章页分享复制提示并升级到 V2.2.13
- 背景/需求：用户反馈文章详情页博主信息卡片中的分享按钮复制成功后，顶部出现的“链接已复制！”长条提示观感突兀，并且提示出现/消失时页面结构会轻微移动；要求重新设计提示并修复抖动问题。
- 修改类型：fix
- 影响范围：文章详情页分享按钮复制成功提示、复制提示定时器、前台文章页最小回归测试、站点版本号
- 变更摘要：
  1) 检索确认分享按钮、`handleShare`、`showShareToast` 和旧提示横幅都集中在 `ArticleDetail.jsx`；项目已有 `StatsStrip.jsx` 使用 `createPortal(..., document.body)` 渲染浮层的范式，因此无需新建全局 Toast 系统。
  2) 新增 `ArticleDetailShareToast.test.js`，先锁定分享成功提示必须走 body portal、具备 `role="status"` 与 `aria-live="polite"`、限制宽度、使用更紧凑文案，并禁止退回旧的大号“链接已复制！”横条。
  3) 将分享提示改为 `shareToastLayer`，通过 `createPortal` 挂到 `document.body`，避免提示作为文章页主体结构的一部分参与渲染层级；视觉改为底部居中的小型玻璃卡片，包含状态图标、主文案“链接已复制”和辅助文案“文章地址已放入剪贴板”。
  4) 为分享提示新增 `shareToastTimerRef`，连续点击分享时会先清理旧 timer，再启动新的 2.2 秒自动消失计时，避免提示闪烁或被旧 timer 提前关闭。
  5) 将站点版本号从 `V2.2.12` 升级为 `V2.2.13`，同步更新后端 `site.version` 与中英文 README 当前版本说明。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleDetailShareToast.test.js`
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `README.md`
  - `README.zh-CN.md`
- 检索与复用策略：
  - 检索关键词：`showShareToast` / `handleShare` / `链接已复制` / `clipboard` / `createPortal` / `Toast`
  - 候选实现：`ArticleDetail.jsx` 当前分享提示、`StatsStrip.jsx` portal tooltip、`ErrorToast.jsx` 固定提示、`AdminPanel.jsx` 后台复制 toast
  - 最终选择：原位修改 `ArticleDetail.jsx` 的分享提示为 body portal，不新增全局 Toast，也不复制后台提示系统
- 风险点：
  - 本次只优化复制成功提示；若浏览器拒绝剪贴板写入，当前仍沿用既有行为不弹成功提示，未新增失败提示分支。
- 验证方式：
  - 执行 `node .\src\appfull\public\ArticleDetailShareToast.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\ArticleDetailFloatingButtons.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\ArticleDetailCodeBlockScrollbar.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-11] 移除手机端文章页目录按钮与抽屉并升级到 V2.2.12
- 背景/需求：用户继续反馈手机端文章详情页仍出现“目录”悬浮按钮，要求与“首页/评论”按钮同样处理：仅手机端去掉该按钮，并且点击后出现的目录抽屉也直接不显示，电脑端保持不变。
- 修改类型：fix
- 影响范围：文章详情页手机端目录入口、手机端目录抽屉状态与焦点管理、文章详情页最小回归测试、站点版本号
- 变更摘要：
  1) 检索确认手机端“目录”按钮、点击后的目录抽屉、对应 `tocDrawerOpen` 状态和焦点恢复逻辑都集中在 `ArticleDetail.jsx`，桌面端目录卡片则复用 `desktopTocCard` 的独立渲染分支。
  2) 更新 `ArticleDetailFloatingButtons.test.js`，先锁定“手机端不应再有 `aria-label="打开目录"` 按钮，也不应再渲染 `aria-label="文章目录"` 抽屉”，同时锁定桌面端 `hidden xl:block fixed z-40` 目录卡片仍保留。
  3) 移除 `ArticleDetail.jsx` 中手机端目录按钮、目录抽屉、`tocDrawerOpen` 相关状态、抽屉列表 ref、关闭按钮 ref、焦点恢复 ref 与 Escape 关闭监听；保留桌面端目录卡片、目录激活态计算和桌面目录列表滚动同步。
  4) 将站点版本号从 `V2.2.11` 升级为 `V2.2.12`，同步更新后端 `site.version` 与中英文 README 当前版本说明。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleDetailFloatingButtons.test.js`
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `README.md`
  - `README.zh-CN.md`
- 检索与复用策略：
  - 检索关键词：`tocDrawerOpen` / `打开目录` / `文章目录` / `desktopTocCard` / `List` / `X`
  - 候选实现：`ArticleDetail.jsx` 手机端目录按钮、`ArticleDetail.jsx` 手机端目录抽屉、`ArticleDetail.jsx` 桌面端 `desktopTocCard`、同文件目录激活态与滚动同步逻辑
  - 最终选择：原位移除手机端目录入口与抽屉分支，继续复用桌面端目录卡片，不新增任何移动端专用实现
- 风险点：
  - 手机端将不再提供目录快捷入口，这是按需求有意收敛；桌面端目录卡片与文章正文、评论区、分享、图片预览不受影响。
- 验证方式：
  - 执行 `node .\src\appfull\public\ArticleDetailFloatingButtons.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\ArticleDetailCodeBlockScrollbar.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-11] 隐藏手机端文章页首页/评论悬浮按钮并升级到 V2.2.11
- 背景/需求：用户反馈手机端具体文章页 `/article/:id` 上“首页”“评论”两个悬浮按钮出现错位，要求仅手机端去掉这两个悬浮按钮，电脑端保持不变。
- 修改类型：fix
- 影响范围：文章详情页悬浮操作按钮的响应式显示、文章详情页最小回归测试、站点版本号
- 变更摘要：
  1) 检索确认“首页”“评论”悬浮按钮真实入口集中在 `ArticleDetail.jsx` 的 `floatingActionButtons` portal 中，且同页已有手机端 `md:hidden` 目录抽屉入口，因此无需新增移动端详情页或第二套按钮实现。
  2) 新增 `ArticleDetailFloatingButtons.test.js`，先锁定“首页/评论”悬浮按钮容器必须仅在 `md` 及以上视口显示，同时保留手机端目录入口。
  3) 将 `floatingActionButtons` 外层容器改为 `hidden md:block fixed ...`，让手机端直接不显示“首页”“评论”两个悬浮按钮；桌面端继续使用原有 portal、定位、回首页和滚动到评论区逻辑。
  4) 将站点版本号从 `V2.2.10` 升级为 `V2.2.11`，同步更新后端 `site.version` 与中英文 README 当前版本说明。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleDetailFloatingButtons.test.js`
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `README.md`
  - `README.zh-CN.md`
- 检索与复用策略：
  - 检索关键词：`ArticleDetail` / `首页` / `评论` / `scrollToComments` / `floatingActionButtons` / `md:hidden` / `ScrollToTop`
  - 候选实现：`ArticleDetail.jsx` 悬浮按钮 portal、`ArticleDetail.jsx` 手机端目录抽屉入口、`ScrollToTop.jsx` 手机端隐藏范式、`AiAssistantWidget.jsx` 移动端视口收敛范式
  - 最终选择：原位修改 `floatingActionButtons` 外层响应式类，继续复用现有文章详情页与按钮回调，不新增移动端专用组件
- 风险点：
  - 手机端将不再有悬浮“首页/评论”快捷入口，这是按需求有意收敛；评论区内容、评论提交能力和手机端目录抽屉不受影响。
- 验证方式：
  - 执行 `node .\src\appfull\public\ArticleDetailFloatingButtons.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\src\appfull\public\ArticleDetailCodeBlockScrollbar.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-11] 修复用户名变更后旧 JWT 失效并升级到 V2.2.10
- 背景/需求：项目审阅发现用户在个人资料中修改用户名后，当前 JWT 的 subject 仍是旧用户名，而 `JwtAuthenticationFilter` 每次请求只按 subject 查询用户，导致后续请求因旧用户名不存在而掉线；要求修复这条 P2 登录态稳定性问题。
- 修改类型：fix
- 影响范围：JWT claim 解析、JWT 鉴权过滤器、用户详情加载、用户名变更后的登录态兼容、后端回归测试、站点版本号
- 变更摘要：
  1) 检索确认登录时生成的 JWT 已包含稳定的 `uid` claim，因此不需要为本问题新增前端换 token 流程，也不需要禁止用户修改用户名。
  2) 新增 `JwtAuthenticationFilterTest`，先锁定“token subject 为旧用户名，但 `uid` 对应的新用户名用户仍存在时，请求必须认证成功”的行为。
  3) `JwtUtil` 新增 `extractUserId(...)`，从 `uid` claim 中解析稳定用户 ID，兼容数字和字符串形式。
  4) `CustomUserDetailsService` 新增 `loadUserById(...)`，并复用同一套 `UserPrincipal` 构造逻辑，避免用户名和 ID 两条加载路径出现权限差异。
  5) `JwtAuthenticationFilter` 调整为优先按 `uid` 加载用户，只有缺少 `uid` 的旧格式 token 才回退 subject 用户名加载，从而让改名后的旧 token 在有效期内继续可用。
  6) 将站点版本号从 `V2.2.9` 升级为 `V2.2.10`，同步更新后端 `site.version` 与中英文 README 当前版本说明。
- 涉及文件：
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/security/JwtUtil.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/security/CustomUserDetailsService.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/security/JwtAuthenticationFilter.java`
  - `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/security/JwtAuthenticationFilterTest.java`
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `README.md`
  - `README.zh-CN.md`
- 检索与复用策略：
  - 检索关键词：`generateToken` / `uid` / `extractUsername` / `JwtAuthenticationFilter` / `loadUserByUsername` / `updateProfile`
  - 候选实现：`AuthService.login` 现有 `uid` claim、`JwtUtil` claim 解析、`JwtAuthenticationFilter` token 鉴权入口、`CustomUserDetailsService` 用户详情加载
  - 最终选择：复用现有 JWT `uid` claim，修改鉴权过滤器为优先按稳定用户 ID 加载，不新建 token 类型、不新增前端刷新 token 协议
- 风险点：
  - 缺少 `uid` 的历史 token 仍会回退用户名 subject；这类旧 token 在用户改名后仍可能失效，但当前项目登录生成的 token 已包含 `uid`，后续新登录用户不受影响。
- 验证方式：
  - 执行 `mvn -q "-Dtest=JwtAuthenticationFilterTest" test`（工作目录 `SanguiBlog-server`）通过
  - 执行 `mvn -q -DskipTests compile`（工作目录 `SanguiBlog-server`）通过

## [2026-04-11] 收紧文章封面与正文资源上传权限并升级到 V2.2.9
- 背景/需求：项目审阅发现 `UploadController` 的文章封面与正文资源上传接口虽然位于后台编辑链路中，但实际只要求“已登录”即可调用，导致任意登录用户都能向公开 `/uploads/**` 目录写入文件；要求只修复这条 P2 权限边界问题，不影响头像上传。
- 修改类型：fix
- 影响范围：文章封面上传、文章正文资源目录预留与资源上传的权限边界、上传控制器回归测试、站点版本号
- 变更摘要：
  1) 检索确认前端 `uploadPostCover / reservePostAssetsFolder / uploadPostAssets` 仅由后台文章编辑面板调用，而 `uploadAvatar` 只用于个人资料页，因此权限可以按“文章资源”和“头像资源”拆分收口。
  2) 新增 `UploadControllerAuthorizationTest`，先锁定文章封面、正文资源目录预留、正文资源上传三个方法必须声明 `@PreAuthorize("hasAnyAuthority('PERM_POST_CREATE','PERM_POST_EDIT')")`，同时锁定头像上传方法不应被附带文章权限。
  3) 在 `UploadController` 上仅为 `uploadPostCover`、`reservePostAssetsFolder`、`uploadPostAssets` 补充方法级 `PreAuthorize`，要求具备 `PERM_POST_CREATE` 或 `PERM_POST_EDIT`；`uploadAvatar` 保持原有“登录用户可用”的行为不变。
  4) 未改动全局 `/api/upload/**` 的登录要求，继续让头像上传受“已登录”保护；文章资源上传则在此基础上再受文章权限约束，形成更细粒度的防线。
  5) 将站点版本号从 `V2.2.8` 升级为 `V2.2.9`，同步更新后端 `site.version` 与中英文 README 当前版本说明。
- 涉及文件：
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/UploadController.java`
  - `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/controller/UploadControllerAuthorizationTest.java`
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `README.md`
  - `README.zh-CN.md`
- 检索与复用策略：
  - 检索关键词：`uploadPostCover` / `uploadPostAssets` / `reservePostAssetsFolder` / `/api/upload/**` / `PERM_POST_CREATE` / `PERM_POST_EDIT`
  - 候选实现：`SecurityConfig` 全局上传认证、`UploadController` 单接口入口、`PostController` 现有文章创建/编辑权限、前端 `AdminPanel.jsx` 的文章资源上传调用点
  - 最终选择：复用现有 `PERM_POST_CREATE` 与 `PERM_POST_EDIT`，在 `UploadController` 单入口做方法级权限收紧，不新建权限码、不复制上传接口
- 风险点：
  - 若未来需要给“只能新建不能编辑”的角色开放上传，本轮仍允许，因为使用的是 `CREATE or EDIT`；这与“创建文章前也要先上传封面/资源”的现有编辑流程一致。
- 验证方式：
  - 执行 `mvn -q "-Dtest=UploadControllerAuthorizationTest" test`（工作目录 `SanguiBlog-server`）通过
  - 执行 `mvn -q -DskipTests compile`（工作目录 `SanguiBlog-server`）通过

## [2026-04-11] 修复头像路径越界删除风险并升级到 V2.2.8
- 背景/需求：项目审阅发现个人资料更新链路会信任客户端传入的 `avatarUrl`，旧头像删除时又会按该值解析本地文件，存在通过头像切换触发越界删除的风险；要求优先修复该 P1 安全问题。
- 修改类型：fix
- 影响范围：头像路径规范化、头像文件解析根目录校验、用户资料与后台用户头像路径复用逻辑、后端安全回归测试、站点版本号
- 变更摘要：
  1) 新增 `StoragePathResolverTest`，先锁定 `resolveAvatarFile("../../...")` 必须拒绝路径穿越，避免头像目录解析绕过存储根目录。
  2) 新增 `AuthServiceTest`，先锁定用户资料更新时不能把 `../../...` 这类不可信头像路径写入用户资料，避免后续换头像删除旧路径时触发越界删除。
  3) 在 `StoragePathResolver` 中新增统一的头像文件名规范化规则，仅允许安全文件名，并让 `resolveAvatarFile` 复用已有 `resolve("avatar", ...)` 根目录校验。
  4) `AuthService` 与 `AdminUserService` 统一复用 `StoragePathResolver.normalizeAvatarFilename(...)`，不再各自手写头像路径截取逻辑；删除旧头像时若遇到历史遗留非法值只忽略，不执行删除。
  5) 将站点版本号从 `V2.2.7` 升级为 `V2.2.8`，同步更新后端 `site.version` 与中英文 README 当前版本说明。
- 涉及文件：
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/StoragePathResolver.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AuthService.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AdminUserService.java`
  - `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/config/StoragePathResolverTest.java`
  - `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/AuthServiceTest.java`
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `README.md`
  - `README.zh-CN.md`
- 检索与复用策略：
  - 检索关键词：`avatarUrl` / `deleteLocalAvatar` / `resolveAvatarFile` / `updateProfile` / `AdminUserService` / `UploadController`
  - 候选实现：`StoragePathResolver` 统一存储根路径、`AuthService` 用户资料更新、`AdminUserService` 后台用户资料更新、`AvatarStorageService` 头像上传落盘
  - 最终选择：复用 `StoragePathResolver` 作为单一头像路径规范化入口，修改现有服务调用点，不新建第二套头像路径工具
- 风险点：
  - 历史数据库中若存在非安全头像文件名，本轮会在后续资料更新时拒绝继续写入或在删除旧头像时跳过删除；这是为了避免误删头像目录外文件的安全取舍。
- 验证方式：
  - 执行 `mvn -q "-Dtest=StoragePathResolverTest,AuthServiceTest" test`（工作目录 `SanguiBlog-server`）通过
  - 执行 `mvn -q -DskipTests compile`（工作目录 `SanguiBlog-server`）通过

## [2026-04-10] 修复手机端 AI 入口状态点被裁切
- 背景/需求：用户反馈手机端 AI 聊天入口卡片右上角的绿色呼吸状态点被玻璃外框裁掉，只能显示一部分；要求仅修复手机端显示，电脑端保持原样。
- 修改类型：fix
- 影响范围：手机端 AI 入口外层裁切策略、AI 入口移动端最小回归测试、AI 变更日志
- 变更摘要：
  1) 检索确认问题集中在 `AiAssistantWidget.jsx` 的手机端 AI 入口按钮：外层 `motion.button` 当前统一使用 `overflow-hidden`，而绿色呼吸点位于图标层右上角 `-top-1 -right-1`，因此在手机端更紧凑的 60x60 外框下会被裁切。
  2) 继续复用现有 `AiAssistantWidget.jsx` 入口组件，不新建移动端专用入口；仅新增 `launcherOverflowClass`，按视口分支为“手机端 `overflow-visible`、桌面端 `overflow-hidden`”。
  3) 将入口外层按钮改为使用 `launcherOverflowClass`，从而只在手机端放开绿色呼吸点的显示裁切，桌面端现有玻璃卡片的收口感和裁切策略保持不变。
  4) 新增 `AiAssistantMobileLauncherIndicator.test.js`，先锁定“移动端必须允许溢出显示、外层按钮必须使用可切换 overflow 类”，再让实现过绿。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
  - `SanguiBlog-front/src/appfull/ui/AiAssistantMobileLauncherIndicator.test.js`
- 检索与复用策略：
  - 检索关键词：`AiAssistantWidget` / `launcherLayoutClass` / `overflow-hidden` / `-top-1 -right-1` / `isMobileViewport`
  - 候选实现：AI 入口外层按钮、图标玻璃容器、移动端视口判断、现有 AI 入口回归测试
  - 最终选择：只修改 `AiAssistantWidget.jsx` 里的外层 overflow 分支，继续复用同一套入口组件和移动端视口判断，不新增第二套实现
- 风险点：
  - 本次只放开手机端入口按钮的外溢显示，用于完整显示状态点；桌面端仍保持裁切收口。若未来继续增加更大的外溢装饰，需要再次核对手机端点击热区与视觉边界是否一致。
- 验证方式：
  - 执行 `node .\\src\\appfull\\ui\\AiAssistantMobileLauncherIndicator.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\\src\\appfull\\ui\\AiAssistantWidget.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\\src\\appfull\\ui\\AiAssistantMobileViewport.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\\src\\appfull\\ui\\aiLauncherBadge.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-10] 恢复底部 ICP 备案号跳转并隐藏首尾两行
- 背景/需求：用户反馈站点底部的 ICP 备案号虽然代码里仍是链接，但页面点击无法正常跳转；同时要求底部第一行站点名称“三桂博客”和最后一行“Powered by Spring Boot 3 & React 19”仅不显示，后台保存数据与其他底部信息保持不变。
- 修改类型：fix
- 影响范围：前台站点底部备案号跳转兜底、页脚两行显示策略、页脚最小回归测试、AI 变更日志
- 变更摘要：
  1) 检索确认 footer 配置链路仍存在：后端 `SiteService.meta()` 会继续下发 `footer.brand / icpNumber / icpLink / poweredBy`，前端 `HomeView.jsx` 也完整透传给 `SiteFooter.jsx`，因此不是配置字段被删。
  2) 在 `SiteFooter.jsx` 中新增 `resolvedIcpLink` 规范化逻辑：对 `icpLink` 先 `trim()`，空值回退到 `https://beian.miit.gov.cn/`，缺少协议时自动补全 `https://`，避免“配置里看似有值但 href 实际不可跳”的情况。
  3) 为备案号链接增加 `onClick + window.open(resolvedIcpLink, '_blank', 'noopener,noreferrer')` 的显式打开兜底，并补 `relative z-10 pointer-events-auto`，增强点击命中与浏览器兼容性。
  4) 仅停止渲染页脚首行品牌名与最后一行 Powered by，保留 `brand / poweredBy` props 与后端配置链路，不改后台存储、不改 `site/meta` 结构、不改中间两行版权与备案号。
  5) 新增 `SiteFooterVisibility.test.js`，锁定“备案链接必须使用规范化结果、链接具备显式可点击层级、品牌行与 Powered by 行不再渲染”。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/SiteFooter.jsx`
  - `SanguiBlog-front/src/appfull/ui/SiteFooterVisibility.test.js`
- 检索与复用策略：
  - 检索关键词：`ICP备案` / `footer` / `icpLink` / `poweredBy` / `brand` / `SiteFooter`
  - 候选实现：`SiteFooter.jsx` 页脚渲染入口、`HomeView.jsx` 透传链路、`SiteService.java` 站点 meta 聚合、`application.yaml` 默认 footer 配置
  - 最终选择：只修改 `SiteFooter.jsx` 单入口，继续复用现有 footer 配置与站点 meta 数据，不新建第二套页脚或后台字段
- 风险点：
  - 当前修复基于“链接值可能被空白/缺协议污染，且前端缺少点击兜底”的判断；如果线上还存在浏览器插件或外部覆盖层干扰，这次改动已经尽量用更稳健的链接打开方式规避，但不涉及其他悬浮组件逻辑。
- 验证方式：
  - 执行 `node .\\src\\appfull\\ui\\SiteFooter.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\\src\\appfull\\ui\\SiteFooterVisibility.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-10] 移除手机端彩蛋背景切换按钮
- 背景/需求：用户反馈手机端导航抽屉中的“关闭/开启背景彩蛋”按钮不适合手机端显示，要求只在手机端去掉该按钮，电脑端保持现状不变。
- 修改类型：fix
- 影响范围：手机端导航抽屉的彩蛋背景入口、前端最小回归测试、AI 变更日志
- 变更摘要：
  1) 检索确认“彩蛋背景”真实链路集中在 `AppFull.jsx` 的 `backgroundEnabled` 状态和 `Navigation.jsx` 的两个入口，其中桌面端设置浮层与手机端抽屉共用同一状态，但只有手机端抽屉按钮需要移除。
  2) 继续复用现有 `backgroundEnabled` 状态、`localStorage` 持久化和背景渲染逻辑，不改 `BackgroundEasterEggs.jsx`、`HomeView.jsx`、`ArticleList.jsx` 等背景展示链路。
  3) 在 `Navigation.jsx` 中移除手机端抽屉里的“关闭彩蛋背景 / 开启彩蛋背景”按钮，并把原来的双列按钮区收成单列，避免手机端留下空位。
  4) 新增 `NavigationMobileBackgroundToggle.test.js`，先用失败用例锁定“桌面端入口仍存在、手机端按钮文本不再出现”，再让实现过绿。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
  - `SanguiBlog-front/src/appfull/ui/NavigationMobileBackgroundToggle.test.js`
- 检索与复用策略：
  - 检索关键词：`backgroundEnabled` / `关闭彩蛋背景` / `开启彩蛋背景` / `切换彩蛋背景` / `BackgroundEasterEggs`
  - 候选实现：`Navigation.jsx` 桌面端设置浮层、`Navigation.jsx` 手机端抽屉入口、`AppFull.jsx` 状态持久化、`BackgroundEasterEggs.jsx` 渲染本体
  - 最终选择：只修改 `Navigation.jsx` 的手机端入口，继续复用桌面端和全局状态链路，不新建任何移动端专用背景逻辑
- 风险点：
  - 手机端将不再提供彩蛋背景的显式切换入口，这是按需求有意收敛；桌面端设置与背景状态持久化逻辑不受影响。
- 验证方式：
  - 执行 `node .\\src\\appfull\\ui\\NavigationMobileBackgroundToggle.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\\src\\appfull\\ui\\NavigationNotificationSelect.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\\src\\appfull\\backgroundEnabledDefault.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-10] 关闭手机端返回顶部按钮显示
- 背景/需求：用户要求首页及前台页面中的“一键向上 / 返回顶部”按钮在手机端永远不出现，但桌面端维持现有行为不变。
- 修改类型：fix
- 影响范围：前台返回顶部按钮的手机端显示策略、返回顶部按钮最小回归测试、AI 变更日志
- 变更摘要：
  1) 检索确认现网入口为 `SanguiBlog-front/src/appfull/ui/ScrollToTop.jsx`，由 `AppFull.jsx` 统一挂载；因此无需改多处接入点，只需在组件内部做移动端短路即可。
  2) 在 `ScrollToTop.jsx` 中新增 `isMobileViewport` 状态，基于 `window.innerWidth < 768` 判断手机端，并在 `resize` 时同步更新。
  3) 当检测为手机端时，`ScrollToTop` 直接 `return null`，因此手机端无论页面滚动多深都不会再出现该按钮；桌面端仍保留原有出现逻辑、拖拽、进度环和回顶动画。
  4) 更新 `ScrollToTop.test.js`，新增“组件应具备手机端视口判断并在手机端直接不渲染”的断言。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/ScrollToTop.jsx`
  - `SanguiBlog-front/src/appfull/ui/ScrollToTop.test.js`
- 检索与复用策略：
  - 检索关键词：`ScrollToTop` / `ArrowUp` / `scrollTop` / `返回顶部`
  - 候选实现：`ScrollToTop.jsx` 组件本体、`AppFull.jsx` 统一接入点
  - 最终选择：仅修改 `ScrollToTop.jsx` 单入口，继续复用现有桌面端逻辑，不新建手机端分支组件
- 风险点：
  - 手机端将完全失去这个快捷入口，这是按需求有意为之；桌面端交互与视觉不受影响。
- 验证方式：
  - 执行 `node .\\src\\appfull\\ui\\ScrollToTop.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-10] 收紧手机端 AI 入口并隐藏手机端系统状态卡
- 背景/需求：用户要求仅在手机端做两处首页体验收敛：一是 AI 聊天入口卡片只保留 Logo，不再显示右侧文案，并将卡片收成接近正方形；二是首页系统状态卡在手机端去掉，使首页首屏下方直接进入文章搜索。桌面端均保持原样。
- 修改类型：fix
- 影响范围：手机端 AI 聊天入口外观、手机端首页系统状态卡显示、前台最小回归测试、AI 变更日志
- 变更摘要：
  1) 检索确认 AI 聊天入口真实实现仍在 `AiAssistantWidget.jsx` 右下角浮动按钮处，系统状态卡唯一现网入口在 `StatsStrip.jsx`；无需新增组件或改动桌面端布局。
  2) 在 `AiAssistantWidget.jsx` 中新增 `launcherLayoutClass`，手机端改为 `60x60` 左右的近方形玻璃按钮，仅居中显示 Logo；桌面端继续沿用原来的横向胶囊尺寸与文案。
  3) 将 AI 聊天入口右侧文案包进 `!isMobileViewport` 条件渲染，确保手机端不再出现 Logo 右侧文字，位置仍保持原先右下角逻辑不变。
  4) 在 `StatsStrip.jsx` 的外层根节点接入 `hidden md:block`，让系统状态卡只在桌面端显示；手机端首页下滑后直接衔接文章搜索区。
  5) 更新 `AiAssistantWidget.test.js` 与 `StatsStripReadability.test.js`，分别锁定“手机端方形 AI 入口 + 文案仅桌面可见”和“系统状态卡仅桌面显示”这两项行为。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.test.js`
  - `SanguiBlog-front/src/appfull/public/StatsStrip.jsx`
  - `SanguiBlog-front/src/appfull/public/StatsStripReadability.test.js`
- 检索与复用策略：
  - 检索关键词：`AiAssistantWidget` / `launcherBadge` / `isMobileViewport` / `StatsStrip` / `ArticleList`
  - 候选实现：AI 浮动入口按钮、系统状态卡根节点、首页 `ArticleList` 接入点
  - 最终选择：原位修改现有组件，继续复用移动端视口判断和桌面端现有结构，不增加第二套实现
- 风险点：
  - 手机端首页会少掉一块系统状态信息，这是按需求有意收敛；桌面端的 AI 入口与系统状态卡均不受影响。
- 验证方式：
  - 执行 `node .\\src\\appfull\\ui\\AiAssistantWidget.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\\src\\appfull\\ui\\AiAssistantMobileViewport.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\\src\\appfull\\public\\StatsStripReadability.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\\src\\appfull\\ui\\AiAssistantWidgetContrast.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-10] 收起手机端 AI 聊天头部标题文案以避免键盘挤压换行
- 背景/需求：用户反馈手机端 AI 聊天打开后，头部的“标题 + Beta 测试版”在窄屏上会换成多行，尤其是系统键盘弹出后可用宽度进一步缩小，原本两行文案可能被挤成多行，影响观感；用户要求手机端只保留左侧图标，桌面端保持现状。
- 修改类型：fix
- 影响范围：前台 AI 聊天手机端头部显示、移动端 AI 最小回归测试、AI 变更日志
- 变更摘要：
  1) 检索确认问题集中在 `AiAssistantWidget.jsx` 面板头部，标题文案与 `Beta 测试版` 紧跟在 `AssistantLogo` 右侧，在手机端和键盘弹出场景下会被可视宽度压缩。
  2) 继续复用现有头部结构，不改桌面端布局；仅在 `isMobileViewport` 为 `true` 时隐藏标题文案区，让手机端头部只保留左侧 Logo。
  3) 桌面端仍完整显示 `assistantConfig.title` 与 `Beta 测试版`，避免影响原有桌面体验。
  4) 更新 `AiAssistantMobileViewport.test.js`，新增“移动端标题文案必须位于 `!isMobileViewport` 条件下”的断言，防止后续回归。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
  - `SanguiBlog-front/src/appfull/ui/AiAssistantMobileViewport.test.js`
- 检索与复用策略：
  - 检索关键词：`AiAssistantWidget` / `assistantConfig.title` / `Beta 测试版` / `isMobileViewport`
  - 候选实现：AI 聊天头部标题区、移动端可视区逻辑、现有 `AssistantLogo`
  - 最终选择：只修改现有头部标题渲染条件，不新建移动端专用头部组件
- 风险点：
  - 本次是移动端显示精简，手机端会失去头部文字提示，但能显著换来更稳定的头部高度与更干净的键盘打开体验；桌面端不受影响。
- 验证方式：
  - 执行 `node .\\src\\appfull\\ui\\AiAssistantMobileViewport.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\\src\\appfull\\ui\\AiAssistantWidgetContrast.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-10] 继续增强 AI 聊天模块与站点背景的分层对比
- 背景/需求：在上一轮已为 AI 聊天模块补充页面衬底、外壳阴影与正文区材质区分后，用户继续反馈“还是觉得差距不大”，说明站点背景与 AI 面板的视觉层次仍不够明显，需要在不破坏本站玻璃风格的前提下进一步拉开差异。
- 修改类型：fix
- 影响范围：前台 AI 助手打开时的背景虚化强度、AI 面板外壳层次、聊天正文区材质深浅、AI 聊天 UI 最小回归测试、AI 变更日志
- 变更摘要：
  1) 继续沿用 `AiAssistantWidget.jsx` 现有三层结构，不新建第二套聊天组件；检索确认本轮仍应聚焦 `assistantBackdropClass / shellClass / viewportGlassClass` 这三个入口，而不是改消息气泡或功能结构。
  2) 将 AI 打开时的页面衬底进一步加深：暗色模式提高整体遮罩深度并把 `backdrop-blur` 提升到 `18px`，让页面内容更明确地退到后景；亮色模式同步提高衬底雾化与灰蓝层次，避免白底站点里聊天层“贴”在页面上。
  3) 将 AI 面板外壳的渐变与阴影再加强一档：暗色模式外壳改为更深的蓝黑玻璃面，边框从 `white/10` 提到 `white/12`，阴影扩大到 `0 36px 120px`，让整体浮层感更稳；亮色模式也同步略提边界和阴影，保持深浅模式一致的层级逻辑。
  4) 将聊天正文区再与外壳拉开半档：暗色模式正文区继续下探到更深的墨蓝底，亮色模式正文区更接近冷白阅读面，确保用户打开 AI 后能一眼区分“页面背景 / 面板外壳 / 聊天内容”三层。
  5) 把 `AiAssistantWidgetContrast.test.js` 从脆弱的长正则改为更稳定的源码片段断言，避免后续因类名顺序微调导致误报。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidgetContrast.test.js`
- 检索与复用策略：
  - 检索关键词：`AiAssistantWidget` / `assistantBackdropClass` / `shellClass` / `viewportGlassClass` / `backdrop-blur`
  - 候选实现：AI 打开时的整页衬底、AI 面板外壳、聊天正文区材质层
  - 最终选择：继续复用现有聊天组件和站点玻璃视觉语言，只增强三层对比，不引入新组件或新主题体系
- 风险点：
  - 本次会让 AI 打开时的背景退后感明显一些，属于有意为之；功能逻辑、消息流、历史会话和拖拽行为均未改动。
- 验证方式：
  - 执行 `node .\\src\\appfull\\ui\\AiAssistantWidgetContrast.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-10] 修复首页系统状态条“最后更新时间”的帮助态鼠标并补充精确到分钟浮层
- 背景/需求：用户反馈首页系统状态条中的“最后更新时间”当前鼠标移上去会出现“鼠标 + 问号”的帮助态光标，体验不对；希望改为悬停或点击这一小块时，显示具体的最后更新时间，并精确到分钟。
- 修改类型：fix
- 影响范围：首页系统状态条最后更新时间交互、时间展示格式、首页最小回归测试、AI 变更日志
- 变更摘要：
  1) 检索确认真实入口为 `SanguiBlog-front/src/appfull/public/StatsStrip.jsx`，不是 legacy 目录；当前问题根因是“最后更新时间”被渲染成带 `cursor-help` 的普通文本，只支持纯 hover 提示，因此浏览器显示帮助态鼠标。
  2) 在 `StatsStrip.jsx` 中新增 `formatStatusExactMinute(value)`，将 `lastUpdatedFull` 本地格式化为 `yyyy-MM-dd HH:mm`，只保留到分钟，不改后端接口。
  3) 将“最后更新时间”从 `span` 改为可交互 `button`，同时支持 `hover / focus / click` 打开站内浮层，并移除 `cursor-help` 帮助态样式。
  4) 继续排查确认浮层初版仍被状态条 `overflow-x-auto` 容器裁切，因此把最后更新时间浮层改为 `createPortal(..., document.body)` + `position: fixed`，彻底绕开滚动容器裁切，确保真正可见。
  5) 新增 `StatsStripLastUpdatedTooltip.test.js`，约束状态条保留“精确到分钟格式化 + portal 浮层 + 点击触发 + 不再使用 cursor-help”这几项行为。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/StatsStrip.jsx`
  - `SanguiBlog-front/src/appfull/public/StatsStripLastUpdatedTooltip.test.js`
- 检索与复用策略：
  - 检索关键词：`系统状态` / `最后更新时间` / `StatsStrip` / `lastUpdatedFull` / `cursor-help`
  - 候选实现：`src/appfull/public/StatsStrip.jsx` 现网入口、`src/legacy/components/StatsStrip.jsx` 历史原型、`SiteService.currentStats()` 后端时间来源
  - 最终选择：只修改现网 `StatsStrip.jsx` 单入口，继续复用现有状态条卡片，不新增新组件、不改接口
- 风险点：
  - 这次只改首页状态条最后更新时间这一格的前端交互；按钮点击打开后在失焦或鼠标移出时会关闭，属于有意保持轻量的浮层行为。
- 验证方式：
  - 执行 `node .\\src\\appfull\\public\\StatsStripLastUpdatedTooltip.test.js`（工作目录 `SanguiBlog-front`）通过

## [2026-04-10] 提升首页系统状态条五项数据的可读性并收紧整体间距
- 背景/需求：用户反馈首页系统状态条右侧五项数据整体“有点看不清”，希望在不破坏当前风格的前提下，让数据更清楚、更优雅，同时把左侧 `SYSTEM STATUS` 与右侧五项的距离适当收小。
- 修改类型：fix
- 影响范围：首页系统状态条数据字号/字重/字距、状态条左右间距、系统状态条最小回归测试、AI 变更日志
- 变更摘要：
  1) 检索确认系统状态条主数据当前仍使用 `text-sm + font-bold`，标签是 `text-[11px]`，再叠加较宽的左右间距，视觉上会显得数据不够“立得住”。
  2) 在 `StatsStrip.jsx` 中新增统一的 `valueTextClass`，将五项主数据提升为 `font-black + text-[15px]/md:text-base + 轻微字距`，让数字本身更清楚。
  3) 将标签文案统一抽成 `labelTextClass`，调整为 `text-[12px] + font-semibold + 更克制的 tracking`，让标签更稳定但不抢主数据。
  4) 将左侧 `System Status` 与右侧统计组之间的间距从 `sm:mr-8` 收到 `sm:mr-6`，同时把右侧五项之间的横向间距从 `gap-3 md:gap-4` 收到 `gap-2.5 md:gap-3`，整体更紧凑。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/StatsStrip.jsx`
  - `SanguiBlog-front/src/appfull/public/StatsStripReadability.test.js`
- 检索与复用策略：
  - 检索关键词：`System Status` / `home-ios-chip` / `text-sm` / `tracking-widest` / `gap-3 md:gap-4` / `StatsStrip`
  - 候选实现：`StatsStrip.jsx` 当前状态条、`homeRedesign.css` 里的 `home-ios-chip`、首页 `ArticleList.jsx` 的现网接入点
  - 最终选择：原位微调 `StatsStrip.jsx` 的排版常量与布局类，不额外新建样式文件或第二套状态条实现
- 风险点：
  - 本次是排版与间距微调，不改数据来源与交互逻辑；唯一可见变化是数字会更突出、标签更清楚、整体横向更紧凑。
- 验证方式：
  - 执行 `node .\\src\\appfull\\public\\StatsStripReadability.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\\src\\appfull\\public\\StatsStripLastUpdatedTooltip.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-10] 拉开 AI 聊天模块与站点背景的层次对比
- 背景/需求：用户反馈前台 AI 聊天模块打开后，与站点背景颜色过于接近，视觉对比太小、看久了容易“重眼”；希望在符合本站玻璃风格的前提下，优雅地增强 AI 面板与页面背景的区分度。
- 修改类型：fix
- 影响范围：前台 AI 助手打开时的页面衬底、AI 面板外壳层次、聊天正文区材质区分、AI 聊天 UI 最小回归测试、AI 变更日志
- 变更摘要：
  1) 检索确认当前问题不是单一颜色过淡，而是三层都过近：打开 AI 时页面拦截层仍是透明、AI 外壳与站点暗色背景都落在相近蓝黑灰区间、聊天正文区与外壳材质差异不足。
  2) 在 `AiAssistantWidget.jsx` 中新增 `assistantBackdropClass`，让 AI 打开时页面出现轻量的站内风格渐变衬底与 `backdrop-blur-[10px]`，不做厚重遮罩，但能把页面背景和 AI 面板温和分开。
  3) 同步增强 `shellClass`：提高暗色/亮色外壳渐变对比，并补更明确的阴影，让整个 AI 外壳从页面背景里“站出来”。
  4) 同步调整 `viewportGlassClass`：让聊天正文区在暗色模式下更深一档、在亮色模式下更净一档，并补 `ring-1`，让正文区与外壳形成更清晰但不过分突兀的材质分层。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidgetContrast.test.js`
- 检索与复用策略：
  - 检索关键词：`AiAssistantWidget` / `backdrop-blur` / `shellClass` / `viewportGlassClass` / `bg-transparent` / `panelBorderClass`
  - 候选实现：`AiAssistantWidget.jsx` 的页面拦截层、面板外壳 `shellClass`、正文区 `viewportGlassClass`、消息展示层 `aiMessagePresentation.js`
  - 最终选择：优先改“页面衬底 + 面板外壳 + 正文区”三层，不去大改消息气泡结构；这样能最小代价拉开站点背景与 AI 面板的层次
- 风险点：
  - 本次是视觉层级增强，不改 AI 会话、消息流、历史会话、拖拽和移动端适配逻辑；唯一变化是打开 AI 时背景会更柔和虚化、面板会更显眼一些。
- 验证方式：
  - 执行 `node .\\src\\appfull\\ui\\AiAssistantWidgetContrast.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-10] 适配文章页代码块滚动条的黑夜模式
- 背景/需求：用户反馈具体文章页面 `/article/:id` 中 Markdown 代码块在黑夜模式下，如果代码过长需要横向滚动，原生滚动条仍偏亮、偏刺眼，希望只修正暗色适配，不改代码块现有结构与交互。
- 修改类型：fix
- 影响范围：文章详情页 Markdown 代码块滚动条主题、文章页最小回归测试、AI 变更日志
- 变更摘要：
  1) 检索确认文章页实际使用的是 `ArticleDetail.jsx` 内部本地 `CodeBlockWithCopy`，并未复用共享 `MarkdownCodeBlock.jsx`；全站现有暗色滚动条样式已在 `src/index.css` 中提供 `sg-scrollbar-dark/light`，问题根因是文章页代码块 `<pre>` 未挂载该主题类。
  2) 在 `ArticleDetail.jsx` 中新增 `codeScrollbarClass`，按深浅色分别复用 `sg-scrollbar sg-scrollbar-dark` 与 `sg-scrollbar sg-scrollbar-light`。
  3) 将文章页代码块 `<pre>` 接入 `codeScrollbarClass`，让长代码块在黑夜模式下复用站点现有深色滚动条观感，亮色模式也同步走现有浅色主题。
  4) 新增 `ArticleDetailCodeBlockScrollbar.test.js`，约束文章页代码块必须显式接入主题滚动条类，避免后续回归到浏览器默认亮色滚动条。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleDetailCodeBlockScrollbar.test.js`
- 检索与复用策略：
  - 检索关键词：`ArticleDetail` / `CodeBlockWithCopy` / `overflow-auto` / `sg-scrollbar-dark` / `MarkdownCodeBlock` / `AboutView`
  - 候选实现：`ArticleDetail.jsx` 本地代码块、`src/index.css` 现有滚动条样式、`MarkdownCodeBlock.jsx` 共享代码块组件、`AboutView.jsx` 同类页面实现
  - 最终选择：只修改文章页现有代码块入口并复用已有 `sg-scrollbar-dark/light`，不新建样式体系、不顺手重构共享组件
- 风险点：
  - 本次是样式类接线式修复，不改复制、语言标签、代码内容与 Markdown 渲染逻辑；唯一需要注意的是不同浏览器对原生滚动条定制支持度略有差异，但仓库现有 `sg-scrollbar-*` 已在其他深浅色滚动区使用。
- 验证方式：
  - 执行 `node .\\src\\appfull\\public\\ArticleDetailCodeBlockScrollbar.test.js`（工作目录 `SanguiBlog-front`）通过

## [2026-04-08] 继续下调首页持续动画并新增手机端首页性能模式
- 背景/需求：用户继续要求优先削减首页无限循环动画、移除卡片倾斜，并对手机端启用更激进的首页性能模式，包括关闭 Hero 背景视差、关闭文章卡片倾斜、关闭 shimmer 扫光、关闭背景星点闪烁，仅保留静态背景。
- 修改类型：fix
- 影响范围：首页 NEW 卡片持续动效、首页文章卡片 hover 反馈、首页背景动画层、手机端首页性能模式、AI 变更日志
- 变更摘要：
  1) 将 `TiltCard.jsx` 的 3D 倾斜链路彻底移除，不再使用 `useMotionValue/useTransform` 实时跟鼠标旋转，hover 仅保留轻微纵向位移。
  2) 在 `ArticleList.jsx` 中新增 `NEW_BADGE_ACTIVE_MS = 7000` 窗口，首页 NEW 徽章和 NEW 卡片外层发光只在页面进入后的前 7 秒保持动态，随后自动静止。
  3) 在 `ArticleList.jsx` 与 `BackgroundEasterEggs.jsx` 中新增基于 `matchMedia('(max-width: 768px)')` 的手机端首页性能模式；手机端关闭文章卡片额外特效、关闭背景星点与背景层动画。
  4) 在 `BackgroundEasterEggs.jsx` 中把桌面端无限循环层再砍一轮：星点改为静态点缀，只保留 1 到 2 个主氛围层做缓慢运动；在 `homeRedesign.css` 中将 shimmer 静态降级范围扩到 `max-width: 768px`。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
  - `SanguiBlog-front/src/appfull/public/Hero.jsx`
  - `SanguiBlog-front/src/appfull/public/homeRedesign.css`
  - `SanguiBlog-front/src/appfull/ui/TiltCard.jsx`
  - `SanguiBlog-front/src/appfull/ui/BackgroundEasterEggs.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleListPerformance.test.js`
  - `SanguiBlog-front/src/appfull/ui/TiltCardPerformance.test.js`
  - `SanguiBlog-front/src/appfull/ui/BackgroundEasterEggsPerformance.test.js`
- 检索与复用策略：
  - 检索关键词：`TiltCard` / `useMotionValue` / `rotateX` / `BackgroundEasterEggs` / `repeat: Infinity` / `NEW` / `Sparkles` / `max-width: 768px`
  - 候选实现：`TiltCard.jsx` 卡片倾斜、`ArticleList.jsx` NEW 徽章与卡片入口、`BackgroundEasterEggs.jsx` 背景循环动画、`homeRedesign.css` shimmer 降级规则
  - 最终选择：继续复用现有首页链路，原位减负，不新建第二套首页或第二套移动端页面
- 风险点：
  - 手机端首页会比桌面端明显更克制，氛围感降低属于预期取舍；换来的是更稳定的滚动与更低的发热风险。
- 验证方式：
  - 执行 `node .\\src\\appfull\\ui\\TiltCardPerformance.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\\src\\appfull\\public\\ArticleListPerformance.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\\src\\appfull\\ui\\BackgroundEasterEggsPerformance.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-08] 收敛首页 Hero 与文章卡片持续动效以降低发热和卡顿
- 背景/需求：用户反馈首页顶部文字、CTA 入场与“向下探索内容”按钮体感略卡，同时移动端发热和桌面端风扇明显，希望排查是否为首页动效过重，并优先降低首页文字倾斜/视差幅度与持续动画成本。
- 修改类型：fix
- 影响范围：首页 Hero 视差与入场动效、首页文章卡片 3D 倾斜与 NEW 发光层、前台背景持续动画、首页 CTA hover 位移、AI 变更日志
- 变更摘要：
  1) 检索确认首页主链为 `HomeView -> Hero -> ArticleList -> TiltCard/BackgroundEasterEggs`，不存在第二套在用首页实现；卡顿更像是首屏与列表的持续动画叠加，而非单一接口或数据问题。
  2) 在 `Hero.jsx` 中为 `prefers-reduced-motion` 与粗指针设备增加降级分支，收窄首屏 `mousemove` 视差位移、降低滚动上移幅度，并缩短文案/CTA 入场时长，减少“略卡”的体感。
  3) 在 `TiltCard.jsx` 中降低文章卡片倾斜角度与 hover 抬升幅度，关闭移动端/减少动态偏好下的 3D 倾斜与 NEW 多层发光动画，降低持续重绘与合成层压力。
  4) 在 `BackgroundEasterEggs.jsx` 中减少星点数量，并在减少动态偏好下关闭背景呼吸/旋转；同时在 `homeRedesign.css` 中收窄 CTA hover 位移、减轻 orb blur，并为 `home-ios-card--shimmer` 增加移动端/减少动态偏好的静态降级。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/Hero.jsx`
  - `SanguiBlog-front/src/appfull/public/homeRedesign.css`
  - `SanguiBlog-front/src/appfull/ui/TiltCard.jsx`
  - `SanguiBlog-front/src/appfull/ui/BackgroundEasterEggs.jsx`
  - `SanguiBlog-front/src/appfull/public/HeroPerformance.test.js`
  - `SanguiBlog-front/src/appfull/ui/TiltCardPerformance.test.js`
  - `SanguiBlog-front/src/appfull/ui/BackgroundEasterEggsPerformance.test.js`
- 检索与复用策略：
  - 检索关键词：`Hero` / `home-hero` / `TiltCard` / `BackgroundEasterEggs` / `framer-motion` / `mousemove` / `rotateX` / `rotateY` / `向下探索内容`
  - 候选实现：`Hero.jsx` 首屏视差、`TiltCard.jsx` 文章卡片 3D 倾斜、`BackgroundEasterEggs.jsx` 持续背景动画、`homeRedesign.css` 的 CTA 与 shimmer 规则
  - 最终选择：只在现有主链上减负，不新建第二套首页或卡片实现
- 风险点：
  - 本次优化会让首页 NEW 卡片和背景氛围更克制，视觉冲击力会比之前略低，但能换来更稳的滚动与更低的持续资源占用。
- 验证方式：
  - 执行 `node .\\src\\appfull\\public\\HeroPerformance.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\\src\\appfull\\ui\\TiltCardPerformance.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node .\\src\\appfull\\ui\\BackgroundEasterEggsPerformance.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-08] 将彩蛋背景默认值调整为首次进入默认关闭
- 背景/需求：用户要求当前站点首次进入时，彩蛋背景默认关闭，但手动开关能力与本地持久化逻辑保持不变。
- 修改类型：fix
- 影响范围：前台彩蛋背景默认开关初始化、本地持久化默认值、AI 变更日志
- 变更摘要：
  1) 检索确认彩蛋背景默认值唯一入口在 `AppFull.jsx` 的 `backgroundEnabled` 初始化逻辑，导航与移动端开关只是消费该状态，不需要并行修改。
  2) 将 `stored === null` 时的默认值从 `true` 调整为 `false`；同时 `typeof window === 'undefined'` 的 SSR/预渲染兜底默认值也同步改为 `false`。
  3) 保留 `sg_background_enabled` 的本地持久化写入逻辑和 `return stored !== 'false'` 的已保存状态解析逻辑不变，因此用户后续仍可手动开启/关闭，并继续保存在本地。
- 涉及文件：
  - `SanguiBlog-front/src/AppFull.jsx`
  - `SanguiBlog-front/src/appfull/backgroundEnabledDefault.test.js`
- 检索与复用策略：
  - 检索关键词：`sg_background_enabled` / `backgroundEnabled` / `stored === null`
  - 候选实现：`AppFull.jsx` 状态初始化、`AppFull.jsx` localStorage 持久化、`Navigation.jsx` 开关消费逻辑
  - 最终选择：只修改 `AppFull.jsx` 的默认初始化分支，不改开关 UI 和持久化逻辑
- 风险点：
  - 本次只影响“首次进入且本地尚无记录”的默认值；已有本地记录的用户会继续按本地配置生效。
- 验证方式：
  - 执行 `node ./src/appfull/backgroundEnabledDefault.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-08] 将归档页顶部返回/刷新按钮适配为站点轻玻璃风格
- 背景/需求：用户要求只调整 `/archive` 页面顶部“返回首页”“刷新归档”两个按钮的 UI，使其更贴合站点当前首页/归档的玻璃风格，明确不改按钮文案、跳转、刷新与 loading 逻辑。
- 修改类型：fix
- 影响范围：归档页顶部两个动作按钮视觉、归档页按钮回归断言、AI 变更日志
- 变更摘要：
  1) 检索确认这两个按钮的真实单入口都在 `ArchiveView.jsx` 顶部操作区，继续复用现有 `PopButton` 与 `onBackHome/onReload` 逻辑，不新增第二套按钮组件。
  2) 为按钮区新增轻量玻璃包裹层 `archiveActionWrapClass`，并将两个按钮切到 `variant="ghost"`，同时通过 `archiveActionButtonClass` 覆盖为圆角、轻边框、无厚重黑投影的站点风格按钮。
  3) 保留“返回首页”“刷新归档/加载中…”文案、禁用态和点击行为不变，仅收敛外观。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArchiveView.jsx`
  - `SanguiBlog-front/src/appfull/public/ArchiveView.test.js`
- 检索与复用策略：
  - 检索关键词：`返回首页` / `刷新归档` / `ArchiveView` / `PopButton` / `home-ios-inner-card`
  - 候选实现：`ArchiveView.jsx` 顶部操作区、`PopButton.jsx` 通用按钮、`homeRedesign.css` 中 `home-ios-inner-card` 玻璃样式体系
  - 最终选择：复用既有 `PopButton` 和站点玻璃样式体系，原位改造，不新建新按钮实现
- 风险点：
  - 本次只改类名与包裹层，不改按钮行为；唯一可见差异是按钮 hover/tap 的视觉反馈会比原先更轻。
- 验证方式：
  - 执行 `node ./src/appfull/public/ArchiveView.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-08] 将首页页脚适配为站点玻璃风格
- 背景/需求：用户要求按“只改外观、不改显示与逻辑”的边界，把首页底部页脚适配为当前站点首页统一的玻璃风格，保留品牌、版权、备案号与 Powered by 的显示规则不变。
- 修改类型：fix
- 影响范围：首页页脚视觉、页脚回归断言、AI 变更日志
- 变更摘要：
  1) 检索确认首页页脚真实单入口为 `HomeView.jsx -> SiteFooter.jsx`，不存在第二套首页 footer 实现。
  2) 将 `SiteFooter.jsx` 从旧的黑底厚色条样式改为复用首页现有 `home-ios-card home-ios-card--static` 的玻璃卡风格，整体收敛到与首页文章区、导航一致的材质语言。
  3) 保留 `brand / copyrightText / icpNumber / icpLink / poweredBy` 的传参与显示条件不变，只调整容器、标题、辅助文案和备案链接的视觉样式。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/SiteFooter.jsx`
  - `SanguiBlog-front/src/appfull/ui/SiteFooter.test.js`
- 检索与复用策略：
  - 检索关键词：`SiteFooter` / `footer` / `copyright` / `备案` / `Powered by`
  - 候选实现：`SiteFooter.jsx` 现有页脚、`HomeView.jsx` 首页接入点、`homeRedesign.css` 中 `home-ios-card` 玻璃卡体系
  - 最终选择：复用现有 `SiteFooter.jsx` 单入口并复用首页玻璃样式，不新增第二套页脚组件
- 风险点：
  - 本次只影响首页页脚视觉层，不改链接、文案来源与条件渲染，功能风险较低。
- 验证方式：
  - 执行 `node ./src/appfull/ui/SiteFooter.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-08] 将首页回到顶部悬浮按钮适配为站点玻璃风格
- 背景/需求：用户要求只调整首页悬浮“回到顶部”按钮的 UI，让它更贴合当前站点首页/导航的玻璃设计语言，明确不要改动原有显隐、拖拽、回顶和进度环等逻辑。
- 修改类型：fix
- 影响范围：首页回顶悬浮按钮视觉、回顶按钮回归断言、AI 变更日志
- 变更摘要：
  1) 检索确认首页真实单入口为 `AppFull.jsx -> ScrollToTop.jsx`，不存在第二套首页回顶按钮实现；同时对比首页既有 `home-ios-card`、导航 `home-nav-icon-btn--glass` 与文章页悬浮按钮样式，选择直接在 `ScrollToTop.jsx` 原位改造。
  2) 将回顶按钮从旧的黑金/玫红霓虹块状按钮收敛为站点同体系的圆形玻璃悬浮按钮，复用 `home-ios-card home-ios-card--static` 语言，并补充轻量 ring、blur、浅/深色主题细分与内层圆形箭头承载壳。
  3) 保持拖拽定位、本地持久化、滚动进度环、显隐阈值、点击平滑回顶和彩蛋粒子逻辑不变，仅调整颜色、阴影、边框和容器质感。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/ScrollToTop.jsx`
  - `SanguiBlog-front/src/appfull/ui/ScrollToTop.test.js`
- 检索与复用策略：
  - 检索关键词：`scrollToTop` / `ScrollToTop` / `ArrowUp` / `home-ios-card` / `home-nav-icon-btn--glass`
  - 候选实现：`ScrollToTop.jsx` 现有回顶按钮、`homeRedesign.css` 中 `home-ios-card` 玻璃卡体系、`Navigation.jsx` 的玻璃图标按钮、`ArticleDetail.jsx` 的站内悬浮按钮
  - 最终选择：复用现有回顶组件和既有玻璃视觉体系，原位改造，不新建新组件或第二套悬浮按钮实现
- 风险点：
  - 本次主要影响回顶按钮的视觉表现；由于按钮仍是固定尺寸圆形容器，交互命中区与拖拽逻辑保持稳定，低风险。
- 验证方式：
  - 执行 `node ./src/appfull/ui/ScrollToTop.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `node ./src/appfull/ui/NavigationNotificationSelect.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-07] 升级站点版本号到 V2.2.7 并同步 README

- 将站点版本号从 `V2.2.6` 升级为 `V2.2.7`，同步更新后端 `site.version`、首页版本展示兜底值与导航中的版本显示兜底值。
- 检查并更新项目根目录英文 `README.md` 与中文 `README.zh-CN.md` 中已过时的当前版本描述，统一改为 `V2.2.7`。
- 按需求不新增 `release/V2.2.7.md`，README 中继续保留当前仓库最新现有 release 文档为 `release/V2.2.6.md` 的说明。

## [2026-04-07] 修复导航通知分页下拉栏中文乱码与暗色可读性
- 背景/需求：用户反馈顶部导航“信箱/通知”面板里切换页码的下拉栏出现中文乱码；同时黑夜模式下该下拉栏仍呈现偏白的原生浅色面板，导致白字难以辨认。
- 修改类型：fix
- 影响范围：导航通知面板分页下拉栏文案、通知分页下拉栏暗色主题、AI 变更日志
- 变更摘要：
  1) 检索确认乱码根因在 `Navigation.jsx` 的通知分页下拉栏 `<option>` 文案被写成了损坏字符串 `绗?{page} 椤?`，不是接口返回问题。
  2) 将通知分页下拉栏选项文案恢复为正常中文 `第 {page} 页`。
  3) 为通知分页下拉栏新增专用暗色样式 `overlaySelectClass`，并显式设置 `colorScheme: dark/light`，让浏览器原生下拉面板在黑夜模式下跟随深色主题，避免白底白字。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
  - `SanguiBlog-front/src/appfull/ui/NavigationNotificationSelect.test.js`
- 检索与复用策略：
  - 检索关键词：`notificationPage` / `select` / `option` / `绗?` / `bg-white`
  - 候选实现：`Navigation.jsx` 通知分页下拉栏、`overlayButtonClass` 现有浮层按钮体系
  - 最终选择：复用现有浮层样式体系，单独补一个通知分页下拉栏专用深色变体，不影响其他 select
- 风险点：
  - 不同浏览器对原生 `select` 下拉菜单的样式支持存在差异，但 `colorScheme: dark` 已能覆盖主流浏览器的原生暗色面板表现。
- 验证方式：
  - 执行 `node ./src/appfull/ui/NavigationNotificationSelect.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-07] 优化首页主文案在手机端的居中观感
- 背景/需求：用户反馈首页主文案“在这里把问题想清楚，把代码写简单。”在桌面端显示良好，但手机端会自然变成三行，且视觉上像左对齐，第二行带逗号时更显得右侧不齐，希望只优化手机端观感，桌面端保持不变。
- 修改类型：fix
- 影响范围：首页 Hero 移动端标题排版、Hero 移动端样式断言、AI 变更日志
- 变更摘要：
  1) 检索确认文案本身在 `Hero.jsx` 中已固定拆成两段 `span`，问题根因不在文案源，而在 `homeRedesign.css` 的手机端 `.home-hero__headline` 只缩小字号，没有追加移动端的标题宽度与文字居中约束。
  2) 在 `@media (max-width: 640px)` 中为 `.home-hero__headline` 增加更明确的最大宽度、居中对齐、轴向居中，以及轻微收敛的移动端行高和字距。
  3) 桌面端标题结构与样式保持不变，只优化手机端三行场景下的标题整体感。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/homeRedesign.css`
  - `SanguiBlog-front/src/appfull/public/HeroMobileHeadline.test.js`
- 检索与复用策略：
  - 检索关键词：`home-hero__headline` / `Hero.jsx` / `@media (max-width: 640px)` / `在这里把问题想清楚`
  - 候选实现：`Hero.jsx` 标题结构、`homeRedesign.css` 默认标题规则、`homeRedesign.css` 手机端媒体查询
  - 最终选择：复用现有 Hero 标题结构，只补手机端排版样式，不改文案、不改桌面端规则
- 风险点：
  - 本次主要影响手机端 Hero 标题在窄屏下的视觉重心；若后续更换标题文案长度，可能仍需再微调移动端 `max-width`。
- 验证方式：
  - 执行 `node ./src/appfull/public/HeroMobileHeadline.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-07] 移除黑夜模式背景中的流星特效
- 背景/需求：用户反馈黑夜模式下会出现流星特效，体感上主要在手机端更明显，希望直接去掉该特效，其它夜间背景效果保持不变。
- 修改类型：fix
- 影响范围：前台夜间背景彩蛋层、BackgroundEasterEggs 回归断言、AI 变更日志
- 变更摘要：
  1) 检索确认流星来自 `BackgroundEasterEggs.jsx` 中固定全屏黑夜模式分支的 `meteors` 数据与 `meteors.map(...)` 渲染，而首页内部 `fixed={false}` 的黑夜分支并未渲染流星。
  2) 删除 `BackgroundEasterEggs.jsx` 中的流星数据源与对应渲染层，只保留月亮、星点、光晕与底部夜色渐变。
  3) 新增 `BackgroundEasterEggs.test.js` 并以断言约束组件源码中不再出现 `meteors` 与 `meteors.map(...)`，避免后续回归。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/BackgroundEasterEggs.jsx`
  - `SanguiBlog-front/src/appfull/ui/BackgroundEasterEggs.test.js`
- 检索与复用策略：
  - 检索关键词：`BackgroundEasterEggs` / `meteors` / `fixed` / `isDarkMode`
  - 候选实现：`BackgroundEasterEggs.jsx`、`ArticleList.jsx` 中 `fixed={false}` 用法、`AppFull.jsx` 中全局 `fixed` 用法
  - 最终选择：继续复用现有夜间背景组件，只移除流星子层，不新增新的背景组件或主题分支
- 风险点：
  - 本次会让所有使用 `BackgroundEasterEggs` 的夜间页面都不再出现流星，不仅仅是手机端；星点和月亮等夜景氛围保留。
- 验证方式：
  - 执行 `node ./src/appfull/ui/BackgroundEasterEggs.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-07] 调整首页最新评论区域的悬浮上移层级
- 背景/需求：用户希望首页“最新评论”区域取消整块卡片在鼠标悬停时的上移效果，改为仅在鼠标悬停到某一条具体评论卡片时，该条评论轻微上移，其他保持不变。
- 修改类型：fix
- 影响范围：首页最新评论侧栏卡片 hover 反馈、ArticleList 回归断言、AI 变更日志
- 变更摘要：
  1) 检索确认根因在 `ArticleList.jsx` 中“最新评论”外层容器仍使用默认 `home-ios-card` hover 行为，因此悬停整块区域时整个卡片会上移。
  2) 将“最新评论”外层容器切换为 `home-ios-card--static`，取消外层卡整体上移。
  3) 为每条具体评论项补充 `transition-transform duration-200 hover:-translate-y-0.5`，让悬停反馈下沉到单条评论卡片层级。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleList.test.js`
- 检索与复用策略：
  - 检索关键词：`最新评论` / `home-ios-card` / `home-ios-card--static` / `hover:-translate-y`
  - 候选实现：`ArticleList.jsx` 最新评论区域、`homeRedesign.css` 中 `home-ios-card--static`、`ArticleList.test.js` 现有源码级回归断言
  - 最终选择：复用现有 `home-ios-card--static` 与现有 hover 工具类，不新增新的卡片样式类
- 风险点：
  - 本次只影响首页“最新评论”这一块，不会改动作者卡、全部标签卡或文章列表卡片的 hover 行为。
- 验证方式：
  - 执行 `node ./src/appfull/public/ArticleList.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-07] 适配 AI 历史会话浮窗滚动条的黑夜模式
- 背景/需求：用户反馈前台 AI 聊天中“历史会话”浮窗在黑夜模式下滚动条仍偏白、发亮，和整体深色面板不协调，希望只修正该滚动条的深浅色适配，其他行为不变。
- 修改类型：fix
- 影响范围：前台 AI 历史会话浮窗滚动条主题、历史浮窗工具函数、AI 变更日志
- 变更摘要：
  1) 检索确认历史会话浮窗列表容器仅使用 `getHistoryPopoverScrollStyle()` 内联滚动样式，没有接入现有 `sg-scrollbar-dark/light` 主题类，因此黑夜模式下滚动条轨道未跟随主题切换。
  2) 在 `aiHistoryOverlay.js` 中新增 `getHistoryPopoverScrollbarClass(isDarkMode)`，统一返回深浅色对应的滚动条类名。
  3) 在 `AiAssistantWidget.jsx` 的历史会话浮窗滚动容器上接入该类名，让黑夜模式复用站点现有 `sg-scrollbar-dark`，白天模式继续走 `sg-scrollbar-light`。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/aiHistoryOverlay.js`
  - `SanguiBlog-front/src/appfull/ui/aiHistoryOverlay.test.js`
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
- 检索与复用策略：
  - 检索关键词：`historyPopover` / `getHistoryPopoverScrollStyle` / `sg-scrollbar-dark` / `scrollbar-color`
  - 候选实现：`AiAssistantWidget.jsx` 历史会话浮窗、`aiHistoryOverlay.js` 浮窗工具函数、`src/index.css` 现有暗色/亮色滚动条样式
  - 最终选择：复用全站现有 `sg-scrollbar-dark/light`，不新增新的滚动条样式体系
- 风险点：
  - 本次只调整历史会话浮窗的滚动条主题，不改浮窗面板背景、会话项样式和主聊天区滚动条。
- 验证方式：
  - 执行 `node ./src/appfull/ui/aiHistoryOverlay.test.js`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-07] 去除前台 AI 助手消息外层玻璃气泡
- 背景/需求：用户要求当前台与 AI 聊天时，去掉 AI 方消息文字外层的玻璃气泡，让助手内容直接显示在 AI 聊天背景上；用户侧消息气泡保留，其他行为不变。
- 修改类型：fix
- 影响范围：前台 AI 聊天消息展示样式、消息展示断言、AI 变更日志
- 变更摘要：
  1) 检索确认前台 AI 聊天真实单入口仍为 `AppFull.jsx -> AiAssistantWidget.jsx -> aiMessagePresentation.js`，不存在需要并行修改的第二套前台消息组件。
  2) 将 `aiMessagePresentation.js` 中助手消息分支从“带圆角/边框/半透明背景/阴影的玻璃气泡”改为“透明背景直接贴聊天区”的文本容器，保留用户消息右侧玻璃气泡不变。
  3) 同步更新 `aiMessagePresentation.test.js` 断言，明确约束助手消息不再包含圆角边框、背景、阴影与模糊气泡类，防止后续回归。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/aiMessagePresentation.js`
  - `SanguiBlog-front/src/appfull/ui/aiMessagePresentation.test.js`
- 检索与复用策略：
  - 检索关键词：`AiAssistantWidget` / `aiMessagePresentation` / `AiMessageMarkdown` / `助手贴背景` / `用户保留气泡`
  - 候选实现：`AiAssistantWidget.jsx` 消息渲染入口、`aiMessagePresentation.js` 消息样式决策、`AiMessageMarkdown.js` Markdown 渲染层、`.ai/PROJECT_MEMORY.md` 既有行为说明
  - 最终选择：复用现有消息展示链路，只修改助手消息样式决策，不新建聊天组件或第二套样式实现
- 风险点：
  - 本次只移除了助手消息外层气泡容器，未改 Markdown 内部代码块、表格、引用等子元素样式；如果后续希望这些子元素也进一步“去卡片化”，需要单独再收敛 `AiMessageMarkdown.js`。
- 验证方式：
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-06] 统一 AI SSE 旧导出与现用导出的流式解析链
- 背景/需求：用户指出 `api.js` 中旧导出 `streamAiChat` 仍保留一套手写 SSE 解析逻辑，而现用主链路 `streamAiChatReliable` 已切到 `consumeSseStream`；即使补齐 `parseSseBlocks` 导入，也仍存在“旧实现与新实现继续漂移”的维护风险。
- 修改类型：fix
- 影响范围：前端 AI 聊天流式请求封装、SSE 解析一致性、AI 变更日志
- 变更摘要：
  1) 在 `api.js` 中抽出共享的 `openAiChatStreamResponse(...)`，统一负责 token 过期校验、SSE 请求发起、错误解析与 `ReadableStream` 可用性校验。
  2) 将旧导出 `streamAiChat` 改为直接复用 `consumeSseStream`，不再保留独立的手写 `parseSseBlocks` 循环。
  3) 让 `streamAiChatReliable` 与 `streamAiChat` 共享同一条底层流式处理链，避免后续只修一边导致行为漂移或旧导出重新失效。
- 涉及文件：
  - `SanguiBlog-front/src/api.js`
- 检索与复用策略：
  - 检索关键词：`streamAiChat` / `streamAiChatReliable` / `consumeSseStream` / `parseSseBlocks`
  - 候选实现：`api.js` 中两个 SSE 导出、`utils/aiStream.js` 中共享消费器
  - 最终选择：复用现有 `consumeSseStream` 单一实现，不再维护第二套手写 SSE 解析逻辑
- 风险点：
  - 本次未改变 AI 流式接口协议与回调签名，仅收敛实现路径；现网主链路行为应保持不变。
- 验证方式：
  - 执行 `cmd /c npm run lint`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-06] 修复前端静态质量基线并清零 lint 错误
- 背景/需求：用户要求优先解决前端静态质量问题，尤其是 `AdminPanel.jsx` 中条件式 Hook 带来的真实正确性风险，并把当前 `npm run lint` 的报错收敛到可维护基线。
- 修改类型：fix
- 影响范围：前端静态检查基线、AI 审计页 Hook 顺序、SSE 兼容导出、Markdown 代码块组件、后台设置页与首页文章列表的若干 lint/构建问题
- 变更摘要：
  1) 调整 `AiAdminAuditView` 中的 `filteredSessions` 与相关 `useEffect` 调用顺序，消除“先 return 再调用 Hook”的条件式 Hook 风险。
  2) 为 `api.js` 补齐 `parseSseBlocks` 导入，清理多处未使用变量、无用依赖与不稳定依赖写法，并修复 `ArticleList.jsx`、`Navigation.jsx`、`AboutView.jsx`、`ArticleDetail.jsx` 等文件中的 lint 问题。
  3) 将 `MarkdownCodeBlock` 从 `.js` 调整为 `.jsx` 并更新引用，保留复制与展示行为不变，同时恢复可构建状态。
- 涉及文件：
  - `SanguiBlog-front/src/AppFull.jsx`
  - `SanguiBlog-front/src/api.js`
  - `SanguiBlog-front/src/appfull/AdminPanel.jsx`
  - `SanguiBlog-front/src/appfull/aiAssistantAccess.js`
  - `SanguiBlog-front/src/appfull/public/AboutView.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
  - `SanguiBlog-front/src/appfull/shared.js`
  - `SanguiBlog-front/src/appfull/ui/AiMessageMarkdown.js`
  - `SanguiBlog-front/src/appfull/ui/MarkdownCodeBlock.jsx`
  - `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
  - `SanguiBlog-front/src/utils/logger.js`
- 检索与复用策略：
  - 检索关键词：`useEffect` / `parseSseBlocks` / `no-unused-vars` / `MarkdownCodeBlock` / `react-hooks`
  - 候选实现：`AdminPanel.jsx` 的 AI 审计视图、`api.js` 的 SSE 逻辑、`MarkdownCodeBlock` 与 `AiMessageMarkdown` 的代码块渲染链
  - 最终选择：继续复用现有实现与现有组件链，只做最小静态修复，不新增并行模块
- 风险点：
  - 本次未处理 Vite 仍提示的“大包体积”告警，该问题属于后续性能优化项，不影响本轮静态质量修复结论。
- 验证方式：
  - 执行 `cmd /c npm run lint`（工作目录 `SanguiBlog-front`）通过
  - 执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-04] 将文章详情页外层结构适配为站点玻璃风格
- 背景/需求：用户要求继续按统一流程把 `/article/:id` 页面适配为玻璃风格，并明确说明“不要适配那个 md 格式的渲染”。
- 修改类型：fix
- 影响范围：文章详情页头图区、目录卡、前后篇导航、返回/评论快捷按钮、评论区外观、AI 变更日志
- 变更摘要：
  1) 在 `ArticleDetail.jsx` 中复用 `home-ios-card` / `home-ios-inner-card`，将文章页外层壳、目录浮层、分享提示、作者信息区、相关推荐与上一篇/下一篇导航切换到玻璃风格。
  2) 保持 `ReactMarkdown`、`prose`、`sg-article-markdown`、代码高亮与 Markdown 正文渲染逻辑不变，只调整正文外部容器和非 Markdown 信息卡。
  3) 将 `CommentsSection.jsx` 统一改为玻璃卡视觉，并顺手修复该组件中多处用户可见中文乱码，保留评论发布、回复、编辑、删除逻辑不变。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
  - `SanguiBlog-front/src/components/comments/CommentsSection.jsx`
- 检索与复用策略：
  - 检索关键词：`ArticleDetail` / `CommentsSection` / `prose` / `sg-article-markdown` / `home-ios-card`
  - 候选实现：`ArticleDetail.jsx` 页面壳层、目录与前后篇导航，`CommentsSection.jsx` 评论区卡片与输入区，`homeRedesign.css` 玻璃样式基类
  - 最终选择：复用现有文章详情单入口与评论组件，只改外围容器和评论区外观，不新建文章页实现，也不动 Markdown 渲染链
- 风险点：
  - 本次未改 Markdown 渲染本体，因此正文内容的字体、排版与代码块观感仍按现有逻辑输出。
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）

## [2026-04-04] 将关于页适配为站点玻璃风格并移除头部说明文案
- 背景/需求：用户要求按与首页、归档页、工具页相同的思路，将 `/about` 适配为站点当前玻璃视觉，并去掉“由超级管理员维护的单页介绍，访客与管理员均可阅读。”这句说明。
- 修改类型：fix
- 影响范围：关于页视觉、关于页头部文案、Markdown 内容容器、代码块复制区、AI 变更日志
- 变更摘要：
  1) 在 `AboutView.jsx` 中复用现有 `home-ios-card` 与 `home-ios-inner-card`，将主内容容器、空态卡、代码块外壳与按钮统一改为玻璃风格。
  2) 移除 `/about` 页顶层额外背景遮罩，使其底色更贴近 `/tools` 与新版 `/archive` 的页面观感。
  3) 删除关于页标题下方的说明文案，只保留标题和操作按钮，让页头更简洁。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/AboutView.jsx`
- 检索与复用策略：
  - 检索关键词：`AboutView` / `home-ios-card` / `bg-gradient-to-b` / `单页介绍`
  - 候选实现：`AboutView.jsx` 主容器、代码块容器、头部操作区、`homeRedesign.css` 现有玻璃样式体系
  - 最终选择：复用现有玻璃卡样式体系，在原位改造关于页，不新增新的页面组件分支
- 风险点：
  - 主要影响关于页的白天模式视觉层次，Markdown 正文结构与数据来源未改动。
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）

## [2026-04-04] 对齐归档页背景到底色并移除头部说明文案
- 背景/需求：用户反馈 `/archive` 的背景颜色与 `/tools` 不一致，更喜欢 `/tools` 当前的背景观感，同时要求去掉归档页头部那句时间轴说明文案。
- 修改类型：fix
- 影响范围：归档页背景表现、归档页头部文案、AI 变更日志
- 变更摘要：
  1) 排查确认 `/archive` 比 `/tools` 多叠了一层浅色渐变遮罩，导致白天模式背景更白、更雾。
  2) 移除 `ArchiveView.jsx` 顶层额外背景遮罩，使归档页回到和 `/tools` 更接近的站点底色表现。
  3) 删除归档页标题下方的说明段落，只保留标题与操作按钮，让页头更干净。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArchiveView.jsx`
- 检索与复用策略：
  - 检索关键词：`ArchiveView` / `bg-gradient-to-b` / `ARCHIVE // TIMELINE` / `renderGamesView`
  - 候选实现：`ArchiveView.jsx` 顶层遮罩、`AppFull.jsx` 工具页容器
  - 最终选择：复用现有归档页结构，仅移除多余遮罩与说明文案，不新增样式分支
- 风险点：
  - 背景改动主要影响白天模式观感，夜间模式变化较小。
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）

## [2026-04-04] 将归档页与工具页适配为站点玻璃风格
- 背景/需求：用户要求按照首页、登录页、注册页同样的玻璃化流程，把 `/archive` 与 `/tools` 页面继续统一到当前站点的 iOS 风格玻璃视觉。
- 修改类型：fix
- 影响范围：归档页视觉、工具页视觉、工具详情页操作区、通用玻璃样式复用、AI 变更日志
- 变更摘要：
  1) 在 `ArchiveView.jsx` 内复用现有 `home-ios-card` / `home-ios-inner-card` / `home-ios-chip`，将统计卡、月份区块、空态卡、加载卡、快速跳转与文章按钮整体切换到玻璃层次。
  2) 在 `AppFull.jsx` 的 `renderGamesView` 与 `renderGamePlayer` 中复用同一套玻璃基类，把工具列表页、加载骨架、错误提示、工具卡片、详情页操作按钮与 iframe 容器统一改造成玻璃风格。
  3) 保持 `/archive`、`/tools`、`/tools/:id` 现有数据流、跳转逻辑与接口调用不变，只做样式层适配，避免重复实现。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArchiveView.jsx`
  - `SanguiBlog-front/src/AppFull.jsx`
- 检索与复用策略：
  - 检索关键词：`ArchiveView` / `renderGamesView` / `renderGamePlayer` / `home-ios-card` / `home-ios-inner-card` / `home-ios-chip`
  - 候选实现：`ArchiveView.jsx`、`AppFull.jsx` 中工具页列表与详情渲染函数、`homeRedesign.css` 现有玻璃样式体系
  - 最终选择：复用现有页面入口与玻璃样式基类，在原位改造，不新增新的归档页/工具页组件分支
- 风险点：
  - 归档页历史上使用过更强的实体卡片边框，切换到玻璃视觉后白天模式观感更轻，若后续仍觉得不够稳，可以继续微调白天阴影层级。
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）

## [2026-04-04] 修复登录与注册页导航条与页面玻璃风格不匹配
- 背景/需求：用户反馈 `/login` 与 `/register` 页顶部导航条显得突兀，和下方玻璃表单页面颜色与材质层级不匹配。
- 修改类型：fix
- 影响范围：登录页导航视觉、注册页导航视觉、导航状态机分支、AI 变更日志
- 变更摘要：
  1) 排查确认认证页当前沿用了 `home-nav-shell--top` 的轻透明顶部样式，这一分支更适合普通正文页顶部，不适合玻璃表单页。
  2) 在 `Navigation.jsx` 新增认证页判定：`currentView === 'login' || currentView === 'register'`。
  3) 登录/注册页导航改为直接进入玻璃导航分支，并同步让图标按钮使用玻璃态按钮风格，避免导航和下方页面材质割裂。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
- 检索与复用策略：
  - 检索关键词：`heroMode` / `topMode` / `recalledGlassMode` / `login` / `register` / `home-nav-shell--top`
  - 候选实现：`Navigation.jsx` 状态机、`homeRedesign.css` 导航玻璃类、`LoginView/RegisterView` 玻璃页面
  - 最终选择：复用现有导航单入口，在状态机内为认证页切换样式分支，不新增第二套导航
- 风险点：
  - 当前只修认证页导航材质分支，不影响首页/归档/工具等页面既有导航逻辑。
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）

## [2026-04-04] 将登录与注册页面适配为站点玻璃风格
- 背景/需求：用户要求把 `/login` 与 `/register` 两个页面的视觉统一到当前首页/导航使用的玻璃风格。
- 修改类型：fix
- 影响范围：登录页视觉、注册页视觉、输入组件外观、操作按钮外观、AI 变更日志
- 变更摘要：
  1) 登录页 `LoginView` 从旧黑框像素风卡片改为 `home-ios-card` 玻璃面板，输入框、验证码区、错误提示与主次按钮统一玻璃化。
  2) 注册页 `RegisterView` 的邀请码验证与资料填写两步卡片统一切换为玻璃面板，头像选择区、表单输入、密码显隐按钮、提交/返回按钮全部改为玻璃态。
  3) `/login` 与 `/register` 路由入口保持不变，继续复用 `AppFull` 现有视图链路，不新增并行页面实现。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/LoginView.jsx`
  - `SanguiBlog-front/src/appfull/public/RegisterView.jsx`
- 检索与复用策略：
  - 检索关键词：`LoginView` / `RegisterView` / `/login` / `/register` / `AppFull` / `home-ios-card`
  - 候选实现：`LoginView.jsx`、`RegisterView.jsx`、`pages/Login.jsx`、`pages/Register.jsx`
  - 最终选择：复用现有登录/注册页面组件做样式层改造，不变更路由与行为
- 风险点：
  - 本次主要是样式层替换，交互逻辑未改；若后续想继续统一动效节奏，可再做一次动画细调。
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）

## [2026-04-04] 适配手机版菜单玻璃风格并优化首页 CTA 按钮
- 背景/需求：用户反馈移动端打开菜单仍是旧风格，不符合新版玻璃设计；首页“向下探索内容”按钮在手机上过宽且箭头为纯文本符号，观感不佳。
- 修改类型：fix
- 影响范围：移动端导航抽屉视觉、首页 Hero CTA 移动端尺寸、CTA 箭头图标表现、AI 变更日志
- 变更摘要：
  1) `Navigation.jsx` 为移动端抽屉新增并复用玻璃风格类映射（面板、卡片、按钮、强调按钮），将旧版粗描边黑框样式替换为玻璃态层次。
  2) 移动端菜单中的导航项、用户信息卡、登录/退出/主题/背景按钮、每页数量选择器统一切换为玻璃风格。
  3) `Hero.jsx` 将 CTA 右侧文本箭头 `↓` 替换为 Lucide `ChevronDown` 图标。
  4) `homeRedesign.css` 下调移动端 CTA 宽度策略：取消 `width: 100%`，改为 `auto + max-width`，并收紧内边距与间距。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
  - `SanguiBlog-front/src/appfull/public/Hero.jsx`
  - `SanguiBlog-front/src/appfull/public/homeRedesign.css`
- 检索与复用策略：
  - 检索关键词：`menuOpen` / `md:hidden` / `home-hero__cta` / `home-hero__arrow` / `home-nav-icon-btn`
  - 候选实现：移动抽屉在 `Navigation.jsx` 单入口、CTA 在 `Hero.jsx`、移动端尺寸规则在 `homeRedesign.css`
  - 最终选择：复用现有入口做样式升级，不新增第二套移动菜单组件
- 风险点：
  - 移动端 CTA 宽度已收紧为自适应，若你希望更紧凑可继续把 `max-width` 下调到 280~300px。
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）

## [2026-04-04] 修复首页头像外溢裁切并增强白天玻璃卡层次
- 背景/需求：用户反馈首页作者头像顶部应“超出卡片”但当前被裁切；同时白天模式下卡片区域偏白偏平，玻璃层次感弱于夜间模式。
- 修改类型：fix
- 影响范围：首页作者信息卡溢出表现、首页玻璃卡白天模式视觉层次、AI 变更日志
- 变更摘要：
  1) 在 `homeRedesign.css` 增加 `home-ios-card--overflow-visible`，并将作者信息卡挂载该类，恢复头像顶部外溢效果。
  2) 增强 `home-ios-card` 白天模式的多层阴影与高光内描边，补充更明显的前后景层次。
  3) 同步增强 `home-ios-inner-card` 在白天模式下的渐变底与阴影，让卡片簇在密集区域更有分层。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/homeRedesign.css`
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
- 检索与复用策略：
  - 检索关键词：`home-ios-card` / `overflow: hidden` / `absolute -top-6` / `ArticleList` / `avatar`
  - 候选实现：`homeRedesign.css` 玻璃卡基类、`ArticleList.jsx` 作者卡容器、头像绝对定位节点
  - 最终选择：复用现有组件结构，仅修正样式裁切与光影参数，不新增任何并行组件
- 风险点：
  - 白天阴影已加强，若你后续觉得仍偏淡或偏重，可继续微调阴影透明度与模糊半径。
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）

## [2026-04-04] 首页卡片统一适配 iOS 26 玻璃组件设计
- 背景/需求：用户要求对照模板 `新首页设计/html/indexV13.html`，将首页“各种卡片”统一适配为新的 iOS 26 风格组件，且以 HTML 模板为准，避免新增并行实现。
- 修改类型：fix
- 影响范围：首页卡片视觉体系（文章卡、系统状态卡、侧栏卡、搜索卡、空态/错误卡、分页按钮）、首页共享样式、AI 变更日志
- 变更摘要：
  1) 在 `homeRedesign.css` 新增首页玻璃卡片基类（标准玻璃卡、闪耀卡、内嵌子卡、胶囊标签），并补充 dark/light 对应样式与流光动画。
  2) 重构 `TiltCard.jsx` 为可选 `variant` 模式，首页文章卡复用同一组件切换为 `glass` 变体，保留原有 3D 轻倾斜交互，不新增第二套文章卡组件。
  3) 调整 `ArticleList.jsx`：将作者卡、分类导航卡、最新评论卡、标签卡、文章搜索卡、文章主卡正文区、空态与错误态卡片、分页按钮统一收拢到玻璃风格。
  4) 重写 `StatsStrip.jsx` 的外层表现，改为玻璃状态卡 + 胶囊指标项，保留原有数据来源与日期 tooltip 交互。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/homeRedesign.css`
  - `SanguiBlog-front/src/appfull/ui/TiltCard.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
  - `SanguiBlog-front/src/appfull/public/StatsStrip.jsx`
- 检索与复用策略：
  - 检索关键词：`HomeView` / `ArticleList` / `StatsStrip` / `TiltCard` / `homeRedesign` / `glass-panel` / `shimmering` / `inner-panel`
  - 候选实现：`ArticleList.jsx`、`StatsStrip.jsx`、`TiltCard.jsx`、`homeRedesign.css`
  - 最终选择：复用现有首页入口与组件链路做样式升级，不新增第二套首页或卡片模块
- 风险点：
  - 本次只改视觉层与 class 结构，未改接口与数据逻辑；少量细节（如不同浏览器下 `backdrop-filter` 观感）可能仍需后续微调。
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）

## [2026-04-02] 修复首页顶部导航未与首屏背景融合的问题
- 背景/需求：用户指出当前首页顶部导航在页面顶部仍表现为一条明显的白色导航条，没有像模板 `新首页设计/html/indexV11.html` 那样与首屏背景图融为一体；要求仅在滚动到下方文章区域后，导航背景才切换为正文背景色。
- 修改类型：fix
- 影响范围：首页首屏导航背景切换、首页 Hero 与导航联动、AI 变更日志
- 变更摘要：
  1) 检索确认首页与导航真实入口仍是 `HomeView -> Hero.jsx` 与 `Navigation.jsx`，因此继续复用现有实现，不新建第二套首页或导航。
  2) 在 `Hero.jsx` 为首屏增加稳定标记，供导航基于“真实首屏位置”判断当前是否仍处于背景图区域。
  3) 重写 `Navigation.jsx` 中的 `heroMode` 判定逻辑，优先根据首屏元素的 `getBoundingClientRect().bottom` 与导航底部位置实时比较，而不是只依赖 `posts` 区块偏移估算，减少首屏阶段误判导致的白底导航条。
  4) 调整 `homeRedesign.css`：首屏阶段导航壳保持完全透明，与背景图融合；滚动离开首屏后再切到与正文一致的半透明正文底色，并加轻微模糊，让过渡更贴近模板观感。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/Hero.jsx`
  - `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
  - `SanguiBlog-front/src/appfull/public/homeRedesign.css`
- 检索与复用策略：
  - 检索关键词：`Hero` / `Navigation` / `homeRedesign` / `home-nav-shell` / `home-header-offset` / `posts`
  - 找到的候选点：`Hero.jsx` 首屏背景与滚动淡出；`Navigation.jsx` 的 `heroMode` 切换；`homeRedesign.css` 的导航壳视觉；模板 `indexV11.html` 的透明导航行为
  - 最终选择：复用现有首页与导航链路做最小修正，不新增组件、不复制模板页面
- 风险点：
  - 本次重点修正的是“首屏顶部导航背景切换时机”，没有扩大调整首页正文区排版；若后续还要继续贴近模板，可再单独优化导航左右操作区的视觉轻量化
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-02] 为全站导航补齐顶部透明态并增加智能显隐
- 背景/需求：用户进一步指出“顶部透明”当前只适配了首页，希望其他页面在顶部也有统一的透明态；同时提出正文滚动阶段是否可以让导航自动隐去，并在回到顶部、向上滚动或鼠标靠近顶部时再显现。
- 修改类型：fix
- 影响范围：全站导航顶部视觉一致性、导航滚动交互、AI 变更日志
- 变更摘要：
  1) 继续复用现有 `Navigation.jsx` 单入口，不新增第二套导航，仅在原有状态机上扩展 `topMode` 与 `navVisible`。
  2) 非首页页面在页面顶部也进入轻透明态，首页首屏继续保持完全融入背景图的 `heroMode`，从而实现“全站顶部风格统一，但首页首屏更沉浸”的分层效果。
  3) 导航新增智能显隐：向下滚动并离开顶部后自动收起；向上滚动、回到顶部、打开菜单/通知/设置面板时重新显示。
  4) 桌面端额外补充“鼠标靠近顶部即唤回导航”，兼顾沉浸感和可达性；移动端则主要依赖回顶和向上滚动恢复显示。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
  - `SanguiBlog-front/src/appfull/public/homeRedesign.css`
- 检索与复用策略：
  - 检索关键词：`heroMode` / `scroll` / `headerHeight` / `fixed top-0` / `ArchiveView` / `AboutView` / `ArticleDetail`
  - 找到的候选点：`Navigation.jsx` 中已有滚动监听与 hero 状态切换；其它页面（归档/关于/文章详情）都复用同一个顶层导航，而不是各自维护独立导航
  - 最终选择：在 `Navigation.jsx` 内统一扩展全站交互，避免出现“首页一套、其它页面一套”的重复实现
- 风险点：
  - 当前自动显隐的触发阈值采用较保守的滚动差值，优先稳定；如果你后续觉得“收起太快”或“出现太敏感”，我们可以再只微调阈值，不必重写逻辑
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-02] 为正文区唤回导航补充 iOS 风格玻璃态
- 背景/需求：用户反馈导航在页面下方被鼠标唤回时，和正文内容叠在一起会不够清晰，希望加入类似 iOS 玻璃背景的特效，提高可读性。
- 修改类型：fix
- 影响范围：全站导航正文区唤回态视觉、导航可读性、AI 变更日志
- 变更摘要：
  1) 继续复用 `Navigation.jsx` 单入口，不新增新组件，只为“已离开顶部且导航被唤回”的状态增加 `glass` 视觉分支。
  2) 为正文区唤回态导航新增更强的 `blur + saturate + 半透明亮层 + 内高光 + 阴影 + 底边线`，让导航从复杂正文背景里更容易被识别。
  3) 首页首屏透明态与页面顶部轻透明态保持不变，避免把所有状态都做成过重玻璃，保留层次感。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
  - `SanguiBlog-front/src/appfull/public/homeRedesign.css`
- 检索与复用策略：
  - 检索关键词：`navVisible` / `topMode` / `heroMode` / `home-nav-shell`
  - 找到的候选点：导航当前已有首页首屏态、顶部轻透明态和正文常规态，因此本次只扩展“正文区唤回态”
  - 最终选择：在现有导航壳 class 上增加 `home-nav-shell--glass`，不新增第二套导航
- 风险点：
  - 不同显示器和浏览器对 `backdrop-filter` 的观感会略有差异；若后续想继续贴近更强的液态玻璃感，可以再细调透明度和高光强度
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-02] 收紧玻璃导航显示方式并修复登录/注册页多余滚动
- 背景/需求：用户反馈上一版玻璃导航“只有登录页看到了”，并指出登录页出现了不该有的额外下拉空间；希望页面初始保持单屏，只有真正下拉正文后才看到更明显的玻璃导航。
- 修改类型：fix
- 影响范围：导航玻璃态可见性、登录/注册页首屏高度、AI 变更日志
- 变更摘要：
  1) 将正文区玻璃导航进一步强化为“悬浮玻璃条”而非整条贴满顶部，增加圆角、边框和外边距，让它在下拉后更容易被感知。
  2) 登录页原先使用 `h-screen`，与顶层固定头部占位叠加后会多出一段可滚动空间；现改为按 `100vh - headerHeight` 计算可视高度。
  3) 注册页同样从 `min-h-screen` 改为扣除顶部导航占位后的最小高度，避免同类问题继续出现。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/homeRedesign.css`
  - `SanguiBlog-front/src/appfull/public/LoginView.jsx`
  - `SanguiBlog-front/src/appfull/public/RegisterView.jsx`
- 检索与复用策略：
  - 检索关键词：`h-screen` / `min-h-screen` / `headerHeight` / `home-nav-shell--glass`
  - 找到的候选点：登录页 `h-screen`、注册页 `min-h-screen`、导航壳玻璃态样式
  - 最终选择：继续复用现有导航与布局上下文，只修正高度计算和玻璃态视觉，不引入新的布局系统
- 风险点：
  - 若后续某些表单页内容本身超过一屏，仍会自然出现滚动；这属于内容真实高度，不再是布局误差造成的空滚动
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-02] 修正首页“向下探索内容”落点并避免系统状态遮住作者头像
- 背景/需求：用户反馈首页首屏“向下探索内容”按钮的滚动位置不对，期望滚到“系统状态”刚好贴顶的位置；同时指出系统状态条下方的作者头像有一部分被遮住。
- 修改类型：fix
- 影响范围：首页首屏 CTA 滚动落点、系统状态条锚点、首页正文起始留白、AI 变更日志
- 变更摘要：
  1) 为系统状态条增加独立锚点 `home-status-strip`，不再让首屏 CTA 只对准正文区外层 `#posts`。
  2) `AppFull.jsx` 中的首页滚动逻辑改为优先滚到系统状态条，并使用实时 `headerHeight` 计算偏移，让“系统状态”更接近“刚好在顶部”的视觉落点。
  3) 首页正文区上内边距从 `pt-4` 提高到 `pt-12`，给作者卡片顶部头像留出更安全的展示空间，避免被上方 sticky 状态条压住。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/StatsStrip.jsx`
  - `SanguiBlog-front/src/AppFull.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
- 检索与复用策略：
  - 检索关键词：`scrollToPostsTop` / `StatsStrip` / `home-status` / `posts` / `avatar`
  - 找到的候选点：首屏 CTA 与首页筛选回顶统一复用 `scrollToPostsTop`；系统状态条在 `StatsStrip.jsx`；作者头像在 `ArticleList.jsx` 左侧卡片
  - 最终选择：继续复用现有首页滚动链路与系统状态组件，只校准锚点和间距，不新增第二套滚动逻辑
- 风险点：
  - 当前落点已从“正文外层”改为“系统状态条本身”；若你后续想要更极致的模板感，我们还可以再细调顶部偏移的 8px 余量
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-02] 修复首页滚动落点改动引入的 layoutContextValue 初始化白屏
- 背景/需求：用户反馈页面白屏，控制台报错 `Cannot access 'layoutContextValue' before initialization`，定位到 `AppFull.jsx` 中首页滚动函数在 `layoutContextValue` 声明前提前引用了它。
- 修改类型：fix
- 影响范围：首页初始化稳定性、首页 CTA 滚动函数、AI 变更日志
- 变更摘要：
  1) 根因确认不是首页组件本身，而是 `scrollToPostsTop` 的闭包提前读取了尚未初始化的 `layoutContextValue`。
  2) 将滚动偏移计算改回直接基于已存在的 `NAVIGATION_HEIGHT + emergencyHeight`，避免对后置 `useMemo` 变量产生 TDZ 引用。
  3) 保留上一轮“滚到系统状态条本身”的目标不变，只修复初始化时序错误。
- 涉及文件：
  - `SanguiBlog-front/src/AppFull.jsx`
- 检索与复用策略：
  - 检索关键词：`layoutContextValue` / `scrollToPostsTop` / `headerHeight` / `before initialization`
  - 找到的候选点：`scrollToPostsTop` 回调定义位置、`layoutContextValue` 的 `useMemo` 声明位置
  - 最终选择：做最小修复，不搬动大段代码结构
- 风险点：
  - 当前问题已定位为 TDZ 初始化顺序错误，不涉及其它首页组件；若后续继续重构该区域，需注意 `const/useMemo` 的声明先后
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-02] 进一步收紧首页 CTA 到系统状态条的实际落点
- 背景/需求：用户反馈虽然头像不再被遮挡，但“向下探索内容”仍没有准确滑到系统状态条本身。
- 修改类型：fix
- 影响范围：首页首屏 CTA 滚动精度、系统状态条锚点、AI 变更日志
- 变更摘要：
  1) 放弃继续手工猜测 `window.pageYOffset - offset` 的方式，改为让系统状态条自行声明 `scrollMarginTop=headerHeight`。
  2) `scrollToPostsTop` 改为直接对 `home-status-strip` 执行 `scrollIntoView({ block: 'start' })`，把落点交给浏览器原生滚动锚点处理。
  3) 保留上一轮给作者卡片增加的顶部留白，因此这次只校准落点，不回退头像防遮挡修复。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/StatsStrip.jsx`
  - `SanguiBlog-front/src/AppFull.jsx`
- 检索与复用策略：
  - 检索关键词：`scrollIntoView` / `scrollMarginTop` / `home-status-strip`
  - 找到的候选点：系统状态条本身具备 `headerHeight` 上下文，可直接作为锚点声明处；首页 CTA 与筛选回顶继续复用同一个 `scrollToPostsTop`
  - 最终选择：复用现有滚动链路，改成原生锚点方式，不新增第二套滚动函数
- 风险点：
  - 浏览器对 `scroll-margin-top` 的实现总体稳定；若后续还存在极细微差异，再做少量像素级微调即可
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-02] 去掉首页系统状态条对隐藏导航的保留顶部距离
- 背景/需求：用户指出首页 CTA 下滑后，系统状态条上方仍然保留了一段“原本给固定导航预留”的不可见距离；现在导航已隐去，这段距离不应继续存在。
- 修改类型：fix
- 影响范围：首页系统状态条吸顶位置、首页 CTA 视觉落点、AI 变更日志
- 变更摘要：
  1) 根因确认在 `StatsStrip.jsx`：状态条本身仍按旧规则使用 `top: headerHeight` 与 `scrollMarginTop: headerHeight`。
  2) 将首页系统状态条改为直接 `top: 0` 吸顶，同时移除滚动锚点的顶部预留，让 CTA 落点和实际吸顶位置保持一致。
  3) 保留上一轮对作者区增加的顶部留白，因此本次只消除“隐藏导航后仍保留不可见距离”的问题。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/StatsStrip.jsx`
- 检索与复用策略：
  - 检索关键词：`top: headerHeight` / `scrollMarginTop` / `home-status-strip`
  - 找到的候选点：系统状态条自己的 sticky 配置就是额外空距的来源
  - 最终选择：只修 `StatsStrip.jsx`，不再继续叠加新的滚动补丁
- 风险点：
  - 当导航被鼠标唤回时，会覆盖在系统状态条上方；这符合当前“导航浮回覆盖正文”的交互方向
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-04-02] 将首页首屏文案的滚动淡出方向改为向上
- 背景/需求：用户指出当前首页首屏文案在下滑时是“向下逐渐消失”，观感与目标模板不一致，希望改成“向上逐渐消失”。
- 修改类型：fix
- 影响范围：首页首屏滚动动效、Hero 文案退场方向、AI 变更日志
- 变更摘要：
  1) 根因确认在 `Hero.jsx`：首屏内容层的 `contentY` 当前从 `0 -> 96`，因此在滚动时会被向下推走。
  2) 将首屏内容层的滚动位移改为 `0 -> -84`，让文案在透明度下降的同时向上退场。
  3) 不改动现有鼠标视差层和背景层，只修正文案滚动退场方向，避免扩大影响首屏其它交互。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/Hero.jsx`
- 检索与复用策略：
  - 检索关键词：`contentY` / `useTransform` / `scrollY` / `Hero`
  - 找到的候选点：首屏文案滚动动效集中在 `Hero.jsx`
  - 最终选择：复用现有 Framer Motion 动效链路，仅调整位移方向，不新建动画实现
- 风险点：
  - 这次只修正首屏内容退场方向；如果后续你还想让它更像“被卷走”或“更轻一点”，可以继续微调位移幅度和透明度曲线
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-03-31] 按模板回收首页与导航的偏差实现
- 背景/需求：用户指出上一版首页改造与 `newIndex` 模板差异仍然较大，包括首页顶部出现彩蛋背景、导航未做到模板式居中分栏、左侧标题样式不对、首页按钮过多、首屏文案重复以及 `Hello, I am Sangui` 被额外拼接版本文案。
- 修改类型：fix
- 影响范围：首页首屏结构、导航布局、首页彩蛋背景显示范围、AI 变更日志
- 变更摘要：
  1) 首页首屏回收为更贴近模板的结构，只保留 `Hello, I am Sangui`、双行主标题和单个“向下探索内容 ↓”按钮，移除额外副文案、状态胶囊和第二按钮。
  2) 导航左侧品牌区改为 `三桂博客 + 版本号` 的原模板表达，中间导航改为真正的绝对居中布局，尽量贴近模板的三段结构。
  3) 全局 `BackgroundEasterEggs` 不再覆盖首页首屏；首页改为仅在 `System Status` 以下的文章区内部渲染彩蛋背景，满足“以下方内容为分界线”的要求。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/Hero.jsx`
  - `SanguiBlog-front/src/appfull/public/homeRedesign.css`
  - `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
  - `SanguiBlog-front/src/appfull/ui/BackgroundEasterEggs.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
  - `SanguiBlog-front/src/AppFull.jsx`
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-03-31] 将首页与导航重设计为 newIndex 同款极简沉浸式风格
- 背景/需求：用户要求先严格阅读 `.ai/README.md` 并按“项目扫描 → 需求复述 → 验收标准 → 检索报告 → 复用/新建决策”流程执行，然后把根目录 `newIndex` 中的首页设计稿接入到项目真实首页；明确要求版本号同步、适配黑/白模式、支持 `bg.jpg` 背景，且仅改首页与导航条。
- 修改类型：feat
- 影响范围：首页首屏视觉、顶部导航视觉、前端静态资源、站点版本号、README、AI 变更日志、项目记忆
- 变更摘要：
  1) 检索确认首页真实入口仍为 `AppFull -> HomeView -> Hero/ArticleList`，导航真实入口仍为 `Navigation.jsx`，因此不新建第二套首页或导航，只在现有入口内迁入设计稿视觉。
  2) 重写 `Hero.jsx`，将 `newIndex` 的极简沉浸式首屏结构接入项目首页，继续复用现有版本号、Hero 文案与“向下阅读”交互链路。
  3) 新增 `homeRedesign.css` 作为首页与导航共用视觉样式，并把 `newIndex/html/bg.jpg` 复制到前端静态目录 `public/static/home/bg.jpg`，通过现有资源解析方式接入首页背景。
  4) 改造 `Navigation.jsx` 的桌面导航壳与品牌区样式，继续保留现有登录态、通知、设置、主题切换与移动端菜单逻辑，只替换视觉层。
  5) 将站点版本从 `V2.2.5` 升级到 `V2.2.6`，同步更新后端 `site.version`、首页兜底版本与 README 当前版本说明。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/Hero.jsx`
  - `SanguiBlog-front/src/appfull/public/homeRedesign.css`
  - `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
  - `SanguiBlog-front/src/AppFull.jsx`
  - `SanguiBlog-front/src/appfull/public/HomeView.jsx`
  - `SanguiBlog-front/public/static/home/bg.jpg`
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `README.md`
  - `.ai/PROJECT_MEMORY.md`
- 检索与复用策略：
  - 检索关键词：`HomeView` / `Hero` / `Navigation` / `site.version` / `isDarkMode` / `newIndex`
  - 找到的候选点：首页组合视图位于 `HomeView.jsx`；首屏实现位于 `Hero.jsx`；导航实现位于 `Navigation.jsx`；版本统一来源位于 `application.yaml` + `/api/site/meta`
  - 最终选择：复用现有首页和导航入口做样式迁移，不新建页面组件、不新建版本接口、不复制一份设计稿页面
- 风险点：
  - 当前主要重做首屏与桌面导航视觉，首页正文 `ArticleList` 仍保留项目原有信息密度较高的布局；若后续想进一步做到整页风格完全统一，可在下一轮继续只针对首页正文做渐进式重绘
- 验证方式：
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-03-31] 修复首页文章搜索条因清空按钮显隐导致的宽度抖动
- 背景/需求：用户反馈首页文章搜索模块在输入框为空和有内容时长度不一致；无内容时会略微缩回去，有内容时又变长，导致整体不协调。
- 修改类型：fix
- 影响范围：首页文章搜索条布局稳定性、前端最小回归测试、AI 变更日志
- 变更摘要：
  1) 检索确认问题不在输入框文字，而在 `ArticleList.jsx` 中“清空”按钮按 `keyword` 条件渲染，导致搜索条内部右侧占位忽有忽无。
  2) 将“清空”按钮从条件渲染改为固定宽度占位容器内常驻渲染，无关键词时仅做透明隐藏和禁用，不再影响搜索条整体长度。
  3) 保留原有“回车搜索”和“一键清空并重置到第 1 页”的交互逻辑不变，只修复布局抖动。
  4) 新增 `ArticleList.test.js` 最小源码级回归检查，约束固定占位容器与隐藏态样式持续存在。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
  - `SanguiBlog-front/src/appfull/public/ArticleList.test.js`
- 检索与复用策略：
  - 检索关键词：`ArticleList` / `关键词` / `清空` / `文章搜索` / `keyword`
  - 找到的候选点：搜索输入框容器、条件渲染的清空按钮、右侧匹配统计块均位于 `ArticleList.jsx`
  - 最终选择：复用现有搜索条结构，仅把清空按钮改成“固定占位 + 显隐切换”，不新建搜索组件、不改查询参数链路
- 风险点：
  - 本次主要修复宽度稳定性，未继续扩大调整“右侧统计块”的文案长度策略；若后续想进一步统一视觉节奏，可再考虑给统计块做固定最小宽度
- 验证方式：
  - 测试：执行 `node SanguiBlog-front/src/appfull/public/ArticleList.test.js` 通过
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-03-31] 升级 AI 助理右下角入口为低频待命感动效
- 背景/需求：用户希望右下角 AI 助理入口不只是“发光按钮”，而要更有“智能助手在线待命”的感觉；明确选择“待命感动效”方向，要求采用低频感知脉冲、轻扫描光、细小轨道粒子和缓慢能量流，整体克制、持续、精密。
- 修改类型：feat
- 影响范围：前端 AI 助理右下角入口动效、入口视觉语义、AI 变更日志
- 变更摘要：
  1) 继续复用 `AiAssistantWidget.jsx` 中现有入口结构，不新建第二套入口组件，只在原位升级动效语言。
  2) 外层亮块新增沿轮廓缓慢呼吸的能量边缘，并在按钮表面加入低频扫描光，让入口更像“正在感知环境”的待命状态。
  3) 图标周围原先较强的旋转装饰改为更柔和的脉冲边框、细小轨道粒子与轻量能量扩散，降低“炫技感”，提升“智能体在线”的精密感。
  4) 保留原有赛博亮块设计与白天/夜间双主题适配，同时让夜间模式下的入口更有存在感但不过分刺眼。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
- 检索与复用策略：
  - 检索关键词：`AiAssistantWidget` / `motion.button` / `launcherGlowShapeClass` / `whileHover` / `rotate`
  - 找到的候选点：AI 入口主按钮、亮块容器、图标周围脉冲与轨道粒子均集中在 `AiAssistantWidget.jsx`
  - 最终选择：复用现有入口组件和 Framer Motion 动效栈做小步升级，不新增样式文件、不拆第二套动画系统
- 风险点：
  - 本次动效强化主要集中在“待命氛围”，未引入基于真实消息状态的动态联动；如果后续想更进一步，可按“空闲 / hover / 打开 / 正在回复”做状态分层
- 验证方式：
  - 测试：执行 `node SanguiBlog-front/src/appfull/ui/AiAssistantWidget.test.js` 通过
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-03-31] 修复 AI 助理右下角入口亮块与按钮形状不一致的问题
- 背景/需求：用户反馈首页右下角 AI 助理入口保留了亮块设计，但亮块轮廓更接近外扩矩形，而按钮本体是圆角矩形，导致四角在白天模式下略显突起、夜间模式下尤其违和；要求保留发光氛围，同时让亮块与按钮尽量保持同一种形状。
- 修改类型：fix
- 影响范围：前端 AI 助理右下角入口样式、入口最小回归测试、AI 变更日志
- 变更摘要：
  1) 在 `AiAssistantWidget.jsx` 中为入口按钮与亮块补充统一的圆角形状常量，避免按钮本体、内层高光和外层亮块各自使用不同圆角。
  2) 将入口按钮容器改为 `isolate + overflow-hidden`，把原本外扩导致四角凸起的亮块裁切回与按钮一致的圆角矩形轮廓。
  3) 保留原有发光、渐变和动态效果，但把主发光层收敛为按钮同形状的内发光，不再出现夜间模式下明显外凸的亮块角。
  4) 补充 `AiAssistantWidget.test.js` 最小源码级回归检查，约束入口发光层继续使用统一圆角形状并防止旧的 `rounded-[34px]` 回流。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.test.js`
- 检索与复用策略：
  - 检索关键词：`AiAssistantWidget` / `launcher` / `rounded-[24px]` / `rounded-[34px]` / `右下角` / `亮块`
  - 找到的候选点：`AppFull.jsx` 中 AI 入口挂载点；`AiAssistantWidget.jsx` 中入口按钮与亮块实现；`aiLauncherBadge.js` 中入口文案辅助；历史 AI 入口修改记录位于本日志
  - 最终选择：继续复用现有 `AiAssistantWidget` 单点修复样式，不新建按钮组件、不新增样式模块，避免形成第二套 AI 入口实现
- 风险点：
  - 这次主要修正入口外层轮廓一致性，没有扩大调整内部图标周围的旋转装饰；若后续仍觉得图标局部装饰过于抢眼，可再单独微调图标层动效
- 验证方式：
  - 测试：执行 `node SanguiBlog-front/src/appfull/ui/AiAssistantWidget.test.js` 通过
  - 构建：执行 `cmd /c npm run build`（工作目录 `SanguiBlog-front`）通过

## [2026-03-28] 升级站点版本号到 V2.2.5 并同步首页与 README 说明
- 背景/需求：用户要求将项目版本从 `V2.2.4` 更新到 `V2.2.5`，不生成 release 文档，只需要同步首页版本展示，并检查根目录 `README.md` 中是否存在与当前版本相关的过时内容后做最小更新；同时要求补充本次 AI 修改日志。
- 修改类型：chore / docs
- 影响范围：站点版本元信息、首页版本展示、根目录 README、AI 变更日志
- 变更摘要：
  1) 将后端配置中的 `site.version` 从 `V2.2.4` 升级到 `V2.2.5`，继续作为站点统一版本来源。
  2) 将首页 `HomeView` 中的前端兜底版本同步到 `V2.2.5`，避免接口元信息缺失时仍显示旧版本。
  3) 检查并更新根目录 `README.md` 中与当前站点版本直接相关的过时描述，同时保持“当前最新现有对外 release 文档”为 `release/V2.2.4.md`，不伪造 `V2.2.5` release 状态。
- 涉及文件：
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `SanguiBlog-front/src/appfull/public/HomeView.jsx`
  - `README.md`
- 检索与复用策略：
  - 检索关键词：`site.version` / `V2.2.4` / `meta?.version` / `README` / `release/V2.2.4`
  - 找到的候选点：后端统一版本源位于 `application.yaml`；首页版本兜底位于 `HomeView.jsx`；README 顶部与 AI 助理章节维护当前版本说明；已有版本同步脚本位于 `scripts/bump-version.ps1`
  - 最终选择：复用现有版本链路与文档结构，只做最小文本同步，不新增模块、不新增 release 文档
- 风险点：
  - README 中关于“最新现有 release 文档”的描述需继续保持 `V2.2.4`，否则会造成仓库状态与文档不一致。
- 验证方式：
  - 检索确认 `site.version`、首页兜底版本与 README 当前版本说明已同步为 `V2.2.5`

## [2026-03-28] 修复首页摘要 tooltip 首帧误显的问题
- 背景/需求：用户指出首页文章卡片摘要虽然已在上一轮限制为“仅截断时显示 tooltip”，但首次渲染时 `excerptOverflowMap[post.id]` 仍是 `undefined`，而 `getArticleExcerptTooltip` 的默认参数会把它当成允许显示，导致首帧里未截断摘要也短暂带上 tooltip、`cursor-help` 和 `aria-label`。
- 修改类型：fix
- 影响范围：首页文章列表摘要 tooltip 首次渲染行为、摘要 tooltip 纯函数测试、AI 变更日志
- 变更摘要：
  1) 将 `getArticleExcerptTooltip` 的默认溢出参数改为保守关闭，避免未测量完成时误开 tooltip。
  2) `ArticleList` 调用处改为显式要求 `excerptOverflowMap[post.id] === true` 才生成摘要 tooltip，进一步消除 `undefined` 首帧闪现。
  3) 为摘要 tooltip 纯函数测试补充“未显式声明溢出时默认不显示”的回归断言，锁定这次修复。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
  - `SanguiBlog-front/src/appfull/public/articleExcerptTooltip.js`
  - `SanguiBlog-front/src/appfull/public/articleExcerptTooltip.test.js`
- 检索与复用策略：
  - 检索关键词：`getArticleExcerptTooltip` / `excerptOverflowMap` / `ArticleList` / `articleExcerptTooltip`
  - 找到的候选点：首页摘要调用位于 `ArticleList.jsx`；摘要 tooltip 纯函数位于 `articleExcerptTooltip.js`；最小回归测试位于 `articleExcerptTooltip.test.js`
  - 最终选择：继续复用现有摘要测量与 tooltip 工具，只修正默认值和调用约束，不新增组件、不新增状态、不新增接口
- 风险点：
  - 当前修复聚焦“首帧默认关闭”，后续若首页摘要改成异步字体或动态高度规则，仍需复查 `requestAnimationFrame + resize` 的截断测量时机。
- 验证方式：
  - 测试：执行 `node SanguiBlog-front/src/appfull/public/articleExcerptTooltip.test.js`

## [2026-03-28] 提升首页摘要截断判定对字体加载和容器回流的稳定性
- 背景/需求：用户指出首页摘要截断判定当前只在首帧 `requestAnimationFrame` 和 `window.resize` 时重测，遇到异步字体加载、父容器宽度变化或回流时可能长期误判，直到用户手动缩放窗口才恢复。
- 修改类型：fix
- 影响范围：首页文章列表摘要截断监听、摘要测量工具、摘要 tooltip 纯函数测试、AI 变更日志
- 变更摘要：
  1) 在摘要 tooltip 工具模块中新增统一的摘要溢出观察器，复用现有测量函数并优先使用 `ResizeObserver` 观察摘要节点尺寸变化。
  2) 观察器在保留 `window.resize` 兜底的同时，补充对 `document.fonts.ready` 的二次测量，降低异步字体加载导致的误判。
  3) `ArticleList` 的摘要截断重测改为通过该观察器驱动，不再只依赖单次 `requestAnimationFrame + resize`。
  4) 补充最小回归测试，覆盖“观察摘要节点”和“字体 ready 后再次测量”的行为。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
  - `SanguiBlog-front/src/appfull/public/articleExcerptTooltip.js`
  - `SanguiBlog-front/src/appfull/public/articleExcerptTooltip.test.js`
- 检索与复用策略：
  - 检索关键词：`ResizeObserver` / `requestAnimationFrame` / `ArticleList` / `AdminPanel`
  - 找到的候选点：首页摘要测量 effect 位于 `ArticleList.jsx`；后台已有 `ResizeObserver` 参考位于 `AdminPanel.jsx`；摘要工具与测试位于 `articleExcerptTooltip.js/.test.js`
  - 最终选择：复用后台现有 `ResizeObserver` 监听思路，并落在首页现有摘要测量链路中，不新增第二套布局监听实现
- 风险点：
  - 当前观察范围是摘要节点本身；若未来摘要显示方式改成跨节点组合布局，需同步复查观察目标是否仍足够覆盖回流来源。
- 验证方式：
  - 测试：执行 `node SanguiBlog-front/src/appfull/public/articleExcerptTooltip.test.js`

## [2026-03-28] 为首页摘要 tooltip 补充组件链路级最小回归测试
- 背景/需求：用户指出现有测试只覆盖摘要 tooltip 纯函数，没有覆盖 `ArticleList` 中“首次渲染 -> ref 注册 -> 测量后更新 -> tooltip 开关”的真实链路，像首帧误显这类问题仍可能漏网。
- 修改类型：test
- 影响范围：首页摘要 tooltip 测试、摘要测量工具、ArticleList 引用方式、AI 变更日志
- 变更摘要：
  1) 在摘要 tooltip 工具模块中新增最小 tracker，承接摘要节点注册、溢出测量和 tooltip 派生，供 `ArticleList` 继续复用。
  2) `ArticleList` 改为通过该 tracker 完成摘要节点注册与测量，不改变现有展示规则，只让状态切换链路可测试。
  3) 补充“未测量前默认不显示 tooltip，测量为溢出后才显示，再次测量为未溢出后关闭”的最小回归测试。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
  - `SanguiBlog-front/src/appfull/public/articleExcerptTooltip.js`
  - `SanguiBlog-front/src/appfull/public/articleExcerptTooltip.test.js`
- 检索与复用策略：
  - 检索关键词：`articleExcerptTooltip.test.js` / `ArticleList` / `ref` / `excerptOverflowMap`
  - 找到的候选点：现有纯函数测试位于 `articleExcerptTooltip.test.js`；真实调用链位于 `ArticleList.jsx`；摘要工具位于 `articleExcerptTooltip.js`
  - 最终选择：不额外引入新的组件测试依赖，而是在现有工具模块内抽出与组件同源的最小状态链路，作为组件行为级回归入口
- 风险点：
  - 当前仓库尚无通用 React DOM 组件测试基础设施，因此这次采用的是“组件同源状态链路测试”；若后续引入正式组件测试框架，可再把这条回归升级为真实渲染级测试。
- 验证方式：
  - 测试：执行 `node SanguiBlog-front/src/appfull/public/articleExcerptTooltip.test.js`

## [2026-03-27] 首页文章卡片摘要仅在被截断时显示悬停全文
- 背景/需求：用户反馈首页文章卡片摘要当前只要有内容，鼠标悬停就会显示完整摘要；但对那些本身已完整展示的短摘要，再弹出全文提示没有意义，要求仅在摘要实际被 `line-clamp` 截断时继续显示悬停全文。
- 修改类型：fix
- 影响范围：首页文章列表摘要 hover 提示、摘要 tooltip 纯函数测试
- 变更摘要：
  1) 为首页摘要 tooltip 工具补充“是否发生溢出截断”的纯函数判定，统一约束 tooltip 只服务于真正被裁切的摘要。
  2) `ArticleList` 在摘要段落渲染后，基于真实 DOM 的 `scrollHeight/clientHeight` 与 `scrollWidth/clientWidth` 判断是否被截断；仅截断项保留 `cursor-help`、`aria-label` 与自定义悬停浮层。
  3) 为摘要 tooltip 工具补充最小回归测试，覆盖“未截断不显示 tooltip、截断继续显示、溢出判定阈值”三类场景。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
  - `SanguiBlog-front/src/appfull/public/articleExcerptTooltip.js`
  - `SanguiBlog-front/src/appfull/public/articleExcerptTooltip.test.js`
- 检索与复用策略：
  - 检索关键词：`excerpt` / `ArticleList` / `articleExcerptTooltip` / `line-clamp` / `tooltip`
  - 找到的候选点：首页摘要展示位于 `ArticleList.jsx`；摘要 tooltip 纯函数位于 `articleExcerptTooltip.js`；已有最小测试位于 `articleExcerptTooltip.test.js`
  - 最终选择：复用现有首页摘要段落与 tooltip 工具，在原位补充“是否截断”的判断，不新增组件、不新增接口
- 风险点：
  - 截断判定依赖浏览器布局测量，当前会在初次渲染后及窗口尺寸变化时刷新；若后续首页摘要样式高度规则再次变化，需要同步复查该测量逻辑。
- 验证方式：
  - 测试：执行 `node SanguiBlog-front/src/appfull/public/articleExcerptTooltip.test.js` 通过
  - 构建：执行 `cmd /c npm run build` 通过

## [2026-03-27] 按 sitemap 复查并补齐 AI 对工具详情页的当前页面解释
- 背景/需求：用户要求基于当前 `sitemap` 复查所有公开页面，确认 AI 助手是否仍有“不认识当前页面”的遗漏；后台 `/admin` 及其子页面明确排除在外。
- 修改类型：feat
- 影响范围：前端当前页面上下文构建、前端回归测试、AI 变更日志
- 变更摘要：
  1) 对照 `SitemapService` 生成的公开页面类型后，确认当前剩余缺口是 `/tools/:id` 对应的工具详情页。
  2) 在前端 `buildAiCurrentPageContext` 中新增 `view === "game"` 的页面上下文生成逻辑，使 AI 在工具详情页也能理解“当前正在看的具体工具”。
  3) 为工具详情页补充回归测试，校验其页面标题、详情 URL 和说明文案均能正确传给 AI 助手。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/aiCurrentPageContext.js`
  - `SanguiBlog-front/src/appfull/aiCurrentPageContext.test.js`
- 验证方式：
  - 前端测试：执行 `node src/appfull/aiCurrentPageContext.test.js` 通过
  - 前端构建：执行 `cmd /c npm run build` 通过

## [2026-03-27] AI 助手补齐对登录页与注册页的当前页面解释
- 背景/需求：用户反馈 AI 助手当前已经能结合首页、归档页、工具页、文章页等站内页面进行解释，但在 `/login` 和 `/register` 页面上仍无法像其他页面一样理解“当前页面是做什么的”。
- 修改类型：feat
- 影响范围：前端当前页面上下文构建、后端当前页面上下文提示词生成、相关回归测试
- 变更摘要：
  1) 在前端 `buildAiCurrentPageContext` 中新增 `login` 与 `register` 视图的静态页面上下文，统一传给 AI 助手。
  2) 在后端 `AiCurrentPageContextService` 中新增 `login/register` 页面类型标签，使 AI 能以“登录页 / 注册页”的语义组织回答。
  3) 为前端页面上下文构建与后端页面上下文服务补充回归测试，覆盖 `/login`、`/register` 的解释链路。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/aiCurrentPageContext.js`
  - `SanguiBlog-front/src/appfull/aiCurrentPageContext.test.js`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiCurrentPageContextService.java`
  - `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiCurrentPageContextServiceTest.java`
- 验证方式：
  - 前端测试：执行 `node src/appfull/aiCurrentPageContext.test.js` 通过
  - 后端测试：执行 `mvn -q "-Dtest=AiCurrentPageContextServiceTest,AiAssistantCapabilityServiceTest" test` 通过
  - 前端构建：执行 `cmd /c npm run build` 通过

## [2026-03-27] 新增 V2.2.4 Release 文档并同步 README 的发布说明
- 背景/需求：用户要求基于当前最新版本 `V2.2.4` 生成 release 文档，用于正式发布；同时要求检查根目录 `README.md` 是否因新增 release 文档而出现过时描述，并在不扩散改动的前提下同步更新。
- 修改类型：docs
- 影响范围：Release 文档目录、根目录 README、AI 变更日志
- 变更摘要：
  1) 新增 `release/V2.2.4.md`，按现有发布说明结构整理版本亮点、主要变更、数据库与接口变更、升级建议、验证建议和注意事项。
  2) 更新 `README.md` 中“发布说明目录”与项目结构里关于 release 文档状态的两处描述，使其与当前已存在的 `V2.2.4` 发布文档保持一致。
  3) 保持 README 其余内容不变，只修正因新增 release 文档而变旧的表述。
- 涉及文件：
  - `release/V2.2.4.md`
  - `README.md`
- 验证方式：
  - 静态检查：确认 `release/V2.2.4.md` 已创建且 README 中 release 状态描述已同步
  - 前端构建：执行 `cmd /c npm run build`

## [2026-03-27] 升级站点版本号到 V2.2.4 并同步首页与 README 说明
- 背景/需求：用户要求将项目版本从 `V2.2.3` 更新到 `V2.2.4`，不新增 release 文档，只需要同步首页版本展示，并检查根目录 `README.md` 中是否存在过时内容后做最小更新。
- 修改类型：chore
- 影响范围：站点版本元信息、首页版本展示、根目录 README、AI 变更日志
- 变更摘要：
  1) 将后端配置中的 `site.version` 从 `V2.2.3` 升级到 `V2.2.4`，作为站点统一版本来源。
  2) 将首页 `HomeView` 中的前端兜底版本同步到 `V2.2.4`，避免接口元信息缺失时仍显示旧版本。
  3) 检查并更新根目录 `README.md` 中与当前版本直接相关的过时描述，保持其余内容不变。
- 涉及文件：
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `SanguiBlog-front/src/appfull/public/HomeView.jsx`
  - `README.md`
- 验证方式：
  - 检索确认版本引用已同步为 `V2.2.4`
  - 前端构建：执行 `cmd /c npm run build`

## [2026-03-27] 修复注册页对部分 PNG 头像预览静默失败的问题
- 背景/需求：用户反馈某些 PNG 头像始终无法在注册页预览，而另一些 PNG 可以显示；现象与图片黑白配色无稳定对应，怀疑是预览链路对部分 PNG 编码变体兼容性不足。
- 修改类型：fix
- 影响范围：前端注册页 Step2 头像本地预览链路
- 变更摘要：
  1) 在头像预览展示前增加图片可加载探测，避免浏览器解码失败时静默无反馈。
  2) 预览链路优先尝试 `blob:` Object URL，失败后回退到 Data URL，提高对不同 PNG 编码变体的兼容性。
  3) 为预览图增加 `onError` 明确报错，不再出现“其实失败了但页面没有提示”的情况。
  4) 将头像预览改为更显眼的 `object-contain` 展示，并加入棋盘底纹，增强透明图、LOGO 图的可见性。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/RegisterView.jsx`
- 验证方式：
  - 构建：执行 `cmd /c npm run build` 通过。

## [2026-03-27] 重做注册页头像本地预览展示并移除文件名提示
- 背景/需求：用户反馈 Step2 选择头像后依然看不到头像，且明确不希望显示“本地预览：xxx.xxx”这类文件名提示。
- 修改类型：fix
- 影响范围：前端注册页 Step2 头像选择与预览展示
- 变更摘要：
  1) 将头像本地预览逻辑统一改为 `FileReader` 读取 Data URL，确保选择文件后可立即展示预览。
  2) 将原本较小的头像预览框放大为更显眼的预览区域，减少“其实已选中但看不出来”的问题。
  3) 移除文件名提示，改为仅保留简短说明文案。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/RegisterView.jsx`
- 验证方式：
  - 构建：执行 `cmd /c npm run build` 通过。

## [2026-03-27] 注册页在 Step1 通过后隐藏验证区并调整返回文案
- 背景/需求：用户要求当 Step1 邀请码验证成功后，页面不要继续显示原 Step1 区块；同时希望 Step2 中的“重新验证”按钮改为“返回重新验证”。
- 修改类型：fix
- 影响范围：前端注册页两步式流程显示逻辑
- 变更摘要：
  1) Step1 验证成功后，整个 Step1 验证卡片直接隐藏，页面只保留 Step2 注册表单。
  2) Step2 底部按钮文案由“重新验证”调整为“返回重新验证”。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/RegisterView.jsx`
- 验证方式：
  - 构建：执行 `cmd /c npm run build` 通过。

## [2026-03-27] 调整注册页邀请码验证按钮的冷却态样式与禁用行为
- 背景/需求：用户要求在注册页邀请码验证冷却期间，让按钮本身不可点击，且颜色需要和正常可点击状态明显不同，避免误导。
- 修改类型：fix
- 影响范围：前端注册页 Step1 邀请码验证按钮样式与交互
- 变更摘要：
  1) 当邀请码验证仍处于冷却中时，验证按钮改为 `disabled`，彻底禁止再次点击。
  2) 冷却期间按钮切换为灰色禁用态，并增加 `cursor-not-allowed`，与正常黑色主按钮形成明显区分。
  3) 按钮文案在冷却时直接显示 `冷却中 Xs`，与外侧倒计时提示保持一致。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/RegisterView.jsx`
- 验证方式：
  - 构建：执行 `cmd /c npm run build` 通过。

## [2026-03-27] 优化注册页 Step1 冷却提示并持久化后台最近邀请码结果
- 背景/需求：用户反馈注册页邀请码验证失败后的冷却提示像“不可点击的按钮”，且红色提示和倒计时都不会动态变化；同时希望 Step1 排版更简洁、文案更少，并要求后台 `/admin/settings` 中“最近生成结果”在刷新页面后仍然保留。
- 修改类型：fix / feat
- 影响范围：前端注册页交互、后台系统设置页邀请码展示、后端邀请码读取接口
- 变更摘要：
  1) 重做注册页 Step1 布局，去掉原先偏重的侧边说明区，改成更轻量的单卡片验证入口。
  2) 将邀请码验证冷却提示改为真实倒计时，红色错误提示与“可再次验证”文案都会按秒动态更新，不再显示成类似按钮的静态块。
  3) 新增后台接口 `/api/admin/registration-invites/latest`，用于读取最近一次生成的邀请码结果。
  4) 管理端系统设置页加载时主动读取最近邀请码，因此刷新页面后仍能看到最近生成结果，不再只是前端内存态。
- 涉及文件：
  - `SanguiBlog-front/src/api.js`
  - `SanguiBlog-front/src/appfull/AdminPanel.jsx`
  - `SanguiBlog-front/src/appfull/public/RegisterView.jsx`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AdminRegistrationInviteController.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/repository/RegistrationInviteRepository.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/RegistrationInviteService.java`
  - `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/RegistrationInviteServiceTest.java`
- 验证方式：
  - 测试：执行 `mvn -q "-Dtest=RegistrationInviteServiceTest,PublicRegistrationServiceTest" test` 通过。
  - 构建：执行 `cmd /c npm run build` 通过。

## [2026-03-24] 新增超级管理员注册邀请码生成与公开注册后端闭环
- 背景/需求：用户要求在 `/admin/settings` 增加超级管理员专用的邀请码生成功能，支持默认 5 分钟以及 1 小时、1 天、10 天等时效选项；生成后自动复制邀请码到剪贴板，并让新用户可在有效期内通过邀请码完成注册。
- 修改类型：feat
- 影响范围：后台系统设置页、公开注册接口、公开邀请码校验接口、邀请码持久化表结构、注册头像存储复用
- 变更摘要：
  1) 新增 `registration_invites` 实体、仓库、服务和数据库表，支持邀请码生成、过期校验、一次性消费与消费人记录。
  2) 新增超级管理员接口 `/api/admin/registration-invites`，仅 `SUPER_ADMIN` 可创建邀请码，默认时效为 5 分钟，并支持更多可选时效。
  3) 新增公开接口 `/api/auth/register/invite/verify` 与 `/api/auth/register`，前者负责校验邀请码是否存在且未过期，后者以 `multipart/form-data` 完成匿名注册与头像上传。
  4) 抽出 `AvatarStorageService` 复用头像文件校验与存储逻辑，避免匿名注册另起一套不一致的上传规则。
  5) 在 `/admin/settings` 新增“注册邀请码”分组，支持选择时效、弹出确认框、生成后自动复制邀请码，并展示最近一次生成结果。
  6) 将前台注册页接到真实后端接口，邀请码验证通过后可直接提交真实注册请求。
- 涉及文件：
  - `SanguiBlog-front/src/api.js`
  - `SanguiBlog-front/src/appfull/AdminPanel.jsx`
  - `SanguiBlog-front/src/appfull/public/RegisterView.jsx`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/SecurityConfig.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AuthController.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AdminRegistrationInviteController.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/UploadController.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminRegistrationInviteCreateRequest.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminRegistrationInviteDto.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/PublicRegistrationInviteVerifyDto.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/PublicRegistrationInviteVerifyRequest.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/PublicRegistrationRequest.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/entity/RegistrationInvite.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/repository/RegistrationInviteRepository.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AvatarStorageService.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PublicRegistrationService.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/RegistrationInviteService.java`
  - `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/PublicRegistrationServiceTest.java`
  - `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/RegistrationInviteServiceTest.java`
  - `sanguiblog_db.sql`
- 检索与复用策略：
  - 检索关键词：`/admin/settings` / `site_settings` / `admin/users` / `upload/avatar` / `register` / `captcha`
  - 找到的候选点：系统设置页现有分组选项卡、后台用户创建逻辑、现有头像上传控制器、AI 设置保存模式
  - 最终选择：复用系统设置页现有通知与确认框交互、复用后台用户字段语义和头像存储规则；不复用 `site_settings` 保存邀请码，而是新建专用表以支持过期、一人一码、审计与消费锁定
- 风险点：
  - 当前仅做了前端 5 秒邀请码验证冷却与头像选择冷却，真正的验证码式限流仍建议后续在服务端补齐。
  - 注册成功后当前默认跳回登录页，不自动登录；若后续要改成自动登录，需要单独设计安全策略。
- 验证方式：
  - 测试：执行 `mvn -q "-Dtest=RegistrationInviteServiceTest,PublicRegistrationServiceTest" test` 通过。
  - 构建：待前端构建与后端编译一并验证。

## [2026-03-24] 新增邀请码注册页入口与前端校验骨架
- 背景/需求：用户要求为博客增加邀请码注册流程，并明确本轮先完成注册页面绘制，不做超级管理员端的邀请码生成页面；同时要求入口位于 `/login`，注册页需先校验邀请码，再解锁五项注册信息表单。
- 修改类型：feat
- 影响范围：前端登录页入口、前端注册页路由与交互、前端注册字段校验工具
- 变更摘要：
  1) 新增 `/register` 路由与页面壳，并在 `AppFull` 中接入 `register` 视图与标题切换。
  2) 登录页底部新增“使用邀请码注册新用户”入口，直接跳转到注册页。
  3) 新增 `RegisterView`，按“先验证邀请码、再填写注册信息”组织 UI；邀请码区加入 5 秒前端冷却提示，头像选择加入 3 秒前端冷却提示。
  4) 新增注册表单前端校验工具，覆盖邀请码格式、头像类型与大小、用户名 ASCII 限制、显示名称长度、密码长度与确认密码一致性。
  5) 预留 `verifyRegistrationInvite` / `registerWithInvite` 前端 API 调用位；当前若后端尚未接入，会向页面返回明确提示，不伪造成功流程。
- 涉及文件：
  - `SanguiBlog-front/src/App.jsx`
  - `SanguiBlog-front/src/AppFull.jsx`
  - `SanguiBlog-front/src/api.js`
  - `SanguiBlog-front/src/pages/Register.jsx`
  - `SanguiBlog-front/src/pages/viewNavigation.js`
  - `SanguiBlog-front/src/appfull/public/LoginView.jsx`
  - `SanguiBlog-front/src/appfull/public/RegisterView.jsx`
  - `SanguiBlog-front/src/appfull/public/registerValidation.js`
  - `SanguiBlog-front/src/appfull/public/registerValidation.test.js`
- 检索与复用策略：
  - 检索关键词：`/login` / `admin/users` / `upload/avatar` / `captcha` / `register`
  - 找到的候选点：现有登录页验证码逻辑、后台用户管理页用户创建表单、现有头像上传接口
  - 最终选择：复用现有登录页的 ASCII 输入约束思路与后台用户表单的字段语义，但不复用当前登录后专用的头像上传链路，也不提前新增第二套后台邀请码生成 UI
- 风险点：
  - 当前只完成前端页面与校验骨架，后端邀请码验证/注册接口尚未接入时，页面会给出明确提示而不会真正完成注册。
  - 匿名注册流的头像最终应走“公开上传限流”或“注册接口 multipart”二选一，本轮尚未落定，故当前仅做本地文件预览与前端校验。
- 验证方式：
  - 测试：执行 `node src/appfull/public/registerValidation.test.js`。
  - 构建：执行 `cmd /c npm run build` 通过。

## [2026-03-24] 后台 AI 管理页纳入未登录访客会话并显示会话起始 IP/异常 IP
- 背景/需求：用户反馈 `/admin/ai-management` 目前只能看到已登录用户的 AI 会话，看不到未登录访客；同时希望超级管理员可按“已登录/未登录”筛选，并把访客会话原本显示昵称/身份的位置改为“此次会话开始时的 IP + 访客”，若同一会话后续请求 IP 变化则标记异常。
- 修改类型：feat
- 影响范围：AI 聊天会话持久化、后台 AI 审计 DTO/页面、访客当前临时会话复用
- 变更摘要：
  1) 扩展现有 `ai_chat_sessions`，允许 `user_id` 为空，并新增 `guest_visitor_id`、`session_start_ip`、`latest_ip`、`ip_changed`、`ip_changed_at` 字段；不新增第二套访客审计表。
  2) AI 聊天主链调整为：未登录访客首次提问时自动创建会话并落库，后续同一临时会话复用 `sessionId`；每次访客提问都会更新最新 IP，并在偏离会话起始 IP 时标记异常。
  3) 后台 `/api/admin/ai-chat/sessions` / 详情 DTO 新增访客标识、起始 IP、当前 IP、IP 异常状态字段，超级管理员可以直接看到访客会话。
  4) `/admin/ai-management` 新增“全部身份 / 已登录 / 未登录”筛选；访客卡片与详情头部改为显示“起始 IP · 访客”，IP 变化时展示红色异常提示与异常状态胶囊。
  5) 前台访客模式仍不开放历史会话 UI，但当前临时对话会复用后端返回的 `sessionId`，确保后台审计能把同一访客会话串起来。
  6) 访客会话不再显示为“用户侧可见”：新建/更新访客会话时统一标记 `user_visible=false`，后台文案改为“访客临时会话”，并将访客记录归入“已隐藏”筛选语义。
- 涉及文件：
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/entity/AiChatSession.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/repository/AiChatSessionRepository.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AdminAiChatSessionDto.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiChatService.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AdminAiChatAuditService.java`
  - `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AdminAiChatAuditServiceTest.java`
  - `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiChatServiceTest.java`
  - `SanguiBlog-front/src/appfull/AdminPanel.jsx`
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
  - `sanguiblog_db.sql`
- 检索与复用策略：
  - 检索关键词：`AdminAiChatAuditService` / `ai-management` / `AiGuestAccessService` / `ai_chat_sessions` / `visitor` / `ip`
  - 找到的候选点：现有 AI 审计接口与页面、现有访客准入服务、现有 `ai_chat_sessions / ai_chat_messages` 持久化链路
  - 最终选择：复用现有 AI 会话表与后台管理页，只扩展现有会话模型和 DTO，不新增访客专用聊天表或第二套后台接口
- 风险点：
  - 现有数据库需手动执行 `sanguiblog_db.sql` 中新增字段变更，尤其是 `ai_chat_sessions.user_id` 允许为空与访客/IP 新字段。
  - 访客前台仍保持“无历史会话列表”的产品策略，本次只补后台审计能力与当前临时会话复用。
- 验证方式：
  - 测试：执行 `mvn -q "-Dtest=AdminAiChatAuditServiceTest,AiChatServiceTest" test` 通过。
  - 构建：执行 `cmd /c npm run build` 通过。

## [2026-03-23] 将 AI 站内文章推荐回复改为可点击的完整站点链接
- 背景/需求：用户反馈 AI 在推荐站内已发布文章时返回的是相对路径，例如 `/article/213`，期望直接给出可点击的完整链接，并带上站点域名。
- 修改类型：fix
- 影响范围：AI 推荐文章回复文案、最新文章直答文案
- 变更摘要：
  1) 为 `AiAssistantCapabilityService` 增加站点绝对链接拼接逻辑，统一基于 `site.base-url` 输出文章完整地址。
  2) “站内候选文章推荐”改为返回 `https://.../article/{id}` 形式的绝对链接。
  3) “最新发布的文章是什么”这类直答中的文章链接也同步改为绝对链接。
- 涉及文件：
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiAssistantCapabilityService.java`
  - `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiAssistantCapabilityServiceTest.java`
- 检索与复用策略：
  - 检索关键词：`site.base-url` / `/article/` / `文章链接`
  - 找到的候选点：`application-local.yaml` 中的 `site.base-url`、`SitemapService` 的 base-url 逻辑、能力层里现有相对路径拼接
  - 最终选择：复用现有站点基地址配置，不新增新配置项
- 风险点：
  - 如果运行环境未显式配置 `site.base-url`，会回退到默认值 `https://www.sangui.top`。
- 验证方式：
  - 测试：执行 `cmd /c mvn -q "-Dtest=AiAssistantCapabilityServiceTest" test` 通过。
  - 自检：执行 `git diff --check` 通过。

## [2026-03-23] 修复 AI 站内文章检索把“JVM的已发布”当作关键词的问题
- 背景/需求：用户提问“给我一篇JVM的已发布的博客”时，AI 不再报错，但会把“JVM的已发布”整体当作检索词，导致误判为站内无结果。
- 修改类型：fix
- 影响范围：AI 站内文章关键词提取与归一化
- 变更摘要：
  1) 为 `AiAssistantCapabilityService.extractLookupKeyword(...)` 增加关键词归一化步骤。
  2) 自动剥离“已发布 / 站内 / 博客 / 博文 / 文章”等尾部噪音词，保留核心主题词，例如把“JVM的已发布的博客”归一为 `JVM`。
  3) 新增回归测试，锁定“给我一篇JVM的已发布的博客”必须命中 `JVM` 相关文章。
- 涉及文件：
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiAssistantCapabilityService.java`
  - `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiAssistantCapabilityServiceTest.java`
- 检索与复用策略：
  - 检索关键词：`extractLookupKeyword` / `TOPIC_AFTER_ARTICLE_PATTERN` / `JVM的已发布`
  - 找到的候选点：现有关键词正则、ASCII 兜底提取、站内文章候选查询
  - 最终选择：不改主链与查询，只补关键词归一化
- 风险点：
  - 当前归一化主要清洗尾部业务噪音词，若用户用更复杂自然语序，后续仍可继续补规则。
- 验证方式：
  - 测试：执行 `cmd /c mvn -q "-Dtest=AiAssistantCapabilityServiceTest" test` 通过。
  - 自检：执行 `git diff --check` 通过。

## [2026-03-23] 修复 AI 站内文章优先检索触发的 MySQL DISTINCT 排序报错
- 背景/需求：用户在提问“给我一篇 JVM 的已发布博客”时，AI 返回“AI 服务暂时不可用”，后端定位到 `searchPublishedCandidates(...)` 生成的 SQL 因 `DISTINCT + ORDER BY tags 列` 在 MySQL 上不兼容而报错。
- 修改类型：fix
- 影响范围：AI 站内文章优先检索、后端文章候选查询 SQL
- 变更摘要：
  1) 确认根因是 `PostRepository.searchPublishedCandidates(...)` 使用 `left join p.tags t + distinct` 后，又按 `t.name` 参与排序，Hibernate 生成的 SQL 被 MySQL 拒绝。
  2) 将查询改为 `exists` 子查询判断标签是否命中，避免再生成 `distinct` 依赖的标签排序列。
  3) 保留原有排序语义：标题命中优先、标签命中次优、摘要命中再次，然后按发布时间倒序。
  4) 现有 AI 能力回归测试继续通过，确认未破坏原本的站点页面语义与当前页面上下文能力。
- 涉及文件：
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/repository/PostRepository.java`
- 检索与复用策略：
  - 检索关键词：`searchPublishedCandidates` / `distinct` / `order by` / `tags` / `exists`
  - 找到的候选点：新增文章候选查询本身、`AiAssistantCapabilityService` 调用链、用户提供的 MySQL 报错 SQL
  - 最终选择：只修查询实现，不改 AI 主链和接口契约
- 风险点：
  - 当前仍未做正文全文匹配，主题词若只存在正文中，仍需依赖后续 RAG 兜底。
- 验证方式：
  - 测试：执行 `cmd /c mvn -q "-Dtest=AiAssistantCapabilityServiceTest,AiCurrentPageContextServiceTest" test` 通过。
  - 自检：执行 `git diff --check` 通过。

## [2026-03-23] 让 AI 优先推荐站内已发布文章并补齐站点页面语义
- 背景/需求：用户反馈 AI 在被要求“给我一篇关于 JVM 的站内文章”时，会直接自己写一篇新博客，而不是优先去站内找已有文章；同时 AI 对 `/sitemap.xml`、`/tools`、`/archive`、`/about` 等站点页面语义掌握不足。
- 修改类型：feat
- 影响范围：AI 能力直答层、文章检索优先策略、当前页面上下文、最小回归测试
- 变更摘要：
  1) 为 `AiAssistantCapabilityService` 增加“站内已有文章优先检索”能力，命中“给我一篇/找一篇/推荐一篇/有没有写过”等问法时，会先查已发布文章候选并返回站内链接，而不是让模型直接现写。
  2) 为 AI 能力层补充 `/sitemap.xml` 与核心页面语义说明，能直接回答首页、归档页、关于页、工具页和文章详情页分别是什么。
  3) 为 `AiCurrentPageContext` 前后端链路补充首页、归档页、关于页、工具页上下文，不再只在 `/article/:id` 下可用。
  4) 新增/重写定向测试，覆盖“站内文章优先推荐”“站点页面说明”和“非文章页当前页面上下文”。
- 涉及文件：
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiAssistantCapabilityService.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiCurrentPageContextService.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/repository/PostRepository.java`
  - `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiAssistantCapabilityServiceTest.java`
  - `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiCurrentPageContextServiceTest.java`
  - `SanguiBlog-front/src/appfull/aiCurrentPageContext.js`
  - `SanguiBlog-front/src/appfull/aiCurrentPageContext.test.js`
  - `SanguiBlog-front/src/AppFull.jsx`
- 检索与复用策略：
  - 检索关键词：`AiChatService` / `AiAssistantCapabilityService` / `AiCurrentPageContextService` / `AiBlogRagService` / `SitemapService` / `/sitemap.xml`
  - 找到的候选点：现有系统事实层、当前文章页上下文、站点地图服务、博客 RAG 检索
  - 最终选择：在现有能力层上补“结构化站内文章优先查找 + 站点页面说明 + 非文章页当前上下文”，不新增第二套 AI 接口或第二套知识检索实现
- 风险点：
  - 文章优先检索当前基于标题/摘要/slug/标签关键词匹配，若文章主题词只存在正文中而标题摘要标签都未体现，仍可能落回后续 RAG 或普通问答。
  - 当前页面上下文对首页/归档/关于/工具页使用的是站内语义摘要，不是实时抓取页面 DOM。
- 验证方式：
  - 测试：执行 `node src/appfull/aiCurrentPageContext.test.js` 通过。
  - 测试：执行 `cmd /c mvn -q "-Dtest=AiAssistantCapabilityServiceTest,AiCurrentPageContextServiceTest" test` 通过。
  - 自检：执行 `git diff --check` 通过。

## [2026-03-23] 升级站点版本号到 V2.2.3 并同步 README
- 背景/需求：用户要求将当前项目版本号从 `V2.2.1` 更新到 `V2.2.3`，不生成 release 文档，只更新首页版本展示，并检查根目录 `README.md` 中是否存在过时版本说明。
- 修改类型：docs
- 影响范围：首页版本展示、后端站点元信息、根目录 README
- 变更摘要：
  1) 后端 `site.version` 从 `V2.2.1` 更新为 `V2.2.3`。
  2) 首页 `HomeView` 的前端兜底版本同步更新为 `V2.2.3`。
  3) `README.md` 中当前站点版本号与 AI 助理能力说明中的旧版本表述同步更新为 `V2.2.3`。
  4) `README.md` 中关于未单独生成 release 文档的说明同步改为 `V2.2.3`，其余内容保持不变。
- 涉及文件：
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `SanguiBlog-front/src/appfull/public/HomeView.jsx`
  - `README.md`
- 检索与复用策略：
  - 检索关键词：`V2.2.1` / `site.version` / `meta?.version` / `README`
  - 找到的旧实现：首页版本统一读取后端 `site.version`，前端 `HomeView` 保留兜底版本；README 顶部与 AI 助理章节维护当前版本说明
  - 最终选择：仅同步首页版本来源与 README 中明确过时的版本描述，不生成/更新 release 文档
- 风险点：
  - 本次只同步用户明确要求的首页版本与 README 过时文本，不涉及其他文档或发布说明文件。
- 验证方式：
  - 静态：检索 `V2.2.1` 已不再出现在首页版本来源文件与 `README.md` 的当前版本说明中。

## [2026-03-23] 去除 AI 聊天页代码块外层黑色投影
- 背景/需求：用户要求 AI 聊天页中的 Markdown 代码块继续保留语言标签与复制按钮，但不要复用文章页那种右侧和下侧黑色投影。
- 修改类型：fix
- 影响范围：前端 AI Markdown 代码块样式、最小回归测试
- 变更摘要：
  1) 检索确认阴影来自共享组件 `MarkdownCodeBlock` 的最外层容器样式。
  2) 为共享代码块组件增加 `showShadow` 开关，默认仍保留阴影，避免影响其他复用场景。
  3) AI Markdown 渲染调用共享组件时显式传入 `showShadow: false`，仅 AI 聊天页去掉外层黑色投影。
  4) 回归测试新增断言，确保 AI Markdown 输出中不再包含该阴影类名。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/MarkdownCodeBlock.js`
  - `SanguiBlog-front/src/appfull/ui/AiMessageMarkdown.js`
  - `SanguiBlog-front/src/appfull/ui/AiMessageMarkdown.test.js`
- 检索与复用策略：
  - 检索关键词：`shadow-[6px_6px_0px_0px_#000]` / `MarkdownCodeBlock` / `AiMessageMarkdown`
  - 找到的候选点：共享组件阴影类、AI Markdown 调用点、AI Markdown 测试
  - 最终选择：复用现有共享组件并加细粒度样式开关，不回退到单独写一份 AI 专用代码块组件
- 风险点：
  - 文章页/关于页若未来接入共享组件，默认仍会保留原阴影；本次只修改 AI 聊天页表现。
- 验证方式：
  - 测试：执行 `node src/appfull/ui/AiMessageMarkdown.test.js` 通过。
  - 测试：执行 `node src/appfull/ui/AiAssistantWidget.test.js` 通过。

## [2026-03-23] 为 AI 回复 Markdown 代码块增加语言标签与一键复制
- 背景/需求：用户要求 AI 回复中的 Markdown 代码块增加语言类型显示与一键复制按钮，点击后复制代码到剪切板，并给出轻量成功提示，整体 UI 需要与站内现有代码块风格协调。
- 修改类型：feat
- 影响范围：前端 AI Markdown 渲染、代码块交互组件、最小回归测试
- 变更摘要：
  1) 检索并确认站内已有文章详情页、关于页两套代码块复制交互，可复用其“语言标签 + 复制按钮 + 轻提示”的视觉语义。
  2) 为 AI Markdown 新增共享代码块组件 `MarkdownCodeBlock`，统一负责语言标签识别、复制按钮、复制成功/失败轻提示与代码块容器样式。
  3) `AiMessageMarkdown` 的 fenced code block 渲染改为接入共享代码块组件；行内代码保持原有轻量样式，不受影响。
  4) 新增 AI Markdown 渲染最小回归测试，覆盖标题、列表、加粗、行内代码、代码块语言标签与复制按钮结构。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/AiMessageMarkdown.js`
  - `SanguiBlog-front/src/appfull/ui/MarkdownCodeBlock.js`
  - `SanguiBlog-front/src/appfull/ui/AiMessageMarkdown.test.js`
- 检索与复用策略：
  - 检索关键词：`AiMessageMarkdown` / `navigator.clipboard` / `复制代码` / `language-`
  - 找到的候选点：`AiMessageMarkdown.js`、`ArticleDetail.jsx` 内本地 `CodeBlockWithCopy`、`AboutView.jsx` 内本地 `CodeBlockWithCopy`
  - 最终选择：不新增接口，不在 AI 组件里单独再写一套复制逻辑，而是抽共享代码块组件供 AI Markdown 复用，避免形成第三套重复实现
- 风险点：
  - 文章详情页和关于页目前仍保留各自本地代码块实现，本次未继续扩大重构范围；后续若要彻底消除重复，可再统一切换到共享组件。
- 验证方式：
  - 测试：执行 `node src/appfull/ui/AiMessageMarkdown.test.js` 通过。

## [2026-03-23] 修复 AI 聊天页 Beta 标签中文乱码
- 背景/需求：用户反馈 AI 聊天页头部状态标签显示为 `Beta娴嬭瘯`，期望恢复为正常中文 `Beta 测试版`。
- 修改类型：fix
- 影响范围：前端 AI 助手头部状态文案、最小回归测试
- 变更摘要：
  1) 定位到乱码来源为 `AiAssistantWidget.jsx` 内部硬编码文案，而非后端接口或站点配置返回值。
  2) 将该标签文案从 `Beta娴嬭瘯` 修正为 `Beta 测试版`。
  3) 新增最小回归测试，断言组件源码中必须包含正确文案，且不再包含旧乱码文本。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.test.js`
- 检索与复用策略：
  - 检索关键词：`Beta娴嬭瘯` / `Beta 测试版` / `AiAssistantWidget` / `welcomeMessage`
  - 找到的候选点：`AiAssistantWidget.jsx` 头部状态标签、`aiAssistantConfig.js` 默认配置、`AiAssistantSettingService.java` 站点配置服务
  - 最终选择：复用现有 AI 组件，仅做单点文案修复；不新增接口、不改配置结构，避免把一次文案修复扩大成编码重构
- 风险点：
  - 当前前后端仍存在其他历史乱码文本，但本次未一并清理，以保持改动最小化并聚焦用户明确指定的问题。
- 验证方式：
  - 测试：执行 `node src/appfull/ui/AiAssistantWidget.test.js` 通过。

## [2026-03-17] AI 聊天支持恢复历史消息列表
- 背景/需求：用户要求在已接入 JDBC 持久化记忆的基础上，打开 AI 面板时能够恢复当前会话的历史消息列表，而不只是让模型“记住上下文”。
- 修改类型：feat
- 影响范围：后端 AI 历史查询接口、前端 AI 面板初始化恢复逻辑、权限放行
- 变更摘要：
  1) 后端新增 `GET /api/ai/chat/history?conversationId=...`，直接从 `ChatMemory` 读取当前会话消息。
  2) 历史消息仅返回用户与助手消息，过滤 system/tool 消息，避免把内部提示词暴露到前端。
  3) 前端 AI 面板首次打开时，若当前会话已有历史，则自动恢复并渲染历史消息列表。
  4) 新接口已加入安全白名单，前台访客可直接读取自己当前会话的历史消息。
- 涉及文件：
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AiChatHistoryResponse.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AiChatController.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiChatService.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/SecurityConfig.java`
  - `SanguiBlog-front/src/api.js`
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
- 检索与复用策略：
  - 检索关键词：`ChatMemory.get` / `MessageType` / `AiAssistantWidget`
  - 找到的可复用能力：现有 JDBC ChatMemory 已经保存消息，无需再新建历史表
  - 最终选择：直接在现有 ChatMemory 之上补“读取历史”接口，而不是复制一份聊天记录到新表
- 风险点：
  - 当前历史恢复依赖 `localStorage` 中的 `sg_ai_conversation_id`；如果用户主动清空本地存储，会视为新会话。
  - 当前没有“新建会话/清空历史”入口，默认会持续恢复同一会话。
- 验证方式：
  - 编译：执行 `mvn -q -DskipTests compile` 通过。
  - 测试：执行 `node src/appfull/aiAssistantConfig.test.js` 通过。
  - 测试：执行 `node src/appfull/aiConversation.test.js` 通过。
  - 构建：执行 `npm run build` 通过。

## [2026-03-17] 接入 JDBC 持久化聊天记忆，支持多轮上下文
- 背景/需求：用户要求当前 AI 聊天从“一问一答”升级为具备上下文记忆，并明确采用 JDBC 持久化方案。
- 修改类型：feat
- 影响范围：后端 AI 聊天接口、Spring AI ChatMemory 配置、前端 AI 会话 ID 持久化、请求参数结构
- 变更摘要：
  1) 后端新增 `spring-ai-starter-model-chat-memory-repository-jdbc` 依赖，并启用 JDBC Chat Memory schema 初始化。
  2) 新增 `AiChatMemoryConfig`，基于 `MessageWindowChatMemory` + `ChatMemoryRepository` 配置多轮上下文窗口，默认保留最近 16 条消息。
  3) `AiChatRequest` 新增 `conversationId`，`AiChatService` 改为通过 `MessageChatMemoryAdvisor` 按会话 ID 调用模型，返回模式标记为 `CHAT_MEMORY_JDBC`。
  4) 前端新增 `aiConversation.js`，使用 `localStorage: sg_ai_conversation_id` 持久化会话 ID，并在每次 `/api/ai/chat` 请求中携带。
  5) 当前实现只持久化模型上下文记忆，不会在页面刷新后自动回放历史聊天 UI。
- 涉及文件：
  - `SanguiBlog-server/pom.xml`
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/AiChatMemoryConfig.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AiChatRequest.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AiChatController.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiChatService.java`
  - `SanguiBlog-front/src/api.js`
  - `SanguiBlog-front/src/appfull/aiConversation.js`
  - `SanguiBlog-front/src/appfull/aiConversation.test.js`
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
- 检索与复用策略：
  - 检索关键词：`AiChatService` / `conversationId` / `ChatMemory` / `JdbcChatMemoryRepository`
  - 找到的旧实现：现有 `/api/ai/chat` 为单轮 `system + user` 模式，无会话 ID，无 ChatMemory
  - 最终选择：复用现有接口与 AI 面板，在原链路上最小增量接入 Spring AI JDBC 持久化记忆，而不是新建第二套聊天接口
- 风险点：
  - `application.yaml` 当前设置为 `spring.ai.chat.memory.repository.jdbc.initialize-schema=always`，首次启动需要数据库账号具备建表权限。
  - 当前前端不会自动加载旧消息历史，只是模型层会记住上下文。
- 验证方式：
  - 测试：执行 `mvn -q -Dtest=AiAssistantSettingServiceTest test` 通过。
  - 编译：执行 `mvn -q -DskipTests compile` 通过。
  - 测试：执行 `node src/appfull/aiAssistantConfig.test.js` 通过。
  - 测试：执行 `node src/appfull/aiConversation.test.js` 通过。
  - 构建：执行 `npm run build` 通过。

## [2026-03-17] AI 助手图标改为支持自定义图片
- 背景/需求：用户要求移除当前较丑的默认机器人图标，改为自定义图片 Logo，并明确图片应放置的位置与命名规则。
- 修改类型：fix
- 影响范围：前端 AI 助手图标、空会话欢迎页图标、右下角入口图标、前端静态资源约定
- 变更摘要：
  1) AI 助手图标统一改为“优先加载自定义图片，失败时回退默认图标”。
  2) 头部图标、欢迎页图标、右下角入口图标三处统一复用同一张自定义图片。
  3) 新增默认资源路径配置：`/static/ai/assistant-logo.png`。
  4) 新增静态资源说明文件，明确放置目录与命名规则。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/aiAssistantConfig.js`
  - `SanguiBlog-front/src/appfull/aiAssistantConfig.test.js`
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
  - `SanguiBlog-front/public/static/ai/README.md`
- 检索与复用策略：
  - 检索关键词：`public/` / `buildAssetUrl` / `ImageWithFallback` / `logo`
  - 找到的可复用资源方式：项目前端已有 `public/static` 目录，适合放固定静态图片
  - 最终选择：不新增上传接口，先用前端静态资源目录承载 AI Logo
- 风险点：
  - 当前只是前端静态资源位。如果你后面想在后台直接上传并切换 AI Logo，再单独接一个配置字段更合理。
- 验证方式：
  - 测试：执行 `node src/appfull/aiAssistantConfig.test.js` 通过。
  - 构建：执行 `npm run build` 通过。

## [2026-03-17] 统一 AI 助手对外名称为“三桂博客AI助理”
- 背景/需求：用户要求 AI 助手名称统一，不再出现“三桂博客 AI 助手”“三桂博客的AI智能助手”等不同口径；标题区域与空会话欢迎页都统一使用“三桂博客AI助理”。
- 修改类型：fix
- 影响范围：前后端 AI 助手默认配置、前端标题展示、欢迎页文案
- 变更摘要：
  1) 后端 `AiAssistantSettingService` 默认标题改为 `三桂博客AI助理`，默认欢迎文案改为 `你好，我是三桂博客AI助理`。
  2) 前端 `aiAssistantConfig` 默认标题与欢迎文案同步为同一口径。
  3) AI 面板头部主标题直接显示 `assistantConfig.title`，副标题改为通用的 `AI 对话`，避免名称冲突。
- 涉及文件：
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiAssistantSettingService.java`
  - `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiAssistantSettingServiceTest.java`
  - `SanguiBlog-front/src/appfull/aiAssistantConfig.js`
  - `SanguiBlog-front/src/appfull/aiAssistantConfig.test.js`
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
- 检索与复用策略：
  - 检索关键词：`三桂博客 AI 助手` / `AI智能助手` / `title` / `welcomeMessage`
  - 根因：前端默认值与后端默认值不一致，且面板头部还保留了一个泛称标题
  - 最终选择：统一保留一个正式名称，其他位置改为功能性文案
- 风险点：
  - 如果数据库 `site_settings` 中已经手动配置了 `ai.chat.title` 或 `ai.chat.welcome_message` 的旧值，运行时仍会以数据库配置为准，需要同步改那两个配置值。
- 验证方式：
  - 测试：执行 `node src/appfull/aiAssistantConfig.test.js` 通过。
  - 测试：执行 `mvn -q -Dtest=AiAssistantSettingServiceTest test` 通过。
  - 构建：执行 `npm run build` 通过。

## [2026-03-17] AI 聊天窗口调整为右侧贯通式直角面板
- 背景/需求：用户要求将当前偏小的 AI 弹窗改为更大的右侧停靠式面板；上边界贴住顶部导航，下边界贴住页面底部；外层边框改为直角，内部输入框、发送按钮和消息气泡继续保持原有圆角样式。
- 修改类型：fix
- 影响范围：前端 AI 助手外层面板布局、开启动画、滚动容器高度分配
- 变更摘要：
  1) AI 窗口从右下角小弹层改为右侧贯通式面板，顶部对齐站点导航高度，底部直接贴到页面底部。
  2) 外层容器去掉圆角，改为直角边框；内部输入区和消息气泡保留原有圆角视觉。
  3) 对话内容区改为 `flex-1` 撑满布局，确保整体高度变化后仍由内容区自身滚动。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
- 检索与复用策略：
  - 检索关键词：`NAVIGATION_HEIGHT` / `headerHeight` / `AiAssistantWidget`
  - 找到的可复用能力：`LayoutOffsetContext` 已提供导航高度，不需要写死顶部偏移像素
  - 最终选择：直接在 AI 组件中接入布局偏移上下文，原位升级为停靠式面板
- 风险点：
  - 当前桌面端固定宽度为 460px；如果你后面觉得仍偏窄或偏宽，可以继续单独调宽度，不需要再改整体结构。
- 验证方式：
  - 构建：执行 `npm run build` 通过。

## [2026-03-17] AI 聊天窗口改为空会话欢迎页，不再默认发送首条 AI 消息
- 背景/需求：用户要求 AI 聊天窗口打开后不要出现默认自我介绍消息；初始状态应是一个居中的欢迎页，这不是 AI 的发言，而是聊天窗口的空会话引导页。
- 修改类型：fix
- 影响范围：前端 AI 助手初始会话态、欢迎文案展示逻辑
- 变更摘要：
  1) 移除 AI 面板初始时自动插入的首条助手消息，空会话状态下 `messages` 默认为空数组。
  2) 当会话为空时，聊天窗口中部改为展示欢迎页：大号标题“你好，我是三桂博客AI助理”，并附加简短引导文案。
  3) 第一次真实问答仍从用户提问开始，随后才插入 AI 的思考中与回复消息。
  4) 顺手清理了 `aiAssistantConfig.js` 与 `AiAssistantWidget.jsx` 中的历史乱码文本，统一为 UTF-8 正常中文。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/aiAssistantConfig.js`
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
- 检索与复用策略：
  - 检索关键词：`welcomeMessage` / `createAssistantMessage` / `messages` / `AiAssistantWidget`
  - 找到的旧实现：AI 面板初始化时会把 `welcomeMessage` 注入为第一条助手消息
  - 最终选择：保留现有配置字段与对话流，只把初始欢迎内容从“消息泡泡”改为“空会话欢迎页”
- 风险点：
  - 目前空会话欢迎页仍复用 `welcomeMessage` 作为主标题文案；如果你后面想把“欢迎页标题”和“AI 欢迎语”拆成两套后台配置，再单独扩展字段更合理。
- 验证方式：
  - 测试：执行 `node src/appfull/aiAssistantConfig.test.js` 通过。
  - 构建：执行 `npm run build` 通过。

## [2026-03-17] 修复 AI 每轮回答重复自我介绍的问题
- 背景/需求：用户反馈在 AI 面板里发问后，模型经常先输出“你好，我是三桂……”这类重复自我介绍，和首屏欢迎语形成重复，影响对话体验。
- 修改类型：fix
- 影响范围：后端 AI 系统提示词约束、站点自定义提示词拼接方式
- 变更摘要：
  1) 重写 `AiAssistantSettingService` 为干净 UTF-8 文本，修复该服务中的历史乱码。
  2) 在默认系统提示词中明确约束：首屏欢迎语只展示一次，后续回答不要重复自我介绍或重复寒暄，除非用户明确要求。
  3) 将 `ai.chat.system_prompt` 的站点自定义规则从“覆盖默认提示词”改为“附加到默认提示词之后”，避免后台自定义配置误覆盖基础行为约束。
- 涉及文件：
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiAssistantSettingService.java`
  - `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiAssistantSettingServiceTest.java`
- 检索与复用策略：
  - 检索关键词：`DEFAULT_SYSTEM_PROMPT` / `ai.chat.system_prompt` / `welcomeMessage`
  - 找到的旧实现：系统提示词完全由 `site_settings` 中的 `ai.chat.system_prompt` 覆盖
  - 最终选择：保留默认基础约束，再拼接站点附加指令，避免重复自我介绍问题再次出现
- 风险点：
  - 如果你数据库里已经配置了 `ai.chat.system_prompt`，它现在会作为附加规则继续生效，而不是覆盖默认规则；这属于有意修正。
- 验证方式：
  - 测试：执行 `mvn -q -Dtest=AiAssistantSettingServiceTest test` 通过。
  - 编译：执行 `mvn -q -DskipTests compile` 通过。

## [2026-03-17] 将通义千问默认模型切换为 qwen-flash
- 背景/需求：用户要求后端 AI 聊天默认使用通义千问的 flash 模型，而不是 `qwen-plus`。
- 修改类型：fix
- 影响范围：后端 AI 聊天默认模型配置
- 变更摘要：
  1) `application.yaml` 中 `AI_DASHSCOPE_CHAT_MODEL` 的默认值由 `qwen-plus` 调整为 `qwen-flash`。
  2) `AiChatService` 中读取模型名的兜底值同步改为 `qwen-flash`，避免配置缺失时接口返回模型名与实际默认值不一致。
- 涉及文件：
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiChatService.java`
- 检索与复用策略：
  - 检索关键词：`qwen-plus` / `spring.ai.dashscope.chat.options.model`
  - 找到的旧实现：默认模型同时存在于配置文件和服务类的 `@Value` 兜底值
  - 最终选择：双点同步修改，避免配置与返回值漂移
- 风险点：
  - 若你在线上环境显式设置了 `AI_DASHSCOPE_CHAT_MODEL`，则仍以环境变量为准，不会被这个默认值覆盖。
- 验证方式：
  - 编译：执行 `mvn -q -DskipTests compile` 通过。

## [2026-03-17] 接入通义千问后端聊天接口并打通前端真实调用
- 背景/需求：用户要求正式接入 `Spring AI + Spring AI Alibaba + 通义千问 API`，先实现最小可用的后端聊天能力；环境变量中的 API Key 由用户后续注入。现阶段不做 RAG，但要为后续知识库增强保留结构。
- 修改类型：feat
- 影响范围：后端 AI 聊天接口、站点 AI 元信息、前端 AI 助手真实请求链路、依赖管理
- 变更摘要：
  1) 后端新增 `spring-ai` 与 `spring-ai-alibaba-dashscope` 依赖，接入通义千问聊天模型。
  2) 新增 `POST /api/ai/chat` 接口，当前采用单轮非流式 `LLM_ONLY` 模式，返回 `reply/model/mode/references` 结构，后续可平滑扩展到 RAG。
  3) 新增 `AiAssistantSettingService`，复用 `site_settings` 读取 `ai.chat.*` 配置，统一管理助手标题、欢迎语、输入占位符、思考提示与系统提示词。
  4) `/api/site/meta` 新增 `aiAssistant` 字段，前端可直接消费后端返回的 AI 展示配置。
  5) 前端 AI 助手从固定占位回复切换为真实调用 `/api/ai/chat`，发送消息后显示“思考中”占位并在响应返回后替换为真实回复。
- 涉及文件：
  - `SanguiBlog-server/pom.xml`
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/config/SecurityConfig.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/AiChatController.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AiChatRequest.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/AiChatResponse.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/SiteMetaDto.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/SiteService.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiAssistantSettingService.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/ai/AiChatService.java`
  - `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/service/ai/AiAssistantSettingServiceTest.java`
  - `SanguiBlog-front/src/api.js`
  - `SanguiBlog-front/src/appfull/aiAssistantConfig.js`
  - `SanguiBlog-front/src/appfull/aiAssistantConfig.test.js`
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
  - `.ai/PROJECT_MEMORY.md`
- 检索与复用策略：
  - 检索关键词：`SiteSettingRepository` / `ApiResponse` / `SecurityConfig` / `meta?.aiAssistant` / `ChatClient`
  - 找到的旧实现：站点元信息由 `/api/site/meta` 统一返回；配置存储已具备 `site_settings`；前端 AI 助手已预留 `meta.aiAssistant` 覆盖点
  - 最终选择：复用 `site_settings` 作为 AI 展示/提示词配置源，复用 `ApiResponse` 与 `GlobalExceptionHandler` 作为统一响应规范，不新增数据库表
- 风险点：
  - 当前依赖通义千问 API Key；未注入 `SPRING_AI_DASHSCOPE_API_KEY` 或 `AI_DASHSCOPE_API_KEY` 时，聊天接口不可用。
  - 当前仍是 `LLM_ONLY`，不会基于站内文章事实做引用回答；后续接 RAG 时可复用当前 `references` 空数组与 `mode` 字段。
- 验证方式：
  - 后端测试：执行 `mvn -q -Dtest=AiAssistantSettingServiceTest test` 通过。
  - 后端编译：执行 `mvn -q -DskipTests compile` 通过。
  - 前端测试：执行 `node src/appfull/aiAssistantConfig.test.js` 通过。
  - 前端构建：执行 `npm run build` 通过。

## [2026-03-17] 统一 AI 输入框与发送按钮盒模型尺寸
- 背景/需求：上一轮虽已改善 AI 输入区，但用户仍反馈底部输入框与发送按钮观感不统一，怀疑是图标导致发送按钮被撑大；需要进一步把二者的外框尺寸完全统一。
- 修改类型：fix
- 影响范围：前端 AI 助手输入区视觉对齐
- 变更摘要：
  1) 输入框外层固定为 `54px` 高度，发送按钮同步固定为 `54px x 54px`，统一底部操作区盒模型。
  2) 将 `textarea` 默认行数收紧为 1 行，并让其在固定高度容器内滚动，减弱“文本域与按钮不是同一套控件”的违和感。
  3) 明确按钮尺寸由固定宽高控制，图标仅负责内容展示，不再影响按钮整体外框观感。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
- 检索与复用策略：
  - 检索关键词：`rows={2}` / `w-14 h-14` / `items-stretch`
  - 找到的旧实现：输入框与发送按钮都在同一布局容器内，可直接在原位统一盒模型
  - 最终选择：不新增样式文件，直接在现有组件内精修尺寸参数
- 风险点：
  - 输入框现在默认展示为更紧凑的一行高度，长文本主要依赖内部滚动；这是为了优先保证输入区整体整齐。
- 验证方式：
  - 构建：执行 `npm run build` 通过。

## [2026-03-17] 对齐 AI 输入区按钮并美化长文本滚动条
- 背景/需求：用户反馈 AI 对话窗口底部输入框与发送按钮在视觉上错落不齐；同时当输入内容过多时，输入框内部原生纵向滚动条过于突兀，需要适配当前站点风格。
- 修改类型：fix
- 影响范围：前端 AI 助手输入区布局、文本输入区滚动条样式
- 变更摘要：
  1) 将输入区容器改为统一拉伸布局，输入框固定为与发送按钮一致的基础高度，避免二者出现上下不平行的错位感。
  2) 输入框改为固定高度 + 内部滚动，长文本不再继续撑高输入区，保持发送按钮位置稳定。
  3) 复用现有 `sg-scrollbar-dark/light` 样式到输入框内部滚动条，统一深浅色主题下的观感。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
- 检索与复用策略：
  - 检索关键词：`textarea` / `items-end` / `sg-scrollbar-dark` / `sg-scrollbar-light`
  - 找到的旧实现：对话消息区已经有深浅色滚动条样式，可直接复用到输入框
  - 最终选择：原位调整输入区布局并复用现有滚动条样式，不新增 CSS 模块
- 风险点：
  - 输入框当前最大高度被限制为 112px，超过后会进入内部滚动；这是为了优先保证底部按钮排版稳定。
- 验证方式：
  - 构建：执行 `npm run build` 通过。

## [2026-03-17] 后台页面隐藏 AI 助手入口
- 背景/需求：用户要求 `/admin` 及其所有子页面不显示前端 AI 助手入口，避免后台管理界面被无关浮窗干扰；本步仍然只改前端。
- 修改类型：fix
- 影响范围：前端全局 AI 助手挂载条件、后台页面视觉干扰控制
- 变更摘要：
  1) 新增 `shouldShowAiAssistant(view)` 纯函数，统一收口 AI 助手在不同视图下的显示规则。
  2) 在 `AppFull.jsx` 的全局挂载点判断当前视图，`view === 'admin'` 时不再渲染 AI 助手组件。
  3) 补充纯函数测试，验证前台视图继续显示、后台视图隐藏。
- 涉及文件：
  - `SanguiBlog-front/src/AppFull.jsx`
  - `SanguiBlog-front/src/appfull/aiAssistantVisibility.js`
  - `SanguiBlog-front/src/appfull/aiAssistantVisibility.test.js`
- 检索与复用策略：
  - 检索关键词：`AiAssistantWidget` / `view === 'admin'` / `/admin/*`
  - 找到的旧实现：AI 助手统一在 `AppFull.jsx` 全局挂载；后台页面统一以 `initialView="admin"` 进入
  - 最终选择：在全局挂载点直接判断 `view`，不把后台判断散落到 AI 组件内部
- 风险点：
  - 当前规则按 `view === 'admin'` 统一隐藏，适用于 `/admin` 与其子页面；如果未来后台拆成新的独立视图标识，需要同步扩展该判断。
- 验证方式：
  - 测试：执行 `node src/appfull/aiAssistantVisibility.test.js` 通过。
  - 构建：执行 `npm run build` 通过。

## [2026-03-17] 修复 AI 打开时根滚动条槽位突兀发白的问题
- 背景/需求：用户反馈打开 AI 对话窗口后，页面右侧滚动条区域会突兀地变成一条发白的带状区域，视觉跳变明显；同时仍需保留“首页不可滚动，仅 AI 面板可滚动”的交互目标。
- 修改类型：fix
- 影响范围：前端 AI 助手打开态的背景交互拦截与滚动锁定方式
- 变更摘要：
  1) 移除基于 `html/body overflow` 的根节点滚动锁方案，避免浏览器根滚动条槽位在打开 AI 时发生突兀变化。
  2) 改为在 AI 面板打开时挂载透明全屏交互拦截层，仅阻断背景页面的滚动与点击，不再改变首页根滚动条外观。
  3) 继续保留 AI 消息区的独立滚动与 `overscrollBehavior: contain`，保证对话窗口内滚动体验不变。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
- 检索与复用策略：
  - 检索关键词：`overflow hidden` / `scrollbar-gutter` / `wheel` / `touchmove`
  - 找到的旧实现：问题集中在 AI 打开态对 `html/body` 的样式接管，无需修改首页布局或系统状态组件
  - 最终选择：原位替换 AI 面板的滚动锁实现，不新增新的弹层系统
- 风险点：
  - AI 打开时右下角浮窗入口会被透明拦截层覆盖，关闭入口以面板右上角关闭按钮为主；如果后续需要恢复点击浮窗再次关闭，可再单独调整层级与点击策略。
- 验证方式：
  - 构建：执行 `npm run build` 通过。

## [2026-03-17] 修复 AI 对话窗口打开后遮挡首页内容与右侧白条问题
- 背景/需求：用户反馈打开 AI 对话窗口后，首页“系统状态”区域看起来消失，且页面右侧出现一条白色条带；同时仍需保留“页面不可滚动、仅 AI 面板可滚动”的交互目标。
- 修改类型：fix
- 影响范围：前端 AI 助手模态交互、页面滚动锁定行为
- 变更摘要：
  1) 移除 AI 打开态的整页半透明遮罩，避免覆盖首页内容造成“系统状态栏没了”的错觉。
  2) 移除滚动锁时对 `body` 追加的右侧补偿，消除右侧白条。
  3) 保留 `body/html` 的滚动锁与 AI 消息区的 `overscrollBehavior: contain`，继续保证仅 AI 面板自身可滚动。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
- 检索与复用策略：
  - 检索关键词：`overflow = 'hidden'` / `paddingRight` / `bg-black/16` / `sticky z-40`
  - 找到的旧实现：问题根因均集中在 AI 组件打开态逻辑，无需修改首页或系统状态组件
  - 最终选择：原位收敛 AI 打开态副作用，不改首页结构
- 风险点：
  - 当前不再支持点击整页遮罩关闭 AI 面板；关闭方式保留为右上角关闭按钮与再次点击浮窗入口。
- 验证方式：
  - 构建：执行 `npm run build` 通过。
  - 手动：打开 AI 窗口后首页内容仍可见，页面右侧不再出现白条，AI 面板自身可滚动。

## [2026-03-17] 新增前端版 AI 助手右下角浮窗与预览对话面板
- 背景/需求：用户要求先在前端实现一个醒目的 AI 助手入口，采用右下角浮窗主入口，点击后打开 AI 对话窗口；首屏需展示默认欢迎语“你好，我是三桂博客的AI智能助手三桂，有什么可以帮助您的吗？”，并预留后续由后台修改欢迎语的设计位；本步明确不改后端。
- 修改类型：feat
- 影响范围：前端全局交互入口、首页/文章/后台等页面共享 UI、前端 AI 配置收口
- 变更摘要：
  1) 新增右下角 AI 助手浮窗主入口，默认常驻全局页面，视觉采用黑黄主色 + 洋红点缀，与现有站点风格保持一致。
  2) 新增全局 AI 对话面板，打开后默认显示欢迎语，并提供输入框与发送交互壳层。
  3) 由于后端尚未接入，本步发送消息后返回固定占位回复，用于验证前端交互闭环。
  4) 新增 `aiAssistantConfig.js`，将助手名称、标题、欢迎语、输入占位符与占位回复集中管理，并通过 `resolveAiAssistantConfig()` 预留未来后台配置覆盖能力。
  5) 补充 `aiAssistantConfig.test.js`，先验证默认欢迎语与配置覆盖逻辑，再实现生产代码。
- 涉及文件：
  - `SanguiBlog-front/src/AppFull.jsx`
  - `SanguiBlog-front/src/appfull/ui/AiAssistantWidget.jsx`
  - `SanguiBlog-front/src/appfull/aiAssistantConfig.js`
  - `SanguiBlog-front/src/appfull/aiAssistantConfig.test.js`
  - `.ai/PROJECT_MEMORY.md`
- 检索与复用策略：
  - 检索关键词：`AppFull` / `Navigation` / `PopButton` / `dialog` / `drawer`
  - 找到的旧实现：全局 UI 编排在 `AppFull.jsx`，弹层/抽屉模式可参考 `Navigation.jsx` 与文章目录抽屉
  - 最终选择：复用现有全局编排与弹层交互模式，不新增路由、不新建第二套页面壳
- 风险点：
  - 当前仍是前端预览版，未接真实知识库或对话接口；占位回复仅用于展示交互链路。
  - 右下角区域同时存在“返回顶部”按钮，当前通过更低的底部定位错开，后续若再新增浮层控件需继续检查移动端遮挡。
- 验证方式：
  - 测试：执行 `node src/appfull/aiAssistantConfig.test.js` 通过。
  - 构建：执行 `npm run build` 通过。
  - 手动：页面右下角可见 AI 助手浮窗，点击后出现对话面板并默认展示欢迎语。

## [2026-03-17] 首页站点版本号更新到 V2.1.290，并同步 README 当前版本说明
- 背景/需求：用户要求将项目版本号从 `V2.1.289` 更新到 `V2.1.290`，不生成 release 文档，只同步首页版本展示，并检查根目录 `README.md` 是否存在过时内容。
- 修改类型：chore
- 影响范围：首页版本展示、后端站点元信息、根目录 README
- 变更摘要：
  1) 后端 `site.version` 从 `V2.1.289` 更新为 `V2.1.290`。
  2) 首页 `HomeView` 的前端兜底版本同步更新为 `V2.1.290`。
  3) `README.md` 中当前站点版本号从 `V2.1.289` 更新为 `V2.1.290`。
  4) 按用户要求，不生成/更新 release 文档，其它 README 内容保持不变。
- 涉及文件：
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `SanguiBlog-front/src/appfull/public/HomeView.jsx`
  - `README.md`
- 检索与复用策略：
  - 检索关键词：`V2.1.289` / `site.version` / `meta?.version` / `README`
  - 找到的旧实现：首页版本统一读取后端 `site.version`，前端 `HomeView` 保留兜底版本；README 顶部单独维护当前版本说明
  - 最终选择：仅同步首页版本来源与 README 中明确过时的版本描述，不生成 release 文档
- 风险点：
  - 仅更新首页版本展示，不会影响业务逻辑；README 仅改当前版本号这一处文本。
- 验证方式：
  - 静态：检索 `V2.1.289` 已不再出现在首页版本来源文件与 README 当前版本说明中。
  - 手动：首页 Banner 应显示 `SANGUI BLOG // V2.1.290`；`README.md` 当前版本说明同步为 `V2.1.290`。

## [2026-03-17] 升级后端到 Spring Boot 3.5.11 并同步 SpringDoc 适配
- 背景/需求：用户要求将后端从 `Spring Boot 3.2.5` 升级到 `3.5.11`，并完成对应依赖适配，供后续上线测试与接入 Spring AI 技术栈使用。
- 修改类型：chore
- 影响范围：后端依赖管理、AI 技术栈前置版本兼容、AI 长期记忆文档
- 变更摘要：
  1) `SanguiBlog-server/pom.xml` 的父版本从 `3.2.5` 升级到 `3.5.11`。
  2) `springdoc-openapi-starter-webmvc-ui` 从 `2.5.0` 升级到与 Boot 3.5.x 对齐的 `2.8.16`。
  3) `.ai/PROJECT_MEMORY.md` 中过时的 Spring Boot / SpringDoc 版本说明同步更新，避免后续 AI 任务继续按旧版本判断。
- 涉及文件：
  - `SanguiBlog-server/pom.xml`
  - `.ai/PROJECT_MEMORY.md`
- 检索与复用策略：
  - 检索关键词：`spring-boot-starter-parent` / `springdoc` / `3.2.5` / `2.5.0`
  - 找到的旧实现：后端依赖集中在单一 `pom.xml`，不存在多模块或多套 Boot 版本配置
  - 最终选择：仅升级父版本与 Boot 兼容性最敏感的 `springdoc`，不扩散到无关依赖
- 风险点：
  - 运行时仍需重点回归验证安全过滤链、JPA 查询与 Swagger 页面可用性，但源码编译已通过。
- 验证方式：
  - 静态：检索确认仓库关键文档与 `pom.xml` 中旧版本号已被替换。
  - 编译：执行 `mvn -q -DskipTests compile` 通过（使用仓库内 Maven 本地缓存目录）。

## [2026-03-15] 首页站点版本号更新到 V2.1.289，并校正 README 过时版本说明
- 背景/需求：用户要求将项目版本号从 `V2.1.288` 更新到 `V2.1.289`，不生成 release 文档，只需同步首页版本展示；同时检查根目录 `README.md` 是否存在过时内容，并在必要范围内更新。
- 修改类型：chore
- 影响范围：首页版本展示、后端站点元信息、根目录 README
- 变更摘要：
  1) 后端 `site.version` 从 `V2.1.288` 更新为 `V2.1.289`。
  2) 首页 `HomeView` 的前端兜底版本同步更新为 `V2.1.289`。
  3) `README.md` 中过时的当前版本号从 `V2.1.287` 更新为 `V2.1.289`。
  4) `README.md` 中“发布说明：release/V2.1.287.md”改为更准确的目录说明，避免在未新增 release 文档时误导为当前版本已有对应发布说明。
- 涉及文件：
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `SanguiBlog-front/src/appfull/public/HomeView.jsx`
  - `README.md`
- 检索与复用策略：
  - 检索关键词：`V2.1.288` / `site.version` / `meta?.version` / `README` / `V2.1.287`
  - 找到的旧实现：首页版本统一读取后端 `site.version`，前端 `HomeView` 保留兜底版本；README 仍停留在旧版本说明
  - 最终选择：仅同步首页版本来源与 README 中明确过时的版本描述，不创建 release 文档
- 风险点：
  - README 中发布说明仍引用仓库现有最新文档 `V2.1.287`，这是按“不要生成 release 文档”的要求保留的现状说明。
- 验证方式：
  - 静态：检索 `V2.1.288` 已不再出现在首页版本来源文件中。
  - 手动：首页 Banner 应显示 `SANGUI BLOG // V2.1.289`；`README.md` 当前版本说明同步为 `V2.1.289`。

## [2026-03-15] 发布文章页按 Markdown 图片检测动态显示“插入图片”按钮
- 背景/需求：用户要求后台发布文章页（`/admin/create-post`）中的 Markdown 正文操作区默认只显示“上传 .md”；“插入图片”按钮先隐藏，仅在上传 Markdown 后检测到正文存在图片时才显示；若未检测到图片则保持隐藏。
- 修改类型：fix
- 影响范围：后台发布文章页（仅 `create-post`）Markdown 编辑区按钮显示逻辑
- 变更摘要：
  1) 新增 `shouldShowInlineImageUpload(imageCount)` 纯函数，用于收口“是否显示插入图片按钮”的判定规则。
  2) `CreatePostView` 新增 `showInlineImageUpload` 状态，默认 `false`，上传 `.md` 后根据 `countImagesInContent(body)` 结果切换可见性。
  3) 发布成功和“清空表单”时会重置该状态，确保下一篇文章重新回到“默认只显示上传 .md”。
  4) 编辑文章页现有“插入图片”按钮逻辑保持不变，避免扩大影响面。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/AdminPanel.jsx`
  - `SanguiBlog-front/src/appfull/createPostInlineImageVisibility.js`
  - `SanguiBlog-front/src/appfull/createPostInlineImageVisibility.test.js`
- 检索与复用策略：
  - 检索关键词：`CreatePostView` / `上传 .md` / `插入图片` / `countImagesInContent` / `handleMarkdownUpload`
  - 找到的旧实现：发布文章页已在上传 Markdown 时统计 `imageCount` 并写入提示文案；按钮始终显示
  - 最终选择：复用已有 `countImagesInContent` 检测结果，不新增接口，不重复实现图片检测
- 风险点：
  - 该规则只绑定在“上传 Markdown 文件”路径；如果管理员完全手写 Markdown，不会自动显示“插入图片”，这与本次需求“点击上传 md 后再判断”一致。
- 验证方式：
  - 静态：执行 `node SanguiBlog-front/src/appfull/createPostInlineImageVisibility.test.js` 通过。
  - 构建：执行 `npm run build` 通过。
  - 手动：进入 `/admin/create-post`，初始仅见“上传 .md”；上传含图片 Markdown 后出现“插入图片”；上传不含图片 Markdown 时不出现。

## [2026-03-15] 移除首页文章列表分页中的首页与末页按钮
- 背景/需求：用户希望首页文章卡片底部分页区去掉最左侧“首页”和最右侧“末页”按钮，因为数字页码本身已经会展示首末页，继续保留两个按钮显得重复。
- 修改类型：fix
- 影响范围：首页文章列表分页交互与视觉密度
- 变更摘要：
  1) 删除分页控制区左侧“首页”按钮。
  2) 删除分页控制区右侧“末页”按钮。
  3) 保留现有数字页码、“上一页 / 下一页”与省略号逻辑，不改动分页算法。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
- 检索与复用策略：
  - 检索关键词：`首页` / `末页` / `paginationItems` / `goToPage` / `上一页` / `下一页`
  - 找到的旧实现：`ArticleList.jsx` 中分页控制通过两个数组分别渲染“首页/上一页”和“下一页/末页”
  - 最终选择：直接裁剪按钮配置数组，只删除冗余按钮，不改数字页码逻辑
- 风险点：
  - 分页跳转能力仍完整，但用户不能再通过独立按钮一步跳到首页/末页；这是本次需求的明确取舍。
- 验证方式：
  - 手动：首页分页区只显示“上一页 / 数字页码 / 下一页”，不再出现“首页 / 末页”。

## [2026-03-15] 首页文章卡片摘要支持悬停查看完整内容
- 背景/需求：上一轮为首页文章卡片摘要增加 hover 浮层后，摘要区域同时保留了浏览器原生 `title` 提示，导致鼠标悬停时出现“双 tooltip”，视觉不统一。
- 修改类型：fix
- 影响范围：首页文章列表卡片摘要 hover 提示
- 变更摘要：
  1) 移除摘要段落上的原生 `title` 属性，避免浏览器默认 tooltip 与自定义浮层同时出现。
  2) 保留现有自定义摘要浮层与 `aria-label`，确保视觉统一且不丢可访问性语义。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
- 检索与复用策略：
  - 检索关键词：`title={excerptTooltip}` / `aria-label={excerptTooltip}` / `group/excerpt`
  - 找到的旧实现：原生 tooltip 与自定义 hover 浮层都挂在同一摘要段落上
  - 最终选择：原位移除 `title`，不改动自定义浮层结构
- 风险点：
  - 移除 `title` 后，浏览器原生提示不再作为兜底；但自定义浮层仍在桌面端正常工作，且这是用户明确期望。
- 验证方式：
  - 静态：全文确认 `ArticleList.jsx` 已不存在 `title={excerptTooltip}`，仅保留自定义摘要浮层。
  - 手动：首页悬停摘要区域时，只出现一层站内风格摘要浮层。

## [2026-03-15] 首页文章卡片摘要支持悬停查看完整内容
- 背景/需求：用户希望首页文章卡片在摘要被 `line-clamp` 截断时，鼠标悬停能看到该文章的完整摘要，且优先细化到摘要区域本身，避免必须点进文章才看到完整内容。
- 修改类型：fix
- 影响范围：首页文章列表卡片摘要交互
- 变更摘要：
  1) 为首页文章卡片新增摘要 tooltip 文案生成函数，统一规整换行与多余空白，避免 tooltip 中出现过长空行或异常缩进。
  2) `ArticleList` 的摘要段落新增 hover 提示层，仅在鼠标悬停摘要区域时显示完整摘要，不影响整卡点击跳转。
  3) 同时给摘要段落补充浏览器原生 `title` 作为兜底，保证在自定义浮层不可见的场景下仍能查看完整摘要。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
  - `SanguiBlog-front/src/appfull/public/articleExcerptTooltip.js`
  - `SanguiBlog-front/src/appfull/public/articleExcerptTooltip.test.js`
- 检索与复用策略：
  - 检索关键词：`excerpt` / `ArticleList` / `tooltip` / `title=` / `summary`
  - 找到的旧实现：首页卡片摘要集中在 `ArticleList.jsx`；现有 tooltip 交互可参考 `StatsStrip.jsx`；摘要数据来源继续复用后端 `PostSummaryDto.excerpt`
  - 最终选择：复用现有首页卡片与摘要字段，在摘要段落原位增强 hover 展示，不新增接口、不新增卡片组件
- 风险点：
  - 自定义 tooltip 依赖 hover，移动端不会触发；但本次需求明确针对鼠标悬停，移动端保留原行为。
  - `ArticleList.jsx` 存在历史遗留 eslint 问题（Hooks 顺序/未使用变量），本次未顺手重构，避免扩大改动面。
- 验证方式：
  - 静态：执行 `node SanguiBlog-front/src/appfull/public/articleExcerptTooltip.test.js` 通过，确认 tooltip 文案规整函数可用。
  - 手动：首页将鼠标移到文章卡片摘要区域，可看到完整摘要浮层；摘要为空时不展示 tooltip。

## [2026-03-14] 更新首页站点版本号到 V2.1.288
- 背景/需求：用户要求将当前项目版本号从 `V2.1.287` 更新到 `V2.1.288`，且不生成/更新 release 文档，仅同步首页版本展示。
- 修改类型：chore
- 影响范围：首页 Banner 版本展示、后端站点元信息
- 变更摘要：
  1) 后端 `site.version` 从 `V2.1.287` 更新为 `V2.1.288`。
  2) 首页 `HomeView` 的前端兜底版本同步更新为 `V2.1.288`。
  3) 按用户要求，不更新 README，不生成 release 文档。
- 涉及文件：
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `SanguiBlog-front/src/appfull/public/HomeView.jsx`
- 检索与复用策略：
  - 检索关键词：`site.version` / `V2.1.287` / `HomeView` / `meta?.version`
  - 找到的旧实现：首页 Banner 统一读取后端 `site.version`，前端保留 `HomeView` 兜底版本
  - 最终选择：仅修改首页相关版本来源，不运行版本脚本，避免额外改动 README / release
- 风险点：
  - README 中当前版本号仍停留在 `V2.1.287`，这是按用户“只改首页版本信息”的要求保留的差异。
- 验证方式：
  - 手动：启动后首页 Banner 显示 `SANGUI BLOG // V2.1.288`；后端 `/api/site/meta` 返回 `version=V2.1.288`。

## [2026-03-14] 扩展首页文章列表分页按钮窗口
- 背景/需求：首页文章列表底部分页在总页数较多时仅显示 `1 / 2 / ... / 19` 这类极简结构，用户希望参考搜索引擎的分页方式，展示更长的数字窗口，并保留“首页/末页”按钮。
- 修改类型：fix
- 影响范围：首页文章列表分页交互
- 变更摘要：
  1) 新增统一的 `goToPage` 分页跳转逻辑，复用到数字页码与首尾/上一页/下一页按钮，避免行为分叉。
  2) 分页数字窗口由“当前页前后各 1 个”扩展为“最多 6 个连续数字页码”，并按当前页位置动态平移，降低换成两行的概率。
  3) 在数字页码两侧补充“首页 / 上一页 / 下一页 / 末页”按钮；总页数与每页条数变化后仍按实时 `totalPages` 自适应。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
- 检索与复用策略：
  - 检索关键词：`paginationItems` / `currentPage` / `totalPages` / `pageSize` / `onQueryChange`
  - 找到的旧实现：`ArticleList.jsx` 中已有分页窗口算法与数字页码点击逻辑
  - 最终选择：复用现有 `currentPage + onQueryChange + buildQueryParams` 数据流，仅扩展分页窗口算法与按钮布局，不新增组件
- 风险点：
  - 当总页数很多时，分页区宽度会增加；但保持 `flex-wrap`，小屏会自动换行，避免溢出。
- 验证方式：
  - 手动：在总页数较多时确认分页显示更多连续数字；点击首页/末页/上一页/下一页/数字页码均能正常跳转；切换每页条数后分页窗口会随总页数变化自动更新。

## [2026-03-14] 收紧后台访问日志日期筛选框宽度与右侧留白
- 背景/需求：保留原生日历图标后，日期筛选框右侧仍有较明显空隙，视觉上不够紧凑。
- 修改类型：fix
- 影响范围：后台访问日志筛选区日期输入框视觉对齐
- 变更摘要：
  1) 将起始日期/结束日期切换为“自定义外观按钮 + 隐藏原生 date input”的结构，完全去除浏览器原生右侧保留空间。
  2) 通过点击整块按钮或右侧日历图标调用原生 `showPicker()`，同时保留接口所需的原生日期值。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/AdminPanel.jsx`
  - `SanguiBlog-front/src/index.css`
- 检索与复用策略：
  - 检索关键词：`pr-11` / `right-11` / `sg-date-input-native` / `md:col-span-1`
  - 找到的旧实现：日期筛选框为整列全宽，图标区预留较大
  - 最终选择：复用现有日期输入结构，仅收紧宽度和右侧内边距，不新增组件
- 风险点：
  - 仅影响桌面端日期框宽度与图标留白；移动端仍保持全宽，避免触控区域过小。
- 验证方式：
  - 手动：打开 `/admin/analytics`，确认日期框更紧凑，日历图标更靠右，右侧空隙明显减小。

## [2026-03-14] 修复后台访问日志日期筛选默认占位格式
- 背景/需求：后台 `/admin/analytics` 访问日志筛选区的起始日期/结束日期在空值和聚焦状态下都会被浏览器原生 `date` 输入接管显示，出现 `yyyy/mm/日`，与期望的 `yyyy/mm/dd` 不一致。
- 修改类型：fix
- 影响范围：后台访问日志筛选区日期输入框展示
- 变更摘要：
  1) 保留原生 `date` 输入与右侧日历图标/选择器，但隐藏浏览器本地化日期文案。
  2) 通过覆盖层统一显示 `yyyy/mm/dd` 风格的占位与已选日期，避免聚焦后再次出现 `yyyy/mm/日`。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- 检索与复用策略：
  - 检索关键词：`起始日期` / `结束日期` / `type=\"date\"` / `filtersDraft.start` / `filtersDraft.end`
  - 找到的旧实现：`AdminPanel.jsx` 中两个日期筛选框直接使用原生 `input[type=date]`
  - 最终选择：复用现有筛选状态与查询逻辑，移除对原生 `date` 占位的依赖，把格式归一化收口到 `normalizeFilters`
- 风险点：
  - 不再使用浏览器原生日历选择器，改为手输日期；但保留了输入格式归一化，接口参数结构不变。
- 验证方式：
  - 手动：打开 `/admin/analytics`，空值和聚焦时都显示 `yyyy/mm/dd` 风格；输入 `2026/03/14` 或 `2026-03-14` 后点击查询，筛选仍可生效。

## [2026-01-09] 修复 SQL 初始化脚本乱码注释
- 背景/需求：右上角系统设置弹层中的“彩蛋背景”滑块圆点带有右下角阴影，视觉上显得不居中。
- 修改类型：fix
- 影响范围：前端导航系统设置弹层样式
- 变更摘要：
  1) 去掉“彩蛋背景”开关滑块圆点的右下角阴影，仅保留描边与位移动画。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
- 检索与复用策略：
  - 检索关键词：`系统设置` / `彩蛋背景` / `backgroundEnabled` / `shadow-[2px_2px_0px_0px_#000]`
  - 找到的旧实现：`Navigation.jsx` 中已有系统设置弹层、彩蛋背景开关按钮、圆形滑块 span
  - 最终选择：复用现有开关结构，原位删除滑块阴影 class，不新增组件或样式文件
- 风险点：
  - 仅影响该滑块圆点的视觉层次，交互逻辑与位置计算不变。
- 验证方式：
  - 手动：打开右上角系统设置，观察“彩蛋背景”开关圆点无阴影且视觉居中。

## [2026-01-09] 修复 SQL 初始化脚本乱码注释
- 背景/需求：初始化脚本的注释出现乱码字符，影响可维护性。
- 修改类型：docs
- 影响范围：数据库初始化脚本注释
- 变更摘要：
  1) 修复 system_broadcasts 与 about_page 相关注释为可读中文。
- 涉及文件：
  - `sanguiblog_db.sql`
- 检索与复用策略：
  - 检索关键词：`About` / `system_broadcasts` / `-- ???`
  - 找到的旧实现：注释包含替换字符 `�`
  - 最终选择：原位替换为正确中文注释
- 风险点：
  - 无
- 验证方式：
  - 手动：打开 SQL 脚本，确认注释可读无乱码。

## [2026-01-09] 登录风控缓存加入过期清理
- 背景/需求：登录风控使用内存 Map 存储 IP 记录，未清理可能导致内存增长。
- 修改类型：fix
- 影响范围：登录风控内存缓存
- 变更摘要：
  1) 增加定期清理逻辑，按窗口与 TTL 移除过期 attempts/captchaCache/限流桶。
  2) 通过原子时间戳控制清理频率，避免每次请求全量遍历。
- 涉及文件：
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/LoginAttemptService.java`
- 检索与复用策略：
  - 检索关键词：`LoginAttemptService` / `ConcurrentHashMap` / `captchaRate`
  - 找到的旧实现：登录风控仅累积写入无清理
  - 最终选择：复用现有 Map 结构，新增轻量级过期清理
- 风险点：
  - 清理为周期性遍历，超大 Map 时可能产生瞬时 CPU 峰值（已限制为 5 分钟触发一次）。
- 验证方式：
  - 手动：持续触发登录失败后等待窗口过期，观察内存/Map 规模回落。

## [2026-01-09] 补齐初始化用户密码哈希
- 背景/需求：初始化脚本默认用户无密码，导致新环境无法登录。
- 修改类型：fix
- 影响范围：数据库初始化脚本
- 变更摘要：
  1) 为默认用户写入 BCrypt 密码哈希，确保初始化后可直接登录。
  2) 管理员与编辑默认账号一并补齐密码哈希。
- 涉及文件：
  - `sanguiblog_db.sql`
- 检索与复用策略：
  - 检索关键词：`password_hash` / `INSERT INTO users` / `AuthService`
  - 找到的旧实现：初始化脚本默认用户 password_hash 为 NULL
  - 最终选择：复用现有初始化脚本，补齐密码哈希字段
- 风险点：
  - 默认密码需在首次登录后立即修改，避免弱口令风险。
- 验证方式：
  - 手动：导入 SQL 后使用默认账号登录，进入后台修改密码。

## [2026-01-09] 调整 README 面向部署者说明
- 背景/需求：README 面向部署者，不应包含 AI 使用规范或内部约束说明。
- 修改类型：docs
- 影响范围：根目录 README 部署文档
- 变更摘要：
  1) 移除 AI 相关索引与版本脚本内部约束说明，改为部署相关索引。
  2) 补充后端启动方式与前端本地开发说明。
  3) 调整文档结尾指引为对外可读的说明。
- 涉及文件：
  - `README.md`
- 检索与复用策略：
  - 检索关键词：`README` / `版本号更新` / `AI`
  - 找到的旧实现：README 中包含 AI 入口与内部规则提示
  - 最终选择：保留部署流程结构，替换为对外部署向内容
- 风险点：
  - 无
- 验证方式：
  - 手动：阅读 README，确认仅包含部署/运维/开发相关信息。

## [2026-01-09] 修复登录校验提示与验证码刷新
- 背景/需求：登录页空用户名/密码提示不准确，且验证码正确但账号密码错误时验证码不刷新。
- 修改类型：fix
- 影响范围：前端登录页交互
- 变更摘要：
  1) 用户名/密码为空时提示改为“请输入用户名/请输入密码”，仅在输入长度>0时才提示长度限制。
  2) 登录失败且需要验证码时强制刷新验证码，并清空已输入的验证码。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/LoginView.jsx`
- 检索与复用策略：
  - 检索关键词：`LoginView` / `captchaRequired` / `auth/login`
  - 找到的旧实现：登录校验与验证码加载逻辑集中在 LoginView
  - 最终选择：复用现有登录流程，仅调整校验顺序与失败时的验证码刷新
- 风险点：
  - 失败后会触发一次强制刷新验证码，若频率过高可能被 5s 限流提示。
- 验证方式：
  - 手动：空用户名/密码提交提示正确；验证码正确但账号密码错误时验证码刷新并需重新输入。

## [2026-01-08] 固定后台仪表盘流量来源卡片高度并支持滚动
- 背景/需求：流量来源卡片内容较多时导致左侧访客走势图卡片被拉长，需固定高度并可滚动查看。
- 修改类型：fix
- 影响范围：后台仪表盘布局（前端）
- 变更摘要：
  1) 访客走势图卡片增加尺寸测量，右侧流量来源卡片高度与其同步。
  2) 流量来源列表改为内部滚动区，超长内容滚动查看，并适配暗色滚动条。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- 检索与复用策略：
  - 检索关键词：`trafficSources` / `DashboardView` / `TrendChart` / `sg-scrollbar`
  - 找到的旧实现：流量来源卡片为自适应高度，无滚动区
  - 最终选择：复用现有卡片结构与滚动条样式类，新增测量并限定右侧高度
- 风险点：
  - 初次渲染时高度测量为 0 会短暂回退为自适应高度（下一次测量后稳定）。
- 验证方式：
  - 手动：流量来源条目较多时，右侧卡片出现滚动条且左侧卡片高度不被拉长。

## [2026-01-08] 修复访客走势图文字与圆点拉伸、纵轴刻度遮挡
- 背景/需求：仪表盘走势图文字/圆点被拉伸，纵轴数值被裁切。
- 修改类型：fix
- 影响范围：后台仪表盘趋势图（前端）
- 变更摘要：
  1) SVG 改为等比缩放，避免文本与圆点被拉伸。
  2) 视口宽度按容器比例动态调整，避免等比缩放后图表过小。
  3) 增大左右 padding 与刻度文本偏移，防止纵轴数值被裁切。
  4) 背景矩形宽度随 viewBox 自适应，避免背景与图形比例错位。
  5) 视口测量改为仅使用图表区域，避免标签区干扰导致对齐错位。
  6) 视口测量改为基于 SVG 实际尺寸，避免多次刷新后比例漂移。
  7) 刷新场景增加延迟重算与按容器比例稳定 viewBox，避免随机缩小。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- 检索与复用策略：
  - 检索关键词：`TrendChart` / `preserveAspectRatio` / `paddingX`
  - 找到的旧实现：`preserveAspectRatio="none"` + 较小 padding
  - 最终选择：复用现有坐标计算，调整 SVG 缩放与 padding
- 风险点：
  - 等比缩放可能导致图表上下留白（视觉更稳，避免变形）。
- 验证方式：
  - 手动：观察纵轴数字不再被裁切，圆点保持正圆，文字比例正常。

## [2026-01-08] 修复访客走势图横坐标与柱体不对齐
- 背景/需求：后台仪表盘访客走势图底部日期与柱体/折线点不对齐。
- 修改类型：fix
- 影响范围：后台仪表盘趋势图（前端）
- 变更摘要：
  1) 横坐标日期改为按柱体中心点定位，避免平均分布导致错位。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- 检索与复用策略：
  - 检索关键词：`TrendChart` / `x-axis` / `dateLabel`
  - 找到的旧实现：底部日期使用 flex 均分布局
  - 最终选择：复用现有坐标计算，改为绝对定位对齐柱心
- 风险点：
  - 日期数量多时可能出现重叠（与原设计一致，仅对齐更准确）
- 验证方式：
  - 手动：悬浮/查看走势图，日期与柱体中心对齐。

## [2026-01-08] 修复文章页目录在移动端切换后位移
- 背景/需求：文章页在切换开发者工具移动端预览后回到桌面端，目录组件出现位移。
- 修改类型：fix
- 影响范围：文章详情页目录定位（前端）
- 变更摘要：
  1) 目录定位监听 `matchMedia` 与 `visualViewport` 变化，移动端时重置定位，回到桌面端时重新计算。
  2) 额外使用延迟多次重算，避免 DevTools 切换导致的布局未稳定。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
- 检索与复用策略：
  - 检索关键词：`tocLeft` / `commentJumpRef` / `目录`
  - 找到的旧实现：仅监听 window resize 的 tocLeft 计算
  - 最终选择：复用现有定位逻辑，补充视口变化监听
- 风险点：
  - 无
- 验证方式：
  - 手动：打开文章页 → 切换移动端 → 回到桌面端，目录位置保持正常。

## [2026-01-08] 修复页面 Meta 设置回调的时序错误
- 背景/需求：`/admin` 报错 “Cannot access 'applyDocumentMeta' before initialization”。
- 修改类型：fix
- 影响范围：前端页面 Meta 设置逻辑
- 变更摘要：
  1) 调整 `applyDocumentMeta` 定义位置，确保在使用前初始化。
- 涉及文件：
  - `SanguiBlog-front/src/AppFull.jsx`
- 检索与复用策略：
  - 检索关键词：`applyDocumentMeta` / `document.title`
  - 找到的旧实现：`AppFull.jsx` 中 useEffect 先于回调定义
  - 最终选择：仅调整定义顺序，保持逻辑不变
- 风险点：
  - 无
- 验证方式：
  - 手动：进入 `/admin` 或其它页面，无报错、标题正常更新。

## [2026-01-08] 后端生成 metaTitle/metaDescription 并前端应用页面标题
- 背景/需求：需要后端生成页面 Meta 字段并在前端动态设置标题/描述，缓解标题与描述重复问题。
- 修改类型：feat
- 影响范围：文章详情接口与前端页面标题
- 变更摘要：
  1) `PostDetailDto` 新增 `metaTitle` 字段；后端生成 `metaTitle/metaDescription`（标题/分类/站点品牌 + 摘要/正文兜底）。
  2) 前端根据当前视图动态设置 `document.title` 与 `meta description`，文章页优先使用后端返回的 meta 字段。
- 涉及文件：
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/PostDetailDto.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostService.java`
  - `SanguiBlog-front/src/AppFull.jsx`
- 检索与复用策略：
  - 检索关键词：`PostDetailDto` / `excerpt` / `contentHtml` / `document.title`
  - 找到的旧实现：文章详情已有摘要/内容，前端未设置 title/description
  - 最终选择：复用详情生成流程追加 meta 字段，前端统一设置页面标题
- 风险点：
  - SPA 动态 meta 对部分爬虫仍不稳定（如需更稳建议 SSR/预渲染）。
- 验证方式：
  - 手动：访问文章页与列表页，浏览器标题与 meta description 更新正确。

## [2026-01-08] 后端新增文章详情 metaDescription 生成字段
- 背景/需求：需要由后端生成页面 Meta 描述，便于前端设置更完整的 SEO 元信息。
- 修改类型：feat
- 影响范围：文章详情接口 DTO（后端）
- 变更摘要：
  1) `PostDetailDto` 新增 `metaDescription` 字段。
  2) `PostService.toDetail` 自动生成 meta 描述：优先 excerpt，其次正文纯文本，最后回退标题。
- 涉及文件：
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/model/dto/PostDetailDto.java`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostService.java`
- 检索与复用策略：
  - 检索关键词：`PostDetailDto` / `excerpt` / `contentHtml` / `meta`
  - 找到的旧实现：文章详情 DTO 已包含 `summary/contentHtml`，但无 meta 生成
  - 最终选择：复用现有详情生成流程，新增字段并在服务层生成
- 风险点：
  - meta 描述长度截断为 160 字，若需更短/更长可再调整
- 验证方式：
  - 手动：调用 `/api/posts/{id}` 或 `/api/posts/slug/{slug}`，返回中包含 `metaDescription` 且非空。

## [2026-01-08] 发布稳定版 Release 文档（V2.1.287）
- 背景/需求：用户要求发布稳定版本并生成最新 Release 文档。
- 修改类型：docs
- 影响范围：发布文档
- 变更摘要：
  1) 新增 `release/V2.1.287.md`，汇总 V2.1.285 之后的关键修复与升级说明。
- 涉及文件：
  - `release/V2.1.287.md`
- 检索与复用策略：
  - 检索关键词：`release` / `site.version` / `V2.1.285`
  - 找到的旧实现：`release/V2.1.285.md`、`release/V2.1.275.md`
  - 最终选择：复用既有发布说明结构，更新为 V2.1.287
- 风险点：
  - 无
- 验证方式：
  - 手动：打开 `release/V2.1.287.md` 查看文档内容与版本号一致。

## [2026-01-08] 修复 TrendChart Hooks 顺序错误导致后台白屏
- 背景/需求：`/admin` 仪表盘在数据加载后出现 Hooks 顺序变更报错并白屏。
- 修改类型：fix
- 影响范围：后台仪表盘趋势图（前端）
- 变更摘要：
  1) 将“暂无趋势数据”的早退逻辑移动到所有 Hooks 之后，保持 Hooks 调用顺序一致。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- 检索与复用策略：
  - 检索关键词：`TrendChart` / `Hooks` / `rendered more hooks`
  - 找到的旧实现：TrendChart 在数据为空时提前 return
  - 最终选择：复用现有结构，仅调整 return 时机
- 风险点：
  - 无
- 验证方式：
  - 手动：进入 `/admin`，等待数据加载不再白屏，控制台无 Hooks 顺序报错。

## [2026-01-08] 修复后台未登录提示与登录页暗色可读性，并优化移动端输入
- 背景/需求：暗色模式下“请先登录后再访问管理后台”与登录页取消按钮不清晰；手机端输入用户名出现字符重复与非法字符提示。
- 修改类型：fix
- 影响范围：前端登录/鉴权提示
- 变更摘要：
  1) 未登录访问 `/admin` 的提示文案在暗色模式下补充文字颜色，提升可读性。
  2) 登录页暗色模式“取消”按钮调整文本/边框颜色与悬浮底色，避免发黑不可读。
  3) 登录页用户名/密码输入增加组合输入处理与全角转半角归一化，减少移动端输入重复与误报。
- 涉及文件：
  - `SanguiBlog-front/src/AppFull.jsx`
  - `SanguiBlog-front/src/appfull/public/LoginView.jsx`
- 检索与复用策略：
  - 检索关键词：`请先登录后再访问管理后台` / `LoginView` / `PopButton` / `dark mode`
  - 找到的旧实现：`AppFull.jsx` 未登录提示、`LoginView.jsx` 取消按钮与输入过滤逻辑
  - 最终选择：复用现有页面结构，仅补充暗色样式与输入法兼容处理
- 风险点：
  - 输入法组合输入结束时会触发一次归一化，短时间内可能出现轻微光标跳动。
- 验证方式：
  - 手动：暗色模式访问 `/admin` 与 `/login`，文案/按钮可读；移动端输入用户名不再出现重复字符与误报。

## [2026-01-08] 修复后台仪表盘访客走势图悬浮提示错位
- 背景/需求：后台 `/admin` 仪表盘“访客走势图”悬浮提示在部分日期会固定在同一位置，导致数据与日期不匹配。
- 修改类型：fix
- 影响范围：后台仪表盘趋势图（前端）
- 变更摘要：
  1) Tooltip 定位改为根据当前日期柱的中心点计算，并按容器宽度动态夹取，避免固定位置。
  2) 通过测量 Tooltip 尺寸与容器尺寸，确保左右边界不溢出。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- 检索与复用策略：
  - 检索关键词：`TrendChart` / `hover` / `tooltip` / `访客走势图`
  - 找到的旧实现：`AdminPanel.jsx` TrendChart 内固定 `left` 上限 `340` 的 Tooltip 定位
  - 最终选择：复用现有 TrendChart 结构，仅修正定位计算
- 风险点：
  - Tooltip 渲染首次测量时可能出现一次轻微跳动（测量后回到正确位置）。
- 验证方式：
  - 手动：在 `/admin` 仪表盘悬浮不同日期，提示框与对应日期柱保持对齐且不会固定在同一位置。

## [2026-01-07] 修复后端测试依赖外部数据库导致构建失败
- 背景/需求：Maven 构建时执行单测，`@SpringBootTest` 连接真实 MySQL 失败（Connection refused）。
- 修改类型：fix
- 影响范围：后端测试配置
- 变更摘要：
  1) 新增 H2 测试依赖，并使用 `application-test.yaml` 作为测试数据源。
  2) 测试类启用 `test` profile，避免依赖外部数据库。
- 涉及文件：
  - `SanguiBlog-server/pom.xml`
  - `SanguiBlog-server/src/test/java/com/sangui/sanguiblog/SanguiBlogServerApplicationTests.java`
  - `SanguiBlog-server/src/test/resources/application-test.yaml`
- 检索与复用策略：
  - 检索关键词：`@SpringBootTest` / `application-test` / `pom.xml` / `h2`
  - 找到的旧实现：测试使用默认配置直连 MySQL
  - 最终选择：测试 profile + H2 内存库
- 风险点：
  - 测试数据源与生产 MySQL 行为可能存在少量差异（已有 MySQL 模式参数降低差异）。
- 验证方式：
  - 手动：`mvn test` 或 `mvn package` 不再因数据库连接失败而中断。

## [2026-01-07] 小版本号更新至 V2.1.286
- 背景/需求：用户要求更新小版本号，并要求由 AI 判断后续是否需要更新版本。
- 修改类型：chore
- 影响范围：版本号与发布文档
- 变更摘要：
  1) 版本号从 `V2.1.285` 更新为 `V2.1.286`。
  2) 同步更新 README 与首页版本回退值，并生成 `release/V2.1.286.md` 模板。
- 涉及文件：
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `SanguiBlog-front/src/appfull/public/HomeView.jsx`
  - `README.md`
  - `release/V2.1.286.md`
- 检索与复用策略：
  - 检索关键词：`site.version` / `HomeView` / `release/`
  - 找到的旧实现：`scripts/bump-version.ps1` 统一更新流程
  - 最终选择：复用脚本自动同步版本号
- 风险点：
  - 无
- 验证方式：
  - 手动：启动后首页 Banner 显示 `V2.1.286`，README 与 release 文件名同步更新。

## [2026-01-07] 增加版本号更新规则与脚本
- 背景/需求：要求 AI 判断是否需要小/大版本更新，并提供统一版本号更新流程与脚本，确保首页与文档同步。
- 修改类型：docs / chore
- 影响范围：AI 规则 / 版本更新流程 / README / 脚本
- 变更摘要：
  1) `.ai/README.md` 新增“版本号规则（永久）”。
  2) 新增 `scripts/bump-version.ps1`，统一更新 `site.version`、HomeView 默认值、README 与 Release 文件。
  3) README 新增“版本号更新（脚本）”说明并修复乱码段落。
- 涉及文件：
  - `.ai/README.md`
  - `scripts/bump-version.ps1`
  - `README.md`
- 检索与复用策略：
  - 检索关键词：`site.version` / `HomeView` / `release/` / `README`
  - 找到的旧实现：`application.yaml` 版本号与 README 当前版本行
  - 最终选择：新增脚本统一更新入口
- 风险点：
  - 若指定版本跨越第一位会被脚本拒绝（需用户明确要求）。
- 验证方式：
  - 手动：执行脚本后检查 `site.version`、首页版本展示与 README release 链接同步。

## [2026-01-07] 修复 README 乱码（后端配置段落重写）
- 背景/需求：README 的后端配置段落出现乱码，需要恢复为可读中文。
- 修改类型：docs
- 影响范围：README 文档
- 变更摘要：
  1) 重写 README 第 5 节后端配置段落，恢复中文与示例格式。
- 涉及文件：
  - `README.md`
- 检索与复用策略：
  - 检索关键词：README / 乱码 / application-local.yaml
  - 找到的旧实现：README 第 5 节内容被替换为问号
  - 最终选择：整段替换为 UTF-8 中文版本
- 风险点：
  - 无
- 验证方式：
  - 手动：打开 README，确认第 5 节中文正常显示。

## [2026-01-07] 更新环境切换脚本以适配私有配置与数据库切换
- 背景/需求：需要在切换环境时使用新的 `application-local.yaml` 私有配置，并调整数据库地址（dev 使用远程、prod 使用本地），同时保持端口/Storage/AssetBase/ApiBase 的切换逻辑。
- 修改类型：fix / docs
- 影响范围：环境切换脚本 / 文档
- 变更摘要：
  1) `scripts/switch-env.ps1` 改为更新 `application-local.yaml`（dbUrl/storage/asset-base-url）并继续更新 `application.yaml` 的端口与前端 `VITE_API_BASE`。
  2) `ChangeEnv.md` 更新为新的切换流程与手工配置说明。
  3) `README.md` 补充并纠正后端私有配置说明。
- 涉及文件：
  - `scripts/switch-env.ps1`
  - `ChangeEnv.md`
  - `README.md`
- 检索与复用策略：
  - 检索关键词：`switch-env.ps1` / `application-local.yaml` / `VITE_API_BASE` / `asset-base-url` / `storage.base-path`
  - 找到的旧实现：旧脚本直接改 `application.yaml` 与 `.env.local`
  - 最终选择：复用原脚本结构，分离到 `application-local.yaml`
- 风险点：
  - 若 `application-local.yaml` 未创建且未设置环境变量，后端将无法启动。
- 验证方式：
  - 手动：执行 `./scripts/switch-env.ps1 dev|prod`，检查 `application.yaml` 端口、`application-local.yaml` dbUrl/Storage/AssetBase、`.env.local` ApiBase 是否切换。

## [2026-01-07] 拆分私有配置到 application-local.yaml 并移除公网默认数据库
- 背景/需求：数据库配置默认指向公网 IP 且 useSSL=false，并回退 root/空密码，存在明文传输与弱口令风险；需要将可配置项迁移到私有配置文件并禁止提交。
- 修改类型：fix / docs
- 影响范围：后端配置 / 项目文档
- 变更摘要：
  1) `application.yaml` 引入 `application-local.yaml`，并移除数据库/JWT/站点等私有配置的默认值。
  2) 新增 `application-local.yaml`（gitignore）承载用户私有配置示例。
  3) 更新 `README.md`：说明新配置文件位置、示例格式与环境变量替代方式。
- 涉及文件：
  - `SanguiBlog-server/src/main/resources/application.yaml`
  - `SanguiBlog-server/src/main/resources/application-local.yaml`
  - `README.md`
- 检索与复用策略：
  - 检索关键词：`application.yaml` / `datasource` / `jwt.secret` / `asset-base-url`
  - 找到的旧实现：`application.yaml` 直接包含公网 DB 与 HTTP 资源域名默认值
  - 最终选择：使用 Spring `spring.config.import` 方式引入私有配置文件
- 风险点：
  - 未创建 `application-local.yaml` 且未设置环境变量时，后端将无法启动。
- 验证方式：
  - 手动：本地创建 `application-local.yaml` 后启动服务，确认可正常读取数据库与 JWT 配置。

## [2026-01-07] 修复文章标签无法清空的问题（/api/posts）
- 背景/需求：后台创建/更新文章走 `/api/posts`，当传空 `tagIds` 时后端不会清空标签，导致标签残留。
- 修改类型：fix
- 影响范围：文章创建/更新（后端）
- 变更摘要：
  1) `SavePostRequest.tagIds` 传空数组时，显式清空文章标签集合。
- 涉及文件：
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/PostService.java`
- 检索与复用策略：
  - 检索关键词：`tagIds` / `saveOrUpdate` / `createPost` / `updatePost`
  - 找到的旧实现：`PostService.saveOrUpdate` 仅在 `tagIds` 非空时写入标签
  - 最终选择：复用现有保存流程，补充“空数组即清空”分支
- 风险点：
  - 前端若传空数组，将清空标签（符合“清空标签”的预期）。
- 验证方式：
  - 手动：编辑文章取消所有标签并保存，后台应返回标签为空。

## [2026-01-07] 修复彩蛋背景开关圆点垂直居中
- 背景/需求：设置面板“彩蛋背景”开关的圆点在滑动槽内偏下，需要回到垂直居中。
- 修改类型：fix
- 影响范围：首页设置面板
- 变更摘要：
  1) 开关圆点改为 `top-1/2 + -translate-y-1/2` 垂直居中。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
- 检索与复用策略：
  - 检索关键词：彩蛋背景 / 开关 / w-16 h-9 / Navigation
  - 找到的旧实现：`Navigation.jsx` 彩蛋背景开关圆点定位
  - 最终选择：复用现有开关结构，仅修正圆点定位
- 风险点：
  - 无
- 验证方式：
  - 手动：观察开关圆点在关闭/开启两种状态下均垂直居中。

## [2026-01-07] 修复首页彩蛋背景开关图标逻辑
- 背景/需求：设置窗口“彩蛋背景”开关切换后图标变为太阳/月亮，造成与实际“背景开关”语义不符。
- 修改类型：fix
- 影响范围：首页设置面板
- 变更摘要：
  1) 彩蛋背景项图标改为根据 `isDarkMode` 显示太阳/月亮，不随开关状态切换。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/ui/Navigation.jsx`
- 检索与复用策略：
  - 检索关键词：彩蛋背景 / backgroundEnabled / Sun / Moon / Navigation
  - 找到的旧实现：`Navigation.jsx` 设置面板中彩蛋背景项的图标渲染
  - 最终选择：复用现有布局，仅调整图标判定逻辑
- 风险点：
  - 无
- 验证方式：
  - 手动：切换彩蛋背景开关时图标保持随主题变化，不再随开关状态改变。

## [2026-01-07] 再次提升首页系统状态标签字号
- 背景/需求：System Status 标签仍偏小，需要再略微放大但不突兀。
- 修改类型：fix
- 影响范围：首页系统状态条
- 变更摘要：
  1) 状态标签字号从 `text-[11px]` 调整为 `text-[12px]`。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/StatsStrip.jsx`
- 检索与复用策略：
  - 检索关键词：System Status / StatsStrip / 标签字号
  - 找到的旧实现：`StatsStrip.jsx` 现有标签样式
  - 最终选择：复用现有结构，仅微调字号
- 风险点：
  - 小屏横向区域可能略增占用（滚动条逻辑不变）。
- 验证方式：
  - 手动：观察标签字号更清晰且不突兀。

## [2026-01-07] 调整首页系统状态标签字号
- 背景/需求：首页 System Status 中“文章/浏览/评论/标签/最后更新”等标签过小，需要适度放大但不突兀。
- 修改类型：fix
- 影响范围：首页系统状态条
- 变更摘要：
  1) 将状态标签字号从 `text-[10px]` 调整为 `text-[11px]`。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/StatsStrip.jsx`
- 检索与复用策略：
  - 检索关键词：System Status / StatsStrip / 文章 / 浏览 / 评论 / 标签 / 最后更新
  - 找到的旧实现：`StatsStrip.jsx` 内状态条标签样式
  - 最终选择：复用现有状态条结构，仅调整字号
- 风险点：
  - 小屏横向排列可能略占空间（保持滚动条逻辑不变）。
- 验证方式：
  - 手动：观察 System Status 标签字号略大且不突兀，布局不溢出。

## [2026-01-07] 文章搜索空结果按钮文案中文化
- 背景/需求：关键词无匹配文章时按钮显示英文“RESET FILTERS”，与页面中文不一致。
- 修改类型：fix
- 影响范围：首页文章列表空结果提示
- 变更摘要：
  1) 将空结果提示区按钮文案替换为“重置筛选”。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
- 检索与复用策略：
  - 检索关键词：RESET FILTERS / 文章搜索 / 空结果
  - 找到的旧实现：`ArticleList.jsx` 空结果提示区按钮
  - 最终选择：复用原按钮与交互，仅调整文案
- 风险点：
  - 无
- 验证方式：
  - 手动：触发无结果状态，按钮文案显示为中文“重置筛选”。

## [2026-01-07] 修复首页文章搜索清空按钮撑高输入框
- 背景/需求：首页文章搜索在输入内容后出现“清空”按钮，按钮被挤成两行导致搜索框高度从一行变为两行。
- 修改类型：fix
- 影响范围：前台首页文章搜索条
- 变更摘要：
  1) 搜索输入容器与输入框改为 `flex-1 + min-w-0`，允许文本区域收缩。
  2) “清空”按钮添加 `shrink-0 + whitespace-nowrap`，避免被压缩换行。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleList.jsx`
- 检索与复用策略：
  - 检索关键词：文章搜索 / ArticleList / 清空 / keyword
  - 找到的旧实现：`ArticleList.jsx` 现有搜索条；`legacy/components/ArticleList.jsx` 旧版过滤；`AdminPanel.jsx` 多处搜索输入
  - 最终选择：复用现有首页搜索条结构，最小化调整布局类名
- 风险点：
  - 极长关键词时输入框可能出现横向溢出（预期为单行不换行）。
- 验证方式：
  - 手动：输入关键词后“清空”按钮保持单行，搜索条高度不再变为两行。

## [2026-01-04] 更新 Git 忽略规则与发布文档（V2.1.285）
- 背景/需求：你准备发布 `V2.1.285`，需要补齐 release 文档；同时希望确认并适配仓库的 `.gitignore` / `.gitattributes`，减少误提交构建产物/本地文件的风险。
- 修改类型：docs / chore
- 影响范围：仓库 Git 配置 / 发布文档 / 根目录 README 引用
- 变更摘要：
  1) 调整根目录 `.gitignore`：补充忽略 `temp/`，并用 `uploads/** + !uploads/.gitkeep` 保留上传目录占位；对 `.env` 模板文件做白名单保留（example/sample/template）。
  2) 调整根目录 `.gitattributes`：补充 `*.sql` 强制 LF，减少跨平台换行差异。
  3) 新增发布说明：`release/V2.1.285.md`。
  4) 更新根目录 `README.md`：版本号与 release 链接指向 `V2.1.285`。
- 涉及文件：
  - `.gitignore`
  - `.gitattributes`
  - `uploads/.gitkeep`
  - `release/V2.1.285.md`
  - `README.md`
- 检索与复用策略：
  - 检索关键词：`.gitignore` / `.gitattributes` / `release/V2.1.275.md` / `site.version` / `temp` / `uploads`
  - 找到的旧实现：`release/V2.1.275.md`（发布说明格式）、`README.md`（release 引用）、`application.yaml`（版本号来源）
  - 最终选择：复用既有 release 文档结构与版本号来源说明，最小化调整 ignore/attributes 规则
- 风险点：
  - `.gitignore` 的 `.env` 白名单仅保留模板文件名；若团队使用其它命名（如 `.env.prod.example`），需按实际补充。
- 验证方式：
  - 人工检查：`uploads/.gitkeep` 可提交；`temp/` 不再出现在未跟踪列表；`README.md` 与 `release/` 目录引用一致。

## [2026-01-04] 修复访问日志“页面类型-文章访问”筛选取反，并补齐流量来源 label 解码兜底
- 背景/需求：后台 `/admin/analytics` 的“页面类型=文章访问”筛选结果变成“普通+机器”的反向集合；同时仪表盘“流量来源统计”可能仍显示历史 `%E6%...` 编码串。
- 修改类型：fix
- 影响范围：后台访问日志查询（后端）/ 仪表盘流量来源展示（前端）
- 变更摘要：
  1) 后端 `isArticle` 判定加入 `post.id` join 兜底，避免某些环境下仅用 `postId` 判定导致“文章访问筛选取反”。
  2) 前端仪表盘“流量来源”对 `source.label` 做 decode 展示兜底，兼容历史数据。
- 涉及文件：
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsService.java`
  - `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- 检索与复用策略：
  - 检索关键词：`pageType` / `ARTICLE` / `postId` / `join(\"post\")` / `trafficSources` / `%[0-9A-F]{2}`
  - 找到的旧实现：`AnalyticsService.buildAdminPageViewSpec` 的 pageType switch；`AdminPanel` 仪表盘流量来源直接展示 label
  - 最终选择：复用原有筛选结构，补充判定兜底与展示 decode（不新增接口/不新增模块）
- 风险点：
  - join 判定与 postId 判定不一致时，可能将“悬空 post_id”也视为文章访问；但更符合“按 post_id 判定”的直觉口径。
- 验证方式：
  - 人工验证：选择“文章访问”仅返回文章访问日志；仪表盘来源 label 不再出现 `%E6%...`。

## [2026-01-04] 修复后台访问日志“来源”字段显示 URL 编码串（%E6%...）
- 背景/需求：修复“上一篇/下一篇”跳转的 header 字符集问题后，文章跳转产生的访问日志里“来源”字段出现 `%E6%9D%A5...` 这类 URL 编码串，影响可读性。
- 修改类型：fix
- 影响范围：访问日志写入（后端 AnalyticsService）/ 后台访问日志 UI 展示（前端 AdminPanel）
- 变更摘要：
  1) 后端在写入/统计来源前对 `referrer/sourceLabel` 做 URL decode 兜底，避免落库为编码串。
  2) 前端后台日志列表对历史数据做 decode 展示兜底，避免旧记录仍显示编码串。
- 涉及文件：
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/service/AnalyticsService.java`
  - `SanguiBlog-front/src/appfull/AdminPanel.jsx`
- 检索与复用策略：
  - 检索关键词：`referrer_url` / `resolveReferrerDisplayLabel` / `sourceLabel` / `%[0-9A-F]{2}` / `renderReferrer`
  - 找到的旧实现：`AnalyticsService.resolveReferrerDisplayLabel` 直接使用 request 字段；`AdminPanel` 直接展示 referrer 文本
  - 最终选择：复用现有链路，在“写入前 decode + 展示时 decode”双兜底修复
- 风险点：
  - 对确实包含 `%xx` 的普通文本可能被 decode；已限定为“看起来像 URL 编码”的模式并捕获异常，影响可控。
- 验证方式：
  - 人工验证：切换上一篇/下一篇后打开 `/admin/analytics`，新日志“来源”应为可读中文/可点击外链（不再显示 `%E6%...`）。

## [2026-01-04] 文章页渲染一致性与可访问性增强（HTML 兜底样式 + Esc 关闭预览/目录）
- 背景/需求：按“建议清单”执行文章页第 1/5 条：减少 Markdown 渲染与 HTML 兜底渲染的视觉差异，并补齐图片预览/移动端目录抽屉的键盘可用性。
- 修改类型：fix
- 影响范围：文章详情页 `/article/:id`（前端渲染与样式）
- 变更摘要：
  1) 统一 `.sg-article-markdown` 下行内 `code` 的 padding/字体/配色：Markdown 与 HTML 兜底输出一致。
  2) 图片预览支持 `Esc` 关闭，并在打开时聚焦遮罩、关闭时恢复焦点，避免键盘焦点逃逸。
  3) 移动端目录抽屉支持 `Esc` 关闭，打开时聚焦“关闭”按钮、关闭时恢复焦点，并补充必要的 `aria-label`。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
  - `SanguiBlog-front/src/index.css`
- 检索与复用策略：
  - 检索关键词：`dangerouslySetInnerHTML` / `safeHtml` / `prose-invert` / `previewImage` / `tocDrawerOpen`
  - 找到的旧实现：文章页 `sg-article-markdown` 容器、图片预览层、移动端目录抽屉
  - 最终选择：复用现有结构，追加最小的 CSS 规则与键盘事件监听（不新增模块/不引入依赖）
- 风险点：
  - CSS 覆盖可能影响文章页个别自定义样式；已用 `.sg-article-markdown` 范围限定，且仅针对行内 `code`。
- 验证方式：
  - 人工验证：同一篇文章在 `contentMd` 与 `contentHtml` 路径下行内 code 外观一致；图片预览与目录抽屉均可 `Esc` 关闭，且焦点不会跑丢。

## [2026-01-04] 修复文章页 Markdown 行内代码标题字号、摘要 Markdown 渲染与前后篇跳转偶发 fetch 报错
- 背景/需求：文章详情页（`/article/:id`）存在 3 个问题：1) 标题中的 `` `xxx` `` 行内代码被渲染成与正文同级的偏小字号；2) 点击“上一篇/下一篇”偶发跳转失败，报 `String contains non ISO-8859-1 code point`，刷新后恢复；3) 摘要区 `` `xxx` `` 无法按 Markdown 渲染。
- 修改类型：fix
- 影响范围：前台文章详情页渲染 / 前端埋点请求头 / 后端文章详情接口
- 变更摘要：
  1) 为文章页标题内的 `code` 强制继承标题字号，避免被 `text-sm` 缩小。
  1.1) 补充修复：正文行内 `code` 与正文同字号（Markdown 与 HTML 兜底路径一致），避免正文中 `` `xxx` `` 仍偏小。
  2) 摘要区改为 `ReactMarkdown` 渲染（支持行内代码/高亮等），并抑制额外段落 margin。
  3) 前端对 `X-SG-Referrer` / `X-SG-Source-Label` 统一 `encodeURIComponent`，后端 `PostController` 兜底 decode，避免浏览器 fetch header 的 ISO-8859-1 限制导致跳转报错。
- 涉及文件：
  - `SanguiBlog-front/src/appfull/public/ArticleDetail.jsx`
  - `SanguiBlog-front/src/api.js`
  - `SanguiBlog-server/src/main/java/com/sangui/sanguiblog/controller/PostController.java`
  - `SanguiBlog-front/src/index.css`
- 检索与复用策略：
  - 检索关键词：`/article/:id`、`ArticleDetail`、`post.excerpt`、`text-sm`、`inlineCodeBg`、`X-SG-Source-Label`、`buildAnalyticsReferrerHeaders`
  - 找到的旧实现：文章页 Markdown 渲染与自定义 `code` 渲染器、文章详情请求头埋点逻辑、后端 `PostController` 对应 Header 入参
  - 最终选择：复用并最小改动原有渲染/埋点链路（不新增接口/不新增模块）
- 风险点：
  - Header 编码/解码链路变更：若存在第三方客户端直连接口并依赖原始 header 值展示，可能看到被编码的字符串；后端已做 decode 兜底，影响应可控。
- 验证方式：
  - 人工验证：标题中 `` `xxx` `` 与标题字号一致；摘要内 `` `xxx` `` 正常渲染为红色行内代码；点击上一篇/下一篇不再出现 fetch header 报错。

## [2026-01-03] 移除根目录旧提示词文件，统一使用 `.ai`
- 背景/需求：你计划删除根目录 `AGENTS.md` / `NOTE.md` / `AGENTS-EDIT.md`，并要求仓库文档全面改为以 `.ai/README.md` 为唯一入口，消除所有导向旧文件的说明。
- 修改类型：docs
- 影响范围：AI 提示词 / 文档工作流 / 发布文档引用
- 变更摘要：
  1) 更新根目录 `README.md`，将“技术手册/变更日志/AI 入口”统一指向 `.ai/*`。
  2) 更新 `release/V2.1.275.md`，将“逐版本明细”引用改为 `.ai/CHANGELOG_AI.md`。
  3) 更新 `.ai/README.md` 与 `.ai/CHECKLISTS.md`，移除对根目录旧文件的依赖描述。
  4) 删除根目录旧文件（见涉及文件），避免未来误读/误维护。
- 涉及文件：
  - `README.md`
  - `release/V2.1.275.md`
  - `.ai/README.md`
  - `.ai/CHECKLISTS.md`
  - `.ai/PROJECT_MEMORY.md`
  - `AGENTS.md`（已删除）
  - `NOTE.md`（已删除）
  - `AGENTS-EDIT.md`（已删除）
- 检索与复用策略：
  - 检索关键词：`AGENTS.md` / `NOTE.md` / `AGENTS-EDIT.md` / `PROJECT_MEMORY` / `CHANGELOG_AI`
  - 找到的旧实现：`README.md`、`release/V2.1.275.md`、`.ai/README.md` 等文件中存在对旧文档的引用
  - 最终选择：统一改为引用 `.ai/*`，并删除旧文件，彻底消除导向
- 风险点：
  - 若外部工具/脚本仍硬编码读取 `NOTE.md` 或 `AGENTS-EDIT.md`，会出现“文件不存在”；需要改为读取 `.ai/PROJECT_MEMORY.md` / `.ai/CHANGELOG_AI.md`。
- 验证方式：
  - 人工检查：全仓库检索不再出现对 `AGENTS.md`/`NOTE.md`/`AGENTS-EDIT.md` 的导向引用（历史记录内容除外）。
- 后续建议：
  - 后续只维护 `.ai/*`，根目录不再新增/恢复同名提示词文件，避免分叉。

## [2026-01-03] 提示词系统迁移到 `.ai`
- 背景/需求：将根目录旧提示词文档（`NOTE.md`/`AGENTS-EDIT.md`/`AGENTS.md`）迁移到新的 `.ai` 提示词系统，统一入口与工作流程，避免重复维护。
- 修改类型：docs
- 影响范围：AI 提示词 / 文档工作流
- 变更摘要：
  1) `.ai/PROJECT_MEMORY.md` 合并并承载原 `NOTE.md` 的技术手册内容，并在文件顶部追加迁移说明。
  2) `.ai/CHANGELOG_AI.md` 保留“新增记录模板”，并在下方追加原 `AGENTS-EDIT.md` 的历史记录（保留原版本格式）。
  3) 根目录 `AGENTS.md` 更新为新的入口规则，明确“先读 `.ai/README.md`”。
  4) 根目录 `NOTE.md` 与 `AGENTS-EDIT.md` 改为跳转说明，避免双份文档产生分歧。
- 涉及文件：
  - `AGENTS.md`
  - `NOTE.md`
  - `AGENTS-EDIT.md`
  - `.ai/README.md`
  - `.ai/PROJECT_MEMORY.md`
  - `.ai/CHANGELOG_AI.md`
- 检索与复用策略：
  - 检索关键词：`AGENTS.md` / `NOTE.md` / `AGENTS-EDIT.md` / `.ai` / `PROJECT_MEMORY` / `CHANGELOG_AI`
  - 找到的旧实现：根目录 `AGENTS.md`（旧工作流程）、`NOTE.md`（技术手册）、`AGENTS-EDIT.md`（AI 版本日志）
  - 最终选择：复用并迁移（新系统承载，旧文件保留跳转），避免重复维护
- 风险点：
  - 若存在脚本/文档硬编码读取 `NOTE.md`/`AGENTS-EDIT.md`，将只读到跳转说明（但不会“找不到文件”）；需要时改为读取 `.ai/PROJECT_MEMORY.md` / `.ai/CHANGELOG_AI.md`。
  - `.ai/CHANGELOG_AI.md` 体积增大（包含历史迁移内容），建议后续只在文件顶部追加新记录。
- 验证方式：
  - 人工检查：确认 `.ai/README.md` 的入口规则与根目录 `AGENTS.md` 一致；确认迁移文件包含原内容；确认旧文件已改为跳转说明。
- 后续建议：
  - 新增/调整提示词规则只维护 `.ai/*`，避免再回写根目录旧文件。

---

## 模板（新增记录按此格式）
## [YYYY-MM-DD] <变更标题>
- 背景/需求：
- 修改类型：feat / fix / refactor / docs
- 影响范围：A业务 / B业务 / 公共模块 / 数据模型
- 变更摘要：
  1) ...
  2) ...
- 涉及文件：
  - `/path/file1`
  - `/path/file2`
- 检索与复用策略：
  - 检索关键词：
  - 找到的旧实现：
  - 最终选择：复用/修改/新建（说明原因）
- 风险点：
  - ...
- 验证方式：
  - ...
- 后续建议：
  - ...

---
## 历史迁移（来自 AGENTS-EDIT.md，保留原版本格式）
 ## V1.2.1 (2025-11-24)
  - **后端**：PostService 在创建/更新文章时补齐 created_at/updated_at/published_at，避免因时间戳为空导致数据库约束失败。
  - **文章内容**：ArticleDetail 会自动把 Markdown/HTML 中的相对图片地址映射到 `/uploads/<slug>/...`，确保上传的图像能正确
    渲染。
  - **版本**：首页 Banner 更新为 SANGUI BLOG // V1.2.1。

## V1.1.37 (2025-11-23)
- **标签分页搜索**: `/admin/taxonomy` 新增模糊搜索与分页控件，可按名称/slug 查询，每页 5/10/20/50 条灵活切换。
- **API 扩展**: `/api/admin/tags` 支持 `keyword/page/size` 参数并返回 `PageResponse`，后端通过 `Pageable` + `findByNameContainingIgnoreCaseOrSlugContainingIgnoreCase` 实现模糊匹配。
- **提升**: 删除标签时自动调整页码，创建/查询会置回第一页。首页 Banner 更新为 `SANGUI BLOG // V1.1.37`。

## V1.1.38 (2025-11-23)
- **分类管理页**: 新增后台“二级分类”页面，可增删改查分类、行内编辑父级与排序、分页展示并提供模糊搜索/父级筛选。
- **后端支持**: `/api/admin/categories` 新增 CRUD + 分页搜索接口，限制只有管理员可用，并强制仅两级结构（父级必须为一级分类）。
- **共享**: `CategoryService` 扩展 slug 自动生成、唯一性校验及删除保护；前端 API 同步扩展。首页版本号更新为 `SANGUI BLOG // V1.1.38`。

## V1.1.39 (2025-11-23)
- **文章管理页**: `/admin/posts` 新增文章列表视图，支持分页/搜索/分类筛选，行内编辑标题、Slug、状态、摘要、颜色、分类与标签。
- **后端扩展**: 新建 `/api/admin/posts` 接口及 `PostAdminDto`/`AdminPostUpdateRequest`，`PostService` 提供分页查询和基础元数据更新并校验 slug、分类、标签。
- **前端 API**: `api.js` 增加文章管理请求，AdminPanel Tab 改为真实的 PostsView。首页 Banner 更新为 `SANGUI BLOG // V1.1.39`。

## V1.1.40 (2025-11-23)
- **修复**: 文章管理页缺少 `adminFetchPosts`/`adminUpdatePost` 引入导致页面空白，现补充 API 引用并刷新 Banner 为 `SANGUI BLOG // V1.1.40`。

## V1.1.41 (2025-11-23)
- **文章管理优化**: 仅展示二级分类供选择（下拉标记“一级/二级”），禁止设置为一级分类；分类列显示为 `一级/二级`，状态列改为中文（草稿/已发布/已归档），表格原 `Slug` 列改为“摘要”。
- **交互细节**: 编辑态在标题单元格内附加 `Slug` 与主题色输入，分页默认按发布时间降序；`PostAdminDto` 增补父级名称，便于展示。
- **版本**: 首页 Banner 更新为 `SANGUI BLOG // V1.1.41`。

## V1.1.42 (2025-11-23)
- **个人资料页重构**: 重新设计后台个人资料 UI，增加深色模式适配、完整的只读信息、改良的密码验证流程、头像实时上传并落库、社交字段与 Bio 输入体验。
- **导航联动**: 顶部头像点击直接跳转到 `/admin/profile`，方便随时进入资料页。
- **版本**: 首页 Banner 更新为 `SANGUI BLOG // V1.1.42`。

## V1.1.43 (2025-11-23)
- **资料页修复**: 头像上传结果改为读取后端返回的 `url` 并立即写入资料，邮箱/微信字段完整展示且提供二维码预览。
- **密码校验**: 后端 `updateProfile` 增加原密码验证与 `verifyOnly` 模式，前端调用改为 camelCase，只有验证通过才能设置新密码。
- **只读信息**: DTO 现返回邮箱、创建时间、上次登录等元数据，页面在深色模式下正常展示。版本号更新为 `SANGUI BLOG // V1.1.43`。

## V1.1.44 (2025-11-23)
- **资料页精简**: 移除微信二维码字段，保留 GitHub/Bio 等核心信息，头像上传改为读取 `data.url` 并即时生效。
- **提示优化**: 通用状态信息会滚动到视区内，密码验证提示紧邻密码区域，白天模式的只读卡片使用纯白底色以提升对比度。
- **后端增强**: `updateProfile` 支持用户名/邮箱更新与密码验证分支，响应中返回邮箱及时间元数据。首页版本号更新为 `SANGUI BLOG // V1.1.44`。

## V1.1.45 (2025-11-23)
- **头像策略**: 上传接口改为写入 `static/avatar` 并仅在数据库存储文件名，更新头像时自动删除旧文件。
- **只读信息可见性**: 资料页的只读字段在日间模式下改为黑色字体，避免白底白字无法查看。
- **版本**: 首页 Banner 更新为 `SANGUI BLOG // V1.1.45`。

## V1.1.46 (2025-11-23)
- **首页信息**: 作者卡片展示 `bio`，微信二维码统一指向后端 `static/contact/wechat.jpg`，不再出现 Mock 图片。
- **媒体助手**: 新增 `buildMediaUrl` 供头像/二维码复用，自动补齐 `http://localhost:8080` 前缀。
- **版本**: 首页 Banner 更新为 `SANGUI BLOG // V1.1.46`。

## V1.1.47 (2025-11-23)
- **二维码修正**: 首页作者卡片彻底改为使用后端 `contact/wechat.jpg`，不再尝试加载 Mock 链接，避免闪烁。
- **版本**: 首页 Banner 更新为 `SANGUI BLOG // V1.1.47`。

## V1.1.48 (2025-11-23)
- **文章卡片数据源**: 首页列表将原“爱心”指标改为浏览量（Eye 图标），并直接展示后端返回的 `viewsCount`；评论数同样读取 `commentsCount`，确保与数据库一致。
- **版本**: 首页 Banner 更新为 `SANGUI BLOG // V1.1.48`。

## V1.1.49 (2025-11-23)
- **评论统计**: 后端 `PostService` 通过 `commentRepository.countByPostIdAndStatus` 获取真实评论数量（仅统计批准评论），解决文章列表显示不准的问题。
- **版本**: 首页 Banner 更新为 `SANGUI BLOG // V1.1.49`。

## V1.1.36 (2025-11-23)
- **功能**: 后台“分类标签”页实现标签管理界面，可新增、编辑、删除并刷新真实接口数据，支持行内编辑/保存与输入校验。
- **后端**: 新增 `/api/admin/tags` CRUD 接口与 `TagRequest` DTO，强化唯一性校验及 slug 自动生成，同时在 `SecurityConfig` 中限制为管理员可用。
- **前端**: `api.js` 扩展标签管理 API，`AdminPanel` 路由新增 `TaxonomyView`，UI 采用卡片 + 表格呈现标签详情。首页 Banner 更新为 `SANGUI BLOG // V1.1.36`。

## V1.1.35 (2025-11-23)
- **修复**: `api.js` 的通用请求方法在抛错时附带 `status`，`checkAuth` 只在后端返回 `401` 时才清理本地 Token，避免页面频繁刷新时因偶发网络错误而被误判为未登录。
- **更新**: 首页 Banner 版本号为 `SANGUI BLOG // V1.1.35`，以记录本次认证行为修复。

## V1.1.34 (2025-11-23)
- **修复**: 重新初始化标题 slug 映射，避免组件多次渲染后生成 `xxx-2` 之类的随机 ID；并在目录跳转找不到目标时回退到原始 `#标题`，确保锚点永远可用。
- **更新**: 首页 Banner 改为 `SANGUI BLOG // V1.1.34`。

## V1.1.33 (2025-11-23)
- **修复**: 在 `AppFull.jsx` 中为 Markdown 标题注入锚点 ID 的同时，拦截目录链接（`href="#xxx"`）点击行为，若未匹配到原文 ID 会自动尝试 slug 版本，确保 `[标题](#标题)` 可稳定滚动定位。
- **更新**: 首页 Banner 版本号刷新为 `SANGUI BLOG // V1.1.33`。

## V1.1.32 (2025-11-23)
- **优化**: 为 `ReactMarkdown` 的所有标题节点自动生成锚点 `id`（兼容中文），并处理同名标题的去重逻辑，确保 Markdown 目录链接如 `[标题](#标题)` 可正确定位。
- **UI**: 首页 Banner 版本号更新为 `SANGUI BLOG // V1.1.32`，与 Markdown 渲染能力提升保持同步。

## V1.1.31 (2025-11-23)
- **优化**: 评论区新增“两层楼”限制，仅允许针对顶级评论进行回复，超出层级自动隐藏“回复”按钮，避免过深嵌套导致阅读困难。
- **更新**: Hero Banner 版本号刷新为 `SANGUI BLOG // V1.1.31`，与本次交互策略保持一致。

## V1.1.30 (2025-11-23)
- **新增**: 评论区支持楼中楼交互。新增“回复”输入框、嵌套渲染与评论总数统计，用户可针对任意评论进行多级回复。
- **联动**: `useBlogData` 的增删改操作改为完成后自动重新拉取 `/comments` 列表，确保前端树形结构实时映射后端 `parent_comment_id` 数据。
- **文档**: `NOTE.md` 补充了评论树渲染流程，并标注 `sanguiblog_db.sql` 内含带 `parent_comment_id` 的测试数据。首页 Banner 版本号更新为 `SANGUI BLOG // V1.1.30`。

## V1.1.29 (2025-11-23)
- **新增**: 文章详情页通过 `remark-math` + `rehype-katex` 支持 LaTeX 数学公式渲染，`rehype-raw` 允许渲染 Markdown 中的自定义 HTML（如 `<p style="color:red">`）。
- **更新**: 在 `AppFull.jsx` 中引入 KaTeX 样式并配置 ReactMarkdown 插件链，确保数学公式与 HTML 正常展示。
- **版本**: 首页 Banner 版本号更新为 `SANGUI BLOG // V1.1.29`。

## V1.1.28 (2025-11-23)
- **修复**: 扩展 `SecurityConfig` 的跨域白名单，新增 `http://localhost:5174` 与 `http://127.0.0.1:5174`，确保结构管理浏览器在 5174 端口运行时能正常访问后端接口。
- **更新**: 首页 Banner 版本号改为 `SANGUI BLOG // V1.1.28`。

## V1.1.27 (2025-11-23)
- **修复**: 修复了 `AppFull.jsx` 中因组件删除操作不当导致的严重 JSX 语法错误。
    - **原因**: 在删除重复的 `CommentsSection` 和 `ArticleDetail` 组件时，意外删除了 `Hero` 组件的闭合标签（`</section>`, `</>`, `);`, `};`）以及 `LoginView` 组件的定义头和状态 Hook（`const LoginView = ...`, `useState`）。
    - **解决**: 恢复了丢失的 `Hero` 组件闭合标签和 `LoginView` 组件的完整定义，确保页面能正常渲染且无语法报错。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.27`。

## V1.1.26 (2025-11-23)
- **修复**: 再次修复 `AppFull.jsx` 中 `CommentsSection` 和 `ArticleDetail` 组件重复声明的错误。
    - **原因**: 上一次修复尝试未能正确删除文件末尾的冗余代码，导致 `Identifier 'CommentsSection' has already been declared` 错误持续存在。
    - **解决**: 彻底删除了文件末尾（行 1699-2111）的旧版本组件定义，确保全局只有一份包含最新功能（“博主”徽章）的组件代码。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.26`。

## V1.1.25 (2025-11-23)
- **修复**: 修复了 `AppFull.jsx` 中 `CommentsSection` 和 `ArticleDetail` 组件重复声明的错误。
    - **原因**: 在上一次更新中，代码替换操作意外地在文件末尾追加了这两个组件的旧版本定义，导致与文件中部的新版本定义冲突，引发 `Identifier 'CommentsSection' has already been declared` 报错。
    - **解决**: 删除了文件末尾多余的重复组件定义，保留了包含“博主”徽章逻辑的正确版本。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.25`。

## V1.1.24 (2025-11-23)
- **UI 优化**: 
    - 将文章详情页作者卡片中的默认头衔从英文 "CONTRIBUTOR" 改为中文 "**博主**"。
    - **评论区增强**: 新增了博主身份标识功能。
        - 当评论发布者为文章作者时，其名字旁会显示一个带有 **PenTool** 图标和“**博主**”文字的专属 Badge（徽章）。
        - 徽章样式遵循 Neo-Brutalism 风格（粗边框、阴影、高亮背景），与全站设计语言保持一致。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.24`。

## V1.1.23 (2025-11-23)
- **修复**: 修复了 `AppFull.jsx` 中因 UI 回滚操作不当导致的 JSX 语法错误（`Expected corresponding JSX closing tag for <div>`）。
    - **原因**: 在将作者卡片回滚为简约风格时，替换操作意外覆盖了文章元数据区的结束标签和 `article` 容器的开始标签，导致 DOM 结构断裂。
    - **解决**: 恢复了丢失的“阅读量”元数据显示、元数据区闭合标签、简约版作者卡片以及 `article` 容器的正确包裹结构。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.23`。

## V1.1.22 (2025-11-23)
- **回滚**: 响应用户反馈，将文章详情页的 **作者信息卡片 (Author Card)** 回滚到之前的简约风格。
    - 用户认为新的 Neo-Brutalism 风格卡片过于复杂（"太丑了"），更倾向于之前的“空荡荡”的简约设计。
    - **保留功能**: 尽管 UI 回滚，但 **分享功能**（复制链接 + Toast 提示）和 **作者头衔 Badge** 样式被保留。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.22`。

## V1.1.21 (2025-11-23)
- **修复**: 修复了 `AppFull.jsx` 中的 JSX 语法错误（`Expected corresponding JSX closing tag for <div>`）。
    - **原因**: 在上一次重构作者卡片时，自动替换工具未能正确识别代码块边界，导致文章元数据区域（Metadata）与正文内容（Content）的标签嵌套错乱，丢失了 `</article>` 闭合标签和作者卡片代码。
    - **解决**: 重新构建了 `ArticleDetail` 组件的核心渲染部分，严格按顺序恢复了 `Metadata` -> `Author Card` -> `Article Content` 的结构，并确保所有 JSX 标签正确闭合。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.21`。

## V1.1.20 (2025-11-23)
- **修复**: 修复了点击分享按钮时导致的白屏崩溃问题（`ReferenceError: CheckCircle is not defined`）。
    - **原因**: 在实现分享 Toast 弹窗时，使用了 `CheckCircle` 图标但忘记从 `lucide-react` 库中导入。
    - **解决**: 在 `AppFull.jsx` 头部添加了 `CheckCircle` 的导入。
- **UI 重构**: 全面重新设计了文章详情页的 **作者信息卡片 (Author Card)**。
    - **新样式**: 采用了更丰富的 Neo-Brutalism 风格卡片，包含粗边框、阴影和装饰性标签。
    - **内容增强**:
        - **头像**: 增大尺寸并添加了在线状态指示器。
        - **简介**: 新增了作者简介（Bio）显示区域（支持默认文案回退）。
        - **数据**: 新增了模拟的“文章数”和“粉丝数”统计，增加页面活跃感。
        - **操作**: 集成了 **FOLLOW**（关注）、**SHARE**（分享）和 **Github** 按钮，操作区更集中。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.20`。

## V1.1.19 (2025-11-23)
- **修复**: 修复了 `AppFull.jsx` 中 `ArticleDetail` 组件的严重语法错误。
    - **原因**: 上一次更新分享功能时，代码替换出现错误，导致 JSX 结构被破坏，出现了 `Unexpected token` 报错。
    - **解决**: 完整重写了 `ArticleDetail` 组件，确保所有功能（头像、分享、Markdown 渲染）和语法结构正确无误。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.19`。

## V1.1.18 (2025-11-23)
- **文档**: 更新了 `NOTE.md`，详细记录了头像显示的完整技术逻辑（数据源、URL 解析、回退机制、后端配置）。
- **优化**: 重新设计了文章详情页作者头衔（Title）的显示样式。
    - 将原先普通的文本改为具有波普/新粗野主义风格的 **Badge（徽章）** 样式（粗边框、阴影、高亮背景），与全站风格保持一致。
    - 默认显示 `AUTHOR`，或显示用户的自定义头衔。
- **功能**: 实现了文章详情页的 **分享功能**。
    - 点击分享按钮现在会将当前页面 URL 复制到剪贴板。
    - 增加了一个风格化的 **Toast 弹窗**（粗边框、阴影、动画），提示用户“链接已复制”。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.18`。

## V1.1.17 (2025-11-23)
- **修复**: 修复了 `AppFull.jsx` 中的 `'return' outside of function` 报错。
    - **原因**: 在上一次修复语法错误时，误删了 `getAvatarUrl` 函数的定义行，导致函数体代码直接暴露在组件中，使组件提前返回并导致后续代码脱离函数作用域。
    - **解决**: 恢复了 `const getAvatarUrl = (avatarPath) => {` 函数定义行。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.17`。

## V1.1.16 (2025-11-23)
- **修复**: 修复了 `AppFull.jsx` 中的语法错误（`Unexpected token`）。
    - **原因**: 在上一次修复头像逻辑时，代码替换操作不当，导致 `ArticleDetail` 组件中出现了一个多余的 `return (` 语句，破坏了函数结构。
    - **解决**: 删除了多余的 `return (`，恢复了正确的组件结构。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.16`。

## V1.1.15 (2025-11-23)
- **修复**: 再次修复文章详情页作者头像显示为“破损图片”的问题。
    - **原因**: 数据库中存储的旧头像路径（如 `/sangui.jpg`）不包含 `/avatar` 前缀，直接拼接 `http://localhost:8080` 导致 404 错误。且之前的简化逻辑移除了 `onError` 处理，导致加载失败时无法回退到 Mock 头像。
    - **解决**:
        1.  重新引入了 `getAvatarUrl` 辅助函数，增加了智能路径修正逻辑：如果路径不以 `/uploads/` 或 `/avatar/` 开头，自动添加 `/avatar` 前缀。
        2.  在 `img` 标签中重新添加了 `onError` 事件处理，确保在图片加载失败（404）时能自动回退到 `MOCK_USER.avatar`。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.15`。

## V1.1.14 (2025-11-23)
- **修复**: 修复了文章详情页 `ReferenceError: contentMd is not defined` 报错。
    - **原因**: 在上一次重构头像逻辑时，意外删除了 `contentMd` 及其他样式变量（如 `text`, `surface`, `quoteBg` 等）的定义。
    - **解决**: 恢复了所有丢失的变量定义，确保文章详情页能正常渲染 Markdown 内容及样式。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.14`。

## V1.1.13 (2025-11-23)
- **修复**: 彻底修复文章详情页作者头像显示问题。
    - **原因**: 之前的 `getAvatarUrl` 辅助函数逻辑过于复杂且可能存在判断漏洞，导致部分头像路径无法正确解析。
    - **解决**: 弃用了 `getAvatarUrl` 函数，直接采用了与 `CommentsSection` 和 `Navbar` 完全一致的内联渲染逻辑。
        - 如果头像路径以 `http` 开头，直接使用。
        - 如果有头像路径但非 `http`，自动拼接 `http://localhost:8080` 前缀。
        - 如果无头像路径，回退显示默认 Mock 头像。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.13`。

## V1.1.12 (2025-11-23)
- **修复**: 进一步修复静态资源头像显示问题。
    - **原因**: 虽然 Spring Boot 默认映射了 `static` 目录，但在某些部署环境或配置下，默认映射可能不生效或被覆盖。
    - **解决**: 在 `WebConfig` 中显式添加了 `/avatar/**` 到 `classpath:/static/avatar/` 的映射，确保无论环境如何，头像路径都能正确解析。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.12`。

## V1.1.11 (2025-11-23)
- **修复**: 修复了静态资源头像（如 `/sangui.jpg`）无法显示的问题。
    - **原因**: 数据库中存储的旧头像路径为 `/filename.jpg`，而实际文件位于后端的 `static/avatar/` 目录下，直接访问 `/filename.jpg` 会导致 404。
    - **解决**: 更新了前端 `AppFull.jsx` 中的 `getAvatarUrl` 逻辑。现在，对于以 `/` 开头且不包含 `/avatar/` 或 `/uploads/` 的路径，会自动添加 `/avatar` 前缀，将其转换为正确的 URL（如 `http://localhost:8080/avatar/sangui.jpg`）。
- **文档**: 更新了 `NOTE.md`，详细说明了静态资源与头像的存储规则及 URL 映射逻辑。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.11`。

## V1.1.10 (2025-11-23)
- **新增**: 后端新增头像上传与静态资源服务功能。
    - 创建 `UploadController`，提供 `/api/upload/avatar` 接口用于上传头像。
    - 创建 `WebConfig`，配置静态资源映射，将 `/uploads/**` 路径映射到本地 `uploads/` 目录，确保上传的图片可以被访问。
    - 更新 `SecurityConfig`，允许公开访问 `/uploads/**` 路径，并允许认证用户访问上传接口。
- **修复**: 解决了本地存储的头像无法显示的问题（此前因缺少静态资源映射导致 404）。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.10`。

## V1.1.9 (2025-11-23)
- **修复**: 修复了文章详情页中元数据（发布时间、阅读时长、字数）丢失的问题。
    - 在 `ArticleDetail` 组件中重新添加了元数据展示区域。
    - 确保 `date` 从 `post` 对象读取，`readingTime` 和 `wordCount` 从 `articleData` 对象读取。
- **修复**: 增强了作者头像的显示逻辑。
    - 确保在 `post.authorAvatar` 为空时能正确回退到默认头像。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.9`。

## V1.1.8 (2025-11-23)
- **修复**: 再次修复文章详情页数据映射错误。
    - 发现上一次修复的代码未正确应用，导致错误的“标准化”逻辑依然存在。
    - 重新应用了简化后的数据映射逻辑，直接使用 `articleData.summary` 中的字段，移除了所有可能导致默认值（如“首页”、“Unknown”）的错误判断。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.8`。

## V1.1.7 (2025-11-23)
- **修复**: 再次修复文章详情页数据映射错误。
    - 修正了 `ArticleDetail` 组件获取文章元数据（`summary`）的逻辑。
    - 明确了后端 API 返回的是扁平化的 `PostSummaryDto`，移除了错误的多余标准化逻辑，确保 `category`、`authorName`、`excerpt` 等字段能正确从 `articleData.summary` 中读取。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.7`。

## V1.1.6 (2025-11-23)
- **修复**: 修复了文章详情页中分类、作者名、发布时间等信息丢失的问题。
    - 原因：后端 API 返回的原始数据结构（嵌套对象）与前端组件预期的扁平化结构不一致。
    - 解决：在 `ArticleDetail` 组件中增加了数据标准化（Normalization）逻辑，将 `post.category.name` 映射为 `category`，`post.author.displayName` 映射为 `authorName` 等，确保 UI 正确渲染。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.6`。

## V1.1.5 (2025-11-23)
- **修复**: 彻底修复了 `ArticleDetail` 组件的结构问题。
    - 恢复了意外丢失的“作者信息栏”（头像、作者名、分享按钮）。
    - 修正了 DOM 嵌套结构，确保 `article` 和 `CommentsSection` 正确包裹在主卡片容器内，解决了布局错乱和 JSX 闭合标签报错的问题。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.5`。

## V1.1.4 (2025-11-23)
- **修复**: 修复了 `AppFull.jsx` 中 `ArticleDetail` 组件的 JSX 语法错误（多余的闭合标签 `</div>`），解决了前端编译报错的问题。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.4`。

## V1.1.3 (2025-11-23)
- **修复**: 文章详情页作者头像显示异常的问题。
    - 修改了 `ArticleDetail` 组件，优先使用 `articleData` 中的真实数据。
    - 增加了对 `post.author.avatarUrl` 字段的支持，正确解析数据库返回的头像路径。
    - 统一了头像 URL 的处理逻辑（处理相对路径 `http://localhost:8080` 前缀）。
- **更新**: 将首页版本号更新为 `SANGUI BLOG // V1.1.3`。

## V1.1.2 (2025-11-22)
- **紧急广播操作简化**：后台设置区去掉“保存内容”按钮，点击“开启/关闭”即会立即写入最新内容与状态并提示结果。
- **Markdown 行内代码优化**：文章详情页重新调整 `code` 渲染策略，普通 `` `code` `` 文本保持与段落同行，仅多行或显式语言块会单独换行。
- **版本号刷新**：首页 Banner 版本号更新为 `SANGUI BLOG // V1.1.2`。

## V1.1.1 (2025-11-22)
- **紧急广播联动数据库**：后台的开关按钮现在可以直接切换状态并调用统一接口，保存时通过封装的 updateBroadcast API 写入数据库，避免只改前端本地状态的情况。
- **Markdown 渲染增强**：文章详情页改用 ReactMarkdown + GFM 解析 contentMd，并针对行内/块级代码做了样式处理，原先 `  ` 等符号无法正确渲染的问题已消失。
- **版本号更新**：首页 Banner 显示为 SANGUI BLOG // V1.1.1。

## V1.1.0 (2023-11-21)

- **功能增强**：后台管理界面的“紧急广播设置”现已与数据库连通。管理员可以实时更新广播内容和开关状态，前端会自动同步。
- **Bug修复**：修复了文章详情页 Markdown 内容无法正确渲染的问题。现在后端会自动将 Markdown 转换为 HTML 并返回给前端。
- **版本更新**：首页版本号更新为 V1.1.0。

## V1.0.2 (2025-11-21)

本次更新包含以下内容：
1. **修复 Unicode 乱码**：修复了后台管理界面（Admin Panel）中剩余的 Unicode 转义字符（如 `\u7d27\u6025...`），现在所有中文文案均正常显示。
2. **修复微信二维码显示**：
   - 将微信二维码图片从后端资源目录 `SanguiBlog-server/src/main/resources/static/contact/wechat.jpg` 复制到了前端公共目录 `SanguiBlog-front/public/contact/wechat.jpg`。
   - 更新了前端代码中的图片引用路径为 `/contact/wechat.jpg`。
   - 解决了在后端未启动或跨域情况下图片无法显示的问题。
3. **版本号更新**：首页显示为 `SANGUI BLOG // V1.0.2`。

## V1.0.1 (2025-11-21)
本次更新包含以下内容：
1. **后台文案汉化**：修复了后台管理界面（Admin Panel）中的中文乱码和占位符，将 Dashboard、Analytics、Create Post 等页面的英文/占位符替换为正确的中文文案。
2. **版本号更新**：首页显示为 `SANGUI BLOG // V1.0.1`。

## V1.0.0 (2025-11-21)
本次更新包含以下内容：
1. **修复微信二维码显示问题**：修正了前端硬编码的图片路径，现在正确指向后端静态资源 `http://localhost:8080/contact/wechat.jpg`。
2. **优化点击波纹动画**：将点击坐标获取方式从 `pageX/pageY` 改为 `clientX/clientY`，解决了动画跟随鼠标滞后/偏移的问题，提升了交互手感。
3. **更新版本标识**：首页 Banner 文字已更新为 `SANGUI BLOG // V1.0.0`。
4. **代码维护**：修复了 `AppFull.jsx` 中的 JSX 语法错误（多余的闭合标签）。
## V1.1.49 (2025-11-23)
- **????**??? PostService ?? commentRepository.countByPostIdAndStatus ????????????????????????????????
- **??**??? Banner ??? SANGUI BLOG // V1.1.49?

## V1.1.50 (2025-11-23)
- **????**????? PostService ?????????????????
- **????**???????????????????????????
- **??**??? Banner ??? SANGUI BLOG // V1.1.50?

## V1.2.0 (2025-11-24)
- **??**??? PostAssetService ? /api/upload/post-assets/
eserve ???slug ????????????????? /uploads/posts/<slug>/ ???????
- **??**??? /admin/create-post???????????????Markdown ?????????????????????????
- **??**?NOTE.md ??????????????????????????????
- **??**??? Banner ??? SANGUI BLOG // V1.2.0?

## V1.2.1 (2025-11-24)
- **??**?PostService ???/??????? created_at/updated_at/published_at???????????????????
- **??**??? Banner ??? SANGUI BLOG // V1.2.1?

## V1.2.2 (2025-11-24)
- **????**???????????????????Markdown ?? .assets ????????? slug ?????????????????
- **????**?ArticleDetail ? Markdown ? HTML ??????????????????? /uploads/<slug>/...???????????????????????????
- **??**??? Banner ??? SANGUI BLOG // V1.2.2?

## V1.2.3 (2025-11-24)
- **????**???????????????????.assets ??????????????????????
- **????**???? Markdown/HTML ????????? slug ?? /uploads/<slug>/... ????????????? 404?
- **??**??? Banner ??? SANGUI BLOG // V1.2.3?

## V1.2.4 (2025-11-24)
- **????**?????????????? .assets ???????????????????????? Markdown ??????????????
- **????**??????? slug ?? /uploads/<slug>/...???????????????? Markdown ???
- **??**??? Banner ??? SANGUI BLOG // V1.2.4?

## V1.2.5 (2025-11-24)
- **后端**：`/api/upload/post-assets` 改为按 slug 追加图片并返回 `files`、`urls` 与分号拼接的 `joined` 字符串，方便直接粘贴入数据库字段且不会误删已有资源。
- **前端**：后台发布页移除“文件夹上传”，新增“插入图片”按钮与光标注入逻辑，同时在侧栏展示资源 slug 提示，图片上传后即可写入 Markdown。
- **文档**：同步更新 NOTE.md，描述新的发布流程及静态资源策略，强调 joined 用法。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.5`。

## V1.2.9 (2025-11-24)
- **后端**：新增 `AdminPostDetailDto` 及 `/api/admin/posts/{id}`，后台可读取任意文章的 Markdown、分类与标签元数据，继续复用 `SavePostRequest` 保障 slug 唯一性。
- **前端**：`PostsView` 改为跳转新建的 `EditPostView`，该页面支持独立选择文章、复用发布模板编辑正文/元信息，并保留 Markdown 上传、插图与分类标签选择。
- **文档**：NOTE.md “3.5 后台文章管理” 描述新的编辑流程与接口依赖。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.9`。

## V1.2.10 (2025-11-24)
- **前端**：修复文章列表与后台编辑页的中文文案乱码问题，包含分页提示、筛选占位符、表头及按钮文本，确保切换到新编辑页后的全部提示均正确显示。
- **前端**：`AnalyticsView` 标题及版本 Banner 更新为可读中文，避免再次出现 `????` 等占位字符。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.10`。

## V1.2.11 (2025-11-24)
- **前端**：后台发布页新增主题色选择器，支持自由取色及 6 个预设颜色（含 bg-[#00E096]、bg-[#6366F1]、bg-[#FF0080] 等），创建文章时可直接写入 `theme_color`。
- **前端**：文章编辑页复用同一选择器，方便修改现有文章的主题色并即时预览。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.11`。

## V1.2.12 (2025-11-24)
- **后端**：新增 `/api/admin/users` 全量 CRUD 及角色列表接口，`AdminUserService` 负责校验用户名/邮箱唯一、分配角色并对密码做加密存储。
- **前端**：AdminPanel 新增“用户管理”页面，可对账号进行增删改查、直接切换角色并重置密码，同时延续只读信息卡片的展示方式。
- **文档**：NOTE.md 增补“3.8 用户管理”说明后台表单行为与接口，便于后续扩展。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.12`。

## V1.2.13 (2025-11-24)
- **修复**：用户管理页的所有中文文案恢复正常显示，并在选择用户后自动滚动到编辑表单，避免手动滑动。
- **体验**：角色与状态下拉、表格标题、分页提示及确认提示改为中文，可明确告知操作含义。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.13`。

## V1.2.15 (2025-11-24)
- **前端**：`/admin/users` 的关键词与角色筛选现在使用请求令牌防抖，旧请求结果不再覆盖最新筛选，列表会稳定展示筛选后的数据。
- **后端**：`PostService#getAdminDetail` 抛出的“文章不存在”提示改为纯中文，彻底消除异常信息中的乱码。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.15`。

## V1.2.16 (2025-11-24)
- **前端**：用户管理页的“新建用户”按钮会自动平滑滚动到表单区域，便于立即填写；关键词与角色筛选完全依托后端分页，总数与翻页在筛选后依旧准确可用。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.16`。

## V1.2.17 (2025-11-24)
- **前端**：首页二级分类导航下方新增“全部标签”展示区，自动汇总站内所有标签并以粗野主义徽章样式呈现，方便访客快速了解内容热点。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.17`。

## V1.2.18 (2025-11-24)
- **前端**：`useBlogData` 新增标签数据源，首页“全部标签”区域改为读取真实接口返回的完整标签列表，避免仅显示当前分页文章中的少量标签。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.18`。

## V1.2.19 (2025-11-24)
- **前端**：首页标签区下方新增“最新评论”卡片，展示最近 5 条经审核的评论，包含作者、时间、内容和跳转文章按钮，突出社区活跃度。
- **后端**：新增 `GET /api/comments/recent?size=5` 接口及 `CommentDto` 扩展字段（postId/postTitle/postSlug），`useBlogData` 会在初始化和评论增删改后自动刷新该列表。
- **文档**：NOTE.md “4.5 评论与楼中楼” 补充了 `recent` 接口说明，确保未来开发了解数据来源。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.19`。

## V1.2.20 (2025-11-25)
- **前端**：首页“全部标签”区域默认收起，仅展示 9 个标签徽章，并新增“展开全部/收起标签”按钮以保持视觉节奏，同时仍可查看完整标签列表。
- **前端**：最新评论卡片去除跳转按钮，改为将评论正文本身作为交互入口，hover 则提示所属文章，点击可定位到文章详情里的对应评论并自动高亮 3 秒。
- **文档**：NOTE.md “4.5 评论与楼中楼” 补充最新评论跳转与高亮逻辑，帮助后续维护理解锚点策略。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.20`。

## V1.2.21 (2025-11-25)
- **前端**：文章卡片不再依赖 `whileInView` 才进入视口，刷新页面位于文章区时也能立即看到列表，避免“需要先滚动到顶部再滚回”才能显示的空白问题。
- **前端**：回到顶部按钮支持拖拽定位并将坐标写入 `localStorage`，下次访问会保持自定义位置，同时在拖动后不会误触发回到顶部。
- **前端**：最新评论跳转携带评论 ID 或回退到评论区顶部，`CommentsSection` 在加载后自动滚动并高亮目标，确保点击后直接查看对应讨论。
- **文档**：NOTE.md “4.5 评论与楼中楼” 补充了最新评论缺少 ID 时的回退逻辑说明。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.21`。

## V1.2.22 (2025-11-25)
- **前端**：最新评论卡片移除黄色提示条，hover 仅保留原有 `title` 提示；点击后直接跳转至文章顶部，避免滚动到具体评论失败的体验。
- **前端**：评论模块恢复普通渲染逻辑，去除无用的锚点高亮；文章卡片点击也不再携带额外状态，整体行为更自然。
- **构建**：`.gitignore` 增补前端构建缓存、环境文件与服务器端目标目录的忽略配置，避免误提交体积较大的产物。
- **文档**：README.md 重写为部署手册，NOTE.md 同步描述最新评论的跳转策略。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.22`。

## V1.2.23 (2025-11-25)
- **前端**：夜间模式下的一级分类按钮采用金色边框+黑色文字，最新评论与全部标签标题也统一为白色，保证暗色背景下可读性。
- **前端**：文章详情中的所有图片都支持点击预览大图（含 Markdown 与 HTML 渲染内容），配合遮罩层与滚动锁定，改善长图阅读体验。
- **交互**：最新评论点击后滚动至文章顶部，同时文章视图切换时自动回到页面开头，避免暗色模式下的留白误差。
- **文档**：NOTE.md 记录图片预览与最新评论跳转策略，方便后续接手者理解行为。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.23`。

## V1.2.24 (2025-11-25)
- **修复**：`handleImagePreview` 在定义前被 `useEffect` 调用导致文章页崩溃，现将预览回调上移并确保依赖正确，点击文章即可正常进入。
- **前端**：暗色主题下的一级分类 hover 样式不再变成浅灰色，维持深色底与白色文字，避免与背景撞色。
- **体验**：完善图片预览遮罩的滚动锁定逻辑，关闭遮罩即可恢复页面滚动。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.24`。

## V1.2.25 (2025-11-26)
- **后端**：`SecurityConfig` 将 `/api/comments/**` 加入匿名访问白名单，`/api/comments/recent` 不再要求登录，首页访客也能看到最新评论。
- **前端**：更新首页 Banner 版本文案为 `SANGUI BLOG // V1.2.25`，确保显示版本与本次修复保持一致。
- **文档**：NOTE.md “4.5 评论与楼中楼” 补充最新评论接口的安全策略，提醒只放开读取权限，写操作仍由 `/api/posts/**` 权限控制。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.25`。

## V1.2.26 (2025-11-26)
- **前端**：首页文章卡片在最近 7 天内发布的内容旁新增 “NEW” 闪动徽章，基于 `post.date` 自动判断，让访客快速识别新文章。
- **前端**：后台 `/admin/posts` 列表去掉标题下方的 Slug 文本，并按照“已发布/草稿/已归档”分别涂抹绿色、琥珀色、灰色底纹，管理员无需额外点击即可区分状态。
- **文档**：NOTE.md 在“3.2 前端架构”“3.5 后台文章管理”补充以上前端行为，方便后续维护遵循同一逻辑。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.26`。

## V1.2.27 (2025-11-26)
- **后端**：新增 `site.footer.*` 配置项（年份、品牌、备案号、备案链接、Powered-by 文案），`SiteMetaDto` 输出 `footer` 信息供前端消费。
- **前端**：首页 Footer 改为读取后端配置，展示 `Copyright © <year> <brand> All rights reserved.`，备案号使用动态超链接并默认跳转至工信部备案系统，同时追加 Powered by 文案。
- **配置**：`application.yaml` 提供默认值，运营可通过环境覆盖年份、品牌名称、备案号及链接。
- **文档**：NOTE.md “3.2 前端架构” 增补新 Footer 行为与 YAML 配置说明，避免后续接入遗漏。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.27`。

## V1.2.28 (2025-11-26)
- **前端**：将首页“全部标签”徽章的配色收敛为深浅灰系，并针对明暗模式分别应用柔和背景与字体色，保持粗犷风格同时避免过度花哨。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.28`。

## V1.2.29 (2025-11-26)
- **前端**：全部标签徽章进一步统一为单一配色（明暗模式下分别对应灰调背景 + 对比字体），彻底消除色块循环带来的干扰，视觉更克制。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.29`。

## V1.2.30 (2025-11-26)
- **前端**：首页“全部标签”支持点击筛选文章，选中标签后列表即时过滤，仅展示包含该标签的文章，并提供清除筛选入口保持交互直观。
- **交互**：标签徽章改为可点击按钮并在激活时高亮，避免误触无法反馈的问题。
- **文档**：NOTE.md “3.2 前端架构” 说明标签筛选行为及状态同步规则，方便后续维护。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.30`。

## V1.2.31 (2025-11-26)
- **前端**：封装统一的 `scrollToPostsTop` 逻辑，点击“START READING”、标签筛选或分页按钮时都会滚到第一篇文章的顶部，自动预留导航栏高度，避免停在中间。
- **交互**：标签清除按钮和筛选点击后都会触发平滑滚动，确保读者在筛选内容后立即看到列表首篇。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.31`。

## V1.2.32 (2025-11-27)
- **前端**：后台 `/admin/create-post` 与 `/admin/posts/edit` 在发布 / 保存成功后新增右上角悬浮提示栏，延续本站霓虹配色并在 4 秒后自动消失，取代原本不显眼的小字反馈。
- **体验**：提示栏可手动关闭，失败场景仍以内联红字提示，既保持可见性也避免遮挡工作流。
- **文档**：NOTE.md “3.5 后台文章管理”“3.7 后台文章发布” 同步记录成功提示栏行为与时长，后续维护遵照同一交互。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.32`。

## V1.2.33 (2025-11-27)
- **前端**：实现后台 `/admin/comments` 评论管理页，支持按文章或“全部文章（当前列表）”双模式浏览评论树，提供刷新、统计、分页检索功能，并可直接在列表中回复、编辑或删除评论。
- **前端**：新增评论创建/回复表单，支持快速指向目标文章、选择父级评论、填写署名并提交，所有操作使用现有 `/posts/{id}/comments` API 完成 CRUD。
- **文档**：NOTE.md 追加“后台评论管理”章节，说明筛选模式与 CRUD 入口的工作方式，便于后续扩展审批流程。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.33`。

## V1.2.34 (2025-11-27)
- **后端**：新增 `AdminAnalyticsController` 提供 `/api/admin/analytics/summary` 聚合接口，基于 `analytics_page_views` 与 `analytics_traffic_sources` 统计区间 PV/UV、登录访问、热门文章和最近访客信息，仅 ADMIN / SUPER_ADMIN 可访问。
- **前端**：后台仪表盘 Dashboard 改为消费真实 Summary 数据，展示双行 KPI、趋势折线、流量来源、热门文章与最近访客（含文章、IP、时间、登录标识），支持一键刷新。
- **前端**：`/admin/analytics` 数据分析页支持 7/14/30 天切换，提供趋势图、流量来源、热门文章表格以及详细访问日志（文章、IP、时间、来源、Geo、用户状态），满足“可查看最近访客访问了哪些文章、何时访问、是否登录”的需求。
- **文档**：NOTE.md 新增“3.10 后台仪表盘与数据分析”记录接口结构、前端行为及可配置项。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.2.34`。

## V1.3.0 (2025-11-27)
- **后端**：`CommentService` 新增后台搜索/编辑能力，`/api/admin/comments` 支持分页、审核与删除；`AnalyticsService` 写入真实 `analytics_page_views`/`analytics_traffic_sources` 并默认跳过超级管理员，同时暴露 `/api/admin/analytics/page-views/me` 清理自身日志。
- **前端**：重写 `/admin/comments`，支持文章范围、状态筛选、关键字搜索以及基于权限的回复/审核/删除，并以 `AdminNoticeBar` 提示结果；`PermissionsView` 读取真实矩阵，可勾选 ADMIN/USER 两列并保存。
- **权限**：新增 `permissions_seed.sql`，同步 NOTE.md 说明，可用于初始化 `permissions`/`role_permissions`；超级管理员专属的权限矩阵页面成为唯一配置入口。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.0`。

## V1.3.1 (2025-11-27)

- **后端**：`DataInitializer` 支持 `app.bootstrap.*-password` 配置（Super Admin/Admin/Editor + default），启动时会检测旧的 `123456` 哈希并自动换成强密码，彻底消除浏览器弱密码告警。
- **后端**：`AnalyticsService.recordPageView` 仅在 `pageTitle/referrer` 含 `admin` 时跳过 SUPER_ADMIN，访问首页或文章时仍会写入 `analytics_page_views` 与 `analytics_traffic_sources`，解决自测无数据的问题。
- **前端**：首页 Hero Banner 版本标识更新为 `SANGUI BLOG // V1.3.1`，与本次补丁保持一致。
- **文档**：NOTE.md “4.6 数据采集”“4.7 初始账号与默认密码” 说明新的统计规则和密码配置项，提醒上线前通过环境变量覆写。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.1`。

## V1.3.2 (2025-11-27)
- **后端**：`PostService.incrementViews` 在每次成功 +1 浏览量后直接构造 `PageViewRequest` 调用 `AnalyticsService.recordPageView`，以文章真实标题落地 `analytics_page_views`/`analytics_traffic_sources`，避免前端记录异常导致后台无数据。
- **前端**：首页 Banner 再次同步为 `SANGUI BLOG // V1.3.2`，提示管理端本次 bugfix 已上线。
- **文档**：NOTE.md “4.6 数据采集” 补充文章详情页由服务端兜底写入 PV 的策略，保证未来排查有据可循。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.2`。

## V1.3.3 (2025-11-27)
- **后端**：`PostService.incrementViews` 在调用 `AnalyticsService` 失败时增加直接写库兜底，并记录日志，确保 `analytics_page_views` 必定落地，同时说明 1 分钟内存限流 + 10 分钟 DB 去重的行为规则。
- **前端**：首页 Banner 更新为 `SANGUI BLOG // V1.3.3`，提示最新统计修复已部署。
- **文档**：NOTE.md 的“3.9/3.10/3.11/4.6/4.7” 重新写成可阅读的说明（暂以英文描述以避免乱码），并补充服务端 PV 兜底与密码配置指南。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.3`。

## V1.3.4 (2025-11-28)
- **后端**：`SecurityConfig` 与全部 Admin/帖子/评论控制器改用 `PERM_*` 授权，`/api/posts` 写操作、评论公开接口也依据权限判定，确保在权限矩阵调整后立即生效，超级管理员可直接在文章页删除/编辑任意评论。
- **前端**：权限上下文上移到全局，登录用户均可进入后台个人资料；后台导航与按钮依据权限精确展示/隐藏，仪表盘自动跳转到首个可用模块。
- **评论管理**：`/admin/comments` 恢复评论列表、分页、审核/删除操作与后台回复表单，支持过滤范围统计、逐条审核；文章详情评论区新增管理员编辑/删除按钮以匹配后端放权。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.4`。

## V1.3.5 (2025-11-28)
- **后端**：`DataInitializer` 在检测弱密码时若遇到非 BCrypt 哈希将仅记录警告并跳过，不再把超级管理员等账号强制改写为默认口令，避免 V1.3.1 引入的“密码被自动重置”问题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.5`。

## V1.3.6 (2025-11-28)
- **前端**：后台文章列表根据权限自动隐藏“打开编辑页”按钮，防止普通用户误跳转至无权限页面；标题列新增链接，点击可在新标签页直接预览 `/article/{id}` 页面。
- **UI**：文章列表状态列添加固定宽度以容纳三字中文状态，整体阅读更清晰。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.6`。

## V1.3.7 (2025-11-28)
- **后端**：`AnalyticsService.recordPageView` 改为独立事务并默认兜底 IP/来源写入，`updateTrafficSourceStat` 支持冲突重试与失败降级，避免统计异常导致文章浏览量回滚。
- **前端**：首页 Banner 版本文案提升至 `SANGUI BLOG // V1.3.7`，提示本次浏览量修复已上线。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.7`。

## V1.3.8 (2025-11-28)
- **后端**：`DataInitializer` 不再读取 `app.bootstrap.*-password` 也不会替换账号密码，只在缺失时补齐默认角色，防止启动时误改口令。
- **文档**：NOTE.md “4.7” 更新为“仅保留角色兜底 + 人工改密流程”，提醒后续维护者手工轮换。
- **前端**：首页 Banner 版本文案提升至 `SANGUI BLOG // V1.3.8`，同步提示本次口令策略调整。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.8`。

## V1.3.9 (2025-11-28)
- **后台用户**：创建/编辑用户支持直接上传头像（沿用个人资料页同一上传逻辑），列表新增头像展示并将默认角色预设为 USER，避免误建超级管理员。
- **前端**：夜间模式下 `/admin/profile` 只读信息徽章改用高对比度底色与文字，确保可读性；首页 Banner 更新为 `SANGUI BLOG // V1.3.9`。
- **文档**：NOTE.md “3.8 后台用户管理” 补充头像上传与默认角色策略，便于后续维护。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.9`。

## V1.3.10 (2025-11-29)
- **前端**：重构紧急广播与导航头部为统一固定容器，广播高度实时上报并驱动导航、Stats 条、粘性 Topbar 等组件读取共享 offset，确保任何页面的顶部导航都不会再被遮挡。
- **体验**：文章详情的分享提示、返回按钮、错误提示以及后台通知条均改用安全上边距，伴随紧急广播开关自动调整显示位置，滚动时的交互提示不再覆盖导航。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.10`。

## V1.3.11 (2025-11-29)
- **前端**：紧急广播新增“温和公告”样式，管理员可在后台切换告警/庆典风格并实时预览；对应的 EmergencyBar 根据样式自动调整色彩、图标与动画。
- **后端**：SystemBroadcast、新增广播 style 字段并透传至 `/api/site/meta` 与 `/api/site/broadcast`，数据库 schema、DTO、Service 均已扩充，历史广播默认回落为 ALERT。
- **文档**：NOTE.md “5. 紧急广播” 补充样式与字段说明，方便后续扩展更多主题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.11`。

## V1.3.12 (2025-11-29)
- **后端**：`/api/admin/users` 支持携带 `avatarUrl`，AdminUserService 在更新用户时会统一规范头像路径、落库并在文件变化后删除旧头像，逻辑与个人资料页保持一致。
- **前端**：后台用户管理的头像上传仍沿用统一接口，但保存时会把最新 `avatarUrl` 一并提交，确保数据库与文件系统同步。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.12`。

## V1.3.13 (2025-11-29)
- **文章详情**：博主信息卡优先读取站点作者头像（`/api/site/meta.author.avatar`），当文章摘要缺少 `authorAvatar` 时也能落在真实头像而非 Mock。
- **布局**：文章详情容器顶部内边距与返回按钮重新对齐，去除多余的 24px 偏移，避免因紧急广播改造带来的整体下移。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.13`。

## V1.3.14 (2025-11-29)
- **文章详情**：右侧新增“直达评论区”按钮，沿用站点 Neo-Brutalism 风格（黑框+阴影），点击即可平滑滚动到评论列表；评论容器新增锚点，方便未来复用。
- **交互**：按钮默认在桌面端展示，移动端可继续通过原有滚动方式浏览，整体视觉与返回按钮保持统一。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.14`。

## V1.3.15 (2025-11-29)
- **体验**：评论快捷按钮与“返回首页”按钮对称摆放在文章顶部两侧，并在所有终端可见，点击即可平滑滚动到评论区，保持整体交互一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.15`。

## V1.3.16 (2025-11-29)
- **后端**：`/api/site/meta` 新增 `version` 字段，可通过 `application.yaml` 的 `site.version` 统一配置，前端 Banner 直接读取该值展示。
- **静态资源**：`api.js` 重新引入 `VITE_API_BASE` / `VITE_ASSET_ORIGIN` 配置并默认回落到 `http://localhost:8080`，所有 `/avatar`、`/uploads` 链接现在会自动拼接后端域名，文章详情页博主头像不再退回 Mock。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.16`。

## V1.3.17 (2025-11-29)
- **评论区**：允许回复二级评论，按钮对所有评论可见。回复二级评论时系统自动在内容前加上 `@原评论者：` 并仍以二级结构展示，确保楼中楼讨论保持扁平外观。
- **资源加载**：评论头像改用统一的 `ASSET_ORIGIN`，避免因不同部署环境导致头像链接指向错误。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.17`。

## V1.3.18 (2025-11-29)
- **协作规范**：修复 `AGENTS.md` 乱码并重写任务指令，强调输出格式、版本管理和 NOTE/AGENTS-EDIT 维护要求，避免后续代理执行出错。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.18`。

## V1.3.19 (2025-11-29)
- **配置安全**：`application.yaml` 的数据库用户名、密码与 JWT Secret 均改为通过 `DB_USERNAME`、`DB_PASSWORD`、`JWT_SECRET` 注入，不再在仓库中保留明文，避免仓库外泄时数据库与令牌体系同步暴露。
- **前端版本**：前端 Banner 兜底版本与 `site.version` 同步到 `V1.3.19`，保证显示一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.19`。

## V1.3.20 (2025-11-29)
- **配置兼容**：为防止本地/生产环境仅设置 `SPRING_DATASOURCE_*` 等原生变量导致占位符无法解析，`application.yaml` 现优先读取 `DB_*`，若缺失将回落至 `SPRING_DATASOURCE_*` 或 `SPRING_JWT_SECRET`，并在缺少凭证时给出明确提示。
- **文档**：NOTE.md “静态资源与站点配置” 小节同步说明新的变量兼容策略，提醒开发者不要再把明文凭证写回仓库。
- **前端版本**：Banner fallback 升级为 `V1.3.20`，与后端 `site.version` 保持一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.20`。

## V1.3.21 (2025-11-29)
- **安全**：评论删除/编辑必须同时匹配 `postId` 与 `commentId`，后端在 Service 层二次校验评论所属文章，阻断通过猜测评论 ID 越权删改他人文章评论的可能性。
- **前端版本**：首页 Banner fallback 与 `site.version` 同步到 `V1.3.21`，确保显示最新补丁号。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.21`。

## V1.3.22 (2025-12-01)
- **主页导航**：品牌字样统一为黑/白配色并通过 LayoutGroup + `layoutId` 提供的动态下划线展示当前视图，CTA 以外的元素移除热粉色，导航边框与头像区域保持深浅色模式一致的黑白/金色层级。
- **Hero Banner**：叠加锥形渐变与噪点纹理动画，重新分配高光色并让「Start Reading」按钮改用热粉色，突出唯一 CTA。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.22`。

## V1.3.23 (2025-12-01)
- **前端/导航**：桌面导航与标签筛选区改用 AnimateSharedLayout，共享 layoutId 的金色高亮会以 0.05s 延迟在所选项间滑动，交互逻辑继续沿用既有 state。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.23`。

## V1.3.24 (2025-12-01)
- **文章卡片**：列表卡片 hover 改为 `whileHover={{ y: -6, rotate: -1 }}` 并配合 spring 过渡，在微微上浮/倾斜的同时保留原有点击事件。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.24`。

## V1.3.25 (2025-12-01)
- **共用按钮**：PopButton 引入基于指针坐标的局部波纹与点击弹簧动画，波纹色值复用主色/边界逻辑、持续 0.45s，统一与全局 ripple 工具的反馈风格，同时保持 hover 放大与原 onClick 事件。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.25`。

## V1.3.26 (2025-12-01)
- **文章卡片**：左侧彩色区的 Code 背景改为 motion 图层，继承卡片的 `whileHover="hover"` 状态并以 spring 过渡实现渐隐+轻微放大，强化浮雕观感。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.26`。

## V1.3.27 (2025-12-01)
- **标签筛选**：标签 chip 改用 `motion.button layout` + `AnimatePresence`，在展开/收起和分页切换时以 spring 方式进出场并保持共享高亮，整个区域 `motion.div layout` 保障平滑重排。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.27`。

## V1.3.28 (2025-12-01)
- **标签筛选**：根据视觉反馈移除 `layout/exit` 动画，恢复为静态 flex 渲染，仅保留共享高亮的 AnimateSharedLayout，列表展开/分页时不再额外缩放。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.28`。

## V1.3.29 (2025-12-01)
- **按钮动效**：PopButton `whileHover` 叠加 boxShadow 动画，配合现有波纹与点击弹簧，让 Hero CTA/社交按钮在 Neo-Brutalism 风格下具备更强的层级感；不同变体按需调整 hover/tap 阴影。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.29`。

## V1.3.30 (2025-12-01)
- **滚动反馈**：返回顶部漂浮按钮新增 ScrollIndicator，使用 `useSpring` 驱动的圆形 `motion.svg` 路径实时呈现滚动进度，并在拖拽/点击逻辑保持不变的情况下同步更新可见性；辅助 aria 标签显示百分比。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.30`。

## V1.3.31 (2025-12-01)
- **滚动反馈**：根据反馈缩小 ScrollIndicator 的 SVG 半径并将按钮内部容器改回原始 40px 尺寸，恢复「一键回顶」的整体占位感，同时保留滚动进度显示。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.31`。

## V1.3.32 (2025-12-01)
- **导航分隔**：在广播条与 Navigation 之间新增 `motion.div` 脉冲下划线，复用 `layoutId` 处理当前视图变化与提示状态，切换视图时会以金色-粉色-靛紫渐变闪动，强化顶部反馈。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.32`。

## V1.3.33 (2025-12-01)
- **导航彩蛋**：Logo 连续点击五次会触发 “DEV MODE READY” 提示，采用 AnimatePresence 弹出徽章，不影响原有 view 切换逻辑。
- **滚动彩蛋**：当滚动到底部后点击返回顶部按钮，将生成一组烟花粒子，与 ScrollIndicator 共存且拖拽/回顶行为保持原状。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.33`。

## V1.3.34 (2025-12-01)
- **彩蛋优化**：DEV 徽章改为居中大号霓虹样式，增加描边与投影，确保重复点击时信息更醒目；返回顶部的烟花粒子数量、尺寸、飞行距离全面提升，形成更明显的爆裂效果。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.34`。

## V1.3.35 (2025-12-01)
- **图层修复**：DEV 徽章提升到 z-50 并保持指针穿透，避免被导航下方脉冲线覆盖；脉冲线本身下降到基层 `z-0`，仍随视图切换进行渐变动画。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.35`。

## V1.3.36 (2025-12-01)
- **导航分隔**：去掉导航下方脉冲线的 layout 动画，改为静态 motion.div 仅根据广播开关调整透明度，避免从下往上的跳动；Navigation 参数恢复 `setIsDarkMode` 以保持原逻辑。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.36`。

## V1.3.37 (2025-12-01)
- **主题切换**：SanGuiBlog 恢复 `handleThemeToggle`，导航按钮直接翻转深浅色并写回 localStorage，修复 `values[i].get` 与 `handleThemeToggle is not defined` 的运行时错误。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.37`。

## V1.3.38 (2025-12-01)
- **标签云**：标签筛选按钮在 Idle 状态自动进行轻微 scale/opacity 呼吸动画，点击后触发短暂放光效果，与现有共享高亮一起表现选中状态。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.38`。

## V1.3.39 (2025-12-01)
- **标签云**：根据视觉反馈移除标签 Idle 呼吸与放光动画，恢复为静态按钮，仅保留共享高亮与阴影动效，避免干扰阅读。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.39`。

## V1.3.40 (2025-12-01)
- **滚动指示器**：浅色模式下的返回顶部按钮进度环改为白色半透明轨迹 + 金色进度，确保明亮背景也可清晰识别。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.40`。

## V1.3.41 (2025-12-01)
- **滚动指示器**：进度环外置至按钮周围，中心箭头与烟花特效保留，拖拽逻辑不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.41`。

## V1.3.42 (2025-12-01)
- **滚动指示器**：外置圆环缩回至紧贴按钮（scale≈1.35、半径 16px），防止按钮本体被遮挡。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.42`。

## V1.3.45 (2025-12-01)
- **主题切换**：辐射动画升级为“毒液喷射”风格：随机波浪 blob 结合斜向光带，先喷射再切换深浅色，没有中心模糊圈，赛博感更强。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.45`。

## V1.3.46 (2025-12-01)
- **主题切换**：去掉持续光斑条纹，改为带 `clipPath` 的旋转光圈；每次点击都生成新的 ID 以保证动画可重复触发，即使快速连击也能保持爆发感。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.46`。

## V1.3.47 (2025-12-01)
- **主题切换**：光圈改用随机 `polygon` clipPath 生成“毒液喷射”形状，并随角度/旋转变化，连击时也能持续触发，视觉更不对称、更具赛博味。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.47`。

## V1.3.48 (2025-12-01)
- **主题切换**：进一步加入“液态触须”——随机生成多条 tendril 叠加在喷射 blob 上，喷发/扭动后再切换深浅色，整体更像毒液喷射的流动感。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.48`。

## V1.3.49 (2025-12-01)
- **背景彩蛋**：白天模式在背景显示太阳+云雾动画，夜晚模式出现月亮、星星与流星，均为 pointer-events-none 的装饰层，不影响交互。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.49`。

## V1.3.51 (2025-12-01)
- **背景彩蛋**：增强白天的太阳光晕与云朵阴影，并大幅提高夜间流星数量与轨迹（含对角运动），让昼夜元素在背景中明显可见。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.51`。

## V1.3.52 (2025-12-01)
- **版本同步**：首页 Banner fallback 及 `site.version` 默认值更新至 V1.3.52，确保前端展示与最新改动保持一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.52`。

## V1.3.53 (2025-12-02)
- **模块/页面**：登录视图在认证失败时仅展示响应内的 `message` 字段，API 层同步提取该字段避免再次把整段 JSON 原文暴露给用户。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.53`。

## V1.3.54 (2025-12-02)
- **模块/页面**：新增 `site.asset-base-url` 配置并通过 `/api/site/meta.assetBaseUrl` 暴露给前端，`buildAssetUrl`、首页导航、文章列表和管理员资料页统一引用该域名生成 `/uploads`、`/avatar`、`/contact` 图片地址，避免硬编码 `localhost` 导致外网无法访问。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.54`。

## V1.3.55 (2025-12-02)
- **模块/页面**：`buildAssetUrl` 现在会识别 `site.asset-base-url`/`VITE_ASSET_ORIGIN` 中额外的路径（如 `.../uploads`），自动去重重复的段落，确保文章内图片不会再次出现 `uploads/uploads/...` 的错误链接。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.55`。

## V1.3.56 (2025-12-02)
- **模块/页面**：完成“归档”视图，按年份与月份展示完整文章时间轴，支持快速跳转文章、刷新归档数据与返回首页，并保持 Neo-Brutalism 风格。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.56`。

## V1.3.57 (2025-12-02)
- **文章详情**：背景服从首页昼夜彩蛋、顶部返回按钮改为“返回”且依据入场来源（首页/归档等）智能跳回，评论区“后台管理”按钮与暗色模式样式保持一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.57`。

## V1.3.58 (2025-12-02)
- **视觉统一**：昼夜彩蛋改为 `fixed` 覆盖整页，文章详情不再闪烁或滚动错位，白天云朵重新设计为柔和渐层造型；归档右侧新增月份速选面板，支持平滑定位到对应月份。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.58`。

## V1.3.59 (2025-12-02)
- **归档体验**：快速跳转按钮取消上移动画并加投影，避免与卡片白边重叠；白天彩蛋仅保留太阳光晕，不再显示云朵。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.59`。

## V1.3.60 (2025-12-02)
- **彩蛋开关**：导航新增“彩蛋 ON/OFF”按钮（默认开启），状态持久化到本地，控制是否渲染太阳/月亮背景；按钮位于主题切换左侧并与整体风格一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.60`。

## V1.3.61 (2025-12-02)
- **返回顶部按钮**：白天模式的滚动进度环移至按钮外圈，改用高对比描边，进度轨迹在平面外侧旋转，鼠标悬停仍保留喷火特效。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.61`。

## V1.3.62 (2025-12-02)
- **返回顶部按钮**：在白天模式下进一步优化按钮（回归原始尺寸、箭头增亮且进度环置于外圈），确保浅色背景也能清晰分辨滚动进度。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.62`。

## V1.3.63 (2025-12-02)
- **文章分页**：在页码条两侧新增“|<”“>|”快捷按钮，可一键跳到第一页或最后一页，保持原有风格与交互状态。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.63`。

## V1.3.64 (2025-12-02)
- **分页图标**：页码条的“跳到首尾页”按钮改用 Lucide `ChevronsLeft/ChevronsRight` 图标，视觉更统一并与其余导航图标保持一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.64`。

## V1.3.65 (2025-12-03)
- **后台侧边栏**：`/admin` 左侧菜单分组为“概览 / 创作管理 / 内容体系 / 运营互动 / 用户与权限 / 个人与系统”二级结构，保留原有路由与权限过滤，只调整层级与样式。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.65`。

## V1.3.66 (2025-12-03)
- **后台侧边栏标题移除**：移除左侧菜单顶部 “SANGUI // ADMIN” 文案，让菜单项自顶显示，保留现有分组与交互。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.66`。

## V1.3.67 (2025-12-03)
- **顶部导航设置抽屉**：移除头像旁后台入口齿轮与导航区的彩蛋开关，将“彩蛋背景”开关收纳到全局齿轮弹窗（登录态与未登录态均可见）并新增齿轮按钮位于主题切换左侧。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.67`。

## V1.3.68 (2025-12-03)
- **导航设置弹窗修复**：修正导航组件 JSX 结构，解决 Vite React Babel “Adjacent JSX elements” 报错，保留齿轮弹窗与彩蛋开关收纳逻辑。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.68`。

## V1.3.69 (2025-12-03)
- **关于页面**：新增“关于本站”前台页面，访客与管理员可阅读；超级管理员在后台“关于站点”单页以 Markdown 编辑/上传，一键刷新前台内容。
- **后台编辑**：在后台新增“关于站点”标签（仅超级管理员可见），提供简化编辑器（仅正文 Markdown/文件上传），省略主题色、分类、摘要、标签等字段。
- **数据库**：新增 `about_page` 表及初始化空记录，持久化关于页正文与更新人。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.69`。

## V1.3.70 (2025-12-03)
- **关于页编辑优化**：后台 about 单页移除实时预览，新增 Markdown 图片上传（复用文章上传链路，自动插入光标位置），保留 MD 文本域与刷新/保存动作。
- **关于页渲染优化**：前台关于页改用 ReactMarkdown（与文章详情同套解析链路），支持 GFM/Math/Raw/KaTeX，暗色模式与彩蛋背景保持一致，代码块样式与文章详情统一，超级管理员可从前台跳转后台编辑。
- **跳转修复**：前台“编辑关于”按钮强制跳转 `/admin/about`，避免偶发落到后台主页。
- **版本**：首页 Banner 更新为 SANGUI BLOG // V1.3.70。


## V1.3.71 (2025-12-03)
- **代码块统一**：关于页与文章详情共用 Mac 风代码框（更大三色圆点+CODE 标签，左右内边距加大，浅色白底/深色夜底，缩进一致）。
- **版本**：首页 Banner 更新为 SANGUI BLOG // V1.3.71。

## V1.3.72 (2025-12-03)
- **关于页渲染**：关于页 Markdown 渲染与文章详情完全同步：图片预览不再触发滚动条跳动，暗色内容卡片改用文章页同款浅色底，代码块采用统一的 not-prose 包装与内边距，左侧留白到位。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.72`

## V1.3.73 (2025-12-03)
- **后台侧边栏**：移除“概览”分组，仪表盘作为一级菜单直接展示，其余分组保持层级与样式不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.73`

## V1.3.74 (2025-12-03)
- **安全配置**：`application.yaml` 恢复通过环境变量注入数据库账号、口令与 JWT 密钥，移除硬编码默认值；同步站点版本号为 1.3.74。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.74`

## V1.3.75 (2025-12-03)
- **Swagger 加固**：默认关闭 `/swagger-ui.html` 与 `/api-docs`，仅在 `dev` Profile 自动开启，避免生产环境暴露接口模型。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.75`

## V1.3.76 (2025-12-03)
- **角色初始化**：DataInitializer 仅创建基础角色与权限，不再为固定用户名自动分配角色，避免弱口令账号被静默升权。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.76`

## V1.3.77 (2025-12-03)
- **存储清理**：新增“系统设置-未引用图片清理”功能（仅超级管理员），扫描所有文章与关于页引用后删除未被使用的上传图片，支持列表预览与二次确认。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.77`

## V1.3.78 (2025-12-03)
- **模块/页面**：数据分析页仅保留实时访问日志，新增分页浏览全部 analytics_page_views；修复 IP 解析、登录用户落库与 Geo 自动填充，并补充后台分页接口。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.78`
## V1.3.79 (2025-12-03)
- **模块/页面**：数据分析页优化：浅色模式下分页下拉对比度提升、隐藏 user_agent 列、用户列加宽便于阅读。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.79`
## V1.3.80 (2025-12-03)
- **模块/页面**：数据分析页用户列改为头像展示（悬停显示“id:用户名:显示名”），未登录仍显示访客。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.80`
## V1.3.81 (2025-12-03)
- **模块/页面**：数据分析日志头像链接改为与用户列表一致（支持相对路径构建），tooltip 显示“id:用户名:显示名”；移除 slug 行，仅展示文章标题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.81`

## V1.3.82 (2025-12-03)
- **模块/页面**：数据分析页头像解析与用户列表保持一致（多字段兼容，空缺回退首字母），悬停提示改为`id-username-display_name`格式并移除头像右侧用户名；分页条数下拉样式改为浅色圆角风格，消除黑色突兀感。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.82`

## V1.3.83 (2025-12-04)
- **模块/页面**：后台数据分析日志的头像路径统一补全 `/uploads/avatar/` 前缀并兼容 `avatar/avatarUrl/avatar_url/avatarPath` 字段，防止破图；tooltip 按 `id-username-display_name` 显示真实昵称，首字母兜底逻辑保持不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.83`

## V1.3.84 (2025-12-04)
- **模块/页面**：数据分析页 tooltip 追加对 `display_name/userName` 的读取，确保悬停提示展示真实昵称而非重复用户名；同步版本号 `V1.3.84`，便于后台确认修复。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.84`

## V1.3.85 (2025-12-04)
- **接口**：`/admin/analytics/page-views` 响应新增 `display_name` 字段（同步 DTO 与 Service），让前端无需降级回退即可直接展示用户昵称；版本号同步至 `V1.3.85`。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.85`

## V1.3.86 (2025-12-04)
- **访问信息**：新增 `clientIp` 字段，前端在浏览器侧调用公网 IP 服务后随 PV 请求附带，后端在检测到本地回环地址时会优先采用该值并通过 `IpUtils` 校验归一化；本地联调亦可展示真实公网 IP。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.86`

## V1.3.87 (2025-12-04)
- **来源本地化**：PV 请求新增 `sourceLabel`，前端依据 `document.referrer` 自动生成“来自首页/归档/站内文章/外部链接”等中文描述；后端优先使用该字段写入 `referrer_url` 并在兜底场景记录“系统兜底”，Analytics 列表不再出现英文 `Direct / None`/`server-fallback`。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.87`

## V1.3.88 (2025-12-04)
- **统计稳定性**：`AnalyticsTrafficSource` 增加自动创建/更新时间戳，避免 `created_at`/`updated_at` 为空导致 PV 统计写入失败；`sanguiblog_db.sql` 同步默认值，确保初始化环境一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.88`

## V1.3.89 (2025-12-04)
- **流量来源幂等**：`updateTrafficSourceStat` 采用“查询→更新/插入 + 重试”策略，并在冲突时清理 EntityManager，彻底消除唯一键并发冲突导致的 500；构造器注入 `EntityManager` 支持刷新。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.89`

## V1.3.90 (2025-12-04)
- **流量来源幂等（v2）**：改用数据库 `INSERT ... ON DUPLICATE KEY UPDATE`（`upsertSourceVisit`）一次性自增 visits，消除 Hibernate Session 异常；AnalyticsService 取消手动重试逻辑，避免事务被标记 rollback。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.90`

## V1.3.91 (2025-12-04)
- **来源占比**：`analytics_traffic_sources` 在每次 upsert 后立即刷新 `percentage = visits / 总访次`，百分比保留两位小数，后台“来源”卡片可直接展示实时占比；新增 `refreshPercentage` 原生 SQL，确保更新在数据库端完成。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.91`

## V1.3.92 (2025-12-04)
- **来源占比优化**：剔除复杂 SQL JOIN，改为在服务层重新查询当天所有来源并用 `BigDecimal` 精确计算百分比再批量保存，确保 `percentage` 字段实时非空、四舍五入到两位小数，兼容任意数据源。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.92`

## V1.3.93 (2025-12-04)
- **埋点去重**：前端不再对文章详情重复调用 `recordPageView`，避免与后端 `PostService` 的兜底统计叠加，单次访问仅计 1 次。
- **来源中文化**：`source_label` 优先采纳前端上报的中文描述（如“来自首页”“外部链接：example.com”），缺省时回落到与 `referrer_url` 一致的本地化字符串。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.93`

## V1.3.94 (2025-12-04)
- **模块/页面**：Analytics 前端埋点新增视图守卫，Home/Archive/Admin 仅首入一次上报 PV，彻底杜绝 analytics_page_views 三连记录并在 NOTE.md 记录该机制。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.94`

## V1.3.95 (2025-12-04)
- **模块/页面**:重构 /admin 仪表盘(新增 1/7/30/全部概览筛选、14 天 PV/UV 折线、移除热门文章/最新访问/紧急广播)并同步后端统计逻辑(文章 views/comments 聚合、UV 登录优先去重、全部历史=days -1)。
- **版本**:首页 Banner 更新为 `SANGUI BLOG // V1.3.95`
## V1.3.96 (2025-12-04)
- **模块/页面**：后台数据分析页的“清理我的访问日志”新增 IP 维度匹配，删除当前账号日志后会一并移除 user_id 为空但 viewer_ip 与超级管理员一致的访客记录，确保登录前的访问也能被清除。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.96`

## V1.3.97 (2025-12-04)
- **模块/页面**：/admin/analytics 更名为“访问日志”（导航、权限管理同步更新），并修复刷新按钮在明暗模式下 hover 后文本变黑的可见性问题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.97`

## V1.3.98 (2025-12-07)
- **模块/页面**：首页文章列表分页统一监听页码变化触发 `scrollToPostsTop`，修复上一页/下一页/首末页点击后未自动滚回第一条文章的体验问题，确保任意翻页按钮都把视口带回列表顶部。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.98`

## V1.3.99 (2025-12-07)
- **模块/页面**：首页左侧分类筛选（一级/二级/Reset）也会触发 `scrollToPostsTop`，列表分页容器去掉 `flex:1` 占位，解决筛选后不自动上滑及不足一页时分页与警句之间出现大段空白的问题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.99`

## V1.3.100 (2025-12-07)
- **模块/页面**：首页一级分类点击即刻滚动到顶部，并支持再次点击当前分类时折叠子分类且回退到“全部”，解决“再点一次无响应”和筛选后未上滑的问题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.100`

## V1.3.101 (2025-12-07)
- **模块/页面**：首页 Hero 标语与分页警句改为读取 `application.yaml`（`site.hero.tagline`、`site.home.signature-quote`），后端统一配置后前端自动展示，确保文案可运营化。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.101`

## V1.3.102 (2025-12-07)
- **模块/页面**：首页作者头像彩蛋优化，快速连点头像会弹出“转慢一点”“我快晕了”等随机提示泡泡，样式沿用黑黄复古边框，仅作为前端趣味反馈不影响业务逻辑。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.102`

## V1.3.103 (2025-12-07)
- **模块/页面**：头像旋转提示改为居中赛博感弹窗，任何滚动位置都能看到，渐隐消失不阻塞交互。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.103`

## V1.3.104 (2025-12-07)
- **模块/页面**：新增“眼冒金星”大彩蛋，超高频点击头像会触发全屏星爆与旋转锁定动画，冷却期内头像仅震动提醒，计时结束或刷新后恢复正常。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.104`

## V1.3.105 (2025-12-07)
- **模块/页面**：眼冒金星冷却时间延长至 60 秒，避免误触后立即恢复，整体体验更接近“系统降温”效果。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.105`

## V1.3.106 (2025-12-07)
- **模块/页面**：新增主题“超频模式”彩蛋，450ms 内连续切换主题 ≥6 次会触发全屏矩阵流与提示气泡，3 秒后自动恢复。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.106`

## V1.3.107 (2025-12-07)
- **模块/页面**：超频模式提示保持居中显示，冷却期内不再被“冷却中”提示覆盖，避免提示闪烁。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.107`

## V1.3.108 (2025-12-07)
- **模块/页面**：点击顶部“首页/归档/关于”导航后自动平滑滚动到页面顶部，确保切换视图时视口统一回到起点。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.108`

## V1.3.109 (2025-12-07)
- **模块/页面**：文章详情页的“首页”按钮返回后会自动滚动至文章列表顶部（第一篇位置），体验与主页一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.109`

## V1.3.110 (2025-12-07)
- **模块/页面**：后台 `/admin/analytics` 访问日志支持超级管理员单条或批量删除，后端提供对应删除接口并校验 SUPER_ADMIN，表格新增勾选列与删除按钮。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.110`

## V1.3.111 (2025-12-07)
- **模块/页面**：后台发布文章时，上传 Markdown 自动去掉文件名前缀（首个“-”及其之前）作为标题；摘要从首个以 “>” 开头的行提取，未识别时提示手动填写，并从正文中移除该行。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.111`

## V1.3.112 (2025-12-07)
- **模块/页面**：上传 Markdown 后自动统计正文中的图片数量（识别 `![alt](url)` 语法），在提示区醒目告知“本文检测到 X 张图片”，便于检查资源是否齐全。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.112`

## V1.3.113 (2025-12-07)
- **模块/页面**：发布文章页新增“清空表单”按钮，点击需确认后重置标题、摘要、正文、标签、主题色等所有输入，避免误操作。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.113`

## V1.3.114 (2025-12-07)
- **模块/页面**：发布文章页将步骤顺序调整为“二级分类 → 标签 → 资源标识”，并在选择二级分类时按顺序自动套用预设颜色（最多 6 个，超出不自动选），仍可手动修改颜色。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.114`

## V1.3.115 (2025-12-07)
- **模块/页面**：二级分类自动配色仅在用户未手动改色时生效，避免覆盖手动选择；若已手动调整颜色，后续切换分类不再自动改色。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.115`

## V1.3.116 (2025-12-07)
- **模块/页面**：重置表单会同步选择首个父分类的首个二级分类并按预设色自动上色；“重新生成”按钮文案明确不改颜色。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.116`

## V1.3.117 (2025-12-07)
- **模块/页面**：发布页版本号仅读取后端 `site.version`，前端不再硬编码回退；新增“重置为默认色”按钮；重置表单会恢复默认配色标记，避免自动配色与手动配色混淆。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.117`

## V1.3.118 (2025-12-07)
- **模块/页面**：系统设置新增空目录扫描/删除（Super Admin）；清理页面支持重新扫描空目录并批量删除。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.118`

## V1.3.119 (2025-12-07)
- **模块/页面**：修复系统设置“空目录清理”重新扫描时报 `adminScanEmptyFolders is not defined` 的问题（补全前端 API 导入）。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.119`

## V1.3.120 (2025-12-07)
- **模块/页面**：发布页支持批量上传图片并按文件名匹配 Markdown 中的本地占位路径（自动替换），未匹配的图片会追加插入；上传结果提示“已上传 X 张，匹配替换 Y 张”，若未全部匹配会提示手动补全。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.120`

## V1.3.121 (2025-12-07)
- **模块/页面**：文章编辑页同步批量图片匹配替换能力；步骤顺序调整为“二级分类 → 标签 → 资源标识/颜色/状态”，分类自动配色仅在未手动改色时生效。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.121`

## V1.3.122 (2025-12-07)
- **模块/页面**：发布文章后清空上一篇的上传/匹配提示，避免连续发布时残留“已上传/匹配”信息。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.122`

## V1.3.123 (2025-12-07)
- **模块/页面**：首页文章列表改为一次加载最多 500 篇，分页数量随文章总数动态增长（每页 5 篇），不再只显示 4 页。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.123`

## V1.3.124 (2025-12-07)
- **模块/页面**：前端请求前检测 JWT 过期，过期则清理 token 并提示重新登录，避免 silent 403。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.124`

## V1.3.125 (2025-12-08)
- **模块/页面**：首页分页支持本地选择 5/10/20 条每页（设置面板新增下拉保存至浏览器），页码过长时自动使用省略号并移除首/尾/前/后翻按钮以保持简洁。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.125`

## V1.3.126 (2025-12-08)
- **模块/页面**：优化首页分页省略号样式，采用本站卡片式圆点风格，去除虚线边框与违和感。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.126`

## V1.3.127 (2025-12-08)
- **模块/页面**：再次美化首页分页省略号，改为圆润渐变胶囊样式与粗体“···”，贴合本站明快/暗夜配色。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.127`

## V1.3.128 (2025-12-08)
- **模块/页面**：首页分页省略号胶囊样式透明度下调，悬停回满不透明度，视觉更柔和。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.128`

## V1.3.129 (2025-12-08)
- **模块/页面**：合并 `permissions_seed.sql` 入 `sanguiblog_db.sql`，权限列表与角色映射随建库脚本一次初始化，移除独立 seed 脚本。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.129`

## V1.3.130 (2025-12-08)
- **模块/页面**：新增后端 Dockerfile（`SanguiBlog-server/Dockerfile`），提供 Maven 构建 + Temurin JRE 多阶段镜像，含健康检查与上传目录挂载，便于服务器端 Docker 部署。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.130`

## V1.3.131 (2025-12-08)
- **模块/页面**：新增前端 Dockerfile（`SanguiBlog-front/Dockerfile`），Node20 + Nginx 多阶段构建，内置 SPA fallback 与 `/api` 反代示例，便于容器化前端静态资源。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.131`

## V1.3.132 (2025-12-08)
- **模块/页面**：新增根目录 `docker-compose.yml`，一键启动 MySQL、后端、前端（含上传卷与构建参数示例），便于本地或服务器端 Docker 编排。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.132`

## V1.3.133 (2025-12-09)
- **模块/页面**：前端页面标题由 “sanguiblog-front” 改为 “三桂博客-全新版本焕然一新”，浏览器标签直观展示中文品牌。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.133`

## V1.3.134 (2025-12-09)
- **模块/页面**：站点图标改为 `public/vite.jpg`，浏览器标签展示用户提供的 JPEG 图标。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.134`

## V1.3.135 (2025-12-09)
- **模块/页面**：在 `/admin/settings` 重新加入站点广播配置（紧急/庆典双风格），SUPER_ADMIN 可切换开关与文案，实时同步到前台通知条。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.135`

## V1.3.136 (2025-12-09)
- **模块/页面**：庆典广播样式焕新为暖色渐变与柔和闪烁，补足庆典氛围，紧急广播保持原有警示效果。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V1.3.136`

## V2.0.0 (2025-12-09)
- **模块/页面**：新增 `scripts/switch-env.ps1` 一键切换 dev/prod，同步更新后端 `application.yaml` 与前端 `.env.local`；上线版本默认切至生产配置。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.0`

## V2.0.1 (2025-12-11)
- **模块/页面**：后台访问日志（`/admin/analytics`）调整表格列宽：文章列收窄，访客 IP 与来源列加宽防止字符换行，IP 末位与来源短文案均不再被断行。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.1`

## V2.0.2 (2025-12-11)
- **模块/页面**：进一步微调访问日志表格列宽：文章列略微放宽提升标题可读性，地理列收紧以避免浪费空间，整体不再出现 IP/来源/地理换行问题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.2`

## V2.0.3 (2025-12-11)
- **模块/页面**：再次调整访问日志表格列宽：文章列加宽（标题更完整），地理列进一步收窄以腾出空间，保持 IP/来源/地理均不换行。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.3`

## V2.0.4 (2025-12-11)
- **模块/页面**：访问日志表格再优化：文章列继续加宽并单行省略号展示，悬停可见全称；地理列进一步收紧，整体布局更紧凑且无换行溢出。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.4`

## V2.0.5 (2025-12-11)
- **模块/页面**：访问日志表格列宽最终微调：文章列进一步加宽（单行省略号+悬停全称），地理列再缩短以释放空间，整体布局更均衡。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.5`

## V2.0.6 (2025-12-11)
- **模块/页面**：访问日志表格列宽再度优化：文章列继续加宽以容纳更长标题，地理列进一步压缩，保持文章单行省略号+悬停全称，整体更利于阅读。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.6`

## V2.0.7 (2025-12-11)
- **模块/页面**：访问日志表格新增 IP 一键复制（点击 IP 即写入剪贴板并提示），同时继续加宽文章列、收紧地理列以优化阅读。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.7`

## V2.0.8 (2025-12-11)
- **模块/页面**：访问日志 IP 复制按钮去除超链接样式，保持正常文本外观但可点击复制，体验更自然。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.8`

## V2.0.9 (2025-12-11)
- **模块/页面**：访问日志 IP 复制改为醒目弹窗提示，自动 2.5 秒消失；继续沿用普通文本外观的可点复制交互。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.9`

## V2.0.10 (2025-12-11)
- **模块/页面**：IP 复制成功弹窗位置改为屏幕居中，视觉更醒目；交互逻辑与自动消失保持不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.10`

## V2.0.11 (2025-12-11)
- **模块/页面**：/login 页面密码输入新增“显示/隐藏”切换按钮，支持查看已输入密码，默认仍为不可见模式。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.11`

## V2.0.12 (2025-12-11)
- **模块/页面**：/login 密码显示切换改用可视化图标（Eye/EyeOff），输入框预留图标空间，交互更直观。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.12`

## V2.0.13 (2025-12-11)
- **模块/页面**：修复登录页首次输入密码出现双重“显示密码”图标的问题，禁用浏览器自带的密码可见按钮，仅保留自定义图标。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.13`

## V2.0.14 (2025-12-11)
- **模块/页面**：/login 用户名与密码输入仅允许可打印 ASCII（英文、数字及常见符号），阻止中文等特殊字符输入以避免认证异常。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.14`

## V2.0.15 (2025-12-11)
- **模块/页面**：登录成功后返回上一页（若无历史则回首页），修复登录后总跳转首页的体验问题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.15`

## V2.0.16 (2025-12-11)
- **模块/页面**：登录新增防刷验证码：同 IP 10 分钟内失败 3 次后强制验证码，提供 `/api/auth/captcha` 返回扭曲字母数字图；前端登录页支持验证码输入/刷新，错误提示自动拉取验证码。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.16`

## V2.0.17 (2025-12-11)
- **模块/页面**：验证码布局优化：图片独占一行显示在输入框上方，移除独立刷新按钮，点击图片即可刷新，避免遮挡登录表单。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.17`

## V2.0.18 (2025-12-11)
- **模块/页面**：登录防刷完善：后端按 IP 失败计数返回 `captchaRequired`/`remainingAttempts`，提供 `/api/auth/captcha`；前端登录失败直接依据返回字段展示验证码，不再依赖错误文案，用户名/密码长度与字符集前后端统一校验。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.18`

## V2.0.19 (2025-12-11)
- **修复**：补充 AuthService 对 LoginChallengeException 的 import，解决编译缺失符号错误。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.19`

## V2.0.20 (2025-12-11)
- **优化**：验证码提示文案优化：仅在剩余尝试 >0 时展示剩余次数，触发验证码后显示“已触发验证码，请先完成图形验证”，避免一直显示 0 的误导。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.20`

## V2.0.21 (2025-12-11)
- **安全/性能**：验证码接口以 IP+UA 5s 速率限制并缓存 60s，减少刷取与重复生成；返回 remainingAttempts 同步缓存。
- **前端**：验证码加载失败时显示提示并可重新获取；获取按钮在暗色模式样式适配；密码显示/隐藏按钮在暗色模式配色修复。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.21`

## V2.0.22 (2025-12-11)
- **文案**：登录页英文文案改为中文（标题、字段占位、按钮等），顶部导航 Login 改为“前往登录”。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.22`

## V2.0.23 (2025-12-11)
- **UI 调整**：登录页按钮尺寸优化：登录按钮缩小至更协调的宽度，取消按钮加宽并强制不换行，避免双行显示。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.23`

## V2.0.24 (2025-12-11)
- **文案**：登录页验证码标题改为中文“验证码”，保持页面文案一致性。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.24`

## V2.0.25 (2025-12-11)
- **限流**：`/api/auth/login` 增加 IP 级 10 分钟 30 次限流；`/api/auth/captcha` 增加 IP 级 1 分钟 10 次 + 5 秒内速率限制，并继续 60 秒内复用同图，防刷验证码。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.25`

## V2.0.26 (2025-12-11)
- **修复**：验证码支持强制刷新，点击图片/按钮会带 `force` 参数绕过 60s 缓存；仍保留 5 秒速率限制与 IP 限流，避免单图无法刷新问题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.26`

## V2.0.27 (2025-12-11)
- **登录页**：前端刷新验证码时正确透传 `force=true` 并新增 5s 冷却提示，既能换图又防止短时间内高频刷取。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.27`

## V2.0.28 (2025-12-11)
- **登录页**：修正“只点一次也被判频繁”的问题，前端对所有验证码获取统一施加 5s 冷却，避免自动拉取后紧接手动刷新触发后端限流；非限流错误立即放开重试。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.28`

## V2.0.29 (2025-12-11)
- **后端日志**：关闭 Hibernate SQL 打印与参数绑定 TRACE，禁止 `spring.jpa.show-sql`，减少启动及运行期 SQL 噪声。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.0.29`

## V2.1.0 (2025-12-11)
- **游戏/自定义页面**：新增 `game_pages` 表与后台 CRUD，超级管理员可上传/替换/删除独立 HTML 文件；公共入口 `/games`、`/games/:id` 以 iframe 渲染上传内容，导航栏增加“游戏”按钮。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.0`

## V2.1.1 (2025-12-11)
- **游戏列表**：列表页“进入”按钮改为在新窗口打开对应 HTML，避免占用当前页面。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.1`

## V2.1.2 (2025-12-11)
- **修复**：上传文件生成的访问路径统一补上 `/uploads/` 前缀，首次点击“进入”即指向正确 URL。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.2`

## V2.1.3 (2025-12-11)
- **模块/页面**：`/games` 内容收窄居中并露出两侧背景（日/月不再被遮挡）；游戏页面的上传、编辑、删除与排序迁移到后台 `/admin/settings` 的“游戏页面管理”块，前台仅保留浏览入口。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.3`

## V2.1.4 (2025-12-11)
- **系统设置/游戏管理**：修正后台游戏列表按钮文字乱码，预览/编辑按钮可读；前台默认背景保持可见。
- **配置/静态资源**：后端 `storage.base-path` 默认改为可配置 `/home/sangui/uploads`，`site.asset-base-url` 支持 `${server.port}` 占位，避免写死本地路径；与 Nginx `/uploads/` 对齐。
- **后端/校验文案**：`GamePageRequest` 校验提示改为中文防止乱码。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.4`

## V2.1.5 (2025-12-11)
- **关于页**：Markdown 图片统一经 `buildAssetUrl` 解析，避免开发环境显示为 `localhost:5173`，与文章页保持同源。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.5`

## V2.1.6 (2025-12-12)
- **权限管理页**：修复 `/admin/permissions` 误引用游戏/维护模块导致 `loadGames is not defined` 的运行时错误；权限页恢复为纯权限矩阵展示与保存。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.6`

## V2.1.7 (2025-12-12)
- **权限管理页**：修复权限矩阵中 `superAdmin` 标记恒为 true 导致管理员/用户列被误判只读的问题；超级管理员现在可正常勾选并保存 ADMIN/USER 角色的具体权限。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.7`

## V2.1.8 (2025-12-12)
- **游戏列表**：修复 `/games` 点击“刷新列表”后改用后台管理接口导致排序/字段不一致的问题；刷新与首屏统一使用公开 `fetchGames` 数据，并按 sortOrder/updatedAt/id 稳定排序，顺序不再异常。
- **游戏状态标签**：公开游戏 DTO 补充 `status` 字段，前台列表首屏即可显示 `ACTIVE` 标签，避免仅刷新后才出现。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.8`

## V2.1.9 (2025-12-12)
- **系统设置**：在 `/admin/settings` 保留“游戏页面管理”模块，并新增两个仅超级管理员可用的小分类：未引用图片清理与空目录清理。
- **未引用图片清理**：接入 `/api/admin/maintenance/unused-assets` 扫描 uploads 中未被文章与关于页引用的图片，后台可勾选并二次确认删除，释放存储空间。
- **空目录清理**：接入 `/api/admin/maintenance/empty-folders` 扫描 uploads/posts 下空文件夹，后台可批量删除空目录。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.9`

## V2.1.10 (2025-12-12)
- **系统设置**：修复维护模块 JSX 误插入到权限页导致 `/admin/settings` 未展示的问题；未引用图片清理与空目录清理现已正确出现在系统设置页面。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.10`

## V2.1.11 (2025-12-12)
- **后台仪表盘**：修复 `formatSize` 工具函数作用域被收窄导致 `/admin` 首屏渲染后报错的问题；`formatSize` 现提升为全局共享工具，仪表盘与系统设置均可正常使用。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.11`

## V2.1.12 (2025-12-12)
- **前台/后台渲染**：清理误插入到 `Hero` 与 `DashboardView` 的系统维护 JSX，避免 `surface/assetTotalSize` 等变量未定义引发连锁报错；维护功能仅保留在 `/admin/settings`。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.12`

## V2.1.13 (2025-12-12)
- **系统设置**：将“未引用图片清理/空目录清理”模块正确挂载回 `/admin/settings`，与游戏页面管理并列展示；两模块继续仅限超级管理员使用，支持扫描、勾选、二次确认删除。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.13`

## V2.1.14 (2025-12-12)
- **系统设置**：补齐 `SystemSettingsView` 内维护模块的实际渲染，确保超级管理员在 `/admin/settings` 可看到“未引用图片清理/空目录清理”并正常操作。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.14`

## V2.1.15 (2025-12-12)
- **系统设置**：后台设置页新增完整的未引用图片/空目录清理视图，支持超级管理员一键扫描、全选、多选确认弹窗删除，并显示可释放空间。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.15`

## V2.1.16 (2025-12-12)
- **前台首页**：移除误留的存储清理 JSX，修复 `Hero` 组件 `surface` 未定义导致首页加载崩溃的问题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.16`

## V2.1.17 (2025-12-12)
- **后台/仪表盘**：移除误注入的存储清理模块，修复 `/admin` 渲染时 `assetTotalSize` 未定义的崩溃。
- **权限/系统设置**：删除权限页遗留的维护版块，并将扫描副作用下移至依赖定义之后，消除潜在的未定义引用。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.17`

## V2.1.18 (2025-12-12)
- **系统设置/未引用图片**：列表行新增内嵌缩略图（可点击放大到新标签），统一使用 `buildAssetUrl` 解析相对路径，无需跳转即可直观看图。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.18`

## V2.1.19 (2025-12-12)
- **系统设置/未引用图片**：缩略图改为站内大图预览，点击小图在当前页弹出大图，再次点击大图关闭，无需新窗口。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.19`

## V2.1.20 (2025-12-12)
- **系统设置/未引用图片**：修复大图预览未显示的问题，将预览遮罩提升为全局层，任何场景下点击小图均能弹出并再次点击关闭。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.20`

## V2.1.21 (2025-12-12)
- **文章页图片预览**：文章正文的图片大图预览支持点击图片本身即可关闭（不再拦截冒泡），体验与后台存储清理一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.21`

## V2.1.22 (2025-12-12)
- **关于本站图片预览**：关于页 Markdown 图片预览改为点击大图即可关闭，交互与文章页保持一致，避免需要点击遮罩。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.22`

## V2.1.23 (2025-12-12)
- **模块/页面**：后台仪表盘“访客走势图”改用带网格与面积填充的纯 SVG 折线，零数据时显示占位折线与提示，解决全 0 场景下图形不可见的问题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.23`

## V2.1.24 (2025-12-12)
- **模块/页面**：访客走势图增加“访问日志兜底”模式，若接口趋势全 0 但概览存在访问量，会自动聚合最近 500 条访问日志生成 14 天 PV/UV 曲线，确保有真实数据时不再出现“暂无有效访问”提示。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.24`

## V2.1.25 (2025-12-12)
- **模块/页面**：访客走势图支持 7/14/30/全部切换，默认使用接口趋势；若接口数据不足则从最近 1500 条访问日志前端聚合指定天数 PV/UV，标题动态展示天数并标记“访问日志聚合”来源。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.25`

## V2.1.26 (2025-12-12)
- **模块/页面**：访客走势图新增纵轴刻度、网格与面积填充，优化配色，PV/UV 数值可直读；全零时仍保留占位提示。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.26`

## V2.1.27 (2025-12-12)
- **日志/游戏**：为游戏详情页打点，进入具体游戏（内部详情或外链）都会记录 PageView，日志标题形如 `Game: <游戏名>`，sourceLabel 为 `游戏详情-<游戏名>`，保持与原有日志格式一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.27`

## V2.1.28 (2025-12-12)
- **上传安全**：头像与文章资源上传新增类型/大小/数量校验，限制为常见图片格式，单次最大 10 个、30MB，总体防止恶意脚本与大体积文件滥用。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.28`

## V2.1.29 (2025-12-13)
- **首页/文章搜索**：文章列表上方新增关键词搜索条，支持标题与摘要的实时模糊匹配，并展示匹配数量与清空按钮，保持原有分类/标签筛选与分页逻辑不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.29`

## V2.1.30 (2025-12-13)
- **权限初始化**：启动时仅在角色无权限映射时才写入默认矩阵，避免重启覆盖后台已保存的角色权限；SUPER_ADMIN 依旧会自动补齐新增权限代码。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.30`

## V2.1.31 (2025-12-13)
- **文章封面**：后端 posts 表新增 `cover_image` 字段与 `/api/upload/post-cover` 上传接口，封面文件存储于 `/uploads/covers/<slug>/`，接口返回路径可直接写入 `coverImage`；列表/详情/Admin DTO 均返回封面路径。
- **前台展示/编辑**：首页文章卡片支持封面图叠加渐变显示；发布/编辑页新增封面上传与预览模块，可一键替换或移除并随表单提交 `coverImage`。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.31`

## V2.1.32 (2025-12-13)
- **文章页代码块**：为 Markdown 渲染的 Mac 风代码框新增“复制”按钮，点击自动复制整段代码并显示“已复制”提示，交互不突兀、风格与顶部控制点一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.32`

## V2.1.33 (2025-12-13)
- **关于页代码块**：About 单页的 Markdown 代码框同步新增“复制”按钮与“已复制”提示，样式与文章页保持一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.33`

## V2.1.34 (2025-12-13)
- **首页文章卡片**：统一卡片尺寸（整体/封面区/正文区固定高度），标题与摘要做高度约束，底部统计固定在卡片底部，确保列表整齐且封面保持竖版比例。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.34`

## V2.1.35 (2025-12-13)
- **首页文章卡片排布**：内容区重排——顶部展示父类/子类与标签摘要，标题双行截断，摘要三行截断；中段使用胶囊式日期/浏览/评论提示，底部统计与固定高度保持一致，整体比例更均衡且封面竖版不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.35`

## V2.1.36 (2025-12-13)
- **首页文章卡片精修**：去除重复的时间/浏览/评论显示，保留底部信息条；父子分类以“父类 > 子类”胶囊呈现；标签行与标题/摘要截断保持，整体高度与封面比例不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.36`

## V2.1.37 (2025-12-13)
- **分类与标题色**：子分类胶囊改为实线边框；文章标题悬停时使用各文章的 theme_color（存储色）高亮，恢复颜色配置意义。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.37`

## V2.1.38 (2025-12-13)
- **标题悬停稳定**：使用 CSS 变量让标题悬停色总是取文章存储的 theme_color，避免动态类编译缺失导致部分文章不变色。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.38`

## V2.1.39 (2025-12-13)
- **搜索卡片统一风格**：文章搜索条改为直角边框与纯色背景，去掉渐变和倒角，按站内矩形轮廓保持一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.39`

## V2.1.40 (2025-12-13)
- **搜索计数徽标**：搜索结果篇数徽标改为粗描边 + 阴影的纯色矩形（暗色灰底亮字、亮色金底黑字），去除虚线边框，风格与站内 Neo-Brutalism 保持一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.40`

## V2.1.41 (2025-12-13)
- **NEW 徽章减速动画**：首页文章卡片的 NEW 徽章改用 2s、重复一次的渐进动画，播放完后静止，避免长时间闪烁疲劳，保持原有风格。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.41`

## V2.1.42 (2025-12-13)
- **卡片栅格节奏**：文章列表每第 3 个卡片加粗描边与轻微倾斜，并在悬停归正，制造轻量 Masonry 节奏感，仍保持整齐排列与竖版封面比例。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.42`

## V2.1.43 (2025-12-13)
- **封面纹理遮罩**：悬停文章封面时叠加与主题色一致的半透明网点纹理，配合标题高亮色，增加层次感。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.43`

## V2.1.44 (2025-12-13)
- **文章卡片 CTA**：底部信息条右侧新增“阅读 →”胶囊，仅在 hover 时显现，指向清晰，保持现有风格。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.44`

## V2.1.45 (2025-12-13)
- **修复**：补充 ArrowRight 图标引用，解决文章卡片 CTA 报错问题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.45`

## V2.1.46 (2025-12-13)
- **阅读 CTA 可见性**：改用纯 CSS 控制（隐藏→hover 显示并平移），保证悬停卡片时“阅读 →”胶囊稳定出现。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.46`

## V2.1.47 (2025-12-13)
- **阅读 CTA 优化**：将“阅读 →”改为轻量文字提示（无描边、主题色），随卡片 hover 淡入，避免误导仅能点按钮且保持优雅。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.47`

## V2.1.48 (2025-12-13)
- **标题/摘要行高**：标题固定两行高度（不足补空行），摘要固定三行高度（不足补空行，超出省略），整体排版更匀称。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.48`

## V2.1.49 (2025-12-13)
- **标题高度修正**：为标题设置固定最小/最大高度（约 2 行），防止出现第三行露头，保持卡片整齐。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.49`

## V2.1.50 (2025-12-13)
- **标题行高微调**：调整标题行高与高度区间，确保两行完整可见且不被裁切。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.50`

## V2.1.51 (2025-12-13)
- **标题高度再调**：将标题高度固定为约两行的 4.6rem，去掉行高压缩，保证第二行完整可见。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.51`

## V2.1.52 (2025-12-13)
- **卡片微动画**：文章卡片悬停时阴影采用弹簧回弹，封面及无封面占位的主题色网点纹理加入 2° 轻旋与淡入，层次更柔和、节奏更细腻。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.52`

## V2.1.53 (2025-12-13)
- **修复**：补齐文章卡片 JSX 的外层 `<motion.div>` 闭合，解决构建时报错 `Expected corresponding JSX closing tag for <motion.div>`。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.53`

## V2.1.54 (2025-12-13)
- **无封面占位**：为缺少封面的卡片提供主题色纯色背景＋细网格＋ Code 图标圆徽，并保留悬停网点旋转效果，让空状态不显单调。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.54`

## V2.1.55 (2025-12-13)
- **英雄文案**：更新首屏英雄叙事文案——“我是三桂，正在用 Spring Boot × React 打造一座敢于试验的技术花园。”；微文案改为“每周小步快跑，聚焦架构、动画与可用性，记录代码与生活的温度。”，更贴合站点调性。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.55`

## V2.1.56 (2025-12-13)
- **英雄版式**：首屏改为“左文案 + CTA / 右抽象插画”双栏布局，保持粗描边、渐变网格与粒子/几何动效；CTA 与版本徽章靠左对齐，突出入口节奏。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.56`

## V2.1.57 (2025-12-13)
- **叠卡层次**：英雄区前景新增 3 枚主题色/金色/霓虹绿叠卡色块，采用粗描边与阴影，配合网格与噪点背景，增强“叠卡”深度与节奏感。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.57`

## V2.1.58 (2025-12-13)
- **文案悬停动效**：英雄区主标题的四段关键词支持独立悬停微交互（轻微上浮/缩放/旋转与色彩点亮），整体保持优雅节奏与粗描边风格。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.58`

## V2.1.59 (2025-12-13)
- **入场动画**：英雄区主标题恢复“闪弹”式弹跳入场（先缩放/上抛再落定），比线性浮入更有节奏感，同时保留关键词悬停动效和既有文案。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.59`

## V2.1.60 (2025-12-13)
- **赛博背景强化**：英雄区叠加“光晕矩阵 + 细线电路 + 玻璃卡叠层”——新增径向/锥形光晕、霓虹电路线流动动画以及半透明粗描边玻璃卡，保持网格与噪点同时提升赛博层次感。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.60`

## V2.1.61 (2025-12-13)
- **刷新回顶**：禁用浏览器 scrollRestoration，刷新时自动滚到首页顶端，避免停留在原滚动位置。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.61`

## V2.1.62 (2025-12-13)
- **分页省略号**：重绘分页省略号为三颗立体描边圆点胶囊，去除丑陋字符，视觉与站内粗描边风格一致且更优雅。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.62`

## V2.1.63 (2025-12-13)
- **分页省略号微调**：缩小胶囊尺寸，降低不透明度并减弱阴影，让省略号不抢视线但仍保持粗描边与胶囊风格。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.63`

## V2.1.64 (2025-12-14)
- **首页占位数据**：将默认博主头像改为“加载中”风格的 SVG 占位图，缩减首页文章列表的 mock 数据为 2 条加载占位文案，避免未连后端时展示大量虚构内容。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.64`

## V2.1.65 (2025-12-14)
- **上传限额**：后端单个文章资源文件上限提升至 20MB、单次上传总量上限 50MB，并放宽 Spring `multipart` 限制（60MB），解决 413 报错；建议 Nginx 同步设置 `client_max_body_size 60m`。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.65`

## V2.1.66 (2025-12-14)
- **归档跳转修复**：归档页右侧“月份速选”滚动时按导航高度预留余量，落点不会越过月份标题及首篇文章。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.66`

## V2.1.67 (2025-12-14)
- **归档卡片二级分类**：归档页文章卡片新增“父分类 / 子分类”胶囊，保持粗描边黄底风格且不影响既有标签和统计信息。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.67`

## V2.1.68 (2025-12-14)
- **二级分类样式区分**：归档卡片的父分类改为黑底金字胶囊（含 FolderPlus 图标），子分类改为白底黑字描边胶囊，与标签明显区分但排版不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.68`

## V2.1.69 (2025-12-14)
- **归档分类重调**：父分类改为白底黑字描边胶囊（保留 FolderPlus 图标），子分类为浅灰描边胶囊；标签整体右对齐，分类靠左，层次更清晰。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.69`

## V2.1.70 (2025-12-14)
- **快速跳转固定**：归档页“快速跳转”面板改为固定定位，顶距随导航高度计算，滚动后始终可见，便于反复跳转。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.70`

## V2.1.71 (2025-12-14)
- **快速跳转左移**：固定定位的“快速跳转”面板左移对齐主内容区，避免贴边影响观感，仍保持滚动时始终可见。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.71`

## V2.1.72 (2025-12-14)
- **快速跳转吸附**：改为 sticky 吸附，顶距随导航高度计算，页面顶部不遮挡 UI，下滚到文章卡片区域后保持停驻可用。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.72`

## V2.1.73 (2025-12-14)
- **跳转面板守位**：为“快速跳转”增加滚动监听与占位高度，页面顶部正常流动，滚到列表后切换为固定定位（对齐主内容区域），既不遮挡顶部 UI，又能在跳转后保持可见。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.73`

## V2.1.74 (2025-12-14)
- **平滑守位**：记录跳转面板初始宽度与左偏移，固定时复用同一宽度与位置，消除切换时的横向抖动，保持丝滑对齐。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.74`

## V2.1.75 (2025-12-14)
- **快速跳转固定简化**：面板改为始终固定定位，顶距随导航预留，统一使用内容区右侧对齐宽度，彻底消除切换时的左右位移感。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.75`

## V2.1.76 (2025-12-14)
- **跳转不遮顶**：改用 sticky，面板随页面到达时间轴区域才开始吸顶，顶部介绍区域不再被遮挡，同时保持顶部预留高度与 70vh 内滚动列表。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.76`

## V2.1.77 (2025-12-14)
- **跳转随锚点**：快速跳转面板改为 sticky + 动态 `margin-top` 对齐当前锚点（默认最新月份），到达该锚点后吸顶；切换月份时面板顺滑移位，再吸顶保持可见，无横向抖动。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.77`

## V2.1.78 (2025-12-14)
- **滚动识别锚点**：监听滚动实时识别当前可视月份，自动更新跳转面板对齐的锚点并重算偏移，确保上下滚动时面板随当前月份平滑移动而非停留在旧位置。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.78`

## V2.1.79 (2025-12-14)
- **封面上传上限**：文章封面上传单文件大小由 5MB 提升至 10MB（`/api/upload/post-cover`），便于使用更高清的封面图片。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.79`

## V2.1.80 (2025-12-14)
- **模块/页面**：存储清理新增扫描文章封面目录 `/uploads/covers`，可识别未引用的封面图并支持清理，原有文章与关于页图片扫描不受影响。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.80`

## V2.1.81 (2025-12-14)
- **后台文章编辑**：新增“编辑上一篇/编辑下一篇”快捷按钮，按首页发布时间顺序在后台编辑页一键切换相邻文章并自动填充表单。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.81`

## V2.1.82 (2025-12-14)
- **后台文章编辑优化**：上一篇/下一篇按钮现在直接更新 URL（`?postId=`）并重新拉取邻居 ID，连续跳转不再停留在同一文章。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.82`

## V2.1.83 (2025-12-14)
- **上一篇/下一篇邻居修正**：后端邻居查询改为“紧邻”逻辑（上一条取发布时间更晚的最近一篇，下一条取更早的最近一篇），前端按钮保持 URL 方式切换，连续点击不会返回到首篇。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.83`

## V2.1.84 (2025-12-14)
- **邻居查询稳定化**：改为原生 SQL 精确取紧邻的已发布文章（按首页排序），彻底消除“多次点击跳回第一篇”的错乱。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.84`

## V2.1.85 (2025-12-14)
- **编译修复**：补充邻居查询所需的时间类型导入，解决 PostRepository 缺少 LocalDateTime 导致的编译错误。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.85`

## V2.1.86 (2025-12-14)
- **URL 同步强化**：上一篇/下一篇按钮显式使用 `navigate({ pathname: '/admin/posts/edit', search: '?postId=...' })` + `setSearchParams`，并声明 `type="button"`，确保每次点击都会更新地址栏与表单数据。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.86`

## V2.1.87 (2025-12-14)
- **单一 URL 来源**：移除多处 `setSearchParams` 写入，统一由 `selectedPostId` 的副作用中调用 `navigate` 更新地址栏；按钮仅更新 state，避免“URL 一闪后回退”。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.87`

## V2.1.88 (2025-12-15)
- **移动端适配**：新增移动端抽屉导航（包含登录/后台、主题切换、背景开关与分页设置），打开时锁定页面滚动；系统状态条在小屏改为横向滑动吸顶，避免指标溢出，同时保持桌面排版与交互不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.88`

## V2.1.89 (2025-12-15)
- **访客 IP 采集**：新增同源接口 `/api/analytics/client-ip`，前端默认优先调用该接口并仅在获取到非回环地址时上报 `clientIp`，可选通过 `VITE_ENABLE_PUBLIC_IP_FETCH=true`（或自定义 `VITE_PUBLIC_IP_ENDPOINT`）开启公网 IP 兜底。移除对外网 `api.ipify.org` 的强依赖，启动时不再出现 `net::ERR_CONNECTION_RESET` 报警。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.89`

## V2.1.90 (2025-12-15)
- **加载告警抑制**：`useBlogData` 的文章加载失败日志改为去重后的 `console.debug`，仅首次失败提示且不会在控制台显黄色警告，继续使用本地占位数据确保页面正常渲染。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.90`

## V2.1.91 (2025-12-15)
- **静默占位**：文章加载失败日志默认完全静默，只有在 `.env` 显式设置 `VITE_ENABLE_POSTS_DEBUG=true` 时才会输出一次调试信息，避免控制台出现任何白色/黄色提示。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.91`

## V2.1.92 (2025-12-15)
- **触控报错消除**：拖动“返回顶部”按钮的触摸事件在调用 `preventDefault` 前检查 `cancelable`，避免 `Unable to preventDefault inside passive event listener` 报错；`touchmove` 仍保持可拖拽逻辑。
- **点击性能**：点击回顶操作移入 `requestAnimationFrame`，缩短同步阻塞时间以消除 `[Violation] 'click' handler took xxxms` 警告，行为与原逻辑一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.92`

## V2.1.93 (2025-12-15)
- **模块/页面**：返回顶部按钮的触摸拖拽改为绑定非被动的 `touchstart` 监听，并补充 `touch-action: none`，彻底消除被动监听下调用 `preventDefault` 的红色报错，拖拽/回顶逻辑保持不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.93`

## V2.1.94 (2025-12-15)
- **模块/页面**：调整返回顶部组件生命周期顺序，将自定义 `touchstart` 监听挂载移动到 `startDrag` 初始化之后，修复 “Cannot access 'startDrag' before initialization” 白屏报错，保持拖拽与回顶交互不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.94`

## V2.1.95 (2025-12-15)
- **资源链接安全**：`buildAssetUrl` 在 HTTPS 页面下会自动把 `http://` 资源链接提升为 `https://`，统一头像等静态资源的协议，彻底消除生产环境的 Mixed Content 报错，本地 HTTP 调试行为保持不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.95`

## V2.1.96 (2025-12-15)
- **登录表单无障碍**：为用户名、密码、验证码输入框补充 `autocomplete`（分别为 `username`、`current-password`、`one-time-code`），消除浏览器关于自动填充的 DOM 警告并提升密码管理体验。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.96`

## V2.1.97 (2025-12-15)
- **通知信封**：新增评论通知表与接口，评论触发时给文章作者/被回复用户推送未读提醒；前端导航栏信封显示红点，支持查看详情、跳转文章并标记已读或一键清零（含移动端）。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.97`

## V2.1.98 (2025-12-15)
- **通知头像**：未读通知气泡改为展示评论者真实头像（优先用户头像，其次备用头像），不再显示字母占位符，确保博主能直观识别发起人。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.98`

## V2.1.99 (2025-12-15)
- **登录跳转修复**：登录成功后统一切回首页视图，避免停留在登录页。
- **头像兜底**：通知列表强制使用头像图片（缺失时落到默认头像），彻底消除字母占位导致的“非真实头像”体验。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.99`

## V2.1.100 (2025-12-15)
- **头像快照**：通知表新增 `comment_author_avatar` 并在创建时写入头像快照；读取通知时优先使用该快照，彻底消除加载动画占位。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.100`

## V2.1.101 (2025-12-15)
- **头像路径规范化**：通知生成与读取时统一为本地头像补全 `/avatar/` 前缀（或保留 https 链接），避免资源 404 造成加载转圈。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.101`

## V2.1.102 (2025-12-15)
- **评论锚点跳转**：通知点击后记录 commentId，文章页加载评论后自动滚动到对应评论，并为每条评论输出 `comment-<id>` 锚点。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.102`

## V2.1.103 (2025-12-15)
- **通知历史/补全**：新增通知历史分页接口与“补全历史为已读”，前端支持加载更多，未读红点单独统计。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.103`

## V2.1.104 (2025-12-15)
- **防重复补全**：补全历史前先为当前用户去重（同一评论仅保留一条通知），并为 `comment_notifications` 增加唯一键 `(recipient_id, comment_id)`，彻底避免重复通知。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.104`

## V2.1.105 (2025-12-15)
- **通知分页**：历史通知改为页码式分页，支持上一页/下一页显示总页数；未读红点单独统计，总数显示“未读/总计”。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.105`

## V2.1.106 (2025-12-15)
- **分页常量与头像规范**：通知分页展示使用固定页大小计算总页数；历史列表加载后统一规范头像路径（缺省补 `/avatar/`），避免间歇性 404 与转圈。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.106`

## V2.1.107 (2025-12-15)
- **分页标签修复**：通知分页按钮使用传入的页大小参数，消除未定义变量报错。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.107`

## V2.1.108 (2025-12-15)
- **头像路径兜底**：通知头像统一回落 `/uploads/avatar/<文件名>`，避免因裸文件名导致 404；前后端均做同样规范。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.108`

## V2.1.109 (2025-12-15)
- **头像路径再补强**：凡以 `/avatar/` 或裸文件名存储的通知头像统一转为 `/uploads/avatar/<文件名>`，确保老数据不再 404。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.109`

## V2.1.110 (2025-12-15)
- **前端容错**：通知头像渲染统一调用路径归一函数，修复 `normalizeAvatarPath` 未定义导致的白屏。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.110`

## V2.1.111 (2025-12-15)
- **导航头像容错**：在导航组件内增加本地路径归一函数，彻底消除 `normalizeAvatarPath` 未定义错误。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.111`

## V2.1.112 (2025-12-15)
- **UI 精简**：移除通知弹窗底部重复的“全部已读”按钮，保留顶部控制，避免操作冗余。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.112`

## V2.1.113 (2025-12-15)
- **分页调整**：通知历史每页默认显示 3 条，便于快速浏览。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.113`

## V2.1.114 (2025-12-15)
- **补全按钮消失逻辑**：若历史通知已补全（或加载后已有记录），弹窗底部不再显示“补全历史”按钮，避免重复操作。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.114`

## V2.1.115 (2025-12-15)
- **前端引用修正**：通知弹窗使用的补全标记加到 props 并传递，消除 `notificationCanBackfill is not defined` 白屏错误。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.115`

## V2.1.116 (2025-12-15)
- **分页按钮居中**：通知分页控制居中对齐，视觉更平衡。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.116`

## V2.1.117 (2025-12-15)
- **排除自评通知**：创建、补全、统计通知时统一排除“自己评论自己”的情况，确保信封里永远不显示自身评论。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.117`

## V2.1.118 (2025-12-15)
- **通知遮罩**：开启信封时点击任意空白处即可关闭，新增半透明遮罩防止误操作。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.118`

## V2.1.119 (2025-12-15)
- **@提及通知**：创建、补全、统计通知时新增 @提及解析，匹配用户名/显示名，提及登录用户将收到通知；自评仍被排除。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.119`

## V2.1.120 (2025-12-15)
- **通知跳页下拉**：分页区域新增页码下拉选择，可直接跳转指定页，仍保留上一页/下一页按钮。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.120`

## V2.1.121 (2025-12-15)
- **通知弹窗加宽**：信封弹窗宽度增至 420px（移动端自适应），提升可读性。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.121`

## V2.1.122 (2025-12-15)
- **首页/尾页快捷**：通知分页增加“首页/尾页”按钮，并略微加宽弹窗到 460px 以适配新控件。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.122`

## V2.1.123 (2025-12-15)
- **卡片加宽加高**：信封弹窗宽度增至 500px、最大高度 80vh，提升可读性；分页每页上限调整为 5 条。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.123`

## V2.1.124 (2025-12-15)
- **分页与尺寸微调**：通知每页显示 4 条，弹窗高度放宽至 86vh，减少滚动条出现。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.124`

## V2.1.125 (2025-12-15)
- **通知高度放宽**：弹窗最大高度提升至 92vh，确保第 4 条完整可见。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.125`

## V2.1.126 (2025-12-15)
- **通知高度再放宽**：弹窗最大高度提升至 100vh，彻底消除滚动截断。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.126`

## V2.1.127 (2025-12-15)
- **滚动区域自适应**：列表区域高度改为 `calc(100vh-180px)`，为上方工具栏/页脚预留空间，进一步减少滚动条干扰。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.127`

## V2.1.128 (2025-12-15)
- **模块/页面**：导航“系统设置”弹层对齐信箱样式，改为右上角卡片浮层，统一配色、阴影与提示标签，纯视觉改造不改业务逻辑。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.128`

## V2.1.129 (2025-12-15)
- **模块/页面**：系统设置面板位置与信箱一致（右上浮层），背景/控件改为纯白基底，去除渐变与高饱和色，保持原有逻辑不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.129`

## V2.1.130 (2025-12-15)
- **模块/页面**：取消设置弹层对 body 的滚动锁定避免页面轻微右移；弹层下移到 nav 下方且不遮盖按钮，定位与信箱卡片保持一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.130`

## V2.1.131 (2025-12-17)
- **模块/页面**：信箱通知弹层暗色模式分页控件（跳转/上一页/下一页/尾页/补全历史/页码提示）文字改为高对比色，避免白底白字导致不可读。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.131`

## V2.1.132 (2025-12-17)
- **模块/页面**：设置弹层顶边下移 12px（top 92px），与信箱弹层对齐且不再遮挡导航栏；动画与尺寸保持不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.132`

## V2.1.133 (2025-12-17)
- **模块/页面**：设置弹层改为使用 headerHeight（含紧急广播高度）+12px 的固定定位，右侧对齐保持不变，确保开启紧急广播时不遮挡导航和广播条，行为与信箱弹层一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.133`

## V2.1.134 (2025-12-17)
- **模块/页面**：/admin/settings 顶部恢复紧急广播卡片（文案、样式、开关），保存即同步前台通知条；`POST /api/site/broadcast` 限制 SUPER_ADMIN 并记录发布人。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.134`

## V2.1.135 (2025-12-17)
- **模块/页面**：紧急广播设置卡片焕新（渐变背景、字数提示、左右分栏文案+样式预览、当前样式标记），整体更易读也更好看。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.135`

## V2.1.136 (2025-12-17)
- **模块/页面**：紧急广播设置卡片适配浅色主题（亮色渐变、文字与边框色分离），避免日间模式出现整块发黑的问题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.136`

## V2.1.137 (2025-12-17)
- **模块/页面**：紧急广播设置卡片背景改为纯白/纯深色，无渐变，提升日间模式的清爽感。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.137`

## V2.1.138 (2025-12-17)
- **模块/页面**：/admin/settings 拆分为“广播管理 / 游戏管理 / 存储清理”三子页，顶部按钮切换，原三块功能逻辑不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.138`

## V2.1.139 (2025-12-17)
- **模块/页面**：系统设置-游戏管理的 HTML 文件输入框适配暗色模式（背景/文字/边框），提升可读性。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.139`

## V2.1.140 (2025-12-17)
- **模块/页面**：/admin/profile 密码输入框补充 `autocomplete`，并在前端入口过滤浏览器扩展导致的未处理 Promise 报错提示，控制台更干净。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.140`

## V2.1.141 (2025-12-17)
- **模块/页面**：首页文章卡片近 7 天内的内容新增赛博光圈环绕效果，替换单一小红牌提示，更醒目且保持本站赛博美学。
- **版本**：首页 Banner 更新为 SANGUI BLOG // V2.1.141


## V2.1.142 (2025-12-17)
- **模块/页面**：近 7 天文章改用静态呼吸光圈+流光扫边的赛博描边，去除 360° 旋转，观感更克制但仍醒目。
- **版本**：首页 Banner 更新为 SANGUI BLOG // V2.1.142

## V2.1.143 (2025-12-18)
- **模块/页面**：修复根目录 `AGENTS.md` 不是 UTF-8 编码导致在 UTF-8 环境下出现乱码的问题（仅编码转换，文档内容不变）；同步站点版本号与前端 Banner fallback 至 `V2.1.143`。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.143`

## V2.1.144 (2025-12-18)
- **模块/页面**：首页顶部导航改为展示登录用户 display_name（含中文昵称），不再误用 username。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.144`


## V2.1.145 (2025-12-18)
- **模块/页面**：前台导航栏所有中文文案统一修复为 UTF-8（首页/后台/深色/浅色/登录/退出），避免乱码。
- **版本**：首页 Banner 更新为 SANGUI BLOG // V2.1.145

## V2.1.146 (2025-12-18)
- **模块/页面**：统一图片占位/失败回退组件，导航与头像使用懒加载；头像上传自动压缩（<=512px，80%左右质量），减小流量提升加载体验。
- **版本**：首页 Banner 更新为 SANGUI BLOG // V2.1.146


## V2.1.147 (2025-12-19)
- **模块/页面**：修复自动登录场景导航头像因首次加载失败而卡在默认占位的问题，图片组件在 src 变化时会重置错误状态并重新加载。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.147`

## V2.1.148 (2025-12-19)
- **模块/页面**：清理前端 lint 报错，放宽与当前代码风格不匹配的 lint 规则，并移除未使用代码/补齐 React Hook 引入。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.148`

## V2.1.149 (2025-12-19)
- **模块/页面**：继续清理前端 lint warning，调整 Hook 依赖与未使用项，确保 lint 零告警。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.149`

## V2.1.150 (2025-12-19)
- **模块/页面**：后台用户管理密码输入补充 autocomplete 属性，消除浏览器控制台黄色警告。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.150`

## V2.1.151 (2025-12-19)
- **模块/页面**：后台用户管理微信二维码地址输入补充 autocomplete 属性，消除浏览器控制台黄色警告。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.151`

## V2.1.152 (2025-12-19)
- **模块/页面**：个人资料页 GitHub 地址输入补充 autocomplete 属性，消除浏览器控制台黄色警告。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.152`

## V2.1.153 (2025-12-22)
- **模块/页面**：首页顶部导航将“游戏”文案调整为“工具”，仅修改前端显示文案。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.153`

## V2.1.154 (2025-12-22)
- **模块/页面**：前端新增 `/tools` 路由并保持 `/games` 兼容跳转；导航与页面跳转统一指向 `/tools`，后端接口与存储保持不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.154`

## V2.1.155 (2025-12-22)
- **模块/页面**：工具页正文标题由“游戏中心”调整为“工具中心”，保持页面结构不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.155`

## V2.1.156 (2025-12-22)
- **模块/页面**：文章详情页作者信息区新增标签展示，标签位于头像右侧、后台编辑按钮左侧，支持多标签换行。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.156`

## V2.1.157 (2025-12-22)
- **模块/页面**：移动端首页隐藏作者卡片/分类导航/最新评论/全部标签，仅保留系统状态、文章搜索与文章列表；桌面端排版保持不变，相关功能继续通过顶部黄色按钮进入。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.157`

## V2.1.158 (2025-12-22)
- **模块/页面**：修复移动端“返回顶部”按钮轻触无响应的问题，保留拖拽移动与桌面端行为一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.158`

## V2.1.159 (2025-12-22)
- **模块/页面**：修复移动端导航抽屉按钮点击无响应问题，抽屉可正常展开，登录入口恢复可用。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.159`

## V2.1.160 (2025-12-22)
- **模块/页面**：后台移动端新增抽屉式导航（默认收起，可展开），主体区域支持横向滚动以适配表格信息；桌面端布局与样式保持不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.160`

## V2.1.160 (2025-12-22)
- **模块/页面**：拆分 AppFull.jsx，后台管理组件迁移至 `SanguiBlog-front/src/appfull/AdminPanel.jsx`，共享常量与工具抽离到 `SanguiBlog-front/src/appfull/shared.js`，前台逻辑保持不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.160`

## V2.1.161 (2025-12-22)
- **模块/页面**：修复 AppFull 拆分后缺失 `extractHexFromBgClass` 导致的首页渲染报错，统一抽到 `shared.js` 并补齐导入。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.161`

## V2.1.162 (2025-12-22)
- **模块/页面**：进一步拆分 AppFull 前台组件，新增 `appfull/public`（ArticleDetail/Hero/ArticleList 等）与 `appfull/ui`（Navigation/ScrollToTop/提示条等），主文件仅保留编排逻辑。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.162`

## V2.1.163 (2025-12-22)
- **模块/页面**：修复拆分后 `TiltCard.jsx` 误带广播配置导致的 AlertTriangle 未定义报错，恢复为纯粹的倾斜卡片组件。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.163`

## V2.1.164 (2025-12-22)
- **模块/页面**：修复 `EmergencyBar.jsx` 拆分后缺失 `BROADCAST_STYLE_CONFIG` 导致白屏，补回广播样式配置。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.164`

## V2.1.165 (2025-12-22)
- **模块/页面**：修复导航与点击涟漪组件的动效依赖丢失问题，补齐 framer-motion 导入，避免运行期 undefined 报错。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.165`

## V2.1.166 (2025-12-22)
- **模块/页面**：修复 ArticleList 拆分后遗漏 `CATEGORY_TREE` 导入导致的运行期报错，并整理 import 断行。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.166`

## V2.1.167 (2025-12-22)
- **模块/页面**：修复 ArticleList 缺少 `MOCK_USER` 导入导致的运行期报错。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.167`

## V2.1.168 (2025-12-22)
- **模块/页面**：修复 ArticleList 缺少 `StatsStrip` 引用导致的运行期报错，补齐组件导入。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.168`

## V2.1.169 (2025-12-22)
- **模块/页面**：修复 ArticleList 缺少 `Filter` 图标导入导致的运行期报错。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.169`

## V2.1.170 (2025-12-22)
- **模块/页面**：修复 ArticleList 中 `AnimateSharedLayout` 未定义的问题，改用 `LayoutGroup` 并补齐导入。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.170`

## V2.1.171 (2025-12-22)
- **模块/页面**：修复 ArticleList 缺少 `Code` 图标导入导致的运行期报错。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.171`

## V2.1.172 (2025-12-22)
- **模块/页面**：修复 ArchiveView 缺少 `useLayoutOffsets` 与 `MOCK_POSTS` 导入导致的运行期报错，并整理 import 断行。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.172`

## V2.1.173 (2025-12-22)
- **模块/页面**：修复 shared.js 中文编码导致归档页乱码的问题，并将广播样式配置统一抽到 shared.js，供前台与后台共用。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.173`

## V2.1.174 (2025-12-22)
- **模块/页面**：修复后台发文页缺少 `useBlog` 导入导致的运行期报错。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.174`

## V2.1.175 (2025-12-22)
- **模块/页面**：修复后台发文/分类相关页面缺少 `fetchCategories` 与 `fetchTags` 导入导致的分类与标签加载失败问题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.175`

## V2.1.176 (2025-12-23)
- **模块/页面**：首页 System Status 统计口径改为仅统计已发布文章（文章数/浏览量/评论量/标签数/最后更新）。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.176`

## V2.1.177 (2025-12-23)
- **模块/页面**：统一前端文件编码为 UTF-8，修复 `ClickRipple.jsx` 的中文注释乱码问题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.177`

## V2.1.178 (2025-12-23)
- **模块/页面**：GeoLocation 缓存改用 Caffeine（TTL + 最大容量）以避免无上限内存增长。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.178`

## V2.1.179 (2025-12-23)
- **模块/页面**：收敛 CORS 白名单配置，改为通过 `application.yaml` 控制允许域名与本地端口。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.179`

## V2.1.177 (2025-12-23)
- **模块/页面**：首页作者简介支持 HTML 渲染，个人简介字段可包含 HTML 标签展示。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.177`

## V2.1.178 (2025-12-23)
- **模块/页面**：用户表 `bio` 字段扩展为 TEXT，支持更长的个人简介内容。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.178`

## V2.1.179 (2025-12-23)
- **模块/页面**：首页作者卡片的 GitHub/微信按钮在白天模式下保持深色图标，避免 hover 时图标发白难辨。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.179`

## V2.1.180 (2025-12-23)
- **模块/页面**：移动端深色模式下通知邮箱按钮改用深色底+白色图标，避免白色图标与白底混在一起。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.180`

## V2.1.181 (2025-12-24)
- **模块/页面**：修复工具中心“进入”按钮引用 `buildAssetUrl` 缺少导入导致新标签无法打开的问题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.181`

## V2.1.182 (2025-12-24)
- **模块/页面**：修复站点 meta 版本号仍为旧值导致线上首页短暂回退显示的问题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.182`

## V2.1.183 (2025-12-24)
- **模块/页面**：为归档/关于页面补齐路由与视图映射，导航切换时 URL 同步更新，统一由 `viewNavigation` 维护视图跳转规则。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.183`

## V2.1.184 (2025-12-24)
- **模块/页面**：修复后台子路由跳转后被视图同步逻辑强制拉回 `/admin` 的问题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.184`

## V2.1.185 (2025-12-24)
- **模块/页面**：调整导航头像跳转逻辑，首次进入后台停留在 `/admin`，仅在后台内点击头像才进入 `/admin/profile`。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.185`

## V2.1.186 (2025-12-24)
- **模块/页面**：补齐关于页访问日志埋点，确保 `/about` 与首页/归档/工具一致写入后台访问记录。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.186`

## V2.1.187 (2025-12-24)
- **模块/页面**：修复后台广播发布缺少 `updateBroadcast` 导入导致的运行期报错。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.187`

## V2.1.188 (2025-12-24)
- **模块/页面**：修复后台评论发布缺少 `createComment` 导入导致的运行期报错。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.188`

## V2.1.189 (2025-12-24)
- **模块/页面**：庆典公告改为仅展示文案，移除图标与标题，并为两侧增加烟花装饰；后台广播预览同步样式。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.189`

## V2.1.190 (2025-12-24)
- **模块/页面**：升级庆典公告的顶部广播 UI，加入彩带高光、烟花、纸屑与暖色光晕，并同步后台 `/admin/settings` 广播预览风格。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.190`

## V2.1.191 (2025-12-24)
- **模块/页面**：庆典公告取消装饰元素，改为红金/香槟金渐变底，并同步后台 `/admin/settings` 广播预览的简洁样式。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.191`

## V2.1.192 (2025-12-24)
- **模块/页面**：微调庆典公告红金/香槟金渐变配比，提升视觉过渡观感。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.192`

## V2.1.193 (2025-12-24)
- **模块/页面**：广播关闭状态写入 sessionStorage，当前会话内不再显示广播，刷新页面保持关闭。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.193`

## V2.1.194 (2025-12-24)
- **模块/页面**：修复文章页夜间模式下评论回复“取消”按钮不清晰的问题，补齐深色样式与悬停态。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.194`

## V2.1.195 (2025-12-24)
- **模块/页面**：文章详情页正文下方新增“上一篇 / 下一篇”快捷卡片，显示摘要信息并支持快速跳转。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.195`

## V2.1.196 (2025-12-24)
- **模块/页面**：修复文章详情页头像兜底引用未定义常量导致的运行时报错，统一使用 `DEFAULT_AVATAR`。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.196`

## V2.1.197 (2025-12-24)
- **模块/页面**：文章正文结束处加入“正文到此结束”分界线，并重排上一篇/下一篇卡片布局与按钮样式。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.197`

## V2.1.198 (2025-12-24)
- **模块/页面**：文章详情页前后篇卡片移除摘要展示，统一标题高度与按钮位置，左右布局更规整。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.198`

## V2.1.199 (2025-12-24)
- **模块/页面**：修复文章页评论快捷跳转首点偏移，并移除前后篇卡片中的箭头与按钮，改为整卡点击。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.199`

## V2.1.200 (2025-12-24)
- **模块/页面**：移除文章详情页前后篇区域的大卡片包裹，改为标题提示 + 双卡片直接展示。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.200`

## V2.1.201 (2025-12-24)
- **模块/页面**：正文结束分界线下新增“同分类推荐”模块，展示最多 3 篇同分类文章并可跳转。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.201`

## V2.1.202 (2025-12-24)
- **模块/页面**：文章详情页新增目录浮层，自动抓取 h2/h3；桌面端侧栏展示，移动端抽屉呼出。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.202`

## V2.1.203 (2025-12-24)
- **模块/页面**：目录浮层改为简洁列表样式，移除按钮边框感，隐藏横向滚动条，并增加桌面端收起/展开按钮。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.203`

## V2.1.204 (2025-12-24)
- **模块/页面**：目录浮层左侧与顶部评论按钮左侧对齐，改善视觉对齐关系。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.204`

## V2.1.205 (2025-12-24)
- **模块/页面**：目录浮层与同分类推荐/前后篇卡片改为直角边缘，整体更利落。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.205`

## V2.1.206 (2025-12-24)
- **模块/页面**：目录浮层支持抓取 h1/h2/h3 标题层级。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.206`

## V2.1.207 (2025-12-25)
- **模块/页面**：修复文章详情页初次进入时目录浮层贴边问题，目录会在入场动画完成后重新对齐评论按钮。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.207`

## V2.1.208 (2025-12-25)
- **模块/页面**：归档页加载中不再显示大面积虚线占位框，改为简洁加载提示卡片。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.208`

## V2.1.209 (2025-12-25)
- **模块/页面**：归档页所有卡片圆角统一改为直角，与首页卡片风格一致。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.209`

## V2.1.210 (2025-12-25)
- **模块/页面**：工具中心（/tools）卡片改为直角风格，并统一为首页同款黑边阴影卡片样式。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.210`

## V2.1.211 (2025-12-25)
- **模块/页面**：工具中心刷新中不再叠加展示旧卡片，加载骨架仅在刷新阶段显示。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.211`

## V2.1.212 (2025-12-25)
- **模块/页面**：全站保持滚动条占位，避免 /tools 刷新时滚动条消失导致导航条闪动。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.212`

## V2.1.213 (2025-12-25)
- **模块/页面**：归档页刷新时隐藏旧归档内容，仅展示加载提示，避免加载卡片叠加旧内容。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.213`

## V2.1.214 (2025-12-25)
- **模块/页面**：归档页改为“摘要 + 按月懒加载”模式，新增后端归档摘要与按月接口，前端进入视口时再加载月份文章。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.214`

## V2.1.215 (2025-12-25)
- **模块/页面**：设置面板内条目卡片与下拉框改为直角样式，保持外层面板不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.215`

## V2.1.216 (2025-12-25)
- **模块/页面**：设置面板移除“选择后立即生效”提示文字，界面更简洁。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.216`

## V2.1.217 (2025-12-25)
- **模块/页面**：新增会话超时弹窗与全局登出联动，前端在 token 过期/401/权限接口 403 时自动提示“长时间未操作已退出”，确认后跳转登录页，避免后台继续显示 403。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.217`

## V2.1.218 (2025-12-25)
- **模块/页面**：收紧安全链放行范围，`/api/posts/**` 与 `/api/comments/**` 仅允许 GET 访问，写操作必须登录并通过权限校验。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.218`

## V2.1.219 (2025-12-25)
- **模块/页面**：恢复登录态失败时若返回 401/403 均清理本地 token，避免前端卡在无权限状态并反复 403。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.219`

## V2.1.220 (2025-12-25)
- **模块/页面**：JWT Base64URL 解码补齐 `=`，避免 exp 解析失败导致过期判断失效。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.220`

## V2.1.221 (2025-12-25)
- **模块/页面**：埋点类公共请求（如 `/analytics/page-view`）命中 401 时不再触发会话失效弹窗，避免打断前台浏览体验。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.221`

## V2.1.222 (2025-12-26)
- **模块/页面**：修复后台访问日志（`/admin/analytics`）来源识别：文章详情页后端埋点补齐前端透传的 referrer，支持解析搜索引擎来源并在日志中展示“搜索引擎：关键词”（如“谷歌：MyBatis 源码解析”），同时流量来源统计对搜索引擎按引擎名聚合，避免关键词维度爆炸。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.222`

## V2.1.223 (2025-12-26)
- **模块/页面**：修复文章详情页访问不存在 ID（`/article/xxxx`）时错误回退为“最新文章占位”的问题：新增文章加载状态与 404 分支，后端返回不存在/未发布时前端明确展示 404，不再展示错误标题/摘要与空正文。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.223`

## V2.1.224 (2025-12-26)
- **模块/页面**：修复归档页（`/archive`）文章卡片标签顺序抖动：前后端统一对 tags 做稳定排序，避免因后端 Set/无序集合序列化导致同一文章标签顺序在加载后发生变化。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.224`

## V2.1.225 (2025-12-26)
- **模块/页面**：修复前端潜在 XSS 注入面：移除 Markdown 渲染中的 `rehype-raw`（不再执行原生 HTML），并引入 HTML/Markdown 清洗（`rehype-sanitize` + `DOMPurify`）对文章正文 HTML 与作者简介等 `dangerouslySetInnerHTML` 输出做安全过滤，阻断 `javascript:` 链接与脚本注入。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.225`

## V2.1.226 (2025-12-26)
- **模块/页面**：修复后端全局异常处理信息泄露风险：移除 `printStackTrace`，统一使用 `log.error` 记录堆栈；生产环境对外固定返回“服务器内部错误”，仅在 `dev/local` profile 下返回真实异常 message 便于调试。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.226`

## V2.1.227 (2025-12-26)
- **模块/页面**：修复后端 `System.out.println` 直出日志：站点广播与 meta 输出统一改用 slf4j（`log.info/debug`），日志不再输出完整广播 content，仅记录长度/状态，降低信息泄露与线上日志污染风险。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.227`

## V2.1.228 (2025-12-26)
- **模块/页面**：修复首页文章列表性能：从“前端一次性拉取大量文章 + 本地过滤/分页”调整为“后端分页（`GET /api/posts`）+ 前端按页查询”；分类筛选支持父分类包含子分类文章；文章详情页新增 `neighbors` 接口获取上一篇/下一篇/同分类推荐，避免依赖首页全量文章列表。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.228`

## V2.1.229 (2025-12-26)
- **模块/页面**：修复前端白屏：移除 `AppFull.jsx` 中遗留的 `posts` 引用（已切换为后端分页 `postsPage`），避免运行时 `ReferenceError: posts is not defined` 直接导致页面崩溃。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.229`

## V2.1.230 (2025-12-26)
- **模块/页面**：优化浏览量限流实现：用 Caffeine TTL 缓存（IP+post，10 分钟过期 + 最大容量上限）替代 `VIEW_RATE_LIMITER.size() > 5000` 直接 `clear()` 的演示型做法；缓存与 10 分钟数据库去重窗口对齐，减少抖动与 DB 压力，并在异常时回滚缓存占位避免误伤计数。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.230`

## V2.1.231 (2025-12-26)
- **模块/页面**：清理前端遗留未使用组件：删除 `src/components/ArticleDetail.jsx`（旧版详情页组件，包含 `dangerouslySetInnerHTML` 且当前无引用），避免后续维护者误改错文件并降低潜在误用风险。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.231`

## V2.1.232 (2025-12-26)
- **模块/页面**：补齐后端统一 HTTP 安全响应头：在 Spring Security 中新增 CSP、Referrer-Policy、X-Frame-Options、HSTS（仅 https 生效）、Permissions-Policy、X-Content-Type-Options，作为前端 XSS 清洗之外的第二道防线，降低被嵌入点击劫持与浏览器侧能力滥用风险。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.232`

## V2.1.233 (2025-12-26)
- **模块/页面**：统一后端错误码语义：新增 `NotFoundException` 并由全局异常处理映射为 404；将文章/评论/分类/标签/游戏页/角色等“资源不存在”场景从 `IllegalArgumentException`（400）调整为 404，便于 SEO/爬虫与日志分析；同时补齐 `IllegalStateException` 的 400 映射，避免状态类异常误返 500。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.233`

## V2.1.234 (2025-12-26)
- **模块/页面**：优化文章列表/归档列表性能：修复 `PostService.toSummary` 的 N+1 查询风险，分页返回前批量统计每篇文章的已审核评论数（group by post_id）并批量加载标签（post_tags join tags），同时通过 `@EntityGraph` 预加载 category/author，避免列表页与归档月列表在文章增多后导致 DB QPS 飙升。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.234`

## V2.1.235 (2025-12-26)
- **模块/页面**：修复后端启动编译失败：调整 `SecurityConfig` 中安全响应头链式调用方式，避免 `permissionsPolicy` 配置返回类型差异导致 `.contentTypeOptions(...)` 找不到方法，从而引发 `java: 找不到符号` 编译错误。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.235`

## V2.1.236 (2025-12-26)
- **模块/页面**：优化前端后台交互与日志规范：后台管理页移除 `alert()` 弹窗，统一改用 `AdminNoticeBar + useTimedNotice` 的非打断式提示；新增 `src/utils/logger.js`，将全站零散的 `console.warn` 收敛为可控输出（开发环境全量、生产环境采样，支持通过 `VITE_LOG_SAMPLE_RATE` 配置，并预留 Sentry 接入点）。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.236`

## V2.1.237 (2025-12-26)
- **模块/页面**：修复首页二级分类筛选加载体验：筛选/分页触发 `postsLoading` 时隐藏旧文章卡片，避免“加载中卡片 + 旧卡片堆叠”的视觉别扭；同时清理仓库根目录遗留的入口原型 `App.jsx`，避免后续维护者误改。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.237`

## V2.1.238 (2025-12-26)
- **模块/页面**：修复首页筛选加载期的“未找到匹配文章”误提示：仅在 `postsLoading=false` 且无错误、列表为空时才展示“未找到/NO DATA”，加载过程中只显示“文章加载中…”骨架提示，避免误导与视觉冲突。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.238`

## V2.1.239 (2025-12-26)
- **模块/页面**：优化首页筛选加载体验：当 `postsLoading=true`（或加载失败）时隐藏分页页码，仅在列表数据加载完成且无错误时展示页码，避免“内容未出但页码先出”的违和感。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.239`

## V2.1.240 (2025-12-26)
- **模块/页面**：仓库维护性治理：对前端做“引用追踪 + legacy 收拢”，将无引用的早期原型组件迁入 `SanguiBlog-front/src/legacy/` 并增加弃用说明；将未引用的模板资源 `react.svg` 迁入 legacy；补充 `.gitignore` 忽略 `pw-temp/`，降低误提交与误维护风险；对 `NOTE.md`/`AGENTS.md`/`AGENTS-EDIT.md` 做 UTF-8（无 BOM）与不可见控制字符清理，避免复制/搜索异常与协作踩坑。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.240`

## V2.1.241 (2025-12-27)
- **模块/页面**：仓库 UTF-8/换行符规范化：新增根目录 `.editorconfig` 与 `.gitattributes`，统一文本编码为 UTF-8、换行符为 LF，降低在不同终端/编辑器下出现乱码与 diff 噪声的风险。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.241`

## V2.1.242 (2025-12-27)
- **模块/页面**：前端可维护性拆分：将首页渲染组合从 `AppFull.jsx` 抽离为 `src/appfull/public/HomeView.jsx`，将页脚抽离为 `src/appfull/ui/SiteFooter.jsx`，降低 `AppFull.jsx` 体量并收敛 Home/Footer 相关逻辑与样式，便于后续分层演进。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.242`

## V2.1.243 (2025-12-29)
- **模块/页面**：后台 `/admin/settings` 游戏管理上传路径规则调整：创建游戏页时目录名改为上传 HTML 文件名（如 `register.html` -> `uploads/games/register/index.html`），并对目录/slug 冲突自动递增为 `register2`、`register3`…；若发生自动改名，会通过创建接口的 `message` 提示上传人，避免误以为覆盖了旧页面。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.243`

## V2.1.244 (2025-12-29)
- **模块/页面**：修复游戏页面 `iframe` 可能被浏览器拦截的问题：全站默认仍禁止被嵌入（`frame-ancestors 'none'` + `X-Frame-Options: DENY`），但对 `/uploads/games/**` 单独放开为仅允许同源嵌入（`frame-ancestors 'self'` + `X-Frame-Options: SAMEORIGIN`），确保工具页可正常通过 `iframe` 展示上传的 HTML。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.244`

## V2.1.245 (2025-12-29)
- **模块/页面**：统一存储根路径文档与默认配置：将 `storage.base-path` 默认值调整为跨平台相对路径 `uploads`，并在 `NOTE.md` 明确生产环境建议通过 `STORAGE_BASE_PATH` 指向 `/home/sangui/uploads`（或实际挂载目录），避免因工作目录变化导致落盘位置漂移。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.245`

## V2.1.246 (2025-12-29)
- **模块/页面**：修复首页页脚默认版权文案显示异常：将 `Copyright ©` 改为更稳妥的 `Copyright (c)`，避免部分环境/字体导致 © 被替换成问号等乱码字符。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.246`

## V2.1.247 (2025-12-29)
- **模块/页面**：优化游戏页上传 slug 规则对中文文件名的兼容性：创建游戏页时 slug 默认取上传 HTML 文件名（去扩展名），英文仍按 URL-safe 规则生成；当文件名包含中文等非 ASCII 字符时，slug 尽量保留 Unicode 字符（并过滤 Windows 不允许的目录字符与控制字符），避免退化为 `game`；同时保持目录冲突时自动递增为 `xxx2/xxx3...` 并提示上传人。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.247`

## V2.1.248 (2025-12-29)
- **模块/页面**：修复环境切换脚本破坏 YAML 缩进的问题：`scripts/switch-env.ps1` 改为在原有缩进基础上只替换值（保留前导空格与注释后的空格），避免切换 dev/prod 后 `application.yaml` 出现 `site:` 下子项缩进不一致导致解析异常；同时统一 `application.yaml` 中 `storage/site` 块的缩进为 2 空格，并补充 `ChangeEnv.md` 说明。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.248`

## V2.1.249 (2025-12-29)
- **模块/页面**：修复生产环境静态资源域名误指向问题：生产环境切换时将 `site.asset-base-url` 固定写入为 `http://sangui.top/uploads`（不再依赖 `ASSET_BASE_URL` 覆盖），避免误配环境变量导致 `/uploads/**` 资源前缀变为 `new.sangui.top` 等非预期域名。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.249`

## V2.1.249 (2025-12-30)
- **模块/页面**：新增首个对外发布版本 Release 文档 `release/V2.1.249.md`，用于发布页/公告直接引用。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.249`

## V2.1.250 (2025-12-31)
- **模块/页面**：后台访问日志（`/admin/analytics`）首页标题打点优化：将首页访问从 `Home` 调整为 `home(当前页/总页数)`（如 `home(1/16)`），并在首页文章列表分页请求完成后计算 `当前页/总页数` 写入访问日志；由于首页 URL 不包含页码信息，翻页时也能得到准确可读的日志标题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.250`

## V2.1.251 (2025-12-31)
- **模块/页面**：后台访问日志（`/admin/analytics`）分页交互增强：新增数字页码按钮（含省略号折叠），支持直接跳转到任意页；与“条数/页”联动，切换每页条数会回到第 1 页，并避免重复拉取导致的额外请求。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.251`

## V2.1.252 (2025-12-31)
- **模块/页面**：后台访问日志“清理我的访问日志”能力补强：除按 userId 清理与按历史 IP 反向清理匿名记录外，额外删除 `viewer_ip=127.0.0.1` 的匿名访问日志，解决本地/反代环境下回环地址导致的清理残留问题。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.252`

## V2.1.253 (2025-12-31)
- **模块/页面**：后台访问日志（`/admin/analytics`）新增筛选/检索：支持按 IP、关键词、用户状态（已登录/访客）与日期区间过滤访问日志；后端 `/api/admin/analytics/page-views` 扩展对应查询参数并以 JPA Specification 组合条件查询，前端新增筛选栏与“查询/重置”操作，显著提升排障效率。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.253`

## V2.1.254 (2025-12-31)
- **模块/页面**：新增 uploads 同步脚本 `scripts/sync-uploads.bat`：通过 `scp` 拉取生产端 `/home/sangui/uploads/games` 到临时目录，再用 `robocopy /MIR` 镜像到本地 `uploads/games`，确保“以生产端为准”且不对远程做任何写操作；同时 `NOTE.md` 补充使用方式，并在 `.gitignore` 忽略 `scripts/.tmp/` 避免临时目录误提交。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.254`

## V2.1.255 (2025-12-31)
- **模块/页面**：修复 uploads 同步脚本在 Windows 下双击运行报错的问题：由于仓库 `.gitattributes` 强制文本使用 LF，导致 `.bat` 被 `cmd.exe` 解析异常；现改为 ASCII 的 `scripts/sync-uploads.bat` 作为包装器，核心逻辑迁移到 `scripts/sync-uploads.ps1`（PowerShell 处理 UTF-8 更稳），并在 `.gitattributes` 为 `*.bat/*.cmd` 单独指定 `eol=crlf`。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.255`

## V2.1.256 (2025-12-31)
- **模块/页面**：后端新增“BotGuard”反爬风控：在 Java Web 层统一采集请求基础信息并基于进程内短期内存状态做风险评分（不依赖 Redis）；按风险分执行放行/轻度延迟/高滥用路径验证码/短暂阻断，并提供“主动降分”机制减少 NAT 场景误伤；新增验证码接口 `/api/guard/captcha` 与 `/api/guard/verify` 用于完成短期验证并下发 `sg_guard` Cookie。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.256`

## V2.1.257 (2025-12-31)
- **模块/页面**：修复后端启动失败：`SecurityConfig` 中 `addFilterBefore` 不能以自定义 Filter（`JwtAuthenticationFilter`）作为参照顺序，否则会报 “Filter does not have a registered order”；现改为以 Spring Security 内置的 `UsernamePasswordAuthenticationFilter` 作为锚点，确保 BotGuard/JWT 过滤器链可正常构建。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.257`

## V2.1.258 (2025-12-31)
- **模块/页面**：修复 BotGuard 误伤管理端：管理后台请求（如 `/api/admin/posts`、`/api/admin/analytics/page-views`）在鉴权前被 BotGuard 判定为高风险并返回 429，导致 Admin 面板 “load posts failed”；现将 `/api/admin/**`、`/api/permissions/me`、`/api/upload/**` 加入 BotGuard 白名单，仅交由 Spring Security 做认证/授权，避免真实管理员被“请求过于频繁”拦截。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.258`

## [2026-03-17] 重构 AI 聊天为用户会话表模式并收紧为登录后可用
- 背景/需求：用户要求放弃“浏览器 conversationId 自动恢复”的方案，改为数据库记录不同用户的会话与消息；新进入 AI 时默认显示空白新会话，并可切换到历史对话，同时 AI 仅限登录用户使用。
- 修改类型：feat
- 变更摘要：
  1) 新增 `ai_chat_sessions` / `ai_chat_messages` 表对应的实体与仓储，改为按登录用户隔离会话。
  2) 新增 `/api/ai/sessions`、`/api/ai/sessions/{id}/messages`，并重写 `/api/ai/chat` 为基于 `sessionId` 的上下文聊天。
  3) 前端 AI 面板改为“默认新对话 + 顶部历史会话切换”，不再打开即自动恢复上次会话。
  4) `/admin` 继续隐藏 AI 入口，同时前台也仅在已登录时显示 AI 助手入口；未登录用户无法调用相关接口。

## [2026-03-17] AI 聊天新增流式回复
- 背景/需求：用户要求 AI 回复改为流式输出，不再等待整段回答后一次性展示；思考中提示改为简短的 `...`。
- 修改类型：feat
- 变更摘要：
  1) 后端新增 `POST /api/ai/chat/stream`，基于 Spring AI 流式输出并通过 SSE 推送分片内容。
  2) 前端 AI 面板改为逐块拼接展示回复内容。
  3) 默认 pending 文案从完整句子改为 `...`。

## V2.1.259 (2025-12-31)
- **模块/页面**：修复已登录用户接口仍被 BotGuard 429 的问题：通知中心等 `isAuthenticated()` 接口（如 `/api/notifications/history`）在 JWT 鉴权生效前被 BotGuard 误判为异常并短封；现 BotGuard 在检测到请求携带“有效 JWT”时直接放行（权限仍由 Spring Security 控制），避免后台与已登录用户体验被“请求过于频繁”影响。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.259`

## V2.1.260 (2025-12-31)
- **模块/页面**：进一步降低登录态接口被 429 误伤的概率：将 `/api/notifications/**`、`/api/users/**`、`/api/permissions/**` 加入 BotGuard 白名单，让这些登录态接口优先交由 Spring Security 返回 401/403（而非被 BotGuard 提前短封 429），提升后台与通知中心稳定性。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.260`

## V2.1.261 (2025-12-31)
- **模块/页面**：修复浏览器刷新后静态资源可能被 BotGuard 429 打断的问题：BotGuard 的短暂阻断仅对 `/api/**` 生效，非 API 请求（页面入口、CSS/JS 等静态资源）即便命中短封窗口也不返回 429，避免出现“刷新后无样式/白屏”的体验问题；同时延迟策略对静态资源不生效。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.261`

## V2.1.262 (2026-01-01)
- **模块/页面**：修复访客首次打开文章列表偶发提示“文章加载失败/登录已过期”的问题：前端请求遇到 401 时先清理本地残留 token，并对公开读取接口（GET）自动无鉴权重试一次，避免必须手动刷新才能恢复。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.262`

## V2.1.263 (2026-01-01)
- **模块/页面**：优化仓库忽略规则：将前端构建压缩包 `SanguiBlog-front/dist.zip` 纳入 `.gitignore`，避免构建产物被提交导致仓库膨胀、拉取变慢。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.263`

## V2.1.264 (2026-01-01)
- **模块/页面**：新增必应站长工具（Bing Webmaster Tools）验证 meta 标记：在前端首页入口 `SanguiBlog-front/index.html` 的 `<head>` 中添加 `msvalidate.01`，用于保持站点所有权验证状态。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.264`

## V2.1.265 (2026-01-01)
- **模块/页面**：新增 Google Search Console 验证 meta 标记：在前端首页入口 `SanguiBlog-front/index.html` 的 `<head>` 中添加 `google-site-verification`，用于保持站点所有权验证状态。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.265`

## V2.1.266 (2026-01-01)
- **模块/页面**：新增百度站长平台验证 meta 标记：在前端首页入口 `SanguiBlog-front/index.html` 的 `<head>` 中添加 `baidu-site-verification`，用于保持站点所有权验证状态。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.266`

## V2.1.267 (2026-01-01)
- **模块/页面**：新增 360 站长平台验证 meta 标记：在前端首页入口 `SanguiBlog-front/index.html` 的 `<head>` 中添加 `360-site-verification`，用于保持站点所有权验证状态。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.267`

## V2.1.268 (2026-01-01)
- **模块/页面**：新增自动更新站点地图：后端提供 `GET /sitemap.xml`（XML）与 `GET /robots.txt`（文本），从数据库聚合已发布文章与已启用工具页生成站点地图，并通过缓存/变更标记/定时刷新自动更新，支持在主域名下直接访问 `https://www.sangui.top/sitemap.xml`（或 `https://sangui.top/sitemap.xml`）。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.268`

## V2.1.269 (2026-01-01)
- **模块/页面**：修复线上访问 `/sitemap.xml` 被 SPA 回退导致“自动跳回首页”的问题：补充 Nginx 精确匹配规则，将 `location = /sitemap.xml` 与 `location = /robots.txt` 优先反代到后端（放在 `try_files $uri /index.html` 前），确保 `https://www.sangui.top/sitemap.xml` / `https://sangui.top/sitemap.xml` 可直接返回 XML。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.269`

## V2.1.270 (2026-01-01)
- **模块/页面**：后台访问日志增强：后端对 `GET /sitemap.xml`（及 `/robots.txt`）的请求追加服务端 PV 记录（写入 `analytics_page_views`，`pageTitle = sitemap.xml/robots.txt`），便于超级管理员在 `/admin/analytics` 检索站点地图抓取行为；默认对同一 IP + 同一页面做 10 分钟限流，避免日志膨胀。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.270`

## V2.1.271 (2026-01-02)
- **模块/页面**：站点地图能力增强：`/sitemap.xml` 在 URL 规模超出阈值时自动返回 `<sitemapindex>` 并通过 `page` 参数分片拉取（`/sitemap.xml?page=1..N`），同时 `/sitemap.xml` 与 `/robots.txt` 支持 `ETag/If-None-Match` 条件请求返回 304，降低搜索引擎重复抓取的带宽与 CPU 成本；新增配置 `site.sitemap.max-urls-per-file` 控制单文件最大 URL 数（默认 45000）；`/robots.txt` 默认禁止抓取 `/api/`，避免接口被误收录。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.271`

## V2.1.272 (2026-01-02)
- **模块/页面**：文章详情目录体验优化：目录浮层在一/二/三级标题之间增加可区分的缩进层级（提升结构感与扫读效率），并修复暗色模式下目录滚动条轨道背景仍为白色的问题（为目录滚动区域增加暗色滚动条样式）。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.272`

## V2.1.273 (2026-01-02)
- **模块/页面**：文章详情目录可读性增强：目录浮层改为树形引导线（类似文件树），通过多级竖线与横向连接线更醒目地区分 h1/h2/h3 层级关系；桌面侧栏与移动抽屉目录同步生效，暗色滚动条样式保持不变。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.273`

## V2.1.274 (2026-01-02)
- **模块/页面**：文章图片预览体验优化：修复浏览器缩放时预览图被额外留白挤压导致“放大反而变小”的视觉问题（改为基于 `vw/vh` 的约束尺寸）；新增预览层鼠标滚轮缩放与放大后拖拽平移；移除右上角“关闭”按钮，统一为再次点击图片/遮罩关闭。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.274`

## V2.1.275 (2026-01-02)
- **模块/页面**：文章详情目录交互增强：目录浮层加入 ScrollSpy（滚动阅读时自动高亮当前章节），并在目录滚动区域自动跟随定位，降低长文查找成本；桌面侧栏与移动抽屉目录同步生效。
- **模块/页面**：补充发布说明：新增版本发布文档 `release/V2.1.275.md`，汇总自 `V2.1.249` 以来的核心对外变化与升级要点。
- **模块/页面**：更新部署文档：刷新根目录 `README.md`，同步最新配置项（JDK 21、`storage.base-path`、JWT_SECRET 等）、Nginx sitemap/robots 反代要点与 `V2.1.275` 新增的 sitemap 分片/ETag 能力说明。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.275`

## V2.1.276 (2026-01-03)
- **模块/页面**：修复后台仪表盘“访客走势图”跨年后缺失 12 月末数据的问题：访问日志聚合改为按天窗口分页拉取（适配后端 size=200 上限）并统一用 `yyyy-MM-dd` 作为日期 key，确保最近 7/14/30 天跨月/跨年均能正确展示。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.276`

## V2.1.277 (2026-01-03)
- **模块/页面**：优化后台仪表盘“访客走势图”视觉与可读性：改为 PV 柱状 + UV 折线组合图，并在鼠标悬浮到对应日期时显示该日 PV/UV 值（Tooltip + 指示线），更适合快速判断异常波动与趋势。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.277`

## V2.1.278 (2026-01-03)
- **模块/页面**：后台访问日志（`/admin/analytics`）新增“隐藏 robots/sitemap”筛选开关：仅前端过滤显示 `robots.txt` 与 `sitemap.xml` 的访问记录（不删除数据），便于排除爬虫抓取噪音；点击“重置”会自动取消该过滤并恢复显示。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.278`

## V2.1.279 (2026-01-03)
- **模块/页面**：优化后台访问日志“隐藏 robots/sitemap”为服务端分页过滤：`GET /api/admin/analytics/page-views` 新增 `excludeSystemPages=true`，在后端排除 `title=robots.txt/sitemap.xml` 且 `postId` 为空的系统页面记录，确保列表分页与 total 统计准确；前端开关改为传参请求，重置会取消该过滤。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.279`

## V2.1.280 (2026-01-03)
- **模块/页面**：后台访问日志新增“页面类型”筛选维度：`GET /api/admin/analytics/page-views` 支持 `pageType=ARTICLE|SYSTEM|PAGE`，可分别查看文章访问、系统页面（robots/sitemap）与普通页面（非文章且非系统）；前端查询区新增下拉选择，并与“隐藏 robots/sitemap”开关做互斥兼容，避免筛选冲突。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.280`

## V2.1.281 (2026-01-03)
- **模块/页面**：访问日志防爆表策略：新增按日归档表 `analytics_page_view_daily_stats`，并提供定时归档与可选滚动清理能力（`analytics.page-views.archive/cleanup` 配置控制，默认不启用清理以避免线上突然丢明细）；归档用于沉淀历史 PV/UV 日聚合，清理用于限制 `analytics_page_views` 明细体量，降低长期查询成本。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.281`

## V2.1.282 (2026-01-03)
- **模块/页面**：修复后台访问日志筛选误差：将“隐藏 robots/sitemap”与“机器页面（robots/sitemap）”的判定口径统一为日志表“文章”列的展示值（`post.title` 优先，否则 `page_title`），仅当该列精确为 `robots.txt` 或 `sitemap.xml` 时才过滤/筛选，避免误筛选与漏筛选。
- **模块/页面**：交互优化：访问日志查询区的下拉筛选（页面类型、用户状态）变更后自动按当前条件触发一次查询，无需再手动点击“查询”按钮。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.282`

## V2.1.283 (2026-01-03)
- **模块/页面**：进一步修复访问日志“隐藏 robots/sitemap/机器页面”筛选误差：后端判定逻辑改为分别对 `post.title` 与 `page_title` 做精确等值匹配（不依赖 TRIM 方言），避免因数据库函数差异导致的误筛选/漏筛选。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.283`

## V2.1.284 (2026-01-03)
- **模块/页面**：修复后台访问日志（`/admin/analytics`）“页面类型-文章访问”筛选误差：后端判定文章访问改为以可关联到真实 Post 为准，避免历史脏数据 `post_id=0/悬空外键` 导致文章筛选混入非文章记录。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.284`

## V2.1.285 (2026-01-03)
- **模块/页面**：修复后台访问日志（`/admin/analytics`）“页面类型-文章访问”筛选反向：文章访问判定改为直接基于 `analytics_page_views.post_id` 是否为空，避免 join 口径/历史数据差异导致筛选结果变成“普通页面+机器页面”的反向集合。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.285`

## V2.1.287 (2026-01-07)
- **模块/页面**：修复首页版本号显示异常（`site.version` 误为反斜杠导致 Banner 显示 `SANGUI BLOG // \`），恢复为可用版本号并同步 README 当前版本。
- **脚本**：修复 `scripts/bump-version.ps1` 对 README 版本行的正则替换，确保版本号更新脚本可用。
- **脚本/规范**：版本更新脚本默认不再自动生成 release 文档；发布说明仅在用户明确要求时生成（通过 `-CreateRelease` 开关）。
- **规范/文档**：为 `.ai/README.md` 添加 UTF-8 BOM，提升 Windows 下识别 UTF-8 的稳定性，避免显示乱码。
- **规范/文档**：修复 `.ai/README.md` 末尾新增规则的乱码内容，确保文本可读。
- **版本**：首页 Banner 更新为 `SANGUI BLOG // V2.1.287`

## [2026-03-18] 修复 AI 流式完成后被误判为 network error 的问题
- 背景/需求：用户反馈 AI 流式回复会先出现正常内容，随后被前端改写成 `network error`；切换会话后又能看到数据库里已保存的正确回复。
- 修改类型：fix
- 变更摘要：
  1) 新增前端 SSE 消费工具，收到 `complete` 后主动结束读取，避免终态后的断流被再次判成失败。
  2) AI 聊天窗口切换到新的安全流式读取函数。
  3) 聊天窗口在已完成回复后不再把后续异常覆盖成失败文案。
  4) 补充“complete 后断流”最小回归测试。
## [2026-03-18] 为 AI 助手回复接入 Markdown 渲染
- 背景/需求：用户要求 AI 对话窗口支持模型返回的 Markdown 内容，不再只按纯文本展示。
- 修改类型：feat
- 变更摘要：
  1) 新增 AI 消息 Markdown 渲染组件，复用 `react-markdown + remark-gfm + rehype-sanitize`。
  2) AI 助手消息支持标题、列表、链接、引用、表格、行内代码和代码块等 Markdown 展示。
  3) 用户自己发送的消息仍保持纯文本气泡，避免输入态显示风格突变。
  4) 补充服务端渲染回归测试，验证 Markdown 结构能正确输出为 DOM。
## [2026-03-18] 调整 AI 助手为游客可见入口、发送时提示登录
- 背景/需求：用户要求 AI 助手入口对未登录用户也可见，但未登录时首次提问不应触发真实 API，而是提示“请先登录后使用”。
- 修改类型：fix
- 变更摘要：
  1) 前台页面的 AI 助手入口不再依赖登录态显示，仅 `/admin` 及子页面继续隐藏。
  2) 未登录用户打开 AI 面板时不再请求历史会话接口。
  3) 未登录用户发送消息时仅在前端本地追加提示，不触发建会话和聊天 API。
  4) 新增 AI 助手访问控制纯函数测试。
## [2026-03-18] 修复退出登录后 AI 面板仍残留旧会话的问题
- 背景/需求：用户反馈退出登录后再次打开 AI 助手，仍会看到上一个登录用户的聊天记录，而不是默认欢迎页。
- 修改类型：fix
- 变更摘要：
  1) 新增 AI 助手登录态切换纯函数。
  2) 当用户从“已登录”切换为“未登录”时，AI 面板主动清空本地会话、消息、当前会话指针与加载状态。
  3) 退出登录后再次打开 AI 助手，恢复为默认欢迎页。
## [2026-03-18] 调整 AI 回复为贴背景的整行内容样式
- 背景/需求：用户要求 AI 回复不再使用黄色气泡，而是像 ChatGPT 一样直接在聊天背景区域展开显示；用户提问仍保留气泡。
- 修改类型：fix
- 变更摘要：
  1) 新增 AI/用户消息展示样式纯函数，统一控制两种消息的布局。
  2) AI 回复改为整行铺开的内容块，不再使用黄色气泡与 85% 宽度限制。
  3) 用户消息继续保留右侧气泡。
  4) 调整 AI Markdown 渲染的深浅色样式，使其适配“贴背景显示”的新布局。
## [2026-03-18] 重构 AI 顶部会话区为图标工具栏与历史会话浮窗
- 背景/需求：用户要求去掉顶部横向滚动的历史会话按钮，改为两个图标按钮：新对话、历史会话；点击历史会话后弹出浮窗，显示会话标题截断和相对时间。
- 修改类型：fix
- 变更摘要：
  1) 新增会话时间与标题格式化纯函数，支持“几分钟前 / 几小时前 / 昨天 / 7天内 / 30天内 / 一个月前”显示。
  2) 顶部工具区改为仅图标按钮，按钮文字改为鼠标悬停 `title` 提示。
  3) 历史会话改为浮窗列表展示，不再使用顶部横向滚动按钮条。
  4) 浮窗内每条会话显示首条用户消息标题截断和相对时间。
## [2026-03-18] 将 AI 顶部工具按钮并入头部右侧
- 背景/需求：用户要求将“新对话”“历史会话”按钮移动到 AI 面板头部，并与关闭按钮放在同一组中，同时去掉原先单独的新对话区域。
- 修改类型：fix
- 变更摘要：
  1) 头部右侧改为三按钮组合：新对话、历史会话、关闭。
  2) 原顶部第二行的新对话/历史会话区域整体隐藏。
  3) 历史会话浮窗锚定到头部按钮组右侧。
## [2026-03-18] 优化 AI 顶部会话按钮状态与历史浮窗关闭交互
- 背景/需求：用户要求当当前已是空白新会话时禁用“新对话”按钮，并为历史会话浮窗增加显式关闭按钮和点击外部关闭能力。
- 修改类型：fix
- 变更摘要：
  1) 当前处于空白新会话时，“新对话”按钮改为灰态并禁用。
  2) 历史会话浮窗右上角新增关闭按钮。
  3) 点击历史会话浮窗外部区域时自动关闭浮窗。
## [2026-03-18] 为 AI 面板增加临时浮动窗口模式
- 背景/需求：用户要求在历史会话与关闭按钮之间增加“浮动窗口”按钮，点击后使 AI 面板脱离右侧停靠，进入可拖动状态；再次点击后恢复停靠，下次打开不保留该状态。
- 修改类型：feat
- 变更摘要：
  1) 头部右侧新增浮动窗口图标按钮，位于历史会话与关闭按钮之间。
  2) 浮动模式下 AI 面板改为可拖动浮窗，再次点击按钮恢复右侧停靠。
  3) 关闭 AI 面板或重新打开时不会保留浮动态与拖拽位置。
## [2026-03-18] 优化 AI 浮动窗口的拖拽热区与归位图标
- 背景/需求：用户反馈浮动窗口当前只有边框附近才能拖动，命中范围过小，且归位状态仍沿用移动图标，体验不一致。
- 修改类型：fix
- 变更摘要：
  1) 将浮动窗口的可拖动热区改为整个顶部标题栏，不再使用边框拖拽。
  2) 仅顶部标题栏显示拖拽手势，其他区域恢复普通手势。
  3) 浮动态下的按钮图标改为归位图标，与“恢复停靠”逻辑一致。
## [2026-03-18] 修复历史会话浮窗打开时滚轮误滚主面板的问题
- 背景/需求：用户反馈打开历史会话浮窗后，滚轮有时会滚动博客首页或 AI 主聊天区，期望在历史浮窗打开期间只允许滚动历史会话列表。
- 修改类型：fix
- 变更摘要：
  1) 历史会话浮窗打开时，AI 主聊天滚动区临时锁定。
  2) AI 面板正文区域增加透明交互锁层，阻止滚轮继续传递到主聊天区。
  3) 历史会话列表滚动区增加滚动边界隔离，避免滚动穿透到底层页面。
## [2026-03-18] 为已发布博客文章接入 PgVector RAG 增强
- 背景/需求：用户要求先为当前所有已发布博客文章接入 RAG，并在未来新博客发布或已发布博客更新时自动同步新的博客知识；向量库选型为 PgVector。
- 修改类型：feat
- 变更摘要：
  1) 新增独立的 PgVector 配置和 DashScope Embedding 配置，保持现有 MySQL 业务库不变。
  2) 新增 `ai_blog_knowledge_documents` / `ai_blog_knowledge_chunks` 两张 MySQL 跟踪表，保存文章同步状态与 PgVector 文档 ID 映射。
  3) 应用启动时会全量补齐已发布博客文章知识，文章发布/更新时自动重建索引，文章下线或删除时自动移除知识。
  4) AI 聊天链路新增博客文章检索增强，会把 PgVector 召回片段作为系统上下文并返回文章来源引用。
## [2026-03-18] 为 AI 助手增加系统事实直答层与博客总览文档
- 背景/需求：用户反馈按具体文章提问时 RAG 能命中博客内容，但询问“是否已连接已发布文章”等系统能力问题时回答不够智能，希望补一层系统事实回答，并让泛主题问题更容易命中。
- 修改类型：feat
- 变更摘要：
  1) 新增 `AiAssistantCapabilityService`，对“知识库是否接入、当前支持哪些能力、是否能访问已发布文章”等系统事实问题进行直接回答。
  2) 新增博客知识总览文档自动生成逻辑，并在启动同步、文章发布更新、文章删除后自动重建到 PgVector。
  3) AI 聊天链路优先判断系统事实问题，命中后直接回复；未命中时继续走原有博客文章 RAG。
  4) 补充系统事实直答与博客总览文本生成的最小回归测试。
## [2026-03-18] 为最新文章与排序类提问增加结构化直答与保守兜底
- 背景/需求：用户反馈 AI 在回答“最新发的文章是什么”时会说出不存在的文章标题，希望避免此类排序事实问题继续由模型自由发挥。
- 修改类型：fix
- 变更摘要：
  1) `AiAssistantCapabilityService` 新增“最新已发布文章”精确直答，直接查询 MySQL 而不走纯 RAG。
  2) 新增“已发布文章总数”精确直答。
  3) 对“第几篇、排序、排行、最早”等暂未精确覆盖的结构化问题，统一返回保守引导文案，建议用户直接查看首页或归档页，避免胡乱编造文章标题。
  4) 新增对应单元测试，覆盖最新文章、文章数量和排序类保守兜底行为。
## [2026-03-18] 为文章详情页 AI 对话增加当前页面临时上下文增强
- 背景/需求：用户希望在 `/article/...` 页面内直接问“此页面主要说了什么”时，AI 能基于当前文章内容进行总结，而不是只依赖标题命中博客 RAG。
- 修改类型：feat
- 变更摘要：
  1) 前端新增当前文章页面上下文构建逻辑，只在文章详情页把标题、摘要、正文节选和当前文章链接透传给 AI 聊天接口。
  2) 后端新增 `AiCurrentPageContextService`，识别“此页面 / 这篇文章 / 本文 / 当前页面”等问题并拼装临时 system context。
  3) AI 聊天在现有系统事实层和博客文章 RAG 之外，新增“当前页面临时上下文增强”能力，离开文章页后自动失效，不入库、不建表。
  4) 补充前后端最小回归测试，覆盖当前文章页上下文构建与问题命中判定。
## [2026-03-18] 为 AI 助手增加当前登录用户身份上下文
- 背景/需求：用户希望 AI 能识别当前已登录用户的用户名和角色，并在当前对话中稳定记住，不轻易改变。
- 修改类型：feat
- 变更摘要：
  1) 新增 `AiCurrentUserContextService`，统一构建当前登录用户的用户名、显示名、头衔、角色名和角色编码上下文。
  2) AI 聊天主链在每轮请求中都会把当前登录用户信息加入 system prompt，避免模型自行猜测用户身份。
  3) 补充当前登录用户上下文的最小回归测试，并验证与现有页面上下文、系统事实层、博客 RAG 共存。
## [2026-03-18] 为超级管理员增加文本知识库导入与管理功能
- 背景/需求：用户要求在 `/admin/settings` 下新增“导入知识库”分栏，仅允许超级管理员导入自定义文本类型知识库，并在后台对已上传知识库进行增删改查，同时接入现有 AI 检索增强。
- 修改类型：feat
- 变更摘要：
  1) 新增 `ai_custom_knowledge_documents` / `ai_custom_knowledge_chunks` 两张 MySQL 表，用于保存文本知识库正文、同步状态与 PgVector 文档映射。
  2) 新增超级管理员管理接口 `/api/admin/knowledge-documents`，支持列表、详情、导入、编辑、删除。
  3) 新增 `AiCustomKnowledgeSyncService`，把导入的 `.txt` / `.md` / `.markdown` 文本自动切片并同步到现有 PgVector 向量库。
  4) `/admin/settings` 新增“导入知识库”页签，支持上传、编辑正文、启停同步、删除和查看同步状态。
  5) 站点 RAG 引用与上下文文案升级为“站点知识库”，可同时容纳博客文章和超级管理员导入的文本知识。
## [2026-03-18] 修复知识同步时稳定向量 ID 重建导致的重复键启动异常
- 背景/需求：用户启动时在新文章同步阶段遇到 `ai_blog_knowledge_chunks.uk_ai_blog_chunk_vector_document` 重复键冲突，随后 Hibernate Session 被污染并触发 `AiBlogKnowledgeChunk has a null identifier` 断言失败。
- 修改类型：fix
- 变更摘要：
  1) `AiBlogKnowledgeSyncService` 与 `AiCustomKnowledgeSyncService` 在重建知识分片前，都会先删除旧 chunk 并立即 `flush()`，避免同一稳定向量 ID 在事务内重复插入。
  2) 启动扫描改为“单篇文章/单知识文档独立事务”执行，避免一条同步失败污染整轮启动扫描的 Hibernate Session。
  3) 补充两个最小回归测试，锁定“删除旧 chunk 后先 flush，再保存新 chunk”的行为。
## [2026-03-18] 修复博客知识总览过长导致的 embedding 失败与后台设置白屏
- 背景/需求：用户启动后遇到“博客知识总览文档”因单文档 token 过长而无法写入 embedding；同时进入 `/admin/settings` 时，前端因 `loadKnowledgeDocuments` 初始化顺序错误而白屏。
- 修改类型：fix
- 变更摘要：
  1) 将博客知识总览从单条文档改为可切片的 overview chunk 文档集合，使用稳定 UUID 分片 ID 写入 PgVector，避免单文档 token 超限。
  2) 启动同步总览前会清理旧版单条总览 ID 及固定窗口内的 overview chunk ID，兼容历史数据。
  3) 重写 `AiBlogKnowledgeSupport` 与相关测试，补充总览切片回归验证。
  4) 调整 `SystemSettingsView` 中 `loadKnowledgeDocuments` 的声明顺序，修复 `/admin/settings` 白屏。
## [2026-03-18] 为后台新增仅超级管理员可见的 AI 管理页
- 背景/需求：用户要求在 `/admin` 左侧导航中新增“AI管理”页面，位于“访问日志”和“评论管理”之间，用于查看所有用户的 AI 聊天会话与完整消息记录，仅允许超级管理员访问。
- 修改类型：feat
- 变更摘要：
  1) 复用现有 `ai_chat_sessions` / `ai_chat_messages` 表，不再新增第二套 AI 审计表。
  2) 新增 `/api/admin/ai-chat/sessions` 与 `/api/admin/ai-chat/sessions/{sessionId}` 两个超级管理员专用接口，返回会话所属用户、角色、会话创建时间、更新时间以及完整消息时间线。
  3) 后台左侧导航新增“AI管理”，放置在“访问日志”和“评论管理”之间。
  4) 新增 AI 审计页，采用“左侧会话列表 + 右侧消息时间线”布局展示全站 AI 聊天记录。
## [2026-03-18] 为用户 AI 历史会话增加软删除与最近 10 条可见限制
- 背景/需求：用户要求在 AI 历史会话弹窗中为每条会话增加删除按钮，删除后仅对用户侧隐藏而不物理删除；同时用户侧最多只显示最近 10 条会话，并在列表底部提示“仅显示最近 10 条对话”。
- 修改类型：feat
- 变更摘要：
  1) 在 `ai_chat_sessions` 增加 `user_visible` 与 `user_hidden_at` 字段，实现用户侧软删除，后台 AI 管理页仍可查看全部原始会话。
  2) 新增用户侧删除接口 `DELETE /api/ai/sessions/{sessionId}`，仅隐藏当前用户拥有的会话。
  3) 新增 `AiChatSessionVisibilityService`，统一处理“用户删除会话”和“按会话最近更新时间仅保留最近 10 条可见记录”的规则。
  4) 前端历史会话弹窗新增删除图标按钮，并在列表末尾追加“仅显示最近 10 条对话”提示。
## [2026-03-18] 为后台 AI 管理页增加用户侧隐藏状态标识
- 背景/需求：用户希望超级管理员在后台 `AI管理` 页面中能直接看出某条会话当前是否仍在用户侧可见。
- 修改类型：feat
- 变更摘要：
  1) 管理员会话 DTO 新增 `userVisible` 与 `userHiddenAt` 字段。
  2) 后台 AI 管理页会话列表和右侧详情头部新增状态胶囊。
  3) 绿色表示“用户侧可见”，红色表示“用户侧已隐藏”。
## [2026-03-18] 为后台 AI 管理页增加会话可见状态筛选与隐藏时间展示
- 背景/需求：用户希望在后台 `AI管理` 页面中一键筛选“用户侧可见/已隐藏”的会话，并在已隐藏会话上明确显示 `userHiddenAt`。
- 修改类型：feat
- 变更摘要：
  1) AI 管理页新增三个筛选按钮：全部、用户侧可见、用户侧已隐藏。
  2) 左侧会话列表统计改为“筛选结果数 / 总数”。
  3) 已隐藏会话在列表卡片中显示隐藏时间。
  4) 右侧详情头部补充“用户侧隐藏于 ...”文案。
## [2026-03-18] 为后台系统设置增加 AI 助理总开关
- 背景/需求：用户希望将 `/admin/settings` 中原“导入知识库”分组改名为“AI助理”，并在同一页增加一个可一键开启/关闭 AI 的总开关，要求关闭后前端入口隐藏、后端聊天接口也停止服务。
- 修改类型：feat
- 变更摘要：
  1) 复用现有 `site_settings`，新增配置键 `ai.chat.enabled` 作为 AI 助理总开关，不再额外新建表或字段。
  2) `/api/site/meta` 返回的 `aiAssistant` 配置新增 `enabled` 字段，前端据此决定是否渲染首页 AI 入口。
  3) 新增超级管理员接口 `/api/admin/ai-assistant-settings`，用于读取和更新 AI 助理总开关。
  4) 用户侧 `/api/ai/**` 聊天链路在服务层统一校验总开关，关闭时直接拒绝请求。
  5) `/admin/settings` 中原“导入知识库”页签改名为“AI助理”，并增加 AI 总开关控制卡片，保留原有知识库导入与管理功能不变。
## [2026-03-18] 优化 AI 历史会话删除确认弹层样式
- 背景/需求：用户反馈 AI 聊天历史会话删除时仍使用浏览器默认确认框，视觉过于粗糙，希望替换为更贴合站内风格的确认 UI。
- 修改类型：fix
- 变更摘要：
  1) 新增 AI 会话删除确认文案 helper，统一标题、说明和按钮文案。
  2) AI 面板删除会话操作改为先打开站内确认弹层，再执行软删除。
  3) 删除确认弹层采用与 AI 面板一致的浅黄/深色风格、遮罩和危险按钮，不再使用浏览器原生 `window.confirm`。
## [2026-03-19] 升级站点版本号到 V2.2.0 并更新 README
- 背景/需求：用户要求将项目版本从 `V2.1.290` 升级到新的大版本，并同步首页版本展示与根目录 README 的过时内容。
- 修改类型：docs
- 变更摘要：
  1) 将站点版本号统一升级为 `V2.2.0`。
  2) 更新首页版本兜底显示。
  3) 更新根目录 README，补充 AI 助理、DashScope、PgVector 与 RAG 相关说明。
## [2026-03-19] 生成 V2.2.0 release 文档并同步 README
- 背景/需求：用户要求基于当前 `V2.2.0` 生成新的 release 文档，并检查根目录 README 中与 release 状态相关的过时内容。
- 修改类型：docs
- 变更摘要：
  1) 新增 `release/V2.2.0.md`，汇总 AI 助理大版本的对外发布说明。
  2) README 中“最新 release 文档”描述更新为 `V2.2.0`。
  3) README 中 release 目录示例版本同步更新。
## [2026-03-20] 为 AI 浮动窗口增加四边拉伸能力
- 背景/需求：用户希望 AI 聊天在进入浮动模式后，不仅可以拖动位置，还能通过四周边界自由拉伸尺寸，并在退出浮动时恢复默认停靠位置和默认大小。
- 修改类型：feat
- 变更摘要：
  1) 为浮动 AI 面板增加默认尺寸、最小尺寸和边界拉伸计算逻辑。
  2) 浮动模式下支持四边和四角拖拽拉伸，面板内容随尺寸变化自适应布局。
  3) 退出浮动模式时重置拉伸后的宽高，不保留临时尺寸到下次打开。
## [2026-03-20] 调整 AI 聊天在手机端的全屏适配与浮动限制
- 背景/需求：用户要求手机端点击 AI 聊天后直接全屏展示，并且手机端不允许进入浮动窗口状态，而是给出明确提示。
- 修改类型：fix
- 变更摘要：
  1) 新增移动端视口识别，小屏下 AI 面板直接全屏铺满显示。
  2) 手机端点击浮动按钮时不再进入浮动态，改为提示“手机端暂不支持浮动窗口”。
  3) 若桌面浮动态切换到手机宽度，会自动退出浮动并恢复默认尺寸状态。
## [2026-03-20] 为 AI 默认空窗口增加首次进入的科技风欢迎动效
- 背景/需求：用户希望 AI 聊天默认空窗口中的欢迎文案不要一次性出现，而是在首次进入时以更有科技感的方式分段跳动进入；同一浏览器会话中重复打开不再重播，重新打开浏览器后恢复首播状态。
- 修改类型：feat
- 变更摘要：
  1) 新增 `aiWelcomeIntro` helper，统一管理欢迎动效的浏览器会话级播放状态。
  2) AI 空窗口欢迎区改为分段渐入、轻微回弹、扫描光带的科技风入场动效。
  3) 欢迎动效仅在当前浏览器会话首次打开空白 AI 窗口时播放，之后重复打开关闭不再重播。
## [2026-03-20] 为 AI 系统事实层接入站点实时统计信息
- 背景/需求：用户反馈 AI 已能回答文章数量，但遇到总浏览量、总评论数、总标签数、最后更新时间等站点实时数据时仍可能乱答，希望 AI 与首页统计使用同一实时数据源。
- 修改类型：feat
- 变更摘要：
  1) 在 `SiteService` 中抽出 `currentStats()`，统一返回首页与 AI 共用的实时站点统计。
  2) `AiAssistantCapabilityService` 新增总浏览量、总评论数、总标签数、最后更新时间的结构化直答。
  3) 放宽统计类问法识别规则，支持“多少个标签”“多少评论”“总浏览量”等自然提问。
## [2026-03-20] 升级站点版本号到 V2.2.1 并同步 README
- 背景/需求：用户要求将当前站点版本从 `V2.2.0` 升级为 `V2.2.1`，只更新首页展示版本并检查 README 中的过时版本说明，不新增新的 release 文档。
- 修改类型：docs
- 变更摘要：
  1) 后端 `site.version` 与首页 `HomeView` fallback 统一更新为 `V2.2.1`。
  2) README 顶部当前版本说明更新为 `V2.2.1`。
  3) README 中 release 说明改为“当前最新现有对外 release 文档仍为 `release/V2.2.0.md`”，避免和“不新增 V2.2.1 release 文档”的要求冲突。
## [2026-03-31] 继续按首页模板修正导航透图、首屏淡出与彩蛋起点
- 背景/需求：用户要求首页顶部导航在首屏阶段直接吃到背景图上沿，首屏文案在滚动遮挡导航前逐渐淡出，同时将下半部分彩蛋背景前移到个人简介附近，且保持白天太阳/黑夜月亮和彩蛋开关正常。
- 修改类型：fix
- 变更摘要：
  1) `Hero` 改为向上铺到固定导航后面，修复首页顶部导航只露出纯白底色的问题。
  2) 首屏滚动淡出与鼠标视差拆为两层实现，避免同一个 `transform` 被滚动动画和鼠标动画互相覆盖。
  3) 首页彩蛋背景从 `StatsStrip + 文章区` 整段开始铺设，并把太阳/月亮初始高度上提，恢复更接近模板的进入位置。
## [2026-04-02] 继续按首页模板收紧首屏纵向位置与背景图存在感
- 背景/需求：用户要求对照首页模板进一步精修首屏视觉，让中间主文案和“向下探索内容”按钮整体再上移一些，同时把白天与黑夜模式下的背景图继续压淡，接近模板中“几乎只剩氛围”的透明度。
- 修改类型：fix
- 变更摘要：
  1) 下调 `Hero` 顶部内边距与副标题间距，让首屏主文案整体更靠上。
  2) 收紧 CTA 区域顶部留白，使“向下探索内容”按钮跟随主文案一起上移。
  3) 进一步降低首页背景图在浅色与深色模式下的透明度，减弱图片识别度并保留氛围层次。
## [2026-04-02] 再次校准首页首屏高度并消除夜间背景偏蓝感
- 背景/需求：用户反馈首页主文案仍然偏下，同时夜间背景仍有发蓝且底图不够隐去，需要继续大胆上提首屏内容，并把夜间背景调成更中性、更难辨认的氛围层。
- 修改类型：fix
- 变更摘要：
  1) 继续下调 `Hero` 顶部内边距，并直接将首屏内容整体上移，显著抬高首页文案与按钮位置。
  2) 将夜间模式的主色光晕从偏蓝色改为更中性的灰白色，并同步降低发光强度。
  3) 继续压低夜间背景图透明度并加重深色遮罩，减少“发蓝”和“看得太清楚”的问题。
## [2026-04-02] 调整首页下半段夜间背景为停驻月光与深蓝夜色
- 背景/需求：用户希望首页文章区的黑夜背景不要再是死黑一片，而是改成稍带蓝感的深夜色，并让月亮在向下滚动到一定位置后停住，保留淡淡月光氛围。
- 修改类型：fix
- 变更摘要：
  1) 为首页下半段单独定制夜间背景层，改成更柔和的深蓝黑渐变，而不是纯黑底。
  2) 将文章区的月亮改为 `sticky` 停驻效果，进入一定滚动区间后固定在可视区域内。
  3) 为停驻月亮补充淡月光晕与更柔和的星空亮度，避免夜间背景显得压抑生硬。
## [2026-04-02] 修复首页下半段天体停驻未生效并补齐白天太阳版本
- 背景/需求：用户反馈下半段没有实际看到月亮停驻效果，同时希望白天太阳也具备同样的停驻行为。
- 修改类型：fix
- 变更摘要：
  1) 排查发现 `sticky` 外层被多层 `overflow-hidden` 包裹导致停驻失效，现已重构下半段背景层级。
  2) 将首页文章区背景拆成“可裁切底层”和“可停驻天体层”，恢复月亮的实际停驻效果。
  3) 为白天模式补齐与夜间一致的太阳停驻逻辑，并保留柔和的日光氛围层。
## [2026-04-02] 将首页下半段改为整幅天空场景停驻
- 背景/需求：用户认为只有月亮单独停驻会显得突兀，希望连同背景天空一起停驻，且白天太阳场景同样适配。
- 修改类型：fix
- 变更摘要：
  1) 将首页文章区背景从“单独天体停驻”调整为“整幅天空场景停驻”。
  2) 白天模式下的太阳与日光背景改为同一张停驻场景，避免天体单独悬停的割裂感。
  3) 夜间模式下的月亮、月光与深蓝夜空改为统一停驻层，滚动时整体更自然。
## [2026-04-02] 对齐首页下半段月亮与月光的视觉中心
- 背景/需求：用户反馈下半段夜间场景里月亮本体与月光光晕没有对齐，视觉上显得别扭。
- 修改类型：fix
- 变更摘要：
  1) 排查确认原实现中月亮本体与光晕使用了不同的手工偏移基准，导致中心点错位。
  2) 将夜间月亮与月光改为同一定位容器内渲染，统一使用同一个中心锚点。
  3) 同步把白天太阳与日光也改成同样的对齐方式，避免两套定位逻辑继续分叉。
## [2026-04-02] 去除首页下半段与天体锚点不一致的额外背景光斑
- 背景/需求：用户继续反馈月亮与“背景里的月光”仍未对齐，经排查发现问题主要来自背景层额外叠加的独立径向光斑，而不是月亮本体容器本身。
- 修改类型：fix
- 变更摘要：
  1) 去掉白天与夜间下半段背景中写死在百分比坐标上的独立径向光斑。
  2) 改用更中性的纵向氛围渐变，避免第二团不受天体锚点控制的亮区干扰视觉。
  3) 保留与太阳/月亮同锚点的中心光晕，使天体与环境光感恢复一致。
## [2026-04-02] 修复首页页脚上方因外边距露出底层背景的问题
- 背景/需求：用户反馈首页最底部、页码之下到站点信息之上的一小段区域露出了背景图片，影响收口完整性。
- 修改类型：fix
- 变更摘要：
  1) 排查确认问题来自 `SiteFooter` 自身的 `mt-12` 外边距，而不是分页区或文章区背景缺口。
  2) 去掉页脚外边距，避免在文章区背景容器之外额外露出底层背景图。
  3) 保留页脚内部上下留白，保证视觉间距不变但背景收口完整。
## [2026-04-02] 统一首页与其他页面的唤回导航玻璃态规则
- 背景/需求：用户发现 `/archive`、`/tools` 页面在上滑或鼠标靠顶时会出现玻璃导航，但首页在相同操作下仍常常保持透明，体验不一致。
- 修改类型：fix
- 变更摘要：
  1) 排查确认首页被 `heroMode` 分支长期压制，导致离开顶部后唤回导航时也不进入玻璃态。
  2) 将玻璃态触发规则调整为“只要离开顶部且导航处于可见状态，就允许进入玻璃态”，不再被首页首屏模式长期覆盖。
  3) 同步调整导航按钮的浮动态判定，避免首页玻璃态出现时仍沿用首屏透明按钮样式。
## [2026-04-02] 收拢玻璃导航图标风格以贴近首页顶部透明态
- 背景/需求：用户反馈玻璃导航上的图标按钮与首页顶部透明态的按钮风格不一致，希望在图标、边框和按钮气质上更统一。
- 修改类型：fix
- 变更摘要：
  1) 为导航按钮新增 `glass` 风格分支，统一处理玻璃态下的图标边框、底色和高光。
  2) 将主题切换按钮与用户头像圈在玻璃态下同步改为更轻的半透明细边风格。
  3) 为强调按钮补充玻璃态适配，避免菜单/强调操作在玻璃导航上显得过重或风格跳脱。
## [2026-04-02] 继续上提首页首屏文案并放大滚动时的上移比例
- 背景/需求：用户反馈首页主文案与“向下探索内容”按钮整体仍偏下，且页面下移时文字与按钮的同步上移幅度太小，参照原始 HTML 模板希望实现更明显的首屏上提和滚动位移。
- 修改类型：fix
- 变更摘要：
  1) 继续下调 `Hero` 顶部留白并上提内容容器，明显抬高首屏文案与按钮的静态位置。
  2) 进一步压缩标题与 CTA 之间的竖向间距，让按钮随文案一起更贴近模板位置。
  3) 将首屏滚动阶段的内容层 `y` 位移幅度大幅放大，并同步加快透明度衰减，使下滑时的上移感更明显。
## [2026-04-02] 将 AI 助手入口与聊天面板收拢为站点玻璃风格并修复历史会话乱码
- 背景/需求：用户要求将前台 AI 聊天模块整体适配为当前站点的 iOS 风格玻璃视觉，同时修复历史会话页面中的中文乱码问题。
- 修改类型：fix
- 变更摘要：
  1) 复用现有 `AiAssistantWidget` 单入口，对首页悬浮入口、聊天主面板、工具图标、历史会话浮层、删除确认弹层、消息区与输入区统一收拢为玻璃风格。
  2) 将 AI 消息展示层调整为更轻的半透明卡片样式，弱化旧版黑框霓虹风格，使其与首页导航和站点整体视觉一致。
  3) 修复历史会话与删除会话弹层中多处前端硬编码乱码文本，恢复为正确的 UTF-8 中文。
## [2026-04-02] 将导航条设置面板与消息面板适配为玻璃风格
- 背景/需求：用户希望导航条右上角的“系统设置”和“邮箱/消息通知”页面也统一成当前站点的 iOS 风格玻璃视觉，避免继续沿用旧版黑边实体卡片风格。
- 修改类型：fix
- 变更摘要：
  1) 在 `Navigation.jsx` 内复用现有导航玻璃语言，新增共享的玻璃面板、玻璃按钮、玻璃信息卡片与柔和分割线样式。
  2) 将消息通知弹层的头部、列表项、头像容器、分页按钮、补全历史按钮与关闭按钮整体收拢为半透明磨砂风格。
  3) 将系统设置弹层中的卡片、图标容器、开关按钮、分页尺寸选择器与提示条统一改造成玻璃态，保持与导航和 AI 面板一致的视觉气质。
## [2026-04-02] 修正导航玻璃态下的通知可读性并补齐二级玻璃弹层
- 背景/需求：用户反馈导航条出现时打开信件面板，上方文字会因玻璃透底而不够清晰，同时设置里的彩蛋背景开关圆点方向错误，并希望“首页每页文章数”“跳转具体页”的二级选择页面也适配玻璃风格。
- 修改类型：fix
- 变更摘要：
  1) 为消息通知面板头部补充更强的磨砂顶栏与粘性头部，降低导航玻璃态叠加时的透底干扰，提升顶部文案可读性。
  2) 修正设置中“切换彩蛋背景”开关的圆点方向，使 `ON` 状态回到左侧、`OFF` 状态移到右侧，与文案位置一致。
  3) 将消息分页跳转与首页每页文章数从原生 `select` 替换为自定义玻璃弹出层，使二级选择面板也统一到站点玻璃视觉语言。
## [2026-04-02] 回退导航二级选择器交互并继续加厚通知面板可读层
- 背景/需求：用户反馈上一轮自定义二级弹层破坏了原本独立的下拉交互，导致设置与通知里的选择页面使用体验变差，同时通知面板在导航出现时顶部文字仍不够清晰。
- 修改类型：fix
- 变更摘要：
  1) 回退“首页每页文章数”和“跳转具体页”到原生独立 `select` 交互，只保留玻璃外观，不再把二级选择器嵌进当前面板滚动层。
  2) 继续提高通知面板整体底色与顶部信息条的不透明度，减少导航玻璃态叠加时的透底干扰。
  3) 重做彩蛋背景开关的文字与圆点布局，改成左右固定标签配合圆点滑动，避免 `ON/OFF` 状态切换时动画显得别扭。
## [2026-04-02] 将通知面板从导航内部拆出以修复玻璃串扰
- 背景/需求：用户继续反馈导航条出现时，打开信件后顶部文字仍然会被玻璃导航干扰，看不清；但导航隐去后又恢复正常，说明问题不只是透明度，而是层级关系本身存在串扰。
- 修改类型：fix
- 变更摘要：
  1) 排查确认信件面板仍然挂在 `motion.nav` 内部，和导航玻璃壳共用同一个父层，导致导航出现时对通知面板产生视觉干扰。
  2) 将通知面板与其遮罩层整体移出导航容器，改成和设置面板一致的独立 `fixed` 顶层弹层。
  3) 保留现有玻璃外观与分页交互逻辑，只修正层级结构，彻底避免导航显隐继续影响通知面板顶部文案可读性。
## [2026-04-02] 修复通知头像优先读取历史快照导致换头像后失效的问题
- 背景/需求：用户反馈信件列表中的评论者如果发送消息后又更换了头像，旧通知中的头像会因为仍引用历史快照路径而显示不出来，希望改为显示该用户的最新头像，其他逻辑不变。
- 修改类型：fix
- 变更摘要：
  1) 新增 `NotificationServiceTest` 失败用例，复现“通知仍返回旧头像快照而不是当前用户头像”的问题。
  2) 调整 `NotificationService.toDto` 的头像优先级，优先读取评论作者当前用户头像，再回退到评论记录头像与通知快照头像。
  3) 保持通知内容、时间、分页和前端展示逻辑不变，只修正头像来源策略。
## [2026-04-04] 修正文章页悬浮按钮与目录卡片的外轨几何关系
- 背景/需求：用户反馈文章详情页桌面端的“首页”“评论”按钮与右侧目录卡片位置反复错位，出现左右距离不一致、评论按钮与目录重叠、评论按钮未稳定位于目录上方等问题，希望三者严格共用一套布局规则。
- 修改类型：fix
- 变更摘要：
  1) 将文章页外轨定位从硬编码文章宽度改为测量实际文章容器边界，避免因视口尺寸和真实布局差异导致左右按钮距离不一致。
  2) 统一缩小桌面端悬浮按钮宽度、右侧目录宽度与外轨间距，使常见宽屏下能稳定容纳“评论按钮在上、目录卡片在下”的结构。
  3) 为桌面目录模式补充统一回退定位，保证评论按钮与目录卡片始终使用同一参考系，并留出明确的上下间隙避免重叠。
  4) 将桌面端右侧“评论按钮 + 目录卡片”改为同一个固定轨道容器，彻底消除两个独立浮层造成的错位与视觉重叠。
  5) 根据用户提供的实际截图继续做像素级微调：进一步缩小按钮、下压统一顶部基线、加大两侧外轨距离，并把目录卡片再下移一档以拉开与评论按钮的间隔。
  6) 继续将左右悬浮按钮收拢到同一条顶部固定轨道，显式使用同一个 `top: 0` 基准，消除“评论按钮与首页按钮不在同一水平线”的布局漂移。
## [2026-04-04] 移除文章页与 About 主体卡片的悬浮上移效果
- 背景/需求：用户反馈具体文章页和 `/about` 页面里的主体大卡在鼠标悬停时会轻微上移，观感不佳，希望仅移除这两处主体卡片的上移效果，其他卡片继续保留原有玻璃 hover 反馈。
- 修改类型：fix
- 变更摘要：
  1) 在共享玻璃卡片样式中新增 `home-ios-card--static` 修饰类，只禁止主体卡片的 hover 位移与对应 hover 态阴影漂移。
  2) 将文章详情页正文主卡和 About 页正文主卡挂上 `home-ios-card--static`，确保这两处主体卡片悬停时保持稳定。
  3) 保留其他玻璃卡片、按钮和导航卡的 hover 动效，不扩大影响范围。
## [2026-04-04] 适配文章页加载态与评论区底部动作按钮的玻璃 UI
- 背景/需求：用户希望具体文章页的“加载中”界面也切换到当前玻璃风格，同时将评论区底部“发布评论”“后台管理”两个动作按钮适配到文章页统一的玻璃视觉语言。
- 修改类型：fix
- 变更摘要：
  1) 将文章页加载态从旧的黑边实体卡改为玻璃骨架卡片，复用 `home-ios-card` / `home-ios-inner-card` 语言，展示文章标题与正文的加载占位。
  2) 重做评论区底部动作栏，将“发布评论”“后台管理”改为玻璃按钮，并用内层玻璃容器包裹动作区，和文章页现有材质保持一致。
  3) 顺手将 `CommentsSection.jsx` 中被旧乱码破坏的可见文案与 JSX 片段整体清理为 UTF-8 正常文本，保留原有评论、回复、编辑、删除逻辑不变。
## [2026-04-04] 收轻评论区动作条外壳并修正文章页 AI 助手层级
- 背景/需求：用户继续反馈评论区底部“发布评论 / 后台管理”外层整块包裹显得笨重难看；同时在文章详情页拖动右下角 AI 助手窗口时，AI 面板会被“首页 / 评论 / 目录”等悬浮控件压住，希望 AI 窗口始终处于最顶层。
- 修改类型：fix
- 变更摘要：
  1) 去掉评论区底部动作条外层整块玻璃包裹，只保留按钮本体的玻璃视觉，降低块状感与多余层次。
  2) 将 `AiAssistantWidget` 改为通过 `createPortal` 挂载到 `document.body`，避免继续受 `AppFull` 内容层的 `z-10` stacking context 约束。
  3) 同步抬升 AI 助手启动按钮、主面板和校验/删除弹层的 z-index，确保文章页悬浮控件不会再覆盖 AI 助手窗口。
## [2026-04-04] 统一文章页导航浮层与 AI 助手的顶层栈顺序
- 背景/需求：用户反馈在文章详情页打开导航条上的“信件”和“设置”面板时，这两个面板仍会被“首页 / 评论 / 目录”等悬浮控件压住；同时当 AI 聊天窗口与导航新窗口同时存在时，希望遵循“谁后打开，谁在上”的层级原则。
- 修改类型：fix
- 变更摘要：
  1) 新增前台共享浮层层级分配器 `overlayStack.js`，为 AI 助手、通知面板、设置面板统一提供全局顶层基准，避免继续各写各的固定 z-index。
  2) 将导航条的通知面板与设置面板改为通过 `createPortal` 挂载到 `document.body`，彻底脱离导航所在内容层的 stacking context。
  3) 为 AI 助手、通知面板、设置面板接入同一套动态层级规则，并在打开/交互时提升自身层级，实现“后打开在上、交互后也可回到最上层”的行为。
## [2026-04-04] 修复导航通知与设置面板因 portal 包裹顺序错误而无法打开
- 背景/需求：上一轮统一导航浮层与 AI 助手顶层规则后，用户反馈导航条上的“信件”和“设置”面板无法打开。
- 修改类型：fix
- 变更摘要：
  1) 排查确认问题不是按钮状态切换失效，而是 `Navigation.jsx` 中把 `createPortal(...)` 放在了 `AnimatePresence` 内部，导致通知和设置浮层没有像 AI 助手那样被正确渲染。
  2) 将导航浮层改成与 AI 助手一致的结构：先准备 `notificationOverlayLayer / settingsOverlayLayer`，再整体 portal 到 `document.body`。
  3) 保留上一轮共享层级分配器逻辑不变，只修正导航浮层的 portal 包裹顺序，恢复“能打开 + 顶层显示”的行为。
## [2026-04-04] 去掉文章页自定义代码块的右下黑色投影
- 背景/需求：用户希望具体文章页面中 Markdown 代码块保留现有自定义外观，但去掉外框右侧和下方那层黑色投影，其他样式不变。
- 修改类型：fix
- 变更摘要：
  1) 检索确认文章详情页实际使用的是 `ArticleDetail.jsx` 内部的 `CodeBlockWithCopy`，而不是通用 `MarkdownCodeBlock.js`。
  2) 仅移除文章页代码块外层容器上的 `shadow-[6px_6px_0px_0px_#000]` 类。
  3) 保留代码块的边框、圆角、标题栏、三色圆点、复制按钮和内容区样式不变，不扩大影响范围。
## [2026-04-06] 适配后台壳层与设置页/资料页的玻璃风格
- 背景/需求：用户希望后台页面 `/admin` 统一到站点现有玻璃风格，重点处理后台主导航颜色适配，以及 `/admin/settings`、`/admin/profile` 两个页面的玻璃化改造，要求尽量复用现有实现、不大改结构。
- 修改类型：fix
- 变更摘要：
  1) 将 `AdminPanel.jsx` 的后台侧栏、移动端抽屉、顶部栏、导航激活态与操作按钮统一调整为玻璃壳材质，并补充后台区域自己的浅色/深色渐变底色。
  2) 在 `SystemSettingsView` 中新增一组复用型玻璃样式常量，统一替换设置分组切换、广播管理、AI 助理、邀请码、游戏管理、存储清理、确认弹层等主要卡片/按钮/输入区，移除原先大面积黑边厚投影观感。
  3) 将 `pages/admin/Profile.jsx` 的页面底色、主体卡片、头像区、信息输入区、密码修改区与保存按钮统一调整为玻璃层次，保留原有资料更新、头像上传、密码验证逻辑不变。
## [2026-04-06] 取消后台子页面标题栏的滚动停驻
- 背景/需求：用户反馈后台各子页面顶部“当前页面标题栏”在滚动时会一直停驻在上方，例如“访问日志”“AI 会话”等，观感突兀，希望它随页面内容正常滚走，不再固定。
- 修改类型：fix
- 变更摘要：
  1) 将后台内部标题栏从 `sticky` 改为普通文档流布局，不再使用 `top: headerHeight` 的停驻策略。
  2) 补充常规底部间距，避免标题栏取消吸附后与下方主内容贴得过紧。
  3) 保留后台全局导航栏不变，仅调整后台内部当前页标题栏的滚动行为。
## [2026-04-06] 优化导航设置中彩蛋背景开关的可读性
- 背景/需求：用户反馈导航条设置面板中的“彩蛋背景”开关当前状态不够清晰，开/关不易辨认，希望开启时更高亮、关闭时更淡，并且不要同时显示 `ON/OFF` 两个词。
- 修改类型：fix
- 变更摘要：
  1) 将彩蛋背景开关改为单标签状态显示，开启时显示“已开启”，关闭时显示“已关闭”，不再同时并列展示 `ON/OFF`。
  2) 调整开关底座与滑块动画：开启态使用更明显的暖色高亮与阴影，关闭态使用更淡的灰阶底色，保留滑块位移动效但增强状态辨识度。
  3) 顺手修复 `Navigation.jsx` 中几处被旧编码污染成 JSX 语法错误的文案节点，恢复通知统计、每页文章数、登录/退出、移动端按钮等位置的正常 UTF-8 文本与可构建状态。
## [2026-04-06] 修复导航组件中文乱码
- 背景/需求：用户反馈上一轮修改后导航条、通知面板、设置面板与移动端菜单中的中文文案出现乱码，要求恢复正常 UTF-8 显示。
- 修改类型：fix
- 变更摘要：
  1) 逐项修复 `Navigation.jsx` 中主导航、品牌标题、通知面板、设置面板、登录/退出、移动端菜单等可见中文文案的乱码。
  2) 保留上一轮已经确认的彩蛋背景开关交互优化，仅恢复受编码污染的文案显示，不改业务逻辑。
  3) 重新执行前端构建验证，确认导航组件在恢复 UTF-8 文案后仍可正常打包。
## [2026-04-06] 收紧导航设置面板中的开关与下拉尺寸
- 背景/需求：用户反馈导航设置面板里的“彩蛋背景”开关和“首页每页文章数”下拉栏尺寸偏大，希望两者一起缩小一点，同时继续保持同样大小。
- 修改类型：fix
- 变更摘要：
  1) 将彩蛋背景开关从 `110x40` 左右缩小到更紧凑的 `96x36` 视觉尺寸，并同步缩小滑块与状态字距。
  2) 将“首页每页文章数”下拉框同步缩小到与开关一致的宽高和圆角节奏，保持两者同尺寸。
  3) 为两块说明文字区域补上 `min-w-0`，避免控件缩小后说明文字与右侧控件抢占空间。
## [2026-04-06] 下移首页 Hero 的“向下探索内容”按钮
- 背景/需求：用户反馈首页 Hero 区域中“向下探索内容”按钮与上方文字距离过近，希望按钮整体再向下移动一点，仅调整位置，不改变原有逻辑与动效。
- 修改类型：fix
- 变更摘要：
  1) 将桌面端 `.home-hero__actions` 的上边距继续拉大到更明显的视觉幅度，让按钮与主标题之间的呼吸感更充足。
  2) 同步调整移动端 `.home-hero__actions` 的上边距，保持桌面与移动端都拥有更自然的垂直节奏。
  3) 未修改 CTA 的 hover 动效、箭头动画、点击行为与按钮本体样式，仅移动整体位置。

## [2026-04-06] 取消首页 System Status 外层卡片的悬浮上移
- 背景/需求：用户反馈首页 System Status 外层卡片在鼠标悬停时轻微上移，观感不佳，希望仅取消外层卡的上移效果，同时保留内部状态项的原有效果。
- 修改类型：fix
- 变更摘要：
  1) 将 StatsStrip.jsx 的外层玻璃卡切换为 home-ios-card--static，仅禁用 System Status 外壳的 hover 上移。
  2) 保留内部 home-ios-chip 状态项的视觉与交互反馈，不影响其他首页卡片。
  3) 重新执行前端构建验证，确认首页其余卡片 hover 效果不受影响。

## [2026-04-06] 收敛首页亮色质感与 Hero 排版层级
- 背景/需求：用户认为当前首页相较参考模板 
ewIndex/html/indexV11.html 质感不足，希望重点从亮色模式冷调、导航与首页大卡玻璃减薄、Hero 字体层级三方面提升高级感。
- 修改类型：fix
- 变更摘要：
  1) 调整 homeRedesign.css 的亮色变量为更冷、更薄的纸感底色，并减弱背景光斑、网格、明亮高光与亮色模式阴影厚度。
  2) 将首页导航玻璃壳、图标按钮玻璃态和 home-ios-card/home-ios-inner-card 的边框、高光、模糊与阴影整体削弱约 20%~30%，让容器存在感后退。
  3) 重新收敛 Hero 与导航的字体系统：引入 Inter + Noto Sans SC 组合，调整标题字重、字距、行高与明暗渐变层级，并顺手修复首页 Hero、System Status 与站点标题的 UTF-8 中文显示。

## [2026-04-06] 继续收薄首页亮色模式的导航与卡片玻璃
- 背景/需求：用户希望继续只优化首页亮色模式，将导航和首页卡片的玻璃感再减弱约 10%，进一步提升克制、冷静的高级感。
- 修改类型：fix
- 变更摘要：
  1) 继续下调亮色模式导航玻璃的 blur、背景混合比例、亮边与阴影，减轻顶部导航的实体感。
  2) 继续下调首页大卡与内层卡的边框亮度、模糊、高光和投影，进一步压低亮色模式玻璃的厚度。
  3) 未调整暗色模式参数，保持本轮修改只作用于首页亮色模式的质感收敛。

## [2026-04-06] 继续收 Hero 排版到更接近原版的杂志感
- 背景/需求：用户希望继续只收 Hero 排版，让标题和眉文更接近参考模板 indexV11.html 的杂志封面感，不修改材质、布局和交互。
- 修改类型：fix
- 变更摘要：
  1) 将 Hero 眉文调整为更轻的字重、更大的字距和更充足的下方留白，恢复原版那种稀疏、轻盈的眉文气质。
  2) 将 Hero 标题调整为更重的字重、更紧凑的双行间距、更接近原版的负字距和更明确的行宽控制，让标题更像封面主标题。
  3) 重新收敛标题两行的渐变层级，保留首行更实、次行更淡的节奏，并同步微调移动端标题排版。

## [2026-04-06] 新增首页背景图后台管理能力
- 背景/需求：用户希望首页 Hero 背景图不再固定依赖 `bg.jpg` 手工替换，而是能在 `/admin/settings` 中查看当前背景、查看历史背景图、上传新背景图、删除历史背景图，并从历史中选择某一张作为当前首页背景。
- 修改类型：feat
- 变更摘要：
  1) 新增后端 `home_background_images` 专用表、实体、仓储、服务与 `/api/admin/home-backgrounds` 管理接口，用于记录首页背景图历史、当前选中状态、上传人和文件路径，不再把背景图历史硬塞进 `site_settings`。
  2) `SiteService.meta()` 与 `SiteMetaDto` 新增 `homeBackgroundUrl` 输出，前台首页优先读取后台当前背景图；未配置时继续回退到原有 `/static/home/bg.jpg`。
  3) `/admin/settings` 新增“首页背景”分组，复用现有设置页玻璃风格，支持上传新图、查看历史、设为当前、删除，并在操作后自动刷新首页站点 meta。

## [2026-04-06] 修正后台页顶部导航不再透出首页背景图
- 调整 Navigation 的顶部/玻璃状态判断，后台页不再进入首页顶部透明导航分支。
- 后台页顶部导航始终使用玻璃态，避免透出首页背景图导致观感不协调。
- 仅影响后台页导航外观，不改变首页原有顶部导航行为。

## [2026-04-06] 收敛前后台原生阻塞弹窗为站内确认与提示
- 背景/需求：项目中仍残留 `window.confirm` 和 `window.alert`，与仓库既有“非打断式提示/站内弹层”规范冲突，且会带来阻塞、样式割裂和移动端体验不一致的问题。
- 修改类型：fix
- 变更摘要：
  1) 在 `AdminPanel.jsx` 内新增可复用的后台确认弹层 `useAdminConfirmDialog` / `AdminConfirmDialog`，将访问日志、文章表单、标签、分类、评论、用户、游戏页、首页背景、知识库和空目录清理等危险操作统一切换为站内确认弹层。
  2) 在 `AiAssistantWidget.jsx` 内新增轻量级站内提示条 `assistantNotice`，替换移动端浮窗限制、删除会话失败和验证码验证成功等场景里的原生 `window.alert`。
  3) 新增 `src/appfull/noNativeBlockingDialogs.test.js` 回归脚本，直接断言 `AdminPanel.jsx` 与 `AiAssistantWidget.jsx` 不再出现 `window.confirm/window.alert`，并通过前端 `lint` 与 `build` 验证本轮改动可用。

## [2026-04-06] 收敛前端首包并拆出后台独立 chunk
- 背景/需求：前端主包已达到约 1.3 MB，`AppFull.jsx` 静态引入超大的 `AdminPanel.jsx`，导致非后台流量也要为后台代码买单，Vite 也持续提示 chunk 过大。
- 修改类型：fix
- 变更摘要：
  1) 将 `AppFull.jsx` 中的后台入口改为 `React.lazy + Suspense` 懒加载，`AdminPanel` 只在真正进入后台时才下载。
  2) 在 `vite.config.js` 中新增 `manualChunks`，显式拆分 `admin-panel`、`markdown`、`motion`、`icons` 与通用 `vendor`，降低首包压力并改善缓存命中。
  3) 将 `useBlogData.jsx` 里失去意义的 `import("../api")` 动态导入改回静态 `fetchCurrentUser` 调用，避免保留“看似拆包、实则已失效”的实现噪音。

## [2026-04-06] 调整后台访问日志页默认隐藏 robots/sitemap
- 背景/需求：用户希望打开 `/admin/analytics` 时，“隐藏 robots/sitemap” 开关默认处于按下状态，但不改动其余筛选和切换逻辑。
- 修改类型：fix
- 变更摘要：
  1) 将 `AnalyticsView` 中 `hideRobotsAndSitemap` 的初始状态从 `false` 调整为 `true`。
  2) 未改动按钮文本、切换逻辑、重置逻辑和机器人页面下的特殊处理。

## [2026-04-06] 将根目录 README 改为英文并保留中文版本
- 背景/需求：用户希望根目录 `README.md` 改为英文版，同时保留原始中文文档，并在英文 README 顶部提供可点击跳转到中文文档的常见语言切换链接。
- 修改类型：docs
- 变更摘要：
  1) 新增 `README.zh-CN.md`，完整保留原始中文 README 内容。
  2) 将根目录 `README.md` 替换为英文翻译版，结构与中文原文保持一致。
  3) 在英文 `README.md` 顶部加入 `[简体中文](./README.zh-CN.md)` 语言链接，便于读者切换到中文文档。

## [2026-04-06] 新增 V2.2.6 发布说明并同步 README 的 release 引用
- 背景/需求：用户准备基于当前版本 `V2.2.6` 进行新版本 release 发布，需要补齐中文 release 文档，并检查根目录 README 中是否仍存在指向旧 release 文档的过时内容；若存在，则英文 README 和中文 README 需要一起同步更新。
- 修改类型：docs
- 变更摘要：
  1) 新增 `release/V2.2.6.md` 中文发布说明，按仓库既有 release 文档风格整理本轮首页视觉、首页背景图、AI 助理、后台体验与前端工程治理的主要更新。
  2) 将根目录英文 `README.md` 中“当前最新 release 文档”的引用从 `release/V2.2.4.md` 更新为 `release/V2.2.6.md`。
  3) 将中文文档 `README.zh-CN.md` 中对应的 release 引用同步更新到 `release/V2.2.6.md`，保持中英文 README 一致。

## [2026-04-08] 深化移动端 AI 聊天键盘与输入区适配
- 背景/需求：用户反馈手机端打开全屏 AI 聊天后，在系统输入键盘弹出时输入框不会随可视区上移，底部输入区域与最新消息容易被遮挡，希望仅加强移动端输入体验，桌面端保持不变。
- 修改类型：fix
- 变更摘要：
  1) 在 `AiAssistantWidget.jsx` 中为移动端 AI 面板接入 `window.visualViewport` 监听，不再使用固定 `100vh`，改为跟随真实可视区宽高与偏移更新全屏面板尺寸。
  2) 在移动端输入框聚焦与键盘高度变化时，自动把输入区域和消息列表底部滚回可视区，缓解键盘弹出后“输入框留在下面、视觉很怪”的问题。
  3) 新增 `src/appfull/ui/AiAssistantMobileViewport.test.js`，约束移动端 AI 面板必须保留 `visualViewport` 适配和输入聚焦处理。

