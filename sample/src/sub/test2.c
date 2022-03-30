#define CLOVE_SUITE_NAME MySuite021
#include "clove-unit.h"
#include "sample-utils.h"

CLOVE_TEST(MyTest01) {
    sleep_secs(2);
    CLOVE_PASS();
} 
 CLOVE_TEST(MyTest02) {
    sleep_secs(1);
    CLOVE_PASS();
}

