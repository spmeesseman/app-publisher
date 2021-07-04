# APP-PUBLISHER CHANGE LOG

## Version 3.3.0 (July 4th, 2021)

### Bug Fixes

- **VCS:** the svn environment credentials are not working for verifying a tag ref in the repository.  All other commands appear to be working.
- **Tasks:** the '--task-changelog' task fails local file version validation if it is ran after '--task-version-update' in a task distributed publish run.
- **Versioning:** version compare on first release should use coerced semantic versions in the case of a project with incremental versioning
- **Tasks:** the '--get-version-next and '--get-verrsion-info' tasks fail if the project is semantically versioned and no relevant commits exist that would bump the version.

### Features

- **Tasks:** add two new tasks for dynamically building the changelog in a distributed task publish run:
	
		--task-changelog-hdr-print
		--task-changelog-hdr-print
	
	To be used in a CI environment where executin of a desktop application is not possible.

### Refactoring

- **General:** add validation for task switches that should be ran alone without other tasks.
- **Changelog:** desktop and gui application launching is unachievable in a Windows CI.  Do not attempt to open any changelogs during a publish run or a distributed task run using a desktop application when a CI is detected.

### Tests

- add additional, increase coverage
- npm version is read incorrectly from package.json after first test (used require)

## Version 3.2.5 (July 3rd, 2021)

### Bug Fixes

- **Tasks:** regression - the '--task-revert' task no longer works as of v3.2.3.
- **Tasks:** the --task-commit and --task-tag tasks are failing to find edits that were made in a task distributed publish run.

### Refactoring

- add additional verbose option for a third level of verbosity.

## Version 3.2.4 (July 3rd, 2021)

### Bug Fixes

- **Commit:** the '--task-commit' task fails if the distributed task run targets a pre-release.

## Version 3.2.3 (July 3rd, 2021)

### Bug Fixes

- **Versioning:** regression - The 'setFiles' operation of the versionFiles definition is broken in v3.2.2.
- **Versioning:** regression - The '--task-version-update' task is broken in 3.2.2, and throws a changelog parsing error.

## Version 3.2.2 (July 2nd, 2021)

### Bug Fixes

- **Changelog:** commit messages with a 'fix' subject are converted to test 'bug fix', but are sorted using the text 'fix' when constructing a new changelog section.
- **Commit:** files specified by the 'vcFiles' option cause commit stage to fail if the file was not already under version control.
- vcs stdout output no longer shows.  turn vcs stdout on with --vc-std-out or --verbose switches.
- versionFiles regex definitions with the word 'version' inside the regex causes the version to not be replced within the file.
- incremental versioning
- dist release not working, docs or base files
- the --skip-version-edits command line flag has no effect
- **Email:** log in email notification is using an invaid path
- if no config file is found, a misleading error message is given.  the error should specify the missing config.
- **Dry Run:** the git tag/push is not running in dry run mode
- the unset env variables warning in options validation is not working
- version validation fails when using --version-force-next

### Documentation

- **Readme:** update description

### Refactoring

- removed option 'versionReplaceTags', replaced by new 'versionFiles' definition.
- add warning to logging when processing vcFiles and vcRevertFiles and file doesnt exist
- add version tag replacement on files specified by the 'versionFiles' property.
- preserve multi-spaces in json when writing version
- **Changelogs:** add header specified by 'changelogHdrFile' to md type changelog
- removed publishrc property/argument 'historyFile', use 'changelogFile'.
- **Releases:** allow the tag $(VERSION)to be used  in an asset name for a Mantis or GitHub release, replaced with the version number upon runtime upload.

### Tests

- add dist fixtures
- add full dry run, increase coverage
- prepare for full tests

### Continuous Integration

- prepare for first test publish

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
- **Dry Run:** dry run changes are not being reverted if dryRunVcRevert flag is set to "Y"
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

## Version 2.7.2 (June 17th, 2021)

### Bug Fixes

- An unnecessary history file entry is still being created in a tmp directory and scheduled to be added to version control when the --task-commit command line switch is used.

## Version 2.7.1 (June 17th, 2021)

### Bug Fixes

- When using the --task-changelog-view or --task-changelog-file command line switches together with the --task-commit switch, the temporary file created is being added to version control.

## Version 2.7.0 (June 16th, 2021)

### Features

- Add new 'task mode' command line switch:

        --task-commit

    Using this option instructs the process to commit the current modified file set.  This includes the history/changelog file and any version files that were updated.

    Note that the --task-touch-versions switche should precede or accompany this switch.

- Add new 'task mode' command line switch:

        --task-tag <version>

    Using this option instructs the process to tag the current state of the workspace.  To auto-calculate the version to be used in the tag name, specify 'auto' as the positional parameter 'version', e.g.:

        app-publisher --task-tag auto

    Note that the --task-touch-versions and --task-commit switches should precede or accompany this switch.

### Bug Fixes

- The commit map defined by the publishrc property 'commitMsgMap' only works if there are no 'patch' level commit messages in the changeset used to build the the history file entry.

### Refactoring

- Handle commit messages with subject 'ci' (continuous integration).  Does not participate in version calculation, but participates in the construction of the history file entry.

### Continuous Integration

- Add initial Jenkinsfile.

## Version 2.6.2 (June 15th, 2021)

### Bug Fixes

- The '--task-changelog-file' command line option is writing to the history file specified in .publishrc, and not the file name specified by it's positional parameter.

- The '--version-force-next' command line switch is not accepted by the argument parser.

## Version 2.6.1 (June 15th, 2021)

### Bug Fixes

- The '--version-force-current' command line switch is not accepted by the argument parser.

## Version 2.6.0 (June 15th, 2021)

### Features

- Add new 'task mode' command line switch:

        --task-version-pre-release-id

    Using this option instructs the process to output the pre-release identifier from a specified branch name or version string.

## Version 2.5.2 (June 15th, 2021)

### Documentation:  Readme

    Remove reference to Jenkins token value.

## Version 2.5.1 (June 15th, 2021)

### Refactoring

    The 'usage' help output does not line up vertically.

## Version 2.5.0 (June 15th, 2021)

### Features

- Add new command line option to specify a pre-release identifier to use when calculating the next version:

        --version-pre-release-id

    Using this option instructs the process to use the provided pre-release identifier while calculating the new version.

