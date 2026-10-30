import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore.js";
import { DashboardView } from "../features/dashboard/DashboardView.js";
import { MapEditorView } from "../features/map-editor/MapEditorView.js";
import { SharedMapView } from "../features/map-sharing/SharedMapView.js";
import { LoginView } from "../features/auth/LoginView.js";
import { RegisterView } from "../features/auth/RegisterView.js";
import { ToastContainer } from "../components/common/ToastContainer.js";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuthStore();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginView />} />
        <Route path="/register" element={<RegisterView />} />
        <Route path="/share/:token" element={<SharedMapView />} />

        {/* Protected Dashboard & Editor */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor/:mapId"
          element={
            <ProtectedRoute>
              <MapEditorView />
            </ProtectedRoute>
          }
        />

        {/* Fallback 404 */}
        <Route
          path="*"
          element={
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-center p-4">
              <h1 className="text-4xl font-extrabold text-slate-800">404</h1>
              <p className="text-sm text-slate-500 mt-2 mb-4">Page or Map Not Found</p>
              <Navigate to="/" replace />
            </div>
          }
        />
      </Routes>

      {/* Global Notifications */}
      <ToastContainer />
    </BrowserRouter>
  );
};
