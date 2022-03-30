import * as vscode from 'vscode';
import { Executor } from './Executor';
import { CloveFilesystem } from './CloveFilesystem';
import { CloveSuite } from './CloveSuite';
import { CloveSuiteCollection } from './CloveSuiteCollection';
import { CloveSettings } from './CloveSettings';
import { CloveTestUI } from './CloveTestUI';
import { CloveWatcherCooldownHandler } from './CloveCooldownHandler';
import { CloveVersion } from './CloveVersion';
//import { fstat } from 'fs';
import * as fs from 'fs';
import { CloveFilesystemWatcher } from './CloveFilesystemWatcher';

export class CloveController {
  suites : CloveSuiteCollection;
  settings : CloveSettings;
  ctrl : vscode.TestController;
  testSrcWatcher: vscode.FileSystemWatcher | null;
  settingsWatcher: vscode.FileSystemWatcher | null;
  isSettingsUpdating: boolean;
  settingsUpdateCooler: CloveWatcherCooldownHandler;
  testSrcUpdateCooler: CloveWatcherCooldownHandler;

  testSrcFileWatcher : CloveFilesystemWatcher | null;

  constructor(private cloveUI: CloveTestUI, 
              context: vscode.ExtensionContext) { 
    this.ctrl = cloveUI.ctrl;
    
    this.suites = new CloveSuiteCollection();
    this.settings = new CloveSettings({});
    this.isSettingsUpdating = false;
    this.settingsUpdateCooler = new CloveWatcherCooldownHandler();

    this.testSrcUpdateCooler = new CloveWatcherCooldownHandler();
    this.testSrcWatcher = null;
    this.settingsWatcher = null;

    this.testSrcFileWatcher = null;
    


    context.subscriptions.push(this);
  }
  
  public dispose() {
    this.testSrcWatcher?.dispose();
    this.settingsWatcher?.dispose();

    this.testSrcFileWatcher?.dispose();
    this.cloveUI.dispose();
  }

  //Activation events configured in package.json:
  //- when opening a C or C++ file
  //- when opening workspace with VScode already exists a clove_unit_settings.json
  public activate() {
    const settingsPath = CloveFilesystem.workspacePath(".vscode", "clove_unit_settings.json");
    if (CloveFilesystem.pathExists(settingsPath)) {
      this.reconfigure(settingsPath);
    } 
    
    this.settingsWatcher = vscode.workspace.createFileSystemWatcher(settingsPath);
    this.settingsWatcher.onDidCreate(uri => this.onSettingsCreated(uri));
    this.settingsWatcher.onDidChange(uri => this.settingsUpdateCooler.execute(this.onSettingsChanged, this, uri));
    this.settingsWatcher.onDidDelete(uri => this.onSettingsDeleted(uri));
  }

  private async reconfigure(settingPath: string) { 
    const configJson = CloveFilesystem.loadJsonFile(settingPath);
    if (!configJson) {
      this.cloveUI.showError("Invalid settings detected! Please fix it!");
      return;
    }

    const newSettings = new CloveSettings(configJson);
    if (!newSettings.isValid()) {
      this.cloveUI.showError("Invalid settings detected! Please fix it!");
      return;
    }

    const prevTestSrcPath = this.settings.isValid() ? this.settings.testSourcesPath : null;

    this.settings = newSettings;
    
    if ( this.settings.testSourcesPath != prevTestSrcPath) {
      this.cloveUI.clear();
      this.suites.clear();

      await this.discoverSuites();

      this.testSrcFileWatcher?.dispose();
      const testSourcesUri = vscode.Uri.file(CloveFilesystem.workspacePath(this.settings.testSourcesPath));
      const watchPattern = new vscode.RelativePattern(testSourcesUri, '**/*.{c,cpp}');
      this.testSrcFileWatcher = new CloveFilesystemWatcher(watchPattern);
      
    
      this.testSrcFileWatcher.onDidCreate(uri => console.log("File Created: " + uri.fsPath), this);
      this.testSrcFileWatcher.onDidDelete(uri => console.log("File Deleted: " + uri.fsPath), this);
      this.testSrcFileWatcher.onDidRename( (uri_old, uri_new) => {
        console.log("File Renamed From: " + uri_old);
        console.log("File Renamed To  : " + uri_new);
      });
      this.testSrcFileWatcher.onDidChange(uri => console.log("File Changed: " + uri.fsPath), this);

      this.testSrcFileWatcher.onDidCreate(uri => this.onTestFileCreated(uri));
      this.testSrcFileWatcher.onDidChange(uri => this.onTestFileChanged(uri));
      this.testSrcFileWatcher.onDidDelete(uri => this.onTestFileDeleted(uri));
      this.testSrcFileWatcher.onDidRename((uri_old, uri_new) => this.onTestFileRenamed(uri_old, uri_new));
     
      /*
      //if ( fs.statSync(uri.fsPath).isDirectory() ) //FUNZIONA SOLO SUL CREATE.
      const folderSrcWatcher = vscode.workspace.createFileSystemWatcher(watchPattern);
      folderSrcWatcher.onDidCreate(uri => { console.log("DIR CREATED: " + uri.path); } );
      folderSrcWatcher.onDidDelete(uri => {  console.log("DIR DELETED: " + uri.path); } );
      */
    }

    //cloveUI.onLoad()
    this.cloveUI.onItemClick( async (item) => this.itemSelected(item));
    this.cloveUI.onRefreshBtnClick( async (token) => this.discoverSuites());
    this.cloveUI.onRunBtnClick( async (req, token) => this.runTests(req, token));
  }

