/**
 * devOS Kernel - Physical Memory Manager
 * Simple bitmap-based page frame allocator.
 */

#ifndef DEVOS_MEMORY_H
#define DEVOS_MEMORY_H

#include "types.h"

#define PAGE_SIZE       4096
#define MEMORY_MAP_SIZE 32768  /* Supports up to 128 MB (32768 * 4096) */

void memory_init(uint32_t mem_upper_kb);
void *pmm_alloc_page(void);
void pmm_free_page(void *addr);
uint32_t pmm_get_free_pages(void);
uint32_t pmm_get_total_pages(void);
uint32_t pmm_get_used_pages(void);

/* Simple kernel heap allocator */
void *kmalloc(size_t size);
void kfree(void *ptr);
void heap_init(void);

#endif /* DEVOS_MEMORY_H */
