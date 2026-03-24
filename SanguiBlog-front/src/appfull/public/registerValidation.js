export const REGISTER_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const REGISTER_AVATAR_ACCEPT = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
];

export const normalizeAsciiInput = (value) => {
  if (!value) return "";
  const normalized = [];
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    if (code === 0x3000) {
      normalized.push(" ");
      continue;
    }
    if (code >= 0xff01 && code <= 0xff5e) {
      normalized.push(String.fromCharCode(code - 0xfee0));
      continue;
    }
    if (code >= 32 && code <= 126) {
      normalized.push(ch);
    }
  }
  return normalized.join("");
};

export const hasInvalidAscii = (value) => {
  if (!value) return false;
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    if (code === 0x3000) continue;
    if (code >= 0xff01 && code <= 0xff5e) continue;
    if (code >= 32 && code <= 126) continue;
    return true;
  }
  return false;
};

export const normalizeInviteCode = (value) =>
  normalizeAsciiInput(value).toUpperCase().replace(/\s+/g, "");

export const validateInviteCode = (value) => {
  const inviteCode = normalizeInviteCode(value);
  if (!inviteCode) return "请输入邀请码";
  if (inviteCode.length < 6 || inviteCode.length > 64) return "邀请码长度需在 6-64 位之间";
  if (!/^[A-Z0-9-]+$/.test(inviteCode)) return "邀请码仅支持大写字母、数字与连字符";
  return "";
};

export const validateAvatarFile = (file) => {
  if (!file) return "请上传头像";
  if (!REGISTER_AVATAR_ACCEPT.includes(file.type)) {
    return "头像仅支持 PNG/JPG/WebP/GIF/AVIF";
  }
  if (file.size > REGISTER_AVATAR_MAX_BYTES) {
    return "头像大小不能超过 2MB";
  }
  return "";
};

export const validateRegistrationForm = (form) => {
  const errors = {};
  const username = (form?.username || "").trim();
  const displayName = (form?.displayName || "").trim();
  const password = form?.password || "";
  const confirmPassword = form?.confirmPassword || "";

  const avatarError = validateAvatarFile(form?.avatarFile || null);
  if (avatarError) errors.avatarFile = avatarError;

  if (!username) {
    errors.username = "请输入用户名";
  } else if (username.length < 3 || username.length > 32) {
    errors.username = "用户名长度需在 3-32 之间";
  } else if (hasInvalidAscii(username)) {
    errors.username = "用户名仅支持英文、数字与常见符号";
  }

  if (!displayName) {
    errors.displayName = "请输入显示名称";
  } else if (displayName.length < 2 || displayName.length > 32) {
    errors.displayName = "显示名称长度需在 2-32 之间";
  }

  if (!password) {
    errors.password = "请输入密码";
  } else if (password.length < 6 || password.length > 64) {
    errors.password = "密码长度需在 6-64 之间";
  } else if (hasInvalidAscii(password)) {
    errors.password = "密码仅支持英文、数字与常见符号";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "请再次输入密码";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "两次输入的密码不一致";
  }

  return errors;
};
