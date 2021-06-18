
import * as path from "path";
import { existsSync } from "fs";
import getAppPublisherVersion = require("./get-app-publisher-version");
import getDotNetVersion = require("./get-dotnet-version");
import getIncrementalVersion = require("./get-incremental-version");
import getMantisVersion = require("./get-mantis-version");
import getPomVersion = require("./get-pom-version");


export = getCurrentVersion;


function getCurrentVersion(context: any):
                           { version: string | undefined, versionSystem: string | undefined, versionInfo: string | undefined }
{
    const options = context.options,
          logger = context.logger;
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
    else if (existsSync(path.join(process.cwd(), "package.json")))
    {
        versionInfo.version = require(path.join(process.cwd(), "package.json")).version;
    }
    //
    // Maven pom.xml based Plugin
    //
    else if (existsSync(path.join(process.cwd(), "pom.xml")))
    {
        versionInfo = getPomVersion(context);
    }
    //
    // MantisBT Plugin
    // mantisBtPlugin specifies the main class file, containing version #
    //
    else if (options.mantisBtPlugin && existsSync(path.join(process.cwd(), options.mantisBtPlugin)))
    {
        versionInfo = getMantisVersion(context);
    }
    //
    // .NET with AssemblyInfo.cs file
    //
    else if (options.historyFile && (existsSync(path.join(process.cwd(), "AssemblyInfo.cs")) ||
                                     existsSync(path.join(process.cwd(), "properties", "AssemblyInfo.cs"))))
    {
        versionInfo = getDotNetVersion(context);
    }
    //
    // Test style History file
    //
    else if (options.historyFile && existsSync(path.join(process.cwd(), options.historyFile)))
    {
        versionInfo = getIncrementalVersion(context);
    }

    //
    // Check .publishrc if no version was found
    //
    if ((!versionInfo || !versionInfo.version) && existsSync(path.join(process.cwd(), ".publishrc.json")))
    {
        versionInfo = getAppPublisherVersion(context);
    }

    if (!versionInfo || !versionInfo.version)
    {
        logger.error("The current version cannot be determined");
        logger.error("Provided the current version in .publishrc or on the command line");
        throw new Error("132");
    }

    return versionInfo;
}
