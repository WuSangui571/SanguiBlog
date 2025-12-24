import { useNavigate } from "react-router-dom";
import SanGuiBlog from "../AppFull.jsx";
import { buildViewNavigator } from "./viewNavigation.js";

export default function ArchivePage() {
  const navigate = useNavigate();
  return (
    <SanGuiBlog
      initialView="archive"
      onViewChange={buildViewNavigator(navigate)}
    />
  );
}
