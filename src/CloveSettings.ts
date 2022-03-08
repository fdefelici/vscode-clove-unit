import { timeStamp } from 'console';
import * as path from 'path';
import { GlobPattern } from 'vscode';

export class CloveSettings {
    public readonly testSourcesPath : string
    public readonly buildCommand : string | null;
    public readonly testExecPath : string;
    
    public readonly testExecBasePath : string;
    
    public readonly srcSuiteMarker: string;
    public readonly srcSuiteRegex: RegExp;
    public readonly srcTestMarker: string;
    public readonly srcTestRegex: RegExp;
    public readonly testProjectFileGlob: GlobPattern;

    private _isValid : boolean;

    constructor(private json : any) { 
        const testPrjPath = json["testSourcesPath"];
        const buldCommand = json["buildCommand"];
        const testExecPath = json["testExecPath"];

        if (testPrjPath !== undefined && testExecPath !== undefined) {
            this._isValid = true;
        } else {
            this._isValid = false;
        }
        
        this.testSourcesPath = testPrjPath ?? "";
        this.buildCommand = buldCommand ?? null;
        this.testExecPath = testExecPath ?? "";

        //CHECK IF SETTINGS ARE VALID
        this.testExecBasePath = path.dirname(this.testExecPath);

        this.testProjectFileGlob = this.testSourcesPath + "**/*.c";

        this.srcSuiteMarker = "CLOVE_SUITE_NAME";
        this.srcSuiteRegex = /CLOVE_SUITE_NAME ([a-zA-Z0-9_]*)$/m;
        this.srcTestMarker = "CLOVE_TEST";
        this.srcTestRegex = /CLOVE_TEST\((\w.*)\)/gm;
    }

    public isValid() : boolean {
        return this._isValid;
    }
}