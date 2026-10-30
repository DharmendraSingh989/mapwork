import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Map, Copy, Eye, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { MapItem, MapAnnotation, MapShare } from "@mapforge/shared";
import { apiRequest } from "../../lib/api.js";
import { useAuthStore } from "../../stores/authStore.js";
import { useEditorStore } from "../../stores/editorStore.js";
import { useNotificationStore } from "../../stores/notificationStore.js";
import { MapCanvas } from "../map-editor/MapCanvas.js";

export const SharedMapView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setCurrentMap, setAnnotations } = useEditorStore();
  const { showToast } = useNotificationStore();

  const [sharedMap, setSharedMap] = useState<MapItem | null>(null);
  const [shareInfo, setShareInfo] = useState<MapShare | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    setIsLoading(true);
    apiRequest<{ map: MapItem; share: MapShare; annotations?: MapAnnotation[] }>(`/shares/${token}`)
      .then(async (data) => {
        setSharedMap(data.map);
        setShareInfo(data.share);
        setCurrentMap(data.map);

        if (data.annotations) {
          setAnnotations(data.annotations);
        } else {
          try {
            const annotations = await apiRequest<MapAnnotation[]>(`/maps/${data.map.id}/annotations`);
            setAnnotations(annotations);
          } catch {
            setAnnotations([]);
          }
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load shared map");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleImportCopy = async () => {
    if (!user) {
      showToast("info", "Sign in required", "Please log in to save an independent copy to your maps.");
      navigate("/login");
      return;
    }

    setIsImporting(true);
    try {
      const importedMap = await apiRequest<MapItem>(`/shares/${token}/import`, {
        method: "POST",
        body: JSON.stringify({ newMapName: `${sharedMap?.name} (My Copy)` })
      });

      showToast("success", "Map Copied!", "An independent copy has been added to your dashboard.");
      setCurrentMap(importedMap);
      navigate(`/editor/${importedMap.id}`);
    } catch (err: any) {
      showToast("error", "Import Failed", err.message);
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading shared map...</p>
      </div>
    );
  }

  if (error || !sharedMap) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Unavailable Link</h2>
          <p className="text-sm text-slate-500 mb-6">{error || "This shared map is no longer accessible."}</p>
          <Link
            to="/"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100">
      {/* Top Banner */}
      <header className="h-14 border-b border-slate-200 bg-white/95 backdrop-blur px-4 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center space-x-3">
          <Link
            to="/"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-slate-900">{sharedMap.name}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase flex items-center space-x-1">
                <Eye className="w-3 h-3" />
                <span>Shared ({shareInfo?.permission})</span>
              </span>
            </div>
            {sharedMap.description && (
              <p className="text-xs text-slate-500 truncate max-w-md">{sharedMap.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {shareInfo?.allowCopy && (
            <button
              onClick={handleImportCopy}
              disabled={isImporting}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition disabled:opacity-50"
            >
              {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy to My Maps</span>
            </button>
          )}
        </div>
      </header>

      {/* Map View */}
      <div className="flex-1 relative overflow-hidden">
        <MapCanvas styleUrl={sharedMap.styleUrl} />
      </div>
    </div>
  );
};
