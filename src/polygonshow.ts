import * as vscode from "vscode";
import * as utilty from "./utilty";
import { Webview } from "./webview";

const MinPolygonPoints = 3;

class DrawDataType {
  // 声明类的属性，默认为公开（public）
  traces: any[]; // 或者你可以指定更具体的类型，如 Array<YourTraceType>
  system: any | null; // 或者你可以指定更具体的类型
  lonInterval: { min: number; max: number };
  colorId: any | null; // 或者你可以指定更具体的类型
  directions: any[]; // 或者你可以指定更具体的类型，如 Array<YourDirectionType>

  // 构造函数
  constructor(
    traces: any[] = [],
    system: any | null = null,
    lonInterval: { min: number; max: number } = { min: 0, max: 0 },
    colorId: any | null = null,
    directions: any[] = []
  ) {
    this.traces = traces;
    this.system = system;
    this.lonInterval = lonInterval;
    this.colorId = colorId;
    this.directions = directions;
  }
}

class TracesData {
  x: any[];
  y: any[];
  type: string;
  mode: string;
  fill: string;

  constructor() {
    this.x = [];
    this.y = [];
    this.type = "scatter";
    this.mode = "lines+markers";
    this.fill = "toself";
  }
}

interface PointContainer {
  x: number[];
  y: number[];
}

function PrePolygonData(numbers: any[]): any {
  var tracesData: any[] = [];
  var lonIntervalData = { min: 0, max: 0 };
  var directionsData = [];
  tracesData.push(new TracesData());

  for (let i = 0; i < numbers.length; i++) {
    let ringData: PointContainer = { x: [], y: [] };

    for (let j = 0; j < numbers[i].length; j += 2) {
      if (j === numbers[i].length - 1) break;
      ringData.x.push(numbers[i][j]);
      ringData.y.push(numbers[i][j + 1]);
    }

    // 添加首位重复点
    if (ringData.x.length !== 0) {
      if (
        ringData.x[0] !== ringData.x[ringData.x.length - 1] ||
        ringData.y[0] !== ringData.y[ringData.x.length - 1]
      ) {
        ringData.x.push(ringData.x[0]);
        ringData.y.push(ringData.y[0]);
      }
    }

    if (tracesData[0].x.length !== 0) {
      tracesData[0].x.push(null);
      tracesData[0].y.push(null);
    }
    tracesData[0].x = tracesData[0].x.concat(ringData.x);
    tracesData[0].y = tracesData[0].y.concat(ringData.y);

    // 计算起始点到第二个点的角度
    let point1 = { x: ringData.x[0], y: ringData.y[0] };
    let point2 = { x: ringData.x[1], y: ringData.y[1] };
    let curDirData = {
      x: ringData.x[0],
      y: ringData.y[0],
      angle: utilty.calculateAngleFromYAxis(point1, point2),
    };
    directionsData.push(curDirData);
  }

  let poly = new DrawDataType(
    tracesData,
    1,
    lonIntervalData,
    0,
    directionsData
  );

  return poly;
}

function GetSelectText(): string {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) {
    return "";
  }
  // 获取选中doc文档
  const doc = editor.document;
  const selection = editor.selection;
  // 获取选中文本
  const word = doc.getText(selection);

  return word;
}

module.exports = function (context: vscode.ExtensionContext) {
  const webview: Webview = new Webview(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("polygon-view.ShowOnePolygon", async () => {
      let txt = GetSelectText();
      if (txt.length !== 0) {
        const numbers = utilty.extractAndRoundNumbers(txt);
        let poly = PrePolygonData([numbers]);
        let polygons = [poly];
        const message = utilty.prepareMessage(
          polygons,
          vscode.window.activeColorTheme
        );
        webview.showAndPostMessage(message);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("polygon-view.ShowMultiPolygon", async () => {
      let txt = GetSelectText();
      if (txt.length !== 0) {
        const lines = txt.split("\n");
        let polygons: any[] = [];
        let polygon_rings: any[] = [];
        const GeneratePolygon = () => {
          if (polygon_rings.length === 0) {
            return;
          }
          console.log("polygon data: ", polygon_rings);
          let poly = PrePolygonData(polygon_rings);
          poly.colorId = polygons.length;
          polygons.push(poly);
          polygon_rings = [];
        };

        lines.forEach((line) => {
          const ring = utilty.extractAndRoundNumbers(line);
          if (ring.length < MinPolygonPoints) {
            return;
          }
          if (line.substring(0, 2) !== "!!") {
            GeneratePolygon();
          }
          polygon_rings.push(ring);
        });
        GeneratePolygon();

        const message = utilty.prepareMessage(
          polygons,
          vscode.window.activeColorTheme
        );
        webview.showAndPostMessage(message);
      }
    })
  );
};
