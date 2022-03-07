# CLove-Unit Testing Extension for VSCode

The CLove-Unit extension adds Testing support for [clove-unit](https://github.com/fdefelici/clove-unit) testing library for C/C++ language.

![Clove test run result](./sample/images/header.png)

## Extension Activation
In order to activate the extension:
1. handle a C/C++ testing project using `clove-unit` following the library development [guidelines and samples](https://github.com/fdefelici/clove-unit) in your workspace
1. create in your workspace folder the extension configuration file `.vscode/clove_unit_settings.json` (see `Extension Configuration`)
1. open the workspace folder with VSCode

## Extension Configuration
The extension needs the following configuration in the `.vscode/clove_unit_settings.json`

|Property|Description|
|--------|-----------|
| `testSourcesPath` | Workspace relative path to test sources |
| `buildCommand` | A shell command to build a test executable |
| `testExecPath` | The path to the test executable |


## Extension Usage
Here an example of project developed with `clove-unit` with related extension configuration.

> You can find this example project [here](./sample). 

### Filesystem
- .vscode/
	- clove_unit_settings.json
- bin/
	- test.exe (this will be produced when launching tests. Look at the Configuration.)
- include/
	- clove_unit.h
- src/
	- test1.c
	- test2.c

> NOTE: You can organize your project within the vscode workspace as you prefer. No constraints on this. 

### Configuration:
```json
//clove_unit_settings.json
{
    "testSourcesPath" : "src",
    "buildCommand" : "clang -I include -o bin\\test.exe src\\*.c",
    "testExecPath" : "bin\\test.exe"
}
```
> NOTE: You can use your own configuration and preferred build command. 

### Test UI:
Test UI will appear like this:

![Clove test run result](./sample/images/example.png)