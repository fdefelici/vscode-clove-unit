import * as vscode from "vscode";
import { CloveSuite } from "./CloveSuite";

export class CloveSuiteCollection {
    public print() {
        this.suitesByName.forEach((value: any, key: string) => {
            console.log(key);
        });

        this.suitesByUri.forEach((value: any, key: string) => {
            console.log(key);
        });
    }
    
    
    private suitesByUri : Map<string, CloveSuite>;
    private suitesByItem : WeakMap<vscode.TestItem, CloveSuite>;
    private suitesByName : Map<string, CloveSuite>;
    
    constructor() {
        this.suitesByUri = new Map();
        this.suitesByItem = new WeakMap();
        this.suitesByName = new Map();
    }
    
    public hasSuiteNamed(name : string) : boolean {
        return this.suitesByName.has(name);
    }
    
    public hasSuiteByUri(uri: vscode.Uri) : boolean {
      return this.suitesByUri.has(uri.toString());
    }
    
    public add(suite : CloveSuite) : void {
        this.suitesByUri.set(suite.getItem().uri!.toString(), suite);
        this.suitesByItem.set(suite.getItem(), suite);
        this.suitesByName.set(suite.getName(), suite);
    }

    public remove(suite: CloveSuite) {
        this.suitesByUri.delete(suite.getItem().uri!.toString());
        this.suitesByItem.delete(suite.getItem());
        this.suitesByName.delete(suite.getName());
    }

    public findByItem(item : vscode.TestItem) : CloveSuite | undefined {
        return this.suitesByItem.get(item);
    }

    public findByName(name : string) : CloveSuite | undefined {
        return this.suitesByName.get(name);
    }

    public findByUri(uri: vscode.Uri) : CloveSuite | undefined {
        return this.suitesByUri.get(uri.toString());
    }

    public removeByItem(item : vscode.TestItem) : void {
        const suite = this.findByItem(item);
        if (!suite) return;
        this.suitesByName.delete(suite.getName());
        this.suitesByItem.delete(item);
    }

}