import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'AiAssistantWidget.jsx'), 'utf8');

assert.match(
    source,
    /三桂 AI 助理的回答未必正确无误，请注意甄别。/,
    'AI 聊天面板应提供常驻风险提示语，提醒用户甄别 AI 回答内容'
);

assert.match(
    source,
    /<form[\s\S]*assistantConfig\.inputPlaceholder[\s\S]*AI_ASSISTANT_DISCLAIMER_TEXT[\s\S]*<\/form>/,
    '风险提示语应放在输入区附近，而不是为每条助手回复重复追加一遍'
);

console.log('AiAssistant disclaimer tests passed');
