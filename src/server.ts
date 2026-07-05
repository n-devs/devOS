/**
 * devOS - Bun Server
 * Serves the GUI and provides WebSocket bridge to the kernel.
 */

import { Kernel } from "./kernel";
import path from "path";
import fs from "fs";

const kernel = new Kernel();

const GUI_DIR = path.join(import.meta.dir, "gui");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// Build client-side JS from TypeScript
async function buildClientScript(): Promise<string> {
  const result = await Bun.build({
    entrypoints: [path.join(GUI_DIR, "scripts", "main.ts")],
    minify: false,
    target: "browser",
  });

  if (!result.success) {
    console.error("[Server] Failed to build client script:", result.logs);
    return "console.error('Failed to build client script');";
  }

  const output = result.outputs[0];
  if (!output) {
    return "console.error('No build output');";
  }
  return await output.text();
}

let clientScript: string = "";

// Desktop icon definitions
const desktopIcons = [
  { name: "Terminal", icon: "⌨", action: "terminal" },
  { name: "Files", icon: "📁", action: "files" },
  { name: "Text Editor", icon: "📝", action: "editor" },
  { name: "Settings", icon: "⚙", action: "settings" },
  { name: "About", icon: "ℹ", action: "about" },
];

// Start menu apps
const startMenuApps = [
  { name: "Terminal", icon: "⌨", desc: "Command line interface", action: "terminal" },
  { name: "Files", icon: "📁", desc: "File manager", action: "files" },
  { name: "Text Editor", icon: "📝", desc: "Edit text files", action: "editor" },
  { name: "Settings", icon: "⚙", desc: "System settings", action: "settings" },
  { name: "About devOS", icon: "ℹ", desc: "System information", action: "about" },
];

// App content generators
function getAppContent(action: string): { title: string; content: string } {
  switch (action) {
    case "terminal":
      return {
        title: "Terminal",
        content: `
          <div style="background:#0a0a0a;color:#0f0;font-family:monospace;padding:12px;height:100%;font-size:13px;">
            <div>Welcome to devOS Terminal v0.1.0</div>
            <div style="margin-top:4px;">Type 'help' for available commands.</div>
            <div style="margin-top:8px;display:flex;align-items:center;">
              <span style="color:#4fc3f7;">user@devOS</span><span style="color:#888;">:</span><span style="color:#6cf;">~</span><span style="color:#888;">$ </span>
              <span style="animation:blink 1s infinite;">▌</span>
            </div>
          </div>
          <style>@keyframes blink{0%,50%{opacity:1}51%,100%{opacity:0}}</style>
        `,
      };
    case "files":
      return {
        title: "Files",
        content: `
          <div style="font-size:13px;">
            <div style="padding:8px 0;border-bottom:1px solid #333;margin-bottom:8px;color:#888;">
              📂 /home/user
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
              <div style="padding:6px 8px;border-radius:4px;cursor:pointer;display:flex;align-items:center;gap:8px;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                <span>📁</span> <span>Desktop</span>
              </div>
              <div style="padding:6px 8px;border-radius:4px;cursor:pointer;display:flex;align-items:center;gap:8px;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                <span>📁</span> <span>Documents</span>
              </div>
              <div style="padding:6px 8px;border-radius:4px;cursor:pointer;display:flex;align-items:center;gap:8px;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                <span>📁</span> <span>Downloads</span>
              </div>
            </div>
          </div>
        `,
      };
    case "editor":
      return {
        title: "Text Editor",
        content: `
          <div style="height:100%;display:flex;flex-direction:column;">
            <div style="padding:4px 8px;background:#252525;border-bottom:1px solid #333;font-size:12px;color:#888;">
              Untitled.txt
            </div>
            <textarea style="flex:1;background:#1a1a1a;color:#ddd;border:none;padding:12px;font-family:monospace;font-size:13px;resize:none;outline:none;width:100%;" placeholder="Start typing..."></textarea>
          </div>
        `,
      };
    case "settings":
      return {
        title: "Settings",
        content: `
          <div style="padding:8px;font-size:13px;">
            <h3 style="color:#4fc3f7;margin-bottom:16px;font-weight:500;">System Settings</h3>
            <div style="display:flex;flex-direction:column;gap:16px;">
              <div>
                <div style="color:#aaa;margin-bottom:4px;">Display</div>
                <div style="color:#666;font-size:12px;">Resolution: 1920 x 1080</div>
              </div>
              <div>
                <div style="color:#aaa;margin-bottom:4px;">Theme</div>
                <div style="color:#666;font-size:12px;">Dark (default)</div>
              </div>
              <div>
                <div style="color:#aaa;margin-bottom:4px;">Kernel</div>
                <div style="color:#666;font-size:12px;">devOS-kernel v0.1.0</div>
              </div>
            </div>
          </div>
        `,
      };
    case "about":
      return {
        title: "About devOS",
        content: `
          <div style="text-align:center;padding:32px 16px;">
            <div style="font-size:48px;margin-bottom:8px;">🖥</div>
            <h2 style="color:#4fc3f7;font-weight:600;margin-bottom:4px;">devOS</h2>
            <div style="color:#888;font-size:13px;margin-bottom:24px;">Version 0.1.0</div>
            <div style="color:#666;font-size:12px;line-height:1.6;">
              <div>A web-based operating system</div>
              <div>Built with Bun, HTML & CSS</div>
              <div style="margin-top:16px;">Kernel: devOS-kernel</div>
              <div>Runtime: Bun ${Bun.version}</div>
            </div>
          </div>
        `,
      };
    default:
      return {
        title: action,
        content: `<div style="padding:16px;color:#888;">Unknown application: ${action}</div>`,
      };
  }
}

