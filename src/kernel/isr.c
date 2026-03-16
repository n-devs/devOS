/**
 * devOS Kernel - ISR Implementation
 * Sets up CPU exceptions and hardware IRQs via the PIC.
 */

#include "isr.h"
#include "idt.h"
#include "io.h"
#include "../drivers/vga.h"

static isr_handler_t isr_handlers[256];

/* Exception messages */
static const char *exception_messages[] = {
    "Division By Zero",
    "Debug",
    "Non Maskable Interrupt",
    "Breakpoint",
    "Into Detected Overflow",
    "Out of Bounds",
    "Invalid Opcode",
    "No Coprocessor",
    "Double Fault",
    "Coprocessor Segment Overrun",
    "Bad TSS",
    "Segment Not Present",
    "Stack Fault",
    "General Protection Fault",
    "Page Fault",
    "Unknown Interrupt",
    "Coprocessor Fault",
    "Alignment Check",
    "Machine Check",
    "Reserved", "Reserved", "Reserved", "Reserved", "Reserved",
    "Reserved", "Reserved", "Reserved", "Reserved", "Reserved",
    "Reserved", "Reserved", "Reserved"
};

/* Remap the PIC (Programmable Interrupt Controller) */
static void pic_remap(void) {
    /* Save masks */
    uint8_t a1 = inb(0x21);
    uint8_t a2 = inb(0xA1);

    /* Start initialization sequence */
    outb(0x20, 0x11); io_wait();
    outb(0xA0, 0x11); io_wait();

    /* Set vector offsets */
    outb(0x21, 0x20); io_wait();  /* Master PIC: IRQ 0-7  -> INT 32-39 */
    outb(0xA1, 0x28); io_wait();  /* Slave PIC:  IRQ 8-15 -> INT 40-47 */

    /* Tell Master PIC there's a slave at IRQ2 */
    outb(0x21, 0x04); io_wait();
    /* Tell Slave PIC its cascade identity */
    outb(0xA1, 0x02); io_wait();

    /* 8086 mode */
    outb(0x21, 0x01); io_wait();
    outb(0xA1, 0x01); io_wait();

    /* Restore masks */
    outb(0x21, a1);
    outb(0xA1, a2);
}

