import * as vscode from "vscode";
import * as fs from 'fs';
import * as path from 'path';
import { TextDecoder } from 'util';

const textDecoder = new TextDecoder('utf-8');

export class CloveFilesystem {

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

    public static workspacePathRelative(...paths: string[]) : string {
        let workspacePath = "";
        if (vscode.workspace.workspaceFolders !== undefined) {
          workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath; 
        }
        const fullPath = path.join(...paths);
        const startIndex = fullPath.indexOf(workspacePath) + workspacePath.length + 1;
        const result = fullPath.substring(startIndex);
        return result;
    }

    public static loadJsonFile(filePath: string) : any {
        const fileContents = fs.readFileSync(filePath);
        const json = JSON.parse(fileContents.toString());
        return json;
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
}