import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Ticket, Upload, UserPlus } from "lucide-react";

import PopButton from "../../components/common/PopButton.jsx";
import {
  registerWithInvite,
  verifyRegistrationInvite,
} from "../../api";
import { THEME } from "../shared.js";
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

export default function RegisterView({ setView, isDarkMode }) {
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

  useEffect(() => () => {
    if (form.avatarPreview) {
      URL.revokeObjectURL(form.avatarPreview);
    }
  }, [form.avatarPreview]);

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

  const bg = isDarkMode ? THEME.colors.bgDark : "bg-[#F3F0E8]";
  const surface = isDarkMode ? THEME.colors.surfaceDark : "bg-white";
  const text = isDarkMode ? "text-gray-100" : "text-gray-900";
  const inputBg = isDarkMode ? "bg-gray-800 text-white" : "bg-white text-black";
  const subtle = isDarkMode ? "text-gray-300" : "text-gray-600";
  const panel = `${surface} border-4 border-black shadow-[8px_8px_0px_0px_#000]`;

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

  const handleAvatarPick = (event) => {
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

    if (form.avatarPreview) {
      URL.revokeObjectURL(form.avatarPreview);
    }
    const preview = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, avatarFile: file, avatarPreview: preview }));
    setFieldErrors((prev) => ({ ...prev, avatarFile: "" }));
    event.target.value = "";
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
    <div className={`min-h-screen ${bg} ${text}`}>
      <div className="max-w-3xl mx-auto px-4 py-14 md:py-20 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 border-2 border-black bg-[#FFD700] flex items-center justify-center">
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

        <section className={`${panel} p-6 md:p-8`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-black bg-black text-white flex items-center justify-center">
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
                className={`w-full border-2 border-black p-3 font-bold outline-none focus:shadow-[4px_4px_0px_0px_#FFD700] transition-shadow ${inputBg}`}
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
              <div className="border-2 border-black bg-[#00E096] p-3 text-sm font-bold text-black">
                {inviteSummary}
              </div>
            ) : null}

            {inviteError ? (
              <div className="border-2 border-black bg-red-500 p-3 text-sm font-bold text-white">
                {inviteError}
              </div>
            ) : null}

            {verifyCooldownMessage ? (
              <div className="border-2 border-black bg-red-500 p-3 text-sm font-bold text-white">
                {verifyCooldownMessage}
              </div>
            ) : null}

            <div className="flex items-center gap-4 flex-wrap">
              <PopButton
                variant="primary"
                className={`min-w-[180px] justify-center ${
                  verifyCooldownActive
                    ? "bg-gray-400 text-gray-900 hover:bg-gray-400 cursor-not-allowed opacity-80"
                    : ""
                }`}
                disabled={verifying || verifyCooldownActive}
              >
                {verifying
                  ? "验证中..."
                  : verifyCooldownActive
                    ? `冷却中 ${verifyWaitSeconds}s`
                    : "验证"}
              </PopButton>
              {verifyCooldownActive ? (
                <span className={`text-sm font-bold ${subtle}`}>
                  可再次验证：{verifyWaitSeconds}s
                </span>
              ) : null}
            </div>
          </form>
        </section>

        {inviteVerified ? (
          <section className={`${panel} p-6 md:p-8`}>
            <div>
              <h2 className="text-2xl font-black">Step 2</h2>
              <p className={`text-sm mt-1 ${subtle}`}>填写注册信息</p>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleRegister}>
              <div className="space-y-2">
                <label className="text-sm font-black uppercase">头像</label>
                <div className="flex flex-wrap items-center gap-4">
                  <div className={`w-20 h-20 border-2 border-black overflow-hidden ${inputBg} flex items-center justify-center`}>
                    {form.avatarPreview ? (
                      <img src={form.avatarPreview} alt="avatar preview" className="w-full h-full object-cover" />
                    ) : (
                      <Upload size={22} />
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
                      className="px-4 py-2 border-2 border-black font-bold bg-[#6366F1] text-white"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      选择头像
                    </button>
                    <p className={`text-xs font-medium ${subtle}`}>
                      最大 2MB
                    </p>
                  </div>
                </div>
                <FieldError message={fieldErrors.avatarFile} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-black uppercase">用户名</label>
                  <input
                    className={`w-full border-2 border-black p-3 font-bold outline-none ${inputBg}`}
                    value={form.username}
                    autoComplete="username"
                    onChange={(event) => updateAsciiField("username", event.target.value)}
                  />
                  <FieldError message={fieldErrors.username} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black uppercase">显示名称</label>
                  <input
                    className={`w-full border-2 border-black p-3 font-bold outline-none ${inputBg}`}
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
                      className={`w-full border-2 border-black p-3 pr-14 font-bold outline-none ${inputBg}`}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(event) => updateAsciiField("password", event.target.value)}
                    />
                    <button
                      type="button"
                      className={`absolute inset-y-0 right-3 my-auto h-9 w-10 inline-flex items-center justify-center border-2 ${isDarkMode ? "border-gray-300 bg-gray-800 text-gray-100" : "border-black bg-white text-black"}`}
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
                      className={`w-full border-2 border-black p-3 pr-14 font-bold outline-none ${inputBg}`}
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.confirmPassword}
                      onChange={(event) => updateAsciiField("confirmPassword", event.target.value)}
                    />
                    <button
                      type="button"
                      className={`absolute inset-y-0 right-3 my-auto h-9 w-10 inline-flex items-center justify-center border-2 ${isDarkMode ? "border-gray-300 bg-gray-800 text-gray-100" : "border-black bg-white text-black"}`}
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
                <div className="border-2 border-black bg-red-500 p-3 text-sm font-bold text-white">
                  {submitError}
                </div>
              ) : null}

              <div className="flex gap-4 flex-wrap">
                <PopButton
                  variant="primary"
                  className="min-w-[180px] justify-center"
                  disabled={submitting}
                >
                  {submitting ? "提交中..." : "提交注册"}
                </PopButton>
                <button
                  type="button"
                  className="px-4 py-3 border-2 border-black font-bold"
                  onClick={() => {
                    setInviteVerified(false);
                    setInviteMeta(null);
                    setInviteError("");
                  }}
                >
                  重新验证
                </button>
              </div>
            </form>
          </section>
        ) : null}
      </div>
    </div>
  );
}
