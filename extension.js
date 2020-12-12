const vscode = require('vscode');
const path = require('path');

function activate(context) {
  const extensionShortName = 'whenFile';
  const colorCustomizationSection = 'workbench.colorCustomizations';
  const themeName = 'theme';
  const workbenchColorName = 'workbenchColor';
  const byLanguageIdName = 'byLanguageId';
  let previousChange = {};
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
  class WorkbenchColor {
    constructor() {
      this.dirty = false;
      this.workbenchColor = {};
      const inspect = vscode.workspace.getConfiguration().inspect(colorCustomizationSection);
      if (inspect && isObject(inspect.workspaceValue)) {
        copyProperties(inspect.workspaceValue, this.workbenchColor);
      }
    }
    removeColors(colors) {
      let workbenchColor = {};
      copyProperties(this.workbenchColor, workbenchColor, colors);
      this.workbenchColor = workbenchColor;
      this.dirty = true;
    }
    addColors(colors) {
      copyProperties(colors, this.workbenchColor);
      this.dirty = true;
    }
  }
  async function updateColorCustomization(customColors) {
    await vscode.workspace.getConfiguration().update(colorCustomizationSection, customColors, vscode.ConfigurationTarget.Workspace);
  }
  function _handleEditor(editor, colorUpdate) {
    if (previousChange[workbenchColorName]) {
      colorUpdate.removeColors(previousChange[workbenchColorName]);
      previousChange[workbenchColorName] = undefined;
    }
    if (!editor) { return; }
    function updateChange(newChange, changeFor) {
      if (!changeFor) { return newChange; }
      let theme = newChange[themeName];
      let workbenchColor = newChange[workbenchColorName];

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

      newChange = {};
      newChange[themeName] = theme;
      newChange[workbenchColorName] = workbenchColor;
      return newChange;
    }
    let document = editor.document;
    let workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspaceFolder) return;
    let config = vscode.workspace.getConfiguration(extensionShortName, workspaceFolder.uri);
    let change = config.get('change');
    let newChange = {};
    newChange[themeName] = getProperty(change, themeName);
    newChange[workbenchColorName] = getProperty(change, workbenchColorName);
    let filePath = document.uri.path;
    let languageId = document.languageId;
    for (const key in change) {
      if (!change.hasOwnProperty(key)) { continue; }
      if (key === themeName || key === workbenchColorName) { continue; }
      if (key === byLanguageIdName) {
        newChange = updateChange(newChange, getProperty(change[key], languageId));
        continue;
      }
      // does this regex apply to this filePath
      if (filePath.match(new RegExp(key, "mi")) === null) { continue; }
      newChange = updateChange(newChange, change[key]);
    }
    if (newChange[workbenchColorName]) {
      colorUpdate.addColors(newChange[workbenchColorName]);
      previousChange[workbenchColorName] = newChange[workbenchColorName];
    }
  }
  async function handleEditor(editor) {
    let colorUpdate = new WorkbenchColor();
    _handleEditor(editor, colorUpdate);
    if (colorUpdate.dirty) {
      await updateColorCustomization(colorUpdate.workbenchColor);
    }
  }
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor( handleEditor ));
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration( async configevent => {
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
