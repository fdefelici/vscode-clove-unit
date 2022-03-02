import * as vscode from 'vscode';
import { Executor } from './Executor';
import { CloveFilesystem } from './CloveFilesystem';
import { CloveSuite } from './CloveSuite';
import { CloveSuiteCollection } from './CloveSuiteCollection';
import { CloveSettings } from './CloveSettings';
import { CloveTestUI } from './CloveTestUI';

//export type MarkdownTestData = TestFile | TestHeading | TestCase;

export class CloveController {
  suiteCollection : CloveSuiteCollection;
  settings : CloveSettings;
  ctrl : vscode.TestController;
  constructor(private cloveUI: CloveTestUI, 
              private context: vscode.ExtensionContext) { 
    this.ctrl = cloveUI.ctrl;
    
    
    this.suiteCollection = new CloveSuiteCollection();

    const configPath = CloveFilesystem.workspacePath(".vscode", "clove.json");
    const configJson = CloveFilesystem.loadJsonFile(configPath);
    this.settings = new CloveSettings(configJson);
    
    context.subscriptions.push(this);
    context.subscriptions.push(cloveUI);
  }
  
  public dispose() {
    //do nothing
  }

  public activate() {
    //cloveUI.onLoad()
    this.cloveUI.onItemClick( async (item) => this.itemSelected(item));
    this.cloveUI.onRefreshBtnClick( async (token) => this.discoverSuites());
    this.cloveUI.onRunBtnClick( async (req, token) => this.runTests(req, token));
    
    this.discoverSuites();

    const watcher = vscode.workspace.createFileSystemWatcher(this.settings.testProjectFileGlob);
    watcher.onDidCreate(uri => this.onFileCreated(uri));
    watcher.onDidChange(uri => this.onFileWritten(uri)); //viene chiamato 2 volte?!?!
    watcher.onDidDelete(uri => this.onFileDeleted(uri));
    this.context.subscriptions.push(watcher);
  }


  public itemSelected(suiteItem : vscode.TestItem) : void {
    const suiteData = this.suiteCollection.findByItem(suiteItem);
    if (!suiteData) { console.error("Suite data not found for: " + suiteItem?.uri?.toString()); return; } 

    if (suiteData.hasTestLoaded()) return;
    suiteData.loadTestsFromDisk();
  }
  
  public async discoverSuites() {
    for (const uri of await vscode.workspace.findFiles(this.settings.testProjectFileGlob)) {
      if (this.suiteCollection.hasSuiteByUri(uri)) continue; //suite already discovered

      const [isSuite, name, text] = await this._parseTestSuite(uri);
      if (!isSuite) continue;

      this._create_suite_handler(uri, name!, text!); //Create Suite SE NON DUPLICATA
    }  

    //Load Tests from Already Opened Document in editor
    const count = vscode.workspace.textDocuments.length;
    for (const document of vscode.workspace.textDocuments) {
      if (!isTestSuite(document)) continue;
      const suite = this._get_suite(document.uri); //solo GET. La suite deve esistere a questo punto 
      if (suite) {
        suite.loadTestsFromDocument(document);
      }
    }


  }

