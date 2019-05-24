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
  - [Publishing Steps Performed](#Publishing-Steps-Performed)
  - [Windows Installer](#Windows-Installer)

## Features

- Subversion integration

## Installation

To instal app-publisher globally for ceonvenience, run the following command

    $ npm install -g app-publisher

To install locally per project, run the following command from the directory containing the projects package.json file:

    $ npm install app-publisher

## Usage

Todo...

## Publishing Steps Performed

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

## Windows Installer

[Download the Windows Installer](file://///192.168.68.120/d$/softwareimages/app-publisher/1.2.1/app-publisher.exe)
