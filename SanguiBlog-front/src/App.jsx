import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/Home";
import ArticlePage from "./pages/Article";
import LoginPage from "./pages/Login";
import AdminPage from "./pages/Admin";
import GamesPage from "./pages/Games";
import GameDetailPage from "./pages/GameDetail";
import { BlogProvider } from "./hooks/useBlogData";

export default function App() {
  return (
    <BlogProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/article/:id" element={<ArticlePage />} />
        <Route path="/games" element={<GamesPage />} />
        <Route path="/games/:id" element={<GameDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BlogProvider>
  );
}
