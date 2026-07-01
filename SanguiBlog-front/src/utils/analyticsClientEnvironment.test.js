import assert from 'node:assert/strict';
import { collectAnalyticsClientEnvironment } from './analyticsClientEnvironment.js';

const makeScope = (overrides = {}) => ({
  Intl: {
    DateTimeFormat: () => ({
      resolvedOptions: () => ({ timeZone: 'Asia/Shanghai' }),
    }),
  },
  screen: { width: 1920, height: 1080 },
  innerWidth: 1440,
  innerHeight: 900,
  devicePixelRatio: 2.345,
  navigator: { webdriver: false },
  document: {
    visibilityState: 'visible',
    referrer: 'https://example.com/post/1?token=secret#frag',
  },
  ...overrides,
});

assert.deepEqual(collectAnalyticsClientEnvironment(makeScope()), {
  timezone: 'Asia/Shanghai',
  screenSize: '1920x1080',
  viewportSize: '1440x900',
  devicePixelRatio: 2.35,
  webdriver: false,
  visibilityState: 'visible',
  referrerClient: 'https://example.com/post/1?token=secret#frag',
});

assert.equal(
  collectAnalyticsClientEnvironment(makeScope({ devicePixelRatio: 99 })).devicePixelRatio,
  null,
  'devicePixelRatio should be clamped to the backend contract range'
);

assert.equal(
  collectAnalyticsClientEnvironment(makeScope({ document: { visibilityState: 'opened', referrer: '' } })).visibilityState,
  null,
  'visibilityState should use the backend allow-list'
);

assert.equal(
  collectAnalyticsClientEnvironment(makeScope({ navigator: { webdriver: 'true' } })).webdriver,
  null,
  'webdriver should remain boolean or null'
);

console.log('analytics client environment tests passed');
