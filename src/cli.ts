#!/usr/bin/env node

import { env, stderr } from "process"; // eslint-disable-line node/prefer-global/process
import * as util from "util";
import hideSensitive = require("./lib/hide-sensitive");
import gradient from "gradient-string";
import chalk from "chalk";

export = async () =>
{
    //
    // Build command line argument parser
    //
    const argparse = require("argparse");
    const ArgumentParser = argparse.ArgumentParser;
    const RawTextHelpFormatter = argparse.RawTextHelpFormatter;
    const parser = new ArgumentParser({
        addHelp: false,
        description: "App Publisher - CI Tool for Multi-Releases",
        prog: "app-publisher",
        formatterClass: RawTextHelpFormatter // so we can use linebreaks in the help txt
    });

    parser.addArgument(
        [ "-c", "--changelog-only" ],
        {
            dest: "changeLogOnly",
            action: "storeTrue",
            help: "Export the next release's current changelog."
        }
    );
    parser.addArgument(
        [ "-cfg", "--config" ],
        {
            dest: "readConfig",
            action: "storeTrue",
            help: "Display the contents of the configuration file."
        }
    );
    parser.addArgument(
        [ "-d", "--dry-run" ],
        {
            dest: "dryRun",
            action: "storeTrue",
            help: "Run in dry/test mode, all changes are reverted.\n" +
                  "In dry-run mode, the following holds:\n" +
                  "    1) Installer is not released/published\n" +
                  "    2) Email notification will be sent only to $TESTEMAILRECIPIENT\n" +
                  "    3) Commit package/build file changes (svn) are not made\n" +
                  "    4) Version tag (svn) is not made\n" +
                  "Some local files may be changed in test mode (i.e. updated version\n" +
                  "numbers in build and package files).  These changes should be reverted\n" +
                  "to original state via SCM"
        }
    );
    parser.addArgument(
        [ "-e", "--email-only" ],
        {
            dest: "emailOnly",
            action: "storeTrue",
            help: "Re-send the latest notification email."
        }
    );
    parser.addArgument(
        [ "-h", "--help" ],
        {
            help: "Display help.",
            action: "storeTrue"
        }
    );
    parser.addArgument(
        [ "-h2", "--help-detailed" ],
        {
            dest: "helpDetailed",
            action: "storeTrue",
            help: "Display detailed help."
        }
    );
    parser.addArgument(
        "--no-ci",
        {
            dest: "noCi",
            action: "storeTrue",
            help: "Run in a local, non-CI environment."
        }
    );
    parser.addArgument(
        [ "-o", "--opt" ],
        {
            dest: "option",
            action: "append",
            default: [],
            help: "Specify options that override the .publishrc properties\n" +
                  "  Examples:\n" +
                  "    app-publisher -o promptVersion=Y\n" +
                  "    app-publisher -o branch=v2.0 -o promptVersion=N\n" +
                  "    app-publisher -o emailNotification=N -o skipVersionEdits=Y"
        }
    );
    parser.addArgument(
        [ "-r", "--republish" ],
        {
            dest: "republish",
            action: "storeTrue",
            help: "Re-publish the current/latest release."
        }
    );
    parser.addArgument(
        [ "-v", "--version" ],
        {
            help: "Display the current app-publisher version.",
            action: "storeTrue"
        }
    );

    try {
        //
        // Parse command line arguments
        //
        const opts = parser.parseArgs();

        //
        // Display color banner
        //
        displayIntro();

        if (opts.option) {
            for (let o in opts.option)
            {
                if (!opts.option[o].includes("="))
                {
                    console.log("Invalid publishrc option specified:");
                    console.log("   " + opts.option[o]);
                    console.log("   Must be in the form property=value");
                    process.exit(0);
                }

                const optParts = opts.option[o].split("="),
                      optProp = optParts[0],
                      optVal = optParts[1];

                if (!publishRcOpts[optProp] || !publishRcOpts[optProp][0])
                {
                    console.log("Unsupported publishrc option specified:");
                    console.log("   " + optProp)
                    process.exit(0);
                }

                if (publishRcOpts[optProp][0] === "flag" && optVal.toUpperCase() !== "Y" && optVal.toUpperCase() !== "N")
                {
                    console.log("Invalid publishrc option value specified:");
                    console.log("   " + optProp)
                    console.log("   Must be Y/N/y/n");
                    process.exit(0);
                }
                else if (publishRcOpts[optProp][0] && publishRcOpts[optProp][0].trim().startsWith("enum("))
                {
                    let enumIsValid = false;
                    const matches = publishRcOpts[optProp][0].match(/[ ]*enum\((.+)\)/);
                    if (matches && matches.length > 1) // [0] is the whole match 
                    {                                  // [1] is the 1st capture group match
                        const vStr = matches[1],
                              vStrs = vStr.split("|");
                        for (let v in vStrs)
                        {
                            if (optVal === v) {
                                enumIsValid = true;
                                break;
                            }
                        }
                    }
                    if (!enumIsValid)
                    {
                        console.log("Invalid publishrc option value specified:");
                        console.log("   " + optProp)
                        console.log("   Must be Y/N/y/n");
                        process.exit(0);
                    }
                }
            }
        }

        //
        // If user specified '-h' or --help', then just display help and exit
        //
        if (opts.help || opts.helpDetailed)
        {
            console.log(gradient("cyan", "pink").multiline(`
----------------------------------------------------------------------------
 App-Publisher Help
----------------------------------------------------------------------------
        `, {interpolation: "hsv"}));
            parser.printHelp();
            if (opts.helpDetailed) {
                displayPublishRcHelp();
            }
            process.exit(0);
        }

        //
        // If user specified '--version', then just display version and exit
        //
        if (opts.version)
        {
            console.log(chalk.bold(gradient("cyan", "pink").multiline(`
----------------------------------------------------------------------------
 App-Publisher Version :  ${require("../package.json").version}
----------------------------------------------------------------------------
                        `, {interpolation: "hsv"})));
            process.exit(0);
        }

        delete opts.version; // remove since publishrc.json defines a param version
        await require(".")(opts);
        return 0;
    }
    catch (error)
    {
        if (error.name !== "YError") {
            stderr.write(hideSensitive(env)(util.inspect(error, {colors: true})));
    }

    return 1;
  }
};


