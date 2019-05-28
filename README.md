# App Publisher

[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![app-publisher](https://app1.development.pjats.com/res/img/app-publisher-badge.svg)](https://npm.development.pjats.com/-/web/detail/@perryjohnson/app-publisher)

## Description

> This package provides a semantic version style release mechanism as an option to the popular semantic-release modules.

## Table of Contents

- [App Publisher](#App-Publisher)
  - [Description](#Description)
  - [Table of Contents](#Table-of-Contents)
  - [Features](#Features)
  - [Installation](#Installation)
  - [Usage](#Usage)
    - [Usage - Configuration File](#Usage---Configuration-File)
    - [Usage - Configuration Parameter Details](#Usage---Configuration-Parameter-Details)
  - [NPM](#NPM)
  - [Windows Installer](#Windows-Installer)

## Features

The steps performed during app-publish are:

- Determine next version
- Auto-populate history file with commit messages since last version
- Update all versioned files with new version
- Run application specific build scripts
- Build installer if specified
- Upload distribution files to network drive
- Build and publish NPM package if specified
- Build and publish Nuget package if specified
- Run application specific deploy scripts
- Check all modifications into SVN
- Tag with new version in SVN
- Send release email

## Installation

To instal app-publisher globally for ceonvenience, run the following command

    $ npm install -g app-publisher

To install locally per project, run the following command from the directory containing the projects package.json file:

    $ npm install app-publisher

Currently, the publish is ran from a powershell script.  You will need to set the powershell execution policy with the following command if you have not already done so on your computer at some point in the past:

    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine

After the port to JS, this no longer be required.

## Usage

### Usage - Configuration File

To configure app-publisher per project, create a .publishrc.json file in the root project directory.

An example .publishrc.json file:

    {
        "projectName":      "extjs-pkg-server",
        "script": {
            "buildCommand":  [
                "ant.bat",
                "npm pack",
                "cmd /c move /Y perryjohnson-extjs-pkg-server-* install\\dist\\extjs-pkg-server.tgz"
            ]
        },
        "historyFile":      "doc\\history.txt",
        "historyHdrFile":   "install\\history-hdr.txt",
        "historyLineLen":   80,
        "installerRelease": "Y",
        "installerExDist":  "Y",
        "installerScript":  "install\\extjs-pkg-server.nsi",
        "notepadEdits":     "Y",
        "npmRelease":       "Y",
        "npmScope":         "@perryjohnson",
        "nugetRelease":     "Y",
        "pathtoRoot":       ".",
        "pathtoMainRoot":   "",
        "pathPreRoot":      "",
        "pathToDist":       "install\\dist",
        "svnRepo":          "pja",
        "testEmailRecip":   "smeesseman@pjats.com",
        "versionText":      "Version"
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

    GEMS2
        app
            fpc
            svr
            ui

The main project root is GEMS2.  In the case of each of these projects, SVNPREPATH should be set to app\fpc, app\ui, or app\svr, for each specific sub-project.  This mainly is be used for SVN commands which need to be ran in the directory containing the .svn folder.

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
