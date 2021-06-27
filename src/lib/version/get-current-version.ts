
import * as path from "path";
import { getDotNetVersion } from "./dotnet";
import { getChangelogVersion } from "./changelog";
import { getMantisBtVersion } from "./mantisbt";
import { getPomVersion } from "./pom";
import { IContext, IVersionInfo } from "../../interface";
import { getNpmVersion } from "./npm";
// import { getMakefileVersion } from "./makefile";
import { getAppPublisherVersion } from "./app-publisher";
import { getExtJsVersion } from "./extjs";
import { pathExists, readFile } from "../utils/fs";


export = getCurrentVersion;


async function getCurrentVersion(context: IContext): Promise<IVersionInfo>
{
    let warn = false;
    const {logger, options} = context;

    let versionInfo: IVersionInfo = {
        version: undefined,
        versionSystem: "semver",
        versionInfo: undefined
    };

    function doCheck(v: IVersionInfo, type: string, throwError = true)
    {
        if (v && v.version) {
            if (versionInfo.version) {
                if (v.version !== versionInfo.version)
                {
                    let logFn = logger.warn;
                    if (throwError) {
                        logFn = logger.error;
                    }
                    logFn("There is a version mismatch in one or more of the version files:");
                    logFn("   Type             : " + type);
                    logFn("   Parsed version   : " + v.version);
                    logFn("   Recorded version : " + versionInfo.version);
                    if (throwError) {
                        throw new Error("Local version file validation failed");
                    }
                    warn = true;
                }
                if (!versionInfo.versionInfo) {
                    versionInfo.versionInfo = v.versionInfo;
                }
            }
            else {
                versionInfo = v;
            }
        }
    }

    //
    // If node_modules dir exists, use package.json to obtain cur version
    //
    doCheck(await getNpmVersion(context), "npm");
    //
    // If node_modules dir exists, use package.json to obtain cur version
    //
    doCheck(getAppPublisherVersion(context), "app-publisher");
    //
    // .NET with AssemblyInfo.cs file
    //
    doCheck(await getDotNetVersion(context), "dotnet");
    //
    // .NET with AssemblyInfo.cs file
    //
    doCheck(await getExtJsVersion(context), "extjs");
    //
    // Makefile/RC Project
    //
    // doCheck(await getMakefileVersion(context));
    //
    // Maven pom.xml based Plugin
    //
    doCheck(await getPomVersion(context), "pom");
    //
    // MantisBT Plugin
    // The 'mantisbtPlugin' option specifies the main class file, containing version #
    //
    doCheck(await getMantisBtVersion(context), "mantisbt");
    //
    // Extract from changelog/history file
    //
    doCheck(await getChangelogVersion(context), "changelog", false);

    //
    // Loop through all specified files and validate version number
    //
    //     "versionFiles": [{
    //         "path": "..\\..\\install\\GEMS2_64bit.nsi",
    //         "regex": "!define +BUILD_LEVEL +([0-9a-zA-Z\\.\\-]{5,})"
    //     },
    //     {
    //         "path": "..\\svr\\assemblyinfo.cs",
    //         "regex": "AssemblyVersion *\\( *\"([0-9]+\\.[0-9]+\\.[0-9]+)",
    //         "setFiles": [{
    //             "path": "app.json",
    //             "regex": "\"svrVersion\" *: *\"([0-9a-zA-Z\\.\\-]{5,})\""
    //         }]
    //     }]
    //
    if (options.versionFiles)
    {
        for (const versionFileDef of options.versionFiles)
        {
            const tvFile = versionFileDef.path;
            if (versionFileDef.regex && !versionFileDef.setFiles && await pathExists(tvFile))
            {
                logger.log("Retrieving version from " + tvFile);
                let match: RegExpExecArray,
                    matched = false;
                const content = await readFile(tvFile),
                      regex = new RegExp(versionFileDef.regex, "gm");
                while ((match = regex.exec(content)) !== null)
                {
                    if (match[1]) {
                        logger.log("   Found version     : " + match[1]);
                        matched = true;
                    }
                }
                if (!matched) {
                    logger.error("   Not found (no match)");
                    throw new Error("Local version file validation failed");
                }
            }
        }
    }

    if (!versionInfo || !versionInfo.version)
    {
        logger.warn("The current version cannot be determined from the local files");
    }
    else {
        logger.log("Retrieved local file version info");
        logger.log(`   Version   : ${versionInfo.version}`);
        logger.log(`   System    : ${versionInfo.versionSystem}`);
        logger.log(`   Xtra info : ${versionInfo.versionInfo}`);
        if (!warn) {
            logger.success("All local version files have been validated");
        }
        else {
            logger.warn("Local version files could not be validated - See above warnings");
        }
    }

    return versionInfo;
}
