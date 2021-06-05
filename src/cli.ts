#!/usr/bin/env node

import { env, stderr } from "process"; // eslint-disable-line node/prefer-global/process
import * as util from "util";
import { isNumeric } from "./util";
import hideSensitive = require("./lib/hide-sensitive");
import gradient from "gradient-string";
import chalk from "chalk";
import { publishRcOpts } from "./args";


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
        if (!opts.taskVersionCurrent && !opts.taskVersionNext && !opts.taskVersionInfo && !opts.taskCiEvInfo) {
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
                console.log("   " + property);
                process.exit(0);
            }

            if (!publishRcOpts[property][0])
            {
                console.log("A publishrc option specified cannot be used on the command line:");
                console.log("   " + property);
                process.exit(0);
            }

            //
            // Remove properties from the object that were not explicitly specified
            //
            if (value === null) {
                delete opts[o[0]];
                return; // continue forEach()
            }

            // if (value instanceof Array)
            // {
            //     value = o.toString();
            // }

            const publishRcType = publishRcOpts[property][1].trim(),
                  defaultValue = publishRcOpts[property][2];

            if (publishRcType === "flag")
            {
                if ((!value && defaultValue === "N") || (value && defaultValue === "Y")) {
                    delete opts[o[0]];
                    return;
                }
                opts[o[0]] = value = value ? "Y" : "N";
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
                        for (const v in vStrs)
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
                    console.log("   " + property);
                    console.log("   Must be " + enumValues);
                    process.exit(0);
                }
            }
        });

        if (opts.verbose) // even if it's a stdout type task
        {
            console.log(gradient("cyan", "pink").multiline(
`----------------------------------------------------------------------------
Current Command Line Options
----------------------------------------------------------------------------
        `, {interpolation: "hsv"}));
            console.log(JSON.stringify(opts, undefined, 2));
        }

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
            const valueType: string = def[1] as string,
                cmdLineArgs = getArgsFromProperty(property);
            let cmdLine = "", usage = "";

            if (def[3] instanceof String || typeof def[3] === "string")   //  [
            {                                                             //    true,
                line += def[3];                                           //    "boolean",
                console.log(line);                                        //    false,
                for (let i = 4; i < def.length; i++) {                    //    "Display help. This continues",
                    console.log(`                        ${def[i]}`);     //    "to successuve lines with ','."
                }                                                         //  ]
            }
            else if (def.length > 4 && def[4] instanceof Object)          //  [
            {                                                             //     true,
                const odef = (def[4] as any),                             //     "boolean"
                      lines = odef.help.split("\n");                      //     true,
                line += lines[0];                                         //     [ -h, ---help ],
                console.log(line);                                        //     {
                for (let i = 1; i < lines.length; i++) {                  //       help: "Display help.  This continues" +
                    console.log(`                        ${lines[i]}`);   //             "to successive lines with '+'."
                }                                                         //       usage: ""
                if (odef.usage) {                                         //     }
                    usage = odef.usage;                                   //  ]
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
            if (usage) {
                console.log("                        Usage        : " + usage);
            }
            console.log("");
        }
        else {
            console.log(line);
            console.log("");
        }
    });
}


function getArgsFromProperty(property: string, includeShort?: boolean): string[]
{
    const args: string[] = [];
    if (property)
    {
        if (includeShort) {
            args.push("-" + property.replace(/(?:^|\.?)([A-Z])/g, (x, y) => { return y[0].toLowerCase(); }));
        }
        args.push("-" + property.replace(/(?:^|\.?)([A-Z])/g, (x, y) => { return "-" + y.toLowerCase(); }));
    }
    return args;
}


function getPropertyFromArg(arg: string): string
{
    return arg.replace(/^[\-]{1,2}/, "").replace(/([\-])([a-z])/g, (x, y, z) => { return z.toUpperCase(); });
}


function parseArgs(): any
{
    const opts: any = {},
          args = process.argv.slice(2);
    let lastProp: string,
        lastType: string,
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
                console.log("   " + a);
                process.exit(0);
            }
            if (lastIsPositional)
            {
                if (lastType === "flag")
                {   // flag types specified on cmd linew/ no positional just default to Y
                    opts[lastProp] = "Y";
                }
                else {
                    console.log("Positional parameter not specified for:");
                    console.log("   " + lastProp);
                    process.exit(0);
                }
            }

            const valueType = publishRcOpts[p][1];
                  // defaultValue = publishRcOpts[p][2];

            lastProp = p;               // Record 'last', used for positionals
            lastType = valueType;
            lastIsPositional = valueType !==  "boolean";
            skipCompat = false;

            if (!lastIsPositional)
            {
                opts[p] = true;
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
                    console.log("   " + lastProp);
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
                    console.log("   " + lastProp);
                    process.exit(0);
                }
            }
            else if (valueType.startsWith("flag"))
            {
                if (!opts[lastProp]) {
                    if (a !== "Y" && a !== "N") {
                        console.log("Flag type arguments can have only one positional parameter:");
                        console.log("   " + lastProp);
                        process.exit(0);
                    }
                    opts[lastProp] = a;
                }
                else {
                    console.log("Flag type arguments can have only one positional parameter:");
                    console.log("   Y/N/y/n");
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
                        console.log("   " + lastProp);
                        process.exit(0);
                    }
                }
                else
                {
                    console.log("Positional parameter must be a number for property:");
                    console.log("   " + lastProp);
                    process.exit(0);
                }
            }
            else
            {
                console.log("Positional parameters not supported for property:");
                console.log("   " + lastProp);
                process.exit(0);
            }
            lastIsPositional = undefined;
        }
    });

    if (lastIsPositional)
    {
        console.log("Positional parameter not specified for:");
        console.log("   " + lastProp);
        process.exit(0);
    }

    return opts;
}


