/**
 * devOS Kernel - Virtual File System
 * In-memory file system with directory tree, file CRUD, and path resolution.
 */

import { EventSystem } from "./EventSystem";

export enum FileType {
  FILE = "file",
  DIRECTORY = "directory",
}

export interface FileNode {
  name: string;
  type: FileType;
  content: string;
  children: Map<string, FileNode>;
  createdAt: number;
  modifiedAt: number;
  permissions: string;
  size: number;
}

export class FileSystem {
  private root: FileNode;
  private eventSystem: EventSystem;

  constructor(eventSystem: EventSystem) {
    this.eventSystem = eventSystem;
    this.root = this.createDirectoryNode("/");
    this.initDefaultStructure();
  }

  private createDirectoryNode(name: string): FileNode {
    return {
      name,
      type: FileType.DIRECTORY,
      content: "",
      children: new Map(),
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      permissions: "rwxr-xr-x",
      size: 0,
    };
  }

  private createFileNode(name: string, content: string = ""): FileNode {
    return {
      name,
      type: FileType.FILE,
      content,
      children: new Map(),
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      permissions: "rw-r--r--",
      size: content.length,
    };
  }

  private initDefaultStructure(): void {
    this.mkdir("/home");
    this.mkdir("/home/user");
    this.mkdir("/home/user/Desktop");
    this.mkdir("/home/user/Documents");
    this.mkdir("/home/user/Downloads");
    this.mkdir("/system");
    this.mkdir("/system/apps");
    this.mkdir("/system/config");
    this.mkdir("/tmp");

    this.writeFile("/system/config/os.json", JSON.stringify({
      name: "devOS",
      version: "0.1.0",
      kernel: "devOS-kernel",
      shell: "devOS-shell",
    }, null, 2));

    this.writeFile("/home/user/Desktop/welcome.txt", "Welcome to devOS!\nYour new operating system powered by Bun.");
  }

  private resolvePath(path: string): string[] {
    const normalized = path.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
    if (normalized === "/") return [];
    return normalized.split("/").filter(Boolean);
  }

  private getNode(path: string): FileNode | null {
    const parts = this.resolvePath(path);
    let current = this.root;

    for (const part of parts) {
      if (current.type !== FileType.DIRECTORY) return null;
      const child = current.children.get(part);
      if (!child) return null;
      current = child;
    }

    return current;
  }

  private getParentAndName(path: string): { parent: FileNode; name: string } | null {
    const parts = this.resolvePath(path);
    if (parts.length === 0) return null;

    const name = parts.pop()!;
    let current = this.root;

    for (const part of parts) {
      if (current.type !== FileType.DIRECTORY) return null;
      const child = current.children.get(part);
      if (!child) return null;
      current = child;
    }

    if (current.type !== FileType.DIRECTORY) return null;
    return { parent: current, name };
  }

  mkdir(path: string): boolean {
    const result = this.getParentAndName(path);
    if (!result) return false;

    const { parent, name } = result;
    if (parent.children.has(name)) return false;

    parent.children.set(name, this.createDirectoryNode(name));
    parent.modifiedAt = Date.now();
    this.eventSystem.emit("fs:mkdir", "FileSystem", { path });
    return true;
  }

  writeFile(path: string, content: string): boolean {
    const result = this.getParentAndName(path);
    if (!result) return false;

    const { parent, name } = result;
    const existing = parent.children.get(name);

    if (existing && existing.type === FileType.DIRECTORY) return false;

    if (existing) {
      existing.content = content;
      existing.modifiedAt = Date.now();
      existing.size = content.length;
    } else {
      parent.children.set(name, this.createFileNode(name, content));
    }

    parent.modifiedAt = Date.now();
    this.eventSystem.emit("fs:write", "FileSystem", { path, size: content.length });
    return true;
  }

  readFile(path: string): string | null {
    const node = this.getNode(path);
    if (!node || node.type !== FileType.FILE) return null;
    this.eventSystem.emit("fs:read", "FileSystem", { path });
    return node.content;
  }

  readDir(path: string): string[] | null {
    const node = this.getNode(path);
    if (!node || node.type !== FileType.DIRECTORY) return null;
    return Array.from(node.children.keys());
  }

  exists(path: string): boolean {
    return this.getNode(path) !== null;
  }

  isDirectory(path: string): boolean {
    const node = this.getNode(path);
    return node !== null && node.type === FileType.DIRECTORY;
  }

  isFile(path: string): boolean {
    const node = this.getNode(path);
    return node !== null && node.type === FileType.FILE;
  }

  delete(path: string): boolean {
    const result = this.getParentAndName(path);
    if (!result) return false;

    const { parent, name } = result;
    if (!parent.children.has(name)) return false;

    parent.children.delete(name);
    parent.modifiedAt = Date.now();
    this.eventSystem.emit("fs:delete", "FileSystem", { path });
    return true;
  }

  stat(path: string): Omit<FileNode, "children" | "content"> | null {
    const node = this.getNode(path);
    if (!node) return null;
    return {
      name: node.name,
      type: node.type,
      createdAt: node.createdAt,
      modifiedAt: node.modifiedAt,
      permissions: node.permissions,
      size: node.size,
    };
  }

  copy(src: string, dest: string): boolean {
    const srcNode = this.getNode(src);
    if (!srcNode || srcNode.type !== FileType.FILE) return false;
    return this.writeFile(dest, srcNode.content);
  }

  move(src: string, dest: string): boolean {
    if (!this.copy(src, dest)) return false;
    return this.delete(src);
  }

  getTree(path: string = "/", depth: number = Infinity): object | null {
    const node = this.getNode(path);
    if (!node) return null;

    const buildTree = (n: FileNode, currentDepth: number): object => {
      const result: Record<string, unknown> = {
        name: n.name,
        type: n.type,
      };

      if (n.type === FileType.DIRECTORY && currentDepth < depth) {
        const children: object[] = [];
        for (const child of n.children.values()) {
          children.push(buildTree(child, currentDepth + 1));
        }
        result.children = children;
      }

      return result;
    };

    return buildTree(node, 0);
  }

  destroy(): void {
    this.root = this.createDirectoryNode("/");
  }
}
