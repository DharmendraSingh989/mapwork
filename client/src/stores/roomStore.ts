import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { Room, RoomMember, RoomOperation, SOCKET_EVENTS } from "@mapforge/shared";
import { useEditorStore } from "./editorStore.js";
import { useNotificationStore } from "./notificationStore.js";

interface CursorData {
  userId: string;
  name: string;
  coords: [number, number];
}

interface RoomState {
  socket: Socket | null;
  activeRoom: Room | null;
  members: RoomMember[];
  cursors: Map<string, CursorData>;
  isConnected: boolean;
  lastSequence: number;

  connectSocket: (token: string) => void;
  disconnectSocket: () => void;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: () => void;
  sendCursorMove: (lng: number, lat: number) => void;
  submitOperation: (type: "create" | "update" | "delete" | "batch", targetId?: string, payload?: any) => Promise<void>;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  socket: null,
  activeRoom: null,
  members: [],
  cursors: new Map(),
  isConnected: false,
  lastSequence: 0,

  connectSocket: (token: string) => {
    if (get().socket) return;

    const socket = io("/", {
      auth: { token },
      transports: ["websocket", "polling"],
      autoConnect: true
    });

    socket.on(SOCKET_EVENTS.CONNECT, () => {
      set({ isConnected: true });
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      set({ isConnected: false });
    });

    socket.on(SOCKET_EVENTS.USER_JOINED, (data: { userId: string; name: string }) => {
      useNotificationStore.getState().showToast("info", "User Joined", `${data.name} joined the room`);
    });

    socket.on(SOCKET_EVENTS.USER_LEFT, (data: { userId: string; name: string }) => {
      useNotificationStore.getState().showToast("info", "User Left", `${data.name} left the room`);
      const updatedCursors = new Map(get().cursors);
      updatedCursors.delete(data.userId);
      set({ cursors: updatedCursors });
    });

    socket.on(SOCKET_EVENTS.CURSOR_MOVE, (data: CursorData) => {
      const updatedCursors = new Map(get().cursors);
      updatedCursors.set(data.userId, data);
      set({ cursors: updatedCursors });
    });

    // Authoritative incoming operation broadcast from another room member
    socket.on(SOCKET_EVENTS.OPERATION_BROADCAST, (op: RoomOperation) => {
      const editor = useEditorStore.getState();

      if (op.type === "create") {
        const payload = op.payload as any;
        const exists = editor.annotations.some((a) => a.id === payload.id);
        if (!exists) {
          editor.pushHistory(`Live add: ${op.actorName}`, [...editor.annotations, payload]);
        }
      } else if (op.type === "update") {
        const payload = op.payload as any;
        const updated = editor.annotations.map((a) => (a.id === op.targetId ? { ...a, ...payload } : a));
        editor.pushHistory(`Live update: ${op.actorName}`, updated);
      } else if (op.type === "delete") {
        const remaining = editor.annotations.filter((a) => a.id !== op.targetId);
        editor.pushHistory(`Live delete: ${op.actorName}`, remaining);
      }

      set({ lastSequence: op.seq });
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const s = get().socket;
    if (s) {
      s.disconnect();
      set({ socket: null, activeRoom: null, isConnected: false, members: [], cursors: new Map() });
    }
  },

  joinRoom: async (roomId: string) => {
    const s = get().socket;
    if (!s) return;

    return new Promise((resolve, reject) => {
      s.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId }, (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          set({
            activeRoom: response.room,
            members: response.room.members,
            lastSequence: response.lastSequence
          });

          // Set active map and annotations in editor
          const editor = useEditorStore.getState();
          editor.setCurrentMap(response.map);
          editor.setAnnotations(response.annotations);

          useNotificationStore.getState().showToast("success", "Connected to Room", `Room: ${response.room.name}`);
          resolve();
        }
      });
    });
  },

  leaveRoom: () => {
    const s = get().socket;
    if (s) {
      s.emit(SOCKET_EVENTS.LEAVE_ROOM);
    }
    set({ activeRoom: null, members: [], cursors: new Map() });
  },

  sendCursorMove: (lng: number, lat: number) => {
    const s = get().socket;
    if (s && get().activeRoom) {
      s.emit(SOCKET_EVENTS.CURSOR_MOVE, { lng, lat });
    }
  },

  submitOperation: async (type, targetId, payload) => {
    const s = get().socket;
    if (!s || !get().activeRoom) return;

    const opId = crypto.randomUUID ? crypto.randomUUID() : `op_${Date.now()}`;

    return new Promise((resolve, reject) => {
      s.emit(
        SOCKET_EVENTS.OPERATION_SUBMIT,
        {
          id: opId,
          type,
          targetId,
          payload
        },
        (ack: any) => {
          if (ack.error) {
            reject(new Error(ack.error));
          } else {
            set({ lastSequence: ack.seq });
            resolve();
          }
        }
      );
    });
  }
}));