// Handle WebSocket messages
function handleWSMessage(ws: { send: (data: string) => void }, msg: string): void {
  let parsed: { type: string; data: Record<string, unknown> };
  try {
    parsed = JSON.parse(msg);
  } catch {
    return;
  }

  const sendMsg = (type: string, data: Record<string, unknown>) => {
    ws.send(JSON.stringify({ type, data }));
  };

  const sendWindowsUpdate = () => {
    const windows = kernel.windows.getAllWindows().map((w) => ({
      id: w.id,
      pid: w.pid,
      title: w.title,
      rect: w.rect,
      isMinimized: w.isMinimized,
      isMaximized: w.isMaximized,
      isFocused: w.isFocused,
      zIndex: w.zIndex,
      content: w.content,
    }));

    for (const w of windows) {
      sendMsg("window:updated", w);
    }
    sendMsg("taskbar:update", { windows });
  };

  switch (parsed.type) {
    case "boot": {
      // Simulate boot sequence
      const phases = [
        { progress: 10, status: "Loading event system..." },
        { progress: 25, status: "Initializing devices..." },
        { progress: 40, status: "Mounting file system..." },
        { progress: 60, status: "Starting process manager..." },
        { progress: 80, status: "Initializing window manager..." },
        { progress: 95, status: "Starting system services..." },
        { progress: 100, status: "Boot complete!" },
      ];

      kernel.boot().then(() => {
        let i = 0;
        const interval = setInterval(() => {
          if (i < phases.length) {
            const phase = phases[i];
            if (phase) {
              sendMsg("boot:progress", phase);
            }
            i++;
          } else {
            clearInterval(interval);
            sendMsg("boot:complete", {});
          }
        }, 400);
      });
      break;
    }

    case "get:desktop-icons":
      sendMsg("desktop:icons", { icons: desktopIcons });
      break;

    case "get:start-menu-apps":
      sendMsg("start-menu:apps", { apps: startMenuApps });

      // Render start menu apps on client
      sendMsg("desktop:start-menu-apps", { apps: startMenuApps });
      break;

    case "open:app": {
      const action = parsed.data.action as string;
      const app = getAppContent(action);
      const process = kernel.processes.createProcess(action);
      kernel.processes.startProcess(process.pid);
      const win = kernel.windows.createWindow(process.pid, app.title, {
        content: app.content,
        width: action === "terminal" ? 720 : 640,
        height: action === "terminal" ? 480 : 420,
      });
      sendWindowsUpdate();
      break;
    }

    case "window:close": {
      const id = parsed.data.id as string;
      const win = kernel.windows.getWindow(id);
      if (win) {
        kernel.processes.killProcess(win.pid);
        kernel.windows.closeWindow(id);
        sendMsg("window:closed", { id });
        sendWindowsUpdate();
      }
      break;
    }

    case "window:minimize": {
      const id = parsed.data.id as string;
      kernel.windows.minimizeWindow(id);
      sendWindowsUpdate();
      break;
    }

    case "window:maximize": {
      const id = parsed.data.id as string;
      kernel.windows.maximizeWindow(id);
      sendWindowsUpdate();
      break;
    }

    case "window:focus": {
      const id = parsed.data.id as string;
      kernel.windows.focusWindow(id);
      sendWindowsUpdate();
      break;
    }

    case "window:move": {
      const id = parsed.data.id as string;
      const x = parsed.data.x as number;
      const y = parsed.data.y as number;
      kernel.windows.moveWindow(id, x, y);
      const win = kernel.windows.getWindow(id);
      if (win) {
        sendMsg("window:updated", {
          id: win.id,
          pid: win.pid,
          title: win.title,
          rect: win.rect,
          isMinimized: win.isMinimized,
          isMaximized: win.isMaximized,
          isFocused: win.isFocused,
          zIndex: win.zIndex,
          content: win.content,
        });
      }
      break;
    }

    case "window:resize": {
      const id = parsed.data.id as string;
      const width = parsed.data.width as number;
      const height = parsed.data.height as number;
      kernel.windows.resizeWindow(id, width, height);
      const win = kernel.windows.getWindow(id);
      if (win) {
        sendMsg("window:updated", {
          id: win.id,
          pid: win.pid,
          title: win.title,
          rect: win.rect,
          isMinimized: win.isMinimized,
          isMaximized: win.isMaximized,
          isFocused: win.isFocused,
          zIndex: win.zIndex,
          content: win.content,
        });
      }
      break;
    }

    case "shutdown":
      kernel.shutdown().then(() => {
        sendMsg("shutdown", {});
      });
      break;

    case "restart":
      kernel.shutdown().then(() => {
        sendMsg("shutdown", {});
        // Re-create kernel internals would require re-instantiation
        // For now, notify client to reload
        setTimeout(() => {
          sendMsg("boot:progress", { progress: 0, status: "Restarting..." });
        }, 1000);
      });
      break;
  }
}

