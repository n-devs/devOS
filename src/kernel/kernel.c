/**
 * devOS Kernel - Main Entry Point
 * Initializes all subsystems and enters the kernel main loop.
 */

#include "types.h"
#include "gdt.h"
#include "idt.h"
#include "isr.h"
#include "memory.h"
#include "../drivers/vga.h"
#include "../drivers/keyboard.h"
#include "../lib/string.h"

/* Multiboot info structure (partial) */
struct multiboot_info {
    uint32_t flags;
    uint32_t mem_lower;
    uint32_t mem_upper;
    /* ... more fields we don't use yet */
};

#define MULTIBOOT_MAGIC 0x2BADB002

static void print_banner(void) {
    vga_set_color(VGA_COLOR_LIGHT_CYAN, VGA_COLOR_BLACK);
    vga_puts("      _           ___  ____  \n");
    vga_puts("   __| | _____   _/ _ \\/ ___| \n");
    vga_puts("  / _` |/ _ \\ \\ / / | | \\___ \\ \n");
    vga_puts(" | (_| |  __/\\ V /| |_| |___) |\n");
    vga_puts("  \\__,_|\\___| \\_/  \\___/|____/ \n");
    vga_puts("\n");
    vga_set_color(VGA_COLOR_LIGHT_GREY, VGA_COLOR_BLACK);
}

static void print_system_info(uint32_t mem_upper) {
    vga_set_color(VGA_COLOR_LIGHT_GREEN, VGA_COLOR_BLACK);
    vga_puts(" devOS v0.1.0");
    vga_set_color(VGA_COLOR_DARK_GREY, VGA_COLOR_BLACK);
    vga_puts(" | ");
    vga_set_color(VGA_COLOR_LIGHT_GREY, VGA_COLOR_BLACK);
    vga_puts("Kernel built with C/C++ + NASM\n");

    vga_set_color(VGA_COLOR_DARK_GREY, VGA_COLOR_BLACK);
    vga_puts(" Memory: ");
    vga_set_color(VGA_COLOR_WHITE, VGA_COLOR_BLACK);
    vga_put_dec((mem_upper + 1024) / 1024);
    vga_puts(" MB total, ");
    vga_put_dec(pmm_get_free_pages() * 4 / 1024);
    vga_puts(" MB free (");
    vga_put_dec(pmm_get_free_pages());
    vga_puts(" pages)\n");

    vga_set_color(VGA_COLOR_DARK_GREY, VGA_COLOR_BLACK);
    vga_puts(" Kernel: ");
    vga_set_color(VGA_COLOR_WHITE, VGA_COLOR_BLACK);
    vga_put_dec(pmm_get_used_pages() * 4);
    vga_puts(" KB used (");
    vga_put_dec(pmm_get_used_pages());
    vga_puts(" pages)\n\n");

    vga_set_color(VGA_COLOR_LIGHT_GREY, VGA_COLOR_BLACK);
}

static void shell_prompt(void) {
    vga_set_color(VGA_COLOR_LIGHT_CYAN, VGA_COLOR_BLACK);
    vga_puts("devOS");
    vga_set_color(VGA_COLOR_DARK_GREY, VGA_COLOR_BLACK);
    vga_puts(":");
    vga_set_color(VGA_COLOR_LIGHT_BLUE, VGA_COLOR_BLACK);
    vga_puts("~");
    vga_set_color(VGA_COLOR_DARK_GREY, VGA_COLOR_BLACK);
    vga_puts("$ ");
    vga_set_color(VGA_COLOR_WHITE, VGA_COLOR_BLACK);
}

