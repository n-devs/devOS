/**
 * devOS Kernel - Device Manager
 * Manages virtual devices: screen, keyboard, mouse, and custom devices.
 */

import { EventSystem } from "./EventSystem";

export enum DeviceType {
  SCREEN = "screen",
  KEYBOARD = "keyboard",
  MOUSE = "mouse",
  STORAGE = "storage",
  CUSTOM = "custom",
}

export enum DeviceState {
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  ERROR = "error",
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  state: DeviceState;
  properties: Record<string, unknown>;
}

export class DeviceManager {
  private devices: Map<string, Device> = new Map();
  private eventSystem: EventSystem;

  constructor(eventSystem: EventSystem) {
    this.eventSystem = eventSystem;
    this.initDefaultDevices();
  }

  private initDefaultDevices(): void {
    this.registerDevice({
      id: "screen-0",
      name: "Primary Display",
      type: DeviceType.SCREEN,
      state: DeviceState.CONNECTED,
      properties: {
        width: 1920,
        height: 1080,
        dpi: 96,
        colorDepth: 24,
      },
    });

    this.registerDevice({
      id: "keyboard-0",
      name: "Virtual Keyboard",
      type: DeviceType.KEYBOARD,
      state: DeviceState.CONNECTED,
      properties: {
        layout: "en-US",
        repeatRate: 30,
        repeatDelay: 500,
      },
    });

    this.registerDevice({
      id: "mouse-0",
      name: "Virtual Mouse",
      type: DeviceType.MOUSE,
      state: DeviceState.CONNECTED,
      properties: {
        x: 0,
        y: 0,
        buttons: 3,
        sensitivity: 1.0,
      },
    });

    this.registerDevice({
      id: "storage-0",
      name: "Virtual Disk",
      type: DeviceType.STORAGE,
      state: DeviceState.CONNECTED,
      properties: {
        totalSpace: 1024 * 1024 * 1024,
        usedSpace: 0,
        filesystem: "devFS",
      },
    });
  }

  registerDevice(device: Device): boolean {
    if (this.devices.has(device.id)) return false;

    this.devices.set(device.id, device);
    this.eventSystem.emit("device:registered", "DeviceManager", { id: device.id, name: device.name, type: device.type });
    return true;
  }

  unregisterDevice(id: string): boolean {
    const device = this.devices.get(id);
    if (!device) return false;

    this.devices.delete(id);
    this.eventSystem.emit("device:unregistered", "DeviceManager", { id, name: device.name });
    return true;
  }

  getDevice(id: string): Device | undefined {
    return this.devices.get(id);
  }

  getDevicesByType(type: DeviceType): Device[] {
    return Array.from(this.devices.values()).filter((d) => d.type === type);
  }

  getAllDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  setDeviceState(id: string, state: DeviceState): boolean {
    const device = this.devices.get(id);
    if (!device) return false;

    device.state = state;
    this.eventSystem.emit("device:state-changed", "DeviceManager", { id, name: device.name, state });
    return true;
  }

  setDeviceProperty(id: string, key: string, value: unknown): boolean {
    const device = this.devices.get(id);
    if (!device) return false;

    device.properties[key] = value;
    this.eventSystem.emit("device:property-changed", "DeviceManager", { id, key, value });
    return true;
  }

  updateMousePosition(x: number, y: number): void {
    const mouse = this.devices.get("mouse-0");
    if (mouse) {
      mouse.properties.x = x;
      mouse.properties.y = y;
    }
  }

  getScreenResolution(): { width: number; height: number } {
    const screen = this.devices.get("screen-0");
    if (!screen) return { width: 1920, height: 1080 };
    return {
      width: screen.properties.width as number,
      height: screen.properties.height as number,
    };
  }

  destroy(): void {
    this.devices.clear();
  }
}
