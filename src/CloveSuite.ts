import * as vscode from "vscode";

export class CloveSuite {
    private _hasTestsLoaded : boolean;
    private tests : string[];
    constructor(private suiteItem : vscode.TestItem,  
    ) {
        this._hasTestsLoaded = false;
        this.tests = [];
    }

    public setTestLoaded(loaded: boolean) {
        this._hasTestsLoaded = loaded;
        this.tests = [];
    }

    public getName() : string {
        return this.suiteItem.label;
    }

    public getItem() : vscode.TestItem {
        return this.suiteItem;
    }

    public hasTestLoaded() : boolean {
        return this._hasTestsLoaded;
    }

    public addTest(name : string) {
        this.tests.push(name);
    }

    public hasTest(name : string) : boolean {
        return this.tests.includes(name);
    }
 }