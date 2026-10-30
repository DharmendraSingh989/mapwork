import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Map, Layers, Users, LogOut, User as UserIcon } from "lucide-react";
import { useAuthStore } from "../../stores/authStore.js";
import { APP_NAME } from "@mapforge/shared";

interface NavbarProps {
  onOpenMerge?: () => void;
  onOpenRoomModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMerge, onOpenRoomModal }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="h-14 border-b border-slate-200 bg-white/95 backdrop-blur px-4 flex items-center justify-between z-30 select-none shadow-sm">
      <div className="flex items-center space-x-6">
        <Link to="/" className="flex items-center space-x-2.5 font-bold text-lg text-slate-900 hover:opacity-90 transition">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Map className="w-5 h-5" />
          </div>
          <span className="tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {APP_NAME}
          </span>
        </Link>

        {user && (
          <>
            <nav className="hidden md:flex items-center space-x-1">
              <Link
                to="/"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center space-x-1.5 ${
                  location.pathname === "/"
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Map className="w-4 h-4" />
                <span>My Maps</span>
              </Link>

              {onOpenMerge && (
                <button
                  onClick={onOpenMerge}
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center space-x-1.5"
                >
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span>Merge Maps</span>
                </button>
              )}

              {onOpenRoomModal && (
                <button
                  onClick={onOpenRoomModal}
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center space-x-1.5"
                >
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span>Collab Rooms</span>
                </button>
              )}
            </nav>

            {/* Mobile quick actions in navbar */}
            <div className="flex md:hidden items-center space-x-1">
              {onOpenMerge && (
                <button
                  onClick={onOpenMerge}
                  title="Merge Maps"
                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                >
                  <Layers className="w-4 h-4 text-indigo-600" />
                </button>
              )}
              {onOpenRoomModal && (
                <button
                  onClick={onOpenRoomModal}
                  title="Collab Rooms"
                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                >
                  <Users className="w-4 h-4 text-emerald-600" />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {user ? (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-full border border-slate-200">
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium hidden sm:inline">{user.name}</span>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Link
              to="/login"
              className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition"
            >
              Create Account
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