  private async onSettingsCreated(uri: vscode.Uri) {
    if (this.isSettingsUpdating) return;
    this.isSettingsUpdating = true;

    const settingsPath = uri.fsPath;
    await this.reconfigure(settingsPath);

    this.isSettingsUpdating = false;
  }

  private async onSettingsChanged(uri: vscode.Uri) {
    if (this.isSettingsUpdating) return;
    this.isSettingsUpdating = true;
    
    const settingsPath = uri.fsPath;
    await this.reconfigure(settingsPath);
    this.isSettingsUpdating = false;
  }
  
  private onSettingsDeleted(uri: vscode.Uri) : void {
    this.cloveUI.clear();
    this.suites.clear();
    this.settings = new CloveSettings({});
    this.testSrcWatcher?.dispose();
    this.testSrcWatcher = null;
  }

  public async itemSelected(suiteItem : vscode.TestItem) {
    const suiteData = this.suites.findByItem(suiteItem);
    if (!suiteData) { console.error("Suite data not found for: " + suiteItem?.uri?.toString()); return; } 

    if (suiteData.hasTestLoaded()) return;
    this._load_suite_tests_handler(suiteData, undefined);
  }
  
  public async discoverSuites() {
    for (const uri of await vscode.workspace.findFiles(this.settings.testProjectFileGlob)) {
      if (this.suites.hasSuiteByUri(uri)) continue; //suite already discovered

      const [isSuite, name, text] = await this._parseTestSuite(uri);
      if (!isSuite) continue;

      this._create_suite_handler(uri, name!, text!);
    }  

    //Load Tests from Already Opened Document in editor
    /*
    const count = vscode.workspace.textDocuments.length;
    for (const document of vscode.workspace.textDocuments) {
      if (!isTestSuite(document)) continue;
      const suite = this._get_suite(document.uri); //solo GET. La suite deve esistere a questo punto 
      if (suite) {
        suite.loadTestsFromDocument(document);
      }
    }
    */
  }

  private _create_suite_handler(uri : vscode.Uri, name : string, text : string) : CloveSuite | undefined {
    const suiteFound = this.suites.findByName(name);
    if (suiteFound) {
      this.cloveUI.showError(`Suite already exists with this name: "${name}" at "${suiteFound.getItem().uri?.fsPath}"`);
      return undefined;
    }
    const textLines = text.split("\n"); //To use to find line numbers
    const desc = CloveFilesystem.workspacePathRelative(uri.path);
    const suiteItem = this.cloveUI.addSuiteItem(uri, name, desc, textLines.length, text.length);

    const suite = new CloveSuite(suiteItem);
    this.suites.add(suite);

    return suite;
  }

  private async _load_suite_tests_handler(suite: CloveSuite, text : string | undefined) {
    const suiteItem = suite.getItem();
    suiteItem.busy = true;
    suite.setTestLoaded(false);
    if (!text) {
      const uri = suiteItem.uri!;
      text = await CloveFilesystem.readUri(uri);
    }

    const suiteTests = [] as [uri: vscode.Uri, name: string][];
    
    const testMacro = this.settings.srcTestMarker;
    const testRegex = this.settings.srcTestRegex;
    const testMatch = text.match(testRegex);
    if (testMatch) {
      const uri = suiteItem.uri!;
      for(let i=0; i < testMatch.length; ++i) {
          const testDecl = testMatch[i];
          const testName = testDecl.substring(testMacro.length+1, testDecl.length-1);        
          //Settare Range per abilitare click e andare direttamente alla funzione di test

          if (suite.hasTest(testName)) {
            this.cloveUI.showError(`Test named ${testName} already exists in ${suiteItem.uri!.fsPath}`);
            continue;
          }
          suite.addTest(testName);
          suiteTests.push([uri, testName]);
      }
      this.cloveUI.setSuiteTestItems(suiteItem, suiteTests);
      
      suite.setTestLoaded(true);
    }
    suiteItem.busy = false;
  }

