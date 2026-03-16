/**
 * devOS GUI - Main Client Script
 * Communicates with the kernel via WebSocket and renders the desktop environment.
 */

interface KernelMessage {
  type: string;
  data: Record<string, unknown>;
}

interface WindowInfo {
  id: string;
  pid: number;
  title: string;
  rect: { x: number; y: number; width: number; height: number };
  isMinimized: boolean;
  isMaximized: boolean;
  isFocused: boolean;
  zIndex: number;
  content: string;
}

class DevOSClient {
  private ws: WebSocket | null = null;
  private windows: Map<string, WindowInfo> = new Map();
  private dragState: {
    windowId: string;
    offsetX: number;
    offsetY: number;
  } | null = null;
  private resizeState: {
    windowId: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null = null;
  private startMenuOpen = false;
  private clockInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.connect();
  }

  private connect(): void {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    this.ws = new WebSocket(`${protocol}//${location.host}/ws`);

    this.ws.onopen = () => {
      console.log("[devOS] Connected to kernel");
      this.send({ type: "boot", data: {} });
    };

    this.ws.onmessage = (event) => {
      const msg: KernelMessage = JSON.parse(event.data);
      this.handleMessage(msg);
    };

    this.ws.onclose = () => {
      console.log("[devOS] Disconnected from kernel");
      setTimeout(() => this.connect(), 2000);
    };

    this.ws.onerror = (error) => {
      console.error("[devOS] WebSocket error:", error);
    };
  }

  private send(msg: KernelMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleMessage(msg: KernelMessage): void {
    switch (msg.type) {
      case "boot:progress":
        this.updateBootProgress(msg.data.progress as number, msg.data.status as string);
        break;
      case "boot:complete":
        this.onBootComplete();
        break;
      case "window:created":
      case "window:updated":
        this.renderWindow(msg.data as unknown as WindowInfo);
        break;
      case "window:closed":
        this.removeWindow(msg.data.id as string);
        break;
      case "windows:list":
        this.renderAllWindows(msg.data.windows as WindowInfo[]);
        break;
      case "taskbar:update":
        this.updateTaskbar(msg.data.windows as WindowInfo[]);
        break;
      case "desktop:icons":
        this.renderDesktopIcons(msg.data.icons as Array<{ name: string; icon: string; action: string }>);
        break;
      case "shutdown":
        this.onShutdown();
        break;
    }
  }

  private updateBootProgress(progress: number, status: string): void {
    const progressBar = document.getElementById("boot-progress");
    const statusEl = document.getElementById("boot-status");
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (statusEl) statusEl.textContent = status;
  }

  private onBootComplete(): void {
    const bootScreen = document.getElementById("boot-screen");
    const desktop = document.getElementById("desktop");
    const taskbar = document.getElementById("taskbar");
    const windowLayer = document.getElementById("window-layer");

    if (bootScreen) {
      bootScreen.classList.add("fade-out");
      setTimeout(() => {
        bootScreen.style.display = "none";
      }, 800);
    }

    if (desktop) desktop.style.display = "block";
    if (taskbar) taskbar.style.display = "flex";
    if (windowLayer) windowLayer.style.display = "block";

    this.startClock();
    this.setupEventListeners();
    this.send({ type: "get:desktop-icons", data: {} });
  }

  private onShutdown(): void {
    document.body.innerHTML = `
      <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;display:flex;align-items:center;justify-content:center;color:#666;font-family:system-ui;font-size:18px;">
        devOS has shut down.
      </div>
    `;
  }

  private renderDesktopIcons(icons: Array<{ name: string; icon: string; action: string }>): void {
    const container = document.getElementById("desktop-icons");
    if (!container) return;
    container.innerHTML = "";

    for (const icon of icons) {
      const el = document.createElement("div");
      el.className = "desktop-icon";
      el.innerHTML = `
        <div class="icon-image">${icon.icon}</div>
        <div class="icon-label">${icon.name}</div>
      `;
      el.addEventListener("dblclick", () => {
        this.send({ type: "open:app", data: { action: icon.action } });
      });
      container.appendChild(el);
    }
  }

  private renderWindow(info: WindowInfo): void {
    this.windows.set(info.id, info);
    let el = document.getElementById(`window-${info.id}`);

    if (!el) {
      el = document.createElement("div");
      el.id = `window-${info.id}`;
      el.className = "os-window";
      el.innerHTML = `
        <div class="window-titlebar" data-window-id="${info.id}">
          <div class="window-controls">
            <button class="window-control-btn window-btn-close" data-action="close" data-window-id="${info.id}"></button>
            <button class="window-control-btn window-btn-minimize" data-action="minimize" data-window-id="${info.id}"></button>
            <button class="window-control-btn window-btn-maximize" data-action="maximize" data-window-id="${info.id}"></button>
          </div>
          <div class="window-title">${info.title}</div>
        </div>
        <div class="window-body">${info.content}</div>
        <div class="window-resize-handle" data-window-id="${info.id}"></div>
      `;

      document.getElementById("window-layer")?.appendChild(el);

      // Window control buttons
      el.querySelectorAll(".window-control-btn").forEach((btn) => {
        btn.addEventListener("mousedown", (e) => {
          e.stopPropagation();
          const target = e.currentTarget as HTMLElement;
          const action = target.dataset.action;
          const windowId = target.dataset.windowId;
          if (action && windowId) {
            this.send({ type: `window:${action}`, data: { id: windowId } });
          }
        });
      });

      // Focus on click
      el.addEventListener("mousedown", () => {
        this.send({ type: "window:focus", data: { id: info.id } });
      });

      // Titlebar drag
      const titlebar = el.querySelector(".window-titlebar") as HTMLElement;
      titlebar.addEventListener("mousedown", (e) => {
        if ((e.target as HTMLElement).classList.contains("window-control-btn")) return;
        this.dragState = {
          windowId: info.id,
          offsetX: e.clientX - info.rect.x,
          offsetY: e.clientY - info.rect.y,
        };
      });

      // Resize handle
      const resizeHandle = el.querySelector(".window-resize-handle") as HTMLElement;
      resizeHandle.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.resizeState = {
          windowId: info.id,
          startX: e.clientX,
          startY: e.clientY,
          startWidth: info.rect.width,
          startHeight: info.rect.height,
        };
      });
    }

