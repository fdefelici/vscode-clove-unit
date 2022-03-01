import * as vscode from "vscode";
import { CloveSuite } from "./CloveSuite";

export class CloveSuiteCollection {
    private suitesByItem : WeakMap<vscode.TestItem, CloveSuite>;
    private suitesByName : Map<string, CloveSuite>;

    constructor() {
        this.suitesByItem = new WeakMap();
        this.suitesByName = new Map();
    }

    public hasSuiteNamed(name : string) : boolean {
        return this.suitesByName.has(name);
    }

    public add(suite : CloveSuite) : void {
        this.suitesByItem.set(suite.getItem(), suite);
        this.suitesByName.set(suite.getName(), suite);
    }

    public findByItem(item : vscode.TestItem) : CloveSuite | undefined {
        return this.suitesByItem.get(item);
    }

    public findByName(name : string) : CloveSuite | undefined {
        return this.suitesByName.get(name);
    }

    public removeByItem(item : vscode.TestItem) : void {
        const suite = this.findByItem(item);
        if (!suite) return;
        this.suitesByName.delete(suite.getName());
        this.suitesByItem.delete(item);
    }

}