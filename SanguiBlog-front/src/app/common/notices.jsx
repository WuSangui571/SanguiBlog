import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AlertTriangle, CheckCircle} from 'lucide-react';
import {useLayoutOffsets} from '../../contexts/LayoutOffsetContext.jsx';

export const useTimedNotice = (duration = 4000) => {
    const [notice, setNotice] = useState({visible: false, message: '', tone: 'success'});
    const timerRef = useRef(null);

    const showNotice = useCallback((message, tone = 'success') => {
        if (!message) return;
        setNotice({visible: true, message, tone});
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            setNotice((prev) => ({...prev, visible: false}));
        }, duration);
    }, [duration]);

    const hideNotice = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setNotice((prev) => ({...prev, visible: false}));
    }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return {notice, showNotice, hideNotice};
};

export const AdminNoticeBar = ({notice, onClose}) => {
    const {headerHeight} = useLayoutOffsets();
    if (!notice?.visible || !notice?.message) return null;
    const tone = notice.tone === 'error' ? 'error' : 'success';
    const toneStyles = tone === 'error'
        ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-[0_20px_45px_rgba(244,63,94,0.35)]'
        : 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-[0_20px_45px_rgba(16,185,129,0.35)]';
    const Icon = tone === 'error' ? AlertTriangle : CheckCircle;
    const safeTop = headerHeight + 16;

    return (
        <div
            className="fixed right-8 z-50 w-[min(360px,calc(100vw-32px))] transition-all duration-300"
            style={{top: safeTop}}
        >
            <div className={`flex items-start gap-3 rounded-2xl border px-5 py-4 ${toneStyles}`}>
                <Icon size={20}/>
                <div className="flex-1">
                    <p className="font-semibold text-sm leading-5">{notice.message}</p>
                    <p className="text-xs opacity-80 mt-1">提示栏会在 4 秒后自动收起</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-xs font-bold uppercase tracking-[0.2em]"
                >
                    CLOSE
                </button>
            </div>
        </div>
    );
};
