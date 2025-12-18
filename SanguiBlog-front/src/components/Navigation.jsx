import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Code, Menu, LogOut, LogIn, Settings } from "lucide-react";

export default function Navigation({ user, onLogout, isDarkMode, toggleDark }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();

  const links = [
    { to: "/", label: "首页" },
    { to: "/admin", label: "后台", admin: true },
  ];

  const barStyle = isDarkMode ? "bg-gray-900 text-white border-gray-700" : "bg-white text-black border-black";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 md:px-8 border-b ${barStyle}`}>
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
        <div className={`w-10 h-10 ${isDarkMode ? "bg-[#FF0080]" : "bg-black"} text-white flex items-center justify-center border-2 border-black`}>
          <Code size={22} />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-xl font-black tracking-tight">SANGUI</span>
          <span className="text-[10px] font-bold bg-[#FF0080] text-white px-1">BLOG.OS</span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-6">
        {links.map((l) =>
          l.admin && !user ? null : (
            <Link
              key={l.to}
              to={l.to}
              className={`font-bold uppercase text-sm border-b-2 ${loc.pathname === l.to ? "border-[#FF0080]" : "border-transparent"} hover:border-black`}
            >
              {l.label}
            </Link>
          )
        )}
        <button onClick={toggleDark} className="text-sm px-3 py-1 border-2 border-black">
          {isDarkMode ? "浅色" : "深色"}
        </button>
        {user ? (
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm">{user.displayName || user.display_name || user.nickname || user.username}</span>
            <button onClick={onLogout} className="p-2 hover:text-[#FF0080]">
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <Link to="/login" className="flex items-center gap-1 font-bold text-sm">
            <LogIn size={18} /> 登录
          </Link>
        )}
      </div>

      <button className="md:hidden p-2 border-2 border-black" onClick={() => setOpen((v) => !v)}>
        <Menu size={22} />
      </button>

      {open && (
        <div className={`absolute top-16 left-0 right-0 md:hidden border-b ${barStyle} p-4 space-y-3`}>
          {links.map((l) =>
            l.admin && !user ? null : (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block font-bold">
                {l.label}
              </Link>
            )
          )}
          {user ? (
            <button onClick={onLogout} className="flex items-center gap-2">
              <LogOut size={18} /> 退出
            </button>
          ) : (
            <Link to="/login" onClick={() => setOpen(false)} className="flex items-center gap-2">
              <LogIn size={18} /> 登录
            </Link>
          )}
          <button onClick={toggleDark} className="flex items-center gap-2">
            <Settings size={18} /> {isDarkMode ? "浅色" : "深色"}
          </button>
        </div>
      )}
    </nav>
  );
}

