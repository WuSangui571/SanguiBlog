import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const widgetSource = fs.readFileSync(path.join(__dirname, 'AiAssistantWidget.jsx'), 'utf8');

assert.match(widgetSource, /Beta 测试版/);
assert.doesNotMatch(widgetSource, /Beta娴嬭瘯/);
assert.match(widgetSource, /launcherGlowShapeClass = 'rounded-\[24px\]'/);
assert.match(widgetSource, /launcherGlowInnerShapeClass = 'rounded-\[22px\]'/);
assert.doesNotMatch(widgetSource, /rounded-\[34px\]/);
assert.match(
    widgetSource,
    /isMobileViewport\s*\?\s*'w-\[60px\] h-\[60px\] justify-center px-0'\s*:\s*'pl-3\.5 pr-5 py-3 gap-3'/,
    'AI 聊天入口在手机端应收成接近正方形且保持桌面端原样'
);
assert.match(
    widgetSource,
    /!\s*isMobileViewport\s*&&\s*<span className="relative text-left">/,
    'AI 聊天入口右侧文案应只在非手机端显示'
);

console.log('AiAssistantWidget tests passed');
