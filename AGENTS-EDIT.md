# AGENTS-EDIT

## V1.1.1 (2025-11-22)
- **紧急广播联动数据库**：后台的开关按钮现在可以直接切换状态并调用统一接口，保存时通过封装的 updateBroadcast API 写入数据库，避免只改前端本地状态的情况。
- **Markdown 渲染增强**：文章详情页改用 ReactMarkdown + GFM 解析 contentMd，并针对行内/块级代码做了样式处理，原先 `  ` 等符号无法正确渲染的问题已消失。
- **版本号更新**：首页 Banner 显示为 SANGUI BLOG // V1.1.1。

## V1.1.0 (2023-10-27)
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