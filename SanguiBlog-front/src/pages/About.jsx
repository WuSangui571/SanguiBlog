import { useNavigate } from "react-router-dom";
import SanGuiBlog from "../AppFull.jsx";
import { buildViewNavigator } from "./viewNavigation.js";

export default function AboutPage() {
  const navigate = useNavigate();
  return (
    <SanGuiBlog
      initialView="about"
      onViewChange={buildViewNavigator(navigate)}
    />
  );
}
