
import React, { useEffect, useRef, useState } from "react";
import ImageWithFallback from '../../components/common/ImageWithFallback.jsx';
import { useBlog } from "../../hooks/useBlogData";
import { updateProfile, uploadAvatar, adminUploadWechatQr, adminDeleteWechatQr } from "../../api";
import { buildAssetUrl } from "../../utils/asset.js";
import {
  User,
  Image,
  Upload,
  Mail,
  FileText,
  Github as GithubIcon,
  Shield,
  Eye,
  EyeOff,
  Lock,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Trash2,
} from "lucide-react";

const FieldLabel = ({ icon: Icon, children }) => (
  <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-gray-400">
    {Icon && <Icon size={14} />}
    {children}
  </label>
);

const InfoBadge = ({ label, value, isDarkMode }) => {
  const labelClass = isDarkMode ? "text-gray-300" : "text-gray-700";
  const valueClass = isDarkMode
    ? "border-white/12 bg-white/[0.06] text-white"
    : "border-white/80 bg-white/80 text-slate-900";
  return (
    <div className="flex flex-col gap-1">
      <span className={`text-xs font-semibold ${labelClass}`}>{label}</span>
      <span className={`px-3 py-2 rounded-2xl border text-sm font-mono backdrop-blur-xl ${valueClass}`}>
        {value || "—"}
      </span>
    </div>
  );
};

