# AGENTS-EDIT

版本：1.0.0
- 将所有跳转到 GitHub 的链接统一指向 https://github.com/Wusangui571，并同步个人卡片按钮。
- 在 SanguiBlog-front/public/static/contact/ 新建目录放置 wechat.jpg，代码已指向 /static/contact/wechat.jpg。
- 调整首页 Hero 标题，将星星与 CODE 图标贴合“用代码记录探索/成长”文字显示，保持原有滚动动画。
- 优化首页个人名片在黑暗模式下的 GitHub 与微信按钮配色，并使用本地存储记住暗色模式偏好。
- 新增本文件记录本次修改，方便回顾更新内容。

## V1.0.0 (2025-11-21)
本次更新包含以下内容：
1. **修复微信二维码显示问题**：修正了前端硬编码的图片路径，现在正确指向后端静态资源 `http://localhost:8080/contact/wechat.jpg`。
2. **优化点击波纹动画**：将点击坐标获取方式从 `pageX/pageY` 改为 `clientX/clientY`，解决了动画跟随鼠标滞后/偏移的问题，提升了交互手感。
3. **更新版本标识**：首页 Banner 文字已更新为 `SANGUI BLOG // V1.0.0`。
4. **代码维护**：修复了 `AppFull.jsx` 中的 JSX 语法错误（多余的闭合标签）。