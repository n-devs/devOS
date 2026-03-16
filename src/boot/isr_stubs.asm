;; devOS - ISR and IRQ Assembly Stubs
;; Each ISR/IRQ pushes the interrupt number and calls the common handler.

extern isr_handler
extern irq_handler

;; Common ISR stub - saves registers, calls C handler, restores
isr_common_stub:
    pusha               ; Push edi, esi, ebp, esp, ebx, edx, ecx, eax
    mov ax, ds
    push eax            ; Save data segment

    mov ax, 0x10        ; Load kernel data segment
    mov ds, ax
    mov es, ax
    mov fs, ax
    mov gs, ax

    push esp            ; Push pointer to struct regs
    call isr_handler
    add esp, 4

    pop eax             ; Restore data segment
    mov ds, ax
    mov es, ax
    mov fs, ax
    mov gs, ax

    popa                ; Pop edi, esi, ebp, esp, ebx, edx, ecx, eax
    add esp, 8          ; Clean up error code and ISR number
    iret

;; Common IRQ stub
irq_common_stub:
    pusha
    mov ax, ds
    push eax

    mov ax, 0x10
    mov ds, ax
    mov es, ax
    mov fs, ax
    mov gs, ax

    push esp
    call irq_handler
    add esp, 4

    pop eax
    mov ds, ax
    mov es, ax
    mov fs, ax
    mov gs, ax

    popa
    add esp, 8
    iret

;; Macro for ISR without error code (pushes dummy 0)
%macro ISR_NOERRCODE 1
global isr%1
isr%1:
    push dword 0        ; Dummy error code
    push dword %1       ; Interrupt number
    jmp isr_common_stub
%endmacro

;; Macro for ISR with error code (CPU pushes error code automatically)
%macro ISR_ERRCODE 1
global isr%1
isr%1:
    push dword %1       ; Interrupt number
    jmp isr_common_stub
%endmacro

;; Macro for IRQ
%macro IRQ 2
global irq%1
irq%1:
    push dword 0        ; Dummy error code
    push dword %2       ; Interrupt number (32 + IRQ number)
    jmp irq_common_stub
%endmacro

;; CPU Exception ISRs (0-31)
ISR_NOERRCODE 0
ISR_NOERRCODE 1
ISR_NOERRCODE 2
ISR_NOERRCODE 3
ISR_NOERRCODE 4
ISR_NOERRCODE 5
ISR_NOERRCODE 6
ISR_NOERRCODE 7
ISR_ERRCODE   8
ISR_NOERRCODE 9
ISR_ERRCODE   10
ISR_ERRCODE   11
ISR_ERRCODE   12
ISR_ERRCODE   13
ISR_ERRCODE   14
ISR_NOERRCODE 15
ISR_NOERRCODE 16
ISR_ERRCODE   17
ISR_NOERRCODE 18
ISR_NOERRCODE 19
ISR_NOERRCODE 20
ISR_NOERRCODE 21
ISR_NOERRCODE 22
ISR_NOERRCODE 23
ISR_NOERRCODE 24
ISR_NOERRCODE 25
ISR_NOERRCODE 26
ISR_NOERRCODE 27
ISR_NOERRCODE 28
ISR_NOERRCODE 29
ISR_ERRCODE   30
ISR_NOERRCODE 31

;; Hardware IRQs (0-15 -> INT 32-47)
IRQ 0,  32
IRQ 1,  33
IRQ 2,  34
IRQ 3,  35
IRQ 4,  36
IRQ 5,  37
IRQ 6,  38
IRQ 7,  39
IRQ 8,  40
IRQ 9,  41
IRQ 10, 42
IRQ 11, 43
IRQ 12, 44
IRQ 13, 45
IRQ 14, 46
IRQ 15, 47
