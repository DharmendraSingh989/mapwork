import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Users, KeyRound, Plus, Loader2, ArrowRight } from "lucide-react";
import { MapItem, Room } from "@mapforge/shared";
import { apiRequest } from "../../lib/api.js";
import { useRoomStore } from "../../stores/roomStore.js";
import { useAuthStore } from "../../stores/authStore.js";
import { useNotificationStore } from "../../stores/notificationStore.js";

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMapId?: string;
}

export const RoomModal: React.FC<RoomModalProps> = ({ isOpen, onClose, activeMapId }) => {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const { connectSocket, joinRoom } = useRoomStore();
  const { showToast } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [maps, setMaps] = useState<MapItem[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string>(activeMapId || "");
  const [roomName, setRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      apiRequest<MapItem[]>("/maps")
        .then((data) => {
          setMaps(data);
          if (data.length > 0 && !selectedMapId) {
            setSelectedMapId(data[0].id);
            setRoomName(`${data[0].name} Session`);
          }
        })
        .catch(console.warn);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMapId || !roomName.trim()) return;

    setIsSubmitting(true);
    try {
      const room = await apiRequest<Room>("/rooms", {
        method: "POST",
        body: JSON.stringify({ name: roomName.trim(), activeMapId: selectedMapId })
      });

      if (token) {
        connectSocket(token);
        await joinRoom(room.id);
      }

      showToast("success", "Room Created!", `Room Code: ${room.code}`);
      onClose();
      navigate(`/editor/${room.activeMapId}`);
    } catch (err: any) {
      showToast("error", "Failed to create room", err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      showToast("warning", "Invalid Code", "Room code must be 6 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const room = await apiRequest<Room>("/rooms/join", {
        method: "POST",
        body: JSON.stringify({ code: cleanCode })
      });

      if (token) {
        connectSocket(token);
        await joinRoom(room.id);
      }

      showToast("success", "Joined Collaborative Room!", `Welcome to ${room.name}`);
      onClose();
      navigate(`/editor/${room.activeMapId}`);
    } catch (err: any) {
      showToast("error", "Failed to join room", err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Collaborative Rooms</h3>
              <p className="text-xs text-slate-500">Live multi-user map editing & presence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 text-sm font-semibold">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-3 text-center transition flex items-center justify-center space-x-2 border-b-2 ${
              activeTab === "create"
                ? "border-emerald-500 text-emerald-700 bg-emerald-50/40"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Create Room</span>
          </button>

          <button
            onClick={() => setActiveTab("join")}
            className={`flex-1 py-3 text-center transition flex items-center justify-center space-x-2 border-b-2 ${
              activeTab === "join"
                ? "border-emerald-500 text-emerald-700 bg-emerald-50/40"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Join with Code</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "create" ? (
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Room Name
                </label>
                <input
                  type="text"
                  required
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Survey Review Session"
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Map to Edit Together
                </label>
                <select
                  value={selectedMapId}
                  onChange={(e) => setSelectedMapId(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {maps.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.annotationCount || 0} objects)
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !selectedMapId}
                className="w-full mt-4 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Start Room</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  6-Character Room Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. M7F9K2"
                  className="w-full text-center text-xl font-mono font-bold tracking-widest px-3.5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || joinCode.length !== 6}
                className="w-full mt-4 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Join Room</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
