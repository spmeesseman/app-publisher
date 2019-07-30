# App Publisher - Release Automation

[![perry-johnson](https://img.shields.io/badge/perry%20johnson-pja%20pjr-blue.svg)](https://www.perryjohnson.com)
[![app-category](https://img.shields.io/badge/category-releases%20automation%20npm-blue.svg)](https://www.perryjohnson.com)
[![app-lang](https://img.shields.io/badge/language-typescript%20powershell5-blue.svg)](https://www.perryjohnson.com)
[![app-publisher](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-app--publisher-e10000.svg)](https://www.perryjohnson.com)

[![authors](https://img.shields.io/badge/authors-scott%20meesseman-6F02B5.svg?logo=visual%20studio%20code)](https://www.perryjohnson.com)
[![MantisBT issues open](https://app1.development.pjats.com/projects/plugins/ApiExtend/api/issues/countbadge/app-publisher/open)](https://app1.development.pjats.com/projects/set_project.php?project=app-publisher&make_default=no&ref=bug_report_page.php)
[![MantisBT issues closed](https://app1.development.pjats.com/projects/plugins/ApiExtend/api/issues/countbadge/app-publisher/closed)](https://app1.development.pjats.com/projects/set_project.php?project=app-publisher&make_default=no&ref=bug_report_page.php)
[![MantisBT version current](https://app1.development.pjats.com/projects/plugins/ApiExtend/api/versionbadge/app-publisher/current)](https://app1.development.pjats.com/projects/set_project.php?project=app-publisher&make_default=no&ref=plugin.php?page=Releases/releases)
[![MantisBT version next](https://app1.development.pjats.com/projects/plugins/ApiExtend/api/versionbadge/app-publisher/next)](https://app1.development.pjats.com/projects/set_project.php?project=app-publisher&make_default=no&ref=plugin.php?page=Releases/releases)

## Table of Contents

- [App Publisher - Release Automation](#App-Publisher---Release-Automation)
  - [Table of Contents](#Table-of-Contents)
  - [Description](#Description)
  - [Requirements](#Requirements)
  - [Installation](#Installation)
  - [Commit Messages](#Commit-Messages)
  - [Usage](#Usage)
    - [Usage - Configuration File](#Usage---Configuration-File)
    - [Usage - Configuration File Parameters](#Usage---Configuration-File-Parameters)
  - [MantisBT Token](#MantisBT-Token)
  - [NPM Token](#NPM-Token)
  - [Windows Installer](#Windows-Installer)

## Description

This package provides a semantic version style release mechanism as an option to the popular semantic-release modules.

The steps performed during an app-publisher run are:

- Automatically determine next version from commit messages since last version
- Auto-populate history text file and/or changelog markdown with commit messages since last version
- Update all versioned files with new version
- Run application specific build scripts
- Build installer
- Upload distribution files to network drive
- Build and publish NPM package
- Build and publish Nuget package
- Run application specific deploy scripts
- Check all modifications into VC
- Tag with new version in VC
- Upload a MantisBT or GitHub release including changelog and file assets
- Send release email

## Requirements

- Windows 10
- Powershell 5
- Code Package Environment (Optional)

## Installation

To install app-publisher globally for convenience, run the following command:

    npm install -g @perryjohnson/app-publisher

To install locally per project, run the following command from the directory containing the projects package.json file:

    npm install @perryjohnson/app-publisher

Currently, the publish is ran from a powershell script.  You will need to set the powershell execution policy with the following command if you have not already done so on your computer at some point in the past:

    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine

After the port to JS, this no longer be required.

## Commit Messages

Commit message format is an integral part of the App Publisher release process.

See the standards [here](https://app1.development.pjats.com/doc/developernotes.md#Commit-Messages).  See the GitHub standards [here](https://gist.github.com/stephenparish/9941e89d80e2bc58a153).

Commit messages should be made in the following format:

    subject(scope): short_message

    body

    footer

The "subject" should be one of the following:

- build
- chore
- ci
- docs
- feat
- featmin
- featmaj
- fix
- perf
- project
- refactor
- style
- visual

The "scope" can be anything specific to the commit change, for example:

    docs(readme): update info on commit messages

It may also be ommitted, for example:

    chore: update dependency for app-publisher to latest version

The subject "short_message" should be a short description of the change, preferably less than 160 characters.

The "body" should give a detailed explanation of the change.

The "footer" should give a detailed explanation of what the change fixes, or how it affects the application.

To reference issues from commit messages, use the "refs", "fixes", or "closes" tag anywhere in the commit message, for example:

    fix(User Management): the "add user" button doesnt work when selecting the option "clerk"

    A typo was preventing the end user from being able to create a clerk type user.

    Users hould nw be able to create a clerk type user successfully.
    Note that non-administrators do not have access to this functionality.
    [fixes #142]

Including the [fixes #142] (or [closes #142]) tag in the footer will link the issue to the commit, auto-close the issue, remove any relevant tags from the issue, and add the "fixed" tag to the closed issue.

    feat(Job Administration): add support for the "modify status" action

    The action "Modify Status" in the Search Results tabs of Job Administration is now functional.

    Note that the list of statuses that the jobs may be changed to will be reduced in the next release.
    [refs #142]

Including the [refs #142] tag anywhere in the commit message will link the issue to the commit.

The commit messages will be used in the generation of the history and changelog files when running app-publisher.

References:

- [Perry Johnson Commit Message Standards](https://app1.development.pjats.com/doc/developernotes.md#Commit-Messages)
- [GitHub Commit Message Standards](https://gist.github.com/stephenparish/9941e89d80e2bc58a153)
- [Angular Commenting Standards Updated](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#type)

## Usage

App-Publisher can be run from the command line or in Visual Studio Code using the [Task Explorer](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer) Extension.  The Task Explorer extension will automatically detect .publishrc.json files in a project, and display the tasks within an app-publisher node.

From the command line, the following command can be executed:

    cd project_root
    node app-publisher -p ps --no-ci

A dry run can also be performed with the --dry-run option:

    cd project_root
    node app-publisher -p ps --no-ci --dry-run

### Usage - Configuration File Parameters

The .publishrc.json file can be used to define the configuration parameters, defined below.

|Parameter Name|Description|Type|Supported Values|Default Value|
|-|-|-|-|-|
|projectName|Name of the project.  This must macth the version control repository project name|string|||
|buildCommand|An array of commands to run once versions have been updated in version files (i.e. package.json,history.txt, assemblyinfo.cs, etc)|array(string)|||
|deployCommand|An array of commands to run once builds are completed and iternal releases are made|array(string)|||
|distRelease|Perform a network/filesystem directory release|enum|Y, N, Yes, No|N|
|distReleasePath|The filesystem path to be used in a network/filesystem release|string|||
|distDocPath|The filesystem path to be used for pdf documentation in a network/filesystem release|string|||
|dryRun|In dry run mode, the following holds true:<br/>Installer is not released/published<br/>Email notification will be sent only to TESTEMAILRECIP<br/>Commit package/build file changes are not made, version tag is not made.<br/>Some local files may be changed in test mode (i.e. updated version numbers in build and package files).<br/>These changes should be reverted to original state via SCM|string|||
|dryRunVcRevert|Revert all touched files in version control after a dry run|enum|Y, N, Yes, No|Y|
|emailNotification|Send a release notification email when the publish run finishes successfully|enum|Y, N, Yes, No|N|
|emailServer|The smtp mail server address|string|||
|emailRecip|The email address to use to send a release notification email|string|||
|emailSender|The email address to use as the sender when sending a release notification email|string|||
|emailMode|The smtp email mode to use when sending a release notification email|enum|unencrypted, ssl, tls|unencrypted|
|emailHrefs|An array of additional links to be displayed in a release notification email|array(string)|||
|githubRelease|Perform a GitHub release|enum|Y, N, Yes, No|N|
|githubAssets|An array of file assets to upload with a GitHub release|array(string)|||
|githubUser|The GitHub username to use when uploading a GitHub release|string|||
|interactive|Interactive (prompts for version after extracting what we think should be the next version)|enum|Y, N, Yes, No|N|
|historyFile|The location of this history file, can be a relative or full path|string|||
|historyLineLen|The max line length of the history file|integer|0-250|80|
|historyHdrFile|The location of this history header file, can be a relative or full path|string|||
|mantisbtRelease|Perform a MantisBT release.<br/>Note that the `Releases` plugin must be installed on the MantisBT instance to perform a Mantis Release.<br/>See the [MantisBT Token](#MantisBT-Token) section for additional information on performing a MantisBT release.|enum|Y, N, Yes, No|N|
|mantisbtApiToken|An array of MantisBT user API tokens to use when uploading a release(s)|array(string)|||
|mantisbtAssets|An array of file assets to upload with a MantisBT release|array(string)|||
|mantisbtProject|The MantisBT project name, if different then `projectName`|string|||
|mantisbtUrl|An array of urls to upload a MantisBT release to|array(string)|||
|npmRelease|Build an npm release|enum|Y, N, Yes, No|N|
|npmScope|The scope of the npm package, empty if none|string|||
|nugetRelease|Build a Nuget release|enum|Y, N, Yes, No|N|
|pathToRoot|It is assumed that installer build files are in PATHTOROOT\install.<br/>It is also assumed that the legacy CreateInstall.xml and Deploy.xml files are located in PATHTOROOT\install.<br/>A relative or full path that will equate to the project root as seen from the  script's location.<br/>For example, if this script is in PROJECTDIR\script, then the rel path to root would be "..".<br/>If the script is in PROJECTDIR\install\script, then the rel path to root would be "..\\..".<br/>The value should be relative to the script dir, dont use a full path as this will not share across users well keeping project files in different directories|string||.|
|pathToMainRoot|This in most cases sould be an empty string if the project is the 'main' project.<br/>If a sub-project exists within a main project in SVN, then this needs to be set to the relative directory to the main project root, as seen from the sub-project root.<br/>Note this should be where the '.svn' folder resides|string|||
|pathToDist|Path to DIST should be relative to PATHTOROOT.<br/>This in most cases sould be an empty string if the project is the 'main' project.<br/>If a sub-project exists within a main project in SVN, then this needs to be set to the relative directory to the project path, as seen from the main project root|string|||
|pathPreRoot|The main project root is app-publisher.<br/>In the case of each of these projects, SVNPREPATH should be set to app\fpc, app\ui, or app\svr, for each specific sub-project.<br/>This mainly is be used for SVN commands which need to be ran in the directory containing the .svn folder|string|||
|postBuildCommand|An array of commands to run once builds are completed|array(string)|||
|repo|The version control path to the project, including branch part if using svn<br/>Note this value is required for projects that do not have a package.json with the repository parameter set|string|||
|repoType|The type of version control repository of the project|enum|git, svn|svn|
|skipCommit||enum|Y, N, Yes, No|N|
|skipDeployPush|Skip uploading installer to network release folder<br/>Primarily used for releasing from hom office where two datacenters cannot be reached at the same time, in this case the installer files are manually copied)|enum|Y, N, Yes, No|N|
|vcTag|Whether or not to tag the version in version control<br/>Note this is not recommended to be turned off|enum|Y, N, Yes, No|Y|
|versionFiles|An array of additional files that should have a version bump (text replacement of old to new version)|array(string)|||
|versionText|The text tag to use in the history file for preceding the version number|enum|Version, Build, Release|Version|
|writeLog|Whether or not to write stdout to log file|enum|Y, N, Yes, No|N|

### Usage - Example Configuration File

To configure app-publisher per project, create a .publishrc.json file in the root project directory.

Environment variables can be used and expanded at runtime using the following syntax:

    ${ENVIRONMENT_VARIABLE_NAME}

An example .publishrc.json file:

    {
        "projectName":       "app-publisher",
        "branch":            "trunk",
        "bugs":              "",
        "buildCommand": [
            "npm run build",
            "${CODE_HOME}\\nsis\\makensis.exe install\\installer-x86.nsi"
        ],
        "changelogFile":     "CHANGELOG.md",
        "deployCommand":     "",
        "distRelease":       "Y",
        "distReleasePath":   "\\\\network_machine\\share_name\\releases",
        "distDocPath":       "",
        "dryRunVcRevert":    "Y",
        "emailNotification": "Y",
        "emailServer":       "smtp.domain.com",
        "emailRecip":        "release@domain.com",
        "emailSender":       "build@domain.com",
        "emailHrefs":        [],
        "emailMode":         "",
        "githubRelease":     "Y",
        "githubAssets": [
            "install\\dist\\app-publisher.tgz",
            "install\\dist\\App-Publisher_32bit.exe"
        ],
        "githubUser":        "spmeesseman",
        "historyFile":       "doc\\history.txt",
        "historyHdrFile":    "install\\history-hdr.txt",
        "historyLineLen":    80,
        "historyHref":       "",
        "homePage":          "",
        "interactive":       "N",
        "mantisbtRelease":   "Y",
        "mantisbtApiToken":  "${MANTISBT_API_TOKEN}",
        "mantisbtUrl":       "https://my.domain.com/mantisbt",
        "mantisbtAssets": [
            "install\\dist\\history.txt|History File",
            "install\\dist\\app-publisher.tgz|NPM Tarball",
            "install\\dist\\App-Publisher_32bit.exe|Windows Installer"
        ]
        "npmPackDist":       "N",
        "npmRegistry":       "",
        "npmRelease":        "Y",
        "npmScope":          "",
        "nugetRelease":      "N",
        "pathToDist":        "install\\dist",
        "pathtoRoot":        ".",
        "pathtoMainRoot":    "",
        "pathPreRoot":       "",
        "postBuildCommand":  "",
        "repoType":          "svn",
        "repo":              "",
        "skipCommit":        "N",
        "skipDeployPush":    "N",
        "testEmailRecip":    "myname@domain.com",
        "textEditor":        "notepad",
        "vcTag":             "Y",
        "vcTagPrefix":       "",
        "versionFiles": [
            "install\\installer-x86.nsi"
        ],
        "versionText":       "Version",
        "writeLog":          "N"
    }

## MantisBT Token

A MantsBT release requires the MANTISBT_API_TOKEN to be set in the system environment.  To create a MantisBT token, perform the following steps:

1. Log into the MantisBT website
2. Go to User Preferences
3. Select the `Tokens` tab
4. Name the token `RESTAPI`
5. Click `Create`.
6. Copy the displayed token
7. Create a system environment variable named `MANTISBT_API_TOKEN`, where the token is it's value.

## NPM Token

An NPM release requires the PJ_NPM_TOKEN or NPM_TOKEN to be set in the system environment.  To create a PJ NPM token, perform the following steps:

To create an npm user if you dont have one, run the following command and follow the prompts:

    $ npm adduser --registry=npm.development.pjats.com --scope=@perryjohnson

Locate the file c:/Users/username/.npmrc (on Windows 10), copy the created token for npm.development.pjats.com from within the file to the environment variable PJ_NPM_TOKEN

For more details, see the [Internal NPM Registry](https://app1.development.pjats.com/doc/developernotes.md#Internal-NPM-Registry) section of the Perry Johnson Developer Notes document.

## Windows Installer

App Publisher can be installed globally using `npm install -g app-publisher` or a Windows Installer (as of 5/14/19 WIndows Installer support has been removed).

[Download the Windows Installer](file://///192.168.68.120/d$/softwareimages/app-publisher/1.2.1/app-publisher.exe)
