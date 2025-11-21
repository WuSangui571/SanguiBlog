import { ArrowUpRight, Sparkles, Github } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function Hero({ isDarkMode }) {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 400], [0, 150]);
  const rotate = useTransform(scrollY, [0, 400], [0, 30]);

  return (
    <div className={`relative min-h-[80vh] flex flex-col justify-center items-center pt-20 overflow-hidden ${isDarkMode ? "bg-gray-900 text-white" : "bg-[#F0F0F0] text-black"}`}>
      <motion.div style={{ y: y1, rotate }} className="absolute top-24 left-[8%] text-[#FFD700]">
        <Sparkles size={80} />
      </motion.div>
      <motion.div style={{ y: y1 }} className="absolute bottom-32 right-[10%] w-28 h-28 border-4 border-black bg-[#00E096] shadow-[8px_8px_0px_0px_#000] rounded-full flex items-center justify-center font-black text-xl">
        CODE
      </motion.div>

      <div className="z-10 text-center max-w-4xl px-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-block mb-4 bg-black text-white px-6 py-2 text-lg font-mono font-bold -rotate-2 shadow-[4px_4px_0px_0px_#FF0080]">
          HELLO WORLD // V3.3
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
          用代码记录思考，用分享助力成长
        </h1>
        <p className={`text-lg md:text-xl font-bold mb-10 border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000] ${isDarkMode ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"}`}>
          SpringBoot x React 的极致碰撞，记录技术与生活的双重灵感。
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <a href="#posts" className="px-6 py-3 border-2 border-black bg-[#FFD700] font-black flex items-center gap-2 shadow-[4px_4px_0px_0px_#000]">
            <ArrowUpRight size={18} /> 开始阅读
          </a>
          <button onClick={() => window.open("https://github.com/Wusangui571")} className="px-6 py-3 border-2 border-black bg-white font-black flex items-center gap-2 shadow-[4px_4px_0px_0px_#000]">
            <Github size={18} /> Github
          </button>
        </div>
      </div>
    </div>
  );
}
