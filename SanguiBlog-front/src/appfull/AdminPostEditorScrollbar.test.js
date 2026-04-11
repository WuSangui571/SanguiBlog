import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/appfull/AdminPanel.jsx'), 'utf8');

assert.match(
    source,
    /const getAdminMarkdownScrollbarClass = \(isDarkMode\) => isDarkMode \? 'sg-scrollbar sg-scrollbar-dark' : 'sg-scrollbar sg-scrollbar-light';/,
    '后台文章编辑器应统一复用一套 Markdown 正文滚动条深浅色类'
);

assert.match(
    source,
    /const markdownTextareaScrollbarClass = getAdminMarkdownScrollbarClass\(isDarkMode\);[\s\S]*?ref=\{markdownEditorRef\}[\s\S]*?className=\{`\$\{inputClass\} \$\{markdownTextareaScrollbarClass\} min-h-\[420px\] font-mono text-sm overflow-y-auto`\}/,
    '发布文章页的 Markdown 正文 textarea 应显式套用深浅色滚动条类'
);

assert.match(
    source,
    /const markdownTextareaScrollbarClass = getAdminMarkdownScrollbarClass\(isDarkMode\);[\s\S]*?ref=\{markdownEditorRef\}[\s\S]*?className=\{`\$\{inputClass\} \$\{markdownTextareaScrollbarClass\} min-h-\[420px\] font-mono text-sm overflow-y-auto`\}/,
    '编辑文章页的 Markdown 正文 textarea 应显式套用深浅色滚动条类'
);

console.log('Admin post editor scrollbar tests passed');
