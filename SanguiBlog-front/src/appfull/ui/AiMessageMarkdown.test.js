import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import AiMessageMarkdown from './AiMessageMarkdown.js';

const html = renderToStaticMarkup(
    React.createElement(AiMessageMarkdown, {
        content: '# 标题\n\n- 列表项\n\n这是 **加粗** 文本和 `code`。\n\n```js\nconsole.log(1)\n```',
        isDarkMode: false,
        isAssistant: true
    })
);

assert.match(html, /<h1[^>]*>标题<\/h1>/);
assert.match(html, /<ul[^>]*>/);
assert.match(html, /<strong[^>]*>加粗<\/strong>/);
assert.match(html, /<code[^>]*>code<\/code>/);
assert.match(html, /console\.log\(1\)/);
assert.match(html, />JS<\/span>/);
assert.match(html, /aria-label="复制代码"/);
assert.match(html, /复制<\/button>/);

console.log('AiMessageMarkdown tests passed');
