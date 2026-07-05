/**
 * devOS Kernel - Core
 * Main kernel that initializes and orchestrates all subsystems.
 * Handles boot sequence and system shutdown.
 */

import { EventSystem } from "./EventSystem";
import { ProcessManager } from "./ProcessManager";
import { FileSystem } from "./FileSystem";
import { WindowManager } from "./WindowManager";
import { DeviceManager } from "./DeviceManager";

export enum KernelState {
  OFF = "off",
  BOOTING = "booting",
  RUNNING = "running",
  SHUTTING_DOWN = "shutting_down",
}

export interface KernelInfo {
  name: string;
  version: string;
  state: KernelState;
  uptime: number;
  bootTime: number | null;
}

export class Kernel {
  readonly name = "devOS";
  readonly version = "0.1.0";

  private state: KernelState = KernelState.OFF;
  private bootTime: number | null = null;

  readonly events: EventSystem;
  readonly processes: ProcessManager;
  readonly fs: FileSystem;
  readonly windows: WindowManager;
  readonly devices: DeviceManager;

  constructor() {
    this.events = new EventSystem();
    this.processes = new ProcessManager(this.events);
    this.fs = new FileSystem(this.events);
    this.windows = new WindowManager(this.events);
    this.devices = new DeviceManager(this.events);
  }

  async boot(): Promise<boolean> {
    if (this.state !== KernelState.OFF) {
      console.warn("[Kernel] Already booted or booting.");
      return false;
    }

    this.state = KernelState.BOOTING;
    this.events.emit("kernel:booting", "Kernel", null);
    console.log("[Kernel] Booting devOS...");

    // Phase 1: Initialize event system
    console.log("[Kernel] Phase 1: Event system initialized.");
    this.events.emit("kernel:phase", "Kernel", { phase: 1, name: "EventSystem" });

    // Phase 2: Initialize device manager
    console.log("[Kernel] Phase 2: Device manager initialized.");
    this.events.emit("kernel:phase", "Kernel", { phase: 2, name: "DeviceManager" });

    // Phase 3: Initialize file system
    console.log("[Kernel] Phase 3: File system initialized.");
    this.events.emit("kernel:phase", "Kernel", { phase: 3, name: "FileSystem" });

    // Phase 4: Initialize process manager
    console.log("[Kernel] Phase 4: Process manager initialized.");
    this.events.emit("kernel:phase", "Kernel", { phase: 4, name: "ProcessManager" });

    // Phase 5: Initialize window manager
    console.log("[Kernel] Phase 5: Window manager initialized.");
    this.events.emit("kernel:phase", "Kernel", { phase: 5, name: "WindowManager" });

    // Phase 6: Start system process (PID 1)
    const initProcess = this.processes.createProcess("system", null, { role: "init" });
    this.processes.startProcess(initProcess.pid);
    console.log("[Kernel] Phase 6: System process started (PID 1).");
    this.events.emit("kernel:phase", "Kernel", { phase: 6, name: "SystemProcess" });

    // Boot complete
    this.bootTime = Date.now();
    this.state = KernelState.RUNNING;
    this.events.emit("kernel:ready", "Kernel", { bootTime: this.bootTime });
    console.log("[Kernel] Boot complete. devOS is ready.");

    return true;
  }

  async shutdown(): Promise<boolean> {
    if (this.state !== KernelState.RUNNING) {
      console.warn("[Kernel] Cannot shutdown: not running.");
      return false;
    }

    this.state = KernelState.SHUTTING_DOWN;
    this.events.emit("kernel:shutting-down", "Kernel", null);
    console.log("[Kernel] Shutting down...");

    // Close all windows
    for (const window of this.windows.getAllWindows()) {
      this.windows.closeWindow(window.id);
    }
    console.log("[Kernel] All windows closed.");

    // Kill all processes
    this.processes.destroy();
    console.log("[Kernel] All processes terminated.");

    // Cleanup subsystems
    this.windows.destroy();
    this.devices.destroy();
    this.fs.destroy();

    this.state = KernelState.OFF;
    this.bootTime = null;
    this.events.emit("kernel:shutdown", "Kernel", null);
    console.log("[Kernel] Shutdown complete.");

    this.events.destroy();
    return true;
  }

  getInfo(): KernelInfo {
    return {
      name: this.name,
      version: this.version,
      state: this.state,
      uptime: this.bootTime ? Date.now() - this.bootTime : 0,
      bootTime: this.bootTime,
    };
  }

  getState(): KernelState {
    return this.state;
  }

  isRunning(): boolean {
    return this.state === KernelState.RUNNING;
  }
}
