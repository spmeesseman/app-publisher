# App Publisher - Release Automation

[![perry-johnson](https://img.shields.io/badge/perry%20johnson-pja%20pjr-blue.svg)](https://www.spmeesseman.com)
[![app-category](https://img.shields.io/badge/category-releases%20automation%20npm-blue.svg)](https://www.spmeesseman.com)
[![app-lang](https://img.shields.io/badge/language-typescript%20powershell5-blue.svg)](https://www.spmeesseman.com)
[![app-publisher](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-app--publisher-e10000.svg)](https://www.spmeesseman.com)

[![authors](https://img.shields.io/badge/authors-scott%20meesseman-6F02B5.svg?logo=visual%20studio%20code)](https://www.spmeesseman.com)
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

    npm install -g @spmeesseman/app-publisher

To install locally per project, run the following command from the directory containing the projects package.json file:

    npm install @spmeesseman/app-publisher

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

### Usage - Configuration File and Parameters

Command line options and the .publishrc.json file can be used to define the configuration parameters.  To see all options and their descriptions, run app-publisher detailed help:

    app-publisher -h2
    app-publisher --help-detailed

### Usage - Configuration File Tips

To configure app-publisher per project, create a .publishrc.json file in the root project directory.

Environment variables can be used and expanded at runtime using the following syntax:

    ${ENVIRONMENT_VARIABLE_NAME}

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

An NPM release requires the NPM_TOKEN to be set in the system environment.  To create a PJ NPM token, perform the following steps:

To create an npm user if you dont have one, run the following command and follow the prompts:

    npm adduser --registry=npm.development.pjats.com --scope=@spmeesseman

After a period of time, the session token created with this command will expire.  When the token expires, run the login command:

    npm login --registry=npm.development.pjats.com --scope=@spmeesseman

For more details, see the [Internal NPM Registry](https://app1.development.pjats.com/doc/developernotes.md#Internal-NPM-Registry) section of the Perry Johnson Developer Notes document.

## Jenkins Token

I order to run the VSCode task *Validate Jenkinsfile*, the following environment variable must be set:

    c21lZXNzZW1hbjoxMTU5NzgyYTBmNDE5OTI2M2VkYTY0ZTVlZjViYzIzZDY4

This *token* is the base64 encoded version of http basic auth using an API token, i.e. username:token

## Running Outside of the Code Package Environment

To run App-Publisher, nodejs and npm are required.  These are by default installed with the *Code Package* installer.

To use App-Publisher without the *Code Package* environment, install NodeJS using the following steps:

1. [Download NodeJS](https://github.com/spmeesseman/code-package/blob/master/src/nodejs/nodejs.zip?raw=true)
2. Unzip the zipball to a directory on your hard drive, for example `c:\nodejs`
3. Add the unzipped directory's location to the SYSTEM PATH.

The download link for NodeJS above installs the version of NodeJS and NPM included with the *Code Package* install and is a simple zip based folder install.  To download the latest version or a Windows installer, visit the NodeJS website.

With NodeJS and NPM installed, open a command line terminal and install App-Publisher globally using the command:

    npm install -g @spmeesseman/app-publisher`

Note that to install the package with the above command, you must login to the registry first as described in the [previous section](#npm-token).

To use App-Publisher, open a command line and navigate to the project directory containing the .publishrc.json file.

To see the list of available command line options, run the following command:

    app-publisher -h

For a dry run, run the following command:

    app-publisher --no-ci --dry-run

For a production release, run the following command:

    app-publisher --no-ci

## Single Task Commands

The following *single* tasks can be performed:

1. Touch version files
2. Commit Version Files and Tag
3. View pending changelog
4. Write pending changelog.

### Touch Version FIles

To update all versioned files with the proposed new version:

    app-publisher --tv
    app-publisher --touch-versions

To commit all versioned files and create a tag:

    app-publisher --tvc
    app-publisher --touch-versions-commit
