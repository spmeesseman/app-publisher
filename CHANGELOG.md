# APP-PUBLISHER CHANGE LOG

## Version 1.7.1 (July 13rd, 2019)

### Minor Features

- add support for mantisbt release file/asset descriptions.

	A description can be provided along with the asset file location with a | separator in the mantisbtAssets config, for example:

	    build/app-publisher.tgz|NPM Tarball

### Build System

- **App Publisher:** add mantisbtAsset file descriptions to publishrc

## Version 1.7.0 (July 13rd, 2019)

### Features

- Add support for providing email server port and email mode configs.

	The following configs have been added:

	    emailPort (default 25)
	    emailMode (default empty)

	Where emailMode can be one of "ssl", "tls", or empty.

### Bug Fixes

- The history extraction from the commit messages is missing all of the multi-line entries when retrieving the commit history from Git repo.
- The history file has an additional unecessary newline at the end of the new section that is generated during the publish run.

## Version 1.6.5 (July 13rd, 2019)

### Bug Fixes

- Partial errors when creating a release are indicated as success in runtime log.

## Version 1.6.4 (July 13rd, 2019)

### Minor Features

- add a link to mantisbt release page in notification email

## Version 1.6.3 (July 13rd, 2019)

### Build System

- add history.txt to list of file assets to upload to MantisBT Releases Plugin

### Bug Fixes

- When a MantisBT release is uploaded, only parts of the changelog from a history file  are stripped of line break delimiters.

## Version 1.6.2 (July 4th, 2019)

### Bug Fixes

- The extracted history for the changelog sent to the MantisBT Releases plugin contains line breaks too short for web display

## Version 1.6.1 (July 4th, 2019)

### Bug Fixes

- history file not properly sent to Releases plugin api, no release created

## Version 1.6.0 (July 4th, 2019)

### Features

- add support for mantisbt releases via 'Releases' plugin, similar to github release

## Version 1.5.14 (June 27th, 2019)

### Build System

- fix svn links in config publishrc

### Documentation

- **readme:** update badges

### Bug Fixes

