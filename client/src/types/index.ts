export * from "@mapforge/shared";

export type EditorTool =
  | "select"
  | "marker"
  | "icon"
  | "dot"
  | "text"
  | "freehand"
  | "line"
  | "polygon"
  | "eraser";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

export interface EditorCommand {
  description: string;
  execute: () => void;
  undo: () => void;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
  duration?: number;
}
