# devOS Makefile
# Builds the kernel and creates a bootable ISO

# Tools
CC      = gcc
AS      = nasm
LD      = ld

# Flags
CFLAGS  = -m32 -nostdlib -nostdinc -fno-builtin -fno-stack-protector \
          -nostartfiles -nodefaultlibs -Wall -Wextra -c -ffreestanding
ASFLAGS = -f elf32
LDFLAGS = -m elf_i386 -T linker.ld

# Directories
SRC_DIR   = src
BUILD_DIR = build
ISO_DIR   = iso

# Source files
ASM_SOURCES = $(SRC_DIR)/boot/boot.asm \
              $(SRC_DIR)/boot/gdt_flush.asm \
              $(SRC_DIR)/boot/idt_flush.asm \
              $(SRC_DIR)/boot/isr_stubs.asm

C_SOURCES   = $(SRC_DIR)/kernel/kernel.c \
              $(SRC_DIR)/kernel/gdt.c \
              $(SRC_DIR)/kernel/idt.c \
              $(SRC_DIR)/kernel/isr.c \
              $(SRC_DIR)/kernel/memory.c \
              $(SRC_DIR)/drivers/vga.c \
              $(SRC_DIR)/drivers/keyboard.c \
              $(SRC_DIR)/lib/string.c

# Object files
ASM_OBJECTS = $(patsubst $(SRC_DIR)/%.asm, $(BUILD_DIR)/%.o, $(ASM_SOURCES))
C_OBJECTS   = $(patsubst $(SRC_DIR)/%.c, $(BUILD_DIR)/%.o, $(C_SOURCES))
OBJECTS     = $(ASM_OBJECTS) $(C_OBJECTS)

# Output
KERNEL_BIN = $(BUILD_DIR)/devos.bin
ISO_FILE   = $(BUILD_DIR)/devos.iso

.PHONY: all clean iso run

all: $(KERNEL_BIN)

# Build kernel binary
$(KERNEL_BIN): $(OBJECTS)
	$(LD) $(LDFLAGS) -o $@ $^

# Compile assembly files
$(BUILD_DIR)/%.o: $(SRC_DIR)/%.asm
	@mkdir -p $(dir $@)
	$(AS) $(ASFLAGS) -o $@ $<

# Compile C files
$(BUILD_DIR)/%.o: $(SRC_DIR)/%.c
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -o $@ $<

# Create bootable ISO
iso: $(KERNEL_BIN)
	cp $(KERNEL_BIN) $(ISO_DIR)/boot/devos.bin
	grub-mkrescue -o $(ISO_FILE) $(ISO_DIR)

# Run in QEMU
run: iso
	qemu-system-i386 -cdrom $(ISO_FILE)

# Run in QEMU without display (serial output)
run-nographic: iso
	qemu-system-i386 -cdrom $(ISO_FILE) -nographic

# Run in QEMU with curses display
run-curses: iso
	qemu-system-i386 -cdrom $(ISO_FILE) -curses

# Clean build artifacts
clean:
	rm -rf $(BUILD_DIR)/*
	rm -f $(ISO_DIR)/boot/devos.bin