- if more than one occurrence of an environment tag is used in publishrc, only the first occurrence gets replaced.
- if more than one occurrence of an environment tag is used in publishrc, only the first occurrence gets replaced. [fixes #91]
- publish fails if there is (1) no package.json or (2) no repository defined in package.json but one is defined in publishrc.

## Version 1.5.13 (June 6th, 2019)

### Bug Fixes

- The network dist release upload is not being performed during a distruibution type release.

## Version 1.5.12 (June 4th, 2019)

### Bug Fixes

- a commit subject of "minfeat" is causing a minor release number bump when it should only cause a path number bump.

## Version 1.5.11 (June 4th, 2019)

### Bug Fixes

- the check to see if dist path is under version control is failing

## Version 1.5.10 (June 4th, 2019)

### Bug Fixes

- the previous release will not execute, caused by an invalid duplicate cmd line flag definition.

## Version 1.5.9 (June 4th, 2019)

### Bug Fixes

- files in dist directory are not being checked in to vc
- regression - reverting touched files fails after a dry run since v1.5.5.
- running a global app-publisher install from a project without a package.json is failing in v1.5.x
- when runnnig publish for a sub-project, failure occurs with the error "pathToMainRoot does not reverse match the pathPreRoot value"

### Code Refactoring

- exit when --no-ci flag is not passed instead of running in dry mode

## Version 1.5.8 (June 3rd, 2019)

### Bug Fixes

- github release is tagging version before touched version files are commited

### Code Refactoring

- add check for git repo type before making github release

## Version 1.5.7 (June 3rd, 2019)

### Bug Fixes

- setting textEditor config value to empty still opens notepad

### Code Refactoring

- ignore commits with a subject of "chore" when making entries in history/changelog file

## Version 1.5.6 (June 3rd, 2019)

### Bug Fixes

- during a github release, the logged response values are not displaying
- github release fails to load any assets past the first one

## Version 1.5.5 (June 3rd, 2019)

### Bug Fixes

- if running from a sub-project, reverting files fails in cases where publish fails and reverting is performed.

### Code Refactoring

- when logging a multi-line message, attempt to bring all lines after the frust line break in alignment with the 1st line (including the log stamp)

## Version 1.5.4 (June 3rd, 2019)

### Bug Fixes

- running 1.5 for a subversion build in run #1 causes an error and publish exits

## Version 1.5.3 (June 3rd, 2019)

### Bug Fixes

- package.json point to incorrect startup file for cli, run fails

## Version 1.5.2 (June 3rd, 2019)

## Version 1.5.1 (June 3rd, 2019)

### Bug Fixes

- external application stderr is logging with the error icon when it is just info

## Version 1.5.0 (June 3rd, 2019)

### Build System

- **ap:** update publishrc to 1.5 config
- **npm:** add --no-ci flags to app-publisher scripts

### Chores

- experimenting with semantic-release integration
- merge node-cli branch for start of node app-publisher development
- progress check in on node version
- remove test continue statement

### Features

- add support for github release type

### Bug Fixes

- assemblyinfor version is not replaced when incremental versioning is used

### Code Refactoring

- pass entire options configiration object to ps script as opposed to breaking down into string parameters.  preparation for semantic-release style publish flow.
- removed flag no longer needed from ps run
- validate current version found and next version calculated

### Code Styling

- add banner image for use in README

## Version 1.4.6 (May 31st, 2019)

### Build System

- **npm:** correct registry for spmeesseman package scope
- **npm:** fix app-publish script argument
- **npm:** remove unused @types/shelljs devdependency

### Bug Fixes

- assemblyinfo.cs version replacement error perf: in certain cases the package.json file is maniuplated 2x the # of times it needed to be. fix: if more than one assemblyinfo file existed within the project directory structure, each file gets appened to the next.
- for a a dist release, the pdf documentation does not get copied if it does not reside in the specific directory "documentation". The ps script now separately looks for pdf documentation in doc, documentation, and pathToDist folders.
- history file path with spaces in the path causes an error

### Code Styling

- add full set of tslint definitions to tslint config
- cleanup

## Version 1.4.5 (May 29th, 2019)

### Bug Fixes

- git tag is not pushed to remote

### Code Refactoring

- bundle json and marked packages for attempt to fix local package install

## Version 1.4.4 (May 29th, 2019)

### Code Refactoring

- removed all test references to semantic-release, fixed json package reference

## Version 1.4.3 (May 29th, 2019)

### Bug Fixes

- **npm:** scope name is being replaced with npm username

### Code Refactoring

- remove crlf force on package.json, npm is complaining

## Version 1.4.2 (May 29th, 2019)

### Build System

- **ap:** set history file to empty for git test
- **npm:** remove old json package, add new
- **npm:** update npmrc

### Chores

- convert to lf linebreaks for node.json compatibility
- pre 1.4.2 check in

### Documentation

- **readme:** edd info about setting powershell execution policy

### Bug Fixes

- an error is being thrown when publishing an application that uses non-semantic incremental versioning "version does not contain a method called Contains()"
- any publish run after the 1st is using the new version created in the first run as the current version
- apply cope name to package link in release email if not specified in publishrc but part of package name
- erros on ps cmdlet calls are not checked properly, a faild copy or move results in a false success
- for npm release, npm is being packed and attempt to copy to dist, when npmpackdist is Y but distrelease is N
- if an external command fails and the publish is cleaned up and stopped, the main process is still return exit code 0
- if npm registry is not specified in .publishrc, a dry-run publishes the npm package to registry.npm.org
- package.json files are being converted to line feeds only without carriage returns with release on windows
- version is not bumped in assemblyinfo.cs .net app releases when the app uses non-semantic incremental versioning

### Code Refactoring

- clean up the way the changelist is tracked, with new and existing files under vc
- if ps script returns a non-zero return code, force node process to exit with same error code

## Version 1.4.1 (May 28th, 2019)

### Chores

- v1.4.0 changelog correction from ap error

### Bug Fixes

- changelog is overwritten with new commits instead of being appended to
- regression - version tag is broken in previous release

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

## Version 1.3.0 (May 25th, 2019)

### Chores

- add json module dependency for manipulating package.json
- add txt-to-md script for future use
- regression fix version replacement in package-lock.json
- semantic release updates

### Documentation

- **readme:** add initial config param section
- **readme:** update info

### Features

- add marked down commit entry generation for changelog.md file edit

### Bug Fixes

- invalid subversion url using old ip, occassionally a file locked error occurs when package.json goes through text replacements

### Code Refactoring

- add config param author, remove npmuser.

	author inherits from enviroment variable UserName or USER by default.

- npm user replacement becomes author replacement

## [1.2.0](https://github.com/spmeesseman/app-publisher/compare/v1.1.6...v1.2.0) (2019-05-16)

### Documentation

* **readme:** Add app-publisher badge to readme page
* **readme:** Add table of contents
        
### Bug Fixes

* Set proper homepage, bugs, and repository links in package.json per project on publish run.  These links populate into the pages of the private NPM registry when published.  Project dependent, these links equate to:

	"bugs": {
		"url": "https://issues.development.pjats.com/project/ticket/report/1"
	},
	"homepage": "https://issues.development.pjats.com/project",
	"repository": {
		"type": "svn",
		"url": "https://issues.development.pjats.com/project/browser/trunk"
	}

* If a new file is created during publish in dry run mode (i.e. a new history file), delete that unversioned file when the rest of the touched files get reverted in SVN.

* When using the flag "notePadEdits" flag to manually edit version files during the publish, the Notepad windows are not opening in foreground when started by the NodeJS executable in Visual Studio Code.

* The last few characters of random history file entries are being stripped when the history file is auto-populated from version control comments.

* If two release types are being built, build commands and version file edits are happening twice.

* The commit sbuject tag "project" tag is not being converted to its proper title when the history file is auto-populated from version control comments.

### Features


* Add flag for projects that will upload files found in the "dist" directory but do not require auto-running a defined installer script:

	installerExDist


## [1.1.6](https://github.com/spmeesseman/app-publisher/compare/v1.1.5...v1.1.6) (2019-05-16)


### Bug Fixes

* if installerscript is not specified the existing installer is not being uploaded from dist dir [skip ci] ([0970b83](https://github.com/spmeesseman/app-publisher/commit/0970b83))
* if release is installer and npm, error occurs when trying to sent package.json version twice (non-fatal) ([e570f8a](https://github.com/spmeesseman/app-publisher/commit/e570f8a))
* the check to see if dist dir is under version control fails, causes commit to still fail ([5375ea6](https://github.com/spmeesseman/app-publisher/commit/5375ea6))

## [1.1.5](https://github.com/spmeesseman/app-publisher/compare/v1.1.4...v1.1.5) (2019-05-16)


### Bug Fixes

* dist path is being added to changelist even if it is not under version control, causing svn commit to fail at end of publish ([fc3e1b3](https://github.com/spmeesseman/app-publisher/commit/fc3e1b3))


### Build System

* **npm:** package.json cleanup [skip ci] ([770a948](https://github.com/spmeesseman/app-publisher/commit/770a948))


### Documentation

* **readme:** update info [skip ci] ([96235e1](https://github.com/spmeesseman/app-publisher/commit/96235e1))
* **readme:** update info [skip ci] ([75cedc9](https://github.com/spmeesseman/app-publisher/commit/75cedc9))

## [1.1.4](https://github.com/spmeesseman/app-publisher/compare/v1.1.3...v1.1.4) (2019-05-14)


### Bug Fixes

* env var placeholder in publishrc not replaced at runtime ([b4e1cc2](https://github.com/spmeesseman/app-publisher/commit/b4e1cc2))


### Build System

* **app-publisher:** add build command to publishrc [skip ci] ([abb0801](https://github.com/spmeesseman/app-publisher/commit/abb0801))
* **npm:** remove shelljs dep, add person and repo info [skip ci] ([2314d45](https://github.com/spmeesseman/app-publisher/commit/2314d45))
* **npm:** remove watch script command [skip ci] ([b1a761c](https://github.com/spmeesseman/app-publisher/commit/b1a761c))


### Code Refactoring

* re-add git repo tag used by semantic-release ([68a07d4](https://github.com/spmeesseman/app-publisher/commit/68a07d4))

## [1.1.3](https://github.com/spmeesseman/app-publisher/compare/v1.1.2...v1.1.3) (2019-05-13)


### Bug Fixes

* environment variable placeholders do not get replaced when config file is read in ([1b7af97](https://github.com/spmeesseman/app-publisher/commit/1b7af97))


### Code Refactoring

* add file logging ([d68ad00](https://github.com/spmeesseman/app-publisher/commit/d68ad00))
* add npm scope to config ([099af0d](https://github.com/spmeesseman/app-publisher/commit/099af0d))

## [1.1.2](https://github.com/spmeesseman/app-publisher/compare/v1.1.1...v1.1.2) (2019-05-13)


### Bug Fixes

* dual install type installer/npm is sending two deparate emails ([d5fc571](https://github.com/spmeesseman/app-publisher/commit/d5fc571))


### Code Refactoring

* allow same release on semantic-release due to integration with pj svn ([feef3bb](https://github.com/spmeesseman/app-publisher/commit/feef3bb))

## [1.1.1](https://github.com/spmeesseman/app-publisher/compare/v1.1.0...v1.1.1) (2019-05-13)


### Code Refactoring

* remove shelljs dependency, use node.child_process ([42b4351](https://github.com/spmeesseman/app-publisher/commit/42b4351))

# [1.1.0](https://github.com/spmeesseman/app-publisher/compare/v1.0.11...v1.1.0) (2019-05-13)


### Bug Fixes

* a file called 0 is being created when ps script is run and deployscript config is empty ([4d4ff3e](https://github.com/spmeesseman/app-publisher/commit/4d4ff3e))


### Features

* ps1 pj publish launch from nodejs ([871e529](https://github.com/spmeesseman/app-publisher/commit/871e529))

## [1.0.11](https://github.com/spmeesseman/app-publisher/compare/v1.0.10...v1.0.11) (2019-05-13)


### Bug Fixes

* another try to locate ps1 script properly ([0f7fae0](https://github.com/spmeesseman/app-publisher/commit/0f7fae0))

## [1.0.10](https://github.com/spmeesseman/app-publisher/compare/v1.0.9...v1.0.10) (2019-05-13)


### Bug Fixes

* still not finding ps1 script path for local installs ([50ed98b](https://github.com/spmeesseman/app-publisher/commit/50ed98b))

## [1.0.9](https://github.com/spmeesseman/app-publisher/compare/v1.0.8...v1.0.9) (2019-05-13)


### Bug Fixes

* find correct ps1 script before running exec ([46767f5](https://github.com/spmeesseman/app-publisher/commit/46767f5))

## [1.0.8](https://github.com/spmeesseman/app-publisher/compare/v1.0.7...v1.0.8) (2019-05-13)


### Bug Fixes

* dev dir run doesnt work ([6b9f9f1](https://github.com/spmeesseman/app-publisher/commit/6b9f9f1))

## [1.0.7](https://github.com/spmeesseman/app-publisher/compare/v1.0.6...v1.0.7) (2019-05-13)


### Bug Fixes

* perryjohnson scoped package does not launch ps script ([a1b26bd](https://github.com/spmeesseman/app-publisher/commit/a1b26bd))

## [1.0.6](https://github.com/spmeesseman/app-publisher/compare/v1.0.5...v1.0.6) (2019-05-13)


### Bug Fixes

* stdin doesnt work during ps script run ([1fcf5fd](https://github.com/spmeesseman/app-publisher/commit/1fcf5fd))

## [1.0.5](https://github.com/spmeesseman/app-publisher/compare/v1.0.4...v1.0.5) (2019-05-13)


### Bug Fixes

* if history file directory doesnt already exist, ps script fails ([1f88b80](https://github.com/spmeesseman/app-publisher/commit/1f88b80))
* setting empty values in config file causes ps script to fail ([6bf8030](https://github.com/spmeesseman/app-publisher/commit/6bf8030))

## [1.0.4](https://github.com/spmeesseman/app-publisher/compare/v1.0.3...v1.0.4) (2019-05-13)


### Bug Fixes

* format ps args not passing to ps ([01575a4](https://github.com/spmeesseman/app-publisher/commit/01575a4))

## [1.0.3](https://github.com/spmeesseman/app-publisher/compare/v1.0.2...v1.0.3) (2019-05-12)


### Bug Fixes

* script array property in config file is not parsed correctly ([7f128a2](https://github.com/spmeesseman/app-publisher/commit/7f128a2))

## [1.0.2](https://github.com/spmeesseman/app-publisher/compare/v1.0.1...v1.0.2) (2019-05-12)


### Bug Fixes

* dry-run flag causes an error ([fe68f60](https://github.com/spmeesseman/app-publisher/commit/fe68f60))

## [1.0.1](https://github.com/spmeesseman/app-publisher/compare/v1.0.0...v1.0.1) (2019-05-12)


### Bug Fixes

* launch powershell task on pj publish ([0fc1e21](https://github.com/spmeesseman/app-publisher/commit/0fc1e21))
* launch powershell task on pj publish ([356219b](https://github.com/spmeesseman/app-publisher/commit/356219b))

# 1.0.0 (2019-05-11)


### Bug Fixes

* launch ps1 on command ([9cb2c0d](https://github.com/spmeesseman/app-publisher/commit/9cb2c0d))


### Build System

* **npm:** add shelljs to launch ps1 script ([5812b84](https://github.com/spmeesseman/app-publisher/commit/5812b84))
* **npm:** update ([35a0e7d](https://github.com/spmeesseman/app-publisher/commit/35a0e7d))


### Features

* initial check in ([0865e24](https://github.com/spmeesseman/app-publisher/commit/0865e24))


### Minor Features

* output success/failure after writing version to file ([030d4a8](https://github.com/spmeesseman/app-publisher/commit/030d4a8))

