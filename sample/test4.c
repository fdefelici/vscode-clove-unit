#define CLOVE_SUITE_NAME MySuite04
#include "clove.h"

CLOVE_TEST(TestEscapeOnError) {
    const char* to_escape = "\"Hello\nWorld\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    CLOVE_STRING_EQ(to_escape, "");
}

