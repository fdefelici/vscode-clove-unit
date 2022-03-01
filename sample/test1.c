#define CLOVE_SUITE_NAME MySuite01
#include "clove.h"

CLOVE_TEST(First01Test) {
    int a = 1;
    int b = 1;
    CLOVE_INT_EQ(a, b);
}

CLOVE_TEST(SecondTest) {
    CLOVE_IS_TRUE(1);
}

CLOVE_TEST(FailTest) {
    CLOVE_FAIL();
}

CLOVE_TEST(IntTest) {
    CLOVE_INT_EQ(1, 2);
    CLOVE_INT_EQ(1, 1);
}

