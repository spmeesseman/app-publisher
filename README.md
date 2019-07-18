# App Publisher

[![perry-johnson](https://img.shields.io/badge/perry%20johnson-pja%20pjr-blue.svg)](https://www.perryjohnson.com)
[![app-type](https://img.shields.io/badge/category-release-blue.svg)](https://www.perryjohnson.com)
[![app-lang](https://img.shields.io/badge/language-typescript%20powershell-blue.svg)](https://www.perryjohnson.com)
[![app-publisher](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-app--publisher-e10000.svg)](https://www.perryjohnson.com)
[![authors](https://img.shields.io/badge/authors-scott%20meesseman-6F02B5.svg?logo=visual%20studio%20code)](https://www.perryjohnson.com)

## Description

> This package provides a semantic version style release mechanism as an option to the popular semantic-release modules.

## Table of Contents

- [App Publisher](#App-Publisher)
  - [Description](#Description)
  - [Table of Contents](#Table-of-Contents)
  - [The Publishing Run](#The-Publishing-Run)
  - [Installation](#Installation)
  - [Usage](#Usage)
    - [Commit Messages](#Commit-Messages)
    - [Usage - Configuration File](#Usage---Configuration-File)
    - [Usage - Configuration Parameter Details](#Usage---Configuration-Parameter-Details)
  - [NPM](#NPM)
  - [Windows Installer](#Windows-Installer)

## The Publishing Run

The steps performed during an app-publisher run are:

- Automatically determine next version from commit messages since last version
- Auto-populate history file with commit messages since last version
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

## Installation

To instal app-publisher globally for ceonvenience, run the following command

    $ npm install -g @perryjohnson/app-publisher

To install locally per project, run the following command from the directory containing the projects package.json file:

    $ npm install @perryjohnson/app-publisher

Currently, the publish is ran from a powershell script.  You will need to set the powershell execution policy with the following command if you have not already done so on your computer at some point in the past:

    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine

After the port to JS, this no longer be required.

## Usage

### Commit Messages

See the PJ standards [here](https://app1.development.pjats.com/doc/developernotes.md#Commit-Messages).  See the GitHub standards [here](https://gist.github.com/stephenparish/9941e89d80e2bc58a153).

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
- fix
- perf
- project
- refactor
- style

The "scope" can be anything specific to the commit change, for example:

    docs(readme): update info on commit messages

It may also be ommitted, for example:

    chore: update dependency for app-publisher to latest version

The subject "short_message" should be a short description of the change, preferably less than 160 characters.

The "body" should give a detailed explanation of the change.

The "footer" should give a detailed explanation of what the change fixes, or how it affects the application.

To reference issues from commit messages, use the "refs", "fixes", or "closes" tag anywhere in the commit message, for example:

    fix(usermanagement): the "add user" button doesnt work when selecting the option "clerk"

    A typo was preventing the end user from being able to create a clerk type user.

    Users hould nw be able to create a clerk type user successfully.
    Note that non-administrators do not have access to this functionality.
    [fixes #142]

Including the [fixes #142] (or [closes #142]) tag in the footer will link the issue to the commit, auto-close the issue, remove any relevant tags from the issue, and add the "fixed" tag to the closed issue.

    feat(jobsearch): add support for the "modify status" action

    The action "Modify Status" in the Search Results tabs of Job Administration is now functional.

    Note that the list of statuses that the jobs may be changed to will be reduced in the next release.
    [refs #142]

Including the [refs #142] tag anywhere in the commit message will link the issue to the commit.

The commit messages will be used in the generation of the history and changelog files when running app-publisher.

References:

- [Perry Johnson Commit Message Standards](https://app1.development.pjats.com/doc/developernotes.md#Commit-Messages)
- [GitHub Commit Message Standards](https://gist.github.com/stephenparish/9941e89d80e2bc58a153)
- [Angular Commenting Standards Updated](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#type)

### Usage - Configuration File

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
        "distRelease":       "N",
        "distReleasePath":   "\\\\network_machine\\share_name\\releases",
        "distDocPath":       "",
        "dryRunVcRevert":    "Y",
        "emailNotification": "N",
        "emailServer":       "10.0.7.50",
        "emailRecip":        "release@domain.com",
        "emailSender":       "build@domain.com",
        "githubRelease":     "Y",
        "githubAssets": [
            "install\\dist\\app-publisher.tgz",
            "install\\dist\\App-Publisher_32bit.exe"
        ],
        "githubUser":        "spmeesseman",
        "historyFile":       "doc\\history.txt",
        "historyHdrFile":    "install\\history-hdr.txt",
        "historyLineLen":    80,
        "homePage":          "",
        "interactive":       "N",
        "mantisbtRelease":"Y",
        "mantisbtUrl":    "https://my.domain.com/mantisbt",
        "mantisbtAssets": [
            "install\\dist\\history.txt|History File",
            "install\\dist\\app-publisher.tgz|NPM Tarball",
            "install\\dist\\App-Publisher_32bit.exe|Windows Installer (32-bit)"
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

### Usage - Configuration Parameter Details

Author publishing package

    author: "${UserName}"

The build command to run once versions have been updated in version files (i.e. package.json,history.txt, assemblyinfo.cs, etc)

    buildCommand: []

Name of the project.  This must macth throughout the build files and the SVN project name

    projectName: ""

Deploy commands

    deployCommand: @()

To build the installer release, set this flag to "Y"

    installeRelease: "N"

The location of the installer build script, this can be a relative to PATHTOROOT or a full path. Note this parameter applies only to INSTALLRELEASE="Y"

    installerScript: ""

Set to Y if a custom specified build command builds the installer

    installerSkipBuild: "N"

Use the contents of the PATHTODIST directory for the release files, dont build an
installer.

    installerExDist: "N"

Interactive (prompts for version after extracting what we think should be the next version)

    interactive: "N"

The location of this history file, can be a relative or full path.

    historyFile: "doc\history.txt"

The max line length of the history file.

    historyLineLen: 80

The location of this history header file, can be a relative or full path.

    historyHdrFile: "install\history-hdr.txt",

    notepadEdits: "Y"

To build the npm release, set this flag to "Y"

    npmRelease: "N"

The scope of the npm package, empty if none

    npmScope: ""

To build the nuget release, set this flag to "Y"

    nugetRelease: "N"

It is assumed that installer build files are in PATHTOROOT\install.  It is also assumed that the legacy CreateInstall.xml and Deploy.xml files are located in PATHTOROOT\install.  A relative or full path that will equate to the project root as seen from the  script's location.  For example, if this script is in PROJECTDIR\script, then the rel path to root would be "..".  If the script is in PROJECTDIR\install\script, then the rel path to root would be "..\\.."
The value should be relative to the script dir, dont use a full path as this will not share across users well keeping project files in different directories

    pathToRoot: ".",

This in most cases sould be an empty string if the project is the 'main' project.  If a sub-project exists within a main project in SVN, then this needs to be set to the relative directory to the main project root, as seen from the sub-project root.  Note this should be where the '.svn' folder resides.

    pathToMainRoot: ""

Path to DIST should be relative to PATHTOROOT

    pathToDist: "install\dist"

This in most cases sould be an empty string if the project is the 'main' project.  If a sub-project exists within a main project in SVN, then this needs to be set to the relative directory to the project path, as seen from the main project root.

For example, the following project contains a layout with 3 separate projects 'fp', 'ui', and 'svr':

    app-publisher
        app
            fpc
            svr
            ui

The main project root is app-publisher.  In the case of each of these projects, SVNPREPATH should be set to app\fpc, app\ui, or app\svr, for each specific sub-project.  This mainly is be used for SVN commands which need to be ran in the directory containing the .svn folder.

    pathPreRoot: ""

The build command to run once versions have been updated in version files (i.e. package.json, history.txt, assemblyinfo.cs, etc)

    postBuildCommand: @()

Skip uploading installer to network release folder (primarily used for releasing from hom office where two datacenters cannot be reached at the same time, in this case the installer files are manually copied)

    skipDeployPush: "Y"

The svn server address, can be domain name or IP

    svnServer: "svn.development.pjats.com"

The SVN repository.  It should be one of the following:

- pja
- pjr

    svnRepo: "pja"

The SVN project name if different than projectName:

    svnProjectName: ""

The SVN protocol to use for SVN commands.  It should be one of the following:

- svn
- https

    svnProtocol: "svn",

Whether or not to tag the new version in SVN.  Default is Yes.

    svnTag: "Y",

Test mode - Y for 'yes', N for 'no'.  In test mode, the following holds:

- Installer is not released/published
- Email notification will be sent only to TESTEMAILRECIP
- Commit package/build file changes (svn) are not made
- Version tag (svn) is not made

Some local files may be changed in test mode (i.e. updated version numbers in build and package files).  These changes should be reverted to original state via SCM

    testMode: "Y",
    testModeSvnRevert: "Y",
    testEmailRecip: "smeesseman@pjats.com",

The text tag to use in the history file for preceding the version number.  It should be one of the following:

- Version
- Build
- Release

    versionText: "Version",

Whether or not to write stdout to log file.  Default is Yes

    writeLog: "N"

## NPM

To create an npm user if you dont have one, run the following command and follow the prompts:

    $ npm adduser --registry=npm.development.pjats.com --scope=@perryjohnson

Locate the file USERDIR/.npmrc, copy the created token from within the file to the environment variable PJ_NPM_TOKEN

The project file .npmrc will be used by npm when publishing packages, it reads the NPM environment variables as well.

## Windows Installer

[Download the Windows Installer](file://///192.168.68.120/d$/softwareimages/app-publisher/1.2.1/app-publisher.exe)
