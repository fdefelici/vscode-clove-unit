import { Console, debug } from 'console';
import * as vscode from 'vscode';
import { getContentFromFilesystem, TestCase, testData, TestFile } from './testTree';
import { CloveFacade } from './CloveFacade';


export async function activate(context: vscode.ExtensionContext) {
  const ctrl = vscode.tests.createTestController('CloveTestController', 'Clove Unit Test Controller');
  const facade = new CloveFacade(ctrl);
  context.subscriptions.push(ctrl);
  context.subscriptions.push(facade);
  /*
  context.subscriptions.push( //Test Discovery on VSCode events Opening/Changing single file
    //NOTA: Capire ce cambia se uso solo il WATCHING WORSPACE? (forse perche' riesce a watchare solo i file gia esistenti?)
    vscode.workspace.onDidOpenTextDocument(e => updateNodeForDocument(ctrl, e)),
    vscode.workspace.onDidChangeTextDocument(e => updateNodeForDocument(ctrl, e.document)),
  );
  */
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(e => console.log("onDidOpenTextDocument: " + e.fileName)),
    //vscode.workspace.onDidChangeTextDocument(e => console.log("onDidChangeTextDocument: " + e.document.fileName)),
    //vscode.workspace.onDidSaveTextDocument(e => facade.onDocumentSaved(e)),
    //vscode.workspace.onDidDeleteFiles(e => facade.onFilesDeleted(e)),
    //vscode.workspace.onDidRenameFiles((e: vscode.FileRenameEvent) => console.log("onDidRenameFiles: " + e.files[0].oldUri.fsPath + " => " + e.files[0].newUri.fsPath ))
  );

  //ctrl.createRunProfile('Run Tests', vscode.TestRunProfileKind.Run, (req, token) => runHandler(ctrl, req, token), true);
  ctrl.createRunProfile('Run Tests', vscode.TestRunProfileKind.Run, (req, token) => facade.runTests(req, token), true);

  //Test discovery from Text Explorer UI
  //1) At first when Text Explorer is opened first time (item = null) starts watching all workspace for a full discovery
  //2) When clicking/expanding an item in test explorer (item != null)
  ctrl.resolveHandler = async item => {
    //if (item || !item) return;
    
    /*
    if (!item) {
      context.subscriptions.push(...debugWatchingWorkspace(ctrl));
      return;
    }
    const data = testData.get(item);
    if (data instanceof TestFile) {
      await data.updateFromDisk(ctrl, item);
    }
*/ 
    if (!item) { //Case1) opening first time Test Explorer
      //do nothing
    } else {
      facade.onClickSuiteItem(item);
    }

  };

  ctrl.refreshHandler = async () => {
    await facade.discoverSuites();
  };

  facade.discoverSuites(); //carica solo test con file conosciuti al workspace. (bisogna fare il watch)

  const watcher = vscode.workspace.createFileSystemWatcher("**/*.c");
  watcher.onDidCreate(uri => facade.onFileCreated(uri));
  watcher.onDidChange(uri => facade.onFileWritten(uri));
  watcher.onDidDelete(uri => facade.onFileDeleted(uri));
  context.subscriptions.push(watcher);
}

