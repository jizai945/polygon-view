import * as vscode from "vscode";
import * as draw from "./drawable";
import * as colors from "./colors.json";
import * as util from "./subutil";

// 使用正则提取文本中的数字
export function extractAndRoundNumbers(text: string) {
  // 正则表达式匹配整数和浮点数
  const regex = /-?\d+(\.\d+)?/g;
  const matches = text.match(regex) || []; // 如果没有匹配项，则返回一个空数组

  // 遍历匹配项，将浮点数四舍五入到最接近的整数（或指定的小数位数）
  // 这里我假设你想要四舍五入到最接近的整数，但你可以修改这部分来满足你的需求
  const roundedNumbers = matches.map((numStr) => {
    const num = parseFloat(numStr); // 转换为浮点数
    // 如果你想要四舍五入到特定的小数位数，比如2位，可以使用 num.toFixed(2) 并再次转换为浮点数
    // 但由于我们这里四舍五入到整数，所以直接使用 Math.round
    return isNaN(num) ? numStr : Math.round(num); // 如果转换失败（例如，如果字符串不是有效的数字），则保留原始字符串
  });

  return roundedNumbers;
}

function systemName(system: draw.System): string {
  switch (system) {
    case draw.System.Cartesian:
      return "cartesian";
    case draw.System.Complex:
      return "complex";
    case draw.System.Geographic:
      return "geographic";
    default:
      return "";
  }
}

function createMessagePlot(message: any, system: draw.System): number {
  const systemStr = systemName(system);
  for (let i = 0; i < message.plots.length; ++i)
    if (message.plots[i].system === systemStr) return i;
  message.plots.push({
    system: systemStr,
    traces: [] as any,
    lonintervals: [] as any,
    lonmid: 0,
  });
  return message.plots.length - 1;
}

export function prepareMessage(
  potlyData: draw.PlotlyData[],
  colorTheme: vscode.ColorTheme
): any {
  let message = {
    color: "#888",
    gridcolor: "#888",
    activecolor: "#888",
    projection: "orthographic",
    plots: [] as any,
  };
  if (colorTheme.kind === vscode.ColorThemeKind.Light) {
    message.color = "#555";
    message.gridcolor = "#aaa";
    message.activecolor = "#aaa";
  } else {
    // Dark or HighContrast
    message.color = "#aaa";
    message.gridcolor = "#555";
    message.activecolor = "#bbb";
  }
  const themeColors =
    colorTheme.kind === vscode.ColorThemeKind.Light
      ? colors.light
      : colors.dark;
  for (let d of potlyData) {
    if (d.traces.length < 1) continue;
    const colorStr =
      d.colorId >= 0 ? themeColors.colors[d.colorId] : themeColors.color;
    const plotId = createMessagePlot(message, d.system);
    for (let trace of d.traces) {
      if (trace.type === "bar") trace.marker = { color: colorStr + "88" };
      else trace.line = { color: colorStr + "CC" };
      if (trace.fill !== undefined && trace.fill !== "none")
        trace.fillcolor = colorStr + "55";
      trace.hoverinfo = d.system === draw.System.Geographic ? "lon+lat" : "x+y";
      message.plots[plotId].traces.push(trace);

      for (let dir of d.directions) {
        let dirTrace: any =
          d.system === draw.System.Geographic
            ? { lon: [dir.x], lat: [dir.y] }
            : { x: [dir.x], y: [dir.y] };
        dirTrace.type = trace.type;
        dirTrace.mode = "markers";
        dirTrace.hoverinfo = "skip";
        dirTrace.marker = {
          size: 10,
          symbol: "triangle-up",
          angleref: "up",
          angle: dir.angle,
          color: colorStr + "CC",
        };
        message.plots[plotId].traces.push(dirTrace);
      }
    }
    message.plots[plotId].lonintervals.push(d.lonInterval);
  }

  const cartesianStr = systemName(draw.System.Cartesian);
  const complexStr = systemName(draw.System.Complex);
  const geographicStr = systemName(draw.System.Geographic);
  for (let p of message.plots) {
    if (p.system === geographicStr) {
      const loninterval = util.LonInterval.fromIntervals(p.lonintervals);
      p.lonmid = (loninterval.min + loninterval.max) / 2;
    }
    p.scaleanchor = p.system === cartesianStr || p.system === complexStr;
  }

  let projection = vscode.workspace
    .getConfiguration()
    .get<string>("graphicalDebugging.geographicProjection");
  if (projection !== undefined) message.projection = projection;

  return message;
}

export function calculateAngleFromYAxis(
  point1: { x: number; y: number },
  point2: { x: number; y: number }
): number {
  // 计算两点之间的x和y差
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;

  // 当dy为0时，即两点在同一垂直线上，需要特殊处理
  if (dy === 0) {
    // dx > 0 表示点2在点1的右侧，返回90度
    // dx < 0 表示点2在点1的左侧，返回-90度
    return dx > 0 ? 90 : -90;
  }

  // 使用Math.atan2计算与y轴的角度（弧度制），注意参数顺序是dx, dy
  const angleInRadians = Math.atan2(dx, dy);

  // 将角度从弧度制转换为度制，并映射到-180到180的范围
  // 因为Math.atan2返回的是-π到π，我们需要将其转换为-180到180
  const angleInDegrees = angleInRadians * (180 / Math.PI);

  // 由于Math.atan2返回的角度是顺时针为负，逆时针为正（相对于y轴），所以不需要额外调整
  // 直接返回角度即可
  return angleInDegrees;
}
