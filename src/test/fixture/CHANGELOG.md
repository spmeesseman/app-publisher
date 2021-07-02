# APP-PUBLISHER CHANGE LOG

## Version 3.2.1 (June 30th, 2021)

### Bug Fixes

- **Changelog:** mantis/github release messages are not aligned correctly when the commit message is multi-line and uses indentation.
- **Configuration:** the 'configName' option no longer works.
- **Email:** regression - notification is missing the release notes in v3.1.0.
- **Versioning:** for ExtJs projects, when a pre-release version is read from from app.json, it is not converted back to true version using the '-' character.

## Version 3.2.0 (June 29th, 2021)

### Features

- **Tasks:** Add new 'task mode' command line switches:
	
		--task-release-level
	
	Using these options instructs the process to output the next release's 'release level' to stdout.  Can be one of 'none', 'patch', 'minor', or 'major'.

### Bug Fixes

- **Releases:** first/initial release fails if locally extracted version number is not 1.0.0.
- **Validation:** svn repo path is incorrect if publishrc specifes branch path with branch name in the 'branch' property.

### Refactoring

- dynamic type lookup on args to set stdout mode
- **Changelog:** add text 'MantisBT' to 'GitHub' to subject formatting.

### Continuous Integration

- **Pre-build:** run clean in pre-build, eliminate double build for tests

## Version 3.1.1 (June 29th, 2021)

### Bug Fixes

- **Mantisbt:** extracted version number contains a space character and fails version validation
- **Versioning:** An extjs app.json version bump doesn't replace the Sencha Cmd un-supported '-' character with '.', and production builds fail
- **Versioning:** the taskRevert task fails with 'TypeError: Cannot read property 'info' of undefined'.

### Refactoring

- **Versioning:** the --task-version-current switch now checks remote tag and runs local version file validation

### tests

- coverage progress
- first successful run with nyc

### Continuous Integration

- **Jenkinsfile:** fix env mv to params err
- progress

## Version 3.1.0 (June 27th, 2021)

### Documentation

- **Readme:** add section link on vscode-taskexplorer intergation
- **Readme:** fix img src for cmd line banner
- **Readme:** remove semantic-release badge
- **Readme:** update banner img
- **Readme:** update with v3 changes

### Features

- **Versioning:** complete version validation across all local version files
- **Versioning:** cross-file version handling eith 'versionFiles' property
- **Tasks:** Add new 'task mode' command line switch:
	
		-tcp ,  --task-changelog-print
	
	Using this option instructs the process to output the the pending version's current changelog to stdout.
- **Tasks:** Add new 'task mode' command line switch:
	
		-tcp ,  --task-changelog-print
	
	Using this option instructs the process to output the the pending version's current changelog to stdout.
- **Tasks:** Add new 'task mode' command line switches:
	
		--task-changelog-print-version
		--task-changelog-view-version
	
	Using these options instructs the process to view, or output to stdout, the changelog for the specified version.
- **Tasks:** Add new 'task mode' command line switches:
	
		--task-deploy
	
	Using these options instructs the process to run the deployment scripts defined in the 'deployCommand' publishrc property.
- **Tasks:** Add new 'task mode' command line switches:
	
		--task-npm-json-restore
		--task-npm-json-update
	
	Using these options instructs the process to dynamically update/restore the package.json file with the NPM related .publishrc defined properties.
- **Tasks:** Add new 'task mode' command line switches:
	
		--task-revert
	
	Using these options instructs the process to revert all changes made from task usage.

### Bug Fixes

- **Versioning:** on win32, the edit-file script for file edits  is not found and casues an exception
- **Versioning:** version replacement is only replacing first match found it more than one match exists
- **Versioning:** version replacement is throwing an exception in publishrc.versionFiles defined files
- **Changelog:** multi-line commit messages are double printed in md type cahngelogs.
- **Changelog:** when a new md type changelog file is auto-created on a first ap release, the project name is inserted at the bottom of the created section.
- **Commit:** log output incorrectly reads 'Pushing touched files to svn...' if repo type is git.
- **Dotnet:** assemblyinfo file version replacement is removing the 4th part of the .NET version number (build number)
- **Dry Run:** files that are 'added' are causing the dry commit to fail.
- **Tasks:** the --task-version-update task should perform package.json manipulation and dynamic scoping.
- **Versioning:** the .publishrc file's 'promptVersion' property value is being overwritten with the new version number when performing the version file updates.
- **Versioning:** the versionPreReleaseId option is not figuring into thecalculation of the next version.

### Refactoring

- **Dry Run:** revert dry run changes in vcs on controlled fail as well as exception
- **Changelog:** Add 'crud' text to list of commit message formatters that get uppercased when formatting commit messages for a changelog section.
- **Changelog:** capitalize and pluralize ticket tags. i.e. "fix" should become "Fixes".

## Version 3.0.3 (June 24th, 2021)

### Bug Fixes

- **General:** handful of fixes exposed by interface extension
- **Changelog:** build and ci subject commit messages should be sorted to the end when creating a new history / changelog section.
- **Changelog:** html changelog extracted from md type doesnt remove scope name from message.
- **Changelog:** remove [...] commit tags from commit message entries other than ticket related tags.
- **General:** builds fail on win32: Command failed: powershell.exe, the term 'undefined' is not recognized as the name of a cmdlet
- **NPM Release:** dynamic package.json manipulation does not restore homepage or repository url correctly.

### Refactoring

- **Changelog:** uppercased words/acronyms in the commit message subject get title cased when creating the history / changelog file entry.
- **Changelog:** populate the scope column with 'General' in the HTML changelog if there is no scope in the commit message for that entry.
- **Changelog:** remove all release tags in the form [* release], e.g.,, etc.

### Continuous Integration

- **Checkout:** if last commit includes the [skip-ci] tag, then exit build.

## Version 3.0.2 (June 23rd, 2021)

### Bug Fixes

- **Mantis Release:** a failed github release causes uncaught exceptions
- **NPM Release:** commit messages with a scope are not figuring into the calculation of the next version
- **Dry Run:** dry run changes are not being reverted if vcRevert flag is set to "Y"
- **Changelog:** the --task-changelog task is writing a section with 0 messages
- **NPM Release:** dynamic scoping from pubishrc property not wokring
- **Verify:** svn runnot verifying tag name exists

### Refactoring

- **Logging:** add tags to verbose logging
- **General:** powershell implementation is now removed
- **Npm Release:** dynamic scoping should wait to just before commit/tag stage beofre being restored.

## Version 3.0.1 (June 23rd, 2021)

### Bug Fixes

- spaces are being removed in changelog scope names
- tags are being created with an additional 'v' pre-pended [skip ci]
- **Changelog:** commits are not being sorted alphabetically when creating the history/changelog entry. [skip ci]
- **Changelog:** creating the html changelog with the -task-changelog-html-* tasks is not parsing the notes correctly [skip ci]
- **Github Release:** assets fails to upload

### Refactoring

- gracefully exit wih success if commit or tag fails, print message indicating manual action required on failure [skip ci]
- the --task-changelog-view task is not prining the version header [skip ci]
- **Tasks:** allow mantis and github release tasks w/o constraint of existing changes since previous release

## Version 3.0.0 (June 22nd, 2021)

### Features

- Use pure NodeJS based implementation (BETA).

    To use the underlying NodeJS based implementation, the following command
    line switch can be used:

        --node

    By default, the underlying implementation used will continue to use NodeJS
    for the loader and PowerShell for the publish run and/or all tasks.  The
    PowerShell implementation will be depracated in favor of NodeJS when it
    becomes stable.