  public async onTestFileCreated(uri : vscode.Uri) {
    const [isSuite, name, text] = await this._parseTestSuite(uri);
    if (!isSuite) return;

    this._create_suite_handler(uri, name!, text!);
  }

  //Listen to file changes on filesystem
  public async onTestFileChanged(uri : vscode.Uri) {
    const [isSuite, name, text] = await this._parseTestSuite(uri);
    if (!isSuite) return;

    /* NOTE:  Would be simpler to handle updates as a Remove/Creation
              but doing remove/create on ctrl.items very quickly the ui doesn't feel the change.
              And Test Explorer keep the previous data 
    */


    //Case1: if the URI has been previously deleted because of duplicate suite name
    //If then rename it again the URI is like it was new.
    if (!this.suites.hasSuiteByUri(uri) && !this.suites.hasSuiteNamed(name!)) {
      const suite = this._create_suite_handler(uri, name!, text!);
      this._load_suite_tests_handler(suite!, text!);
      return;
    }

    //Case2: Rename Suite from a unique name to another unique name. So the UI TestItem already exists.
    if (!this.suites.hasSuiteNamed(name!)) {  
      const suite = this.suites.findByUri(uri)!;
      
      this.suites.remove(suite);
      suite.getItem().label = name!;
      this.suites.add(suite);
      return;
    }

    //Case3: If the Suite name doesn't match with its URI then exists another suite with that name
    const suiteOnFile = this.suites.findByName(name!);
    const suiteOnDomain = this.suites.findByUri(uri)!;
    if (suiteOnFile && suiteOnFile != suiteOnDomain ) { 
      if (suiteOnDomain) { //Protegge il caso in cui provo a risalvare con il nome suite ancora duplicato
        this.suites.remove(suiteOnDomain);
        this.cloveUI.removeSuiteItem(uri);
      }
      this.cloveUI.showError(`Suite already exists with this name: "${name!}" at "${suiteOnFile?.getItem()?.uri?.fsPath}"`);
      return;
    }   

    //Case4: Just updating test case of the suite: Create/Update/Delete of tests
    this._load_suite_tests_handler(suiteOnDomain, text!);
  }

  public async onTestFileDeleted(uri : vscode.Uri) {
    this.suites.removeByUri(uri);
    this.cloveUI.removeSuiteItem(uri);
  }

  public async onTestFileRenamed(uri_old : vscode.Uri, uri_new : vscode.Uri) { 
    //NOTE: Instead of Delete/Create, task can be optimized avoiding to delete the Test Cases
    //      Basically: its necessary to create a new TestItem Suite (because uri is an ID)
    //      And then re-attach TestItem children to the Suite
    //      Finally update Suite object in SuiteCollection
    this.onTestFileDeleted(uri_old); //if it was really async should do await
    this.onTestFileCreated(uri_new);
  }

