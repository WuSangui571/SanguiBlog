import { useNavigate } from "react-router-dom";
import SanGuiBlog from "../AppFull.jsx";
import { buildViewNavigator } from "./viewNavigation.js";

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <SanGuiBlog
      initialView="home"
      onViewChange={buildViewNavigator(navigate)}
    />
  );
}
