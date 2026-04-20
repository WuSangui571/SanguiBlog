import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'MarkdownCodeBlock.jsx'), 'utf8');

assert.match(
    source,
    /copyTextWithFallback/,
    '通用 Markdown 代码块应复用统一剪贴板工具，避免 AI 代码块再次出现“有复制按钮但无复制结果”的分支行为'
);
assert.match(
    source,
    /setCopyState\('success'\)/,
    '复制成功后应明确进入 success 状态，供按钮文案和动效反馈复用'
);
assert.match(
    source,
    /transition-all/,
    '复制按钮应保留或增强过渡效果，便于承载成功反馈动效'
);

console.log('MarkdownCodeBlock tests passed');
