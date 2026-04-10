import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/appfull/public/StatsStrip.jsx'), 'utf8');

assert.match(
    source,
    /export function formatStatusExactMinute\(value\)/,
    '系统状态条应提供“最后更新时间”精确到分钟的格式化函数'
);

assert.match(
    source,
    /createPortal\(/,
    '最后更新时间浮层应通过 portal 渲染，避免被状态条滚动容器裁切'
);

assert.match(
    source,
    /position:\s*'fixed'/,
    '最后更新时间浮层应使用 fixed 定位，确保悬停或点击时真正可见'
);

assert.match(
    source,
    /onClick=\{\(\) => setLastUpdatedTooltipOpen\(\(prev\) => \{/,
    '最后更新时间应支持点击切换浮层'
);

assert.doesNotMatch(
    source,
    /cursor-help/,
    '最后更新时间不应继续使用帮助态鼠标样式'
);
