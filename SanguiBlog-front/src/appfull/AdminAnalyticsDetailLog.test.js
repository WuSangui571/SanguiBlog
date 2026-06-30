import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adminPanelSource = fs.readFileSync(path.join(__dirname, 'AdminPanel.jsx'), 'utf8');
const apiSource = fs.readFileSync(path.join(__dirname, '..', 'api.js'), 'utf8');

assert.ok(apiSource.includes('export const adminFetchPageViewLogDetail'),
    'api.js should export adminFetchPageViewLogDetail');

assert.ok(adminPanelSource.includes('adminFetchPageViewLogDetail'),
    'AdminPanel should import adminFetchPageViewLogDetail');

assert.ok(adminPanelSource.includes('查看详情'),
    'AdminPanel should render 查看详情 button');

assert.ok(adminPanelSource.includes('role="dialog"'),
    'Detail UI should use role=dialog');

assert.ok(adminPanelSource.includes('aria-modal'),
    'Detail UI should use aria-modal');

assert.ok(adminPanelSource.includes('请求信息'),
    'Detail modal should show 请求信息 group');

assert.ok(adminPanelSource.includes('来源信息'),
    'Detail modal should show 来源信息 group');

assert.ok(adminPanelSource.includes('设备信息'),
    'Detail modal should show 设备信息 group');

assert.ok(adminPanelSource.includes('IP 信息'),
    'Detail modal should show IP 信息 group');

assert.ok(adminPanelSource.includes('行为信息'),
    'Detail modal should show 行为信息 group');

assert.ok(adminPanelSource.includes('风控信息'),
    'Detail modal should show 风控信息 group');

assert.ok(adminPanelSource.includes('handleShowDetail'),
    'AdminPanel should have handleShowDetail function');

assert.ok(adminPanelSource.includes('handleCloseDetail'),
    'AdminPanel should have handleCloseDetail function');

assert.ok(adminPanelSource.includes('detailOpen'),
    'AdminPanel should have detailOpen state');

assert.ok(adminPanelSource.includes('detailLoading'),
    'AdminPanel should have detailLoading state');

assert.ok(adminPanelSource.includes('detailData'),
    'AdminPanel should have detailData state');

assert.doesNotMatch(adminPanelSource, /window\.alert\s*\(/);
assert.doesNotMatch(adminPanelSource, /window\.confirm\s*\(/);
