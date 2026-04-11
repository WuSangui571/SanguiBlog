import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const widgetSource = fs.readFileSync(path.join(__dirname, 'AiAssistantWidget.jsx'), 'utf8');
const cssSource = fs.readFileSync(path.join(__dirname, '..', '..', 'index.css'), 'utf8');

assert.match(
    widgetSource,
    /<AiMessageMarkdown[\s\S]*isAssistant=\{isAssistant\}/,
    '助手消息应继续复用统一 Markdown 组件，避免为了修复选区另起第二套渲染'
);
assert.doesNotMatch(
    widgetSource,
    /onPointerDownCapture=\{raiseAssistantOverlay\}/,
    'AI 面板根层不应在任意 pointer down 时直接提升层级，否则右键时会打断现有文本选区'
);
assert.match(
    widgetSource,
    /onPointerDownCapture=\{handlePanelPointerDownCapture\}/,
    'AI 面板根层应改为通过选择保护函数决定是否提升层级'
);
assert.match(
    cssSource,
    /\.sg-ai-message-text,\s*\.sg-ai-message-text \*[\s\S]*user-select:\s*text;/,
    'AI 助手消息文本区应显式启用浏览器原生文本选择，避免助手消息拖选不稳定'
);
assert.match(
    cssSource,
    /\.sg-ai-message-text,\s*\.sg-ai-message-text \*[\s\S]*-webkit-user-select:\s*text;/,
    'AI 助手消息文本区应补充 WebKit 文本选择兜底，避免右键复制前选区丢失'
);
assert.match(
    cssSource,
    /\.sg-ai-message-text button[\s\S]*user-select:\s*none;/,
    '代码块复制按钮等交互控件不应跟着进入文本选区'
);

console.log('AiAssistantSelection tests passed');