void isr_init(void) {
    /* Remap PIC */
    pic_remap();

    /* Set up CPU exception handlers (ISR 0-31) */
    idt_set_gate(0,  (uint32_t)isr0,  0x08, 0x8E);
    idt_set_gate(1,  (uint32_t)isr1,  0x08, 0x8E);
    idt_set_gate(2,  (uint32_t)isr2,  0x08, 0x8E);
    idt_set_gate(3,  (uint32_t)isr3,  0x08, 0x8E);
    idt_set_gate(4,  (uint32_t)isr4,  0x08, 0x8E);
    idt_set_gate(5,  (uint32_t)isr5,  0x08, 0x8E);
    idt_set_gate(6,  (uint32_t)isr6,  0x08, 0x8E);
    idt_set_gate(7,  (uint32_t)isr7,  0x08, 0x8E);
    idt_set_gate(8,  (uint32_t)isr8,  0x08, 0x8E);
    idt_set_gate(9,  (uint32_t)isr9,  0x08, 0x8E);
    idt_set_gate(10, (uint32_t)isr10, 0x08, 0x8E);
    idt_set_gate(11, (uint32_t)isr11, 0x08, 0x8E);
    idt_set_gate(12, (uint32_t)isr12, 0x08, 0x8E);
    idt_set_gate(13, (uint32_t)isr13, 0x08, 0x8E);
    idt_set_gate(14, (uint32_t)isr14, 0x08, 0x8E);
    idt_set_gate(15, (uint32_t)isr15, 0x08, 0x8E);
    idt_set_gate(16, (uint32_t)isr16, 0x08, 0x8E);
    idt_set_gate(17, (uint32_t)isr17, 0x08, 0x8E);
    idt_set_gate(18, (uint32_t)isr18, 0x08, 0x8E);
    idt_set_gate(19, (uint32_t)isr19, 0x08, 0x8E);
    idt_set_gate(20, (uint32_t)isr20, 0x08, 0x8E);
    idt_set_gate(21, (uint32_t)isr21, 0x08, 0x8E);
    idt_set_gate(22, (uint32_t)isr22, 0x08, 0x8E);
    idt_set_gate(23, (uint32_t)isr23, 0x08, 0x8E);
    idt_set_gate(24, (uint32_t)isr24, 0x08, 0x8E);
    idt_set_gate(25, (uint32_t)isr25, 0x08, 0x8E);
    idt_set_gate(26, (uint32_t)isr26, 0x08, 0x8E);
    idt_set_gate(27, (uint32_t)isr27, 0x08, 0x8E);
    idt_set_gate(28, (uint32_t)isr28, 0x08, 0x8E);
    idt_set_gate(29, (uint32_t)isr29, 0x08, 0x8E);
    idt_set_gate(30, (uint32_t)isr30, 0x08, 0x8E);
    idt_set_gate(31, (uint32_t)isr31, 0x08, 0x8E);

    /* Set up hardware IRQ handlers (IRQ 0-15 -> INT 32-47) */
    idt_set_gate(32, (uint32_t)irq0,  0x08, 0x8E);
    idt_set_gate(33, (uint32_t)irq1,  0x08, 0x8E);
    idt_set_gate(34, (uint32_t)irq2,  0x08, 0x8E);
    idt_set_gate(35, (uint32_t)irq3,  0x08, 0x8E);
    idt_set_gate(36, (uint32_t)irq4,  0x08, 0x8E);
    idt_set_gate(37, (uint32_t)irq5,  0x08, 0x8E);
    idt_set_gate(38, (uint32_t)irq6,  0x08, 0x8E);
    idt_set_gate(39, (uint32_t)irq7,  0x08, 0x8E);
    idt_set_gate(40, (uint32_t)irq8,  0x08, 0x8E);
    idt_set_gate(41, (uint32_t)irq9,  0x08, 0x8E);
    idt_set_gate(42, (uint32_t)irq10, 0x08, 0x8E);
    idt_set_gate(43, (uint32_t)irq11, 0x08, 0x8E);
    idt_set_gate(44, (uint32_t)irq12, 0x08, 0x8E);
    idt_set_gate(45, (uint32_t)irq13, 0x08, 0x8E);
    idt_set_gate(46, (uint32_t)irq14, 0x08, 0x8E);
    idt_set_gate(47, (uint32_t)irq15, 0x08, 0x8E);
}

void isr_register_handler(uint8_t n, isr_handler_t handler) {
    isr_handlers[n] = handler;
}

/* Called from assembly ISR stub */
void isr_handler(struct regs *r) {
    if (r->int_no < 32) {
        vga_set_color(VGA_COLOR_WHITE, VGA_COLOR_RED);
        vga_puts("\n KERNEL PANIC: ");
        vga_puts(exception_messages[r->int_no]);
        vga_puts("\n Error code: ");
        vga_put_hex(r->err_code);
        vga_puts("  EIP: ");
        vga_put_hex(r->eip);
        vga_puts("\n");
        vga_set_color(VGA_COLOR_LIGHT_GREY, VGA_COLOR_BLACK);

        /* Halt */
        for (;;) {
            __asm__ volatile ("cli; hlt");
        }
    }

    if (isr_handlers[r->int_no]) {
        isr_handlers[r->int_no](r);
    }
}

/* Called from assembly IRQ stub */
void irq_handler(struct regs *r) {
    /* Send EOI (End of Interrupt) to PICs */
    if (r->int_no >= 40) {
        outb(0xA0, 0x20); /* Slave PIC */
    }
    outb(0x20, 0x20); /* Master PIC */

    if (isr_handlers[r->int_no]) {
        isr_handlers[r->int_no](r);
    }
}
