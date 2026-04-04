import React, { useState } from 'react';
import { PenTool, User } from 'lucide-react';
import { usePermissionContext } from '../../contexts/PermissionContext.jsx';
import PopButton from '../common/PopButton.jsx';
import { buildAssetUrl } from '../../utils/asset.js';

const CommentsSection = ({
    list = [],
    isDarkMode,
    onSubmit,
    currentUser,
    setView,
    onDeleteComment,
    onUpdateComment,
    postAuthorName
}) => {
    const { hasPermission } = usePermissionContext();
    const [content, setContent] = useState('');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [replyTarget, setReplyTarget] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const canReviewComments = currentUser ? hasPermission('COMMENT_REVIEW') : false;
    const canDeleteComments = currentUser ? hasPermission('COMMENT_DELETE') : false;

    const inputBg = isDarkMode ? 'bg-[#0F172A]/70 text-white border-white/10' : 'bg-white/72 text-black border-black/10';
    const commentBg = isDarkMode ? 'bg-[#0F172A]/62 text-gray-300 border-white/10' : 'bg-white/68 text-black border-black/10';
    const glassCard = `home-ios-card ${isDarkMode ? 'home-ios-card--dark' : ''}`;
    const glassInner = `home-ios-inner-card ${isDarkMode ? 'bg-[#0F172A]/62 text-gray-100 border-white/10' : 'bg-white/60 text-black border-black/10'}`;
    const softButton = isDarkMode
        ? 'border-white/14 bg-white/10 text-white hover:bg-white/16'
        : 'border-black/10 bg-white/78 text-black hover:bg-white/92';
    const accentButton = isDarkMode
        ? 'border-white/14 bg-[#FFD700]/88 text-black hover:bg-[#FFE27A]'
        : 'border-white/60 bg-[#FFD700]/92 text-black hover:bg-[#FFE27A]';
    const actionButtonBase = 'px-4 py-3 rounded-2xl border text-sm font-black inline-flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5';
    const primaryActionButton = `${actionButtonBase} ${accentButton}`;
    const secondaryActionButton = `${actionButtonBase} ${softButton}`;
    const resolvedAuthorName = currentUser?.displayName || currentUser?.nickname || currentUser?.username || '访客';
    const resolvedAvatar = currentUser?.avatarUrl || currentUser?.avatar;
    const normalizedList = Array.isArray(list) ? list : [];

    const countAll = (items = []) => items.reduce((sum, item) => sum + 1 + countAll(item.replies || []), 0);
    const totalComments = countAll(normalizedList);

    const getAvatarSrc = (avatarPath) => buildAssetUrl(avatarPath);

    const handleSubmit = () => {
        if (!content.trim()) return;
        onSubmit && onSubmit({
            authorName: resolvedAuthorName,
            avatarUrl: resolvedAvatar,
            content: content.trim(),
        });
        setContent('');
    };

    const handleReplySubmit = () => {
        if (!replyTarget || !replyContent.trim()) return;
        const trimmed = replyContent.trim();
        const targetComment = replyTarget.comment || {};
        const replyDepth = replyTarget.depth || 0;
        const baseParentId = replyDepth >= 1
            ? (targetComment.parentId || targetComment.parentCommentId || targetComment.parent_id || targetComment.id)
            : targetComment.id;
        const mentionName = targetComment.authorName || targetComment.user || 'Ta';
        const prefix = replyDepth >= 1 ? `@${mentionName}：` : '';
        const payload = {
            authorName: resolvedAuthorName,
            avatarUrl: resolvedAvatar,
            content: `${prefix}${trimmed}`,
        };
        if (baseParentId) {
            payload.parentId = baseParentId;
        }
        onSubmit && onSubmit(payload);
        setReplyContent('');
        setReplyTarget(null);
    };

    const renderComment = (comment, depth = 0) => {
        const replies = Array.isArray(comment.replies) ? comment.replies : [];
        const avatarSrc = getAvatarSrc(comment.avatar);
        const isReplying = replyTarget?.comment?.id === comment.id;
        const canReply = depth < 2;
        const isOwnComment = currentUser && comment.userId === currentUser.id;
        const allowEdit = currentUser && (isOwnComment || canReviewComments);
        const allowDelete = currentUser && (isOwnComment || canDeleteComments);
        const visualDepth = depth > 0 ? 1 : 0;
        const displayAuthor = comment.authorName || comment.user || '匿名用户';

        return (
            <div
                id={comment.id ? `comment-${comment.id}` : undefined}
                key={comment.id || `${depth}-${displayAuthor}`}
                className={`flex gap-4 ${visualDepth > 0 ? `ml-8 border-l pl-6 ${isDarkMode ? 'border-white/10' : 'border-black/10'}` : ''}`}
            >
                <div
                    className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center font-bold overflow-hidden border ${isDarkMode ? 'border-white/12 bg-white/10 text-white' : 'border-black/10 bg-white/78 text-black'}`}
                >
                    {avatarSrc ? (
                        <img src={avatarSrc} alt={displayAuthor} className="w-full h-full object-cover" />
                    ) : (
                        displayAuthor.toString().slice(0, 2)
                    )}
                </div>
                <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                        <span className="font-black text-lg">{displayAuthor}</span>
                        {postAuthorName && displayAuthor === postAuthorName && (
                            <span
                                className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-black border rounded-full ${isDarkMode ? 'border-white/12 bg-[#FF0080]/70 text-white' : 'border-white/60 bg-[#FFD700]/92 text-black'}`}
                            >
                                <PenTool size={10} strokeWidth={3} />
                                博主
                            </span>
                        )}
                        <span className="text-xs font-bold text-gray-500">{comment.time || ''}</span>
                        <div className="ml-auto flex gap-2 flex-wrap">
                            {currentUser && canReply && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setReplyTarget({ comment, depth });
                                        setReplyContent('');
                                    }}
                                    className={`text-xs font-bold px-2 py-1 border rounded-xl transition-colors ${softButton}`}
                                >
                                    回复
                                </button>
                            )}
                            {currentUser && allowEdit && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingCommentId(comment.id);
                                        setEditContent(comment.content || comment.text || '');
                                    }}
                                    className={`text-xs font-bold px-2 py-1 border rounded-xl transition-colors ${softButton}`}
                                >
                                    编辑
                                </button>
                            )}
                            {currentUser && allowDelete && (
                                <button
                                    type="button"
                                    onClick={() => setDeleteConfirm(comment.id)}
                                    className={`text-xs font-bold px-2 py-1 border rounded-xl transition-colors ${softButton}`}
                                >
                                    删除
                                </button>
                            )}
                        </div>
                    </div>

                    {editingCommentId === comment.id ? (
                        <div className={`${glassInner} p-4 rounded-2xl space-y-2`}>
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className={`w-full p-3 rounded-2xl border font-bold focus:outline-none ${inputBg}`}
                                rows={3}
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onUpdateComment && onUpdateComment(comment.id, editContent);
                                        setEditingCommentId(null);
                                    }}
                                    className={`px-3 py-1 font-bold rounded-xl border ${accentButton}`}
                                >
                                    保存
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingCommentId(null)}
                                    className={`px-3 py-1 font-bold rounded-xl border ${softButton}`}
                                >
                                    取消
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={`${glassInner} ${commentBg} p-4`}>
                            <p className="font-medium">{comment.content || comment.text}</p>
                        </div>
                    )}

                    {deleteConfirm === comment.id && (
                        <div className={`mt-2 p-3 rounded-2xl border ${isDarkMode ? 'border-red-400/40 bg-red-500/10' : 'border-red-300 bg-red-50/90'}`}>
                            <p className="font-bold text-sm mb-2">确认删除这条评论？</p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onDeleteComment && onDeleteComment(comment.id);
                                        setDeleteConfirm(null);
                                    }}
                                    className="px-3 py-1 bg-red-500 text-white font-bold border border-red-400 rounded-xl text-xs"
                                >
                                    确认删除
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDeleteConfirm(null)}
                                    className={`px-3 py-1 font-bold border rounded-xl text-xs ${softButton}`}
                                >
                                    取消
                                </button>
                            </div>
                        </div>
                    )}

                    {isReplying && currentUser && (
                        <div className={`mt-4 p-4 rounded-2xl ${glassInner}`}>
                            <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                className={`w-full p-3 rounded-2xl border font-bold focus:outline-none min-h-[100px] ${inputBg}`}
                                placeholder={`回复 ${displayAuthor}...`}
                            />
                            <div className="flex gap-2 mt-2">
                                <PopButton onClick={handleReplySubmit}>发送回复</PopButton>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setReplyTarget(null);
                                        setReplyContent('');
                                    }}
                                    className={`px-3 py-1 border font-bold rounded-xl transition-colors ${softButton}`}
                                >
                                    取消
                                </button>
                            </div>
                        </div>
                    )}

                    {replies.length > 0 && (
                        <div className="mt-4 space-y-4">
                            {replies.map((reply) => renderComment(reply, depth + 1))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={`mt-16 ${glassCard} ${isDarkMode ? 'bg-[#0F172A]/46' : 'bg-white/42'} p-6 md:p-8`}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-2xl font-black">评论 {totalComments > 0 ? `(${totalComments})` : ''}</h3>
                    {!currentUser && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <User size={12} />
                            <span>登录后可解锁更多互动能力</span>
                        </p>
                    )}
                </div>
                {!currentUser && (
                    <PopButton onClick={() => setView && setView('login')} icon={User}>
                        前往登录
                    </PopButton>
                )}
            </div>

            <div className="space-y-4 mb-8">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className={`w-full p-4 rounded-2xl border font-bold focus:outline-none min-h-[140px] ${inputBg}`}
                    placeholder="写点什么…"
                />
                <div className={`flex flex-wrap gap-3 rounded-2xl ${glassInner} p-3`}>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className={primaryActionButton}
                    >
                        发布评论
                    </button>
                    {currentUser && (
                        <button
                            type="button"
                            onClick={() => setView && setView('admin')}
                            className={secondaryActionButton}
                        >
                            后台管理
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-8">
                {normalizedList.map((comment) => renderComment(comment))}
            </div>
        </div>
    );
};

export default CommentsSection;