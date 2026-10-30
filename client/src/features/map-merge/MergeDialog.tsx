import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Layers, Check, Loader2, Info, ArrowRight } from "lucide-react";
import { MapItem, MergeMapsResult } from "@mapforge/shared";
import { apiRequest } from "../../lib/api.js";
import { useNotificationStore } from "../../stores/notificationStore.js";
import { useEditorStore } from "../../stores/editorStore.js";

interface MergeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MergeDialog: React.FC<MergeDialogProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { showToast } = useNotificationStore();
  const { setCurrentMap } = useEditorStore();

  const [maps, setMaps] = useState<MapItem[]>([]);
  const [selectedMapIds, setSelectedMapIds] = useState<string[]>([]);
  const [destinationName, setDestinationName] = useState("");
  const [destinationDescription, setDestinationDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // Fetch available maps
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    apiRequest<MapItem[]>("/maps")
      .then((data) => {
        setMaps(data);
        if (data.length >= 2) {
          // Pre-select first two for convenience
          setSelectedMapIds([data[0].id, data[1].id]);
          setDestinationName(`Merged Map (${data[0].name} + ${data[1].name})`);
        } else {
          setDestinationName("Combined Survey Map");
        }
      })
      .catch((err) => {
        showToast("error", "Failed to load maps", err.message);
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSelectMap = (id: string) => {
    if (selectedMapIds.includes(id)) {
      setSelectedMapIds(selectedMapIds.filter((mId) => mId !== id));
    } else {
      setSelectedMapIds([...selectedMapIds, id]);
    }
  };

  const selectedMaps = maps.filter((m) => selectedMapIds.includes(m.id));
  const totalAnnotations = selectedMaps.reduce((sum, m) => sum + (m.annotationCount || 0), 0);

  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedMapIds.length < 2) {
      showToast("warning", "Select at least 2 maps", "A merge requires combining two or more distinct maps.");
      return;
    }

    if (!destinationName.trim()) {
      showToast("warning", "Destination name required", "Please enter a name for the merged map.");
      return;
    }

    setIsMerging(true);
    try {
      const result = await apiRequest<MergeMapsResult>("/maps/merge", {
        method: "POST",
        body: JSON.stringify({
          sourceMapIds: selectedMapIds,
          destinationName: destinationName.trim(),
          destinationDescription: destinationDescription.trim() || undefined
        })
      });

      showToast(
        "success",
        "Maps Merged Successfully!",
        `Created '${result.destinationMap.name}' with ${result.importedAnnotationCount} preserved annotations.`
      );

      setCurrentMap(result.destinationMap);
      onClose();
      navigate(`/editor/${result.destinationMap.id}`);
    } catch (err: any) {
      showToast("error", "Merge Failed", err.message || "Failed to merge selected maps");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Merge Maps</h3>
              <p className="text-xs text-slate-500">
                Combine annotations from 2 or more maps into a new independent map.
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
        <form onSubmit={handleMergeSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Map Selection List */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Select Source Maps ({selectedMapIds.length} selected)</span>
              <span className="text-indigo-600 font-semibold">{totalAnnotations} total annotations</span>
            </label>

            {isLoading ? (
              <div className="py-8 flex justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : maps.length < 2 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start space-x-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  You need at least 2 saved maps to perform a merge. Create another map from the dashboard first.
                </span>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {maps.map((map) => {
                  const isSelected = selectedMapIds.includes(map.id);
                  return (
                    <div
                      key={map.id}
                      onClick={() => toggleSelectMap(map.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? "bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">{map.name}</h4>
                          <span className="text-xs text-slate-500">
                            {map.annotationCount || 0} annotations • Updated{" "}
                            {new Date(map.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Destination Map Details */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Destination Map Name
              </label>
              <input
                type="text"
                required
                value={destinationName}
                onChange={(e) => setDestinationName(e.target.value)}
                placeholder="e.g. Combined Market Map"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Description (Optional)
              </label>
              <input
                type="text"
                value={destinationDescription}
                onChange={(e) => setDestinationDescription(e.target.value)}
                placeholder="Brief summary of combined maps..."
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
            <strong>Geographic Guarantee:</strong> Every annotation, marker, line, and stroke from the
            selected maps is cloned with 100% exact geographic coordinate preservation. Source maps remain
            untouched and independent.
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedMapIds.length < 2 || isMerging}
              className="px-5 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center space-x-2 disabled:opacity-50"
            >
              {isMerging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Merging Maps...</span>
                </>
              ) : (
                <>
                  <span>Create Merged Map</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
