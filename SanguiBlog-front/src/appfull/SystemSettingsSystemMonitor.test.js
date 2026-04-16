import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adminPanelSource = fs.readFileSync(path.join(__dirname, 'AdminPanel.jsx'), 'utf8');
const apiSource = fs.readFileSync(path.join(__dirname, '..', 'api.js'), 'utf8');

assert.match(
    adminPanelSource,
    /const SETTINGS_TABS = \[\s*\{ key: 'system-monitor', label: '系统监控' \}/,
    '系统监控应作为 /admin/settings 的第一个设置分组'
);

assert.match(
    adminPanelSource,
    /useState\('system-monitor'\)/,
    '后台设置页默认应先打开系统监控分组'
);

assert.match(
    apiSource,
    /export const adminFetchSystemMonitor = \(\) =>\s*request\("\/admin\/system-monitor"\)/,
    '前端应复用统一 request 封装访问后台系统监控接口'
);

assert.match(
    adminPanelSource,
    /adminFetchSystemMonitor/,
    '系统监控分组应调用后台系统监控接口'
);

assert.match(
    adminPanelSource,
    /综合评分/,
    '系统监控分组应展示综合评分'
);

assert.match(
    adminPanelSource,
    /实时吞吐量/,
    '系统监控分组应展示实时吞吐量'
);

assert.match(
    adminPanelSource,
    /今天|近 7 天|全部记录/,
    '系统监控分组应展示分时段网络总流量'
);

console.log('SystemSettingsSystemMonitor tests passed');
