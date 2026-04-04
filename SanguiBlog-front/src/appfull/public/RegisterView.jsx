import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Ticket, Upload, UserPlus } from "lucide-react";

import { useLayoutOffsets } from "../../contexts/LayoutOffsetContext.jsx";
import {
  registerWithInvite,
  verifyRegistrationInvite,
} from "../../api";
import {
  normalizeAsciiInput,
  normalizeInviteCode,
  validateInviteCode,
  validateRegistrationForm,
} from "./registerValidation.js";

const VERIFY_COOLDOWN_MS = 5000;
const AVATAR_PICK_COOLDOWN_MS = 3000;

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs font-bold text-red-600">{message}</p>;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("头像预览生成失败"));
    reader.readAsDataURL(file);
  });
}

function probePreviewSource(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => reject(new Error("当前图片无法生成预览，请更换图片后重试"));
    img.src = src;
  });
}

export default function RegisterView({ setView, isDarkMode }) {
  const { headerHeight } = useLayoutOffsets();
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteVerified, setInviteVerified] = useState(false);
  const [inviteMeta, setInviteMeta] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyCooldownUntil, setVerifyCooldownUntil] = useState(0);
  const [showVerifyCooldownError, setShowVerifyCooldownError] = useState(false);

  const [form, setForm] = useState({
    avatarFile: null,
    avatarPreview: "",
    username: "",
    displayName: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [avatarCooldownUntil, setAvatarCooldownUntil] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const avatarInputRef = useRef(null);
  const avatarObjectUrlRef = useRef("");

  useEffect(() => () => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = "";
    }
  }, []);

  useEffect(() => {
    const needsTicker = verifyCooldownUntil > Date.now() || avatarCooldownUntil > Date.now();
    if (!needsTicker) return undefined;
    const timer = window.setInterval(() => {
      setClock(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [verifyCooldownUntil, avatarCooldownUntil]);

  useEffect(() => {
    if (verifyCooldownUntil <= clock) {
      setShowVerifyCooldownError(false);
    }
  }, [clock, verifyCooldownUntil]);

  const bg = isDarkMode ? "bg-[#050505]" : "bg-[#f8f8fa]";
  const text = isDarkMode ? "text-gray-100" : "text-gray-900";
  const inputBg = isDarkMode ? "bg-gray-800/70 text-white border-white/18" : "bg-white/72 text-black border-white/75";
  const subtle = isDarkMode ? "text-gray-300" : "text-gray-600";
  const pageThemeClass = `home-redesign-surface ${isDarkMode ? "is-dark" : ""}`;
  const panel = `home-ios-card ${isDarkMode ? "home-ios-card--dark" : ""}`;
  const fieldClass = `w-full border p-3 rounded-xl font-bold outline-none transition-shadow ${inputBg} focus:shadow-[0_12px_22px_rgba(99,102,241,0.22)]`;
  const actionBtnClass = isDarkMode
    ? "border border-white/12 bg-white/[0.07] text-white hover:bg-white/[0.14] shadow-[0_10px_22px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]"
    : "border border-black/10 bg-white/78 text-black hover:bg-white/92 shadow-[0_10px_22px_rgba(148,163,184,0.15),inset_0_1px_0_rgba(255,255,255,0.84)]";
  const accentBtnClass = isDarkMode
    ? "border border-white/10 bg-[linear-gradient(180deg,rgba(255,215,0,0.34),rgba(255,196,0,0.2))] text-white hover:bg-[linear-gradient(180deg,rgba(255,215,0,0.42),rgba(255,196,0,0.28))] shadow-[0_14px_26px_rgba(255,196,0,0.18),inset_0_1px_0_rgba(255,255,255,0.2)]"
    : "border border-[#d9a200]/28 bg-[linear-gradient(180deg,rgba(255,232,145,0.92),rgba(255,217,92,0.72))] text-black hover:bg-[linear-gradient(180deg,rgba(255,236,165,0.96),rgba(255,220,110,0.82))] shadow-[0_14px_26px_rgba(255,215,0,0.16),inset_0_1px_0_rgba(255,255,255,0.65)]";

  const verifyWaitSeconds = Math.max(0, Math.ceil((verifyCooldownUntil - clock) / 1000));
  const avatarWaitSeconds = Math.max(0, Math.ceil((avatarCooldownUntil - clock) / 1000));
  const verifyCooldownActive = verifyWaitSeconds > 0;

  const inviteSummary = useMemo(() => {
    if (!inviteMeta) return "";
    const ttlLabel = inviteMeta?.expiresAtLabel || inviteMeta?.expiresAt;
    return ttlLabel ? `有效至 ${ttlLabel}` : "邀请码可用";
  }, [inviteMeta]);

  const handleInviteVerify = async (event) => {
    event.preventDefault();
    setInviteError("");
    setSubmitError("");

    const validationError = validateInviteCode(inviteCode);
    if (validationError) {
      setInviteVerified(false);
      setInviteMeta(null);
      setInviteError(validationError);
      return;
    }

    const now = Date.now();
    if (now < verifyCooldownUntil) {
      setShowVerifyCooldownError(true);
      return;
    }

    setVerifying(true);
    setShowVerifyCooldownError(false);
    setVerifyCooldownUntil(now + VERIFY_COOLDOWN_MS);
    try {
      const response = await verifyRegistrationInvite(normalizeInviteCode(inviteCode));
      const data = response?.data || response || {};
      setInviteVerified(true);
      setInviteMeta(data || null);
      setInviteError("");
    } catch (error) {
      setInviteVerified(false);
      setInviteMeta(null);
      setInviteError(error?.message || "邀请码验证失败");
    } finally {
      setVerifying(false);
      setClock(Date.now());
    }
  };

  const updateAsciiField = (name, value) => {
    const safe = normalizeAsciiInput(value);
    setForm((prev) => ({ ...prev, [name]: safe }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleAvatarPick = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const now = Date.now();
    if (now < avatarCooldownUntil) {
      setFieldErrors((prev) => ({
        ...prev,
        avatarFile: `上传过快，请 ${avatarWaitSeconds} 秒后再试`,
      }));
      event.target.value = "";
      return;
    }
    setAvatarCooldownUntil(now + AVATAR_PICK_COOLDOWN_MS);

    const nextErrors = validateRegistrationForm({
      ...form,
      avatarFile: file,
      confirmPassword: form.confirmPassword,
    });
    if (nextErrors.avatarFile) {
      setFieldErrors((prev) => ({ ...prev, avatarFile: nextErrors.avatarFile }));
      event.target.value = "";
      return;
    }

    try {
      const objectUrl = URL.createObjectURL(file);
      let preview = "";
      try {
        preview = await probePreviewSource(objectUrl);
      } catch {
        URL.revokeObjectURL(objectUrl);
        const dataUrl = await readFileAsDataUrl(file);
        preview = await probePreviewSource(dataUrl);
      }

      if (avatarObjectUrlRef.current && avatarObjectUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
      }
      avatarObjectUrlRef.current = preview.startsWith("blob:") ? preview : "";
      setForm((prev) => ({
        ...prev,
        avatarFile: file,
        avatarPreview: preview,
      }));
      setFieldErrors((prev) => ({ ...prev, avatarFile: "" }));
    } catch (error) {
      setFieldErrors((prev) => ({
        ...prev,
        avatarFile: error?.message || "头像预览生成失败",
      }));
    } finally {
      event.target.value = "";
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setSubmitError("");

    const errors = validateRegistrationForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await registerWithInvite({
        inviteCode: normalizeInviteCode(inviteCode),
        avatarFile: form.avatarFile,
        username: form.username.trim(),
        displayName: form.displayName.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      setView("login");
    } catch (error) {
      setSubmitError(error?.message || "注册失败");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCooldownMessage = showVerifyCooldownError && verifyCooldownActive
    ? `验证过快，请 ${verifyWaitSeconds} 秒后再试`
    : "";

  return (
    <div
      className={`${bg} ${text} ${pageThemeClass}`}
      style={{ minHeight: `max(0px, calc(100vh - ${headerHeight || 0}px))` }}
    >
      <div className="max-w-3xl mx-auto px-4 py-14 md:py-20 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${accentBtnClass}`}>
              <UserPlus size={22} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em]">Invite Only</p>
              <h1 className="text-3xl font-black italic">邀请码注册</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setView("login")}
            className="inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4"
          >
            <ArrowLeft size={16} />
            返回登录
          </button>
        </div>

        {!inviteVerified ? (
          <section className={`${panel} p-6 md:p-8`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${actionBtnClass}`}>
                <Ticket size={18} />
              </div>
              <div>
                <h2 className="text-2xl font-black">Step 1</h2>
                <p className={`text-sm ${subtle}`}>先验证邀请码</p>
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleInviteVerify}>
              <div className="space-y-2">
                <label className="text-sm font-black uppercase">邀请码</label>
                <input
                  className={fieldClass}
                  value={inviteCode}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="SG-ABCD-EFGH-JKLM"
                  onChange={(event) => {
                    setInviteCode(normalizeInviteCode(event.target.value));
                    setInviteError("");
                    setShowVerifyCooldownError(false);
                  }}
                />
              </div>

              {inviteSummary ? (
                <div className={`border p-3 text-sm font-bold rounded-xl ${isDarkMode ? "border-white/15 bg-[#00E096]/70 text-black" : "border-black/12 bg-[#00E096]/78 text-black"}`}>
                  {inviteSummary}
                </div>
              ) : null}

              {inviteError ? (
                <div className="border border-black/15 bg-red-500 p-3 text-sm font-bold text-white rounded-xl">
                  {inviteError}
                </div>
              ) : null}

              {verifyCooldownMessage ? (
                <div className="border border-black/15 bg-red-500 p-3 text-sm font-bold text-white rounded-xl">
                  {verifyCooldownMessage}
                </div>
              ) : null}

              <div className="flex items-center gap-4 flex-wrap">
                <button
                  type="submit"
                  className={`min-w-[180px] px-4 py-3 rounded-xl font-black transition ${
                    verifyCooldownActive
                      ? "bg-gray-400 text-gray-900 cursor-not-allowed opacity-80"
                      : accentBtnClass
                  }`}
                  disabled={verifying || verifyCooldownActive}
                >
                  {verifying
                    ? "验证中..."
                    : verifyCooldownActive
                      ? `冷却中 ${verifyWaitSeconds}s`
                      : "验证"}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {inviteVerified ? (
          <section className={`${panel} p-6 md:p-8`}>
            <div>
              <h2 className="text-2xl font-black">Step 2</h2>
              <p className={`text-sm mt-1 ${subtle}`}>填写注册信息</p>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleRegister}>
              <div className="space-y-2">
                <label className="text-sm font-black uppercase">头像</label>
                <div className="flex flex-wrap items-start gap-4">
                  <div
                  className={`w-28 h-28 border overflow-hidden rounded-xl ${inputBg} flex items-center justify-center shadow-[0_12px_24px_rgba(0,0,0,0.14)] bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6),linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6)] bg-[length:16px_16px] bg-[position:0_0,8px_8px]`}
                  >
                    {form.avatarPreview ? (
                      <img
                        key={form.avatarPreview}
                        src={form.avatarPreview}
                        alt="avatar preview"
                        className="block w-full h-full object-contain bg-white"
                        onError={() => {
                          setForm((prev) => ({ ...prev, avatarPreview: "" }));
                          setFieldErrors((prev) => ({
                            ...prev,
                            avatarFile: "当前图片无法显示预览，请更换图片后重试",
                          }));
                        }}
                      />
                    ) : (
                      <Upload size={28} />
                    )}
                  </div>

                  <div className="space-y-2">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                      className="hidden"
                      onChange={handleAvatarPick}
                    />
                    <button
                      type="button"
                      className={`px-4 py-2 rounded-xl font-bold ${actionBtnClass}`}
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      选择头像
                    </button>
                    <p className={`text-xs font-medium ${subtle}`}>最大 2MB</p>
                  </div>
                </div>

                <FieldError message={fieldErrors.avatarFile} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-black uppercase">用户名</label>
                  <input
                    className={fieldClass}
                    value={form.username}
                    autoComplete="username"
                    onChange={(event) => updateAsciiField("username", event.target.value)}
                  />
                  <FieldError message={fieldErrors.username} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black uppercase">显示名称</label>
                  <input
                    className={fieldClass}
                    value={form.displayName}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, displayName: event.target.value }));
                      setFieldErrors((prev) => ({ ...prev, displayName: "" }));
                    }}
                  />
                  <FieldError message={fieldErrors.displayName} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-black uppercase">密码</label>
                  <div className="relative">
                    <input
                      className={`${fieldClass} pr-14`}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(event) => updateAsciiField("password", event.target.value)}
                    />
                    <button
                      type="button"
                      className={`absolute inset-y-0 right-3 my-auto h-9 w-10 inline-flex items-center justify-center rounded-xl border ${isDarkMode ? "border-white/18 bg-white/10 text-gray-100" : "border-black/10 bg-white/75 text-black"}`}
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "隐藏密码" : "显示密码"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <FieldError message={fieldErrors.password} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black uppercase">确认密码</label>
                  <div className="relative">
                    <input
                      className={`${fieldClass} pr-14`}
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.confirmPassword}
                      onChange={(event) => updateAsciiField("confirmPassword", event.target.value)}
                    />
                    <button
                      type="button"
                      className={`absolute inset-y-0 right-3 my-auto h-9 w-10 inline-flex items-center justify-center rounded-xl border ${isDarkMode ? "border-white/18 bg-white/10 text-gray-100" : "border-black/10 bg-white/75 text-black"}`}
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={showConfirmPassword ? "隐藏确认密码" : "显示确认密码"}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <FieldError message={fieldErrors.confirmPassword} />
                </div>
              </div>

              {submitError ? (
                <div className="border border-black/15 bg-red-500 p-3 text-sm font-bold text-white rounded-xl">
                  {submitError}
                </div>
              ) : null}

              <div className="flex gap-4 flex-wrap">
                <button type="submit" className={`min-w-[180px] px-4 py-3 rounded-xl font-black ${accentBtnClass}`} disabled={submitting}>
                  {submitting ? "提交中..." : "提交注册"}
                </button>
                <button
                  type="button"
                  className={`px-4 py-3 rounded-xl font-bold ${actionBtnClass}`}
                  onClick={() => {
                    setInviteVerified(false);
                    setInviteMeta(null);
                    setInviteError("");
                  }}
                >
                  返回重新验证
                </button>
              </div>
            </form>
          </section>
        ) : null}
      </div>
    </div>
  );
}
