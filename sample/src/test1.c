#define CLOVE_SUITE_NAME MySuite01
#include "clove-unit.h"

CLOVE_TEST(FirstTest) {
    int a = 1;
    int b = 1;
    Sleep(500);
    CLOVE_INT_EQ(a, b);
}

CLOVE_TEST(SecondTest) {
    CLOVE_IS_TRUE(false);
}



