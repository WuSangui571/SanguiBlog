import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, 'Navigation.jsx'), 'utf8');

assert.match(source, /font-black text-sm">彩蛋背景</);
assert.match(source, /aria-label="切换彩蛋背景"/);
assert.doesNotMatch(source, /关闭彩蛋背景/);
assert.doesNotMatch(source, /开启彩蛋背景/);
assert.match(
    source,
    /backgroundEnabled\s*\?\s*'left-9 right-2\.5'\s*:\s*'left-2\.5 right-9'/,
    '彩蛋背景开关状态文字应根据滑块位置切换左右空白区：滑块在左时文字靠右，滑块在右时文字靠左'
);
assert.doesNotMatch(
    source,
    /relative z-\[1\] w-full text-center text-\[10px\]/,
    '彩蛋背景开关状态文字不应继续占满整条轨道居中，否则会与滑块圆点重叠'
);

console.log('Navigation mobile background toggle tests passed');
