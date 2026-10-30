import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Layers,
  Users,
  Search,
  MoreVertical,
  Copy,
  Trash2,
  Calendar,
  Tag,
  MapPin,
  Loader2,
  Map as MapIcon,
  Filter,
  X
} from "lucide-react";
import { MapItem } from "@mapforge/shared";
import { apiRequest } from "../../lib/api.js";
import { useAuthStore } from "../../stores/authStore.js";
import { useNotificationStore } from "../../stores/notificationStore.js";
import { useEditorStore } from "../../stores/editorStore.js";
import { ConfirmDialog } from "../../components/common/ConfirmDialog.js";
import { MergeDialog } from "../map-merge/MergeDialog.js";
import { RoomModal } from "../collaborative-rooms/RoomModal.js";
import { Navbar } from "../../components/common/Navbar.js";

export const DashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setCurrentMap } = useEditorStore();
  const { showToast } = useNotificationStore();

  const [maps, setMaps] = useState<MapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [sortField, setSortField] = useState<"updatedAt" | "createdAt">("updatedAt");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [mapToDelete, setMapToDelete] = useState<MapItem | null>(null);

  // New map form
  const [newMapName, setNewMapName] = useState("");
  const [newMapDescription, setNewMapDescription] = useState("");
  const [newMapTags, setNewMapTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMaps = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (selectedTag) query.set("tag", selectedTag);
      query.set("sort", sortField);

      const data = await apiRequest<MapItem[]>(`/maps?${query.toString()}`);
      setMaps(data);
    } catch (err: any) {
      showToast("error", "Failed to load maps", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaps();
  }, [search, selectedTag, sortField]);

  const handleCreateMap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMapName.trim()) return;

    setIsSubmitting(true);
    try {
      const tags = newMapTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const newMap = await apiRequest<MapItem>("/maps", {
        method: "POST",
        body: JSON.stringify({
          name: newMapName.trim(),
          description: newMapDescription.trim() || undefined,
          tags
        })
      });

      showToast("success", "Map created!");
      setCurrentMap(newMap);
      setIsCreateModalOpen(false);
      navigate(`/editor/${newMap.id}`);
    } catch (err: any) {
      showToast("error", "Failed to create map", err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = async (map: MapItem) => {
    try {
      const copy = await apiRequest<MapItem>(`/maps/${map.id}/duplicate`, { method: "POST" });
      setMaps([copy, ...maps]);
      showToast("success", "Map duplicated!", `Created ${copy.name}`);
    } catch (err: any) {
      showToast("error", "Failed to duplicate map", err.message);
    }
  };

  const handleDelete = async () => {
    if (!mapToDelete) return;
    try {
      await apiRequest(`/maps/${mapToDelete.id}`, { method: "DELETE" });
      setMaps(maps.filter((m) => m.id !== mapToDelete.id));
      showToast("info", "Map deleted", `${mapToDelete.name} was moved to trash.`);
      setMapToDelete(null);
    } catch (err: any) {
      showToast("error", "Failed to delete map", err.message);
    }
  };

  // Extract all unique tags
  const allTags = Array.from(new Set(maps.flatMap((m) => m.tags || [])));

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden">
      <Navbar
        onOpenMerge={() => setIsMergeModalOpen(true)}
        onOpenRoomModal={() => setIsRoomModalOpen(true)}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Welcome, {user?.name || "Cartographer"} 👋
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create, edit, merge and collaboratively build maps with precise geographic annotations.
            </p>
          </div>

          <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsMergeModalOpen(true)}
              className="px-2.5 sm:px-4 py-2 sm:py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-1.5 border border-indigo-200"
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
              <span>Merge</span>
            </button>

            <button
              onClick={() => setIsRoomModalOpen(true)}
              className="px-2.5 sm:px-4 py-2 sm:py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-1.5 border border-emerald-200"
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              <span>Rooms</span>
            </button>

            <button
              onClick={() => {
                setNewMapName("");
                setNewMapDescription("");
                setNewMapTags("");
                setIsCreateModalOpen(true);
              }}
              className="px-2.5 sm:px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>New Map</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search maps by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-none text-slate-700"
            >
              <option value="updatedAt">Recently Modified</option>
              <option value="createdAt">Date Created</option>
            </select>

            {allTags.length > 0 && (
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-none text-slate-700"
              >
                <option value="">All Tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    Tag: {tag}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Maps Grid */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <span className="text-sm">Loading your maps...</span>
          </div>
        ) : maps.length === 0 ? (
          <div className="py-16 bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <MapIcon className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No maps created yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
              Start by creating your first interactive map with custom emojis, drawings, and geographic markers.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Map</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {maps.map((map) => (
              <div
                key={map.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition group flex flex-col"
              >
                {/* Card Top Preview / Gradient Banner */}
                <div
                  onClick={() => navigate(`/editor/${map.id}`)}
                  className="h-32 bg-gradient-to-tr from-slate-100 to-blue-50 cursor-pointer relative flex items-center justify-center overflow-hidden border-b border-slate-100"
                >
                  <MapIcon className="w-10 h-10 text-slate-300 group-hover:scale-110 transition duration-300" />
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-slate-700 shadow-sm border border-slate-200/60 flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-blue-500" />
                    <span>{map.annotationCount || 0} objects</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3
                      onClick={() => navigate(`/editor/${map.id}`)}
                      className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition cursor-pointer truncate"
                    >
                      {map.name}
                    </h3>
                    {map.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{map.description}</p>
                    )}

                    {map.tags && map.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {map.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(map.updatedAt).toLocaleDateString()}</span>
                    </span>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleDuplicate(map)}
                        title="Duplicate Map"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setMapToDelete(map)}
                        title="Delete Map"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Map Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Create New Map</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMap} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Map Name
                </label>
                <input
                  type="text"
                  required
                  value={newMapName}
                  onChange={(e) => setNewMapName(e.target.value)}
                  placeholder="e.g. Bhopal Petrol Pumps, Cloth Stores..."
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newMapDescription}
                  onChange={(e) => setNewMapDescription(e.target.value)}
                  placeholder="Notes about survey purpose or location scope..."
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={newMapTags}
                  onChange={(e) => setNewMapTags(e.target.value)}
                  placeholder="e.g. fuel, survey, bhopal"
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Create & Open</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!mapToDelete}
        title="Delete Map"
        message={`Are you sure you want to delete "${mapToDelete?.name}"? You can duplicate or export your annotations first.`}
        confirmLabel="Delete Map"
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setMapToDelete(null)}
      />

      {/* Merge Maps Dialog */}
      <MergeDialog isOpen={isMergeModalOpen} onClose={() => setIsMergeModalOpen(false)} />

      {/* Collaborative Rooms Modal */}
      <RoomModal isOpen={isRoomModalOpen} onClose={() => setIsRoomModalOpen(false)} />
    </div>
  );
};