## Version 2.4.0 (June 14th, 2021)

### Features

- Add support for version control and replacement in Maven pom.xml project files.

## Version 2.3.0 (June 5th, 2021)

### Features

- Add new 'task mode' command line switch:

        -tvi ,  --task-version-info

    Using this option instructs the process to output both the current version of the last released build, and the proposed next version # to stdout. Outputs in the format 'current|next'.

- Add new 'task mode' command line switch:

        -tcei,  --task-ci-env-info

    Using this option instructs the process to output CI related buildinformation to stdout.  Outputs in the format 'current|next|changelog'.

- Add new command line switch option:

        --version-force-current ,  --version-force

    Using this option instructs the process to use the provided version number for the 'current version'.

- Add new command line switch option:

        --version-force-next

    Using this option instructs the process to use the provided version number for the 'next version'.  Note that a version number will not be calculated, and a VCS request will be skipped

## Version 2.2.5 (June 5th, 2021)

### Refactoring

- Output task related message to the console when a task finishes, not the standard "release successful" message.

## Version 2.2.4 (June 5th, 2021)

### Bug Fixes

- Flag type command line arguments should just default to "Y" is there is no positional value specified (behaving like a boolean type).

## Version 2.2.3 (June 5th, 2021)

### Bug Fixes

- Flag type command line arguments should just default to "Y" is there is no positional value specified (behaving like a boolean type).

## Version 2.2.2 (June 5th, 2021)

### Bug Fixes

- Flag type command line args should accept a positional parameter of Y/N/y/n. Or, if omitted, and the option is specified, default the flag value to "Y".

## Version 2.2.1 (June 5th, 2021)

### Bug Fixes

- Stdout commands are still outputting some log messages to the console.

## Version 2.2.0 (June 5th, 2021)

### Features

- Add new command line switch:

        --verbose

    Using this option instructs the process to perform additional logging.

### Bug Fixes

- For stdout type tasks, if an error occurs, the error messages are not output to the console.

- If there has not been a successful SVN login before using the svn command found in the system PATH, all tasks and publish runs fail.  The SVN username and token can now be stored in the environment for such cases:

    SVN_AUTHOR_NAME
    SVN_TOKEN

## Version 2.1.2 (June 4th, 2021)

### Bug Fixes

- **general:** The stdout output is double line broken if the output is from a task that is to output data to stdout.
- **ci:** The CI environment is not being set to use the Subversion service module
    properties, continues to use 'Git' as the default.

### Refactoring

- **changelog:** Remove CI related tags ([skip-ci], etc) from commit messages when formatting the changelog/history file entry.

## Version 2.1.1 (June 4th, 2021)

### Bug Fixes

- Running the process with the cmd line options '--task-version-current' or '--task-version-next' are outputting some additional text to the console other than just the just version number itself.

## Version 2.1.0 (June 4th, 2021)

### Features

- Add new 'task mode' command line switch:

        --task-ci-env-set

    Using this option instructs the process to export relevant build variables
    to a file that can be used to inject environment varilables into the CI's
    build process.  The following variables are exported:

        AP_CHANGELOG_FILE
        AP_CURRENT_VERSION
        AP_NEXT_VERSION

### Bug Fixes

- Commits that fit onto a single line in the history file should have a '.' character inserted at the end if one does not exist already.
- Running the process in bin command mode throws errors when running it on the app-publisher project itself.

## Version 2.0.0 (June 3rd, 2021)

### Features

- Add initial support for running within a CI system.
- All .publishrc properties can now be specified on command line in dashed lowercase form, converted from the .publishrc property camel-case form.

    For example, the command line option to override the .publishrc switch
    property 'emailNotification' would be:

        --email-notification
- Add new 'task mode' command line switch:

        -tcv, --task-changelog-view

    Run 'app-publisher --help' for details.
- Add new 'task mode' command line switch:

        -tcf <filename>,  --task-changelog-file <filename>

    Using this option instructs the process to create the changelog for the
    pending next version.  Similar to the '--task-changelog-view' option, but it
    will write to the specified file, and will not open the file for viewing.
- Add new 'task mode' command line switch:

        -tmr,  --task-mantisbt-release

    Using this option instructs the process to perform a MantisBT release only,
    using the next calculated version number.
- Add new 'task mode' command line switch:

        -ttv,  --task-touch-versions

    Using this option instructs the process to update all versioned files with.
    the next / new version #.  Versioned filed by default include:

        app.json
        assemblynnfo.cs
        package.json

    Additional versioned files can be specified in the .publishrc file using the
    following properties:

        cProjectRcFile
        versionFiles
- Add new 'task mode' command line switch:

        -ttvc,  --task-touch-versions-commit

    Using this option instructs the process to run the following steps:

        1) Update version files (equivalent to using the -ttv option).
        2) Commit changed files using the 'chore: vX.X.X' format for the commit
           message.
        3) Tag using the 'vX.X.X' format for the tag name.
- Add new 'task mode' command line switch:

        --task-ci-env

    Using this option instructs the process to output details about the current
    CI environment.
- Add new 'task mode' command line switch:

        --task-version-current

    Using this option instructs the process to output the version # of the last
    released build.
- Add new 'task mode' command line switch:

        --task-version-next

    Using this option instructs the process to calculate and output the version #
    of the next released build, based on commit message subjects and version file
    parsing.
- **help:** Improved help output.  Run 'app-publisher --help' for details.

### Bug Fixes

- If a tag in the format 'vX.X.X' is created manually, then deleted, all commit messages collected when building a new release are pulled after the revision of the deleted tag, commits made prior to that revision are not collected. Poll prior tags until tag version is found that still exists.
- v1.22 breaks the embedded VSCode Task Manager commands (the -p option being no longer supported).

### Refactoring

- Remove argparse command line parser, implement custom solution.
- Reduce line breaks in informational commands that are output on the command line, i.e. '--version', '--help', etc.

### Documentation

- **readme:** Add initial section on 'task mode' commands.

## Version 1.22.0 (June 1st, 2021)

### Documentation

**readme:** Testing ci

### Features