  //Cases: 
  //1) Run all tests
  //2) Run a single Suite
  //3) Run a single Test
  //4) Run multiple Suites / Tests
  public async runTests(request: vscode.TestRunRequest, token: vscode.CancellationToken) {
    //Could be: SuiteItem or TestCaseItem
    //const selectedItems =  request.include ?? this.ctrl.items;
    const selectedItems =  request.include ?? this.suites.asItems();

    const run = this.ctrl.createTestRun(request);

    //Load all Test Items for sure
    for( const item of selectedItems) {
      const isTestCase = item.parent != undefined;
      
      if (isTestCase) {
        run.enqueued(item);
      } else {
        const suiteData = this.suites.findByItem(item);
        if (!suiteData!.hasTestLoaded()) {
          await this._load_suite_tests_handler(suiteData!, undefined);
        }
        item.children.forEach( (testItem, _) => {
          run.enqueued(testItem);
        });
      }
    }

    //Build Tests
    const workspacePath = CloveFilesystem.workspacePath();
    if (this.settings.buildCommand) {
      run.appendOutput("Build Started ...");
      await Executor.aexec(this.settings.buildCommand, workspacePath)
        .catch(err => {
          run.appendOutput(err.message);
          vscode.window.showErrorMessage(err.message); 
        }); 
      run.appendOutput("Build Finished!");
    }

    //Check if VSCode CLove-Unit extension is compatible with clove-unit.h used in the test project
    let checkCmdFaild = false;
    const cloveVersion = await Executor.aexec(this.settings.testExecPath + " -v", workspacePath)
      .catch((err : Error) => {
        checkCmdFaild = true;
        //const msg = `Error executing test binary at: ${this.settings.testExecPath}`; 
        //console.log(err.message);
        vscode.window.showErrorMessage(err.message);
    }); 
    if (checkCmdFaild) return;

    const semVerFound = CloveVersion.fromSemVerString(cloveVersion!);
    if (!semVerFound) {
      vscode.window.showErrorMessage("Impossible to retrieve clove-unit.h version!");
      return;
    }    

    const isCompatible = this.settings.supportedCloveVersion.hasSameMinor(semVerFound);
    if (!isCompatible) {
      const supported = this.settings.supportedCloveVersion.asMinorString();
      vscode.window.showErrorMessage(`CLove-Unit VSCode Extension is compatible with clove-unit.h v${supported}. 
          Currently clove-unit.h v${cloveVersion} has been detected! Please updated to a supported version!`);
      return;
    }

    //Run Tests
    let execCmdFailed = false;
    run.appendOutput("Execute Started ...");
    await Executor.aexec(this.settings.testExecPath + " -r json -f vscode_clove_report.json", workspacePath)
      .catch(err => {
        execCmdFailed = true;
        const msg = `Error executing tests at: ${this.settings.testExecPath}`; 
        run.appendOutput(msg);
        run.appendOutput(err.message);
        vscode.window.showErrorMessage(err.message);
      }); 
    run.appendOutput("Execute Finished!");

    if (execCmdFailed) {
      run.end();
      return;
    }

    //Update Test Results
    const reportPath = CloveFilesystem.workspacePath(this.settings.testExecBasePath, "vscode_clove_report.json");
    const reportJson = CloveFilesystem.loadJsonFile(reportPath);
    
    if (reportJson.api_version != 1) { //Supported json report version
      this.cloveUI.showError(`This Clove Unit VSCode Extension doesn't support clove_unit v${reportJson.clove_version}. Try to update to latest clove-unit.h!`);
      run.end();
      return;
    }

    const resultJson = reportJson.result;
  
    for( const item of selectedItems) {     
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

      const reportSuite = resultJson.suites[suiteName];
      if (!reportSuite) {
        run.skipped(item);
        this.cloveUI.showError(`Suite not found in the test binary: ${suiteName}`);
        continue;
      }
      testItems.forEach( (testItem, _) => {
        if (token.isCancellationRequested) {
          run.skipped(testItem);
          return;
        }
        run.started(testItem);

        const testName = testItem.label;
        const report_test = reportSuite[testName];
        if (!report_test) {
          run.skipped(testItem);
          this.cloveUI.showError(`Test method not found in the test binary: ${testName}`);
          return;
        }
        const testStatus = report_test.status;
        let duration = report_test.duration / 1000000; //1 Millinon nanos per ms
        if (duration > 0 && duration < 1 ) duration = 0.1; //minimu Test Explorer time resolution is 0.1 ms
        if (testStatus == 1) { //1 = Passed
          run.passed(testItem, duration);
        } else if (testStatus == 2) { //2 = Failed
          let assertMsg;
          let exp = report_test.expected;
          let act = report_test.actual;
          if (report_test.type == 11) { //Data Type = String
            const exp_init_len = exp.length; 
            const act_init_len = act.length;
            exp = exp.substring(0,  exp_init_len > 16 ? 16 : exp.length);
            act = act.substring(0,  act_init_len > 16 ? 16 : act.length);
            exp = JSON.stringify(exp);
            act = JSON.stringify(act);
            exp = exp.substring(1, exp.length-1); //remove ""
            act = exp.substring(1, act.length-1); //remove ""
            if (exp_init_len > 16) exp += "...";
            if (act_init_len > 16) act += "...";
          }
          switch(report_test.assert) {
            case 1: { assertMsg = `expected [${exp}] but was [${act}]`;  break; }
            case 2: { assertMsg = `not expected [${exp}] but was [${act}]`;  break; }
            case 3: { assertMsg = `a fail assertion has been met!`;  break; }
            default: { assertMsg = "<undefined>";  break; }
          }
          //TODO: Use Markdown string in assert Msg to highlight value boundaries
          const message = vscode.TestMessage.diff(assertMsg, report_test.expected, report_test.actual);
          const zeroBasedLine = report_test.line - 1;
          message.location = new vscode.Location(testItem.uri!, new vscode.Range(zeroBasedLine, 0, zeroBasedLine, 1));
          run.failed(testItem, message, duration);
        } else if (testStatus == 3) { //3 = Skipped
          run.skipped(testItem);
        }
      });
    }

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