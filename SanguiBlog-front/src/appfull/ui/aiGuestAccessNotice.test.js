import assert from 'node:assert/strict';

import { buildAiGuestAccessNotice } from './aiGuestAccessNotice.js';

assert.equal(
    buildAiGuestAccessNotice({
        isGuestMode: true,
        payload: { captchaRequired: true }
    }),
    '当前访客提问过快，本次未发送到 AI。请先完成验证码后再继续提问。登录后可获得更高的提问额度。'
);

assert.equal(
    buildAiGuestAccessNotice({
        isGuestMode: true,
        payload: { dailyBudgetExceeded: true }
    }),
    '今日访客 AI 额度已用完，本次未发送到 AI。请稍后再试，或登录后继续使用更高额度。'
);

assert.equal(
    buildAiGuestAccessNotice({
        isGuestMode: true,
        payload: { retryAfterSeconds: 9 },
        status: 429
    }),
    '当前访客提问过于频繁，本次未发送到 AI。请9 秒后再试。登录后可获得更高的提问额度。'
);

assert.equal(
    buildAiGuestAccessNotice({
        isGuestMode: false,
        payload: { retryAfterSeconds: 9 },
        status: 429
    }),
    null
);

console.log('aiGuestAccessNotice tests passed');
