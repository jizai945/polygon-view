import * as vscode from 'vscode';
import * as path from 'path';

export class Webview {
	constructor(
		private _context: vscode.ExtensionContext
	) {}

	showAndPostMessage(data: any) {
		if (this._panel) {
			if (! this._panel.visible)
				this._panel.reveal();
			this._panel.webview.postMessage(data);
		} else {
			let viewColumn: vscode.ViewColumn = vscode.ViewColumn.Nine;
			for (const group of vscode.window.tabGroups.all) {
				if (group.tabs.length === 0)
					viewColumn = group.viewColumn;
			}

			this._panel = vscode.window.createWebviewPanel(
				'graphicalWatchWebview',
				'Polygon View', {
					viewColumn: viewColumn,
				  	preserveFocus: true
				}, {
					enableScripts: true,
					localResourceRoots: [vscode.Uri.file(path.join(this._context.extensionPath, 'resources'))]
				});
			// this._panel.onDidChangeViewState(
			// 	(e) => {
			// 		// TODO: handle hiding and showing again here?
			// 	},
			// 	null,
			// 	this._context.subscriptions);
			this._panel.onDidDispose(
				() => {
					this._panel = undefined;
				},
				null,
				this._context.subscriptions);
				
			let initialized = false;
			this._panel.webview.onDidReceiveMessage(
				(e: any) => {
					if (e.initialized && ! initialized) {
						initialized = true;
						this._panel?.webview.postMessage(data);
					}
				},
				undefined,
				this._context.subscriptions
			);

			const plotlyPath = vscode.Uri.file(
				path.join(this._context.extensionPath, 'resources', 'plotly-2.18.1.min.js')
			);
			const plotlySrc = this._panel.webview.asWebviewUri(plotlyPath);
			this._panel.webview.html = this.getWebviewContent(plotlySrc);

			// Failsafe
			setTimeout(() => {
				if (! initialized) {
					initialized = true;
					this._panel?.webview.postMessage(data);
				}
			}, 1000);
		}
	}

	postMessage(data: any) {
		this._panel?.webview.postMessage(data);
	}

	hide() {
		this._panel?.dispose();
	}

	private getWebviewContent(plotlySrc: vscode.Uri) {
		return `<!DOCTYPE html>
				<html lang="en" style="margin:0;padding:0;height:100%;">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<title>Polygon View</title>
					<script src="${plotlySrc}"></script>
					<script>
						function getLayout(color, gridcolor, activecolor, projection) {
							return {
								showlegend: false,
								margin: { b:25, l:30, r:15, t:25 },
								paper_bgcolor: '#0000',
								plot_bgcolor: '#0000',
								dragmode: 'pan',
								modebar: {
									bgcolor: '#0000',
									color: gridcolor,
									activecolor: activecolor
								},
								xaxis: {
									color: color,
									gridcolor: gridcolor
								},
								yaxis: {
									color: color,
									gridcolor: gridcolor
								},
								geo: {
									bgcolor: '#0000',
									projection: {
										type: projection,
										rotation: {
											lon: 0,
											lat: 0
										}
									},
									showocean: true,
									oceancolor: '#0000',
									showland: true,
									landcolor: '#0000',
									showlakes: false,
									lakecolor: '#0000',
									showcountries: true,
									lonaxis: {
										showgrid: true,
										gridcolor: gridcolor
									},
									lataxis: {
										showgrid: true,
										gridcolor: gridcolor
									}
								}
							};
						};

						function setupPlotElements(count) {
							let plots = document.body.getElementsByClassName('graphicaldebugging-plot');
							while (plots.length > 0 && plots.length > count) {
								let plot = plots[plots.length - 1];
								plot.parentNode.removeChild(plot);
							}
							while (plots.length < count) {
								let plot = document.createElement("div");
								plot.setAttribute("class", "graphicaldebugging-plot");
								document.body.appendChild(plot);
							}
							if (plots.length === 1) {
								plots[0].setAttribute("style", "margin:0;padding:0;width:100%;height:100%;");
							} else if (plots.length > 1) {
								for (plot of plots)
									plot.setAttribute("style", "margin:0;padding:0;width:100vw;height:100vw;");
							}
							return plots;
						}

						var layout = getLayout('#888', '#888', '#888', 'orthographic', 0);
						var config = {
							modeBarButtonsToRemove: ['select', 'lasso', 'resetScale', 'toImage', 'sendDataToCloud'],
							displaylogo: false,
							responsive: true,
							scrollZoom: true
						};
					</script>
				</head>
				<body style="margin:0;padding:0;height:100%;">
					<script>
						window.addEventListener('message', event => {
							let layout = getLayout(event.data.color, event.data.gridcolor, event.data.activecolor, event.data.projection);
							let plots = setupPlotElements(event.data.plots.length);
							for (let i = 0 ; i < event.data.plots.length ; ++i) {
								layout.geo.projection.rotation.lon = event.data.plots[i].lonmid;
								if (event.data.plots[i].scaleanchor) {
									layout.yaxis.scaleanchor = 'x';
								}
								Plotly.newPlot(plots[i], event.data.plots[i].traces, layout, config);
							}
						});

						const vscode = acquireVsCodeApi();
						vscode.postMessage({ initialized: true });
					</script>
				</body>
			</html>`;
	}

	private _panel: vscode.WebviewPanel | undefined = undefined;
}