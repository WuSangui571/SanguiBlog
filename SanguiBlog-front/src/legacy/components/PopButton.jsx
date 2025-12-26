// LEGACY：旧版 PopButton 原型组件（已由 src/components/common/PopButton.jsx 替代/扩展），保留仅供参考，请勿在现网入口中引用。
import { motion } from "framer-motion";

export default function PopButton({ children, className = "", variant = "primary", icon: Icon, ...props }) {
  const variants = {
    primary: "bg-black text-white hover:bg-[#6366F1]",
    secondary: "bg-white text-black hover:bg-[#FFD700]",
  };
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`px-4 py-2 font-black border-2 border-black shadow-[4px_4px_0px_0px_#000] flex items-center gap-2 ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {Icon && <Icon size={16} />}
      {children}
    </motion.button>
  );
}