function runHandler(ctrl: vscode.TestController, request: vscode.TestRunRequest, cancellation: vscode.CancellationToken) {
  const queue: { test: vscode.TestItem; data: TestCase }[] = [];
  const run = ctrl.createTestRun(request);
  // map of file uris to statments on each line:
  const coveredLines = new Map</* file uri */ string, (vscode.StatementCoverage | undefined)[]>();

  const discoverTests = async (tests: Iterable<vscode.TestItem>) => {
    for (const test of tests) {
      if (request.exclude?.includes(test)) {
        continue;
      }

      const data = testData.get(test);
      if (data instanceof TestCase) {
        run.enqueued(test);
        queue.push({ test, data });
      } else {
        if (data instanceof TestFile && !data.didResolve) {
          await data.updateFromDisk(ctrl, test);
        }

        await discoverTests(gatherTestItems(test.children));
      }

      if (test.uri && !coveredLines.has(test.uri.toString())) {
        try {
          const lines = (await getContentFromFilesystem(test.uri)).split('\n');
          coveredLines.set(
            test.uri.toString(),
            lines.map((lineText, lineNo) =>
              lineText.trim().length ? new vscode.StatementCoverage(0, new vscode.Position(lineNo, 0)) : undefined
            )
          );
        } catch {
          // ignored
        }
      }
    }
  };

  const runTestQueue = async () => {
    for (const { test, data } of queue) {
      run.appendOutput(`Running ${test.id}\r\n`);
      if (cancellation.isCancellationRequested) {
        run.skipped(test);
      } else {
        run.started(test);
        await data.run(test, run);
      }
    // run.appendOutput(`Prova: ${test.uri!.toString()}\r\n`);

      const lineNo = test.range!.start.line;
      const fileCoverage = coveredLines.get(test.uri!.toString());
      if (fileCoverage) {
        fileCoverage[lineNo]!.executionCount++;
      }

      run.appendOutput(`Completed ${test.id}\r\n`);
    }

    run.end();
  };

/* FDF: SEMBRA INUTILIZZATO?!
  run.coverageProvider = {
    provideFileCoverage() {
      const coverage: vscode.FileCoverage[] = [];
      for (const [uri, statements] of coveredLines) {
        coverage.push(
          vscode.FileCoverage.fromDetails(
            vscode.Uri.parse(uri),
            statements.filter((s): s is vscode.StatementCoverage => !!s)
          )
        );
      }

      return coverage;
    },
  };
*/

  discoverTests(request.include ?? gatherTestItems(ctrl.items)).then(runTestQueue);
}

function updateNodeForDocument(ctrl: vscode.TestController, e: vscode.TextDocument) {
  if (e.uri.scheme !== 'file') {
    return;
  }
  
  if (!e.uri.path.endsWith('.md')) {
    return;
  }

  const { file, data } = getOrCreateFile(ctrl, e.uri);
  data.updateFromContents(ctrl, e.getText(), file);
}

function getOrCreateFile(controller: vscode.TestController, uri: vscode.Uri) {
  const existing = controller.items.get(uri.toString());
  if (existing) {
    return { file: existing, data: testData.get(existing) as TestFile };
  }

  const file = controller.createTestItem(uri.toString(), uri.path.split('/').pop()!, uri);
  controller.items.add(file);

  const data = new TestFile();
  testData.set(file, data);

  file.canResolveChildren = true;
  return { file, data };
}

function gatherTestItems(collection: vscode.TestItemCollection) {
  const items: vscode.TestItem[] = [];
  collection.forEach(item => items.push(item));
  return items;
}

function getWorkspaceTestPatterns() {
  if (!vscode.workspace.workspaceFolders) {
    return [];
  }

  return vscode.workspace.workspaceFolders.map(workspaceFolder => ({
    workspaceFolder,
    pattern: new vscode.RelativePattern(workspaceFolder, '**/*.md'),
  }));
}

async function findInitialFiles(controller: vscode.TestController, pattern: vscode.GlobPattern) {
  for (const file of await vscode.workspace.findFiles(pattern)) {
    getOrCreateFile(controller, file);
  }
}

function startWatchingWorkspace(controller: vscode.TestController) {
  return getWorkspaceTestPatterns().map(({ workspaceFolder, pattern }) => {
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    watcher.onDidCreate(uri => getOrCreateFile(controller, uri));
    watcher.onDidChange(uri => {
      const { file, data } = getOrCreateFile(controller, uri);
      if (data.didResolve) {
        data.updateFromDisk(controller, file);
      }
    });
    watcher.onDidDelete(uri => controller.items.delete(uri.toString()));

    findInitialFiles(controller, pattern);

    return watcher;
  });
}


