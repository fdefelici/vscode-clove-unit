import { timeStamp } from 'console';
import * as path from 'path';
import { GlobPattern } from 'vscode';
import { CloveVersion } from './CloveVersion';
import { CloveFilesystem } from './CloveFilesystem';
export class CloveSettings {
    public readonly testSourcesPath : string
    public readonly buildCommand : string;
    public readonly testExecPath : string;

    public readonly testExecBasePath : string;
    public readonly testExecAbsPath : string;
    public readonly testSourcesAbsPath : string
    public readonly reportAbsPath : string;
    
    public readonly srcSuiteMarker: string;
    public readonly srcSuiteRegex: RegExp;
    public readonly srcTestMarker: string;
    public readonly srcTestRegex: RegExp;
    public readonly testFilesWsRelGlob: GlobPattern;

    public readonly supportedCloveVersion: CloveVersion;
    
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
        this.buildCommand = buldCommand ?? ""; //buildCommand is optional. NOTE: "" (empty string) is evaluated false within conditional
        this.testExecPath = testExecPath ?? "";

        this.testExecBasePath = path.dirname(this.testExecPath);

        
        this.testExecAbsPath = CloveFilesystem.ifRelativeConvertToWorkspaceAbsPath(this.testExecPath);
        this.reportAbsPath = CloveFilesystem.ifRelativeConvertToWorkspaceAbsPath(this.testExecBasePath, "vscode_clove_report.json");
        this.testSourcesAbsPath = CloveFilesystem.ifRelativeConvertToWorkspaceAbsPath(this.testSourcesPath);
        this.testFilesWsRelGlob = CloveFilesystem.workspacePathRelative(this.testSourcesAbsPath) + "/**/*.{c,cpp}";

        this.srcSuiteMarker = "CLOVE_SUITE_NAME";
        this.srcSuiteRegex = /CLOVE_SUITE_NAME ([a-zA-Z0-9_]*)$/m;
        this.srcTestMarker = "CLOVE_TEST";
        this.srcTestRegex = /CLOVE_TEST\((\w.*)\)/gm;

        this.supportedCloveVersion = new CloveVersion(2, 4, 0);
    }

    public isValid() : boolean {
        return this._isValid;
    }
}