import React, { useState, useEffect } from "react";
import { X, Share2, Copy, Check, Eye, Edit3, ShieldAlert, Trash2, Loader2 } from "lucide-react";
import { MapShare, SharePermission } from "@mapforge/shared";
import { apiRequest } from "../../lib/api.js";
import { useNotificationStore } from "../../stores/notificationStore.js";

interface ShareDialogProps {
  isOpen: boolean;
  mapId: string;
  onClose: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ isOpen, mapId, onClose }) => {
  const { showToast } = useNotificationStore();

  const [shares, setShares] = useState<MapShare[]>([]);
  const [permission, setPermission] = useState<SharePermission>("view");
  const [allowCopy, setAllowCopy] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchShares = async () => {
    try {
      const data = await apiRequest<MapShare[]>(`/maps/${mapId}/shares`);
      setShares(data);
    } catch (err: any) {
      console.warn("Error fetching shares:", err);
    }
  };

  useEffect(() => {
    if (isOpen && mapId) {
      fetchShares();
    }
  }, [isOpen, mapId]);

  if (!isOpen) return null;

  const handleCreateShare = async () => {
    setIsCreating(true);
    try {
      const newShare = await apiRequest<MapShare>(`/maps/${mapId}/shares`, {
        method: "POST",
        body: JSON.stringify({ permission, allowCopy })
      });

      setShares([newShare, ...shares]);
      showToast("success", "Share link created!");
    } catch (err: any) {
      showToast("error", "Failed to create share link", err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const shareUrl = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedToken(token);
    showToast("success", "Link copied to clipboard!");
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      await apiRequest(`/shares/${shareId}`, { method: "DELETE" });
      setShares(shares.filter((s) => s.id !== shareId));
      showToast("info", "Share link revoked");
    } catch (err: any) {
      showToast("error", "Failed to revoke share", err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Share Map</h3>
              <p className="text-xs text-slate-500">
                Generate secure links with view or collaborative permissions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Create New Link Section */}
          <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Create New Share Link
            </h4>

            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="permission"
                  checked={permission === "view"}
                  onChange={() => setPermission("view")}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>View-only</span>
              </label>

              <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="permission"
                  checked={permission === "edit"}
                  onChange={() => setPermission("edit")}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Can edit</span>
              </label>
            </div>

            <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={allowCopy}
                onChange={(e) => setAllowCopy(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Allow recipient to import an independent copy into their account</span>
            </label>

            <button
              onClick={handleCreateShare}
              disabled={isCreating}
              className="w-full py-2 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center justify-center space-x-1.5 shadow-sm"
            >
              {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>Generate Link</span>
            </button>
          </div>

          {/* Active Share Links List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Active Share Links ({shares.length})
            </h4>

            {shares.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No active share links. Generate one above to share this map.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {shares.map((share) => {
                  const shareUrl = `${window.location.origin}/share/${share.token}`;
                  const isCopied = copiedToken === share.token;

                  return (
                    <div
                      key={share.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between space-x-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              share.permission === "edit"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {share.permission}
                          </span>
                          {share.allowCopy && (
                            <span className="text-[10px] text-slate-500">• Allows copy</span>
                          )}
                        </div>
                        <p className="text-slate-500 font-mono truncate mt-1">{shareUrl}</p>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleCopyLink(share.token)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Copy Link"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleRevokeShare(share.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Revoke Link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
