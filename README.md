# App Publisher

[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Description

> This package provides a semantic version style release mechanism as an option to the popular semantic-release modules.

## Features

* Subversion integration

## Installation

This module can be installed in other ways aside from a local npm/yarn/pnpm:

* As a global node install
* Installed with Code-Package Installer
* Installed with Windows Installer

## Publishing Steps

The steps performed during publish are:

* Determine next version
* Auto-populate history file with commit messages since last version
* Update all versioned files with new version
* Build installer if required
* Publish NPM package if required
* Publish Nuget package if required
* Check all modifications into SVN
* Tag with new version in SVN
* Send release email