// Start server
async function startServer() {
  clientScript = await buildClientScript();

  const server = Bun.serve({
    port: 3000,
    async fetch(req, server) {
      const url = new URL(req.url);

      // WebSocket upgrade
      if (url.pathname === "/ws") {
        const upgraded = server.upgrade(req);
        if (upgraded) return undefined as unknown as Response;
        return new Response("WebSocket upgrade failed", { status: 400 });
      }

      // Serve built client JS
      if (url.pathname === "/scripts/main.js") {
        return new Response(clientScript, {
          headers: { "Content-Type": "application/javascript" },
        });
      }

      // Serve static files
      let filePath = path.join(GUI_DIR, url.pathname === "/" ? "index.html" : url.pathname);

      try {
        const file = Bun.file(filePath);
        if (await file.exists()) {
          const ext = path.extname(filePath);
          const contentType = MIME_TYPES[ext] || "application/octet-stream";
          return new Response(file, {
            headers: { "Content-Type": contentType },
          });
        }
      } catch {
        // File not found
      }

      return new Response("Not Found", { status: 404 });
    },
    websocket: {
      open(ws) {
        console.log("[Server] Client connected");
      },
      message(ws, message) {
        handleWSMessage(
          { send: (data: string) => ws.send(data) },
          typeof message === "string" ? message : new TextDecoder().decode(message)
        );
      },
      close(ws) {
        console.log("[Server] Client disconnected");
      },
    },
  });

  console.log(`[devOS] Server running at http://localhost:${server.port}`);
}

startServer();
