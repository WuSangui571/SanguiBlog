import { useNavigate } from "react-router-dom";
import SanGuiBlog from "../AppFull.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  return (
    <SanGuiBlog
      initialView="login"
      onViewChange={(view) => {
        if (view === "home") navigate("/", { replace: true });
        if (view === "admin") navigate("/admin", { replace: true });
        if (view === "article") navigate("/", { replace: true });
      }}
    />
  );
}