  private _create_suite_handler(uri : vscode.Uri, name : string, text : string) : CloveSuite | undefined {
    
    if (this.suiteCollection.hasSuiteNamed(name)) {
      vscode.window.showErrorMessage(`Suite already exists with this name: "${name}" at "${uri.fsPath}"`);
      return undefined;
    }
    const textLines = text.split("\n"); //To use to find line numbers
    const desc = CloveFilesystem.workspacePathRelative(uri.path);
    const suiteItem = this.cloveUI.addSuiteItem(uri, name, desc, textLines.length, text.length);

    const suite = new CloveSuite(this.ctrl, suiteItem, this.settings);
    this.suiteCollection.add(suite);

    return suite;
}
/*
  private _create_suite(uri : vscode.Uri, text : string) : [boolean, CloveSuite | undefined] {
      const textLines = text.split("\n"); //To use to find line numbers

      //Create Suite Item: START
      const suiteRegex = this.settings.srcSuiteRegex;
      const suiteMatch = text.match(suiteRegex);
      //if (!suiteMatch) return;   //NON PUO SUCCEDERE PERCHE ENTRO QUI SOLO SE E' SICURO SIA UNA SUITE
      const suiteName = suiteMatch![1];

      if (this.suiteCollection.hasSuiteNamed(suiteName)) {
        vscode.window.showErrorMessage(`Suite already exists with this name: "${suiteName}" at "${uri.fsPath}"`);
        return [false, undefined];
      }
      const suiteItem = this.ctrl.createTestItem(uri.toString(), suiteName, uri);
      suiteItem.description =  CloveFilesystem.workspacePathRelative(uri.path);
      suiteItem.canResolveChildren = true; //enable: controller.resolveHandler when clicking on Suite Item
      suiteItem.range = new vscode.Range(0, 0, textLines.length, text.length);
      this.ctrl.items.add(suiteItem);

      const suiteData = new CloveSuite(this.ctrl, suiteItem, this.settings);
      this.suiteCollection.add(suiteData);

      return [true, suiteData];
  }
*/
  private _get_suite(uri : vscode.Uri) : CloveSuite | undefined {
    const suiteItem = this.ctrl.items.get(uri.toString());
    if (!suiteItem) return undefined;
    return this.suiteCollection.findByItem(suiteItem);
  }

  public async onFileCreated(uri : vscode.Uri) {
    const [isSuite, name, text] = await this._parseTestSuite(uri);
    if (!isSuite) return;

    this._create_suite_handler(uri, name!, text!); //just create suite if not already exists with same name
  }

  //Listen to file changes on filesystem
  //Implement update as Remove / Create to handle potential CLOVE_SUITE_NAME renaming
  public async onFileWritten(uri : vscode.Uri) {
    console.log("CALLED!");
    //this.suiteCollection.print();


    const [isSuite, name, text] = await this._parseTestSuite(uri);
    if (!isSuite) return;

    //Caso: File Copiato e incollato con la test suite dentro
    if (!this.suiteCollection.hasSuiteByUri(uri)) {
      const suite = this._create_suite_handler(uri, name!, text!); //nome duplicato gestito dal create
      suite!.loadTestsFromText(text!);
      return;
    }


    //Caso: Rinomina Suite  (attenzione a se becco nome suite gia esistente)
    if (!this.suiteCollection.hasSuiteNamed(name!)) {  //Rinomina verso nome nuovo
      const suite = this.suiteCollection.findByUri(uri)!;
      this.suiteCollection.remove(suite);

      suite.getItem().label = name!;
      //const suiteUpdated = new CloveSuite(this.ctrl, suiteItem, this.settings);
      this.suiteCollection.add(suite);
      return;
    }

/*    

    const suiteByName = this.suiteCollection.findByName(name!);
    const suiteByUri = this.suiteCollection.findByUri(uri)!;
    //if (suiteFound?.getItem() != suiteItem ) { //se non combacia allora sto usando un nome gia esistente
    if (suiteByName != suiteByUri ) { //se non combacia allora sto usando un nome gia esistente
      this.suiteCollection.remove(suiteByUri);
      this.cloveUI.removeSuiteItem(uri);
      this.cloveUI.showError(`Suite already exists with this name: "${name!}" at "${suiteByName?.getItem()?.uri?.fsPath}"`);
      return;
    }

    //Caso: Creazione/modifica/cancellazione dei test e basta
    suiteByName.loadTestsFromText(text!);
*/



    /* 
    //  NOTA: Non posso fare remove/create perche' ctrl.items non percepisce il cambiamento se fatto troppo velocemente e quindi
    //        non si aggiorna il Test Explorer.
    //Remove
    const suiteItem = this.ctrl.items.get(uri.toString());
    if (suiteItem) {
      this.suiteCollection.removeByItem(suiteItem);
      this.ctrl.items.delete(uri.toString());
    }
    
    //Create (again)
    const [created, suiteData] = this._create_suite(uri, text); 
    if (created) {
      //suiteData!.loadTestsFromText(text);
    }
    */
  }

  public async onFileDeleted(uri : vscode.Uri) {
    const suiteItem = this.ctrl.items.get(uri.toString());
    if (!suiteItem) return;
    this.suiteCollection.removeByItem(suiteItem);
    this.ctrl.items.delete(uri.toString());
  }