- Add new publisrc property to skip changelog/history file edits:

        skipChangelogEdits

    Setting this flag to "Y" will skip editing of the changelog/history file,
    and it will be used as output by the parser without intervention.

    Refactoring

    When run in a CI environment, all interaction properties should be
    automatically disabled regardless of what is secified in the publishrc file:

        promptVersion
        skipChangelogEdits
        skipVersionEdits
        versionFilesEditAlways

### Bug Fixes

- When specifying a branch name, the commits since the last tag found are still being read from the trunk when creating the changelog / history file.

### Refactoring

- Add initial detailed help option, include the supported publishrc properties.

    Detailed help can be displayed with the command line options:

        -h2  ,  --help-detailed

## Version 1.21.0 (May 28th, 2021)

### Features

- Add initial Subversion support to CI environment detection.
- Add new command line option as a single task mode option:

        -c  ,  --changelog-only

    Specifying this option will open the current changelog for the next version
    in the editor specified in .publishrc.json (Notepad by default), and exit.
- Add new command line option for specifying supported publishrc properties:

        -o  ,  --option

    For example:

        npx app-publisher -o branch=v2.0.0 --no-ci --changelog-only

    Options specified on the command line in this manner will override the
    corresponding property values set in the .publishrc.json.

### Bug Fixes

- Commits tagged with a subject of 'project' or 'style' should not be included in the changelog.

### Refactoring

- Improve the log output in different CI / Non-CI publishing scenarios.
- The option following publishrc property:

        interactive

    Has been renamed to:

        promptVersion

    The old option 'interactive' will remain backward compatible and continue to
    work as it has.
- When a publish run fails, print the error code to the console in addition to
    the error message.

## Version 1.20.2 (May 23rd, 2021)

### Bug Fixes

- The current version is not read from package.json if the node_modules directory doesn't exist, and falls back to parsing the history file. If the history file deosnt exist (e.g. for an initial release), an error occurs.

## Version 1.20.1 (May 19th, 2021)

### Bug Fixes

- The specified branch name in the .publishrc.json file is not applied to the version control command to check for the latest comits since the previous release.

## Version 1.20.0 (April 30th, 2021)

### Features

- Add filename variable replacement to use in 'versionFiles' configuration values.

    The following two variables have been added, and will be replaced with the
    appropriate version # when the publishing process opens/modifies the named
    file:

        ${NEWVERSION}
        ${CURRENTVERSION}

    Example usage in .publishrc.json:

        "versionFiles": [
            "src\\Install.sql",
            "src\\update\\v${NEWVERSION}.sql"
        ]

### Bug Fixes

- Unversioned files in the defined distribution folder are not added to version control when setting the 'distAddAllVc' configuration value to 'Y'.

## Version 1.19.4 (October 18th, 2020)

### Bug Fixes

- Unversioned (new) 'dist' files not being added to version control.  Add new publishrc config property:

        distAddAllVc

    Setting this property to "Y" will cause any unversioned files found in the
    'Dist' directory after running the build commands to be added to version
    control.

### Refactoring

- Place 'build' commit comments at the end of the generated changelog/history file.

### Bug Fixes

- If a history file already exists when aking a first release, using the 'interactive' version input mechanism causes the history file to not be written with the appropriate version header information.

### Bug Fixes

- Detect a first release and do not increment the version that was read in from the version file (package.json/history.txt/.publishrc.json).

## Version 1.19.3 (May 10th, 2020)

### Bug Fixes:  Changelog

- The fix in the previous version was applied to the incorrect parsing regex.

    Original issue:  When there is a period character in a commit scope, the
    formatted subject line in the changelog/history file for that commit is not
    being broken apart and formatted correctly.

## Version 1.19.2 (May 10th, 2020)

### Bug Fixes

- **changelog:** When there is a period character in a commit scope, the formatted subject line in the changelog/history file for that commit is not being broken apart and formatted correctly.

## Version 1.19.1 (April 20th, 2020)

### Bug Fixes

- During automatic version replacement in files that contain the version number, any custom defined version property that uses an upper case character is being lower cased.
- Unbroken lines in a commit comment that are  longer than the defined historyLineLen property in .publishrc are breaking the release process when building the new history file secton.

## Version 1.19.0 (March 26th, 2020)

### Features:  Documentation Release

- Add support for specifying a local docs directory in the publishrc config file to use for the documentation upload source directory.  Currently it is hard coded to look for a directory called "doc", "docs", or "documentation" at the project root.

## Version 1.18.0 (January 31st, 2020)

### Features

- Add command line options for running the publisher in 'republish' mode.

    The following command line option has been added to achieve this
    functionality:

        --republish
