import chalk from "chalk";
import gradient from "gradient-string";
import { publishRcOpts } from "../args";
import { IOptions } from "../interface";
const pkg = require("../../package.json");
const envCi = require("@spmeesseman/env-ci");

export = getOptions;


function getOptions(env: any, cwd: string, useBanner = true): IOptions
{
    const version = require("../../package.json").version,
          banner = apBanner(version),
          ArgParser = require("@spmeesseman/arg-parser").ArgParser;

    const parser = new ArgParser({
        app: "app-publisher",
        banner, version,
        ignorePositional: [ "-p", "--profile" ]
    });
    const opts = parser.parseArgs(publishRcOpts);

    opts.ciInfo = envCi({ env, cwd });

    //
    // Set task mode stdout flag on the options object
    //
    opts.taskModeStdOut = !!(opts.taskVersionCurrent || opts.taskVersionNext || opts.taskVersionInfo ||
                             opts.taskCiEvInfo || opts.taskVersionPreReleaseId || opts.taskChangelogPrint ||
                             opts.taskChangelogPrintVersion || opts.taskReleaseLevel);
    //
    // Set task mode flag on the options object
    //
    for (const o in opts)
    {
        if (o.startsWith("task"))
        {
            const oDef = publishRcOpts[o],
                  valueType = oDef ? oDef[1] : undefined, defaultValue = oDef ? oDef[2] : undefined;
            //
            // check 'string' and 'boolean' types differently
            //
            if (oDef && (valueType === "boolean" && opts[o] === true) || (valueType === "string"  && opts[o])) {
                opts.taskMode = true;
                break;
            }
        }
    }

    //
    // Set some additional options
    //
    opts.appPublisherVersion = pkg.version;
    opts.isNodeJsEnv = typeof module !== "undefined" && module.exports;

    //
    // Display color banner
    // If opts.verbose s set, then the ArgumentParser will have diplayed the banner already
    // For stdout type tasks, then we dont display the banner or anything else for that matter.
    //
    if (!opts.taskModeStdOut && !opts.verbose && useBanner) {
        displayIntro(banner);
    }

    return opts;
}


function apBanner(version: string)
{
    return `                                       _      _       _
  _ _ __ _ __   _ __      _ __  _   __| |_ | (_)_____| |  ____  ____
 / _\\' || '_ \\\\| '_ \\\\___| '_ \\\\| \\ \\ |  _\\| | || ___| \\_/ _ \\\\/  _|
 | (_| || |_) || |_) |___| |_) || |_| | |_)| | | \\\\__| __ | __/| |
 \\__\\\\__| | .//| | .//   | | .//|____/|___/|_|_|/___/|_| \\___|.|_| v${version}
        |_|    |_|       |_|`;
}


function displayIntro(banner: string)
{
    console.log(chalk.bold(gradient("cyan", "pink").multiline(banner, {interpolation: "hsv"})));
}

