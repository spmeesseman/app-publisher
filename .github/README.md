# App Publisher - Release Automation

[![authors](https://img.shields.io/badge/authors-scott%20meesseman-6F02B5.svg?logo=visual%20studio%20code)](https://www.littlesm.com)
[![app-category](https://img.shields.io/badge/category-releases%20automation%20npm-blue.svg)](https://www.spmeesseman.com)
[![app-lang](https://img.shields.io/badge/language-typescript%20powershell5-blue.svg)](https://www.spmeesseman.com)
[![app-publisher](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-app--publisher-e10000.svg)](https://www.spmeesseman.com)

[![GitHub issues open](https://img.shields.io/github/issues-raw/spmeesseman/app%2dpublisher.svg?logo=github)](https://github.com/spmeesseman/app-publisher/issues)
[![GitHub issues closed](https://img.shields.io/github/issues-closed-raw/spmeesseman/app%2dpublisher.svg?logo=github)](https://github.com/spmeesseman/app-publisher/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/spmeesseman/app%2dpublisher.svg?logo=github)](https://github.com/spmeesseman/app-publisher/pulls)
[![GitHub last commit](https://img.shields.io/github/last-commit/spmeesseman/app%2dpublisher.svg?logo=github)](https://github.com/spmeesseman/app-publisher)
[![PayPalDonate](https://img.shields.io/badge/paypal-donate-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=YWZXT3KE2L4BA&item_name=taskexplorer&currency_code=USD)

![app-publisher-cmdline-banner](../res/cmdline-banner.png?raw=true)

## Table of Contents

- [App Publisher - Release Automation](#app-publisher---release-automation)
  - [Table of Contents](#table-of-contents)
  - [Description](#description)
  - [Requirements](#requirements)
  - [Installation](#installation)
    - [Installation - NodeJS](#installation---nodejs)
  - [Publishing Mode](#publishing-mode)
  - [Task Mode](#task-mode)
  - [Usage](#usage)
    - [Usage - Configuration File](#usage---configuration-file)
  - [How the Next Version is Determined](#how-the-next-version-is-determined)
  - [Commit Messages](#commit-messages)
  - [Development Notes](#development-notes)
    - [MantisBT Token](#mantisbt-token)
    - [NPM Token](#npm-token)
    - [Jenkins Token](#jenkins-token)

## Description

This package provides a multi-release publishing mechanism similar to semantic-release using a more integrated approach, with support for **Subversion** as well as **Git**.  The code base for this package was started from the [semantic-release project](https://github.com/semantic-release/semantic-release), to give credit where it's due.

There are two modes to run app-publisher in:

1. Publishing Mode
2. Task Mode

[Publishing Mode](#publishing-mode) is similar to how *semantic-release* works, whereas [Task Mode](#task-mode) allows you to run individual pieces of the enture run, ideal for a multi-stage CI pipeline.

## Requirements

- Tested on Windows 10, "should" work on Linux/MacOS
- NodeJS or [Code Package](https://github.com/spmeesseman/code-package)

## Installation

To install app-publisher globally for convenience, run the following command:

    npm install -g @perryjohnson/app-publisher

To install locally per project, run the following command from the directory containing the projects package.json file:

    npm install @perryjohnson/app-publisher

Currently, a powershell script is the backbone to the multi-release publish.  The powershell execution policy needs to be set with the following command if it has not been already done so on the computer app-publisher is executing on at some point in the past:

    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine

After the port to NodeJS, this step will no longer be required.

### Installation - NodeJS

To run App-Publisher, nodejs and npm are required.  These are by default installed with the *Code Package* installer.

To use App-Publisher without the *Code Package* environment, install NodeJS using the following steps:

1. [Download NodeJS](https://github.com/spmeesseman/code-package/blob/master/src/nodejs/nodejs.zip?raw=true)
2. Unzip the zipball to a directory on your hard drive, for example `c:\nodejs`
3. Add the unzipped directory's location to the SYSTEM PATH.

The download link for NodeJS above installs the version of NodeJS and NPM included with the *Code Package* install and is a simple zip based folder install.  To download the latest version or a Windows installer, visit the NodeJS website.

With NodeJS and NPM installed, open a command line terminal and install App-Publisher globally using the command:

    npm install -g @perryjohnson/app-publisher`

Note that to install the package with the above command, you must login to the registry first as described in the [previous section](#npm-token).

To use App-Publisher, open a command line and navigate to the project directory containing the .publishrc.json file.

To see the list of available command line options, run the following command:

    app-publisher -h

For a dry run, run the following command:

    app-publisher --no-ci --dry-run

For a production release, run the following command:

    app-publisher --no-ci

## Publishing Mode

Publishing mode is similar to how *semantic-release* works.  The entire set of publishing steps are ran according to the publishrc configuration.

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

Tip: A publishnng mode dry run can be performed with the --dry-run option:

    app-publisher --no-ci --dry-run

All steps are configured via the [.publishrc configuration file](#usage---configuration-file-and-parameters)

## Task Mode

Task mode allows you to run pieces of the publishing run separately.  This is ideal for a multi-stage or multi-step CI pipeline, where the run can be broken up between different tages of the CI run, customizable to accomodate most scenarios.

All tasks that run in task mode have to following command line switch format, where 'xyz' is the specific task:

    --task-xyz

For example, to print the pending version's changelog to stdout so all pending changes since the last version can be examined, you can run:

    app-publisher --task-changelog-print

To output it locally on the command line in your development environment, the --no-ci switch can be used:

    app-publisher --no-ci --task-changelog-print

Existing tasks:

- --task-build
- --task-changelog
- --task-changelog-file
- --task-changelog-html-file
- --task-changelog-html-view
- --task-changelog-print
- --task-changelog-view
- --task-ci-env
- --task-ci-env-info
- --task-ci-env-set
- --task-commit
- --task-dist-release
- --task-email
- --task-github-release
- --task-mantisbt-release
- --task-npm-release
- --task-tag
- --task-touch-versions
- --task-version-current
- --task-version-info
- --task-version-next
- --task-version-pre-release-id

For complete details on command line arguments and switches, run app-publisher help:

    app-publisher --help

Tasks are influenced by the configuration set in the [.publishrc configuration file](#usage---configuration-file-and-parameters)

## Usage

For the latest help content, run app-publisher detailed help with the -h2 option.

App-Publisher can be run from the command line or in Visual Studio Code using the [Task Explorer](https://marketplace.visualstudio.com/items?itemName=spmeesseman.vscode-taskexplorer) Extension.  The Task Explorer extension will automatically detect .publishrc.* files in a project, and display the tasks within an app-publisher node.

### Usage - Configuration File

Command line options and the .publishrc.* file can be used to define the configuration of a publishing or task run.  To see all options and their descriptions, run app-publisher detailed help:

    app-publisher -h
    app-publisher --help

All options displayed with the exception of the *--task-xyz* switches are availablepublishrc file properties, in camel cased form.

To configure app-publisher per project, create a .publishrc.json/js/yml file in the root project directory.

A sample .publishrc.json file can be taken from this project's root directory.  This .publishrc file contains all available options.

Each option in the .publichrc file can be overriden on the command line.  For example, if a publishrc configuration defines the `sendEmail` flag as"Y", a notification email will be sent at the end of the run... it can be overridden / turned off using the following command line argument and positional parameter:

    app-publisher --send-email N

Environment variables can be used and expanded at runtime using the following syntax:

    ${ENVIRONMENT_VARIABLE_NAME}

## How the Next Version is Determined

The next version is determined depnding on the versioning system the application uses, and the set of [commit messages](#commit-messages) made since the last version was released.

Two versioning system are supported:

1. Semver
2. Incremental

In the case where Semver is used to calculate the next version, the commit messages are examined to determine the next version level.

In the case of incremental versioning, version simply increment one number at a time, e.g. 100, 101, 102, etc.

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

## Development Notes

### MantisBT Token

A MantsBT release requires the MANTISBT_API_TOKEN to be set in the system environment.  To create a MantisBT token, perform the following steps:

1. Log into the MantisBT website
2. Go to User Preferences
3. Select the `Tokens` tab
4. Name the token `RESTAPI`
5. Click `Create`.
6. Copy the displayed token
7. Create a system environment variable named `MANTISBT_API_TOKEN`, where the token is it's value.

### NPM Token

An NPM release requires the NPM_TOKEN to be set in the system environment.  To create a PJ NPM token, perform the following steps:

To create an npm user if you dont have one, run the following command and follow the prompts:

    npm adduser --registry=npm.development.pjats.com --scope=@spmeesseman

After a period of time, the session token created with this command will expire.  When the token expires, run the login command:

    npm login --registry=npm.development.pjats.com --scope=@spmeesseman

For more details, see the [Internal NPM Registry](https://app1.development.pjats.com/doc/developernotes.md#Internal-NPM-Registry) section of the Perry Johnson Developer Notes document.

### Jenkins Token

In order to run the VSCode task *Validate Jenkinsfile*, the following environment variable must be set:

    JENKINS_TOKEN

This *token* is the base64 encoded version of http basic auth using an API token, i.e. username:token
