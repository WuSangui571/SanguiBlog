import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const profileSource = readFileSync(resolve('src/pages/admin/Profile.jsx'), 'utf8');
const commentsSource = readFileSync(resolve('src/components/comments/CommentsSection.jsx'), 'utf8');
const navigationSource = readFileSync(resolve('src/appfull/ui/Navigation.jsx'), 'utf8');
const archiveSource = readFileSync(resolve('src/appfull/public/ArchiveView.jsx'), 'utf8');
const aboutSource = readFileSync(resolve('src/appfull/public/AboutView.jsx'), 'utf8');
const markdownCodeBlockSource = readFileSync(resolve('src/appfull/ui/MarkdownCodeBlock.jsx'), 'utf8');
const aiMarkdownSource = readFileSync(resolve('src/appfull/ui/AiMessageMarkdown.js'), 'utf8');
const adminPanelSource = readFileSync(resolve('src/appfull/AdminPanel.jsx'), 'utf8');

assert.match(
    profileSource,
    /const profileTextareaScrollbarClass = isDarkMode \? 'sg-scrollbar sg-scrollbar-dark' : '';/,
    '后台个人资料页应为暗色长文本域单独复用深色滚动条类'
);
assert.match(
    profileSource,
    /<textarea className=\{`\$\{inputClass\} \$\{profileTextareaScrollbarClass\} mt-2`\} rows=\{4\} name="bio"/,
    '后台个人简介 textarea 应接入暗色滚动条类'
);

assert.match(
    commentsSource,
    /const textareaScrollbarClass = isDarkMode \? 'sg-scrollbar sg-scrollbar-dark' : '';/,
    '评论区应复用统一的暗色文本域滚动条类'
);
assert.match(
    commentsSource,
    /className=\{`w-full p-4 rounded-2xl border font-bold focus:outline-none min-h-\[140px\] \$\{textareaScrollbarClass\} \$\{inputBg\}`\}/,
    '评论主输入框应在暗色模式下接入滚动条样式'
);
assert.match(
    commentsSource,
    /className=\{`w-full p-3 rounded-2xl border font-bold focus:outline-none min-h-\[100px\] \$\{textareaScrollbarClass\} \$\{inputBg\}`\}/,
    '评论回复输入框应在暗色模式下接入滚动条样式'
);

assert.match(
    navigationSource,
    /const overlayScrollbarClass = isDarkMode \? 'sg-scrollbar sg-scrollbar-dark' : '';/,
    '导航浮层应统一复用暗色滚动条类'
);
assert.match(
    navigationSource,
    /className=\{`max-h-\[calc\(92vh-132px\)\] overflow-y-auto divide-y \$\{overlayDividerClass\} \$\{overlayScrollbarClass\}`\}/,
    '通知浮层滚动区应接入暗色滚动条类'
);
assert.match(
    navigationSource,
    /className=\{`p-4 space-y-3 max-h-\[calc\(92vh-64px\)\] overflow-y-auto \$\{overlayScrollbarClass\}`\}/,
    '设置浮层滚动区应接入暗色滚动条类'
);
assert.match(
    navigationSource,
    /className=\{`flex-1 overflow-y-auto px-4 py-4 space-y-5 \$\{overlayScrollbarClass\}`\}/,
    '移动端导航抽屉滚动区应接入暗色滚动条类'
);

assert.match(
    archiveSource,
    /const quickJumpScrollbarClass = isDarkMode \? 'sg-scrollbar sg-scrollbar-dark' : '';/,
    '归档快速跳转区应复用暗色滚动条类'
);
assert.match(
    archiveSource,
    /className=\{`space-y-2 max-h-\[70vh\] overflow-auto pr-1 \$\{quickJumpScrollbarClass\}`\}/,
    '归档快速跳转滚动区应接入暗色滚动条类'
);

