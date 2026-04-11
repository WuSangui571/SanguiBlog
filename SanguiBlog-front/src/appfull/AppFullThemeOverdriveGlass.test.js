import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/AppFull.jsx'), 'utf8');

assert.match(
    source,
    /import GlassPopupToast, \{ getGlassPopupToastTop \} from "\.\/appfull\/ui\/GlassPopupToast\.jsx";/,
    '主题超频提示应复用现有 GlassPopupToast 玻璃弹出模板'
);

assert.match(
    source,
    /<GlassPopupToast[\s\S]*open=\{themeOverdriveNotice\}[\s\S]*title=\{themeOverdriveMessage \|\| '超频模式'\}/,
    '主题超频提示应通过玻璃模板承载现有动态文案'
);

assert.match(
    source,
    /description=\{themeOverdriveMessage === '冷却中…请稍候'/,
    '主题超频提示应为冷却和开启状态提供玻璃模板辅助文案'
);

assert.doesNotMatch(
    source,
    /bg-black text-\[#FFD700\][\s\S]*shadow-\[8px_8px_0px_0px_#FF0080\]/,
    '主题超频提示不应继续使用旧黑底厚投影样式'
);

console.log('AppFull theme overdrive glass tests passed');