function displayIntro()
{
    const title = `
                                       _      _       _
  _ _ __ _ __   _ __      _ __  _   __| |_ | (_)_____| |  ____  ____
 / _\\' || '_ \\\\| '_ \\\\___| '_ \\\\| \\ \\ |  _\\| | || ___| \\_/ _ \\\\/  _|
 | (_| || |_) || |_) |___| |_) || |_| | |_)| | | \\\\__| __ | __/| |
 \\__\\\\__| | .//| | .//   | | .//|____/|___/|_|_|/___/|_| \\___|.|_| v${require("../package.json").version} 
        |_|    |_|       |_|                                                    
    `;
    console.log(chalk.bold(gradient("cyan", "pink").multiline(title, {interpolation: "hsv"})));
}


function displayPublishRcHelp()
{
    console.log("");
    console.log(chalk.bold(gradient("cyan", "pink").multiline(`PublishRC Property Help`,
                            {interpolation: "hsv"})));
    console.log("");
    console.log("usage: .publishrc.json { propertyName: value }");
    console.log("");

    Object.entries(publishRcOpts).forEach((o) =>
    {
        if (!o || !o[0]) { return; }
        let line = `  ${o[0]}`;
        if (o[0].length < 22)
        {
            for (let i = o[0].length; i < 22; i++) {
                line += " ";
            }
        }
        else {
            line += "\n                        ";
        }
        if (o[1] && o[1] instanceof Array && o[1].length > 3)
        {
            let aVal: string = o[1][1] as string;
            line += o[1][3];
            console.log(line);
            for (let i = 4; i < o[1].length; i++) {
                console.log(`                        ${o[1][i]}`);
            }
            console.log("");
            if (aVal === "flag")
            {
                console.log("                        Type         : flag");
                console.log("                        Allowed      : Y / N / y / n");
            }
            else if (aVal.startsWith("enum("))
            {
                console.log("                        Type         : enumeration");
                console.log("                        Allowed      : " + aVal.replace(/[\(\)]|enum\(/gi, "").replace(/\|/g, " | "));
            }
            else {
                console.log("                        Type         : " + aVal.replace(/\|/g, " | ") + (aVal === "flag" ? " (Y/N)" : ""));
            }
            console.log("                        Defaults to  : " + o[1][2].toString());
            console.log("");
        }
        else {
            console.log(line);
            console.log("");
        }
    });
}


const publishRcOpts =
{
    branch: [
        //false,                    // Required
        true,                     // Can specify on command line
        "string",                 // Value type
        "trunk",                  // Default value
        "The branch to use."      // Help description (multi-line)
    ],
    
    buildCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the build stage."
    ],

    bugs: [
        true,
        "string",
        "",
        "Overrides the 'bugs' property of package.json when an NPM release is",
        "made, which is extracted for display on the project page of the NPM",
        "repository."
    ],

    changelogFile: [
        true,
        "string",
        "",
        "The location of this changelog file (markdown format), can be a",
        "relative or full path."
    ],

    commitMsgMap: [
        false,
        "object",
        "{ }",
        "A map of additional subject tags used in commits that will be used to",
        "increment the version and be included in the changelog, for example:",
        "",
        "    \"commitMsgMap\": {",
        "        \"internal\": {", 
        "            \"versionBump\": \"patch\",", 
        "            \"formatText\": \"Internal Change\",", 
        "            \"include\": false,", 
        "            \"iconCls\": \"fa-building\"", 
        "        }", 
        "    }"
    ],

    deployCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the deploy stage."
    ],

    distAddAllToVC: [
        true,
        "flag",
        "N",
        "Add the contents of the directory specified by the 'dist' property to",
        "version control, if not already.",
        "Ignored if distRelease = N."
    ],

    distDocPath: [
        true,
        "string",
        "",
        "The network path to use as the destination directory for a standard",
        "'dist' release's documentation directory.  All PDF files found within",
        "the doc directory specified by the 'distDocPathSrc' property will be",
        "uploaded/copied to this directory.",
        "Ignored if distRelease = N or distDocPathSrc is empty."
    ],

    distDocPathSrc: [
        true,
        "string",
        "",
        "The local path to use as the source directory for a standard 'dist'",
        "'release's documentation directory.  All PDF files found within this",
        "directory are uploaded/copied to the directory specified by the 'distDocPath'",
        "property.",
        "Ignored if distRelease = N or distDocPath is empty."
    ],

    distRelease: [
        true,
        "flag",
        "N",
        "Build a standard release to be uploaded to a network share."
    ],

    distReleasePath: [
        true,
        "string",
        "",
        "The network path to use as the destination directory for a standard",
        "'dist' release.",
        "Will be renamed to 'distDestPath' in a future release.",
        "Ignored if distRelease = N."
    ],

    distReleasePostCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the build stage, after building",
        "a standard 'dist' release.",
        "Ignored if distRelease = N."
    ],

    distReleasePreCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the build stage, before building",
        "a standard 'dist' release.",
        "Ignored if distRelease = N."
    ],

    dryRunVcRevert: [
        true,
        "flag",
        "Y",
        "Reverts all file modification made during a 'dry run' using version control."
    ],

    emailHrefs: [
        false,
        "string|string[]",
        "",
        "A link or list of links to insert into an email notification in the form",
        "'link|name'."
    ],

    emailMode: [
        true,
        "enum(std|ssl)",
        "std (Standard / Non-Secure)",
        "The delivery method to use when sending an email notification."
    ],

    emailNotification: [
        true,
        "flag",
        "N",
        "Send a release email notification."
    ],

    emailRecip: [
        true,
        "string",
        "",
        "The email address to use as the 'To' address when sending an email",
        "notification."
    ],

    emailSender: [
        true,
        "string",
        "",
        "The email address to use as the 'From' address when sending an email",
        "notification."
    ],

    emailServer: [
        true,
        "string",
        "",
        "The SMTP server to use when sending an email notification."
    ],

    githubAssets: [
        false,
        "string|string[]",
        "",
        "A path to a file resource or list of file resource paths to upload as assets",
        "of the Github release.",
        "Ignored if githubRelease = N."
    ],

    githubChglogEdit: [
        true,
        "flag",
        "N",
        "Edit the manipulated changelog before creating the Github release.",
        "Ignored if githubRelease = N."
    ],

    githubRelease: [
        true,
        "flag",
        "N",
        "Perform a Github releas."
    ],

    githubReleasePostCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the release stage, after creating",
        "a Github release.",
        "Ignored if githubRelease = N."
    ],

    githubReleasePreCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the release stage, before creating",
        "a Github release.",
        "Ignored if githubRelease = N."
    ],

    githubUser: [
        true,
        "string",
        "",
        "The Github username that owns the project the Github release will be made",
        "under.  Used to construct the Github project path i.e. github.com/username",
        "Ignored if githubRelease = N."
    ],

    historyFile: [
        true,
        "string",
        "",
        "The location of this history file, can be a relative or full path."
    ],

    historyHdrFile: [
        true,
        "string",
        "",
        "The location of this history header file, can be a relative or full path."
    ],

    historyLineLen: [
        true,
        "number",
        80,
        "The maximum line lenth to use when parsing commits to populate the",
        "history.txt file"
    ],

    historyHref: [
        false,
        "string|string[]",
        "",
        "A link to the history file to insert into an email notification in raw",
        "html link form i.e. <a href=\"...\">...</a>."
    ],

    homePage: [
        true,
        "string",
        "",
        "Overrides the 'homePage' property of package.json when an NPM release is",
        "made, which is extracted for display on the project page of the NPM",
        "repository."
    ],

    mantisbtApiToken: [
        true,
        "string|string[]",
        "",
        "The MantisBT token or list of tokens to make a MantisBT release with.",
        "Represents the user that the release is made under on the 'Releases' page."
    ],

    mantisbtAssets: [
        false,
        "string|string[]",
        "",
        "A path to a file resource or list of file resource paths to upload as assets",
        "of the MantisBT release.",
        "Ignored if mantisbtRelease = N."
    ],

    mantisbtChglogEdit: [
        true,
        "flag",
        "N",
        "Edit the manipulated changelog before creating the MantisBT release.",
        "Ignored if mantisbtRelease = N."
    ],

    mantisbtPlugin: [
        true,
        "flag",
        "N",
        "Specifies this project is a MantisBT plugin."
    ],

    mantisbtProject: [
        true,
        "string",
        "",
        "The MantisBT project name, if different than the main project name specified",
        "by 'projectName'."
    ],

    mantisbtRelease: [
        true,
        "flag",
        "N",
        "Perform a MantisBT release."
    ],

    mantisbtReleasePostCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the release stage, after creating",
        "a MantisBT release.",
        "Ignored if mantisbtRelease = N."
    ],

    mantisbtReleasePreCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the release stage, before creating",
        "a MantisBT release.",
        "Ignored if mantisbtRelease = N."
    ],

    mantisbtUrl: [
        false,
        "string|string[]",
        "",
        "A URL or a list of URL's to use for creating a MantisBT release.",
        "Ignored if mantisbtRelease = N."
    ],

    npmPackDist: [
        true,
        "flag",
        "Y",
        "Copy the NPM package to the directory specified by 'pathToDist'.",
        "Ignored if npmRelease = N."
    ],

    npmRegistry: [
        true,
        "string",
        "https://registry.npmjs.org",
        "The URL of the NPM registry to use for making an NPM release.",
        "Ignored if npmRelease = N."
    ],

    npmRelease: [
        true,
        "flag",
        "N",
        "Build the NPM release."
    ],

    npmReleasePostCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the release stage, after creating",
        "an NPM release.",
        "Ignored if npmRelease = N."
    ],

    npmReleasePreCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the release stage, before creating",
        "am NPM release.",
        "Ignored if npmRelease = N."
    ],

    npmScope: [
        true,
        "string",
        "",
        "The package scope to use for making an NPM release.",
        "Overrides the scope set in package.json.",
        "Ignored if npmRelease = N."
    ],

    nugetRelease: [
        true,
        "flag",
        "N",
        "Build the nuget release.",
        "Not supported as of this version."
    ],

    pathToDist: [
        true,
        "string",
        "install\\dist",
        "The local path to use as the source directory for a standard 'dist' release.",
        "Will be renamed to 'distSrcPath' in a future release.",
        "Path to DIST should be relative to PATHTOROOT",
        "Ignored if distRelease = N."
    ],

    pathToRoot: [
        true,
        "string",
        "",
        "A relative (not full) path that will equate to the project root as seen",
        "from the script's location.  For example, if this script is in",
        "PROJECTDIR\\script, then the rel path to root would be \"..\".  If the",
        "script is in PROJECTDIR\\install\\script, then the rel path to root would",
        "be \"..\\..\"",
        "The value should be relative to the script dir, dont use a full path",
        "as this will not share across users well keeping project files in",
        "different directories"
    ],

    pathPreRoot: [
        true,
        "string",
        "",
        "This in most cases sould be an empty string if the project is the 'main'",
        "project.  If a sub-project exists within a main project in SVN, then this",
        "needs to be set to the relative directory to the project path, as seen from",
        "the main project root.",
        "",
        "For example, the following project contains a layout with 3 separate projects",
        "'server', 'client', and 'utils':",
        "",
        "    ProjectName",
        "        app",
        "            client",
        "            server",
        "            utils",
        "",
        "The main project root is GEMS2.  In the case of each of these projects,",
        "SVNPREPATH should be set to app\\client, app\\server, or app\\utils, for each",
        "specific sub-project.",
        "This mainly is be used for SVN commands which need to be ran in the directory",
        "containing the .svn folder."
    ],

    pathToMainRoot: [
        true,
        "string",
        "",
        "This in most cases sould be an empty string if the project is the 'main'",
        "project.  If a sub-project exists within a main project in SVN, then this needs",
        "to be set to the relative directory to the main project root, as seen from the",
        "sub-project root."
    ],

    postBuildCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the build stage, after the build ",
        "process is started."
    ],

    preBuildCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the build stage, before the build",
        "process is started."
    ],

    postCommitCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the commit stage, after the commit",
        "process is started."
    ],

    preCommitCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the commit stage, before the commit",
        "process is started."
    ],

    postReleaseCommand: [
        false,
        "string|string[]",
        "",
        "A script or list of scripts to run for the final release stage, before the",
        "final release process is started."
    ],

    promptVersion: [
        true,
        "flag",
        "N",
        "Prompt for version.  The recommended version will be displayed at the prompt.",
    ],
    
    projectName: [
        true,
        "string",
        "",
        "Name of the project.  This must match throughout the build",
        "files and the SVN project name."
    ],

    repo: [
        true,
        "string",
        "",
        "The repository URL.  In the form:",
        "",
        "    https://svn.mydomain.com/path/to/repo/projectname/trunk",
        "    https://github.com/username/projectname"
    ],

    repoType: [
        true,
        "string",
        "svn",
        "The repository type. It should be one of the following:",
        "",
        "    1. git",
        "    2. svn"
    ],

    skipCommit: [
        true,
        "flag",
        "N",
        "Skip committing changes to version control when the final release stage is",
        "finished."
    ],

    skipDeployPush: [
        true,
        "flag",
        "N",
        "Skip uploading installer to network release folder (primarily used for releasing",
        "from hom office where two datacenters cannot be reached at the same time, in",
        "this case the installer files are manually copied)."
    ],

    skipVersionEdits: [
        true,
        "flag",
        "N",
        "Skip all version edits in version files."
    ],

    testEmailRecip: [
        true,
        "string",
        "",
        "The email address to use as the 'To' address when sending an email",
        "notification while running in dry run mode."
    ],

    textEditor: [
        true,
        "string",
        "notepad.exe",
        "The editor program to use when opening version files."
    ],

    vcTag: [
        true,
        "flag",
        "Y",
        "Tag the version in Version Control when the final release process has finished",
        "successfully.  Tags in the form: vX.X.X."
    ],

    vcTagPrefix: [
        true,
        "string",
        "",
        "TA prefix for the version tag.  Tags in the form prefix-vX.X.X."
    ],

    vcWebPath: [
        false,
        "string",
        "",
        "Web path to version control repository, if WebSVN is available"
    ],

    version: [
        true,
        "string",
        "",
        "A version property to be used or a project that does not use a package.json",
        "file.  Versions specified by this property should be in the same format as",
        "that of a package.json file and can be semantically parsed.",
    ],

    versionFiles: [
        false,
        "string|string[]",
        "",
        "A file path or list of file paths to perform version string replacement in."
    ],

    versionFilesEditAlways: [
        false,
        "string|string[]",
        "",
        "A file path or list of file paths to always perform version string replacement",
        "in, regardless of whether the 'skipVersionEdits' flag is set."
    ],

    versionReplaceTags: [
        false,
        "string|string[]",
        "",
        "A tag or list of tags to use for performing version string replacement in files",
        "specified by 'versionFiles', and default versioned files (e.g. package.json)."
    ],

    versionFilesScrollDown: [
        false,
        "string|string[]",
        "",
        "A file path or list of file paths where sroll-down is perfoemed when opened",
        "for editing."
    ],

    versionText: [
        true,
        "string",
        "Version",
        "The text tag to use in the history file for preceding the version number.  It",
        "should be one of the following:",
        "",
        "    1. Version",
        "    2. Build",
        "    3. Release"
    ],

    writeLog: [
        true,
        "flag",
        "Y",
        "In addition to stdout, writes a log to LOCALAPPDATA\\app-publisher\\log"
    ]
};
