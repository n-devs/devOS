# devOS

A custom operating system built from scratch.

- **Kernel**: C/C++ + NASM (x86 32-bit)
- **GUI** (planned): V8 JavaScript engine + HTML/CSS renderer

## Requirements

- `gcc` (with 32-bit support)
- `nasm`
- `grub-mkrescue`, `xorriso`, `mtools`
- `qemu-system-i386` (for testing)

## Build

```bash
make        # Build the kernel
make iso    # Create bootable ISO
make run    # Run in QEMU
```

## Project Structure

```
src/
  boot/       - Bootloader & assembly stubs (Multiboot, GDT/IDT flush, ISR stubs)
  kernel/     - Kernel core (GDT, IDT, ISR, memory manager)
  drivers/    - Hardware drivers (VGA, keyboard)
  lib/        - Utility libraries (string functions)
linker.ld     - Linker script
iso/          - GRUB boot configuration
```