export default function AdminProfile({ isDarkMode = false }) {
  const { user: currentUser } = useBlog();
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    email: "",
    title: "",
    bio: "",
    github: "",
    avatarUrl: "",
    oldPassword: "",
    newPassword: "",
  });
  const [meta, setMeta] = useState({
    role: "-",
    id: "-",
    createdAt: "-",
    lastLogin: "-",
  });
  const [avatarPreview, setAvatarPreview] = useState("");
  const [status, setStatus] = useState({ type: "", text: "" });
  const [passwordStatus, setPasswordStatus] = useState({ type: "", text: "" });
  const statusRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const fileRef = useRef(null);

  const [wechatQrUrl, setWechatQrUrl] = useState("");
  const [wechatQrPreview, setWechatQrPreview] = useState("");
  const [qrStatus, setQrStatus] = useState({ type: "", text: "" });
  const [uploadingQr, setUploadingQr] = useState(false);
  const [deletingQr, setDeletingQr] = useState(false);
  const qrFileRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    setForm((prev) => ({
      ...prev,
      username: currentUser.username || "",
      displayName: currentUser.displayName || currentUser.display_name || "",
      email: currentUser.email || "",
      title: currentUser.title || "",
      bio: currentUser.bio || "",
      github: currentUser.github || "",
      avatarUrl: currentUser.avatar || currentUser.avatarUrl || currentUser.avatar_url || "",
      oldPassword: "",
      newPassword: "",
    }));
    setAvatarPreview(buildAssetUrl(currentUser.avatar || currentUser.avatarUrl || currentUser.avatar_url, ""));
    const qrUrl = currentUser.wechatQr || currentUser.wechatQrUrl || "";
    setWechatQrUrl(qrUrl);
    setWechatQrPreview(qrUrl ? buildAssetUrl(qrUrl, "") : "");
    setMeta({
      role: mapRole(currentUser.role),
      id: currentUser.id ?? "-",
      createdAt: formatDate(currentUser.createdAt || currentUser.created_at),
      lastLogin: formatDate(currentUser.lastLoginAt || currentUser.last_login_at),
    });
    setStatus({ type: "", text: "" });
    setPasswordStatus({ type: "", text: "" });
  }, [currentUser]);

  useEffect(() => {
    if (status.text) {
      statusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [status]);

  const mapRole = (role) => {
    const map = {
      SUPER_ADMIN: "超级管理员",
      ADMIN: "管理员",
      USER: "普通用户",
      1: "超级管理员",
      2: "管理员",
      3: "普通用户",
    };
    return map[role] || role || "未知";
  };

  const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "oldPassword") {
      setPasswordVerified(false);
      setPasswordStatus({ type: "", text: "" });
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus({ type: "error", text: "请选择图片文件" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setStatus({ type: "error", text: "图片需小于 2MB" });
      return;
    }
    setUploadingAvatar(true);
    try {
      const response = await uploadAvatar(file);
      const newPath =
        response?.data?.url ||
        response?.url ||
        response?.avatar ||
        response?.avatarUrl ||
        response?.avatar_url ||
        response?.path;
      if (!newPath) throw new Error("上传返回结果为空");
      await updateProfile({ avatarUrl: newPath });
      setForm((prev) => ({ ...prev, avatarUrl: newPath }));
      setAvatarPreview(buildAssetUrl(newPath, ""));
      setStatus({ type: "success", text: "头像上传成功" });
    } catch (err) {
      setStatus({ type: "error", text: `头像上传失败：${err.message}` });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!form.oldPassword) {
      setPasswordStatus({ type: "error", text: "请输入原密码" });
      return;
    }
    setVerifying(true);
    try {
      await updateProfile({ oldPassword: form.oldPassword, verifyOnly: true });
      setPasswordVerified(true);
      setPasswordStatus({ type: "success", text: "原密码验证成功，可输入新密码" });
    } catch (err) {
      setPasswordVerified(false);
      setPasswordStatus({ type: "error", text: `原密码验证失败：${err.message}` });
    } finally {
      setVerifying(false);
    }
  };

  const handleQrUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setQrStatus({ type: "error", text: "请选择图片文件" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setQrStatus({ type: "error", text: "微信二维码图片需小于 5MB" });
      return;
    }
    setUploadingQr(true);
    setQrStatus({ type: "", text: "" });
    try {
      const response = await adminUploadWechatQr(file);
      const newUrl = response?.data?.url || response?.url || "";
      if (!newUrl) throw new Error("上传返回结果为空");
      setWechatQrUrl(newUrl);
      setWechatQrPreview(buildAssetUrl(newUrl, ""));
      setQrStatus({ type: "success", text: "微信二维码上传成功" });
    } catch (err) {
      setQrStatus({ type: "error", text: `微信二维码上传失败：${err.message}` });
    } finally {
      setUploadingQr(false);
      if (qrFileRef.current) qrFileRef.current.value = "";
    }
  };

  const handleQrDelete = async () => {
    setDeletingQr(true);
    setQrStatus({ type: "", text: "" });
    try {
      await adminDeleteWechatQr();
      setWechatQrUrl("");
      setWechatQrPreview("");
      setQrStatus({ type: "success", text: "微信二维码已删除" });
    } catch (err) {
      setQrStatus({ type: "error", text: `删除失败：${err.message}` });
    } finally {
      setDeletingQr(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword && !passwordVerified) {
      setStatus({ type: "error", text: "修改密码前请先验证原密码" });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        username: form.username,
        displayName: form.displayName,
        email: form.email || null,
        title: form.title,
        bio: form.bio,
        avatarUrl: form.avatarUrl,
        githubUrl: form.github,
      };
      if (form.newPassword) {
        payload.oldPassword = form.oldPassword;
        payload.newPassword = form.newPassword;
      }
      await updateProfile(payload);
      setStatus({ type: "success", text: "个人资料已更新" });
      setForm((prev) => ({ ...prev, oldPassword: "", newPassword: "" }));
      setPasswordVerified(false);
      setPasswordStatus({ type: "", text: "" });
    } catch (err) {
      setStatus({ type: "error", text: `保存失败：${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const pageClass = isDarkMode
    ? "home-redesign-surface is-dark bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_rgba(12,16,32,0.98)_42%,_rgba(4,7,18,1)_100%)] text-gray-100"
    : "home-redesign-surface bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.18),_rgba(248,250,255,0.98)_38%,_rgba(236,241,252,0.96)_100%)] text-slate-900";
  const cardClass = `home-ios-card home-ios-card--static ${isDarkMode ? "home-ios-card--dark" : ""} rounded-[30px] p-6 text-inherit`;
  const innerPanelClass = `home-ios-inner-card rounded-[24px] border ${
    isDarkMode ? "border-white/10 bg-white/[0.05]" : "border-white/80 bg-white/80"
  }`;
  const inputClass = `w-full px-4 py-3 rounded-2xl border font-medium backdrop-blur-xl transition-colors ${
    isDarkMode
      ? "border-white/10 bg-white/[0.05] text-gray-100 placeholder:text-gray-500 focus:border-sky-400/40"
      : "border-white/80 bg-white/80 text-slate-900 placeholder:text-slate-400 focus:border-indigo-300"
  }`;
  const profileTextareaScrollbarClass = isDarkMode ? 'sg-scrollbar sg-scrollbar-dark' : '';
  const accentButtonClass = `inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3 font-semibold backdrop-blur-xl transition-all duration-300 disabled:opacity-50 ${
    isDarkMode
      ? "border-sky-400/28 bg-sky-400/18 text-sky-100 hover:bg-sky-400/24"
      : "border-indigo-200 bg-indigo-500/14 text-indigo-700 hover:bg-indigo-500/20"
  }`;
  const pinkButtonClass = `inline-flex items-center justify-center gap-2 rounded-full border px-10 py-3 font-semibold backdrop-blur-xl transition-all duration-300 disabled:opacity-50 ${
    isDarkMode
      ? "border-fuchsia-400/28 bg-fuchsia-400/18 text-fuchsia-100 hover:bg-fuchsia-400/24"
      : "border-fuchsia-200 bg-fuchsia-500/14 text-fuchsia-700 hover:bg-fuchsia-500/20"
  }`;
  return (
    <div className={`p-6 md:p-10 ${pageClass}`}>
      <header className="mb-8 flex items-center gap-3">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border backdrop-blur-xl ${
          isDarkMode ? "border-white/12 bg-white/[0.08] text-white" : "border-white/80 bg-white/90 text-slate-900"
        }`}>
          <User />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight">个人资料管理</h1>
          <p className="text-sm text-slate-500 dark:text-gray-400">在此更新头像、基本信息及账户安全设置。</p>
        </div>
      </header>

      {status.text && (
        <div
          ref={statusRef}
          className={`mb-6 flex items-center gap-3 rounded-[24px] border p-4 backdrop-blur-xl ${
            status.type === "success"
              ? (isDarkMode ? "border-emerald-400/24 bg-emerald-500/12 text-emerald-100" : "border-emerald-200 bg-emerald-500/12 text-emerald-700")
              : (isDarkMode ? "border-red-400/24 bg-red-500/12 text-red-100" : "border-red-200 bg-red-500/12 text-red-700")
          }`}
        >
          {status.type === "success" ? <CheckCircle /> : <AlertTriangle />}
          <span className="font-semibold">{status.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className={cardClass}>
          <h2 className="text-lg font-black mb-4 flex items-center gap-2 text-[#FF0080]">
            <Image size={18} />
            头像设置
          </h2>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <div className={`w-32 h-32 rounded-full border overflow-hidden backdrop-blur-xl ${
                isDarkMode ? "border-white/12 bg-white/[0.08]" : "border-white/80 bg-white/90"
              }`}>
                {avatarPreview ? (
                  <ImageWithFallback src={avatarPreview} alt="头像预览" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <User size={48} />
                  </div>
                )}
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-white font-bold">
                  上传中...
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className={accentButtonClass}
              >
                {uploadingAvatar ? "上传中..." : "上传新头像"}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                支持 JPG、PNG、GIF，文件大小不超过 2MB。上传成功即保存。
              </p>
              {/*{form.avatarUrl && (*/}
              {/*  <p className="text-xs font-mono text-gray-500 break-all">当前路径：{form.avatarUrl}</p>*/}
              {/*)}*/}
            </div>
          </div>
        </section>

        {currentUser?.role === "SUPER_ADMIN" && (
        <section className={cardClass}>
          <h2 className="text-lg font-black mb-4 flex items-center gap-2 text-[#FF0080]">
            <QrCode size={18} />
            微信二维码
          </h2>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className={`w-32 h-32 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden backdrop-blur-xl ${
              isDarkMode ? "border-white/16 bg-white/[0.06]" : "border-slate-300 bg-white/70"
            }`}>
              {wechatQrPreview ? (
                <ImageWithFallback src={wechatQrPreview} alt="微信二维码预览" className="w-full h-full object-contain p-1" />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400 gap-1">
                  <QrCode size={36} />
                  <span className="text-[10px] font-bold">暂无</span>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <input ref={qrFileRef} type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                <button
                  type="button"
                  onClick={() => qrFileRef.current?.click()}
                  disabled={uploadingQr || deletingQr}
                  className={accentButtonClass}
                >
                  {uploadingQr ? "上传中..." : wechatQrUrl ? "替换二维码" : "上传二维码"}
                </button>
                {wechatQrUrl && (
                  <button
                    type="button"
                    onClick={handleQrDelete}
                    disabled={uploadingQr || deletingQr}
                    className="inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3 font-semibold backdrop-blur-xl transition-all duration-300 disabled:opacity-50 border-red-400/28 bg-red-500/14 text-red-600 hover:bg-red-500/20"
                  >
                    <Trash2 size={16} />
                    {deletingQr ? "删除中..." : "删除"}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                支持 PNG/JPG/WebP/GIF/AVIF，最大 5MB。上传后首页作者卡片将展示此二维码。
              </p>
            </div>
          </div>
          {qrStatus.text && (
            <div className={`mt-4 flex items-center gap-3 rounded-[24px] border p-3 backdrop-blur-xl ${
              qrStatus.type === "success"
                ? (isDarkMode ? "border-emerald-400/24 bg-emerald-500/12 text-emerald-100" : "border-emerald-200 bg-emerald-500/12 text-emerald-700")
                : (isDarkMode ? "border-red-400/24 bg-red-500/12 text-red-100" : "border-red-200 bg-red-500/12 text-red-700")
            }`}>
              {qrStatus.type === "success" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
              <span className="font-semibold text-sm">{qrStatus.text}</span>
            </div>
          )}
        </section>
        )}

        <section className={cardClass}>
          <h2 className="text-lg font-black mb-4 flex items-center gap-2 text-[#FF0080]">
            <FileText size={18} />
            基本信息
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <FieldLabel icon={User}>用户名</FieldLabel>
              <input className={`${inputClass} mt-2`} name="username" value={form.username} onChange={handleChange} required />
            </div>
            <div>
              <FieldLabel>显示名称</FieldLabel>
              <input className={`${inputClass} mt-2`} name="displayName" value={form.displayName} onChange={handleChange} />
            </div>
            <div>
              <FieldLabel icon={Mail}>邮箱</FieldLabel>
              <input className={`${inputClass} mt-2`} name="email" value={form.email} onChange={handleChange} />
            </div>
            <div>
              <FieldLabel>头衔 / Title</FieldLabel>
              <input className={`${inputClass} mt-2`} name="title" value={form.title} onChange={handleChange} />
            </div>
            <div>
              <FieldLabel icon={GithubIcon}>GitHub</FieldLabel>
              <input
                className={`${inputClass} mt-2`}
                name="github"
                value={form.github}
                autoComplete="url"
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="mt-6">
            <FieldLabel>个人简介</FieldLabel>
            <textarea className={`${inputClass} ${profileTextareaScrollbarClass} mt-2`} rows={4} name="bio" value={form.bio} onChange={handleChange} />
          </div>
        </section>

        <section className={cardClass}>
          <h2 className="text-lg font-black mb-4 flex items-center gap-2 text-[#FF0080]">
            <Lock size={18} />
            修改密码
          </h2>
          <div className={`${innerPanelClass} p-4`}>
            <p className="text-sm text-gray-600 dark:text-gray-300">更改密码前请先验证原密码，验证成功后即可输入新密码。</p>
          </div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <FieldLabel>原密码</FieldLabel>
              <div className="relative mt-2">
                <input
                  type={showOldPassword ? "text" : "password"}
                  name="oldPassword"
                  value={form.oldPassword}
                  onChange={handleChange}
                  autoComplete="current-password"
                  className={`${inputClass} pr-10`}
                  placeholder="请输入当前密码"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  onClick={() => setShowOldPassword((prev) => !prev)}
                >
                  {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleVerifyPassword}
                disabled={!form.oldPassword || passwordVerified || verifying}
                className={`w-full ${accentButtonClass}`}
              >
                {passwordVerified ? "已验证" : verifying ? "验证中..." : "验证原密码"}
              </button>
            </div>
          </div>
          {passwordStatus.text && (
            <p
              className={`mt-2 text-sm font-semibold ${
                passwordStatus.type === "error" ? "text-red-500" : "text-green-500"
              }`}
            >
              {passwordStatus.text}
            </p>
          )}
          {passwordVerified && (
            <div className="mt-4">
              <FieldLabel>新密码</FieldLabel>
              <div className="relative mt-2">
                <input
                  type={showPassword ? "text" : "password"}
                  name="newPassword"
                  value={form.newPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  className={`${inputClass} pr-10`}
                  placeholder="请输入新密码"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}
        </section>

        <section
          className={cardClass}
        >
          <h2 className="text-lg font-black mb-4 flex items-center gap-2 text-[#FF0080]">
            <Shield size={18} />
            只读信息
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoBadge label="角色" value={meta.role} isDarkMode={isDarkMode} />
            <InfoBadge label="用户 ID" value={meta.id} isDarkMode={isDarkMode} />
            <InfoBadge label="账号创建时间" value={meta.createdAt} isDarkMode={isDarkMode} />
            <InfoBadge label="上次登录时间" value={meta.lastLogin} isDarkMode={isDarkMode} />
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={pinkButtonClass}
          >
            {loading ? "保存中..." : "保存修改"}
          </button>
        </div>
      </form>
    </div>
  );
}