- Add support for re-sending the release notification email for the
    current/latest version.

    This should be a mode where the only task performed is re-sending the exact
    email notification that was sent on the current version's initial release.

    The following command line option has been added to activate this mode:

        --email-only

    The following .publishrc variable (set to true or 'Y') has been added to
    activate this mode:

        emailOnly

    [Closes #1598]

### Bug Fixes

- **readme:** When the release notification email is sent in 'publish' mode, the log does not show the success stamp like it does when in 'dry run' mode.

## Version 1.17.0 (January 11th, 2020)

### Documentation:  Readme

- **readme:** Add screenshot and new section on running without Code Package environment.

    Note this is currently not working until an issue is resolved with mime type associations in the WebSVN server.

### Features

- Add support for more event hooks at different points of release.

    The following event hook properties in .publishrc.json have been defined:

        preCommitCommand
        postCommitCommand
        distReleasePreCommand
        distReleasePostCommand
        githubReleasePreCommand
        githubReleasePostCommand
        mantisReleasePreCommand
        mantisReleasePostCommand
        npmReleasePreCommand
        npmReleasePostCommand

    All properties can be a string, or an array of strings, representing a
    command or set of commands to run in a PowerShell shell at the various
    points of the release excecution.
- Add support to scroll files found in version files to bottom on edit.

    This is accomplished via the new config property that can be defined in
    publishrc.json:

        versionFilesScrollDown: []

    An array of files (that are also found in  the 'versionFiles' or
    'versionFilesAlwaysEdit' property, that will have their contents scrolled to
    the bottom if the file is opened for edit.

## Version 1.16.0 (January 9th, 2020)

### Features:  General

- **general:** Add support for version replacement using custom tag.

    This is acheived via the following new property in .publishrc.json:

        versionReplaceTags

    This new property can be specified as a string, or an array of strings. that
    can be used for version updating in custom version files defined in the
    "versionFiles" property of .publishrc.json.

    For example:

    Aassume the new version number is 1.1.0 and the old version number is 1.0.5,
    and the following is defined in .publishrc.json:

         "versionReplaceTags": "PROJECT_VERSION = "

    This will cause any occurences of "DATABASE_VERSION = 1.0.5" in the files
    specified in "versionFiles" will be replaced with the string
    "PROJECT_VERSION = 1.1.0" .

### Bug Fixes

- **dist release:** The contents in the directory specified as the 'dist' directory are not
    recursively uploaded to the specified network drive location.  Only files
    in the base folder are uploaded.

## Version 1.15.1 (January 7th, 2020)

### Bug Fixes:  General

- **general:** Release fails if the history file contains no asterisk line.

    Most PJ projects contain a line of 75+ asterisks in the history file
    separating the date/version from the changelog entries.

    Add support for history files that only contain a dashed line to separate
    the date/version from the changelog entries.
- **mantisbt release:** Release fails to upload if project name contains spaces.

## Version 1.15.0 (December 22nd, 2019)

### Features

- Add support for an application defined commit map property in .publishrc.json.

    Ths functionality is achieved with the following new property:

        commitMsgMap

    This property should be an object which defines each commit subject mapping.
    Each commit subject mapping is also an object that can define the following
    propertiies:

        formatText
        iconCls
        include
        versionBump

    For example:

        "commitMsgMap": {
            "internal": {
                "versionBump": "patch",
                "formatText": "Internal Change",
                "include": true,
                "iconCls": "fa-building"
            }
        }

## Version 1.14.2 (December 19th, 2019)

### Bug Fixes

- **general:** The history file is not populated if a commit contains an indented numbered
    list.  The following script error is seen:

        Cannot execute command 'is', no such command or program can be found.

- **releases:** Github release is created successfully but as of v1.14 it is showing as a
    draft on Github, must manually publish.

## Version 1.14.1 (November 22nd, 2019)

### Bug Fixes

- **email:** Notification is not sent if all three preoperties 'distRelease', 'npmRelease', and 'nugetRelease' are not enabled in .publishrc.json.

## Version 1.14.0 (November 18th, 2019)

### Features

- **general:** Add support to re-publish only parts of release using the current version #
    and history/changelog file.

    The following object property has been added to publishrc.json to achieve
    this functionality:

        republish: { }

    When this property is defined, and contains at least one of it's own
    properties, the publish will process only the tasks specified within the
    republish object.  History/changelog files will not be opened for editing
    and the version used will be the current one.  For example, to make a
    MantisBT release only, the republish property can be set as follows:

        republish:
        {
            mantisbtRelease: "Y"
        }

### Bug Fixes

**releases:** If a GitHub release is made, the version tag fails on the Github repository afterwards.  The tag is created when the release is made and does not include the modified versioned files.

## Version 1.13.18 (November 12th, 2019)

### Bug Fixes

- **changelog:** When applying indentation to broken indented lines, take into consideration if the indentation is an unordered (using asterisk markers) or an ordered list.  Line up subsequent broken lines underneath the first word of the indented text, as opposed to lining up underneath the list number or marker.
- **changelog:** Entries that are only one line are being indented an extra 4 spaces since Version 1.13.16.
- **changelog:** If a space character is accidentally entered in a commit message preceding a line broken ticket number tag, unnecessary line breaks are added before the tag. This fix allows just one space character before a line broken ticket number tag.
- **changelog:** The functionality to perform indentation on broken lines that was added in the previous releases does not cut lines a maximum length in some cases.

## Version 1.13.17 (November 12th, 2019)

### Bug Fixes

- **changelog:** Perform indentation on broken lines.

    If a commit message contains indented text, and the text is longer than the
    maximum line length, pre-pad each of the broken lines with the same
    indentation size used.

    [Fixes #1054]
- Line lengths are still not broken up correctly when creating the history
    file entries.   Can still be 1-2 characters off.

    [References #177]

## Version 1.13.16 (November 11th, 2019)

### Bug Fixes

- **changelog:** Commit messages that contain indented text on a new line are having the
    indentation spaces removed when the history file entries are created.
- **changelog:** Scope tags that are entered all upper case in the commit message are being title cased when the history file entries are created. Title casing will now be done on the scope tag only when it is all lower case.
- **changelog:** Ticket tags that are on a separate line in the commit message, but not separated by at least two line breaks from the last alpha character in the message, are being padded with extra line breaks when the history file entries are created.

### Refactoring

- **changelog:** Shorthand ticket tags should be expanded or set to a single value within the set for better continuity when creating the history file entries.  For example, 'fix', 'fixes' and 'fixed' will all be formatted as 'Fixes'.
- Allow new 'perfmin' and 'minperf' subject tags to be performance enhancement entries in the history file with only a patch level version bump as opposed to the minor version bump given to 'perf'.

## Version 1.13.15 (November 9th, 2019)

### Bug Fixes

- **changelog:** Ticket tags that are on a separate line in the commit message are being padded with extra line breaks when the history file entries are created.

## Version 1.13.14 (November 8th, 2019)

### Bug Fixes

- **changelog:** Ticket tag links in the Mantis release changelog were broken in the 1.13.13 release.

## Version 1.13.13 (November 8th, 2019)

### Features

- **changelog:** Auto capitalize subject and scope when creating history and changelog entries.
- **changelog:** Capitalize commit ticket tag, i.e. 'fixes', 'closes', 'references', etc.

### Bug Fixes

- **changelog:** The first line is always short of the maximum line length in each of the formatted history entries.
- **general:** Check execution policy when publish is ran, ensure that it is set to 'remotesigned', output descriptive error message if not set and describe how to set.
- The history header randomly fails to be written to the history file when the new section is auto generated and opened for editing.

## Version 1.13.12 (October 29th, 2019)

### Features

- **changelog:** Allow edit of auto generated changelog file before uploading mantisbt release. [closes #186]

### Bug Fixes

- **changelog:** If there are a mix of history file entries that contain a subject, and ones that do not contains a subject line, the github/mantis changelog becomes corrupted.
- **changelog:** If there is only one entry in the history file, and it does not contain a subject line, the mantis/github release fails.
- Generated text lines sometimes extend past header max length.
- Prompt for initial version on first project release.

## Version 1.13.11 (October 29th, 2019)

### Bug Fixes

- If over 50 commits have been made since the last version tag, some commits are not populated in the changelog.
- AssemblyInfo version update for .NET applications is not working if the application is using an incremental versioning system.
- The 11th of the month incorrectly displayed in version header.

## Version 1.13.10 (October 10th, 2019)

### Bug Fixes

- Using a scope in a commit message causes that message subect to be discluded from determing the next version.
- The subject "perf" should perform a minor version increment, not a patch level increment.

### Refactoring

- Remove windows installer build

## Version 1.13.9 (September 7th, 2019)

### Bug Fixes

- The release changelog html is malformed if the history file section contains a line break, followed by four or more spaces, followed by another line break.

### Refactoring

- Email footer app stamp should read 'Do not respond to this email message'.
- Run mantisbt/github releases before version control check in, before dry run changes are reverted.  Enables easier debugging while changelog parser is pre-stable.

## Version 1.13.8 (August 31st, 2019)

### Bug Fixes:  Releases

- **releases:** The mantis/github release fails when generating the changelog if any of the numbered items in a history text file contains a space between the last digit and the period character used to terminate.

    For example:

        12 .  commit text here

    as opposed to correct syntax:

        -  commit text here

## Version 1.13.7 (August 24th, 2019)

### Bug Fixes

- **changelog:** If a subject/scope is used in the commit, but the subject is not part of the
    pre-defined subject list, the scope part of the commit ends up incorrectly
    offset by one row from the subject.
- **releases:** An asterisk character in any commit message causes the github and/or mantisbt
    release to fail.

    This was due to a bug in the history text file parsing.
- **changelog:** Line breaks in the history file are removed but not replaced with a space
    character when parsing the history file, and adjacent words are joined as
    one in the release changelog.

    [fixes #346]

## Version 1.13.6 (August 15th, 2019_

### Bug Fixes

- For an NPM release, if the 'npmPackDist' flag is set, but the output tarball is not yet under version control, the publish run fails to add it before commiting version changes and tagging version.

## Version 1.13.5 (August 15th, 2019)

### Bug Fixes

- The previous fix for the version being bumped back to the previous version on publish runs past the first one did not work as intended.

## Version 1.13.4 (August 15th, 2019)

### Bug Fixes

- On a failed read error for a github or mantis release when building file assets, the log shows the previously processed filename as the one that failed to be read.
- Regression - Version is reset to previous on any all extra runs.
- The config npmPackDist does not have its output checked in.

## Version 1.13.3 (August 15th, 2019)

### Documentation

- **readme:** Update information on publishrc configuration parameters.

### Features

- Provide config for version files to always edit.

    The following publishrc parameter has been added:

        versionFilesEditAlways

## Version 1.13.2 (August 14th, 2019)

### Documentation

- **readme:** Add initial detail section for config parameters.

### Bug Fixes

- An ampersand in bugs page or homepage causes an error. [fixes #173]
- Version is not being bumped in publishrc if using version config.

## Version 1.13.1 (August 13rd, 2019)

### Bug Fixes

- The newly added .publishrc version in 1.13.0 does not get updated on a publish run.

### Refactoring

- Do not run post-build commands on a dry run.

## Version 1.13.0 (August 13rd, 2019)

### Features

- Add support for using version number in publishrc for base application version.

### Bug Fixes

- Exit if a environment variable replacement cant be made.

### Bug Fixes

- Commits that are entered without a valid per-determined subject causes an error when parsing the changelog for a MantisBT release.
- Commit comments with line breaks improperly indent in the table formatted MantisBT/GitHub release changelog when using history text file for parsing.

## Version 1.12.0 (August 12nd, 2019)

### Features

- Add support for bumping version in C project .rc files.

    The following config has been added to publishrc for specifying a C project
    and its .rc file:

        cProjectRcFile

    Example usage in .publishrc.json:

        "cProjectRcFile": "src/main.rc"
- Add support to run post release commands and scripts.

    The following config has been added to publishrc for specifying a command
    or an array of commands to run after the publish run / release has
    completed:

        postReleaseCommand

    Example usage in .publishrc.json:

        "postReleaseCommand": [
            "script/post-release.bat",
            "cmd /c copy /Y install/dist/fpc.exe build"
        ]
- Add support to specify more than one email address in the emailRecip and
    testEmailRecip publishrc configs.

    Recipients can now be specified as an array of strings, with the notification
    email being sent to each specified address.

    [closes #284]

## Version 1.11.5 (August 9th, 2019)

### Bug Fixes

- When performing a dry run, the 'skipVersionEdits' config should be overriden or disabled. Setting dryRun="Y" will now cause skipVersionEdits ro be set to "N" in all cases.
- The first publish run for a project doesn't write to the changelog/history file.

### Bug Fixes

- PDF documentation is not copied to the directory release documentation path.

## Version 1.11.4 (August 6th, 2019)

### Bug Fixes

- Notepad windows open in background after first edit, Notepadd++ behaves as intended.

## Version 1.11.3 (August 5th, 2019)

### Build System

- **npm:** Remove @types/aggregate-error and @types/get-stream dependencies, packages now come with their own type definitions.

### Bug Fixes

- Release changelog built from markdown showing 'Featur' instead of 'Feature'
- Release changelog built from markdown showing does not bold the subject part in the commit message breakdown.

## Version 1.11.2 (August 1st, 2019)

### Documentation

- **readme:** Add 'Determining the Next Version' section

### Bug Fixes

- Changelog parsing is broken for a Github or MantisBT release changelog. Occurs if the project has no history text file and the changelog markdown file is used for parsing the commit parts.
- The skipVersionEdits config flag does not work, version edits are now skipped whether the flag is set to Y or N.
- When installing globally, the install process always fails the first time with the error '@spmeesseman/json/lib/json.js' file does not exist.

## Version 1.11.1 (July 29th, 2019)

### Documentation

- **readme:** Update configuration parameter section.

### Features

- Add support for providing a list of links to display in the release notification email.

    The publishrc config variable 'emailHrefs' has been added to configure this
    functionality.  Note that the links printed in the email notification will
    be in addition to the default links that are  automatically generated.
- Add support for skipping edits of files touched by version text replacement.

    The publishrc config variable 'skipVersionEdits' has been added to configure
    this functionality.
- Add support for the same style changelog html to be pushed for a GitHub release as that of a MantisBT release

## Version 1.11.0 (July 27th, 2019)

### Features

- Add support for multiple MantisBT releases in one publish run.
- Add support for providing a MantisBT API token in publishrc as opposed to setting a system environment variable.

    Note that setting the MANTISBT_API_TOKEN environment variable is still an
    option.

## Version 1.10.9 (July 27th, 2019)

### Bug Fixes

- A github release is sending the entire changelog when creating a release, this was broken in 1.10.3

### Refactoring

- Forcefully create new files throughout application, in a case where the file already exists, it should be overwritten.

## Version 1.10.8 (July 27th, 2019)

### Build System

- The NPM location link is broken in the release notification email due to an invalid config 'npmRegistry' in publishrc.

### Bug Fixes

- The project links display change in the release email notification displays incorrectly with all text in a row with no spaces.

## Version 1.10.7 (July 27th, 2019)

### Refactoring

- Improve the display of the various project links in the release email notification.

## Version 1.10.6 (July 27th, 2019)

### Bug Fixes

- History file link is still incorrect in the release email notification for non network released projects

## Version 1.10.5 (July 27th, 2019)

### Bug Fixes

- Validating the determined new version number causes publish run to fail for non-npm based projects.

## Version 1.10.4 (July 27th, 2019)

### Bug Fixes

- The npm install fails with 'cannot find module marked'.

## Version 1.10.3 (July 27th, 2019)

### Features

- Use semver to determine next version for non-npm semantically versioned projects.

### Bug Fixes

- History edits are lost when publish run fails and a version control
    reversion is automatically performed.

    The history and changelog fles will now be saved to temporary directory
    before reverting.
- If an SVN project is tagged manually or by another process since the last automated version tag, it is used as the revision base for retrieving commits since the last release, thereby missing all the appropriate commit messages.

## Version 1.10.2 (July 26th, 2019)

### Refactoring

- Enhance email notification signature line.

## Version 1.10.1 (July 26th, 2019)

### Bug Fixes

- The email notification signature line is misaligned and displays a broken html tag.

## Version 1.10.0 (July 26th, 2019)

### Features

- Add support for specifying files to check in to version control that are not
    touched by the publish run.

    The publishrc config value 'vcFiles' can be used to specify an array of files
    that are to be checked in addition to the files that have been touched by the
    publish run before the version tag is made.  For example:

        "vcFiles": [ "script\update.sh", "script\update.bat" ]

    [closes #214]

### Bug Fixes

- The history file path is invalid in the email notification for publish runs that have the 'distRelease' flag set to 'N'.

## Version 1.9.1 (July 26th, 2019)

### Refactoring

- Add the following content to the end of automated release emails:

    1) Application signature
    2) A note stating not to reply to the automated email

## Version 1.9.0 (July 26th, 2019)

### Features

- Add support for MantisBT Plugin type releases.

## Version 1.8.1 (July 24th, 2019)

### Bug Fixes

- If a history file entry is line broken, and the beginning word of the new line does not start with an alphanumeric character, the text for that entry is not properly formatted in the changelog sent to the MantisBT Releases API.

## Version 1.8.0 (July 21st, 2019)

### Features

- Enhance the visual apperance of the changelog sent to the MantisBT Relases page API. [closes #111]

### Bug Fixes

- If a branch (i.e. trunk, master) is not the root directory containing the
    .svn/.git folder of the project, both the final commit and the version tag
    creation fails.

    An error will now be thrown when the publish run starts to inform the user
    that this scenario is not supported, and subsequently exits.
- In the text sent for the changelog in a MantisBT release, a line item that contains a numeric character (1-9) followed by a comma, and any characters that follow, are styled in bold.

## Version 1.7.5 (July 20th, 2019)

### Bug Fixes

- Attempt to fix a random error 'access is denied' when the version in the sencha config of the package.json file is being updated.
- The history text sent for a mantisbt release contains bolded numbered lines for items 1-9, but not for any items numbered 10 or higher.
- The history text sent for a mantisbt release sometimes writes off the side of the Releases page and is not wrapped properly.

## Version 1.7.4 (July 19th, 2019)

### Features

- For a MantisBT release, add a new config variable to specify a MantisBT project name (if different than the base project name).

### Bug Fixes

- If the subject of a commit message is not entered in lower case, the history file is incorrectly formatted for that commit message in the auto generated text.
- Line breaks around inner numbered lists of a single release note are being removed, and the entire inner list is bolded.

## Version 1.7.3 (July 17th, 2019)

### Bug Fixes

- If the distRelease flag is set for a network folder path type release, but the distDocPath flag is not set, the publish run fails.

## Version 1.7.2 (July 13rd, 2019)

### Bug Fixes

- The file description feature for a mantisbt release added in the last version does not work if the description contains a space

## Version 1.7.1 (July 13rd, 2019)

### Features

- Add support for mantisbt release file/asset descriptions.

    A description can be provided along with the asset file location with a '|'
    separator in the mantisbtAssets config, for example:

    build/app-publisher.tgz|NPM Tarball

### Build System:  App Publisher

- Add mantisbtAsset file descriptions to publishrc.json.

## Version 1.7.0 (July 13rd, 2019)

### Features

- Add support for providing email server port and email mode configs.

    The following configs have been added:

        emailPort (default 25)
        emailMode (default empty)

    Where emailMode can be one of "ssl", "tls", or an empty string "".

### Bug Fixes

- The history extraction from the commit messages is missing all of the multi-line entries when retrieving the commit history from a Git repo.
- The history file has an additional unecessary newline at the end of the new section that is generated during the publish run.

## Version 1.6.5 (July 13rd, 2019)

### Bug Fixes

- Partial errors when creating a release are indicated as success in runtime log. The log will now display the return HTML from the Mantis REST service on any partial error.

## Version 1.6.4 (July 13rd, 2019)

### Features

- Add a link to mantisbt release page in notification email.
- Add styling and bug/ticket links to history entries in for display in the mantisbt release page.

### Bug Fixes

- Some history entries do not have line breaks removed.  All single line breaks should be removed for html browser display.

## Version 1.6.3 (July 13rd, 2019)

### Build System

- Add history.txt to list of file assets to upload to MantisBT Releases Plugin.

### Bug Fixes

- When a MantisBT release is uploaded, only parts of the changelog from a history file  are stripped of line break delimiters. Proper behaviour should replace all line breaks.

## Version 1.6.2 (July 4th, 2019)

### Bug Fixes

- The extracted history for the changelog sent to the MantisBT Releases Plugin contains line breaks too short for web display.aside from double line breaks, for full width HTML display.

## Version 1.6.1 (July 4th, 2019)

### Bug Fixes

- History file is not properly sent to Releases plugin api, and no release is created when calling the POST REST API.

## Version 1.6.0 (July 4th, 2019)

### Features

- Add support for MantisBT releases via 'Releases' plugin, similar to a GitHub
    release.

    To use MantisBT 'Releases', set the following config in .publishrc.json:

        "mantisbtRelease":"Y",
        "mantisbtUrl":    "https://my.domain.com/mantisbt",
        "mantisbtAssets": [
            "install\\dist\\app-publisher.tgz",
            "install\\dist\\App-Publisher_32bit.exe",
            "doc\\history.txt"
        ]

    The files listed in the mantisbtAssets array will be placed under the
    current "lowest" unreleased version in the Mantis project.  The 'Releases'
    plugin will then mark the version as released.

    The history.txt or changelog.md additions will also populate in the
    appropriate version section of the Releases page.

    Note that the project name defined in .publishrc.json must match the
    MantisBT project name.

## Version 1.5.14 (June 27th, 2019)

### Bug Fixes

- If more than one occurrence of an environment tag is used in publishrc,
    only the first occurrence gets replaced.

    For example:

    "buildCommand": [ "${CODE_HOME}\ant\ant.bat", "${CODE_HOME}\nsis\makensis" ]

    The 2nd command fails as the tag is not replaced.
- Publish fails if one of the following conditions holds:

    (1) Project has no package.json file.
    (2) No repository defined in package.json but one is defined in the
        publishrc config file.

## Version 1.5.13 (June 6th, 2019)

### Bug Fixes

- For a distribution type release, the file upload to the directory specified by 'distReleasePath' is not being performed.

## Version 1.5.12 (June 4th, 2019)

### Bug Fixes

- A commit subject of "minfeat" is causing a minor release number bump when it should only cause a patch number bump (for semantically versioned projects only).

## Version 1.5.11 (June 4th, 2019)

### Bug Fixes

- The check to see if the "dist" path is under version control is failing, and is not being checked in with other touched files at the end of the publish run, thereby missing the version tag as well.

## Version 1.5.10 (June 4th, 2019)

### Bug Fixes

- In the previous release, an internally defined duplicate command line flag causes the publish to fail immediately after starting.

## Version 1.5.9 (June 4th, 2019)

### Bug Fixes

- Files in dist directory are not being checked in to version control at the end of the publish run.
- **regression:** Reverting touched files in version control fails after a dry run since v1.5.5.
-Running a global app-publisher install from a project without a package.json file is failing in v1.5.x

## Version 1.5.8 (June 3rd, 2019)

### Bug Fixes

- Github release is tagging version before touched version files are commited.

### Refactoring

- Add check for git repo type before making github release.

## Version 1.5.7 (June 3rd, 2019)

### Bug Fixes

- Setting the 'textEditor' config value to an empty string will still open notepad for each file that is version edited during the publish run.

### Refactoring

- Ignore commits with a subject of "chore" when making auto-entries in the history/changelog files.

## Version 1.5.6 (June 3rd, 2019)

### Bug Fixes

- During a github release, the logged response values are not displaying.
-A Github release fails to upload any assets past the first one.

## Version 1.5.5 (June 3rd, 2019)

### Bug Fixes

- If running a publish from a sub-project within a main project directory structure, reverting files fails in cases where the publish fails and reverting needs to be performed.

### Refactoring

- When logging a multi-line message, attempt to bring all lines after the first line break in alignment with the 1st line (including the log stamp).

## Version 1.5.4 (June 3rd, 2019)

### Bug Fixes

- Running 1.5 for a subversion build in run #1 causes an error and publish exits.

## Version 1.5.3 (June 3rd, 2019)

### Bug Fixes

- Package.json point to incorrect startup file for cli, publish run fails.

## Version 1.5.2 (June 3rd, 2019)

### Bug Fixes

- When installing v1.5.1, the installation fails with:

    Cannot locate ./build/index.js

## Version 1.5.1 (June 3rd, 2019)

### Bug Fixes

- External application stderr is logging with the error icon when it is just info.

## Version 1.5.0 (June 3rd, 2019)

### Features

- Add support for github release type.

### Bug Fixes

- Assemblyinfor version is not replaced when incremental versioning is used.

### Refactoring

- Validate current version found and next version calculated before proceeding with publish run.

## Version 1.4.6 (May 31st, 2019)

### Build System

- **npm:** Remove unused @types/shelljs and @semantic-release dev dependencies.

### Performance Enhancements

    In certain cases, for example when a release is both a network distribution type release and an npm type release, the package.json file is maniuplated 2x the number of times it needed to be.

### Bug Fixes

- For .NET builds, if more than one assemblyinfo.cs file exists within the project directory structure, each file gets appened to the next.
- For a a network distribution type release, the pdf documentation does not
    get copied if it does not reside in the specific directory "documentation".

    The script will now separately look for pdf documentation in the doc and
    documentation folder, as well as the folder specified by the "pathToDist"
    config value (if any).
- If the specified history file path contains spaces, an error is thrown and the publish fails.

## Version 1.4.5 (May 29th, 2019)

### Bug Fixes

- Git tag is created in the local repository but not being pushed to the configured remote origin.

### Refactoring

- The following packages are now bundled in an attempt to fix the error received when trying to install this package locally to a project:

    @spmeesseman/json
    marked

## Version 1.4.4 (May 29th, 2019)

### Refactoring

- Removed all test references to semantic-release, fixed json package reference

## Version 1.4.3 (May 29th, 2019)

### Bug Fixes

- **regression:** The scope name is being replaced with npm username when publishing to the NPM server.

### Refactoring

    Previously, when touching package.json to update version and repsository
    info specified in publishrc, CRLF linebreaks were used.  LF linebreaks will
    now be used as NPM specifies this.

## Version 1.4.2 (May 29th, 2019)

### Documentation:  README.md

- **readme:** Add info about setting powershell execution policy.  The following command must be run with elevated privileges before running app-publisher for the  first time:

    Set-ExecutionPolicy -RemoteSigned

### Bug Fixes

- An error is thrown when publishing an application that uses non-semantic incremental versioning:

        "Failed because [System.Int32] doesnt contain method named 'Contains'"
- Any publish run after the 1st is using the new version created in the first
    run as the current version
- **regression:** The package link in the release email is invalid (missing scope in url).
- Errors on ps cmdlet calls are not checked properly, i.e. a failed 'copy' or 'move' results in a false success
- If an external command fails and the publish is cleaned up and stopped, the main node process is still returning exit code 0. The node process will now exit with the same error code as is received from the external command.
- For an NPM release, if the NPM registry is not specified in .publishrc, a dry-run publishes the npm package to [https://registry.npm.org](https://registry.npm.org).
- Package.json files are being converted to line feeds only without carriage returns during a publish run.
- The version is not bumped in assemblyinfo.cs .net app releases when the app uses non-semantic incremental versioning.

## Version 1.4.1 (May 28th, 2019)

### Bug Fixes

- The changelog is being overwritten with the new commits instead of being appended to.
- **regression:** The automatic version tag was broken in previous release.

## Version 1.4.0 (May 28th, 2019)

### Features

- A new config parameter has been added:

       textEditor

    If set, the specified editor will be used for inline editing of all version files.
- Added the following config paramaters to allow overriding or setting the repository, home page, and bugs page values in package.json when publishing to an NPM registry:

    bugs
    homePage
    repo
    repoType
- Added the following config paramaters to create and save an NPM package for uploading as part of a network distribution release:

        npmPackDist 

    If set to "Y", the npm package will be locally created, and copied to the directory specified by the "pathToDist" parameter, which in turn is used in the network distribution release.
- Added support to auto-locate and bump version in assemblyinfo.cs files for .NET builds/releases.
- Added support for multiple runs using any backend repository and/or release  types.
- Added support for version tagging in sub-projects.

    For example, consider the following directory structure:

        proj/build
        proj/src
        proj/src/client
        proj/src/server
        proj/tests

    The "client" and "server" folders contain separate projects, and need to have separate releases, this can now be accomplished.
- If the specified text editor in .publishrc.json is not found, then Notepad is used as a fallback.
- Added support for Git repositories.

### Bug Fixes

- If no history file is specified in .publishrc, a recoverable error is thrown  during a distribution type release.
- A non-critical error is thrown 'cannot test path is null' when reverting files in version control after a test run.
- Occassionally package.json does not get populated and produces the error "file in use".
- Environment variables referenced in .publishrc are throwing an error when the publish run starts if the value contains a backslash.
- When prompted to continue after making no commits since the last release, hitting enter to select default choice "no" does not exit as it should.
- When using notepad++ as the inline editor, the window is opened behing Code on the first edit, all subsequent edits work as expected

### Refactoring

- Add additional logging when retrieving commits from the repository.
- Improved logging, added colorized log tags.
- Removed all checks for "Code Package", this is no longer needed.
- Title case app name in notification email subject line.

## Version 1.3.0 (May 25th, 2019)

### Documentation

- **readme:** Add initial section in README for explanation of configuration parameters.

### Features

- Add functionality to produce marked down commit entry generation for a
    changelog file in the same manner as a text history file is generated.

## Version 1.2.0 (May 24th, 2019)

### Documentation

- Add app-publisher badge to readme page
- Add table of contents

### Bug Fixes

- Set proper homepage, bugs, and repository links in package.json per project on publish run.  

    Project dependent, these links equate to:

        "bugs": {
           "url": "https://issues.development.pjats.com/project/ticket/report/1"
        },
        "homepage": "https://issues.development.pjats.com/project",
        "repository": {
           "type": "svn",
           "url": "https://issues.development.pjats.com/project/browser/trunk"
        }

    These links populate into the pages of the private NPM registry when published.
- If a new file is created during publish in dry run mode (i.e. a new history file), delete that unversioned file when the rest of the touched files get reverted in SVN.
- When using the flag "notePadEdits" flag to manually edit version files during the publish, the Notepad windows are not opening in foreground when started by the NodeJS executable in Visual Studio Code.
- The last few characters of random history file entries are being stripped when the history file is auto-populated from version control comments.
- If two release types are being built, build commands and version file edits are happening twice.
- The commit sbuject tag "project" tag is not being converted to its proper title when the history file is auto-populated from version control comments.

### Features

- Add flag for projects that will upload files found in the "dist" dircetory but do not require auto-running a defined installer script:

    installerExDist

## Version 1.1.6 (May 15th, 2019)

### Features

- To interactively approve the calculated new version number, use the
    following parameter on the command line or in publishrc:

    cli:

        -interactive Y

    .publishrc:

        "interactive": "Y"

### Bug Fixes

- For "installer type" builds, the dist path is being added to the Subversion changelist even if it is not under version control, causing the commit to fail at end of the publish process.
- If the published release is both "installer type" and "npm type", a (non- fatal) error occurs when trying to set the package.json version twice.

## Version 1.1.5 (May 15th, 2019)

### Bug Fixes

- After installing package globally, the app-builder command throws an error that it cannot find the publish script.
- Non-npm released installer projects managed by npm are failing to change the package.json version.

## Version 1.1.4 (May 14th, 2019)

### Bug Fixes

- Environment variable placeholders in .publishconfig do not get replaced at runtime.

## Version 1.1.3 (May 14th, 2019)

### Bug Fixes

- Package upload to npm.development.pjats.com fails.

## Version 1.1.2 (May 13th, 2019)

- Initial Release
