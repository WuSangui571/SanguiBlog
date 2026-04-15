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
    /<GlassPopupToast[\s\S]*open=\{themeOverdriveNotice\}[\s\S]*>\s*<span className="block w-full text-center text-base font-black tracking-\[0\.08em\]">[\s\S]*\{themeOverdriveMessage \|\| '超频模式已开启'\}[\s\S]*<\/span>\s*<\/GlassPopupToast>/,
    '主题超频提示应通过玻璃模板只展示居中放大的主文案'
);

assert.doesNotMatch(
    source,
    /主题能量已进入玻璃超频态/,
    '主题超频提示不应再显示“主题能量已进入玻璃超频态”副文案'
);

assert.doesNotMatch(
    source,
    /description=\{themeOverdriveMessage === '冷却中…请稍候'/,
    '主题超频提示不应再使用默认副标题区域'
);

assert.match(
    source,
    /top=\{getGlassPopupToastTop\(layoutContextValue\.headerHeight\)\}/,
    '主题超频提示应复用 AppFull 中已存在的 layoutContextValue.headerHeight，而不是引用未定义变量'
);

assert.doesNotMatch(
    source,
    /top=\{getGlassPopupToastTop\(headerHeight \|\| NAVIGATION_HEIGHT\)\}/,
    '主题超频提示不应直接引用未在 SanGuiBlog 作用域定义的 headerHeight'
);

assert.doesNotMatch(
    source,
    /bg-black text-\[#FFD700\][\s\S]*shadow-\[8px_8px_0px_0px_#FF0080\]/,
    '主题超频提示不应继续使用旧黑底厚投影样式'
);

console.log('AppFull theme overdrive glass tests passed');
