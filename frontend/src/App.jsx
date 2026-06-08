import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import AuditLogsPage from "./pages/AuditLogsPage.jsx";
import ChatWorkspace from "./pages/ChatWorkspace.jsx";
import DocumentsPage from "./pages/DocumentsPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";

const App = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route
      path="/app"
      element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Navigate to="/app/chat" replace />} />
      <Route path="chat" element={<ChatWorkspace />} />
      <Route path="documents" element={<DocumentsPage />} />
      <Route path="analytics" element={<AnalyticsPage />} />
      <Route path="logs" element={<AuditLogsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
