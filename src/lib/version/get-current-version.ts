
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
import { FIRST_RELEASE } from "../definitions/constants";


export = getCurrentVersion;


async function getCurrentVersion(context: IContext): Promise<IVersionInfo>
{
    let warn = false;
    const {logger, options} = context;

    const versionInfo: IVersionInfo = {
        version: undefined,
        system: options.versionSystem || "semver",
        info: undefined
    };

    function doCheck(v: IVersionInfo, type: string, throwError = true)
    {
        if (v && v.version)
        {
            if (versionInfo.version)
            {
                if (versionInfo.system) {
                    if (versionInfo.system === "incremental") {
                        const fv = v.version.replace(/\./g, "");
                        if (v.version.indexOf(".") !== -1) {
                            logger.log("   Converting semver style version to incremental");
                            logger.log("   Converted version  : " + fv);
                        }
                        v.version = fv;
                    }
                }
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
                        if (!options.republish) {
                            throw new Error("Local version file validation failed");
                        }
                        else {
                            logger.warn("   Continuing in republish mode");
                        }
                    }
                    warn = true;
                }
                if (!versionInfo.info) {
                    versionInfo.info = v.info;
                }
                if (!versionInfo.system || versionInfo.system === "auto") {
                    versionInfo.system = v.system;
                }
            }
            else {
                versionInfo.version = v.version;
                versionInfo.info = v.info;
                if (!versionInfo.system || versionInfo.system === "auto") {
                    versionInfo.system = v.system;
                }
            }
        }
    }

    //
    // Extract from changelog/history file
    // If a pre-releaseid is being used and this is task mode, then there will be no
    // changelog section for the pre-release version.  We
    //
    if (!options.versionPreReleaseId) {
        doCheck(await getChangelogVersion(context), "changelog", false);
    }
    else {
        logger.log("This is a pre-release, the changelog file will not be checked for version");
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
    // Loop through all specified files and validate version number
    //
    //     "versionFiles": [{
    //         "path": "..\\..\\install\\GEMS2_64bit.nsi",
    //         "regex": "!define +BUILD_LEVEL +VERSION",
    //         "regexVersion": "[0-9a-zA-Z\\.\\-]{5,}",
    //         "regexWrite": "!define BUILD_LEVEL      \"VERSION\"",
    //     },
    //     {
    //         "path": "..\\svr\\assemblyinfo.cs",
    //         "regex": "AssemblyVersion *\\(VERSION",
    //         "regexVersion": "[0-9]+\\.[0-9]+\\.[0-9]+",
    //         "regexWrite": "AssemblyVersion\\(VERSION)",
    //         "versionInfo": {
    //             "system": "semver"
    //         },
    //         "setFiles": [{
    //             "path": "app.json",
    //             "regex": "\"svrVersion\" *: *\"VERSION\"",
    //             "regexVersion": "[0-9a-zA-Z\\.\\-]{5,}",
    //             "regexWrite": "\"svrVersion\": \"VERSION\"",
    //             "versionInfo": {
    //                 "system": "semver"
    //             }
    //         }]
    //     }]
    //
    if (options.versionFiles)
    {
        for (const versionFileDef of options.versionFiles)
        {
            const tvFile = versionFileDef.path;
            if (!versionFileDef.setFiles && await pathExists(tvFile))
            {
                logger.log("Retrieving version from " + tvFile);
                let match: RegExpExecArray,
                    matched = false;
                const content = await readFile(tvFile),
                      rgxStr = versionFileDef.regex.replace(new RegExp("\\$\\(VERSION\\)", "g"), `(${versionFileDef.regexVersion})`)
                                                   .replace(new RegExp(`\\(\\(${versionFileDef.regexVersion.replace(/\./g, "\\.")}\\)\\)`, "g"),
                                                            `(${versionFileDef.regexVersion})`),
                      regex = new RegExp(rgxStr, "gm");
                while ((match = regex.exec(content)) !== null)
                {
                    if (match[1]) {
                        logger.log("   Found version      : " + match[1]);
                        matched = true;
                    }
                }
                if (!matched) {
                    logger.error("   Not found (no match)");
                    logger.error("   Possible invalid regex?");
                    throw new Error("Local version file validation failed");
                }
            }
        }
    }

    if (!versionInfo.version)
    {
        logger.warn("The current version cannot be determined from the local files");
        logger.warn(`   Setting to initial version ${FIRST_RELEASE}`);
        versionInfo.version = FIRST_RELEASE;
    }
    else {
        logger.log("Retrieved local file version info");
        logger.log(`   Version   : ${versionInfo.version}`);
        logger.log(`   System    : ${versionInfo.system}`);
        logger.log(`   Xtra info : ${versionInfo.info}`);
        if (!warn) {
            logger.success("All local version files have been validated");
        }
        else {
            logger.warn("Local version files could not be validated - See above warnings");
        }
    }

    return versionInfo;
}
