import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const widgetSource = fs.readFileSync(path.join(__dirname, 'AiAssistantWidget.jsx'), 'utf8');

assert.match(
    widgetSource,
    /const launcherOverflowClass = isMobileViewport\s*\?\s*'overflow-visible'\s*:\s*'overflow-hidden'/,
    '手机端 AI 入口外层应允许超出裁切，以完整显示右上角呼吸状态点'
);
assert.match(
    widgetSource,
    /className=\{`fixed z-\[89\] right-4 bottom-6 md:right-6 md:bottom-6 isolate border \$\{launcherGlowShapeClass\} flex items-center \$\{launcherOverflowClass\}/,
    'AI 入口外层按钮应使用可按移动端切换的 overflow 类'
);

console.log('AiAssistant mobile launcher indicator tests passed');
