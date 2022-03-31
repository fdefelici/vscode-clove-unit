import * as vscode from "vscode";
import * as fs from 'fs';
import * as path from 'path';
import { TextDecoder } from 'util';
import { CloveFilesystemWatcher } from './CloveFilesystemWatcher';

const textDecoder = new TextDecoder('utf-8');

export class CloveFilesystem {

    //given sub paths create a workspace absolute path
    public static workspacePath(...paths: string[]) : string {
        let workspacePath = "";
        if (vscode.workspace.workspaceFolders !== undefined) {
          //const wf = vscode.workspace.workspaceFolders[0].uri.path;
          //const f = vscode.workspace.workspaceFolders[0].uri.fsPath; 
          workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath; 
        }
        workspacePath = path.join(workspacePath, ...paths);
        return workspacePath;
    }

    //given a workspace absolute path, return a workspace relative subpath
    public static workspacePathRelative(first : string, ...others: string[]) : string {
        const fullPath = path.join(first, ...others);
        if (!path.isAbsolute(fullPath)) return fullPath;
        return vscode.workspace.asRelativePath(fullPath);
    }

    public static ifRelativeConvertToWorkspaceAbsPath(first: string, ...others: string[]) : string {
        if (path.isAbsolute(first)) return path.join(first, ...others);
        return CloveFilesystem.workspacePath(first, ...others);
    }

    static pathExists(path: string) : boolean {
        return fs.existsSync(path);
    }

    static pathConcat(...paths: string[]) : string {
        return path.join(...paths);
    }

    public static loadJsonFile(filePath: string) : any {
        try {
            const fileContents = fs.readFileSync(filePath);
            const json = JSON.parse(fileContents.toString());
            return json;
        } catch (err) {
            return null;
        }
    }

    public static async readUri(uri: vscode.Uri) : Promise<string> {

        const getContentFromFilesystem = async (uri: vscode.Uri) => {
            try {
                const rawContent = await vscode.workspace.fs.readFile(uri);
                return textDecoder.decode(rawContent);
            } catch (e) {
                console.warn(`Error providing tests for ${uri.fsPath}`, e);
                return '';
            }   
        };

        return getContentFromFilesystem(uri);
    }

    public static createWatcher(globPattern : vscode.GlobPattern, onlyFolderFilter = false) : CloveFilesystemWatcher {
        return new CloveFilesystemWatcher(globPattern, onlyFolderFilter);
    }

    public static seemsFilePath(str : string) : boolean {
        const fileRegex = /^.*\.[^.\\/]+$/;
        return str.match(fileRegex) != null; 
    }

    public static seemsDirPath(str : string) : boolean {
        return !this.seemsFilePath(str);
    }
}