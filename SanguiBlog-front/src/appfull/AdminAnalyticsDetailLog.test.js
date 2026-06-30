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

const getButtonSource = (onClickSource) => {
    const onClickIndex = adminPanelSource.indexOf(onClickSource);
    assert.ok(onClickIndex >= 0, `AdminPanel should render button handler: ${onClickSource}`);
    const buttonStart = adminPanelSource.lastIndexOf('<button', onClickIndex);
    const buttonEnd = adminPanelSource.indexOf('</button>', onClickIndex);
    assert.ok(buttonStart >= 0 && buttonEnd > buttonStart,
        `AdminPanel should wrap handler in a button: ${onClickSource}`);
    return {
        source: adminPanelSource.slice(buttonStart, buttonEnd + '</button>'.length),
        start: buttonStart,
    };
};

const detailButton = getButtonSource('onClick={() => handleShowDetail(visit.id)}');
assert.ok(detailButton.source,
    'AdminPanel should render a detail action button for each page-view log');

const detailButtonSource = detailButton.source;
const operationCellStart = adminPanelSource.lastIndexOf('<td className="px-4 py-3 text-right">', detailButton.start);
const operationCellEnd = adminPanelSource.indexOf('</td>', detailButton.start);
const operationCellSource = adminPanelSource.slice(operationCellStart, operationCellEnd);
const superAdminGuardIndex = operationCellSource.indexOf('{isSuperAdmin && (');
const detailActionIndex = operationCellSource.indexOf('handleShowDetail(visit.id)');
const deleteActionIndex = operationCellSource.indexOf('handleDeleteOne(visit.id)');
assert.ok(superAdminGuardIndex >= 0 && superAdminGuardIndex < detailActionIndex,
    'Detail action button should be hidden behind the same SUPER_ADMIN operation guard as delete');
assert.ok(detailActionIndex >= 0 && detailActionIndex < deleteActionIndex,
    'Detail action button should remain in the protected operation group before delete');
assert.ok(detailButtonSource.includes('aria-label="查看详情"'),
    'Detail action button should keep an accessible label');
assert.ok(detailButtonSource.includes('title="查看详情"'),
    'Detail action button should keep a hover title');
assert.ok(detailButtonSource.includes('<FileSearch size={16} />'),
    'Detail action button should use the FileSearch icon');
assert.doesNotMatch(detailButtonSource, />\s*查看详情\s*</,
    'Detail action button should not render visible text');

const deleteButton = getButtonSource('onClick={() => handleDeleteOne(visit.id)}');
assert.ok(deleteButton.source,
    'AdminPanel should render a delete action button for SUPER_ADMIN');

const deleteButtonSource = deleteButton.source;
assert.ok(deleteButtonSource.includes('aria-label="删除"'),
    'Delete action button should keep an accessible label');
assert.ok(deleteButtonSource.includes('title="删除"'),
    'Delete action button should keep a hover title');
assert.ok(deleteButtonSource.includes('<Trash2 size={16} />'),
    'Delete action button should use the Trash2 icon');
assert.doesNotMatch(deleteButtonSource, />\s*删除\s*</,
    'Delete action button should not render visible text');

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
