import assert from "node:assert/strict";

import {
  normalizeAsciiInput,
  normalizeInviteCode,
  validateInviteCode,
  validateAvatarFile,
  validateRegistrationForm,
} from "./registerValidation.js";

assert.equal(normalizeAsciiInput("Ａbc　１２3"), "Abc 123");
assert.equal(normalizeInviteCode(" sg-１２3 "), "SG-123");

assert.equal(validateInviteCode(""), "请输入邀请码");
assert.equal(validateInviteCode("abc"), "邀请码长度需在 6-64 位之间");
assert.equal(validateInviteCode("SG-12*34"), "邀请码仅支持大写字母、数字与连字符");
assert.equal(validateInviteCode("SG-2026-ABC"), "");

assert.equal(
  validateAvatarFile({ type: "image/png", size: 1024 }),
  ""
);
assert.equal(
  validateAvatarFile({ type: "text/plain", size: 1024 }),
  "头像仅支持 PNG/JPG/WebP/GIF/AVIF"
);
assert.equal(
  validateAvatarFile({ type: "image/png", size: 2 * 1024 * 1024 + 1 }),
  "头像大小不能超过 2MB"
);

assert.deepEqual(
  validateRegistrationForm({
    avatarFile: { type: "image/png", size: 1024 },
    username: "user-01",
    displayName: "三桂",
    password: "Pass123!",
    confirmPassword: "Pass123!",
  }),
  {}
);

assert.deepEqual(
  validateRegistrationForm({
    avatarFile: null,
    username: "中文名",
    displayName: "",
    password: "密碼123456",
    confirmPassword: "123",
  }),
  {
    avatarFile: "请上传头像",
    username: "用户名仅支持英文、数字与常见符号",
    displayName: "请输入显示名称",
    password: "密码仅支持英文、数字与常见符号",
    confirmPassword: "两次输入的密码不一致",
  }
);
