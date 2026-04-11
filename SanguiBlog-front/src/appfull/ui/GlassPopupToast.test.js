import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/appfull/ui/GlassPopupToast.jsx'), 'utf8');
const articleSource = readFileSync(resolve('src/appfull/public/ArticleDetail.jsx'), 'utf8');

assert.match(
    source,
    /export function getGlassPopupToastTop\(fixedTopOffset\)/,
    '玻璃弹出模板应导出统一的偏上位置计算方法，后续弹出框避免各自写定位'
);

assert.match(
    source,
    /Math\.max\(fixedTopOffset \+ 8, 104\)/,
    '玻璃弹出模板应复用当前已验证的屏幕偏上位置'
);

assert.match(
    source,
    /createPortal\(/,
    '玻璃弹出模板应通过 portal 挂到 document.body，避免撑动页面结构'
);

assert.match(
    source,
    /initial=\{\{ y: 12, x: '-50%' \}\}/,
    '玻璃弹出模板入场不应从透明或缩放开始，避免首帧玻璃延迟'
);

assert.match(
    source,
    /animate=\{\{ y: 0, x: '-50%' \}\}/,
    '玻璃弹出模板入场应只做轻量位移'
);

assert.match(
    source,
    /w-\[min\(92vw,320px\)\]/,
    '玻璃弹出模板应限制宽度，避免退化成横向长条'
);

assert.match(
    source,
    /background:\s*isDarkMode\s*\?\s*'linear-gradient\(/,
    '玻璃弹出模板应使用半透明渐变玻璃底'
);

assert.match(
    source,
    /backdropFilter: 'blur\(14px\) saturate\(1\.01\)'/,
    '玻璃弹出模板应显式声明标准玻璃模糊'
);

assert.match(
    source,
    /WebkitBackdropFilter: 'blur\(14px\) saturate\(1\.01\)'/,
    '玻璃弹出模板应显式声明 WebKit 玻璃模糊'
);

assert.match(
    source,
    /transform: 'translateZ\(0\)'/,
    '玻璃弹出模板应提前建立合成层，减少首帧延迟'
);

assert.match(
    source,
    /backfaceVisibility: 'hidden'/,
    '玻璃弹出模板应隐藏背面绘制，减少移动端首帧闪动'
);

assert.match(
    articleSource,
    /import GlassPopupToast, \{ getGlassPopupToastTop \} from "\.\.\/ui\/GlassPopupToast\.jsx";/,
    '文章详情页分享提示应复用玻璃弹出模板，而不是保留私有实现'
);

assert.match(
    articleSource,
    /<GlassPopupToast[\s\S]*title="链接已复制"[\s\S]*description="文章地址已放入剪贴板"/,
    '文章详情页分享提示应通过模板传入文案'
);

console.log('GlassPopupToast template tests passed');
