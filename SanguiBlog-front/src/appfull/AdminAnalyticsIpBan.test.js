import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adminPanelSource = fs.readFileSync(path.join(__dirname, 'AdminPanel.jsx'), 'utf8');
const apiSource = fs.readFileSync(path.join(__dirname, '..', 'api.js'), 'utf8');

// api.js 必须导出封禁相关函数
assert.ok(apiSource.includes('export const adminCreateIpBan'),
    'api.js should export adminCreateIpBan');

// AdminPanel 必须导入封禁函数与 Ban 图标
assert.ok(adminPanelSource.includes('adminCreateIpBan'),
    'AdminPanel should import adminCreateIpBan');
assert.ok(/\bBan\b/.test(adminPanelSource),
    'AdminPanel should import the Ban icon from lucide-react');

// 操作列应存在 icon-only 封禁按钮，带 aria-label / title，使用 Ban 图标
const banButtonIndex = adminPanelSource.indexOf('aria-label="封禁 IP"');
assert.ok(banButtonIndex >= 0, 'AdminPanel should render a ban action button with accessible label');
const buttonStart = adminPanelSource.lastIndexOf('<button', banButtonIndex);
assert.ok(buttonStart >= 0, 'ban action should be wrapped in a button');
const buttonEnd = adminPanelSource.indexOf('</button>', banButtonIndex);
const banButtonSource = adminPanelSource.slice(buttonStart, buttonEnd + '</button>'.length);
assert.ok(banButtonSource.includes('title="封禁 IP"'),
    'ban action button should keep a hover title');
assert.ok(banButtonSource.includes('<Ban size={16} />'),
    'ban action button should use the Ban icon');
assert.ok(banButtonSource.includes('onClick={() => handleBanOne(visit)}'),
    'ban action button should call handleBanOne');
assert.ok(adminPanelSource.includes('visit.ip && !visit.ipBanned'),
    'ban action button should only render when the row IP is not already banned');
assert.doesNotMatch(banButtonSource, />\s*封禁\s*</,
    'ban action button should not render visible text');

// 已封禁行应渲染“已封禁”禁用标记
assert.ok(adminPanelSource.includes("visit.ipBanned && (") && adminPanelSource.includes('已封禁'),
    'AdminPanel should render an already-banned marker for banned rows');

// 必须使用自定义对话框（含原因输入），不得使用浏览器原生弹窗
assert.ok(adminPanelSource.includes('BanReasonDialog'),
    'AdminPanel should use a custom BanReasonDialog for ban confirmation');
assert.ok(adminPanelSource.includes('IP 可能属于代理、VPN、公司或学校出口，封禁可能误伤共享该出口的用户'),
    'ban confirmation should show the shared-egress warning text');
assert.doesNotMatch(adminPanelSource, /window\.confirm\s*\(/);
assert.doesNotMatch(adminPanelSource, /window\.alert\s*\(/);

// handleBanOne 与 confirmBanIp 流程存在
assert.ok(adminPanelSource.includes('const handleBanOne'),
    'AdminPanel should define handleBanOne');
assert.ok(adminPanelSource.includes('const confirmBanIp'),
    'AdminPanel should define confirmBanIp');

console.log('AdminAnalyticsIpBan tests passed');
