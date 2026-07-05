/**
 * devOS Kernel - Process Manager
 * Manages processes (applications) lifecycle: create, run, suspend, resume, kill.
 */

import { EventSystem } from "./EventSystem";

export enum ProcessState {
  CREATED = "created",
  RUNNING = "running",
  SUSPENDED = "suspended",
  TERMINATED = "terminated",
}

export interface Process {
  pid: number;
  name: string;
  state: ProcessState;
  priority: number;
  createdAt: number;
  parentPid: number | null;
  metadata: Record<string, unknown>;
}

export class ProcessManager {
  private processes: Map<number, Process> = new Map();
  private nextPid: number = 1;
  private eventSystem: EventSystem;

  constructor(eventSystem: EventSystem) {
    this.eventSystem = eventSystem;
  }

  createProcess(name: string, parentPid: number | null = null, metadata: Record<string, unknown> = {}): Process {
    const pid = this.nextPid++;
    const process: Process = {
      pid,
      name,
      state: ProcessState.CREATED,
      priority: 0,
      createdAt: Date.now(),
      parentPid,
      metadata,
    };

    this.processes.set(pid, process);
    this.eventSystem.emit("process:created", "ProcessManager", { pid, name });
    return process;
  }

  startProcess(pid: number): boolean {
    const process = this.processes.get(pid);
    if (!process) return false;
    if (process.state !== ProcessState.CREATED && process.state !== ProcessState.SUSPENDED) return false;

    process.state = ProcessState.RUNNING;
    this.eventSystem.emit("process:started", "ProcessManager", { pid, name: process.name });
    return true;
  }

  suspendProcess(pid: number): boolean {
    const process = this.processes.get(pid);
    if (!process) return false;
    if (process.state !== ProcessState.RUNNING) return false;

    process.state = ProcessState.SUSPENDED;
    this.eventSystem.emit("process:suspended", "ProcessManager", { pid, name: process.name });
    return true;
  }

  resumeProcess(pid: number): boolean {
    const process = this.processes.get(pid);
    if (!process) return false;
    if (process.state !== ProcessState.SUSPENDED) return false;

    process.state = ProcessState.RUNNING;
    this.eventSystem.emit("process:resumed", "ProcessManager", { pid, name: process.name });
    return true;
  }

  killProcess(pid: number): boolean {
    const process = this.processes.get(pid);
    if (!process) return false;
    if (process.state === ProcessState.TERMINATED) return false;

    process.state = ProcessState.TERMINATED;

    // Kill child processes
    for (const [childPid, childProcess] of this.processes) {
      if (childProcess.parentPid === pid && childProcess.state !== ProcessState.TERMINATED) {
        this.killProcess(childPid);
      }
    }

    this.eventSystem.emit("process:killed", "ProcessManager", { pid, name: process.name });
    return true;
  }

  getProcess(pid: number): Process | undefined {
    return this.processes.get(pid);
  }

  getProcessByName(name: string): Process | undefined {
    for (const process of this.processes.values()) {
      if (process.name === name && process.state !== ProcessState.TERMINATED) {
        return process;
      }
    }
    return undefined;
  }

  getRunningProcesses(): Process[] {
    return Array.from(this.processes.values()).filter(
      (p) => p.state === ProcessState.RUNNING
    );
  }

  getAllProcesses(): Process[] {
    return Array.from(this.processes.values()).filter(
      (p) => p.state !== ProcessState.TERMINATED
    );
  }

  getProcessCount(): number {
    return this.getAllProcesses().length;
  }

  setPriority(pid: number, priority: number): boolean {
    const process = this.processes.get(pid);
    if (!process) return false;
    process.priority = priority;
    return true;
  }

  destroy(): void {
    for (const [pid] of this.processes) {
      this.killProcess(pid);
    }
    this.processes.clear();
    this.nextPid = 1;
  }
}
