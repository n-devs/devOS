/**
 * devOS Kernel - Memory Manager Implementation
 * Bitmap-based physical page allocator + simple kernel heap.
 */

#include "memory.h"
#include "../lib/string.h"

/* Bitmap: 1 bit per page frame, 0 = free, 1 = used */
static uint32_t page_bitmap[MEMORY_MAP_SIZE / 32];
static uint32_t total_pages  = 0;
static uint32_t used_pages   = 0;

/* Kernel end symbol (defined by linker) */
extern uint32_t _kernel_end;

static inline void bitmap_set(uint32_t page) {
    page_bitmap[page / 32] |= (1 << (page % 32));
}

static inline void bitmap_clear(uint32_t page) {
    page_bitmap[page / 32] &= ~(1 << (page % 32));
}

static inline bool bitmap_test(uint32_t page) {
    return (page_bitmap[page / 32] & (1 << (page % 32))) != 0;
}

void memory_init(uint32_t mem_upper_kb) {
    /* Calculate total pages from upper memory (starts at 1MB) */
    uint32_t mem_bytes = (mem_upper_kb + 1024) * 1024;
    total_pages = mem_bytes / PAGE_SIZE;
    if (total_pages > MEMORY_MAP_SIZE) {
        total_pages = MEMORY_MAP_SIZE;
    }

    /* Mark all pages as free */
    memset(page_bitmap, 0, sizeof(page_bitmap));
    used_pages = 0;

    /* Mark pages below kernel end as used (first 1MB + kernel) */
    uint32_t kernel_end_page = ((uint32_t)&_kernel_end) / PAGE_SIZE + 1;
    for (uint32_t i = 0; i < kernel_end_page; i++) {
        bitmap_set(i);
        used_pages++;
    }
}

void *pmm_alloc_page(void) {
    for (uint32_t i = 0; i < total_pages; i++) {
        if (!bitmap_test(i)) {
            bitmap_set(i);
            used_pages++;
            return (void *)(i * PAGE_SIZE);
        }
    }
    return NULL; /* Out of memory */
}

void pmm_free_page(void *addr) {
    uint32_t page = (uint32_t)addr / PAGE_SIZE;
    if (page < total_pages && bitmap_test(page)) {
        bitmap_clear(page);
        used_pages--;
    }
}

uint32_t pmm_get_free_pages(void) {
    return total_pages - used_pages;
}

uint32_t pmm_get_total_pages(void) {
    return total_pages;
}

uint32_t pmm_get_used_pages(void) {
    return used_pages;
}

/* ===== Simple Kernel Heap Allocator ===== */

#define HEAP_START  0x00200000  /* 2 MB */
#define HEAP_SIZE   0x00100000  /* 1 MB heap */

struct heap_block {
    uint32_t size;
    bool     free;
    struct heap_block *next;
};

static struct heap_block *heap_head = NULL;

void heap_init(void) {
    heap_head = (struct heap_block *)HEAP_START;
    heap_head->size = HEAP_SIZE - sizeof(struct heap_block);
    heap_head->free = true;
    heap_head->next = NULL;
}

void *kmalloc(size_t size) {
    /* Align to 4 bytes */
    size = (size + 3) & ~3;

    struct heap_block *block = heap_head;
    while (block) {
        if (block->free && block->size >= size) {
            /* Split block if large enough */
            if (block->size >= size + sizeof(struct heap_block) + 4) {
                struct heap_block *new_block = (struct heap_block *)((uint8_t *)block + sizeof(struct heap_block) + size);
                new_block->size = block->size - size - sizeof(struct heap_block);
                new_block->free = true;
                new_block->next = block->next;
                block->size = size;
                block->next = new_block;
            }
            block->free = false;
            return (void *)((uint8_t *)block + sizeof(struct heap_block));
        }
        block = block->next;
    }
    return NULL; /* Out of heap memory */
}

void kfree(void *ptr) {
    if (!ptr) return;

    struct heap_block *block = (struct heap_block *)((uint8_t *)ptr - sizeof(struct heap_block));
    block->free = true;

    /* Coalesce adjacent free blocks */
    struct heap_block *current = heap_head;
    while (current) {
        if (current->free && current->next && current->next->free) {
            current->size += sizeof(struct heap_block) + current->next->size;
            current->next = current->next->next;
            continue; /* Check again in case of multiple adjacent free blocks */
        }
        current = current->next;
    }
}