static void handle_command(const char *cmd) {
    if (strcmp(cmd, "help") == 0) {
        vga_set_color(VGA_COLOR_LIGHT_GREEN, VGA_COLOR_BLACK);
        vga_puts("Available commands:\n");
        vga_set_color(VGA_COLOR_LIGHT_GREY, VGA_COLOR_BLACK);
        vga_puts("  help     - Show this help message\n");
        vga_puts("  clear    - Clear the screen\n");
        vga_puts("  info     - Show system information\n");
        vga_puts("  mem      - Show memory usage\n");
        vga_puts("  version  - Show kernel version\n");
        vga_puts("  halt     - Halt the system\n");
    } else if (strcmp(cmd, "clear") == 0) {
        vga_clear();
    } else if (strcmp(cmd, "info") == 0) {
        vga_set_color(VGA_COLOR_LIGHT_CYAN, VGA_COLOR_BLACK);
        vga_puts("devOS v0.1.0\n");
        vga_set_color(VGA_COLOR_LIGHT_GREY, VGA_COLOR_BLACK);
        vga_puts("  Kernel:    devOS-kernel (C/C++ + NASM)\n");
        vga_puts("  Arch:      i386 (x86 32-bit)\n");
        vga_puts("  GUI:       V8 + HTML/CSS (planned)\n");
        vga_puts("  Boot:      Multiboot / GRUB\n");
    } else if (strcmp(cmd, "mem") == 0) {
        vga_set_color(VGA_COLOR_LIGHT_GREEN, VGA_COLOR_BLACK);
        vga_puts("Memory Info:\n");
        vga_set_color(VGA_COLOR_LIGHT_GREY, VGA_COLOR_BLACK);
        vga_puts("  Total pages: ");
        vga_put_dec(pmm_get_total_pages());
        vga_puts(" (");
        vga_put_dec(pmm_get_total_pages() * 4 / 1024);
        vga_puts(" MB)\n");
        vga_puts("  Used pages:  ");
        vga_put_dec(pmm_get_used_pages());
        vga_puts(" (");
        vga_put_dec(pmm_get_used_pages() * 4);
        vga_puts(" KB)\n");
        vga_puts("  Free pages:  ");
        vga_put_dec(pmm_get_free_pages());
        vga_puts(" (");
        vga_put_dec(pmm_get_free_pages() * 4 / 1024);
        vga_puts(" MB)\n");
    } else if (strcmp(cmd, "version") == 0) {
        vga_puts("devOS kernel v0.1.0\n");
    } else if (strcmp(cmd, "halt") == 0) {
        vga_set_color(VGA_COLOR_LIGHT_RED, VGA_COLOR_BLACK);
        vga_puts("System halted.\n");
        __asm__ volatile ("cli; hlt");
    } else if (strlen(cmd) > 0) {
        vga_set_color(VGA_COLOR_LIGHT_RED, VGA_COLOR_BLACK);
        vga_puts("Unknown command: ");
        vga_set_color(VGA_COLOR_WHITE, VGA_COLOR_BLACK);
        vga_puts(cmd);
        vga_puts("\n");
        vga_set_color(VGA_COLOR_DARK_GREY, VGA_COLOR_BLACK);
        vga_puts("Type 'help' for available commands.\n");
    }
    vga_set_color(VGA_COLOR_LIGHT_GREY, VGA_COLOR_BLACK);
}

void kernel_main(uint32_t magic, struct multiboot_info *mbi) {
    /* Initialize VGA text mode */
    vga_init();

    /* Verify multiboot */
    if (magic != MULTIBOOT_MAGIC) {
        vga_set_color(VGA_COLOR_WHITE, VGA_COLOR_RED);
        vga_puts("ERROR: Not loaded by a Multiboot-compliant bootloader!\n");
        return;
    }

    /* Initialize GDT */
    gdt_init();
    vga_set_color(VGA_COLOR_DARK_GREY, VGA_COLOR_BLACK);
    vga_puts(" [OK] GDT initialized\n");

    /* Initialize IDT */
    idt_init();
    vga_puts(" [OK] IDT initialized\n");

    /* Initialize ISRs and IRQs */
    isr_init();
    vga_puts(" [OK] ISR/IRQ handlers installed\n");

    /* Initialize memory manager */
    memory_init(mbi->mem_upper);
    heap_init();
    vga_puts(" [OK] Memory manager initialized\n");

    /* Initialize keyboard */
    keyboard_init();
    vga_puts(" [OK] Keyboard driver loaded\n");

    /* Enable interrupts */
    __asm__ volatile ("sti");
    vga_puts(" [OK] Interrupts enabled\n\n");

    /* Print banner */
    print_banner();
    print_system_info(mbi->mem_upper);

    vga_set_color(VGA_COLOR_DARK_GREY, VGA_COLOR_BLACK);
    vga_puts(" Type 'help' for available commands.\n\n");

    /* Simple shell loop */
    char cmd_buffer[256];
    int cmd_pos = 0;

    shell_prompt();

    while (1) {
        char c = keyboard_getchar();

        if (c == '\n') {
            vga_putchar('\n');
            cmd_buffer[cmd_pos] = '\0';
            handle_command(cmd_buffer);
            cmd_pos = 0;
            shell_prompt();
        } else if (c == '\b') {
            if (cmd_pos > 0) {
                cmd_pos--;
                vga_putchar('\b');
            }
        } else if (cmd_pos < 255) {
            cmd_buffer[cmd_pos++] = c;
            vga_putchar(c);
        }
    }
}
