import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adminPanelSource = fs.readFileSync(path.join(__dirname, 'AdminPanel.jsx'), 'utf8');
const appFullSource = fs.readFileSync(path.join(__dirname, '..', 'AppFull.jsx'), 'utf8');
const articleDetailSource = fs.readFileSync(path.join(__dirname, 'public', 'ArticleDetail.jsx'), 'utf8');

assert.ok(adminPanelSource.includes('summary?.visitorSourceInsights'),
  'DashboardView should consume visitorSourceInsights from the admin summary response');
assert.ok(adminPanelSource.includes('访客来源洞察'),
  'DashboardView should render the new visitor source insight module');
assert.ok(adminPanelSource.includes('来源类型占比'),
  'DashboardView should render source type share');
assert.ok(adminPanelSource.includes('访客质量占比'),
  'DashboardView should render visit quality share');
assert.ok(adminPanelSource.includes('异常来源 Top'),
  'DashboardView should render anomaly top lists');
assert.ok(adminPanelSource.includes('热门入口页'),
  'DashboardView should render popular entries');
assert.ok(adminPanelSource.includes('可疑访问摘要'),
  'DashboardView should render suspicious summary counters');
assert.ok(adminPanelSource.includes('navigate(`/admin/analytics?${query}`)'),
  'Dashboard insight items should deep-link to the access log page');
assert.ok(adminPanelSource.includes('visitQuality: readQueryParam("visitQuality")'),
  'AnalyticsView should initialize visitQuality from URL search params');
assert.ok(adminPanelSource.includes('sourceType: readQueryParam("sourceType")'),
  'AnalyticsView should initialize sourceType from URL search params');
assert.ok(adminPanelSource.includes('referrerDomain: readQueryParam("referrerDomain")'),
  'AnalyticsView should initialize referrerDomain from URL search params');
assert.doesNotMatch(adminPanelSource, /analytics_traffic_sources 实时占比/,
  'Dashboard should not present the legacy traffic source card as the primary insight module');
assert.ok(adminPanelSource.includes('grid grid-cols-1 xl:grid-cols-3 gap-6 items-start'),
  'Dashboard insight row should top-align cards so the right insight content cannot stretch the trend chart');
assert.doesNotMatch(adminPanelSource, /trendCardHeight|style=\{trendCardHeight/,
  'Dashboard should not synchronize the insight card height from the trend card height');
assert.ok(adminPanelSource.includes('dashboard-insight-summary-panel'),
  'Dashboard should keep the right insight column compact');
assert.ok(adminPanelSource.includes('dashboard-insight-detail-panel'),
  'Dashboard should move long insight detail lists under the left trend column');
assert.ok(adminPanelSource.includes('dashboard-insight-left-column xl:col-span-2 space-y-6'),
  'Dashboard should keep trend chart and long insight details in the same left column');
{
  const summaryPanelIndex = adminPanelSource.indexOf('dashboard-insight-summary-panel');
  const detailPanelIndex = adminPanelSource.indexOf('dashboard-insight-detail-panel');
  assert.ok(detailPanelIndex > -1 && summaryPanelIndex > -1,
    'Dashboard should render both detail and summary panels');
  assert.ok(detailPanelIndex < summaryPanelIndex,
    'Dashboard should render detail panel in the left column before the right summary panel');
  const detailPanelSource = adminPanelSource.slice(detailPanelIndex, summaryPanelIndex);
  const summaryPanelSource = adminPanelSource.slice(summaryPanelIndex);

  assert.doesNotMatch(summaryPanelSource, /visitQualityShares/,
    'Dashboard right insight summary should not include visit quality share rows');
  assert.match(detailPanelSource, /visitQualityShares/,
    'Dashboard should move visit quality share rows into the left detail area');
}

assert.ok(appFullSource.includes('collectAnalyticsClientEnvironment'),
  'AppFull page-view payloads should include safe browser environment fields');
assert.ok(articleDetailSource.includes('collectAnalyticsClientEnvironment'),
  'Article visit start payloads should include safe browser environment fields');

console.log('admin analytics traffic insight tests passed');
