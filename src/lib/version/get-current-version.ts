
import * as path from "path";
import { existsSync } from "fs";
import { getDotNetVersion } from "./dotnet";
import { getIncrementalVersion } from "./incremental";
import { getMantisBtVersion } from "./mantisbt";
import { getPomVersion } from "./pom";


export = getCurrentVersion;


async function getCurrentVersion(context: any):
                           Promise<{ version: string | undefined, versionSystem: string | undefined, versionInfo: string | undefined }>
{
    const options = context.options,
          logger = context.logger,
          cwd = context.cwd;
    let versionInfo = {
        version: undefined,
        versionSystem: undefined,
        versionInfo: undefined
    };

    if (options.versionForceCurrent instanceof String || typeof(options.versionForceCurrent) === "string")
    {
        versionInfo.version = options.versionForceCurrent;
    }
    //
    // If node_modules dir exists, use package.json to obtain cur version
    //
    else if (existsSync(path.join(cwd, "package.json")))
    {
        versionInfo.version = require(path.join(cwd, "package.json")).version;
    }
    //
    // Maven pom.xml based Plugin
    //
    else if (existsSync(path.join(cwd, "pom.xml")))
    {
        versionInfo = await getPomVersion(context);
    }
    //
    // MantisBT Plugin
    // mantisBtPlugin specifies the main class file, containing version #
    //
    else if (options.mantisBtPlugin && existsSync(path.join(cwd, options.mantisBtPlugin)))
    {
        versionInfo = await getMantisBtVersion(context);
    }
    //
    // .NET with AssemblyInfo.cs file
    //
    else if (options.historyFile && (existsSync(path.join(cwd, "AssemblyInfo.cs")) ||
                                     existsSync(path.join(cwd, "properties", "AssemblyInfo.cs"))))
    {
        versionInfo = await getDotNetVersion(context);
    }
    //
    // Test style History file
    //
    else if (options.historyFile && existsSync(path.join(cwd, options.historyFile)))
    {
        versionInfo = await getIncrementalVersion(context);
    }

    //
    // Check .publishrc if no version was found
    //
    if ((!versionInfo || !versionInfo.version) && options.version)
    {
        versionInfo = {
            version: options.version,
            versionSystem: "semver",
            versionInfo: undefined
        };
    }

    if (!versionInfo || !versionInfo.version)
    {
        logger.error("The current version cannot be determined");
        logger.error("Provided the current version in .publishrc or on the command line");
        throw new Error("132");
    }

    return versionInfo;
}
