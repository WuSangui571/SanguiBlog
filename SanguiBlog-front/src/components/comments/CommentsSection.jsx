import React, {useState} from 'react';
import {PenTool, User} from 'lucide-react';
import {usePermissionContext} from '../../contexts/PermissionContext.jsx';
import PopButton from '../common/PopButton.jsx';
import {buildAssetUrl} from '../../utils/asset.js';

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
    const {hasPermission} = usePermissionContext();
    const [content, setContent] = useState("");
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editContent, setEditContent] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [replyTarget, setReplyTarget] = useState(null);
    const [replyContent, setReplyContent] = useState("");
    const canReviewComments = currentUser ? hasPermission('COMMENT_REVIEW') : false;
    const canDeleteComments = currentUser ? hasPermission('COMMENT_DELETE') : false;

    const inputBg = isDarkMode ? 'bg-gray-800 text-white' : 'bg-[#F0F0F0] text-black';
    const commentBg = isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-black';
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
        setContent("");
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
        setReplyContent("");
        setReplyTarget(null);
    };

    const renderComment = (c, depth = 0) => {
        const replies = Array.isArray(c.replies) ? c.replies : [];
        const avatarSrc = getAvatarSrc(c.avatar);
        const isReplying = replyTarget?.comment?.id === c.id;
        const canReply = depth < 2;
        const isOwnComment = currentUser && c.userId === currentUser.id;
        const allowEdit = currentUser && (isOwnComment || canReviewComments);
        const allowDelete = currentUser && (isOwnComment || canDeleteComments);
        const visualDepth = depth > 0 ? 1 : 0;

        return (
            <div
                id={c.id ? `comment-${c.id}` : undefined}
                key={c.id || `${depth}-${c.authorName || c.user || 'comment'}`}
                className={`flex gap-4 ${visualDepth > 0 ? 'ml-8 border-l-2 border-dashed border-black/30 pl-6' : ''}`}>
                <div
                    className={`w-12 h-12 border-2 border-black rounded-full shrink-0 flex items-center justify-center font-bold overflow-hidden ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-200 text-black'}`}>
                    {avatarSrc ? (
                        <img src={avatarSrc} alt={c.authorName} className="w-full h-full object-cover"/>
                    ) : (
                        (c.authorName || c.user || 'U').toString().slice(0, 2)
                    )}
                </div>
                <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                        <span className="font-black text-lg">{c.authorName || c.user}</span>
                        {postAuthorName && (c.authorName === postAuthorName || c.user === postAuthorName) && (
                            <span
                                className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-black border border-black rounded shadow-[2px_2px_0px_0px_#000] ${isDarkMode ? 'bg-pink-600 text-white' : 'bg-yellow-400 text-black'}`}>
                                <PenTool size={10} strokeWidth={3}/>
                                博主
                            </span>
                        )}
                        <span className="text-xs font-bold text-gray-500">{c.time || ''}</span>
                        <div className="ml-auto flex gap-2">
                            {currentUser && canReply && (
                                <button
                                    onClick={() => {
                                        setReplyTarget({comment: c, depth});
                                        setReplyContent("");
                                    }}
                                    className={`text-xs font-bold px-2 py-1 border-2 border-black transition-colors ${isDarkMode ? 'hover:bg-purple-500 hover:text-white' : 'hover:bg-purple-100'}`}
                                >
                                    回复
                                </button>
                            )}
                            {currentUser && allowEdit && (
                                <button
                                    onClick={() => {
                                        setEditingCommentId(c.id);
                                        setEditContent(c.content);
                                    }}
                                    className={`text-xs font-bold px-2 py-1 border-2 border-black transition-colors ${isDarkMode ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-blue-100'}`}
                                >
                                    编辑
                                </button>
                            )}
                            {currentUser && allowDelete && (
                                <button
                                    onClick={() => setDeleteConfirm(c.id)}
                                    className={`text-xs font-bold px-2 py-1 border-2 border-black transition-colors ${isDarkMode ? 'hover:bg-red-500 hover:text-white' : 'hover:bg-red-100'}`}
                                >
                                    删除
                                </button>
                            )}
                        </div>
                    </div>
                    {editingCommentId === c.id ? (
                        <div className="space-y-2">
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className={`w-full p-2 border-2 border-black ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white'}`}
                                rows={3}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        onUpdateComment && onUpdateComment(c.id, editContent);
                                        setEditingCommentId(null);
                                    }}
                                    className="px-3 py-1 bg-green-500 text-white font-bold border-2 border-black"
                                >
                                    保存
                                </button>
                                <button
                                    onClick={() => setEditingCommentId(null)}
                                    className="px-3 py-1 bg-gray-500 text-white font-bold border-2 border-black"
                                >
                                    取消
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={`${commentBg} border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000]`}>
                            <p className="font-medium">{c.content || c.text}</p>
                        </div>
                    )}

                    {deleteConfirm === c.id && (
                        <div className={`mt-2 p-3 border-2 border-red-500 ${isDarkMode ? 'bg-red-900' : 'bg-red-50'}`}>
                            <p className="font-bold text-sm mb-2">确认删除这条评论？</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        onDeleteComment && onDeleteComment(c.id);
                                        setDeleteConfirm(null);
                                    }}
                                    className="px-3 py-1 bg-red-500 text-white font-bold border-2 border-black text-xs"
                                >
                                    确认删除
                                </button>
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-3 py-1 bg-gray-500 text-white font-bold border-2 border-black text-xs"
                                >
                                    取消
                                </button>
                            </div>
                        </div>
                    )}

                    {isReplying && currentUser && (
                        <div className={`mt-4 border-2 border-black p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                            <textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                className={`w-full p-3 border-2 border-black font-bold focus:outline-none min-h-[100px] ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}
                                placeholder={`回复 ${c.authorName || c.user || 'Ta'}...`}
                            />
                            <div className="flex gap-2 mt-2">
                                <PopButton onClick={handleReplySubmit}>发送回复</PopButton>
                                <button
                                    onClick={() => {
                                        setReplyTarget(null);
                                        setReplyContent("");
                                    }}
                                    className="px-3 py-1 border-2 border-black font-bold shadow-[2px_2px_0px_0px_#000] bg-gray-200"
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
        <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-2xl font-black">评论 {totalComments > 0 ? `(${totalComments})` : ''}</h3>
                    {!currentUser && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <User size={12}/>
                            <span>登录后可享更多特权</span>
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
                    className={`w-full p-4 border-2 border-black font-bold focus:outline-none min-h-[140px] ${inputBg}`}
                    placeholder="写点什么..."
                />
                <div className="flex gap-2">
                    <PopButton onClick={handleSubmit}>发布评论</PopButton>
                    {currentUser && (
                        <PopButton
                            variant="secondary"
                            onClick={() => setView && setView('admin')}
                            className={`${isDarkMode ? '!bg-gray-100 !text-black' : '!bg-white !text-black'} shadow-[2px_2px_0px_0px_#000]`}
                        >
                            后台管理
                        </PopButton>
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
