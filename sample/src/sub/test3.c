#define CLOVE_SUITE_NAME Test3
#include "clove-unit.h"

CLOVE_TEST(MyTest01) {
    Sleep(300);
    CLOVE_PASS();
} 
 
CLOVE_TEST(MyTest02) {
    Sleep(100);
    CLOVE_PASS();
}
