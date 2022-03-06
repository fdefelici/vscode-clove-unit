import * as vscode from 'vscode';

export class CloveTestUI {    
    public ctrl : vscode.TestController;
    onLoadHandler : () => Thenable<void> | void;
    onItemClickHandler : (item : vscode.TestItem) => Thenable<void> | void;
    constructor() {
        this.ctrl = vscode.tests.createTestController('CloveTestController', 'Clove Unit Test Controller');
        
        this.ctrl.resolveHandler = async (item) => {
            if (!item) this.onLoadHandler();
            else this.onItemClickHandler(item);
        };
        
        this.onLoadHandler = () => { /* empty function */};
        this.onItemClickHandler = (_) => { /* empty function */};
    }
    
    public dispose() {
        this.ctrl.dispose();
    }

    public clear() {
        this.ctrl.items.replace([]);
    }
  
    /**
     * First load (and visualization) of Test Explorer UI in VSCode editor
     */
    public onLoad( handler : () => Thenable<void> | void ) : void {
        this.onLoadHandler = handler;
    }
    
    public onItemClick( handler : (item : vscode.TestItem) => Thenable<void> | void ) : void {
        this.onItemClickHandler = handler;
    }
    
    public onRunBtnClick( handler: (request: vscode.TestRunRequest, token: vscode.CancellationToken) => Thenable<void> | void ) {
        this.ctrl.createRunProfile('Run Tests', vscode.TestRunProfileKind.Run, handler, true);
    }
    
    public onRefreshBtnClick( handler : (token: vscode.CancellationToken) => Thenable<void> | void) {
        this.ctrl.refreshHandler = handler;
    }
    
    public addSuiteItem(uri: vscode.Uri, label: string, desc: string, lines: number, byteSize: number) : vscode.TestItem {
        const suiteItem = this.ctrl.createTestItem(uri.toString(), label, uri);
        suiteItem.description =  desc;
        suiteItem.canResolveChildren = true; //enable: controller.resolveHandler when clicking on Suite Item
        suiteItem.range = new vscode.Range(0, 0, lines, byteSize);
        this.ctrl.items.add(suiteItem);
        return suiteItem;
    }
    
    public removeSuiteItem(uri: vscode.Uri) {
        const item = this.ctrl.items.get(uri.toString());
        if (!item) return;
        this.ctrl.items.delete(uri.toString());
    }

    public setSuiteTestItems(suiteItem: vscode.TestItem, 
                             testItems: [uri: vscode.Uri, name: string][] ) {
        const items = [] as vscode.TestItem[];
        if (testItems.length == 0) {
            suiteItem.children.replace(items);
            return;
        }

        testItems.forEach( each => { 
            const testItem = this.ctrl.createTestItem(each[0].toString() + "/" + each[1], each[1], each[0]);
            items.push(testItem);
        });

        suiteItem.children.replace(items);
    }
    
    public showError(message: string) {
        vscode.window.showErrorMessage(message);
    }
    
}