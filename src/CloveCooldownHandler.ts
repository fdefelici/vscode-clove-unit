import * as vscode from "vscode";

//Event can be triggered multiple time with just pressing CTRL+S 
//so this class help to introduce a cooldown between repeated calls
export class CloveWatcherCooldownHandler {

    private last : Date;
    private coolMillis : number;
    constructor() {
        this.last = new Date();
        this.coolMillis = 1000; //1s
    }

    public execute( uri: vscode.Uri, funct: (uri: vscode.Uri) => any, funct_context: any) : void {
        const now = new Date();
        const millisDiff = now.getTime() - this.last.getTime();
        if (millisDiff < this.coolMillis) return;
        
        this.last = now;
        funct = funct.bind(funct_context);
        funct(uri);
    }

}