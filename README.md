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
    - [Usage - Configuration File Parameters](#Usage---Configuration-File-Parameters)
      - [projectName](#projectName)
      - [buildCommand](#buildCommand)
      - [emailNotification](#emailNotification)
      - [emailServer](#emailServer)
      - [emailRecip](#emailRecip)
      - [emailSender](#emailSender)
      - [emailMode](#emailMode)
      - [deployCommand](#deployCommand)
      - [installerRelease](#installerRelease)
      - [installerScript](#installerScript)
      - [installerSkipBuild](#installerSkipBuild)
      - [installerExDist](#installerExDist)
      - [interactive](#interactive)
      - [historyFile](#historyFile)
      - [historyLineLen](#historyLineLen)
      - [historyHdrFile](#historyHdrFile)
      - [mantisbtRelease](#mantisbtRelease)
      - [npmRelease](#npmRelease)
      - [npmScope](#npmScope)
      - [nugetRelease](#nugetRelease)
      - [pathToRoot](#pathToRoot)
      - [pathToMainRoot](#pathToMainRoot)
      - [pathToDist](#pathToDist)
      - [pathPreRoot](#pathPreRoot)
      - [postBuildCommand](#postBuildCommand)
      - [skipDeployPush](#skipDeployPush)
      - [svnRepo](#svnRepo)
      - [svnProjectName](#svnProjectName)
      - [dryRun](#dryRun)
      - [versionText](#versionText)
      - [writeLog](#writeLog)
  - [MantisBT Token](#MantisBT-Token)
  - [NPM Token](#NPM-Token)
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
        "distRelease":       "Y",
        "distReleasePath":   "\\\\network_machine\\share_name\\releases",
        "distDocPath":       "",
        "dryRunVcRevert":    "Y",
        "emailNotification": "Y",
        "emailServer":       "smtp.domain.com",
        "emailRecip":        "release@domain.com",
        "emailSender":       "build@domain.com",
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

### Usage - Configuration File Parameters

#### projectName

Name of the project.  This must macth the version control repository project name.

#### buildCommand

The build command to run once versions have been updated in version files (i.e. package.json,history.txt, assemblyinfo.cs, etc)

#### emailNotification

    Default:  "emailNotification": "N"

#### emailServer

#### emailRecip

#### emailSender

#### emailMode

#### deployCommand

Deploy commands

    Default: "deployCommand": []

#### installerRelease

To build the installer release, set this flag to "Y"

    Default:  "installerRelease": "N"

#### installerScript

The location of the installer build script, this can be a relative to PATHTOROOT or a full path. Note this parameter applies only to INSTALLRELEASE="Y"

    installerScript: ""

#### installerSkipBuild

Set to Y if a custom specified build command builds the installer

    Default:  "installerSkipBuild": "N"

#### installerExDist

Use the contents of the PATHTODIST directory for the release files, dont build an
installer.

    Default:  "installerExDist": "N"

#### interactive

Interactive (prompts for version after extracting what we think should be the next version)

    Default:  "interactive": "N"

#### historyFile

The location of this history file, can be a relative or full path.

    historyFile: "doc\history.txt"

#### historyLineLen

The max line length of the history file.

    historyLineLen: 80

#### historyHdrFile

The location of this history header file, can be a relative or full path.

    historyHdrFile: "install\history-hdr.txt",

#### mantisbtRelease

To perform a MantisBT release, set this paremeter to `Y` in .publishrc.json:

    "mantisbtRelease": "Y"

Note that the `Releases` plugin must be installed on the MantisBT instance to perform a Mantis Release.

See the [MantisBT Token](#MantisBT-Token) section for additional information on performing a MantisBT release.

#### npmRelease

To build the npm release, set this flag to "Y"

    npmRelease: "N"

#### npmScope

The scope of the npm package, empty if none

    npmScope: ""

#### nugetRelease

To build the nuget release, set this flag to "Y"

    nugetRelease: "N"

#### pathToRoot

It is assumed that installer build files are in PATHTOROOT\install.  It is also assumed that the legacy CreateInstall.xml and Deploy.xml files are located in PATHTOROOT\install.  A relative or full path that will equate to the project root as seen from the  script's location.  For example, if this script is in PROJECTDIR\script, then the rel path to root would be "..".  If the script is in PROJECTDIR\install\script, then the rel path to root would be "..\\.."
The value should be relative to the script dir, dont use a full path as this will not share across users well keeping project files in different directories

    pathToRoot: ".",

#### pathToMainRoot

This in most cases sould be an empty string if the project is the 'main' project.  If a sub-project exists within a main project in SVN, then this needs to be set to the relative directory to the main project root, as seen from the sub-project root.  Note this should be where the '.svn' folder resides.

    pathToMainRoot: ""

#### pathToDist

Path to DIST should be relative to PATHTOROOT

    pathToDist: "install\dist"

This in most cases sould be an empty string if the project is the 'main' project.  If a sub-project exists within a main project in SVN, then this needs to be set to the relative directory to the project path, as seen from the main project root.

For example, the following project contains a layout with 3 separate projects 'fp', 'ui', and 'svr':

    app-publisher
        app
            fpc
            svr
            ui

#### pathPreRoot

The main project root is app-publisher.  In the case of each of these projects, SVNPREPATH should be set to app\fpc, app\ui, or app\svr, for each specific sub-project.  This mainly is be used for SVN commands which need to be ran in the directory containing the .svn folder.

    pathPreRoot: ""

#### postBuildCommand

The build command to run once versions have been updated in version files (i.e. package.json, history.txt, assemblyinfo.cs, etc)

    postBuildCommand: @()

#### skipDeployPush

Skip uploading installer to network release folder (primarily used for releasing from hom office where two datacenters cannot be reached at the same time, in this case the installer files are manually copied)

    skipDeployPush: "Y"

#### svnRepo

The svn server address, can be domain name or IP

    svnServer: "svn.development.pjats.com"

The SVN repository.  It should be one of the following:

- pja
- pjr

    svnRepo: "pja"

#### svnProjectName

The SVN project name if different than projectName:

    svnProjectName: ""

The SVN protocol to use for SVN commands.  It should be one of the following:

- svn
- https

    svnProtocol: "svn",

Whether or not to tag the new version in SVN.  Default is Yes.

    svnTag: "Y",

#### dryRun

Dry Run (Test mode) - Y for 'yes', N for 'no'.  In test mode, the following holds:

- Installer is not released/published
- Email notification will be sent only to TESTEMAILRECIP
- Commit package/build file changes (svn) are not made
- Version tag (svn) is not made

Some local files may be changed in test mode (i.e. updated version numbers in build and package files).  These changes should be reverted to original state via SCM

    testMode: "Y",
    testModeSvnRevert: "Y",
    testEmailRecip: "smeesseman@pjats.com",

#### versionText

The text tag to use in the history file for preceding the version number.  It should be one of the following:

- Version
- Build
- Release

    versionText: "Version",

#### writeLog

Whether or not to write stdout to log file.  Default is Yes

    writeLog: "N"

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
