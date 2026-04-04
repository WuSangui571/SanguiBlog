import React, { useState } from 'react';
import { fetchLoginCaptcha } from "../../api";
import { useLayoutOffsets } from "../../contexts/LayoutOffsetContext.jsx";
import { MOCK_USER } from "../shared.js";
import { Eye, EyeOff } from 'lucide-react';

const LoginView = ({ setView, setUser, isDarkMode, doLogin }) => {
    const { headerHeight } = useLayoutOffsets();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const usernameComposingRef = React.useRef(false);
    const passwordComposingRef = React.useRef(false);
    const [showPassword, setShowPassword] = useState(false);
    const [captchaRequired, setCaptchaRequired] = useState(false);
    const [captchaImage, setCaptchaImage] = useState("");
    const [captchaInput, setCaptchaInput] = useState("");
    const [captchaLoading, setCaptchaLoading] = useState(false);
    const [captchaNextAllowedAt, setCaptchaNextAllowedAt] = useState(0);
    const [remainingAttempts, setRemainingAttempts] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const normalizeAscii = (value) => {
        if (!value) return "";
        const normalized = [];
        for (const ch of value) {
            const code = ch.charCodeAt(0);
            if (code === 0x3000) {
                normalized.push(' ');
                continue;
            }
            if (code >= 0xFF01 && code <= 0xFF5E) {
                normalized.push(String.fromCharCode(code - 0xFEE0));
                continue;
            }
            if (code >= 32 && code <= 126) {
                normalized.push(ch);
            }
        }
        return normalized.join("");
    };

    const hasInvalidAscii = (value) => {
        if (!value) return false;
        for (const ch of value) {
            const code = ch.charCodeAt(0);
            if (code === 0x3000) continue;
            if (code >= 0xFF01 && code <= 0xFF5E) continue;
            if (code >= 32 && code <= 126) continue;
            return true;
        }
        return false;
    };

    const loadCaptcha = async (force = false) => {
        const now = Date.now();
        if (now < captchaNextAllowedAt) {
            const waitSeconds = Math.ceil((captchaNextAllowedAt - now) / 1000);
            setError(`刷新过快，请${waitSeconds}秒后再试`);
            return;
        }
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
        if (nameLen === 0) {
            setError("请输入用户名");
            return;
        }
        if (nameLen < 3 || nameLen > 32) {
            setError("用户名长度需在 3-32 之间");
            return;
        }
        if (passLen === 0) {
            setError("请输入密码");
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
            setError(err.message || "登录失败");
            const needCaptcha = err.payload?.data?.captchaRequired;
            const remain = err.payload?.data?.remainingAttempts;
            if (typeof remain === 'number') {
                setRemainingAttempts(remain);
            }
            if (needCaptcha || captchaRequired) {
                setCaptchaInput("");
                await loadCaptcha(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const bg = isDarkMode ? 'bg-[#050505]' : 'bg-[#f8f8fa]';
    const text = isDarkMode ? 'text-gray-100' : 'text-gray-800';
    const pageThemeClass = `home-redesign-surface ${isDarkMode ? 'is-dark' : ''}`;
    const panelClass = `home-ios-card ${isDarkMode ? 'home-ios-card--dark' : ''} w-96 max-w-[92vw] p-8`;
    const inputClass = `w-full p-3 rounded-xl border outline-none transition-shadow ${isDarkMode ? 'bg-gray-800/70 text-white border-white/18' : 'bg-white/70 text-black border-white/75'} focus:shadow-[0_12px_22px_rgba(99,102,241,0.22)]`;
    const iconBtnClass = `absolute inset-y-0 right-3 my-auto h-9 w-10 inline-flex items-center justify-center rounded-xl border transition ${isDarkMode ? 'border-white/18 bg-white/10 text-gray-100 hover:bg-white/18' : 'border-black/10 bg-white/75 text-black hover:bg-white'}`;
    const primaryBtnClass = `flex-1 max-w-[160px] inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-black rounded-xl border transition ${isDarkMode ? 'border-white/14 bg-[linear-gradient(180deg,rgba(255,215,0,0.34),rgba(255,196,0,0.2))] text-white hover:bg-[linear-gradient(180deg,rgba(255,215,0,0.42),rgba(255,196,0,0.28))]' : 'border-[#d9a200]/28 bg-[linear-gradient(180deg,rgba(255,232,145,0.92),rgba(255,217,92,0.72))] text-black hover:bg-[linear-gradient(180deg,rgba(255,236,165,0.96),rgba(255,220,110,0.82))]'}`;
    const secondaryBtnClass = `min-w-[90px] inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-black rounded-xl border transition ${isDarkMode ? 'border-white/16 bg-white/8 text-gray-100 hover:bg-white/16' : 'border-black/10 bg-white/72 text-black hover:bg-white/90'}`;
    const errorClass = isDarkMode ? 'bg-red-500/85 text-white border-white/20' : 'bg-red-500 text-white border-black/15';
    const captchaHintClass = isDarkMode ? 'text-amber-300' : 'text-amber-700';

    return (
        <div
            className={`flex items-center justify-center ${bg} ${text} ${pageThemeClass}`}
            style={{ minHeight: `max(0px, calc(100vh - ${headerHeight || 0}px))` }}
        >
            <div className={panelClass}>
                <h2 className="text-3xl font-black mb-6 text-center uppercase italic">系统登录</h2>
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="font-bold text-sm uppercase">用户名</label>
                        <input
                            className={`${inputClass} font-bold`}
                            pattern="[ -~]*"
                            autoComplete="username"
                            inputMode="text"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            value={username}
                            onChange={(e) => {
                                const raw = e.target.value;
                                if (usernameComposingRef.current) {
                                    setUsername(raw);
                                    return;
                                }
                                const safe = normalizeAscii(raw);
                                setUsername(safe);
                                if (hasInvalidAscii(raw)) setError("用户名仅支持英文、数字与常见符号。");
                            }}
                            onCompositionStart={() => {
                                usernameComposingRef.current = true;
                            }}
                            onCompositionEnd={(e) => {
                                usernameComposingRef.current = false;
                                const raw = e.target.value;
                                const safe = normalizeAscii(raw);
                                setUsername(safe);
                                if (hasInvalidAscii(raw)) setError("用户名仅支持英文、数字与常见符号。");
                            }}
                            placeholder="请输入用户名"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="font-bold text-sm uppercase">密码</label>
                        <div className="relative">
                            <input
                                className={`${inputClass} pr-16 font-bold`}
                                type={showPassword ? "text" : "password"}
                                pattern="[ -~]*"
                                autoComplete="current-password"
                                inputMode="text"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                value={password}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    if (passwordComposingRef.current) {
                                        setPassword(raw);
                                        return;
                                    }
                                    const safe = normalizeAscii(raw);
                                    setPassword(safe);
                                    if (hasInvalidAscii(raw)) setError("密码仅支持英文、数字与常见符号。");
                                }}
                                onCompositionStart={() => {
                                    passwordComposingRef.current = true;
                                }}
                                onCompositionEnd={(e) => {
                                    passwordComposingRef.current = false;
                                    const raw = e.target.value;
                                    const safe = normalizeAscii(raw);
                                    setPassword(safe);
                                    if (hasInvalidAscii(raw)) setError("密码仅支持英文、数字与常见符号。");
                                }}
                                placeholder="请输入密码"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className={iconBtnClass}
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
                                            className={`h-14 w-32 border rounded-xl object-contain cursor-pointer select-none ${isDarkMode ? 'border-white/25 bg-black/25' : 'border-black/15 bg-white/75'}`}
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
                                            className={`px-3 py-2 border text-sm font-bold rounded-xl ${isDarkMode ? 'border-white/24 bg-white/8 text-gray-100' : 'border-black/15 bg-white/72 text-black'}`}
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
                                        <span className={`text-xs font-bold ${captchaHintClass}`}>
                                            已触发验证码，请先完成图形验证
                                        </span>
                                    )}
                                </div>
                                <input
                                    className={`${inputClass} font-bold`}
                                    autoComplete="one-time-code"
                                    value={captchaInput}
                                    onChange={(e) => setCaptchaInput(normalizeAscii(e.target.value).slice(0, 4))}
                                    placeholder="请输入验证码"
                                />
                            </div>
                        </div>
                    )}
                    {error && <div className={`p-2 font-bold text-sm border rounded-xl ${errorClass}`}>{error}</div>}
                    <div className="flex gap-4">
                        <button type="submit" className={primaryBtnClass} disabled={loading}>
                            {loading ? '登录中...' : '登录'}
                        </button>
                        <button type="button" onClick={() => setView('home')} className={secondaryBtnClass}>
                            取消
                        </button>
                    </div>
                    <div className={`border-t pt-4 ${isDarkMode ? 'border-white/14' : 'border-black/12'}`}>
                        <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>没有账号？</p>
                        <button
                            type="button"
                            onClick={() => setView('register')}
                            className={`mt-2 text-sm font-black underline underline-offset-4 ${isDarkMode ? 'text-white' : 'text-black'}`}
                        >
                            去注册
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginView;
