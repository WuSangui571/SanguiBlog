import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  formatVisitDuration,
  formatVisitDurationFromRecord,
  resolveDisplayDurationSeconds,
} from './public/articleVisitTracker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1) AdminPanel 渲染了“浏览时长”列且引入了格式化 helper
const adminPanelSource = fs.readFileSync(path.join(__dirname, 'AdminPanel.jsx'), 'utf8');
const appFullSource = fs.readFileSync(path.join(__dirname, '..', 'AppFull.jsx'), 'utf8');
assert.ok(adminPanelSource.includes('浏览时长'), 'AdminPanel should render 浏览时长 column');
assert.ok(adminPanelSource.includes('formatVisitDurationFromRecord'),
  'AdminPanel should use formatVisitDurationFromRecord for duration cell');

// 2) helper 优先级与格式
assert.equal(resolveDisplayDurationSeconds({ durationSeconds: 70 }), 70);
assert.equal(resolveDisplayDurationSeconds({ activeDurationSeconds: 30, totalDurationSeconds: 60 }), 30);
assert.equal(resolveDisplayDurationSeconds({ totalDurationSeconds: 60 }), 60);
assert.equal(resolveDisplayDurationSeconds({}), null);

assert.equal(formatVisitDurationFromRecord({ durationSeconds: 70 }), '1分10秒');
assert.equal(formatVisitDurationFromRecord({ activeDurationSeconds: 8 }), '8秒');
assert.equal(formatVisitDurationFromRecord({ totalDurationSeconds: 3900 }), '1小时05分');
assert.equal(formatVisitDurationFromRecord({ visitId: 'visit-1', durationSeconds: 0 }), '小于1秒');
assert.equal(formatVisitDurationFromRecord({ visitId: 'visit-1' }), '小于15秒');
assert.equal(formatVisitDurationFromRecord({ postId: null, title: 'Admin Panel' }), '非文章页');
assert.equal(formatVisitDurationFromRecord({}), '-');
assert.equal(formatVisitDurationFromRecord(null), '-');

// 旧文章历史行（无 visit 字段）应显示 '-'
assert.equal(formatVisitDurationFromRecord({ postId: 123, ip: '1.2.3.4', time: '2026-01-01 00:00:00' }), '-');

// 同一篇文章停留期间不能因无关 state 变化重复生成 visitId / 记录两行
assert.ok(appFullSource.includes('const articleLoadKey = String(articleId);'),
  'AppFull should key article visit loading by articleId');
assert.ok(appFullSource.includes('lastRecordedArticleRef.current === articleLoadKey'),
  'AppFull should skip duplicate article visit loading for the same article');
assert.ok(appFullSource.includes('lastRecordedArticleRef.current = articleLoadKey'),
  'AppFull should remember the article load key before creating a new visitId');
assert.ok(appFullSource.includes('routeManagedArticleKey !== articleLoadKey'),
  'AppFull should not load article data in a route-managed instance before navigation settles');

// 3) 直接格式化
assert.equal(formatVisitDuration(0), '0秒');
assert.equal(formatVisitDuration(723), '12分03秒');

// 4) ArticleDetail 挂载了 tracker 且仅在真实文章数据可用时启动
const articleDetailSource = fs.readFileSync(path.join(__dirname, 'public', 'ArticleDetail.jsx'), 'utf8');
assert.ok(articleDetailSource.includes('startArticleVisit'), 'ArticleDetail should call startArticleVisit');
assert.ok(articleDetailSource.includes('heartbeatArticleVisit'), 'ArticleDetail should call heartbeatArticleVisit');
assert.ok(articleDetailSource.includes('endArticleVisit'), 'ArticleDetail should call endArticleVisit');
assert.ok(articleDetailSource.includes('visibilitychange'), 'ArticleDetail should listen visibilitychange');
assert.ok(articleDetailSource.includes('pagehide'), 'ArticleDetail should listen pagehide');
assert.ok(articleDetailSource.includes('articleData?.summary'),
  'ArticleDetail tracker should only start on real article summary');
assert.ok(articleDetailSource.includes('onVisibilityChange();'),
  'ArticleDetail should sync initial document.visibilityState when starting tracker');
assert.ok(!articleDetailSource.includes('[id, visitId, articleData]'),
  'ArticleDetail tracker effect should not depend on the whole articleData object');

// 5) api.js 暴露了 visit 函数与 X-SG-Visit-Id 头
const apiSource = fs.readFileSync(path.join(__dirname, '..', 'api.js'), 'utf8');
assert.ok(apiSource.includes('export const startArticleVisit'), 'api.js should export startArticleVisit');
assert.ok(apiSource.includes('export const heartbeatArticleVisit'), 'api.js should export heartbeatArticleVisit');
assert.ok(apiSource.includes('export const endArticleVisit'), 'api.js should export endArticleVisit');
assert.ok(apiSource.includes('X-SG-Visit-Id'), 'api.js should send X-SG-Visit-Id header');
assert.ok(apiSource.includes('sendBeacon'), 'api.js should support sendBeacon for end');
assert.ok(apiSource.includes('/analytics/visit/'), 'api.js should add visit paths to silent auth');
