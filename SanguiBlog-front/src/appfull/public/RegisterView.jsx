import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, Ticket, Upload, UserPlus } from "lucide-react";

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

const STEP_STYLES = {
  idle: "border-black bg-white text-black",
  active: "border-black bg-[#FFD700] text-black",
  done: "border-black bg-[#00E096] text-black",
};

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
  const avatarInputRef = useRef(null);

  useEffect(() => () => {
    if (form.avatarPreview) {
      URL.revokeObjectURL(form.avatarPreview);
    }
  }, [form.avatarPreview]);

  const bg = isDarkMode ? THEME.colors.bgDark : "bg-gray-100";
  const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
  const text = isDarkMode ? "text-gray-100" : "text-gray-800";
  const inputBg = isDarkMode ? "bg-gray-700 text-white" : "bg-white text-black";
  const subtle = isDarkMode ? "text-gray-300" : "text-gray-600";
  const panel = `${surface} border-4 border-black shadow-[8px_8px_0px_0px_#000]`;

  const verifyWaitSeconds = Math.max(0, Math.ceil((verifyCooldownUntil - Date.now()) / 1000));
  const avatarWaitSeconds = Math.max(0, Math.ceil((avatarCooldownUntil - Date.now()) / 1000));

  const stepOneClass = inviteVerified ? STEP_STYLES.done : STEP_STYLES.active;
  const stepTwoClass = inviteVerified ? STEP_STYLES.active : STEP_STYLES.idle;

  const inviteSummary = useMemo(() => {
    if (!inviteMeta) return "";
    const ttlLabel = inviteMeta?.expiresAtLabel || inviteMeta?.expiresAt;
    return ttlLabel ? `邀请码验证通过，有效至 ${ttlLabel}` : "邀请码验证通过";
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
      setInviteError(`验证过快，请 ${verifyWaitSeconds} 秒后再试`);
      return;
    }

    setVerifying(true);
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

  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className={`${panel} p-6 h-fit`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 border-2 border-black bg-[#FFD700] flex items-center justify-center">
                <UserPlus size={22} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em]">Invite Only</p>
                <h1 className="text-3xl font-black italic">注册入口</h1>
              </div>
            </div>
            <p className={`mt-4 text-sm font-medium leading-6 ${subtle}`}>
              当前注册流程采用“先验证邀请码，再填写资料”的方式推进。
            </p>
            <div className="mt-6 space-y-3">
              <div className={`border-2 px-4 py-3 ${stepOneClass}`}>
                <div className="flex items-center gap-2 font-black uppercase text-sm">
                  <Ticket size={16} />
                  邀请码验证
                </div>
                <p className="mt-1 text-sm font-semibold">请输入邀请码并发起验证</p>
              </div>
              {inviteVerified ? (
                <div className={`border-2 px-4 py-3 ${stepTwoClass}`}>
                  <div className="flex items-center gap-2 font-black uppercase text-sm">
                    <Upload size={16} />
                    填写注册资料
                  </div>
                  <p className="mt-1 text-sm font-semibold">验证通过后可填写头像、用户名与密码</p>
                </div>
              ) : null}
            </div>
          </aside>

          <div className="space-y-6">
            <section className={`${panel} p-6 md:p-8`}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em]">Step 1</p>
                  <h2 className="text-2xl font-black">邀请码验证</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="text-sm font-bold underline underline-offset-4"
                >
                  返回登录页
                </button>
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
                    placeholder="例如：SG-ABCD-EFGH-JKLM"
                    onChange={(event) => {
                      setInviteCode(normalizeInviteCode(event.target.value));
                      setInviteError("");
                    }}
                  />
                  <p className={`text-xs font-medium ${subtle}`}>
                    Step 1 只验证邀请码；验证通过后，才会显示后续注册信息。
                  </p>
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
                <div className="flex gap-4 flex-wrap">
                  <PopButton
                    variant="primary"
                    className="min-w-[180px] justify-center"
                    disabled={verifying}
                  >
                    {verifying ? "验证中..." : "验证邀请码"}
                  </PopButton>
                  {verifyWaitSeconds > 0 ? (
                    <div className="px-4 py-3 border-2 border-black text-sm font-bold">
                      冷却中：{verifyWaitSeconds}s
                    </div>
                  ) : null}
                </div>
              </form>
            </section>

            {inviteVerified ? (
              <section className={`${panel} p-6 md:p-8`}>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em]">Step 2</p>
                  <h2 className="text-2xl font-black">填写注册信息</h2>
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
                          支持 PNG/JPG/WebP/GIF/AVIF，最大 2MB，3 秒内禁止连续重复选择。
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
                      }}
                    >
                      重新验证邀请码
                    </button>
                  </div>
                </form>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
