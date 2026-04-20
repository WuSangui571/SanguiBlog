import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(__dirname, 'AdminPanel.jsx'), 'utf8');

assert.match(
    source,
    /const \[adminSidebarCollapsed,\s*setAdminSidebarCollapsed\] = useState\(false\)/,
    '后台桌面侧栏应有独立的折叠状态，不能复用移动端抽屉开关'
);

assert.match(
    source,
    /desktopSidebarWidthClass[\s\S]*adminSidebarCollapsed[\s\S]*md:w-20[\s\S]*md:w-64/,
    '桌面侧栏应在折叠时从 md:w-64 收缩到 md:w-20'
);

assert.match(
    source,
    /desktopContentOffsetClass[\s\S]*adminSidebarCollapsed[\s\S]*md:ml-20[\s\S]*md:ml-64/,
    '主内容区应随侧栏折叠从 md:ml-64 切换到 md:ml-20'
);

assert.match(
    source,
    /aria-label=\{adminSidebarCollapsed \? '展开后台导航' : '收起后台导航'\}/,
    '顶部栏标题左侧应提供可访问的桌面折叠按钮'
);

assert.match(
    source,
    /showNavLabels[\s\S]*!\s*adminSidebarCollapsed/,
    '桌面折叠时导航文字应隐藏，移动端抽屉仍应展示文字'
);

assert.match(
    source,
    /title=\{label\}[\s\S]*<Icon size=\{18\}[\s\S]*\{showNavLabels && \(<span>\{label\}<\/span>\)\}/,
    '折叠后导航项应只显示图标，并保留 title 提示完整文字'
);

assert.match(
    source,
    /adminNavContent = \(forceLabels = false\)/,
    '共享导航内容应支持移动端强制展示标签，避免桌面折叠影响抽屉'
);

console.log('Admin sidebar collapse static checks passed.');
