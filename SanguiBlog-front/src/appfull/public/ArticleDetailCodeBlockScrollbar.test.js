import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/appfull/public/ArticleDetail.jsx'), 'utf8');

assert.match(
    source,
    /const codeScrollbarClass = isDarkMode \? 'sg-scrollbar sg-scrollbar-dark' : 'sg-scrollbar sg-scrollbar-light';/,
    '文章页代码块应根据主题选择现有的深浅色滚动条样式类'
);

assert.match(
    source,
    /<pre\s+className=\{`[^`]*\$\{codeScrollbarClass\}[^`]*`\}/,
    '文章页代码块的 <pre> 应挂载 codeScrollbarClass，避免暗色模式退回原生刺眼滚动条'
);
