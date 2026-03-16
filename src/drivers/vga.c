/**
 * devOS - VGA Text Mode Driver Implementation
 */

#include "vga.h"
#include "../kernel/io.h"
#include "../lib/string.h"

static uint16_t *vga_buffer;
static int vga_col;
static int vga_row;
static uint8_t vga_color_attr;

static inline uint8_t vga_entry_color(uint8_t fg, uint8_t bg) {
    return fg | (bg << 4);
}

static inline uint16_t vga_entry(char c, uint8_t color) {
    return (uint16_t)c | ((uint16_t)color << 8);
}

void vga_init(void) {
    vga_buffer = (uint16_t *)VGA_MEMORY;
    vga_col = 0;
    vga_row = 0;
    vga_color_attr = vga_entry_color(VGA_COLOR_LIGHT_GREY, VGA_COLOR_BLACK);
    vga_clear();
}

void vga_clear(void) {
    for (int y = 0; y < VGA_HEIGHT; y++) {
        for (int x = 0; x < VGA_WIDTH; x++) {
            vga_buffer[y * VGA_WIDTH + x] = vga_entry(' ', vga_color_attr);
        }
    }
    vga_col = 0;
    vga_row = 0;
    vga_set_cursor(0, 0);
}

void vga_set_color(uint8_t fg, uint8_t bg) {
    vga_color_attr = vga_entry_color(fg, bg);
}

void vga_scroll(void) {
    /* Move all rows up by one */
    for (int y = 1; y < VGA_HEIGHT; y++) {
        for (int x = 0; x < VGA_WIDTH; x++) {
            vga_buffer[(y - 1) * VGA_WIDTH + x] = vga_buffer[y * VGA_WIDTH + x];
        }
    }
    /* Clear the last row */
    for (int x = 0; x < VGA_WIDTH; x++) {
        vga_buffer[(VGA_HEIGHT - 1) * VGA_WIDTH + x] = vga_entry(' ', vga_color_attr);
    }
    vga_row = VGA_HEIGHT - 1;
}

void vga_putchar(char c) {
    if (c == '\n') {
        vga_col = 0;
        vga_row++;
        if (vga_row >= VGA_HEIGHT) {
            vga_scroll();
        }
        vga_set_cursor(vga_col, vga_row);
        return;
    }

    if (c == '\r') {
        vga_col = 0;
        vga_set_cursor(vga_col, vga_row);
        return;
    }

    if (c == '\t') {
        vga_col = (vga_col + 4) & ~3;
        if (vga_col >= VGA_WIDTH) {
            vga_col = 0;
            vga_row++;
            if (vga_row >= VGA_HEIGHT) {
                vga_scroll();
            }
        }
        vga_set_cursor(vga_col, vga_row);
        return;
    }

    if (c == '\b') {
        if (vga_col > 0) {
            vga_col--;
            vga_buffer[vga_row * VGA_WIDTH + vga_col] = vga_entry(' ', vga_color_attr);
            vga_set_cursor(vga_col, vga_row);
        }
        return;
    }

    vga_buffer[vga_row * VGA_WIDTH + vga_col] = vga_entry(c, vga_color_attr);
    vga_col++;

    if (vga_col >= VGA_WIDTH) {
        vga_col = 0;
        vga_row++;
        if (vga_row >= VGA_HEIGHT) {
            vga_scroll();
        }
    }

    vga_set_cursor(vga_col, vga_row);
}

void vga_puts(const char *str) {
    while (*str) {
        vga_putchar(*str);
        str++;
    }
}

void vga_put_hex(uint32_t value) {
    char buf[16];
    utoa(value, buf, 16);
    vga_puts("0x");
    vga_puts(buf);
}

void vga_put_dec(int value) {
    char buf[16];
    itoa(value, buf, 10);
    vga_puts(buf);
}

void vga_set_cursor(int x, int y) {
    uint16_t pos = y * VGA_WIDTH + x;
    outb(0x3D4, 0x0F);
    outb(0x3D5, (uint8_t)(pos & 0xFF));
    outb(0x3D4, 0x0E);
    outb(0x3D5, (uint8_t)((pos >> 8) & 0xFF));
}

void vga_enable_cursor(uint8_t cursor_start, uint8_t cursor_end) {
    outb(0x3D4, 0x0A);
    outb(0x3D5, (inb(0x3D5) & 0xC0) | cursor_start);
    outb(0x3D4, 0x0B);
    outb(0x3D5, (inb(0x3D5) & 0xE0) | cursor_end);
}

void vga_disable_cursor(void) {
    outb(0x3D4, 0x0A);
    outb(0x3D5, 0x20);
}
