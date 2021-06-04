#!/usr/bin/env node

import { env, stderr } from "process"; // eslint-disable-line node/prefer-global/process
import * as util from "util";
import { isNumeric } from "./util";
import hideSensitive = require("./lib/hide-sensitive");
import gradient from "gradient-string";
import chalk from "chalk";


export = async () =>
{
    //
    // Since the js port of argparse doesnt support the 'allowAbbrev' property, manually
    // parse the arguments.  Jeezuz these devs sometimes makes the simplest things so complicated.
    // Achieved half the functionality of the enture argparse library with a 100 line function.
    //
    const opts = parseArgs();

    try { //
         // Display color banner
        //
        if (!opts.taskVersionCurrent && !opts.taskVersionNext) {
            displayIntro();
        }

        //
        // If user specified '-h' or --help', then just display help and exit
        //
        if (opts.help)
        {
            displayPublishRcHelp();
            process.exit(0);
        }

        //
        // If user specified '--version', then just display version and exit
        //
        if (opts.version)
        {
            console.log(chalk.bold(gradient("cyan", "pink").multiline(
`----------------------------------------------------------------------------
 App-Publisher Version :  ${require("../package.json").version}
----------------------------------------------------------------------------
                        `, {interpolation: "hsv"})));
            process.exit(0);
        }

        //
        // Set transitive task flags
        //
        if (opts.taskChangelogFile) {
            opts.taskChangelog = true;
        }
        if (opts.taskTouchVersionsCommit) {   
            opts.taskTouchVersions = true;
        }
        if (opts.taskEmail || opts.taskTouchVersions || opts.taskMantisbtRelease) {
            opts.skipChangelogEdits = true;
        }

        //
        // Only one 'single-task mode' option can be specified...
        //
        if ((opts.taskChangelog && opts.taskEmail) || (opts.taskChangelog && opts.taskTouchVersions) ||
            (opts.taskTouchVersions && opts.taskEmail) || (opts.taskMantisbtRelease && opts.taskEmail) ||
            (opts.taskMantisbtRelease && opts.taskTouchVersions) || (opts.taskMantisbtRelease && opts.taskChangelog))
        {
            console.log("Invalid options specified:");
            console.log("  Only one task option can be used at this time.");
            console.log("    changeLog     : " + opts.changeLogOnly);
            console.log("    email         : " + opts.emailOnly);
            console.log("    mantisRelease : " + opts.mantisRelease);
            console.log("    republish     : " + opts.republish);
            console.log("    touchVersions : " + opts.touchVersions);
            process.exit(1);
        }

        //
        // Validate options
        //
        Object.entries(opts).forEach((o) =>
        {
            const property: string = o[0];
            let value: string | string[] = o[1] as (string | string[]);

            if (property === "help" || property === "version") {
                return; // continue forEach()
            }

            if (!publishRcOpts[property])
            {
                console.log("Unsupported publishrc option specified:");
                console.log("   " + property)
                process.exit(0);
            }

            if (!publishRcOpts[property][0])
            {
                console.log("A publishrc option specified cannot be used on the command line:");
                console.log("   " + property)
                process.exit(0);
            }

            //
            // Remove properties from the object that were not explicitly specified
            //
            if (value === null) {
                delete opts[o[0]];
                return; // continue forEach()
            }

            //if (value instanceof Array)
            //{
            //    value = o.toString();
            //}

            const publishRcType = publishRcOpts[property][1].trim(),
                  defaultValue = publishRcOpts[property][2];

            if (publishRcType === "flag")
            {
                if ((!value && defaultValue === "N") || (value && defaultValue === "Y")) {
                    delete opts[o[0]];
                    return;
                }
                opts[o[0]] = value = value ? "Y" : "N"
            }
            else if (publishRcType === "boolean")
            {
                if ((!value && !defaultValue) || (value && defaultValue)) {
                    delete opts[o[0]];
                    return;
                }
            }
            else if (publishRcType.startsWith("enum("))
            {
                let enumIsValid = false, enumValues: string;
                const matches = publishRcType.match(/[ ]*enum\((.+)\)/);
                if (matches && matches.length > 1) // [0] is the whole match 
                {                                  // [1] is the 1st capture group match
                    enumValues = matches[1];
                    const vStrs = enumValues.split("|");
                    if (!value) {
                        value = vStrs[0];
                    }
                    else {
                        for (let v in vStrs)
                        {
                            if (value[0] === vStrs[v]) {
                                value = value[0];
                                enumIsValid = true;
                                break;
                            }
                        }
                    }
                }
                if (!enumIsValid)
                {
                    console.log("Invalid publishrc option value specified:");
                    console.log("   " + property)
                    console.log("   Must be " + enumValues);
                    process.exit(0);
                }
            }
        });

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
    const title =
`                                       _      _       _
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
    console.log(gradient("cyan", "pink").multiline(
`----------------------------------------------------------------------------
 App-Publisher Detailed Help
----------------------------------------------------------------------------
        `, {interpolation: "hsv"}));
    console.log("");
    console.log("usage:");
    console.log("   All publishrc property names are the camel cased equivalent of the lowercase");
    console.log("   command line options, for example:");
    console.log("");
    console.log("   The command line equivalent to the .publishrc property 'emailNotification' is:");
    console.log("");
    console.log("      --email-notification");
    console.log("");

    Object.entries(publishRcOpts).forEach((o) =>
    {
        if (!o || !o[0]) { return; }
        let line = `  ${o[0]}`;
        const property =  o[0],
              def = o[1];

        if (property.length < 22)
        {
            for (let i = property.length; i < 22; i++) {
                line += " ";
            }
        }
        else {
            line += "\n                        ";
        }

        if (def && def instanceof Array && def.length > 3)
        {
            let valueType: string = def[1] as string,
                cmdLineArgs = getArgsFromProperty(property),
                cmdLine = "";

            if (def[3] instanceof String || typeof def[3] === 'string')   //  [
            {                                                             //    true,
                line += def[3];                                           //    "boolean",
                console.log(line);                                        //    false,
                for (let i = 4; i < def.length; i++) {                    //    "A script or list of scripts to...",
                    console.log(`                        ${def[i]}`);     //  ]
                }
            }
            else if (def.length > 4 && def[4] instanceof Object)          //  [
            {                                                             //     true,
                const lines = (def[4] as any).help.split("\n");           //     "boolean"
                line += lines[0];                                         //     true,
                console.log(line);                                        //     [ -s, ---long ],
                for (let i = 1; i < lines.length; i++) {                  //     { help: "A script or list of to..." }
                    console.log(`                        ${lines[i]}`);   //  ]
                }
            }
            console.log("");
            if (valueType === "flag")
            {
                cmdLine = cmdLineArgs.join(", ");
                console.log("                        Type         : flag");
            }
            else if (valueType.startsWith("enum("))
            {
                cmdLine = cmdLineArgs[0] + " <enum>";
                if (cmdLineArgs.length > 1){
                    cmdLine = " ,  " + cmdLineArgs[1] + " <enum>";
                }
                console.log("                        Type         : enumeration");
                console.log("                        Allowed      : " + valueType.replace(/[\(\)]|enum\(/gi, "").replace(/\|/g, " | "));
            }
            else if (valueType.startsWith("string")) // string , string[], string|string[]
            { 
                cmdLine = cmdLineArgs[0] + " <value>";
                if (cmdLineArgs.length > 1){
                    cmdLine = " ,  " + cmdLineArgs[1] + " <value>";
                }
                console.log("                        Type         : " + valueType.replace(/\|/g, " | "));
            }
            else if (valueType === "number")
            {
                cmdLine = cmdLineArgs[0] + " <number>";
                if (cmdLineArgs.length > 1){
                    cmdLine = " ,  " + cmdLineArgs[1] + " <number>";
                }
                console.log("                        Type         : " + valueType);
            }
            else { // boolean
                cmdLine = cmdLineArgs.join(", ");
                console.log("                        Type         : " + valueType);
            }
            console.log("                        Defaults to  : " + def[2].toString());
            console.log("                        Command Line : " + cmdLine);
            console.log("");
        }
        else {
            console.log(line);
            console.log("");
        }
    });
}


function getArgsFromProperty(property: string, includeShort?: boolean) : string[]
{
    const args: string[] = [];
    if (property)
    {
        if (includeShort) {
            args.push("-" + property.replace(/(?:^|\.?)([A-Z])/g, function (x,y){return y[0].toLowerCase()}));
        }
        args.push("-" + property.replace(/(?:^|\.?)([A-Z])/g, function (x,y){return "-" + y.toLowerCase()}));
    }
    return args;
}


function getPropertyFromArg(arg: string) : string
{
    return arg.replace(/^[\-]{1,2}/, "").replace(/([\-])([a-z])/g, function (x,y,z){ return z.toUpperCase()});
}


function parseArgs(): any
{
    const opts: any = {},
          args = process.argv.slice(2);
    let lastProp: string,
        lastIsPositional: boolean,
        skipCompat = false;

    args.forEach((a) =>
    {
        if (a.startsWith("-"))
        {   //
            // Backwards compat
            //
            if (a === "-p" || a === "--profile") {
                skipCompat = true;
                return; // continue forEach()
            }
            //
            const p = getPropertyFromArg(a);
            if (!p || !publishRcOpts[p])
            {
                console.log("Unsupported publishrc option specified:");
                console.log("   " + a)
                process.exit(0);
            }
            if (lastIsPositional)
            {
                console.log("Positional parameter not specified for:");
                console.log("   " + lastProp)
                process.exit(0); 
            }

            const valueType = publishRcOpts[p][1],
                  defaultValue = publishRcOpts[p][2];

            lastProp = p;               // Record 'last', used for positionals
            lastIsPositional = valueType.startsWith("string") || valueType === 'number' || valueType.startsWith("enum");
            skipCompat = false;

            if (!lastIsPositional)
            {
                opts[p] = (valueType === 'flag' ? "Y" : true);
            }
        }
        else if (lastProp)
        {
            const valueType = publishRcOpts[lastProp][1];
            //
            // Backwards compat
            //
            if (skipCompat) {
                skipCompat = false;
                return; // continue forEach()
            }
            //
            if (valueType.includes("string"))
            {
                if (!opts[lastProp]) {
                    if (valueType.includes("string[]")) {
                        opts[lastProp] = [ a ];
                    }
                    else {
                        opts[lastProp] = a;
                    }
                }
                else if (valueType.includes("string[]")) {
                    opts[lastProp].push(a);
                }
                else {
                    console.log("String type arguments can have only one positional parameter:");
                    console.log("   " + lastProp)
                    process.exit(0);
                }
            }
            else if (valueType.startsWith("enum"))
            {
                if (!opts[lastProp]) {
                    opts[lastProp] = a;
                }
                else {
                    console.log("Enum type arguments can have only one positional parameter:");
                    console.log("   " + lastProp)
                    process.exit(0);
                }
            }
            else if (valueType.includes("number"))
            {
                if (isNumeric(a)) {
                    if (!opts[lastProp]) {
                        opts[lastProp] = Number(a);
                    }
                    else {
                        console.log("Number type arguments can have only one positional parameter:");
                        console.log("   " + lastProp)
                        process.exit(0);
                    }
                }
                else
                {
                    console.log("Positional parameter must be a number for property:");
                    console.log("   " + lastProp)
                    process.exit(0);
                }
            }
            else
            {
                console.log("Positional parameters not supported for property:");
                console.log("   " + lastProp)
                process.exit(0);
            }
            lastIsPositional = undefined;
        }
    });
    
    if (lastIsPositional)
    {
        console.log("Positional parameter not specified for:");
        console.log("   " + lastProp)
        process.exit(0); 
    }

    return opts;
}


const publishRcOpts =
{
    branch: [
        //false,                  // Required
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

    cProjectRcFile: [
        true,
        "string",
        "",
        "The RC file name in a C Make project."
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

    dryRun: [
        true,
        "boolean",
        false,
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

    help: [
        true,
        "boolean",
        false,
        [ "-h", "--help" ],
        {
            dest: "help",
            action: "storeTrue",
            help: "Display help."
        }
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

    noCi: [
        true,
        "boolean",
        false,
        [ "-nci", "--no-ci" ],
        {
            dest: "noCi",
            action: "storeTrue",
            help: "Run in a local, non-CI environment."
        }
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

    readConfig: [
        true,
        "boolean",
        false,
        [ "-cfg", "--config" ],
        {
            dest: "readConfig",
            action: "storeTrue",
            help: "Display the contents of the configuration file."
        }
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

    republish: [
        true,
        "boolean",
        false,
        [ "-r", "--republish" ],
        {
            dest: "republish",
            action: "storeTrue",
            help: "Re-publish the current/latest release."
        }
    ],

    skipChangelogEdits: [
        true,
        "flag",
        "N",
        "Skip manual editing of the changelog file(s).",
        "Note the changelog used for a release will be that of which is output by the",
        "internal commit parser."
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

    taskChangelog: [
        true,
        "boolean",
        false,
        [ "-tc", "--task-changelog" ],
        {
            action: "storeTrue",
            help: "Export the next release's current changelog and view using the editor\n" +
                  "specified in the .publishrc file.\n" +
                  "Note that this opens the actual versioned changelog/history file."
        }
    ],

    taskChangelogFile: [
        true,
        "string",
        "",
        [ "-tcf", "--task-changelog-file" ],
        {
            help: "Export the next release's current changelog to the specified file.\n" +
                  "The specified file can be a relative or an absolute path.\n" +
                  "  Examples:\n" +
                  "    app-publisher -cf install/dist/history.txt\n" +
                  "    app-publisher -cf build/doc/changelog/changelog.md\n" +
                  "    app-publisher -cf c:\\projects\\changelogs\\projectname\n" +
                  "    app-publisher --changelog-only-file build/tmp/version_notes.txt\n" +
                  "Ignored if the option '--task-changelog-view' is used."
        }
    ],

    taskChangelogView: [
        true,
        "boolean",
        false,
        [ "-tc", "--task-changelog-view" ],
        {
            help: "Export the next release's current changelog and view using the editor\n" +
                  "specified in the .publishrc file. The created file is a copy stored in\n"+
                  "a temporary directory specified by the OS."
        }
    ],

    taskCiEnv: [
        true,
        "boolean",
        false,
        [ "-tce", "--task-ci-env" ],
        {
            help: "Output the CI environment name to stdout."
        }
    ],

    taskCiEnvSet: [
        true,
        "boolean",
        false,
        [ "-tces", "--task-ci-env-set" ],
        {
            help: "Finds the current/latest version released and outputs that version\n" +
                  "string to stdout."
        }
    ],

    taskEmail: [
        true,
        "boolean",
        false,
        [ "-te", "--task-email" ],
        {
            help: "Re-send the latest notification email."
        }
    ],

    taskMantisbtRelease: [
        true,
        "boolean",
        false,
        [ "-tmr", "--task-mantisbt-release" ],
        {
            help: "Perform a 'Mantis' release."
        }
    ],

    taskTouchVersions: [
        true,
        "boolean",
        false,
        [ "-ttv", "--task-touch-versions" ],
        {
            help: "Update version numbers either semantically or incrementally.\n" +
                  "Versioned files are by default AssemblyInfo.cs, package.json, and\n" +
                  "app.json.\n" +
                  "Additional versioned files are specified in the .publishrc file\n" +
                  "using the 'versionFiles' and cProjectRcFile' properties."
        }
    ],

    taskTouchVersionsCommit: [
        true,
        "boolean",
        false,
        [ "-ttvc", "--task-touch-versions-commit" ],
        {
            help: "Commits the changes made when using the --touch-versions option,\n" +
                  "using the 'chore: vX.X.X' format for the commit message.  Then creates\n" +
                  "a tag using the 'vX.X.X' format for the tag name."
        }
    ],

    taskVersionCurrent: [
        true,
        "boolean",
        false,
        [ "-tvc", "--task-version-current" ],
        {
            help: "Finds the current/latest version released and outputs that version\n" +
                  "string to stdout."
        }
    ],

    taskVersionNext: [
        true,
        "boolean",
        false,
        [ "-tvn", "--task-version-next" ],
        {
            help: "Calculates the next version to be released based on versioned files\n" +
                  "and commit messages. and outputs that version string to stdout."
        }
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
        "boolean",
        false,
        [ "-v", "--version" ],
        {
            help: "Display the current app-publisher version."
        }
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

    versionFilesScrollDown: [
        false,
        "string|string[]",
        "",
        "A file path or list of file paths where sroll-down is perfoemed when opened",
        "for editing."
    ],

    versionProperty: [
        true,
        "string",
        "",
        "A version property to be used or a project that does not use a package.json",
        "file.  Versions specified by this property should be in the same format as",
        "that of a package.json file and can be semantically parsed.",
    ],

    versionReplaceTags: [
        false,
        "string|string[]",
        "",
        "A tag or list of tags to use for performing version string replacement in files",
        "specified by 'versionFiles', and default versioned files (e.g. package.json)."
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
        "N",
        "In addition to stdout, writes a log to LOCALAPPDATA\\app-publisher\\log"
    ]
};
