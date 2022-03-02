import * as vscode from 'vscode';
import { CloveController } from './CloveController';
import { CloveTestUI } from './CloveTestUI';

export async function activate(context: vscode.ExtensionContext) {
  const cloveUI = new CloveTestUI();
  const cloveCtrl = new CloveController(cloveUI, context);
  cloveCtrl.activate();
}