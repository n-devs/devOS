/**
 * devOS - Keyboard Driver Implementation
 * PS/2 keyboard with scancode set 1.
 */

#include "keyboard.h"
#include "../kernel/io.h"
#include "../kernel/isr.h"

/* Circular buffer for keyboard input */
static char kb_buffer[KEYBOARD_BUFFER_SIZE];
static volatile int kb_read_idx  = 0;
static volatile int kb_write_idx = 0;

/* Modifier key states */
static bool shift_pressed = false;
static bool ctrl_pressed  = false;
static bool caps_lock     = false;

/* US keyboard layout - scancode to ASCII (lowercase) */
static const char scancode_to_ascii[] = {
    0,   27,  '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', '\b',
    '\t', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\n',
    0,   'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\'', '`',
    0,   '\\', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 0,
    '*', 0,   ' '
};

/* US keyboard layout - scancode to ASCII (uppercase / shifted) */
static const char scancode_to_ascii_shift[] = {
    0,   27,  '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '\b',
    '\t', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '{', '}', '\n',
    0,   'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ':', '"', '~',
    0,   '|', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '<', '>', '?', 0,
    '*', 0,   ' '
};

static void kb_buffer_push(char c) {
    int next = (kb_write_idx + 1) % KEYBOARD_BUFFER_SIZE;
    if (next != kb_read_idx) {
        kb_buffer[kb_write_idx] = c;
        kb_write_idx = next;
    }
}

static void keyboard_callback(struct regs *r) {
    (void)r;
    uint8_t scancode = inb(KEYBOARD_DATA_PORT);

    /* Key release (bit 7 set) */
    if (scancode & 0x80) {
        uint8_t released = scancode & 0x7F;
        /* Left/Right Shift release */
        if (released == 0x2A || released == 0x36) {
            shift_pressed = false;
        }
        /* Ctrl release */
        if (released == 0x1D) {
            ctrl_pressed = false;
        }
        return;
    }

    /* Special keys */
    switch (scancode) {
        case 0x2A: /* Left Shift */
        case 0x36: /* Right Shift */
            shift_pressed = true;
            return;
        case 0x1D: /* Ctrl */
            ctrl_pressed = true;
            return;
        case 0x3A: /* Caps Lock */
            caps_lock = !caps_lock;
            return;
    }

    /* Convert scancode to ASCII */
    if (scancode < sizeof(scancode_to_ascii)) {
        char c;
        bool use_upper = shift_pressed;

        /* Caps lock only affects letters */
        if (caps_lock && scancode >= 0x10 && scancode <= 0x32) {
            use_upper = !use_upper;
        }

        if (use_upper) {
            c = scancode_to_ascii_shift[scancode];
        } else {
            c = scancode_to_ascii[scancode];
        }

        if (c != 0) {
            kb_buffer_push(c);
        }
    }
}

void keyboard_init(void) {
    isr_register_handler(33, keyboard_callback); /* IRQ1 = INT 33 */
}

char keyboard_getchar(void) {
    while (kb_read_idx == kb_write_idx) {
        __asm__ volatile ("hlt"); /* Wait for interrupt */
    }
    char c = kb_buffer[kb_read_idx];
    kb_read_idx = (kb_read_idx + 1) % KEYBOARD_BUFFER_SIZE;
    return c;
}

bool keyboard_has_input(void) {
    return kb_read_idx != kb_write_idx;
}
