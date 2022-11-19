const vscode = require('vscode');
// const path = require('path');

function activate(context) {
  const extensionShortName = 'whenFile';
  const colorCustomizationSection = 'workbench.colorCustomizations';
  const themeCustomizationSection = 'workbench.colorTheme';
  const themeName = 'theme';
  const workbenchColorName = 'workbenchColor';
  const workbenchColorNameWhenDirty = 'whenDirty';
  const byLanguageIdName = 'byLanguageId';
  let previousChange = {};
  let editorWasDirty = false;
  let editorPath = undefined; // we get change events for strange documents (/workbench-colors)
  let whenDirtyColors = undefined; // which colors to change
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
  /** @param {vscode.TextEditor} editor */
  function _handleEditor(editor, colorUpdate) {
    if (previousChange[workbenchColorName]) {
      colorUpdate.removeColors(previousChange[workbenchColorName]);
      previousChange[workbenchColorName] = undefined;
    }
    if (previousChange[workbenchColorNameWhenDirty]) {
      colorUpdate.removeColors(previousChange[workbenchColorNameWhenDirty]);
      previousChange[workbenchColorNameWhenDirty] = undefined;
    }
    if (!editor) { return; }
    function updateColorChange(obj, changeFor, propertyName) {
      let workbenchColorFor = getProperty(changeFor, propertyName);
      if (workbenchColorFor) {
        if (!obj) { obj = {}; }
        let workbenchColorNew = {};
        copyProperties(obj, workbenchColorNew); // make sure it is not a config proxy object
        copyProperties(workbenchColorFor, workbenchColorNew);
        obj = workbenchColorNew;
      }
      return obj;
    }
    function updateChange(newChange, changeFor) {
      if (!changeFor) { return newChange; }
      let theme = newChange[themeName];
      let workbenchColor = newChange[workbenchColorName];
      let workbenchColorWhenDirty = newChange[workbenchColorNameWhenDirty];

      let themeFor = getProperty(changeFor, themeName);
      if (themeFor) { theme = themeFor; }
      workbenchColor = updateColorChange(workbenchColor, changeFor, workbenchColorName);
      workbenchColorWhenDirty = updateColorChange(workbenchColorWhenDirty, changeFor, workbenchColorNameWhenDirty);

      newChange = {};
      newChange[themeName] = theme;
      newChange[workbenchColorName] = workbenchColor;
      newChange[workbenchColorNameWhenDirty] = workbenchColorWhenDirty;
      return newChange;
    }
    let document = editor.document;
    let workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (vscode.workspace.workspaceFolders === undefined) return; // there has to be a workspace open to store changed settings
    let configScope = workspaceFolder ? workspaceFolder.uri : vscode.workspace.workspaceFolders[0].uri;
    editorPath = document.uri.path;
    let config = vscode.workspace.getConfiguration(extensionShortName, configScope);
    let change = config.get('change');
    let newChange = {};
    newChange[themeName] = getProperty(change, themeName);
    newChange[workbenchColorName] = getProperty(change, workbenchColorName);
    newChange[workbenchColorNameWhenDirty] = getProperty(change, workbenchColorNameWhenDirty);
    let filePath = document.uri.path;
    let languageId = document.languageId;
    for (const key in change) {
      if (!change.hasOwnProperty(key)) { continue; }
      if (key === themeName || key === workbenchColorName || key === workbenchColorNameWhenDirty) { continue; }
      if (key === byLanguageIdName) {
        newChange = updateChange(newChange, getProperty(change[key], languageId));
        continue;
      }
      // does this regex apply to this filePath
      if (filePath.match(new RegExp(key, "mi")) === null) { continue; }
      newChange = updateChange(newChange, change[key]);
    }
    whenDirtyColors = newChange[workbenchColorNameWhenDirty];
    let newWorkbenchColors = newChange[workbenchColorName];
    if (newWorkbenchColors) {
      colorUpdate.addColors(newWorkbenchColors);
      previousChange[workbenchColorName] = newWorkbenchColors;
    }
  }
  var insideHandleEditor = false;
  var insideHandleDirty = false;
  /** @param {vscode.TextDocument} document */
  async function _handleDirty(document) {
    if (!whenDirtyColors) { return; }
    if (insideHandleDirty) { return; }
    if (document.uri.path !== editorPath) { return; }
    let isDirty = document.isDirty;
    if (editorWasDirty === isDirty) { return; }
    insideHandleDirty = true;
    let colorUpdate = new WorkbenchColor();
    if (isDirty) {
      colorUpdate.addColors(whenDirtyColors);
      previousChange[workbenchColorNameWhenDirty] = whenDirtyColors;
    } else {
      colorUpdate.removeColors(whenDirtyColors);
      previousChange[workbenchColorNameWhenDirty] = undefined;
    }
    editorWasDirty = isDirty; // we get multiple change events
    await updateColorCustomization(colorUpdate.workbenchColor);
    insideHandleDirty = false;
  }
  /** @param {vscode.TextDocument} document */
  async function handleDirty(document) {
    if (insideHandleEditor) { return; }
    _handleDirty(document);
  }
  async function handleEditor(editor) {
    insideHandleEditor = true;
    editorPath = undefined;
    let colorUpdate = new WorkbenchColor();
    _handleEditor(editor, colorUpdate);
    if (colorUpdate.dirty) {
      await updateColorCustomization(colorUpdate.workbenchColor);
    }
    if (editor) {
      editorWasDirty = false;
      await _handleDirty(editor.document);
    }
    insideHandleEditor = false;
  }
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor( handleEditor ));
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument( async e => { await handleDirty(e.document); } ));
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
