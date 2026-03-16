;; devOS - Multiboot Boot Entry Point
;; Sets up the stack and jumps to the C kernel_main.

; Multiboot constants
MBALIGN  equ 1 << 0            ; Align loaded modules on page boundaries
MEMINFO  equ 1 << 1            ; Provide memory map
FLAGS    equ MBALIGN | MEMINFO ; Multiboot flags
MAGIC    equ 0x1BADB002        ; Multiboot magic number
CHECKSUM equ -(MAGIC + FLAGS)  ; Checksum (magic + flags + checksum = 0)

; Multiboot header (must be in the first 8KB of the kernel image)
section .multiboot
align 4
    dd MAGIC
    dd FLAGS
    dd CHECKSUM

; Stack
section .bss
align 16
stack_bottom:
    resb 16384                 ; 16 KB stack
stack_top:

; Entry point
section .text
global _start
extern kernel_main

_start:
    ; Set up the stack
    mov esp, stack_top

    ; Push multiboot info pointer and magic number
    push ebx                   ; Multiboot info structure pointer
    push eax                   ; Multiboot magic number

    ; Call the C kernel
    call kernel_main

    ; If kernel_main returns, halt the CPU
    cli
.hang:
    hlt
    jmp .hang
