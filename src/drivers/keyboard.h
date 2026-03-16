/**
 * devOS - Keyboard Driver (PS/2)
 */

#ifndef DEVOS_KEYBOARD_H
#define DEVOS_KEYBOARD_H

#include "../kernel/types.h"

#define KEYBOARD_DATA_PORT   0x60
#define KEYBOARD_STATUS_PORT 0x64
#define KEYBOARD_BUFFER_SIZE 256

void keyboard_init(void);
char keyboard_getchar(void);
bool keyboard_has_input(void);

#endif /* DEVOS_KEYBOARD_H */