assert.match(
    aboutSource,
    /const codeScrollbarClass = isDarkMode \? 'sg-scrollbar sg-scrollbar-dark' : '';/,
    '关于页代码块应复用暗色滚动条类'
);
assert.ok(
    aboutSource.includes("className={`p-5 overflow-auto m-0 ${codeScrollbarClass} ${isDarkMode ? 'bg-[#0B1221]/78 text-gray-100' : 'bg-white/70 text-gray-900'}`}") ,
    '关于页代码块滚动区应接入暗色滚动条类'
);

assert.match(
    markdownCodeBlockSource,
    /const codeScrollbarClass = isDarkMode \? 'sg-scrollbar sg-scrollbar-dark' : '';/,
    '通用 Markdown 代码块应复用暗色滚动条类'
);
assert.ok(
    markdownCodeBlockSource.includes("<pre className={`m-0 overflow-auto ${codeScrollbarClass} px-5 py-4 ${isDarkMode ? 'bg-[#0B1221] text-gray-100' : 'bg-white text-gray-900'}`}>") ,
    '通用 Markdown 代码块滚动区应接入暗色滚动条类'
);

assert.match(
    aiMarkdownSource,
    /'my-3 overflow-x-auto rounded-2xl border border-white\/10 bg-white\/5 px-3 py-3 sg-scrollbar sg-scrollbar-dark'/,
    'AI 助手暗色代码块容器应显式接入暗色滚动条类'
);
assert.match(
    aiMarkdownSource,
    /'my-3 overflow-x-auto rounded-2xl border border-white\/10 sg-scrollbar sg-scrollbar-dark'/,
    'AI 助手暗色表格容器应显式接入暗色滚动条类'
);

assert.match(
    adminPanelSource,
    /const getAdminDarkScrollbarClass = \(isDarkMode\) => isDarkMode \? 'sg-scrollbar sg-scrollbar-dark' : '';/,
    '后台页应抽出统一的暗色滚动条类辅助方法，避免重复漏配'
);
assert.match(
    adminPanelSource,
    /const adminDarkScrollbarClass = getAdminDarkScrollbarClass\(isDarkMode\);/,
    '后台页应集中生成暗色滚动条类并复用'
);
assert.match(
    adminPanelSource,
    /overflow-x-auto \$\{(?:adminDarkScrollbarClass|getAdminDarkScrollbarClass\(isDarkMode\))\}/,
    '后台表格横向滚动容器应接入暗色滚动条类'
);
assert.match(
    adminPanelSource,
    /className=\{`divide-y divide-gray-200 dark:divide-gray-700 max-h-\[760px\] overflow-auto \$\{adminDarkScrollbarClass\}`\}/,
    '后台长列表滚动容器应接入暗色滚动条类'
);
assert.match(
    adminPanelSource,
    /className=\{`\$\{inputClass\} \$\{adminDarkScrollbarClass\} min-h-\[120px\]`\}/,
    '后台文章摘要 textarea 应接入暗色滚动条类'
);
assert.match(
    adminPanelSource,
    /className=\{`\$\{inputClass\} \$\{adminDarkScrollbarClass\} min-h-\[140px\] px-3 py-3 rounded-2xl focus:ring-4 \$\{isDarkMode \? 'focus:ring-sky-400\/12' : 'focus:ring-indigo-200\/60'\}`\}/,
    '后台广播内容 textarea 应接入暗色滚动条类'
);
assert.match(
    adminPanelSource,
    /className=\{`\$\{inputClass\} \$\{adminDarkScrollbarClass\} min-h-\[280px\] px-3 py-3`\}/,
    '后台知识库正文 textarea 应接入暗色滚动条类'
);
assert.match(
    adminPanelSource,
    /className=\{`\$\{inputClass\} \$\{adminDarkScrollbarClass\} font-mono text-sm leading-6 min-h-\[520px\]`\}/,
    '后台关于页 Markdown 正文 textarea 应接入暗色滚动条类'
);

console.log('Dark scrollbar coverage tests passed');
