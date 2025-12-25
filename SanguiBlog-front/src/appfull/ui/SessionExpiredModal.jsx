import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldAlert, Clock, LogIn } from "lucide-react";

const SessionExpiredModal = ({ open, onConfirm, isDarkMode }) => {
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const panelBg = isDarkMode
    ? "bg-[radial-gradient(circle_at_top,#111827_0%,#0B0F1D_45%,#06070F_100%)]"
    : "bg-[radial-gradient(circle_at_top,#FFFFFF_0%,#F5F5FF_55%,#ECEBFF_100%)]";
  const panelText = isDarkMode ? "text-gray-100" : "text-gray-900";
  const subText = isDarkMode ? "text-gray-300" : "text-gray-600";
  const hintText = isDarkMode ? "text-gray-400" : "text-gray-600";
  const panelBorder = isDarkMode ? "border-[#00F5D4]" : "border-[#111827]";
  const glow = isDarkMode
    ? "shadow-[0_0_0_2px_rgba(0,245,212,0.3),0_0_40px_rgba(79,70,229,0.35)]"
    : "shadow-[0_0_0_2px_rgba(17,24,39,0.15),0_0_32px_rgba(99,102,241,0.25)]";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[160] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full max-w-lg border-2 ${panelBorder} ${panelBg} ${panelText} ${glow} rounded-none overflow-hidden`}
          >
            <div className="absolute top-0 right-0 h-1 w-24 bg-gradient-to-r from-[#00F5D4] via-[#6366F1] to-[#FF0080]" />
            <div className="px-6 pt-6 pb-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 border-2 border-black bg-black text-[#00F5D4] flex items-center justify-center">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-[#00F5D4]">会话守卫</p>
                  <h3 className="text-2xl font-black mt-1">会话已失效</h3>
                </div>
              </div>
              <p className={`text-sm mt-4 leading-6 ${subText}`}>
                检测到长时间未操作，为保护账号安全，系统已自动退出后台登录状态。
                请点击下方按钮重新登录。
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className={`flex items-center gap-3 text-xs uppercase tracking-[0.3em] ${hintText}`}>
                <Clock size={14} />
                自动登出 / 安全锁定
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className={`text-xs ${hintText}`}>
                  提示：确认后将跳转至登录页面。
                </div>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 border-2 border-black bg-[#00F5D4] text-black font-black uppercase tracking-[0.2em] shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5 transition"
                >
                  <LogIn size={16} />
                  前往登录
                </button>
              </div>
            </div>
            <div className="px-6 py-3 bg-black/60 text-[10px] uppercase tracking-[0.4em] text-gray-300">
              三桂安全通道
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SessionExpiredModal;
