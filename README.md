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

[![app-publisher-cmdline-banner](https://app1.development.pjats.com/svn/web/filedetails.php?repname=pja&path=/app-publisher/trunk/res/readme/cmdline-banner.png&usemime=1)](https://app1.development.pjats.com/svn/web/filedetails.php?repname=pja&path=/app-publisher/trunk/res/readme/cmdline-banner.png&usemime=1)

## Table of Contents

- [App Publisher - Release Automation](#app-publisher---release-automation
  - [Table of Contents](#table-of-contents)
  - [Description](#description)
  - [Requirements](#requirements)
  - [Installation](#installation)
  - [Commit Messages](#commit-messages)
  - [Usage](#usage)
    - [Usage - Configuration File](#usage---configuration-file)
    - [Usage - Example Configuration File](#usage---example-configuration-file)
  - [Configuration Parameters](#configuration-parameters)
    - [branch](#branch)
    - [bugs](#bugs)
    - [buildCommand](#buildcommand)
    - [changelogFile](#changelogfile)
    - [deployCommand](#deploycommand)
    - [distRelease](#distrelease)
    - [distReleasePath](#distreleasepath)
    - [dryRun](#dryrun)
    - [dryRunVcRevert](#dryrunvcrevert)
    - [emailHrefs](#emailhrefs)
    - [emailNotification](#emailnotification)
    - [emailPort](#emailport)
    - [emailRecip](#emailrecip)
    - [emailServer](#emailserver)
    - [emailSender](#emailsender)
    - [pathToDist](#pathtodist)
    - [postBuildCommand](#postbuildcommand)
    - [postReleaseCommand](#postreleasecommand)
    - [projectName](#projectname)
    - [skipVersionEdits](#skipversionedits)
    - [textEditor](#texteditor)
  - [How the Next Version is Determined](#how-the-next-version-is-determined)
  - [MantisBT Token](#mantisbt-token)
  - [NPM Token](#npm-token)
  - [Running Outside of the Code Package Environment](#running-outside-of-the-code-package-environment)

## Description

This package provides a multi-release publishing mechanism.

The steps performed during an app-publisher run are:

- Automatically determine next version from commit messages since last version. See the section on determining the next version [here](#Determining-the-Next-Version).
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
- Code Package Environment (Optional) or NodeJS

## Installation

To install app-publisher globally for convenience, run the following command:

    npm install -g @perryjohnson/app-publisher

To install locally per project, run the following command from the directory containing the projects package.json file:

    npm install @perryjohnson/app-publisher

Currently, a powershell script is the backbone to the multi-release publish.  The powershell execution policy needs to be set with the following command if it has not been already done so on the computer app-publisher is executing on at some point in the past:

    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine

After the port to NodeJS, this step will no longer be required.

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

    fix(user management): the "add user" button doesnt work when selecting the option "clerk"

    A typo was preventing the end user from being able to create a clerk type user.

    Users hould nw be able to create a clerk type user successfully.
    Note that non-administrators do not have access to this functionality.
    [fixes #142]

Including the [fixes #142] (or [closes #142]) tag in the footer will link the issue to the commit, auto-close the issue, remove any relevant tags from the issue, and add the "fixed" tag to the closed issue.

    feat(job administration): add support for the "modify status" action

    The action "Modify Status" in the Search Results tabs of Job Administration is now functional.

    Note that the list of statuses that the jobs may be changed to will be reduced in the next release.
    [refs #142]

Including the [refs #142] tag anywhere in the commit message will link issue #142 to the commit.

The commit messages will be used in the generation of the history and changelog files when running app-publisher.

References:

- [Commit Message Standards](https://app1.development.pjats.com/doc/developernotes.md#Commit-Messages)
- [GitHub Commit Message Standards](https://gist.github.com/stephenparish/9941e89d80e2bc58a153)
- [Angular Commenting Standards Updated](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#type)

## Usage

For the latest help content, run app-publisher detailed help with the -h2 option.

App-Publisher can be run from the command line or in Visual Studio Code using the [Task Explorer](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer) Extension.  The Task Explorer extension will automatically detect .publishrc.json files in a project, and display the tasks within an app-publisher node.

From the command line, the following command can be executed:

    cd project_root
    node app-publisher -p ps --no-ci

A dry run can also be performed with the --dry-run option:

    cd project_root
    node app-publisher -p ps --no-ci --dry-run

To see all available command line options and their descriptions, run app-publisher help:

    app-publisher -h
    app-publisher --help

### Usage - Configuration File

The .publishrc.json file can be used to define the configuration parameters.  To see all options and their descriptions, run app-publisher detailed help:

    app-publisher -h2
    app-publisher --help-detailed

### Usage - Configuration File Tips

To configure app-publisher per project, create a .publishrc.json file in the root project directory.

Environment variables can be used and expanded at runtime using the following syntax:

    ${ENVIRONMENT_VARIABLE_NAME}

## Configuration Parameters

### branch

The version control branch to perform commit checks and version tagging on.  This can be left blank if specified in package.json.

For Subversion, the default is **trunk**, for Git, the default is **master**, or soon to be **main**.

### bugs

The URL of the website where bugs, issues, and feature requests should be reported.  This can be left blank if specified in package.json.

### buildCommand

A command, or an array of comands, that are to be ran once all of the versions have been updated and changelog finalized.  This can be used to build the application, installer, etc.

### changelogFile

The path to the markdown changelog file, if it is kept.  Leaving this config blank will skip processing of marked down changelog file.

### deployCommand

A command, or an array of comands, that are to be ran before any releases (to MantisBT, GitHub, Directory Release, NPM Release, Nuget Release, etc) are made.

### distRelease

Will be reanmed to **directoryRelease** in future version.  Setting this flag to **Y** will perform a "directory release" to the directory specified in the [distReleasePath](#distReleasePath) config.  All files located in the directory specified by the [pathToDist](#pathToDist) config will be copied to the destination directory.

### distReleasePath

TODO

### dryRun

A dry run can be performed to test the publish run before it is ran "live".  Note that a dry run will automatically set the [skipVersionEdits](#skipVersionEdits) flag to **N**.

### dryRunVcRevert

Set this flag to **N** if you do not want the changes performed on files during a dry run to be reverted back their oiriginal content.

The default value is **Y**.

### emailHrefs

A link, or an array of links, to display in the release notification email.  Note that the [emailNotification](#emailNotification) flag must be set or this config has no effect.

The links can also specify a row label and a link label, for example:

    "emailHrefs": [
        "https://my.domin.com/svn/web/filedetails.php?repname=pja&path=%2Fapp-publisher%2Ftrunk%2FREADME.md&usemime=1|ReadMe File|Readme File - WebSVN",
        "https://my.domin.com//projects/set_project.php?project=app-publisher&make_default=no&ref=roadmap_page.php|Project Roadmap|Roadmap - Projects Board",
        "https://my.domin.com//projects/set_project.php?project=app-publisher&make_default=no&ref=changelog_page.php|Project Changelog|Changelog - Projects Board"
    ]

This config would be displayed in a notification email like so, where the 2nd item in each row is the actual link to the specified url:

    ReadMe File            Readme File - WebSVN
    Project Roadmap        Roadmap - Projects Board
    Project Changelog      Changelog - Projects Board

### emailNotification

Set this flag to **Y** to send a release notification email when the publish run has completed.

Default is **N**.

### emailPort

The port that the email server specified by [emailServer](#emailServer) listens on.

Default is **25**.

### emailRecip

The email address, or an array of email addresses, that the release notification email should be sent to.  Note that the [emailNotification](#emailNotification) flag must be set or this config has no effect.

### emailServer

The hostname or ip address of the email server to be used to send release notification emails.  Note that the [emailNotification](#emailNotification) flag must be set or this config has no effect.

### emailSender

The email address, or an array of email addresses, that the release notification email should be sent from.  Note that the [emailNotification](#emailNotification) flag must be set or this config has no effect.

### pathToDist

TODO

### postBuildCommand

A command, or an array of comands, that are to be ran once all of the builds have been made.  This can be used to clean up any temporary build files that the build scripts do not, adding additional files to be checked in to source control with the version tagging, etc.  These commands are run before any releases (to MantisBT, GitHub, Directory Release, NPM Release, Nuget Release, etc) are made.

### postReleaseCommand

A command, or an array of comands, that are to be ran once all of the releases (to MantisBT, GitHub, Directory Release, NPM Release, Nuget Release, etc) have been made.  These commands are ran right before the publish run has completed.

### projectName

The name of the project.  This hould matchthe project name in version control.

### skipVersionEdits

This flag can be set to **Y** to skip the display of the changed version files in the editor specified by the [textEditor](#textEditor) config.  Note that setting the [dryRun](#dryRun) flag will override this config and automatically set the value to **N**.

### textEditor

Specify the application to be used to open text based version files and files that need to be edited during the publish run.  Defaults to **notepad**.

## How the Next Version is Determined

The next version is determined depnding on the versioning system the application uses.

If a package.json exists in the project directory:

1. Current version is read from package.json
2. Semver is user to validate the current version
3. Semver is used to increment the version

If a history text file is defined in .publishrc.json:

1. Current version is read from the defined history text file
2. Determine if project uses semantic (x.y.z) or incremental versioning (x)
3. If semantic, use Semver is user to validate the current version
4. If semantic, Semver is used to increment the version, if incremental, the version is simply incre,ented by one

In the case where Semver is used to calculate the next version, the commit messages are examined to determine the next version level.  See the standards [here](https://app1.development.pjats.com/doc/developernotes.md#Commit-Messages).

In the case where the current version canot be read in order to determine the next, the publish run halts with an error.

TODO - Check version control tags for most recent/current version as an additional method of determing current version (the semantic-release module from which this module was conceptualized uses this method).

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

After a period of time, the session token created with this command will expire.  When the token expires, run the login command:

    $ npm login --registry=npm.development.pjats.com --scope=@perryjohnson

For more details, see the [Internal NPM Registry](https://app1.development.pjats.com/doc/developernotes.md#Internal-NPM-Registry) section of the Perry Johnson Developer Notes document.

## Running Outside of the Code Package Environment

To run App-Publisher, nodejs and npm are required.  These are by default installed with the *Code Package* installer.

To use App-Publisher without the *Code Package* environment, install NodeJS using the following steps:

1. [Download NodeJS](https://github.com/spmeesseman/code-package/blob/master/src/nodejs/nodejs.zip?raw=true)
2. Unzip the zipball to a directory on your hard drive, for example `c:\nodejs`
3. Add the unzipped directory's location to the SYSTEM PATH.

The download link for NodeJS above installs the version of NodeJS and NPM included with the *Code Package* install and is a simple zip based folder install.  To download the latest version or a Windows installer, visit the NodeJS website.

With NodeJS and NPM installed, open a command line terminal and install App-Publisher globally using the command:

    $ npm install -g @perryjohnson/app-publisher`

Note that to install the package with the above command, you must login to the registry first as described in the [previous section](#npm-token).

To use App-Publisher, open a command line and navigate to the project directory containing the .publishrc.json file.

To see the list of available command line options, run the following command:

    app-publisher -h

For a dry run, run the following command:

    app-publisher -p ps --no-ci --dry-run
For a production release, run the following command:

    app-publisher -p ps --no-ci

[![app-publisher-cmdline](res/readme/cmdline.png)](res/cmdline-banner.png)