  //1) Run di tutti i test
  //2) Run di una singola Suite
  //3) Run di un singolo test
  public async runTests(request: vscode.TestRunRequest, token: vscode.CancellationToken) {
    //Could be: SuiteItem or TestCaseItem
    const selectedItems =  request.include ?? this.ctrl.items;

    const run = this.ctrl.createTestRun(request);
    //const queue = 
    //await enqueTests(request, run, queue);
    //await playTests(run, queue);

    //Load all Test Items for sure
    selectedItems.forEach( (item, _) => {
      const isTestCase = item.parent != undefined;
      if (isTestCase) {
        run.enqueued(item);
      } else {
        const suiteData = this.suiteCollection.findByItem(item);
        if (!suiteData!.hasTestLoaded()) {
          suiteData!.loadTestsFromDisk();
        }
        item.children.forEach( (testItem, _) => {
          run.enqueued(testItem);
        });
      }
    });

    //Build Tests
    console.log("BUILD STARTED!"); //run.appendOutput
    const workspacePath = CloveFilesystem.workspacePath();
    if (this.settings.buildCommand) {
      await Executor.aexec(this.settings.buildCommand, workspacePath)
        .catch(err => vscode.window.showErrorMessage(`Error on build command: ${this.settings.buildCommand}`)); 
    }
    console.log("BUILD FINISHED!");

    //Run Tests
    console.log("RUN STARTED: " + workspacePath);
    await Executor.aexec(this.settings.testExecPath + " json", workspacePath)
      .catch(err => vscode.window.showErrorMessage(`Error executing tests: ${this.settings.testExecPath}`)); 
    console.log("RUN FINISHED!!!");

    //Update Test Results
    const reportPath = CloveFilesystem.workspacePath(this.settings.testExecBasePath, "clove_report.json");
    const reportJson = CloveFilesystem.loadJsonFile(reportPath);
  
    selectedItems.forEach( (item, _) => {      
      const isTestCase = item.parent != undefined;
      
      let suiteName;
      let testItems : vscode.TestItem[] | vscode.TestItemCollection;
      if (isTestCase) {
        suiteName = item.parent!.label;
        testItems = [];
        testItems.push(item);
      } else {
        suiteName = item.label;
        testItems = item.children;
      }

      const reportSuite = reportJson.suites[suiteName];
      testItems.forEach( (testItem, _) => {
        if (token.isCancellationRequested) {
          run.skipped(testItem);
          return;
        }
        run.started(testItem);

        const testName = testItem.label;
        const report_test = reportSuite[testName];
        const testStatus = report_test.status;
        const duration = 100;
        if (testStatus == 1) {
          run.passed(testItem, duration);
        } else if (testStatus == 2) {
          //const message = vscode.TestMessage.diff(`Expected ${item.label}`, String(this.expected), String(actual));
          //PER ORA HO ELIMINATO "message"
          //const message = vscode.TestMessage.diff(report_test.message, "EXPECTED", "ACTUAL");
          //message.location = new vscode.Location(test_item.uri!, test_item.range!);

          const message = vscode.TestMessage.diff("CHE Messaggio?", report_test.expected, report_test.actual);
          message.location = new vscode.Location(testItem.uri!, new vscode.Range(report_test.line, 0, report_test.line, 1));
          run.failed(testItem, message, duration);
        } else if (testStatus == 3) {
          run.skipped(testItem);
        }
      });

    });

    run.end();
  }

  private async _parseTestSuite(uri: vscode.Uri) : Promise<[boolean, string | undefined, string | undefined ]> {
    const text = await CloveFilesystem.readUri(uri);
    const suiteRegex = this.settings.srcSuiteRegex;
    const suiteMatch = text.match(suiteRegex);
    if (!suiteMatch) return [false, undefined, undefined];
    const suiteName = suiteMatch![1];
    return [true, suiteName, text];
  }
}


function isTestSuite(doc: vscode.TextDocument) : boolean {
  if (doc.uri.scheme !== 'file') return false;

  const path = doc.uri.path;

  if (!doc.uri.path.endsWith('.c')) return false;
  const str = doc.getText();
  if (!doc.getText().includes("CLOVE_SUITE_NAME")) return false;
  return true;
}
