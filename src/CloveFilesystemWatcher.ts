import * as vscode from "vscode";
import { CloveWatcherCooldownHandler } from "./CloveCooldownHandler";

class WatchHandler {
    public trigDate : Date;
    constructor(
        public funct : (...args: vscode.Uri[]) => any,
        public funct_ctx : any,
        ) 
    {
        this.trigDate = new Date();
        this.funct.bind(this.funct_ctx);
    }

    public run(...args: vscode.Uri[]) : any {
        return this.funct(...args);
    }
}

export class CloveFilesystemWatcher {

    private lastCreateDate : Date;
    private lastCreateUri : vscode.Uri | null;
    private lastTimeoutId : NodeJS.Timeout | null;

    private renameElapsedTime : number;
    private normalEventElapsed: number;

    private watcher : vscode.FileSystemWatcher;

    private changeCooler: CloveWatcherCooldownHandler;

    private createHandlers : WatchHandler[];
    private changeHandlers : WatchHandler[];
    private deleteHandlers : WatchHandler[];
    private renameHandlers : WatchHandler[];
    constructor(globPattern : vscode.GlobPattern, private onlyFolderFilter = false) {
        this.renameElapsedTime = 100; //ms
        this.normalEventElapsed = 1000; //1s
        
        this.lastCreateDate = new Date();
        this.lastCreateUri = null;
        this.lastTimeoutId = null;
        this.changeCooler = new CloveWatcherCooldownHandler();

        this.createHandlers = [];
        this.changeHandlers = [];
        this.deleteHandlers = [];
        this.renameHandlers = [];

        this.watcher = vscode.workspace.createFileSystemWatcher(globPattern);
    }

    public dispose() { 
        this.watcher.dispose();
    }

    public onDidCreate( funct: (uri: vscode.Uri) => any, funct_context?: any) : void {
        if (this.createHandlers.length == 0) {
            this.watcher.onDidCreate(uri => this.handleCreateEvent(uri));
        }
        funct_context = funct_context ?? this;
        const handler = new WatchHandler(funct, funct_context);
        this.createHandlers.push(handler);
    }

    public onDidDelete( funct: (uri: vscode.Uri) => any, funct_context?: any) : void {
        if (this.deleteHandlers.length == 0) {
            this.watcher.onDidDelete(uri => this.handleDeleteEvent(uri));
        }
        funct_context = funct_context ?? this;
        const handler = new WatchHandler(funct, funct_context);
        this.deleteHandlers.push(handler);
    }

    public onDidChange( funct: (uri: vscode.Uri) => any, funct_context?: any) : void {
        if (this.changeHandlers.length == 0) {
            this.watcher.onDidChange(uri => this.handleChangeEvent(uri));
        }
        funct_context = funct_context ?? this;
        const handler = new WatchHandler(funct, funct_context);
        this.changeHandlers.push(handler);
    }

    public onDidRename( funct: (uri_old: vscode.Uri, uri_new: vscode.Uri) => any, funct_context?: any) : void {
        if (this.createHandlers.length == 0) {
            this.watcher.onDidCreate(uri => this.handleCreateEvent(uri));
        }
        if (this.deleteHandlers.length == 0) {
            this.watcher.onDidDelete(uri => this.handleDeleteEvent(uri));
        }
    
        funct_context = funct_context ?? this;
        const handler = new WatchHandler(funct, funct_context);
        this.renameHandlers.push(handler);
    }

    private handleCreateEvent(uri: vscode.Uri) : void {
        if (this.onlyFolderFilter && !this.isDirectory(uri) ) return;
        
        this.lastCreateDate = new Date();
        this.lastCreateUri = uri;

        this.lastTimeoutId = setTimeout( () => {
            this.createHandlers.forEach( (each) => each.run(uri) );

            this.lastTimeoutId = null;
        },  this.normalEventElapsed);
    }

    private handleDeleteEvent(uri: vscode.Uri) : void {
        if (this.onlyFolderFilter && !this.isDirectory(uri) ) return;

        const now = new Date();

        const millisDiff = now.getTime() - this.lastCreateDate.getTime();
        if (millisDiff < this.renameElapsedTime) { 
            if (this.lastTimeoutId) clearTimeout(this.lastTimeoutId);
            this.renameHandlers.forEach( each => each.run(uri, this.lastCreateUri!) );
        } else {
            this.deleteHandlers.forEach( each => each.run(uri) );
        }
    }

    private handleChangeEvent(uri: vscode.Uri) {
        this.changeCooler.execute(() => this.changeHandlers.forEach( each => each.run(uri)) );
    }

    private isDirectory(uri : vscode.Uri) : boolean {
        if (uri.path.endsWith(".c")) return false;
        if (uri.path.endsWith(".cpp")) return false;
        return true;
    }
}