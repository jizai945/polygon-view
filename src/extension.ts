// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// 文本转多边形数组功能
	require('./polygonarray')(context);
	// 多边形展示功能
	require('./polygonshow')(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
