import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/appfull/public/StatsStrip.jsx'), 'utf8');

assert.match(
    source,
    /const valueTextClass = 'font-mono font-black text-\[15px\] md:text-base tracking-\[0\.01em\]';/,
    '系统状态条主数值应提升字号与字重，增强可读性'
);

assert.match(
    source,
    /const labelTextClass = `text-\[12px\] font-semibold tracking-\[0\.08em\] \$\{subClass\}`;/,
    '系统状态条标签文案应使用更清晰但不喧宾夺主的字号和字距'
);

assert.match(
    source,
    /sm:mr-6/,
    'SYSTEM STATUS 与右侧五项数据之间的横向距离应适度收紧'
);

assert.match(
    source,
    /gap-2\.5 md:gap-3/,
    '右侧五项数据之间的横向间距应略收紧，整体更紧凑'
);

assert.match(
    source,
    /hidden md:block/,
    '系统状态条应在手机端隐藏，仅桌面端显示'
);

console.log('StatsStrip readability tests passed');