    // Update position and state
    el.style.left = `${info.rect.x}px`;
    el.style.top = `${info.rect.y}px`;
    el.style.width = `${info.rect.width}px`;
    el.style.height = `${info.rect.height}px`;
    el.style.zIndex = String(info.zIndex);

    el.classList.toggle("focused", info.isFocused);
    el.classList.toggle("maximized", info.isMaximized);
    el.classList.toggle("minimized", info.isMinimized);

    const titleEl = el.querySelector(".window-title");
    if (titleEl) titleEl.textContent = info.title;

    const bodyEl = el.querySelector(".window-body");
    if (bodyEl) bodyEl.innerHTML = info.content;
  }

  private renderAllWindows(windowList: WindowInfo[]): void {
    for (const w of windowList) {
      this.renderWindow(w);
    }
  }

  private removeWindow(id: string): void {
    this.windows.delete(id);
    const el = document.getElementById(`window-${id}`);
    if (el) el.remove();
  }

  private updateTaskbar(windowList: WindowInfo[]): void {
    const container = document.getElementById("taskbar-apps");
    if (!container) return;
    container.innerHTML = "";

    for (const w of windowList) {
      const btn = document.createElement("button");
      btn.className = `taskbar-app${w.isFocused ? " active" : ""}`;
      btn.innerHTML = `
        <span class="app-icon">◻</span>
        <span class="app-title">${w.title}</span>
      `;
      btn.addEventListener("click", () => {
        this.send({ type: "window:focus", data: { id: w.id } });
      });
      container.appendChild(btn);
    }
  }

  private startClock(): void {
    const updateClock = () => {
      const now = new Date();
      const clockEl = document.getElementById("taskbar-clock");
      if (!clockEl) return;
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const dateStr = now.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
      clockEl.innerHTML = `
        <div class="clock-time">${timeStr}</div>
        <div class="clock-date">${dateStr}</div>
      `;
    };
    updateClock();
    this.clockInterval = setInterval(updateClock, 1000);
  }

  private setupEventListeners(): void {
    // Mouse move for drag & resize
    document.addEventListener("mousemove", (e) => {
      if (this.dragState) {
        const x = e.clientX - this.dragState.offsetX;
        const y = e.clientY - this.dragState.offsetY;
        this.send({ type: "window:move", data: { id: this.dragState.windowId, x, y } });
      }
      if (this.resizeState) {
        const dx = e.clientX - this.resizeState.startX;
        const dy = e.clientY - this.resizeState.startY;
        const width = this.resizeState.startWidth + dx;
        const height = this.resizeState.startHeight + dy;
        this.send({ type: "window:resize", data: { id: this.resizeState.windowId, width, height } });
      }
    });

    document.addEventListener("mouseup", () => {
      this.dragState = null;
      this.resizeState = null;
    });

    // Start menu toggle
    const startBtn = document.getElementById("start-btn");
    startBtn?.addEventListener("click", () => {
      this.toggleStartMenu();
    });

    // Close start menu when clicking outside
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (this.startMenuOpen && !target.closest("#start-menu") && !target.closest("#start-btn")) {
        this.closeStartMenu();
      }
    });

    // Context menu on desktop
    const desktop = document.getElementById("desktop");
    desktop?.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.showContextMenu(e.clientX, e.clientY);
    });

    // Close context menu on click
    document.addEventListener("click", () => {
      this.hideContextMenu();
    });

    // Shutdown & restart
    document.getElementById("btn-shutdown")?.addEventListener("click", () => {
      this.send({ type: "shutdown", data: {} });
      this.closeStartMenu();
    });

    document.getElementById("btn-restart")?.addEventListener("click", () => {
      this.send({ type: "restart", data: {} });
      this.closeStartMenu();
    });
  }

  private toggleStartMenu(): void {
    const menu = document.getElementById("start-menu");
    if (!menu) return;
    this.startMenuOpen = !this.startMenuOpen;
    menu.classList.toggle("visible", this.startMenuOpen);
    if (this.startMenuOpen) {
      this.send({ type: "get:start-menu-apps", data: {} });
    }
  }

  private closeStartMenu(): void {
    const menu = document.getElementById("start-menu");
    if (menu) menu.classList.remove("visible");
    this.startMenuOpen = false;
  }

  private showContextMenu(x: number, y: number): void {
    const menu = document.getElementById("context-menu");
    if (!menu) return;

    menu.innerHTML = `
      <div class="context-menu-item" data-action="refresh">Refresh</div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" data-action="terminal">Open Terminal</div>
      <div class="context-menu-item" data-action="files">Open Files</div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" data-action="settings">Settings</div>
      <div class="context-menu-item" data-action="about">About devOS</div>
    `;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.add("visible");

    menu.querySelectorAll(".context-menu-item").forEach((item) => {
      item.addEventListener("click", () => {
        const action = (item as HTMLElement).dataset.action;
        if (action) {
          this.send({ type: "open:app", data: { action } });
        }
        this.hideContextMenu();
      });
    });
  }

  private hideContextMenu(): void {
    const menu = document.getElementById("context-menu");
    if (menu) menu.classList.remove("visible");
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new DevOSClient();
});
