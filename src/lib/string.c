/**
 * devOS - String Utilities Implementation
 */

#include "string.h"

void *memset(void *dest, int val, size_t count) {
    uint8_t *d = (uint8_t *)dest;
    for (size_t i = 0; i < count; i++) {
        d[i] = (uint8_t)val;
    }
    return dest;
}

void *memcpy(void *dest, const void *src, size_t count) {
    uint8_t *d = (uint8_t *)dest;
    const uint8_t *s = (const uint8_t *)src;
    for (size_t i = 0; i < count; i++) {
        d[i] = s[i];
    }
    return dest;
}

int memcmp(const void *s1, const void *s2, size_t count) {
    const uint8_t *a = (const uint8_t *)s1;
    const uint8_t *b = (const uint8_t *)s2;
    for (size_t i = 0; i < count; i++) {
        if (a[i] != b[i]) {
            return a[i] - b[i];
        }
    }
    return 0;
}

size_t strlen(const char *str) {
    size_t len = 0;
    while (str[len]) {
        len++;
    }
    return len;
}

int strcmp(const char *s1, const char *s2) {
    while (*s1 && (*s1 == *s2)) {
        s1++;
        s2++;
    }
    return *(const uint8_t *)s1 - *(const uint8_t *)s2;
}

int strncmp(const char *s1, const char *s2, size_t n) {
    for (size_t i = 0; i < n; i++) {
        if (s1[i] != s2[i]) {
            return (uint8_t)s1[i] - (uint8_t)s2[i];
        }
        if (s1[i] == '\0') {
            return 0;
        }
    }
    return 0;
}

char *strcpy(char *dest, const char *src) {
    char *d = dest;
    while ((*d++ = *src++));
    return dest;
}

char *strncpy(char *dest, const char *src, size_t n) {
    size_t i;
    for (i = 0; i < n && src[i] != '\0'; i++) {
        dest[i] = src[i];
    }
    for (; i < n; i++) {
        dest[i] = '\0';
    }
    return dest;
}

void itoa(int value, char *str, int base) {
    char *p = str;
    char *p1, *p2;
    uint32_t ud;
    int negative = 0;

    if (base == 10 && value < 0) {
        negative = 1;
        ud = (uint32_t)(-(value + 1)) + 1;
    } else {
        ud = (uint32_t)value;
    }

    do {
        uint32_t remainder = ud % base;
        *p++ = (remainder < 10) ? remainder + '0' : remainder + 'a' - 10;
    } while (ud /= base);

    if (negative) {
        *p++ = '-';
    }

    *p = '\0';

    /* Reverse the string */
    p1 = str;
    p2 = p - 1;
    while (p1 < p2) {
        char tmp = *p1;
        *p1 = *p2;
        *p2 = tmp;
        p1++;
        p2--;
    }
}

void utoa(uint32_t value, char *str, int base) {
    char *p = str;
    char *p1, *p2;

    do {
        uint32_t remainder = value % base;
        *p++ = (remainder < 10) ? remainder + '0' : remainder + 'a' - 10;
    } while (value /= base);

    *p = '\0';

    p1 = str;
    p2 = p - 1;
    while (p1 < p2) {
        char tmp = *p1;
        *p1 = *p2;
        *p2 = tmp;
        p1++;
        p2--;
    }
}
