import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/appfull/public/ArticleDetail.jsx'), 'utf8');
const templateSource = readFileSync(resolve('src/appfull/ui/GlassPopupToast.jsx'), 'utf8');
const combinedSource = `${source}\n${templateSource}`;

assert.match(
    source,
    /import GlassPopupToast, \{ getGlassPopupToastTop \} from "\.\.\/ui\/GlassPopupToast\.jsx";/,
    '分享成功提示应复用共享玻璃弹出模板，而不是继续保留私有实现'
);

assert.match(
    templateSource,
    /role = 'status'/,
    '分享成功提示应使用 status 语义，方便辅助技术感知复制结果'
);

assert.match(
    templateSource,
    /ariaLive = 'polite'/,
    '分享成功提示应使用非打断式 aria-live'
);

assert.match(
    source,
    /title="链接已复制"/,
    '分享成功提示应通过模板传入主文案'
);

assert.match(
    source,
    /description="文章地址已放入剪贴板"/,
    '分享成功提示应通过模板传入辅助文案'
);

assert.match(
    combinedSource,
    /文章地址已放入剪贴板/,
    '分享成功提示应使用更完整但紧凑的辅助文案'
);

assert.match(
    combinedSource,
    /w-\[min\(92vw,320px\)\]/,
    '分享成功提示应限制宽度，避免退回顶部长条横幅'
);

assert.match(
    source,
    /top=\{getGlassPopupToastTop\(fixedTopOffset\)\}/,
    '分享成功提示应复用共享模板的位置计算方法'
);

assert.match(
    templateSource,
    /Math\.max\(fixedTopOffset \+ 8, 104\)/,
    '分享成功提示应计算一个偏上的固定 top 位置'
);

assert.match(
    templateSource,
    /style=\{\{ top, willChange: 'transform' \}\}/,
    '分享成功提示应改为使用 top 定位到屏幕偏上位置'
);

assert.match(
    templateSource,
    /initial=\{\{ y: 12, x: '-50%' \}\}/,
    '分享成功提示入场时应只做轻量上浮，避免首帧玻璃背景被缩放拖慢'
);

assert.match(
    templateSource,
    /animate=\{\{ y: 0, x: '-50%' \}\}/,
    '分享成功提示入场动画应只保留位移，避免玻璃背景慢半拍'
);

assert.match(
    templateSource,
    /willChange: 'transform'/,
    '分享成功提示外层应提前声明 transform 变化，减少首帧合成抖动'
);

assert.match(
    templateSource,
    /backdropFilter: 'blur\(14px\) saturate\(1\.01\)'/,
    '分享成功提示卡片应显式声明玻璃模糊，避免首帧只剩透明底色'
);

assert.match(
    templateSource,
    /WebkitBackdropFilter: 'blur\(14px\) saturate\(1\.01\)'/,
    '分享成功提示卡片应补充 WebKit 玻璃模糊，兼容移动端浏览器首帧渲染'
);

assert.match(
    templateSource,
    /background:\s*isDarkMode\s*\?\s*'linear-gradient\(/,
    '分享成功提示卡片应恢复半透明渐变玻璃底，而不是固定纯底色'
);

assert.match(
    templateSource,
    /transform: 'translateZ\(0\)'/,
    '分享成功提示卡片应提前建立合成层，减少玻璃效果首帧延迟'
);

assert.match(
    templateSource,
    /backfaceVisibility: 'hidden'/,
    '分享成功提示卡片应隐藏背面绘制，减少移动端首帧闪动'
);

assert.doesNotMatch(
    templateSource,
    /backgroundColor: isDarkMode \? 'rgba\(15, 23, 42, 0\.88\)' : 'rgba\(255, 255, 255, 0\.92\)'/,
    '分享成功提示不应退化为高不透明度的固定背景色'
);

assert.match(
    source,
    /shareToastTimerRef\.current = setTimeout\(\(\) => setShowShareToast\(false\), 2200\)/,
    '分享成功提示应使用统一 timer ref 控制自动消失'
);

assert.match(
    source,
    /clearTimeout\(shareToastTimerRef\.current\)/,
    '连续点击分享时应清理旧 timer，避免提示闪烁或提前消失'
);

assert.doesNotMatch(
    source,
    /font-black text-lg">链接已复制！<\/span>/,
    '分享成功提示不应再使用突兀的大号横条文案'
);

console.log('ArticleDetail share toast tests passed');
