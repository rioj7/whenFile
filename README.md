Change the color of the workbench depending on the path of the current file.

If you have sub projects in your workspace (`client` and `server`) or a Multi Root Workspace it can be handy that the Workspace has some feedback which the current file belongs to.

# Extension Settings

* `whenFile.change` : What to change depending on the location of the current file. It is an object with the following properties:
    * `workbenchColor` : an object with the color names and values to change for all files where this setting applies.
    * `whenDirty` : an object with the color names and values to change when the file is dirty (not saved).
    * `file path Regular Expression` : for which file path do we change the `workbenchColor`. It is an object with the following properties:
        * `workbenchColor` : an object with the color names and values to change
        * `whenDirty` : an object with the color names and values to change when the file is dirty (not saved).
    * `byLanguageId` : on object where the key is a [languageId](https://code.visualstudio.com/docs/languages/identifiers)
        * the value for a languageId is an object with the following properties:
            * `workbenchColor` : an object with the color names and values to change
            * `whenDirty` : an object with the color names and values to change when the file is dirty (not saved).

All properties are optional.

The file path Regular Expression is searched in the full file path. You just need to specify the discriminating part, folder or file extension.

You can change any color that the setting `workbench.colorCustomizations` allows. One or more. The colors to change are specified in the setting `whenFile.change` in `settings.json`.

Be aware that the `whenFile.change` setting is merged over all the settings files that apply for the current file.

## `whenDirty`

(experimental) If you don't define the `whenDirty` property the extension should behave as before

The `whenDirty` property is designed to be used to change colors of things that linters and languages show: the error, warning, information squiggles. Sometimes a lot of errors are generated when you type. With this property you can make the squiggles transparent until you save the file. (`editorError.foreground`, `editorWarning.foreground`, `editorInfo.foreground`)

### Example `whenDirty`

The C# language server does not have the option to postpone linting till the file is saved. To make the error squiggles almost transparent (`20`) use the following configuration setting:

```
  "whenFile.change": {
    "byLanguageId": {
      "csharp": {
        "whenDirty": {
          "editorError.foreground": "#ff000020",
          "editorWarning.foreground": "#ff000020",
          "editorInfo.foreground": "#ff000020"
        }
      }
    }
  }
```

# How to use

Depending on your project setup you need to configure one or more locations of `settings.json`:

## Independent of your team members

If you want to change the looks of the editor but not modify the setup of your team members you have to modify the (global) User `settings.json`. This file is not part of the Source Code Management (git, ...).

This works for Single folder Workspace and Multi Root Workspace.

You have to specify the discriminating parts of the file paths

```
  "whenFile.change": {
    "byLanguageId": {
      "python": {
        "workbenchColor": {
          "editor.background": "#ddddff"
        }
      },
      "html": {
        "workbenchColor": {
          "editor.background": "#ddffdd"
        }
      }
    },
    "/projects/server/": {
      "workbenchColor": {
        "activityBar.background": "#509050"
      }
    },
    "/projects/client/": {
      "workbenchColor": {
        "activityBar.background": "#905080"
      }
    },
    "/.*\\.log$": {
      "workbenchColor": {
        "activityBar.background": "#acad60"
      }
    }
  }
```

## Single folder Workspace

For Single folder Workspace you modify `.vscode/settings.json`.

All files in this folder are subject to the changes specified:

```
  "whenFile.change": {
    "/server/": {
      "workbenchColor": {
        "activityBar.background": "#509050"
      }
    },
    "/client/": {
      "workbenchColor": {
        "activityBar.background": "#905080"
      }
    }
  }
```

## Multi Root Workspace

You can change the global User `settings.json`, the settings part of the `.code-workspace` file or the different `.vscode/settings.json`

Change `server/.vscode/settings.json`

```
  "whenFile.change": {
    "workbenchColor": {
      "activityBar.background": "#509050"
    }
  }
```

Change `client/.vscode/settings.json`

```
  "whenFile.change": {
    "workbenchColor": {
      "activityBar.background": "#905080"
    },
    "/.*\\.log$": {
      "workbenchColor": {
        "activityBar.background": "#acad60"
      }
    }
  }
```

# TODO

* change the theme based on file location
* add a timer to remove the dirty colors when you haven't typed for x seconds
