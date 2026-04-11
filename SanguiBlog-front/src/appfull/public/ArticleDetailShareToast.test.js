import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/appfull/public/ArticleDetail.jsx'), 'utf8');

assert.match(
    source,
    /const shareToastLayer = typeof document !== 'undefined'\s*\?\s*createPortal\(/,
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
    /bottom: 'calc\(72px \+ env\(safe-area-inset-bottom, 0px\)\)'/,
    '分享成功提示应比贴底位置更高，便于用户感知'
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
