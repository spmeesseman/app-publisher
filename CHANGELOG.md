# APP-PUBLISHER CHANGE LOG

## Version 1.4.0 (May 28th, 2019)

### Build System

- **ap:** update to ap 1.4.0 config
- **npm:** add command reference to node dep json command
- **npm:** clean up package.json

### Chores

- change config to use new textEditor param, notepadEdits deprecated
- change profile argument for app-publisher script
- include install dir in vc
- progress checkin on latest features

### Features

- add git commit history support for history file and changelog file manipulation in gitonly projects
- add npmPackDist config, auto npm-pack and move to dist dir for dist release
- add support to auto-locate and bump version in assemblyinfo.cs files for .net builds
- allow choice of text editors for edits, default to notepad++
- allow multiple runs using multiple backend subversion repositories and install types.
- allow version tagging for sub-projects
- if specified text editor is not found, default to notepad
- support for git commit and revert

### Bug Fixes

- commits are no longer sorted by subject after ps script cleanup
- if a config param in publishrc is defined in both the root object, and in a run object, case insenstive, an error is thrown
- if no history file is specified an error is thrown during installer type release
- incremental version in history.txt is found but proceeds to through semver error
- non-critical error is thrown 'cannot test path is null' when reverting files after a test run
- occassionally package.json does not get populated and produces the error "file in use"
- on environment variable replacement in publishrc, if the value contains a backslash an error is thrown when ps script starts
- patch level is incorrectly determined after script cleanup
- repository and repository type not being set corrcetly when not specified in .publishrc
- when prompted to continue after finsing no commits since lst release, hitting enter to select default choice "no" does not exit as it should
- when using notepad++ as the inline editor, the window is opened behing Code on the first edit, all subsequent edits work as expected

### Code Refactoring

- accept xRuns config as opposed to runs
- add additional logging when retrieving commits
- cleanup and allow main tag from subfolder of main project folder
- improve logging, add colorized log tags
- major cleanup and several configuration parameters extracted into config file.  preparing for first modular nodejs build.
- remove all code package checks, no longer needed
- set specific flags for multi-run publishes
- switch message tag of notepad fallback to a notice
- title case app name in notification email subject line

### Code Styling

- change param names to match multi repo type feature
- cleanup
- cleanup publishrc


