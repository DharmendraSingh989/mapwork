import React from "react";
import { useNotificationStore } from "../../stores/notificationStore.js";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotificationStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let bg = "bg-white border-slate-200 text-slate-800";
        let icon = <Info className="w-5 h-5 text-blue-500" />;

        if (toast.type === "success") {
          bg = "bg-emerald-50 border-emerald-200 text-emerald-900";
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
        } else if (toast.type === "error") {
          bg = "bg-red-50 border-red-200 text-red-900";
          icon = <AlertCircle className="w-5 h-5 text-red-600" />;
        } else if (toast.type === "warning") {
          bg = "bg-amber-50 border-amber-200 text-amber-900";
          icon = <AlertTriangle className="w-5 h-5 text-amber-600" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start p-3.5 rounded-lg border shadow-lg transition-all duration-200 ${bg}`}
          >
            <div className="flex-shrink-0 mr-3 mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0 mr-2">
              <h4 className="text-sm font-semibold leading-tight">{toast.title}</h4>
              {toast.message && <p className="text-xs mt-1 opacity-90">{toast.message}</p>}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
