import React, { useState } from 'react';
import { fetchLoginCaptcha } from "../../api";
import PopButton from "../../components/common/PopButton.jsx";
import { THEME, MOCK_USER } from "../shared.js";
import { Eye, EyeOff } from 'lucide-react';const LoginView = ({ setView, setUser, isDarkMode, doLogin }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [captchaRequired, setCaptchaRequired] = useState(false);
    const [captchaImage, setCaptchaImage] = useState("");
    const [captchaInput, setCaptchaInput] = useState("");
    const [captchaLoading, setCaptchaLoading] = useState(false);
    const [captchaNextAllowedAt, setCaptchaNextAllowedAt] = useState(0);
    const [remainingAttempts, setRemainingAttempts] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const sanitizeAscii = (value) => {
        if (!value) return "";
        return [...value].filter((ch) => {
            const code = ch.charCodeAt(0);
            return code >= 32 && code <= 126; // 可打印 ASCII
        }).join("");
    };

    const loadCaptcha = async (force = false) => {
        const now = Date.now();
        if (now < captchaNextAllowedAt) {
            const waitSeconds = Math.ceil((captchaNextAllowedAt - now) / 1000);
            setError(`刷新过快，请${waitSeconds}秒后再试`);
            return;
        }
        // 前端也跟随后端 5s 防刷节奏，避免自动获取后立刻手动刷新导致被后端限流
        setCaptchaNextAllowedAt(now + 5000);
        setCaptchaLoading(true);
        try {
            const res = await fetchLoginCaptcha(force);
            const data = res.data || res;
            setCaptchaImage(data?.imageBase64 || "");
            setCaptchaRequired(true);
            if (typeof data?.remainingAttempts === 'number') {
                setRemainingAttempts(data.remainingAttempts);
            }
        } catch (err) {
            setError(err.message || "获取验证码失败");
            // 若非后端速率限制类错误，允许立刻重试
            if (!/(过于频繁|too frequent)/.test(err.message || "")) {
                setCaptchaNextAllowedAt(Date.now());
            }
        } finally {
            setCaptchaLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setRemainingAttempts(null);
        const nameLen = username.length;
        const passLen = password.length;
        if (nameLen < 3 || nameLen > 32) {
            setError("用户名长度需在 3-32 之间");
            return;
        }
        if (passLen < 6 || passLen > 64) {
            setError("密码长度需在 6-64 之间");
            return;
        }
        if (captchaRequired && captchaInput.length === 0) {
            setError("请输入验证码");
            return;
        }
        setLoading(true);
        try {
            if (doLogin) {
                const res = await doLogin(username, password, captchaRequired ? captchaInput : undefined);
                if (res?.user) setUser(res.user);
            } else {
                setUser(MOCK_USER);
            }
            setView('home');
            setCaptchaInput("");
            setCaptchaImage("");
            setCaptchaRequired(false);
            setRemainingAttempts(null);
        } catch (err) {
            setError(err.message || "\u767b\u5f55\u5931\u8d25");
            const needCaptcha = err.payload?.data?.captchaRequired;
            const remain = err.payload?.data?.remainingAttempts;
            if (typeof remain === 'number') {
                setRemainingAttempts(remain);
            }
            if (needCaptcha) {
                await loadCaptcha();
            }
        } finally {
            setLoading(false);
        }
    };
    const bg = isDarkMode ? THEME.colors.bgDark : 'bg-gray-100';
    const surface = isDarkMode ? THEME.colors.surfaceDark : THEME.colors.surfaceLight;
    const text = isDarkMode ? 'text-gray-100' : 'text-gray-800';
    const inputBg = isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-black';

    return (
        <div className={`h-screen flex items-center justify-center ${bg} ${text}`}>
            <div className={`${surface} p-8 rounded-none border-4 border-black shadow-[8px_8px_0px_0px_#000] w-96`}>
                <h2 className="text-3xl font-black mb-6 text-center uppercase italic">系统登录</h2>
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="font-bold text-sm uppercase">用户名</label>
                        <input
                            className={`w-full border-2 border-black p-3 font-bold outline-none focus:shadow-[4px_4px_0px_0px_#FFD700] transition-shadow ${inputBg}`}
                            pattern="[ -~]*"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => {
                                const safe = sanitizeAscii(e.target.value);
                                setUsername(safe);
                                if (safe !== e.target.value) setError("用户名仅支持英文、数字与常见符号。");
                            }}
                            placeholder="请输入用户名"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="font-bold text-sm uppercase">密码</label>
                        <div className="relative">
                            <input
                                className={`w-full border-2 border-black p-3 pr-16 font-bold outline-none focus:shadow-[4px_4px_0px_0px_#FFD700] transition-shadow ${inputBg}`}
                                type={showPassword ? "text" : "password"}
                                pattern="[ -~]*"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => {
                                    const safe = sanitizeAscii(e.target.value);
                                    setPassword(safe);
                                    if (safe !== e.target.value) setError("密码仅支持英文、数字与常见符号。");
                                }}
                                placeholder="请输入密码"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className={`absolute inset-y-0 right-3 my-auto h-9 w-10 inline-flex items-center justify-center border-2 active:translate-y-0.5 transition ${isDarkMode
                                    ? 'border-gray-300 bg-gray-800 text-gray-100 hover:bg-gray-700'
                                    : 'border-black bg-white text-black hover:bg-gray-100'}`}
                                aria-label={showPassword ? '隐藏密码' : '显示密码'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    {captchaRequired && (
                        <div className="space-y-2">
                            <label className="font-bold text-sm uppercase">验证码</label>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    {captchaImage && (
                                        <img
                                            src={captchaImage}
                                            alt="captcha"
                                            className="h-14 w-32 border-2 border-black object-contain cursor-pointer select-none"
                                            onClick={() => loadCaptcha(true)}
                                            onError={() => {
                                                setCaptchaImage("");
                                                setError("验证码加载失败，请点击重新获取或稍后再试");
                                            }}
                                            title={captchaLoading ? '加载中…' : '点击刷新验证码'}
                                        />
                                    )}
                                    {!captchaImage && (
                                        <button
                                            type="button"
                                            onClick={() => loadCaptcha(true)}
                                            className={`px-3 py-2 border-2 border-dashed text-sm font-bold ${isDarkMode ? 'border-gray-200 bg-gray-800 text-gray-100' : 'border-black bg-white text-black'}`}
                                            disabled={captchaLoading}
                                        >
                                            {captchaLoading ? '加载中' : '获取验证码'}
                                        </button>
                                    )}
                                    {typeof remainingAttempts === 'number' && remainingAttempts > 0 && (
                                        <span className="text-xs font-bold text-red-600">
                                            剩余尝试：{remainingAttempts}
                                        </span>
                                    )}
                                    {typeof remainingAttempts === 'number' && remainingAttempts <= 0 && (
                                        <span className="text-xs font-bold text-amber-600">
                                            已触发验证码，请先完成图形验证
                                        </span>
                                    )}
                                </div>
                                <input
                                    className={`w-full border-2 border-black p-3 font-bold outline-none focus:shadow-[4px_4px_0px_0px_#FFD700] transition-shadow ${inputBg}`}
                                    autoComplete="one-time-code"
                                    value={captchaInput}
                                    onChange={(e) => setCaptchaInput(sanitizeAscii(e.target.value).slice(0, 4))}
                                    placeholder="请输入验证码"
                                />
                            </div>
                        </div>
                    )}
                    {error && <div
                        className="bg-red-500 text-white p-2 font-bold text-sm border-2 border-black">{error}</div>}
                    <div className="flex gap-4">
                        <PopButton
                            variant="primary"
                            className="flex-1 max-w-[160px] justify-center whitespace-nowrap px-4 py-2 text-sm"
                            disabled={loading}
                        >
                            {loading ? '登录中...' : '登录'}
                        </PopButton>
                        <PopButton
                            variant="ghost"
                            type="button"
                            onClick={() => setView('home')}
                            className="min-w-[90px] justify-center whitespace-nowrap px-4 py-2 text-sm"
                        >
                            取消
                        </PopButton>
                    </div>
                </form>
            </div>
        </div>
    );
};



































export default LoginView;
