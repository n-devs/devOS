;; devOS - GDT Flush
;; Loads the GDT and reloads segment registers.

global gdt_flush

gdt_flush:
    mov eax, [esp + 4]     ; Get pointer to GDT
    lgdt [eax]             ; Load GDT

    ; Reload segment registers
    mov ax, 0x10           ; Kernel data segment (offset 0x10 = entry 2)
    mov ds, ax
    mov es, ax
    mov fs, ax
    mov gs, ax
    mov ss, ax

    ; Far jump to reload CS with kernel code segment (offset 0x08 = entry 1)
    jmp 0x08:.flush
.flush:
    ret
