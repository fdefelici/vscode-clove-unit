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
    private suitesByItem : Map<vscode.TestItem, CloveSuite>; //WeakMap
    private suitesByName : Map<string, CloveSuite>;
    
    constructor() {
        this.suitesByUri = new Map();
        this.suitesByItem = new Map();
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
        if (!this.suitesByName.has(suite.getName())) return;
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

    public findByBasePath(path: string) : CloveSuite[] {
        const result = [] as CloveSuite[];
        this.suitesByName.forEach((value: CloveSuite, key: string) => {
            if (value.hasBasePath(path)) result.push(value);
        });
        return result;
    }

    public removeByUri(uri: vscode.Uri) {
        const found = this.findByUri(uri);
        if (!found) return;
        this.remove(found);
    }

    public asItems(): vscode.TestItem[] {
        return Array.from( this.suitesByItem.keys());
    }

    public clear() {
        this.suitesByUri.clear();
        this.suitesByItem.clear();
        this.suitesByName.clear();
    }
      
}