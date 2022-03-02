import * as path from 'path';
import { GlobPattern } from 'vscode';

export class CloveSettings {
    public readonly testProjectWsRelPath : string
    public readonly buildCommand : string | null;
    public readonly testExecPath : string;
    
    public readonly testExecBasePath : string;
    
    public readonly srcSuiteMarker: string;
    public readonly srcSuiteRegex: RegExp;
    public readonly srcTestMarker: string;
    public readonly srcTestRegex: RegExp;
    public readonly testProjectFileGlob: GlobPattern;

    constructor(private json : any) { 
        this.testProjectWsRelPath = json["testProjectWsRelPath"] ?? "";
        this.buildCommand = json["buildCommand"] ?? null;
        this.testExecPath = json["testExecPath"] ?? "";

        //CHECK IF SETTINGS ARE VALID
        this.testExecBasePath = path.dirname(this.testExecPath);

        this.testProjectFileGlob = this.testProjectWsRelPath + "**/*.c";

        this.srcSuiteMarker = "CLOVE_SUITE_NAME";
        this.srcSuiteRegex = /CLOVE_SUITE_NAME ([a-zA-Z0-9_]*)$/m;
        this.srcTestMarker = "CLOVE_TEST";
        this.srcTestRegex = /CLOVE_TEST\((\w.*)\)/gm;
    }
}