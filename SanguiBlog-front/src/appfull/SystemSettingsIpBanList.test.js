import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adminPanelSource = fs.readFileSync(path.join(__dirname, 'AdminPanel.jsx'), 'utf8');
const apiSource = fs.readFileSync(path.join(__dirname, '..', 'api.js'), 'utf8');

// api.js 必须导出 IP 封禁列表 / 添加 / 解封函数
assert.ok(apiSource.includes('export const adminFetchIpBans'),
    'api.js should export adminFetchIpBans');
assert.ok(apiSource.includes('export const adminCreateIpBan'),
    'api.js should export adminCreateIpBan');
assert.ok(apiSource.includes('export const adminUnbanIpBan'),
    'api.js should export adminUnbanIpBan');

// AdminPanel 必须导入这些函数
assert.ok(adminPanelSource.includes('adminFetchIpBans'),
    'AdminPanel should import adminFetchIpBans');
assert.ok(adminPanelSource.includes('adminUnbanIpBan'),
    'AdminPanel should import adminUnbanIpBan');

// 系统设置应新增 “IP 封禁列表” 分组
assert.ok(adminPanelSource.includes("{ key: 'ip-bans', label: 'IP 封禁列表' }"),
    'SystemSettingsView should add an ip-bans tab labeled “IP 封禁列表”');

// ip-bans 分组内容受 activeSettingsTab 控制
assert.ok(adminPanelSource.includes("activeSettingsTab === 'ip-bans'"),
    'ip-bans tab content should be gated by activeSettingsTab');

// 列表加载、手动添加、解封流程存在
assert.ok(adminPanelSource.includes('const loadIpBans'),
    'SystemSettingsView should define loadIpBans');
assert.ok(adminPanelSource.includes('const handleAddIpBan'),
    'SystemSettingsView should define handleAddIpBan');
assert.ok(adminPanelSource.includes('const confirmUnbanIp'),
    'SystemSettingsView should define confirmUnbanIp');

// 应支持 IP 搜索与仅启用过滤
assert.ok(adminPanelSource.includes('ipBanSearchIp'),
    'SystemSettingsView should support IP search state');
assert.ok(adminPanelSource.includes('ipBanEnabledOnly'),
    'SystemSettingsView should support enabled-only filter state');
assert.ok(adminPanelSource.includes('const [ipBanEnabledOnly, setIpBanEnabledOnly] = useState(true);'),
    'SystemSettingsView should default the IP ban list to active bans');
assert.ok(adminPanelSource.includes('封禁中'),
    'SystemSettingsView should label the enabled-only filter as “封禁中”');
assert.doesNotMatch(adminPanelSource, />\s*仅启用\s*</,
    'SystemSettingsView should not show the confusing “仅启用” filter label');
assert.ok(adminPanelSource.includes('const reason = ipBanAddForm.reason.trim();'),
    'SystemSettingsView should trim the manual ban reason before validation/submission');
assert.ok(adminPanelSource.includes('await adminCreateIpBan({ ip, reason });'),
    'SystemSettingsView should submit a required trimmed reason for manual bans');
assert.ok(adminPanelSource.includes('请填写封禁原因'),
    'SystemSettingsView should require a reason before adding an IP ban');
assert.ok(adminPanelSource.includes('>封禁原因</span>'),
    'SystemSettingsView should present the manual ban reason as required');

// 解封应通过自定义对话框采集原因，不得使用原生弹窗
assert.ok(adminPanelSource.includes('openUnbanDialog'),
    'SystemSettingsView should open an unban dialog');
assert.ok(adminPanelSource.includes('ipBanUnbanReason'),
    'SystemSettingsView should capture an unban reason');
assert.doesNotMatch(adminPanelSource, /window\.confirm\s*\(/);
assert.doesNotMatch(adminPanelSource, /window\.alert\s*\(/);

console.log('SystemSettingsIpBanList tests passed');
