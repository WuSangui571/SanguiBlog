import assert from 'node:assert/strict';
import {
  MAX_VISIT_DURATION_SECONDS,
  HEARTBEAT_INTERVAL_MS,
  createVisitId,
  sanitizeDurationSeconds,
  calculateTotalDurationSeconds,
  formatVisitDuration,
  createActiveDurationTracker,
  resolveDisplayDurationSeconds,
  formatVisitDurationFromRecord,
} from './articleVisitTracker.js';

// 常量
assert.equal(MAX_VISIT_DURATION_SECONDS, 7200);
assert.equal(HEARTBEAT_INTERVAL_MS, 15000);

// createVisitId: 非空字符串
const visitId = createVisitId();
assert.ok(typeof visitId === 'string' && visitId.length > 0, 'visitId should be a non-empty string');
const visitId2 = createVisitId();
assert.notEqual(visitId, visitId2, 'visitId should be unique-ish');

// sanitizeDurationSeconds
assert.equal(sanitizeDurationSeconds(null), 0);
assert.equal(sanitizeDurationSeconds(undefined), 0);
assert.equal(sanitizeDurationSeconds('abc'), 0);
assert.equal(sanitizeDurationSeconds(-1), 0);
assert.equal(sanitizeDurationSeconds(0), 0);
assert.equal(sanitizeDurationSeconds(30), 30);
assert.equal(sanitizeDurationSeconds(7200), 7200);
assert.equal(sanitizeDurationSeconds(7201), 7200);
assert.equal(sanitizeDurationSeconds(100000), 7200);

// calculateTotalDurationSeconds
assert.equal(calculateTotalDurationSeconds(1000, 1000), 0);
assert.equal(calculateTotalDurationSeconds(1000, 16000), 15);
assert.equal(calculateTotalDurationSeconds(16000, 1000), 0); // now < start
assert.equal(calculateTotalDurationSeconds('x', 1000), 0);
assert.equal(calculateTotalDurationSeconds(0, 10000000), 7200); // clamp

// formatVisitDuration
assert.equal(formatVisitDuration(8), '8秒');
assert.equal(formatVisitDuration(70), '1分10秒');
assert.equal(formatVisitDuration(723), '12分03秒');
assert.equal(formatVisitDuration(3900), '1小时05分');
assert.equal(formatVisitDuration(0), '0秒');
assert.equal(formatVisitDuration(-5), '0秒');
assert.equal(formatVisitDuration(100000), '2小时00分');
assert.equal(formatVisitDuration(null), '0秒');

// createActiveDurationTracker: 不累计后台时间
let clock = 1000;
const tracker = createActiveDurationTracker({ nowMs: () => clock });
tracker.start();
clock += 5000;
assert.equal(tracker.snapshot(), 5); // 5s visible
tracker.markVisibility('hidden');
clock += 60000; // 后台 60s 不应计入
assert.equal(tracker.snapshot(), 5, 'background time should not count');
tracker.markVisibility('visible');
clock += 10000;
assert.equal(tracker.snapshot(), 15, 'visible time resumes');
assert.equal(tracker.stop(), 15);

// resolveDisplayDurationSeconds 优先级
assert.equal(resolveDisplayDurationSeconds({ durationSeconds: 40, activeDurationSeconds: 30, totalDurationSeconds: 60 }), 40);
assert.equal(resolveDisplayDurationSeconds({ activeDurationSeconds: 30, totalDurationSeconds: 60 }), 30);
assert.equal(resolveDisplayDurationSeconds({ totalDurationSeconds: 60 }), 60);
assert.equal(resolveDisplayDurationSeconds({}), null);
assert.equal(resolveDisplayDurationSeconds(null), null);
assert.equal(resolveDisplayDurationSeconds({ durationSeconds: -1, activeDurationSeconds: 5 }), 5);

// formatVisitDurationFromRecord
assert.equal(formatVisitDurationFromRecord({ durationSeconds: 70 }), '1分10秒');
assert.equal(formatVisitDurationFromRecord({ visitId: 'visit-1', durationSeconds: 0 }), '小于1秒');
assert.equal(formatVisitDurationFromRecord({ visitId: 'visit-1' }), '小于15秒');
assert.equal(formatVisitDurationFromRecord({}), '-');
assert.equal(formatVisitDurationFromRecord(null), '-');

console.log('articleVisitTracker tests passed');
