#define CLOVE_SUITE_NAME MySuite011
#include "clove-unit.h"

CLOVE_TEST(FirstTest) {
    int a = 1;
    int b = 1;
    CLOVE_INT_EQ(a, b);
}

CLOVE_TEST(SecondTest) {
    CLOVE_IS_TRUE(false);
    CLOVE_IS_TRUE(true);
}

CLOVE_TEST(ThirdTest) {
    CLOVE_SIZET_GT(1, 2);
}



