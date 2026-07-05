/**
 * devOS Kernel - Window Manager
 * Manages GUI windows: create, focus, minimize, maximize, close, z-order.
 */

import { EventSystem } from "./EventSystem";

export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OSWindow {
  id: string;
  pid: number;
  title: string;
  rect: WindowRect;
  minSize: { width: number; height: number };
  isMinimized: boolean;
  isMaximized: boolean;
  isVisible: boolean;
  isFocused: boolean;
  zIndex: number;
  resizable: boolean;
  draggable: boolean;
  content: string;
}

export class WindowManager {
  private windows: Map<string, OSWindow> = new Map();
  private nextWindowId: number = 1;
  private topZIndex: number = 100;
  private eventSystem: EventSystem;

  constructor(eventSystem: EventSystem) {
    this.eventSystem = eventSystem;
  }

  createWindow(pid: number, title: string, options: Partial<WindowRect & { resizable: boolean; draggable: boolean; content: string }> = {}): OSWindow {
    const id = `win-${this.nextWindowId++}`;
    const window: OSWindow = {
      id,
      pid,
      title,
      rect: {
        x: options.x ?? 100 + (this.windows.size * 30),
        y: options.y ?? 100 + (this.windows.size * 30),
        width: options.width ?? 640,
        height: options.height ?? 480,
      },
      minSize: { width: 200, height: 150 },
      isMinimized: false,
      isMaximized: false,
      isVisible: true,
      isFocused: true,
      zIndex: ++this.topZIndex,
      resizable: options.resizable ?? true,
      draggable: options.draggable ?? true,
      content: options.content ?? "",
    };

    // Unfocus all other windows
    for (const w of this.windows.values()) {
      w.isFocused = false;
    }

    this.windows.set(id, window);
    this.eventSystem.emit("window:created", "WindowManager", { id, pid, title });
    return window;
  }

  closeWindow(id: string): boolean {
    const window = this.windows.get(id);
    if (!window) return false;

    this.windows.delete(id);
    this.eventSystem.emit("window:closed", "WindowManager", { id, pid: window.pid, title: window.title });
    return true;
  }

  focusWindow(id: string): boolean {
    const window = this.windows.get(id);
    if (!window) return false;

    for (const w of this.windows.values()) {
      w.isFocused = false;
    }

    window.isFocused = true;
    window.zIndex = ++this.topZIndex;
    window.isMinimized = false;
    this.eventSystem.emit("window:focused", "WindowManager", { id, title: window.title });
    return true;
  }

  minimizeWindow(id: string): boolean {
    const window = this.windows.get(id);
    if (!window) return false;

    window.isMinimized = true;
    window.isFocused = false;
    this.eventSystem.emit("window:minimized", "WindowManager", { id, title: window.title });
    return true;
  }

  maximizeWindow(id: string): boolean {
    const window = this.windows.get(id);
    if (!window || !window.resizable) return false;

    if (window.isMaximized) {
      // Restore to previous size
      window.isMaximized = false;
      this.eventSystem.emit("window:restored", "WindowManager", { id, title: window.title });
    } else {
      window.isMaximized = true;
      this.eventSystem.emit("window:maximized", "WindowManager", { id, title: window.title });
    }

    return true;
  }

  moveWindow(id: string, x: number, y: number): boolean {
    const window = this.windows.get(id);
    if (!window || !window.draggable || window.isMaximized) return false;

    window.rect.x = x;
    window.rect.y = y;
    this.eventSystem.emit("window:moved", "WindowManager", { id, x, y });
    return true;
  }

  resizeWindow(id: string, width: number, height: number): boolean {
    const window = this.windows.get(id);
    if (!window || !window.resizable || window.isMaximized) return false;

    window.rect.width = Math.max(width, window.minSize.width);
    window.rect.height = Math.max(height, window.minSize.height);
    this.eventSystem.emit("window:resized", "WindowManager", { id, width: window.rect.width, height: window.rect.height });
    return true;
  }

  setWindowContent(id: string, content: string): boolean {
    const window = this.windows.get(id);
    if (!window) return false;

    window.content = content;
    this.eventSystem.emit("window:content-updated", "WindowManager", { id });
    return true;
  }

  getWindow(id: string): OSWindow | undefined {
    return this.windows.get(id);
  }

  getFocusedWindow(): OSWindow | undefined {
    for (const window of this.windows.values()) {
      if (window.isFocused) return window;
    }
    return undefined;
  }

  getWindowsByPid(pid: number): OSWindow[] {
    return Array.from(this.windows.values()).filter((w) => w.pid === pid);
  }

  getAllWindows(): OSWindow[] {
    return Array.from(this.windows.values()).sort((a, b) => a.zIndex - b.zIndex);
  }

  getVisibleWindows(): OSWindow[] {
    return this.getAllWindows().filter((w) => w.isVisible && !w.isMinimized);
  }

  closeWindowsByPid(pid: number): void {
    for (const window of this.getWindowsByPid(pid)) {
      this.closeWindow(window.id);
    }
  }

  destroy(): void {
    this.windows.clear();
    this.nextWindowId = 1;
    this.topZIndex = 100;
  }
}
