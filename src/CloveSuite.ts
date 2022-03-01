import * as vscode from "vscode";
import { CloveFilesystem } from './CloveFilesystem';
import { CloveSettings } from './CloveSettings';

export class CloveSuite {
    private _hasTestsLoaded : boolean;
    constructor(private ctrl : vscode.TestController, 
                private suiteItem : vscode.TestItem, 
                private settings : CloveSettings, 
    ) {
        this._hasTestsLoaded = false;
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

    public async loadTestsFromDisk() {
        const uri = this.suiteItem.uri;
        if (!uri) return;
        const text = await CloveFilesystem.readUri(uri);
        this.loadTestsFromText(text);
    }

    public loadTestsFromDocument(document : vscode.TextDocument) : void {
       this.loadTestsFromText(document.getText());
    }

    public loadTestsFromText(text: string) {
        this.suiteItem.busy = true;
        this._hasTestsLoaded = false;
        
        //const uri = document.uri;
        const uri = this.suiteItem.uri;
        
        //Clear Test list
        const testItems = [] as vscode.TestItem[];
        
        const testMacro = this.settings.srcTestMarker;
        const testRegex = this.settings.srcTestRegex;
        const testMatch = text.match(testRegex);
        if (!testMatch) {
            this.suiteItem.busy = false;
            this.suiteItem.children.replace(testItems);
            return;
        }
        
        for(let i=0; i < testMatch.length; ++i) {
            const testDecl = testMatch[i];
            const testName = testDecl.substring(testMacro.length+1, testDecl.length-1);        
            const testItem = this.ctrl.createTestItem(uri?.toString() + "/" + testName, testName, uri);
            //Settare Range per abilitare click e andare direttamente alla funzione di test
            //testItem.range
            testItems.push(testItem);
        }
        this.suiteItem.children.replace(testItems);

        this._hasTestsLoaded = true;
        this.suiteItem.busy = false;
    }
}