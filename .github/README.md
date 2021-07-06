# App Publisher - Release Automation

[![authors](https://img.shields.io/badge/authors-scott%20meesseman-6F02B5.svg?logo=visual%20studio%20code)](https://www.littlesm.com)
[![app-category](https://img.shields.io/badge/category-releases%20automation%20npm-blue.svg)](https://www.spmeesseman.com)
[![app-lang](https://img.shields.io/badge/language-typescript%20powershell-blue.svg)](https://www.spmeesseman.com)
[![app-publisher](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-app--publisher-e10000.svg)](https://github.com/spmeesseman/app-publisher)

[![GitHub issues open](https://img.shields.io/github/issues-raw/spmeesseman/app%2dpublisher.svg?logo=github)](https://github.com/spmeesseman/app-publisher/issues)
[![GitHub issues closed](https://img.shields.io/github/issues-closed-raw/spmeesseman/app%2dpublisher.svg?logo=github)](https://github.com/spmeesseman/app-publisher/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/spmeesseman/app%2dpublisher.svg?logo=github)](https://github.com/spmeesseman/app-publisher/pulls)
[![GitHub last commit](https://img.shields.io/github/last-commit/spmeesseman/app%2dpublisher.svg?logo=github)](https://github.com/spmeesseman/app-publisher)
[![PayPalDonate](https://img.shields.io/badge/paypal-donate-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=YWZXT3KE2L4BA&item_name=taskexplorer&currency_code=USD)
[![codecov](https://codecov.io/gh/spmeesseman/app-publisher/branch/master/graph/badge.svg)](https://codecov.io/gh/spmeesseman/app-publisher)
[![CodeFactor](https://www.codefactor.io/repository/github/spmeesseman/app-publisher/badge)](https://www.codefactor.io/repository/github/spmeesseman/app-publisher)

![app-publisher-cmdline-banner](../res/readme/cmdline-banner.png?raw=true)

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
  - [Command Line and Options](#command-line-and-options)
    - [branch](#branch)
    - [buildCommand](#buildcommand)
    - [bugs](#bugs)
    - [changelogFile](#changelogfile)
    - [changelogHdrFile](#changeloghdrfile)
    - [changelogLineLen](#changeloglinelen)
    - [commitMsgMap](#commitmsgmap)
    - [config](#config)
    - [configName](#configname)
    - [cProjectRcFile](#cprojectrcfile)
    - [deployCommand](#deploycommand)
    - [distAddAllToVC](#distaddalltovc)
    - [distDocPath](#distdocpath)
    - [distDocPathSrc](#distdocpathsrc)
    - [distRelease](#distrelease)
    - [distReleasePath](#distreleasepath)
    - [distReleasePathSrc](#distreleasepathsrc)
    - [distReleasePostCommand](#distreleasepostcommand)
    - [distReleasePreCommand](#distreleaseprecommand)
    - [dryRun](#dryrun)
    - [dryRunQuiet](#dryrunquiet)
    - [emailHrefs](#emailhrefs)
    - [emailMode](#emailmode)
    - [emailPort](#emailport)
    - [emailNotification](#emailnotification)
    - [emailRecip](#emailrecip)
    - [emailSender](#emailsender)
    - [emailServer](#emailserver)
    - [githubAssets](#githubassets)
    - [githubChglogEdit](#githubchglogedit)
    - [githubRelease](#githubrelease)
    - [githubReleasePostCommand](#githubreleasepostcommand)
    - [githubReleasePreCommand](#githubreleaseprecommand)
    - [githubUser](#githubuser)
    - [help](#help)
    - [homePage](#homepage)
    - [mantisbtApiToken](#mantisbtapitoken)
    - [mantisbtAssets](#mantisbtassets)
    - [mantisbtChglogEdit](#mantisbtchglogedit)
    - [mantisbtPlugin](#mantisbtplugin)
    - [mantisbtProject](#mantisbtproject)
    - [mantisbtRelease](#mantisbtrelease)
    - [mantisbtReleasePostCommand](#mantisbtreleasepostcommand)
    - [mantisbtReleasePreCommand](#mantisbtreleaseprecommand)
    - [mantisbtUrl](#mantisbturl)
    - [noCi](#noci)
    - [npmPackDist](#npmpackdist)
    - [npmRegistry](#npmregistry)
    - [npmRelease](#npmrelease)
    - [npmReleasePostCommand](#npmreleasepostcommand)
    - [npmReleasePreCommand](#npmreleaseprecommand)
    - [npmScope](#npmscope)
    - [nugetRelease](#nugetrelease)
    - [postBuildCommand](#postbuildcommand)
    - [preBuildCommand](#prebuildcommand)
    - [postCommitCommand](#postcommitcommand)
    - [preCommitCommand](#precommitcommand)
    - [postReleaseCommand](#postreleasecommand)
    - [promptVersion](#promptversion)
    - [projectFileDotNet](#projectfiledotnet)
    - [projectFileExtJs](#projectfileextjs)
    - [projectFileNpm](#projectfilenpm)
    - [projectName](#projectname)
    - [projectVersion](#projectversion)
    - [repo](#repo)
    - [repoType](#repotype)
    - [republish](#republish)
    - [skipChangelogEdits](#skipchangelogedits)
    - [skipCommit](#skipcommit)
    - [skipTag](#skiptag)
    - [skipVersionEdits](#skipversionedits)
    - [taskBuild](#taskbuild)
    - [taskChangelog](#taskchangelog)
    - [taskChangelogFile](#taskchangelogfile)
    - [taskChangelogHtmlFile](#taskchangeloghtmlfile)
    - [taskChangelogHtmlView](#taskchangeloghtmlview)
    - [taskChangelogPrint](#taskchangelogprint)
    - [taskChangelogHdrPrint](#taskchangeloghdrprint)
    - [taskChangelogPrintVersion](#taskchangelogprintversion)
    - [taskChangelogHdrPrintVersion](#taskchangeloghdrprintversion)
    - [taskChangelogView](#taskchangelogview)
    - [taskChangelogViewVersion](#taskchangelogviewversion)
    - [taskCiEnv](#taskcienv)
    - [taskCiEnvInfo](#taskcienvinfo)
    - [taskCiEnvSet](#taskcienvset)
    - [taskCommit](#taskcommit)
    - [taskDeploy](#taskdeploy)
    - [taskDevTest](#taskdevtest)
    - [taskDistRelease](#taskdistrelease)
    - [taskEmail](#taskemail)
    - [taskGenerateHelp](#taskgeneratehelp)
    - [taskGithubRelease](#taskgithubrelease)
    - [taskMantisbtRelease](#taskmantisbtrelease)
    - [taskNpmJsonRestore](#tasknpmjsonrestore)
    - [taskNpmJsonUpdate](#tasknpmjsonupdate)
    - [taskNpmRelease](#tasknpmrelease)
    - [taskNugetRelease](#tasknugetrelease)
    - [taskReleaseLevel](#taskreleaselevel)
    - [taskRevert](#taskrevert)
    - [taskTag](#tasktag)
    - [taskTagVersion](#tasktagversion)
    - [taskVersionCurrent](#taskversioncurrent)
    - [taskVersionInfo](#taskversioninfo)
    - [taskVersionNext](#taskversionnext)
    - [taskVersionPreReleaseId](#taskversionprereleaseid)
    - [taskVersionUpdate](#taskversionupdate)
    - [testEmailRecip](#testemailrecip)
    - [tests](#tests)
    - [textEditor](#texteditor)
    - [vcFiles](#vcfiles)
    - [vcRevert](#vcrevert)
    - [vcRevertFiles](#vcrevertfiles)
    - [vcStdOut](#vcstdout)
    - [vcTagPrefix](#vctagprefix)
    - [vcWebPath](#vcwebpath)
    - [verbose](#verbose)
    - [verbosex](#verbosex)
    - [version](#version)
    - [versionFiles](#versionfiles)
    - [versionForceCurrent](#versionforcecurrent)
    - [versionForceNext](#versionforcenext)
    - [versionFilesEditAlways](#versionfileseditalways)
    - [versionFilesScrollDown](#versionfilesscrolldown)
    - [versionPreReleaseId](#versionprereleaseid)
    - [versionSystem](#versionsystem)
    - [versionText](#versiontext)
    - [writeLog](#writelog)
  - [VSCode Integration](#vscode-integration)
  - [Development Notes](#development-notes)
    - [MantisBT Token](#mantisbt-token)
    - [NPM Token](#npm-token)
    - [Jenkins Token](#jenkins-token)

## Description

This package provides a multi-release publishing mechanism similar to semantic-release using a more integrated approach, with support for **Subversion** as well as **Git**.  The code base for this package was started from the [semantic-release project](https://github.com/semantic-release/semantic-release), to give credit where it's due.  This package originally focused on local environment releases (publish mode) and has since exposed a sort of CI tool interface (task mode) to be used for various things like retrieving the next version number from a CI script.

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

## Command Line and Options

The following command line aguments and publishrc options are supported.

### branch

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   |*__trunk__*|
|**Command Line Arg**|*__-b \| --branch__*|

The branch to use.

For SVN, this should include the path to the branches directory, e.g.:

    branches/branch-name

SVN branch support can only work if there is a 'per project' branching folder / structure.  It is assumed that the 'tags' folders is named by convention, i.e. '/tags'

### buildCommand

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-bc \| --build-command__*|

A script or list of scripts to run for the build stage.

### bugs

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__--bugs__*|

Overrides the 'bugs' property of package.json when an NPM release is made, which is extracted for display on the project page of the NPM repository.

### changelogFile

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   |CHANGELOG.md|
|**Command Line Arg**|*__-cf \| --changelog-file__*|

The location of this changelog file (markdown or text format), should be a path relative to the project's root.

### changelogHdrFile

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-chf \| --changelog-hdr-file__*|

The location of this history header file, should be a path relative to the project's root.

### changelogLineLen

|**Value Type**      |*__number__*|
| :----------------- | :--------- |
|**Value Default**   |80|
|**Command Line Arg**|*__-cll \| --changelog-line-len__*|

The maximum line lenth to use when parsing commits to populate the changelog file.

### commitMsgMap

|**Value Type**      |*__ICommitMessageMap__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*  |

A map of additional subject tags used in commits that will be used to increment the version and be included in the changelog, for example:

    "commitMsgMap": {
        "internal": {
            "versionBump": "patch
            "formatText": "Internal Change
            "include": false,
            "iconCls": "fa-building
        }
    }

### config

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-c \| --config__*  |

Displays the configuration object and exits, for debugging.  Note that the default publishrc file is '.publishrc.*'.  A config file can be one of four different formats:

    .publishrc.json
    .publishrc.js
    .publishrc.yaml
    .publishrc.yml
    package.json { publish: { ... } }

### configName

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-cn \| --config-name__*  |

Use config name.  Note that the default publishrc file is '.publishrc.*'.  A config name can dyanimically modify the file used.  For example, a config name of 'cst' will yield a search for the following config files:

    .publishrc.cst.json
    .publishrc.cst.js
    .publishrc.cst.yaml
    .publishrc.cst.yml
    package.json { publish.cst: { ... } }

### cProjectRcFile

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-cprf \| --c-project-rc-file__*  |

The RC file name in a C Make project.

### deployCommand

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A script or list of scripts to run for the deploy stage.

### distAddAllToVC

|**Value Type**      |*__flag__*|
| :----------------- | :--------- |
|**Value Default**   |N|
|**Command Line Arg**|*__-davc \| --dist-add-all-to-vc__*|

Add the contents of the directory specified by the 'dist' property to version control, if not already.

Ignored if `distRelease` = "N".

### distDocPath

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

The network path to use as the destination directory for a standard `dist` release's documentation directory.  All PDF files found within the doc directory specified by the 'distDocPathSrc' property will be uploaded/copied to this directory.

Ignored if `distRelease` = "N" or `distDocPathSrc` is empty.

### distDocPathSrc

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-ddps \| --dist-doc-path-src__*|

The local path to use as the source directory for a standard 'dist' release's documentation directory.  All PDF files found within this directory are uploaded/copied to the directory specified by the 'distDocPath' property.

Ignored if `distRelease` = "N" or `distDocPath` is empty.

### distRelease

|**Value Type**      |*__flag__*|
| :----------------- | :--------- |
|**Value Default**   |N|
|**Command Line Arg**|*__-dr \| --dist-release__*|

Build a standard release to be uploaded to a network share.

### distReleasePath

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-drp \| --dist-release-path__*|

The network path to use as the destination directory for a standard `dist` directory release.  Will be renamed to 'distDestPath' in a future release.

The final directory created for the release will be:

   distReleasePath/projectName/nextVersion"

Ignored if `distRelease` = "N".

### distReleasePathSrc

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   |install/dist|
|**Command Line Arg**|*__-drps \| --dist-release-path-src__*|

The local path to use as the source directory for a standard 'dist' release.  Will be renamed to 'distSrcPath' in a future release.

Ignored if `distRelease` = "N".

### distReleasePostCommand

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A script or list of scripts to run for the build stage, after building a standard `dist` release.

Ignored if `distRelease` = "N".

### distReleasePreCommand

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A script or list of scripts to run for the build stage, before building a standard `dist` release.

Ignored if `distRelease` = "N".

### dryRun

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-dr \| --dry-run__*|

Run in dry/test mode, all changes are reverted.

In dry-run mode, the following holds:

1) Installer is not released/published
2) Email notification will be sent only to $TESTEMAILRECIPIENT
3) Commit package/build file changes (svn) are not made
4) Version tag (svn) is not made

Some local files may be changed in test mode (i.e. updated version numbers in build and package files).  These changes should be reverted to original state via SCM.

### dryRunQuiet

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-drq \| --dry-run-quiet__*|

Same as 'dryRun', but minus stdout logging in the release emulations.

### emailHrefs

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A link or list of links to insert into an email notification in the form 'link|name'.

### emailMode

|**Value Type**      |*__enum(std|ssl)__*|
| :----------------- | :--------- |
|**Value Default**   |std|
|**Command Line Arg**|*__n/a__*|

The delivery method to use when sending an email notification, possible values are:

    ssl (Secure)
    std (Standard / Non-Secure)

### emailPort

|**Value Type**      |*__number__*|
| :----------------- | :--------- |
|**Value Default**   |25|
|**Command Line Arg**|*__n/a__*|

The smtp server port to use when sending an email notification.

### emailNotification

|**Value Type**      |*__flag__*|
| :----------------- | :--------- |
|**Value Default**   |N|
|**Command Line Arg**|*__-en \| --email-notification__*|

Send a release email notification.

### emailRecip

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-er \| --email-recip__*|

The email address to use as the 'To' address when sending an email notification.

### emailSender

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-ef \| --email-sender__*|

The email address to use as the 'From' address when sending an email notification.

### emailServer

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-es \| --email-server__*|

The SMTP server to use when sending an email notification.

### githubAssets

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A path to a file resource or list of file resource paths to upload as assets of the Github release.

Ignored if `githubRelease` = "N".

### githubChglogEdit

|**Value Type**      |*__flag__*|
| :----------------- | :--------- |
|**Value Default**   |N|
|**Command Line Arg**|*__-gce \| --github-chglog-edit__*|

Edit the manipulated changelog before creating the Github release.

Ignored if `githubRelease` = "N".

### githubRelease

|**Value Type**      |*__flag__*|
| :----------------- | :--------- |
|**Value Default**   |N|
|**Command Line Arg**|*__-gr \| --github-release__*|

Perform a Github releas.

### githubReleasePostCommand

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A script or list of scripts to run for the release stage, after creating a Github release.

Ignored if `githubRelease` = "N".

### githubReleasePreCommand

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A script or list of scripts to run for the release stage, before creating a Github release.

Ignored if `githubRelease` = "N".

### githubUser

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-gu \| --github-user__*|

The Github username that owns the project the Github release will be made under.  Used to construct the Github project path i.e. github.com/username.

Ignored if `githubRelease` = "N".

### help

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-h \| --help__*|

Display console help.

### homePage

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__--home-page__*|

Overrides the `homePage` property of package.json when an NPM release is made, which is extracted for display on the project page of the NPM repository.

### mantisbtApiToken

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

The MantisBT token or list of tokens to make a MantisBT release with.  Represents the user that the release is made under on the 'Releases' page.

### mantisbtAssets

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A path to a file resource or list of file resource paths to upload as assets of the MantisBT release.

Ignored if `mantisbtRelease` = "N".

### mantisbtChglogEdit

|**Value Type**      |*__flag__*|
| :----------------- | :--------- |
|**Value Default**   |N|
|**Command Line Arg**|*__-mce \| --mantisbt-chglog-edit__*|

Edit the manipulated changelog before creating the MantisBT release.

Ignored if `mantisbtRelease` = "N".

### mantisbtPlugin

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-mp \| --mantisbt-plugin__*|

Specifies the main project file for a MantisBT plugin project.  The file extension must be '.php'"

### mantisbtProject

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-mpn \| --mantisbt-project__*|

The MantisBT project name, if different than the main project name specified by `projectName`.

### mantisbtRelease

|**Value Type**      |*__flag__*|
| :----------------- | :--------- |
|**Value Default**   |N|
|**Command Line Arg**|*__-mr \| --mantisbt-release__*|

Perform a MantisBT release.

### mantisbtReleasePostCommand

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A script or list of scripts to run for the release stage, after creating a MantisBT release.

Ignored if `mantisbtRelease` = "N".

### mantisbtReleasePreCommand

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A script or list of scripts to run for the release stage, before creating a MantisBT release.

Ignored if `mantisbtRelease` = "N".

### mantisbtUrl

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__--amntisbt-url__*|

The URL to use for creating a MantisBT release.

Ignored if `mantisbtRelease` = "N".

### noCi

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-nc \| --no-ci__*|

Run in a local, non-CI environment.

### npmPackDist

|**Value Type**      |*__flag__*|
| :----------------- | :--------- |
|**Value Default**   |N|
|**Command Line Arg**|*__-npd \| --npm-pack-dist__*|

Copy the NPM package to the directory specified by `distReleasePathSrc`.

File is renamed from what is output by NPM, it is named as:

    projectname.tgz

If the --config-name option is used, the file is named as:

    projectname-configname.tgz

Ignored if `npmRelease` = "N".

### npmRegistry

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   |<https://registry.npmjs.org>|
|**Command Line Arg**|*__-nrg \| --npm-registry__*|

The URL of the NPM registry to use for making an NPM release.  This needs to be set if this is a privately hosted repository.  Should be in the form:

    https://npm.mydomain.com

Ignored if `npmRelease` = "N".

### npmRelease

|**Value Type**      |*__flag__*|
| :----------------- | :--------- |
|**Value Default**   |N|
|**Command Line Arg**|*__-nr \| --npm-release__*|

Build and make an NPM release.

### npmReleasePostCommand

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A script or list of scripts to run for the release stage, after creating an NPM release.

Ignored if `npmRelease` = "N".

### npmReleasePreCommand

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A script or list of scripts to run for the release stage, before creating an NPM release.

Ignored if `npmRelease` = "N".

### npmScope

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-ns \| --npm-scope__*|

The package scope to use for making an NPM release.
Overrides the scope set in package.json.
Ignored if `npmRelease` = "N".

### nugetRelease

|**Value Type**      |*__flag__*|
| :----------------- | :--------- |
|**Value Default**   |N|
|**Command Line Arg**|*__-ngr \| --nuget-release__*|

Build and make a Nuget release.  Not supported as of v3.

### postBuildCommand

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A script or list of scripts to run for the build stage, after the build process is started.

### preBuildCommand

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A script or list of scripts to run for the build stage, before the build process is started.

### postCommitCommand

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A script or list of scripts to run for the commit stage, after the commit process is started.

### preCommitCommand

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A script or list of scripts to run for the commit stage, before the commit process is started.

### postReleaseCommand

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A script or list of scripts to run for the final release stage, before the final release process is started.

### promptVersion

|**Value Type**      |*__flag__*|
| :----------------- | :--------- |
|**Value Default**   |N|
|**Command Line Arg**|*__-pv \| --prompt-version__*|

Prompt for version.  The recommended version will be displayed at the prompt.

### projectFileDotNet

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-pfdn \| --project-file-dot-net__*|

Relative path to the .NET project version file (AssemblyInfo.cs).  Any .NET assemblyinfo.cs files are attempted to be loaded and matched to a project, but in the case where it cannot, this property can be set."

### projectFileExtJs

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-pfej \| --project-file-ext-js__*|

Relative path to the ExtJs project version file (app.json).
Any ExtJs app.json files are attempted to be loaded and matched to a
project, but in the case where it cannot, this property can be set."

### projectFileNpm

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-pfn \| --project-file-npm__*|

Relative path to the NPM project version file (package.json).  Any NPM package.json files are attempted to be loaded and matched to a project, but in the case where it cannot, this property can be set.

### projectName

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-pn \| --project-name__*|

Name of the project.  This must match throughout the build files and the VCS project name.

### projectVersion

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

Utility field for tracking version if no other mechanism is available.

### repo

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-rp \| --repo__*|

The repository URL.  In the form:

    https://svn.mydomain.com/path/to/repo/projectname/trunk
    https://github.com/username/projectname

### repoType

|**Value Type**      |*__enum(git|svn)__*|
| :----------------- | :--------- |
|**Value Default**   |git|
|**Command Line Arg**|*__-rpt \| --repo-type__*|

The repository type. It should be one of the following:

 1. git
 2. svn

### republish

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-r \| --republish__*|

Re-publish the current/latest release.  Can be used for multi-publish configurations to bypass local version file validation.

### skipChangelogEdits

|**Value Type**      |*__flag__*|
| :----------------- | :--------- |
|**Value Default**   |N|
|**Command Line Arg**|*__-sce \| --skip-changelog-edits__*|

Skip manual editing of the changelog file(s).  Note the changelog used for a release will be that of which is output by the internal commit parser.

### skipCommit

|**Value Type**      |*__flag__*|
| :----------------- | :--------- |
|**Value Default**   |N|
|**Command Line Arg**|*__-sc \| --skip-commit__*|

Skip committing changes to version control when the final release stage is finished (commit stage).

### skipTag

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   |N|
|**Command Line Arg**|*__-st \| --skip-tag__*|

Skip tagging version in version control when the final release stage is finished (commit stage).

### skipVersionEdits

|**Value Type**      |*__flag__*|
| :----------------- | :--------- |
|**Value Default**   |N|
|**Command Line Arg**|*__-sve \| --skip-version-edits__*|

Skip all version edits in version files.

### taskBuild

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tb \| --task-build__*|

Runs all scripts defined by the publishrc property buildCommand`.

### taskChangelog

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tc \| --task-changelog__*|

Export the next release's current changelog and view using the editor specified in the .publishrc file.  Note that this opens the actual versioned changelog/history file.

### taskChangelogFile

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-tcf \| --task-changelog-file__*|

Export the next release's current changelog to the specified file, can be a relative or an absolute path.  Ignored if the option '--task-changelog-view' is used.

Usage:

    app-publisher -tcf install/dist/history.txt
    app-publisher -tcf build/doc/changelog/changelog.md
    app-publisher -tcf c:\\projects\\changelogs\\projectname\\cl.md
    app-publisher --task-changelog-file build/tmp/version_notes.txt

### taskChangelogHtmlFile

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-tchf \| --task-changelog-html-file__*|

Export the next release's current changelog in HTML release format to the specified file, can be a relative or an absolute path.  Ignored if the option '--task-changelog-view' is used.

Usage:

    app-publisher --task-changelog-html-file install/tmp/version_notes.html

### taskChangelogHtmlView

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tchv \| --task-changelog-html-view__*|

Export the next release's current changelog in HTML release format and view using the editor specified in the .publishrc file. The created file is a copy stored in a temporary directory specified by the OS.

### taskChangelogPrint

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tcp \| --task-changelog-print__*|

Export the next release's pending changelog and output to stdout.

### taskChangelogHdrPrint

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tchp \| --task-changelog-hdr-print__*|

Read the changelog's header from disk and output to stdout.

### taskChangelogPrintVersion

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-tcpv \| --task-changelog-print-version__*|

Export the specified release's current changelog and output to stdout.

Usage:

    app-publisher --no-ci -tcpv 1.2.4
    app-publisher --task-changelog-print-version 3.0.1

### taskChangelogHdrPrintVersion

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-tchpv \| --task-changelog-hdr-print-version__*|

Read the changelog's header from disk and output to stdout, using the specified version number.

### taskChangelogView

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tcv \| --task-changelog-view__*|

Export the next release's current changelog and view using the editor specified in the .publishrc file. The created file is a copy stored in a temporary directory specified by the OS.

### taskChangelogViewVersion

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-tcvv \| --task-changelog-view-version__*|

Export the specified release's current changelog and view using the editor specified in the .publishrc file. The created file is a copy stored in a temporary directory specified by the OS.

### taskCiEnv

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tce \| --task-ci-env__*|

Output the CI environment name to stdout.

### taskCiEnvInfo

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tcei \| --task-ci-env-info__*|

Finds CI related build information, and outputs the info to stdout using a concatenated string in the form 'current|next|changelogpath'.

### taskCiEnvSet

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tces \| --task-ci-env-set__*|

Finds CI related build information, and outputs the info to the file 'ap.env' in the root workspace directory.

### taskCommit

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tcm \| --task-commit__*|

Commits the changes made when using the --touch-versions option, using the 'chore: vX.X.X' format for the commit message.

### taskDeploy

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-td \| --task-deploy__*|

Runs the deployment scripts defined in the .publishrc configuration.

### taskDevTest

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tdt \| --task-dev-test__*|

Run temporary tests in the local dev environment.  Note that this does nothing when ran in a production build.

### taskDistRelease

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tdr \| --task-dist-release__*|

Perform a `dist` release.

### taskEmail

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-te \| --task-email__*|

Re-send the latest notification email.

### taskGenerateHelp

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tgh \| --task-generate-help__*|

Generate help markdown from help output.  Internal tool.

### taskGithubRelease

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tgr \| --task-github-release__*|

Perform a 'Github' release.  The changelog produced for the Github release will be created from the most recent entry of the changelog/history file.

### taskMantisbtRelease

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tmr \| --task-mantisbt-release__*|

Perform a 'Mantis' release.  The changelog produced for the Mantis release will be created from the most recent entry of the changelog/history file.

### taskNpmJsonRestore

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tnjr \| --task-npm-json-restore__*|

Restores changes made to the package.json file as a result of using the --task-npm-json-update task.  Properties include:

    bugs, homepage, repo, repoType

Note that this task should in most cases always be ran following the use of the --task-npm-json-update task.

### taskNpmJsonUpdate

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tnju \| --task-npm-json-update__*|

Updates package.json with .publishrc defined properties.  Properties include:

    bugs, homepage, repo, repoType

Can be used for publishing to multiple npm repositories.  Note that this task should in most cases always be followed up with a --task-npm-json-restore task.

### taskNpmRelease

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tnr \| --task-npm-release__*|

Perform an 'NPM' release (publish).

### taskNugetRelease

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tngr \| --task-nuget-release__*|

Perform a 'Nuget' release (not implemented yet).

### taskReleaseLevel

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-trl \| --task-release-level__*|

Gets the release level for the next release and outputs it to stdout.  Release level will be one of 'none', 'patch', 'minor', or 'major'.

### taskRevert

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tr \| --task-revert__*|

Reverts all local changes made by the publish run.

### taskTag

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tt \| --task-tag__*|

Creates a tag using the 'vX.X.X' format for the tag name.  The 'taskVersionUpdate' and 'taskVersionUpdateCommit' tasks should always precede this task.

### taskTagVersion

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-ttv \| --task-tag-version__*|

Creates a tag using the specified positional parameter as the tag name.  The 'taskVersionUpdate' and 'taskVersionUpdateCommit' tasks should always precede this task.

Usage:

    app-publisher --task-tag-version 2.0.0

### taskVersionCurrent

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tvc \| --task-version-current__*|

Finds the current/latest version released and outputs that version string to stdout.

Ignored if the `--task-version-info` switch is used.

### taskVersionInfo

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tvi \| --task-version-info__*|

Finds the current/latest and next version released, and outputs the info to stdout using a concatenated string in the form:

    current_version|next_version|release_level

Note that this switch overrides both the `--task-version-current` and the `--task-version-current` switches.

### taskVersionNext

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tvn \| --task-version-next__*|

Calculates the next version to be released based on versioned files and commit messages. and outputs that version string to stdout.

Ignored if the `--task-version-info` switch is used.

### taskVersionPreReleaseId

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-tvprid \| --task-version-pre-release-id__*|

Gets the identifier denoting a pre-release from a version string.  For example, the version string 2.20.11-alpha.3 has a pre-release identifier of 'alpha'.

Usage:

    app-publisher --task-version-pre-release-id 2.0.1-alpha.1
    app-publisher --task-version-pre-release-id 2.0.1-beta.3

### taskVersionUpdate

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-tvu \| --task-version-update__*|

Update version numbers either semantically or incrementally.  Versioned files are by default AssemblyInfo.cs, package.json, and app.json. Additional versioned files are specified in the .publishrc file using the 'versionFiles' and cProjectRcFile' properties.

### testEmailRecip

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-ter \| --task-email-recip__*|

The email address to use as the 'To' address when sending an email notification while running in dry run mode."

### tests

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-t \| --tests__*|

Runs tests (development use).

### textEditor

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   |notepad.exe|
|**Command Line Arg**|*__-tedr \| --text-editor__*|

The editor program to use when opening version files for manual editing."

### vcFiles

|**Value Type**      |*__string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A list of files that should be checked into version control in the commit phase.  These would include files generated/moved/modified by any of the hook scripts that are to be included in the version commit/tag"

### vcRevert

|**Value Type**      |*__flag__*|
| :----------------- | :--------- |
|**Value Default**   |Y|
|**Command Line Arg**|*__-vr \| --vc-revert__*|

Reverts all file modifications made if a publish failes, or, after a dry run is completed.  Uses version control.

### vcRevertFiles

|**Value Type**      |*__string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

Additional files to be reverted if a publish run fails, or, after a dry run completes.  Uses version control.

Ignored if `vcRevert` = "N".

### vcStdOut

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-vso \| --vc-std-out__*|

true,
boolean
false,
Outputs stdout from the vc process (git or svn) and pipes it to the current
runs stdout.  Use for debugging version control issues."

### vcTagPrefix

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-vtp \| --vc-tag-prefix__*|

Tag prefix for the version tag.  Labels the created tag in the form prefix-vX.X.X."

### vcWebPath

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-vwp \| --vc-web-path__*|

Web path to the version control repository e.g. the project's home page on GitHub, or for a Subversion project the project root in a web viewer such as WebSVN.  Primarily used for dynamically creating links in the changelogs and/or email notifications.

### verbose

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-vbs \| --verbose__*|

Enables additional log output.

### verbosex

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-vbsx \| --verbosex__*|

Enables additional log output, including stringified objects.  Pronounced 'ver-bose ecks' ;)

### version

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-v \| --version__*|

Display the current app-publisher version.

### versionFiles

|**Value Type**      |*__IVersionFile[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A file path or list of file paths to perform version string replacement in.  A source/target pair can lso be specified using the 'setFiles' property.

Example:

     "versionFiles": [{
         "path": "..\\..\\install\\GEMS2_64bit.nsi",
         "regex": "!define +BUILD_LEVEL +VERSION",
         "regexVersion": "[0-9a-zA-Z\\.\\-]{5,}",
         "regexWrite": "!define BUILD_LEVEL      "VERSION"
     },
     {
         "path": "node_modules\\@pja\\extjs-pkg-server\\package.json",
         "setFiles": [{
             "path": "app.json",
             "regex": "svrVersion" \*: \*"VERSION",
             "regexVersion": "[0-9a-zA-Z\\.\\-]{5,}",
             "regexWrite": "svrVersion": "VERSION"
         },
         {
             "path": "..\\svr\\assemblyinfo.cs",
             "regex": "AssemblyVersion *\\(VERSION",
             "regexVersion": "[0-9]+\\.[0-9]+\\.[0-9]+",
             "regexWrite": "AssemblyVersion\\(VERSION"
         }]
     }]

The regex must contain the text 'VERSION' which translates to the capturing group used to obtain the actual version number, and it must be the first group if more than one capturing groups exist in the regex.   The 'regexVersion' property is the regex that will match the version, and defaults to the regex `[0-9a-zA-Z\\.\\-]{5,}` if not specified.  This property is optional and defualts to system:semver.

### versionForceCurrent

|**Value Type**      |*__boolean__*|
| :----------------- | :--------- |
|**Value Default**   |false|
|**Command Line Arg**|*__-vfc \| --version-force-current__*|

Force current version, for use with post release tasks such as re-sending an email notification or performing a GitHub release if for whever reason it failed on the publish run.

Usage:

    app-publisher --task-email --version-force-current

### versionForceNext

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-vfn \| --version-force-next__*|

A version number to use as the 'next version'.  Version calculation will not be performed other than for reading in the current version, skipping an SCM step.

Usage:

    app-publisher --version-force-next 300
    app-publisher --version-force-next 2.0.0

### versionFilesEditAlways

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A file path or list of file paths to always perform version string replacement in, regardless of whether the `skipVersionEdits` flag is set.

### versionFilesScrollDown

|**Value Type**      |*__string \| string[]__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__n/a__*|

A file path or list of file paths where sroll-down is perfoemed when opened for editing.

### versionPreReleaseId

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   ||
|**Command Line Arg**|*__-vpri \| --version-pre-release-id__*|

An identifier denoting a pre-release can to be appenended to the next version number to produce the final version string, e.g. 'alpha' produces the final version string of x.y.z-alpha.

Usage:

    app-publisher --version-pre-release-id alpha
    app-publisher --version-pre-release-id pre1

### versionSystem

|**Value Type**      |*__enum(auto|semver|incremental)__*|
| :----------------- | :--------- |
|**Value Default**   |auto|
|**Command Line Arg**|*__-vs \| --version-system__*|

Specify the versioning system to be used if it cannot be determined automatically:

 1. semver       Ex. 1.0.0, 1.0.1, 1.0.2
 2. incremental  Ex. 100, 101, 102"

### versionText

|**Value Type**      |*__string__*|
| :----------------- | :--------- |
|**Value Default**   |Version|
|**Command Line Arg**|*__-vt \| --version-text__*|

The text tag to use in the history file for preceding the version number.  It should be one of the following:

 1. Version
 2. Build
 3. Release

### writeLog

|**Value Type**      |*__flag__*|
| :----------------- | :--------- |
|**Value Default**   |N|
|**Command Line Arg**|*__-wr \| --write-log__*  |

In addition to stdout, writes a log to LOCALAPPDATA/app-publisher/log

## VSCode Integration

Integrates with the [vscode-taskexplorer](https://github.com/spmeesseman/task-explorer) VSCode extension.

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
