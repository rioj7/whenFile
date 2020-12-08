const vscode = require('vscode');
const path = require('path');

function activate(context) {
  const extensionShortName = 'whenFile';
  const colorCustomizationSection = 'workbench.colorCustomizations';
  const themeName = 'theme';
  const workbenchColorName = 'workbenchColor';
  let previousChange = { themeName: undefined, workbenchColorName: undefined };
  const isObject = obj => typeof obj === 'object';
  const getProperty = (obj, prop, deflt) => { return obj.hasOwnProperty(prop) ? obj[prop] : deflt; };
  const copyProperties = (src, dest, excludeKeys) => {
    if (!excludeKeys) { excludeKeys = {}; }
    for (const key in src) {
      if (src.hasOwnProperty(key) && !excludeKeys.hasOwnProperty(key)) {
        dest[key] = src[key];
      }
    }
  };
  async function updateColorCustomization(customColors) {
    await vscode.workspace.getConfiguration().update(colorCustomizationSection, customColors, vscode.ConfigurationTarget.Workspace);
  }
  async function handleEditor(editor) {
    //TODO remove previous change, set previous_change=undefined
    const inspect = vscode.workspace.getConfiguration().inspect(colorCustomizationSection);
    if (inspect && isObject(inspect.workspaceValue) && previousChange[workbenchColorName]) {
      let workbenchColor = {};
      copyProperties(inspect.workspaceValue, workbenchColor, previousChange[workbenchColorName]);
      previousChange[workbenchColorName] = undefined;
      await updateColorCustomization(workbenchColor);
    }
    if (!editor) { return; }
    let document = editor.document;
    let workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspaceFolder) return;
    let config = vscode.workspace.getConfiguration(extensionShortName, workspaceFolder.uri);
    let change = config.get('change');
    let theme = getProperty(change, themeName);
    let workbenchColor = getProperty(change, workbenchColorName);
    let filePath = editor.document.uri.path;
    for (const key in change) {
      if (!change.hasOwnProperty(key)) { continue; }
      if (key === themeName || key === workbenchColorName) { continue; }
      // does this regex apply to this filePath
      if (filePath.match(new RegExp(key, "mi")) === null) { continue; }
      const changeFor = change[key];
      let themeFor = getProperty(changeFor, themeName);
      if (themeFor) { theme = themeFor; }
      let workbenchColorFor = getProperty(changeFor, workbenchColorName);
      if (workbenchColorFor) {
        if (!workbenchColor) { workbenchColor = {}; }
        let workbenchColorNew = {};
        copyProperties(workbenchColor, workbenchColorNew); // make sure it is not a config proxy object
        copyProperties(workbenchColorFor, workbenchColorNew);
        workbenchColor = workbenchColorNew;
      }
    }
    if (workbenchColor) {
      await updateColorCustomization(workbenchColor);
      previousChange[workbenchColorName] = workbenchColor;
    }
  }
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor( handleEditor ));
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration( async configevent => {
    // event.affectsConfiguration(section: string, scope?: ConfigurationScope): boolean
    let editor = vscode.window.activeTextEditor;
    if (!editor) return;
    if (configevent.affectsConfiguration(extensionShortName, editor.document)) {
      await handleEditor(editor);
    }
  }));
  // change for the current open file
  let editor = vscode.window.activeTextEditor;
  if (editor) { handleEditor(editor); }
};

function deactivate() {}

module.exports = {
  activate,
  deactivate
}
