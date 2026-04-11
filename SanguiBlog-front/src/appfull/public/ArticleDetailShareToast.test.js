import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/appfull/public/ArticleDetail.jsx'), 'utf8');

assert.match(
    source,
    /const shareToastLayer = typeof document !== 'undefined'[\s\S]*createPortal\(/,
    '分享成功提示应通过 createPortal 挂到 document.body，避免参与文章页结构布局'
);

assert.match(
    source,
    /role="status"/,
    '分享成功提示应使用 status 语义，方便辅助技术感知复制结果'
);

assert.match(
    source,
    /aria-live="polite"/,
    '分享成功提示应使用非打断式 aria-live'
);

assert.match(
    source,
    /文章地址已放入剪贴板/,
    '分享成功提示应使用更完整但紧凑的辅助文案'
);

assert.match(
    source,
    /w-\[min\(92vw,320px\)\]/,
    '分享成功提示应限制宽度，避免退回顶部长条横幅'
);

assert.match(
    source,
    /const shareToastTop = Math\.max\(fixedTopOffset \+ 8, 104\);/,
    '分享成功提示应计算一个偏上的固定 top 位置'
);

assert.match(
    source,
    /style=\{\{ top: shareToastTop, willChange: 'transform' \}\}/,
    '分享成功提示应改为使用 top 定位到屏幕偏上位置'
);

assert.match(
    source,
    /initial=\{\{ y: 12, x: '-50%' \}\}/,
    '分享成功提示入场时应只做轻量上浮，避免首帧玻璃背景被缩放拖慢'
);

assert.match(
    source,
    /animate=\{\{ y: 0, x: '-50%' \}\}/,
    '分享成功提示入场动画应只保留位移，避免玻璃背景慢半拍'
);

assert.match(
    source,
    /willChange: 'transform'/,
    '分享成功提示外层应提前声明 transform 变化，减少首帧合成抖动'
);

assert.match(
    source,
    /backdropFilter: 'blur\(14px\) saturate\(1\.01\)'/,
    '分享成功提示卡片应显式声明玻璃模糊，避免首帧只剩透明底色'
);

assert.match(
    source,
    /WebkitBackdropFilter: 'blur\(14px\) saturate\(1\.01\)'/,
    '分享成功提示卡片应补充 WebKit 玻璃模糊，兼容移动端浏览器首帧渲染'
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
