import * as vscode from "vscode";
import * as utilty from "./utilty";

var out = "";
module.exports = function (context: vscode.ExtensionContext) {
  // register a content provider for the cowsay-scheme
  const myScheme = "points";

  class MyVirtualDocumentContentProvider
    implements vscode.TextDocumentContentProvider
  {
    // 假设我们有一个内部变量来存储内容
    private _content: string = "Initial content";

    // 提供文档内容的方法
    provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {
      return this._content;
    }

    // 当内容改变时触发的事件
    private _onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this._onDidChangeEmitter.event;

    // 更新内容并触发事件的方法
    updateContent(newContent: string) {
      this._content = newContent;
      this._onDidChangeEmitter.fire(
        vscode.Uri.parse("points:" + "points")
      );
    }
  }
  let myProvider = new MyVirtualDocumentContentProvider();  

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(myScheme, myProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("polygon-view.Convert2Array", async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        // 获取选中doc文档
        const doc = editor.document;
        const selection = editor.selection;
        // 获取选中文本
        const word = doc.getText(selection);
        // console.log("当前选中的文字为: " + word);
        const numbers = utilty.extractAndRoundNumbers(word);
        // console.log(numbers);
        out = "{";
        for (let i = 0; i < numbers.length; i += 2) {
          if (i === numbers.length - 1) break;
          out += "{" + numbers[i] + ", " + numbers[i + 1] + "}, ";
        }
        if (out.length !== 1) {
          out = out.slice(0, -2);
        }
        out += "}";
        console.log(out);
        myProvider.updateContent(out);
        const uri = vscode.Uri.parse("points:" + "points");
        const uri_doc = await vscode.workspace.openTextDocument(uri); // calls back into the provider
        await vscode.window.showTextDocument(uri_doc, { preview: false });
        console.log("ok");
      }
    })
  );
};
