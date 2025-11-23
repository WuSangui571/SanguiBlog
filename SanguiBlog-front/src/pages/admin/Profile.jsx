import React, { useState, useEffect, useRef } from 'react';
import { useBlog } from '../../hooks/useBlogData';
import { updateProfile, uploadAvatar } from '../../api';
import { Eye, EyeOff, User, Mail, Lock, FileText, Image, Shield, Calendar, CheckCircle, Upload, Github as GithubIcon } from 'lucide-react';

export default function Profile() {
    const { user: currentUser } = useBlog();
    const [loading, setLoading] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [validatingPassword, setValidatingPassword] = useState(false);
    const [passwordVerified, setPasswordVerified] = useState(false);
    const [message, setMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState('');
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        username: '',
        displayName: '',
        email: '',
        oldPassword: '',
        newPassword: '',
        bio: '',
        title: '',
        avatarUrl: '',
        github: '',
        wechatQr: ''
    });

    // 只读字段
    const [readonlyData, setReadonlyData] = useState({
        role: ''
    });

    useEffect(() => {
        console.log('Current user data:', currentUser);

        if (currentUser) {
            setFormData({
                username: currentUser.username || '',
                displayName: currentUser.displayName || currentUser.display_name || '',
                email: currentUser.email || '',
                oldPassword: '',
                newPassword: '',
                bio: currentUser.bio || '',
                title: currentUser.title || '',
                avatarUrl: currentUser.avatar || currentUser.avatarUrl || currentUser.avatar_url || '',
                github: currentUser.github || '',
                wechatQr: currentUser.wechatQr || currentUser.wechat_qr || ''
            });

            setReadonlyData({
                role: getRoleName(currentUser.role || currentUser.roleId || currentUser.role_id)
            });

            // 设置头像预览
            const avatarPath = currentUser.avatar || currentUser.avatarUrl || currentUser.avatar_url;
            if (avatarPath) {
                const fullAvatarUrl = avatarPath.startsWith('http')
                    ? avatarPath
                    : `http://localhost:8080${avatarPath}`;
                setAvatarPreview(fullAvatarUrl);
            }
        }
    }, [currentUser]);

    const getRoleName = (role) => {
        const roleMap = {
            'SUPER_ADMIN': '超级管理员',
            'ADMIN': '管理员',
            'USER': '普通用户',
            1: '超级管理员',
            2: '管理员',
            3: '普通用户'
        };
        return roleMap[role] || role || '未知';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMessage('请选择图片文件');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setMessage('图片大小不能超过 2MB');
            return;
        }

        setUploadingAvatar(true);
        setMessage('');

        try {
            console.log('Uploading avatar...');
            const response = await uploadAvatar(file);
            console.log('Upload response:', response);

            const newAvatarUrl = response.avatar || response.avatarUrl || response.avatar_url || response.path || response.data?.avatar;
            setFormData(prev => ({
                ...prev,
                avatarUrl: newAvatarUrl
            }));

            const fullAvatarUrl = newAvatarUrl.startsWith('http')
                ? newAvatarUrl
                : `http://localhost:8080${newAvatarUrl}`;
            setAvatarPreview(fullAvatarUrl);

            setMessage('头像上传成功！');
        } catch (error) {
            console.error('Avatar upload error:', error);
            setMessage('头像上传失败：' + error.message);
        } finally {
            setUploadingAvatar(false);
        }
    };

    // 验证原密码
    const handleVerifyPassword = async () => {
        if (!formData.oldPassword) {
            setMessage('请先输入原密码');
            return;
        }

        setValidatingPassword(true);
        setMessage('');

        try {
            // 通过尝试更新一个空payload来验证密码
            await updateProfile({
                old_password: formData.oldPassword,
                verify_only: true  // 告诉后端这只是验证
            });

            setPasswordVerified(true);
            setMessage('原密码验证成功！现在可以输入新密码');
        } catch (error) {
            setMessage('原密码验证失败：' + error.message);
            setPasswordVerified(false);
        } finally {
            setValidatingPassword(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        // 如果要修改密码，必须先验证原密码
        if (formData.newPassword) {
            if (!passwordVerified) {
                setMessage('请先验证原密码');
                setLoading(false);
                return;
            }
        }

        try {
            const payload = {
                username: formData.username,
                display_name: formData.displayName,
                bio: formData.bio,
                title: formData.title,
                avatar: formData.avatarUrl,
                github: formData.github,
                wechat_qr: formData.wechatQr
            };

            // 只在有邮箱时才发送
            if (formData.email) {
                payload.email = formData.email;
            }

            // 如果要修改密码
            if (formData.newPassword && passwordVerified) {
                payload.old_password = formData.oldPassword;
                payload.new_password = formData.newPassword;
            }

            console.log('Submitting payload:', payload);
            await updateProfile(payload);
            setMessage('个人资料更新成功！');

            // 清空密码字段和验证状态
            setFormData(prev => ({ ...prev, oldPassword: '', newPassword: '' }));
            setPasswordVerified(false);
        } catch (error) {
            console.error('Update error:', error);
            setMessage('更新失败：' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full p-3 border-2 border-gray-300 rounded focus:outline-none focus:border-[#6366F1] transition-all";
    const readonlyInputClass = "w-full p-3 border-2 border-gray-200 rounded bg-gray-50 text-gray-600 cursor-not-allowed";

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-black mb-2 flex items-center gap-2">
                    <User className="text-[#6366F1]" />
                    个人资料管理
                </h1>
                <p className="text-gray-600">管理您的个人信息和账户设置</p>
            </div>

            {!currentUser && (
                <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-500 rounded">
                    <p className="font-bold text-yellow-800">警告：未检测到用户数据</p>
                    <p className="text-sm text-yellow-700">请确保已登录并刷新页面</p>
                </div>
            )}

            {message && (
                <div className={`p-4 mb-6 rounded-lg border-2 ${message.includes('成功') ? 'bg-green-50 border-green-500 text-green-800' : 'bg-red-50 border-red-500 text-red-800'}`}>
                    <div className="flex items-center gap-2">
                        {message.includes('成功') ? <CheckCircle size={20} /> : null}
                        <span className="font-semibold">{message}</span>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* 头像上传区域 */}
                <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-black">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#FF0080]">
                        <Image size={20} />
                        头像
                    </h2>
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full border-4 border-black overflow-hidden bg-gray-200">
                                {avatarPreview ? (
                                    <img
                                        src={avatarPreview}
                                        alt="Avatar Preview"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            console.error('Image load error');
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <User size={48} />
                                    </div>
                                )}
                            </div>
                            {uploadingAvatar && (
                                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                                    <div className="text-white text-sm font-bold">上传中...</div>
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={handleAvatarClick}
                                disabled={uploadingAvatar}
                                className="px-6 py-3 bg-[#6366F1] text-white font-bold border-2 border-black rounded hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Upload size={20} />
                                {uploadingAvatar ? '上传中...' : '上传头像'}
                            </button>
                            <p className="text-xs text-gray-500 mt-2">
                                支持 JPG、PNG、GIF 格式，文件大小不超过 2MB
                            </p>
                            {formData.avatarUrl && (
                                <p className="text-xs text-gray-600 mt-2 font-mono bg-gray-100 p-2 rounded">
                                    当前路径: {formData.avatarUrl}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 基本信息 */}
                <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-black">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#FF0080]">
                        <FileText size={20} />
                        基本信息
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold mb-2 flex items-center gap-1">
                                <User size={16} />
                                用户名 (Username) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                className={inputClass}
                                placeholder="请输入用户名"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">显示名称 (Display Name)</label>
                            <input
                                type="text"
                                name="displayName"
                                value={formData.displayName}
                                onChange={handleChange}
                                className={inputClass}
                                placeholder="请输入显示名称"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 flex items-center gap-1">
                                <Mail size={16} />
                                邮箱 (Email)
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={inputClass}
                                placeholder="请输入邮箱地址（可选）"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">职位/头衔 (Title)</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className={inputClass}
                                placeholder="例如：全栈开发工程师"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 flex items-center gap-1">
                                <GithubIcon size={16} />
                                GitHub 链接
                            </label>
                            <input
                                type="url"
                                name="github"
                                value={formData.github}
                                onChange={handleChange}
                                className={inputClass}
                                placeholder="https://github.com/username"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">微信二维码链接</label>
                            <input
                                type="url"
                                name="wechatQr"
                                value={formData.wechatQr}
                                onChange={handleChange}
                                className={inputClass}
                                placeholder="微信二维码图片URL"
                            />
                        </div>
                    </div>

                    <div className="mt-6">
                        <label className="block text-sm font-bold mb-2">个人简介 (Bio)</label>
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            rows="4"
                            className={inputClass}
                            placeholder="介绍一下您自己..."
                        />
                    </div>
                </div>

                {/* 密码修改 */}
                <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-black">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#FF0080]">
                        <Lock size={20} />
                        修改密码
                    </h2>
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
                        <p className="text-sm text-yellow-800">
                            <strong>注意：</strong>修改密码需要先验证原密码。如果不需要修改密码，请保持密码字段为空。
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-bold mb-2">原密码 (Old Password)</label>
                                <div className="relative">
                                    <input
                                        type={showOldPassword ? "text" : "password"}
                                        name="oldPassword"
                                        value={formData.oldPassword}
                                        onChange={(e) => {
                                            handleChange(e);
                                            setPasswordVerified(false); // 改变密码时重置验证状态
                                        }}
                                        disabled={passwordVerified}
                                        className={`${inputClass} pr-10 ${passwordVerified ? 'bg-green-50' : ''}`}
                                        placeholder="请输入原密码"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowOldPassword(!showOldPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showOldPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-end">
                                <button
                                    type="button"
                                    onClick={handleVerifyPassword}
                                    disabled={validatingPassword || passwordVerified || !formData.oldPassword}
                                    className={`px-6 py-3 font-bold border-2 border-black rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed ${passwordVerified
                                            ? 'bg-green-500 text-white'
                                            : 'bg-[#FFD700] text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                                        }`}
                                >
                                    {validatingPassword ? '验证中...' : passwordVerified ? '✓ 已验证' : '验证密码'}
                                </button>
                            </div>
                        </div>

                        {passwordVerified && (
                            <div>
                                <label className="block text-sm font-bold mb-2">新密码 (New Password)</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="newPassword"
                                        value={formData.newPassword}
                                        onChange={handleChange}
                                        className={inputClass + " pr-10"}
                                        placeholder="请输入新密码"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 只读信息 */}
                <div className="bg-gray-50 p-6 rounded-lg shadow-lg border-2 border-gray-300">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-700">
                        <Shield size={20} />
                        账户信息（只读）
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold mb-2 text-gray-600">角色 (Role)</label>
                            <input
                                type="text"
                                value={readonlyData.role}
                                readOnly
                                className={readonlyInputClass}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 text-gray-600">用户ID</label>
                            <input
                                type="text"
                                value={currentUser?.id || '-'}
                                readOnly
                                className={readonlyInputClass}
                            />
                        </div>
                    </div>
                </div>

                {/* 提交按钮 */}
                <div className="flex justify-end gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 bg-[#FF0080] text-white font-black border-2 border-black rounded hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? '保存中...' : '保存修改'}
                    </button>
                </div>
            </form>
        </div>
    );
}
