import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useLayoutOffsets } from "../../contexts/LayoutOffsetContext.jsx";const ErrorToast = ({ error, onClose }) => {
    const { headerHeight } = useLayoutOffsets();
    const toastTop = headerHeight + 16;
    useEffect(() => {
        if (error) {
            const timer = setTimeout(onClose, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, onClose]);

    return (
        <AnimatePresence>
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    className="fixed right-4 z-[70] max-w-md"
                    style={{ top: toastTop }}
                >
                    <div className="bg-red-500 border-4 border-black shadow-[8px_8px_0px_0px_#000] p-4">
                        <div className="flex items-start gap-3 text-white">
                            <AlertTriangle size={24} strokeWidth={3} className="flex-shrink-0 mt-1" />
                            <div className="flex-1">
                                <h4 className="font-black text-lg mb-1">错误 // ERROR</h4>
                                <p className="font-bold text-sm">{error}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="bg-black p-1 hover:rotate-90 transition-transform border border-white flex-shrink-0"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ... (ClickRipple component is kept unchanged for brevity)
export default ErrorToast;
