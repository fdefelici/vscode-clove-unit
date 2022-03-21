#ifndef SAMPLE_UTILS_H
#define SAMPLE_UTILS_H
 
#ifdef _WIN32
    #include <windows.h>
    #define sleep_secs(sec) Sleep(sec * 1000)
#else
    #include <unistd.h>
    #define sleep_secs(sec) sleep(sec)
#endif
#endif