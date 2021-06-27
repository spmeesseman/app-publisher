
import { getDotNetVersion } from "./dotnet";
import { getChangelogVersion } from "./changelog";
import { getMantisBtVersion } from "./mantisbt";
import { getPomVersion } from "./pom";
import { IContext, IVersionInfo } from "../../interface";
import { getNpmVersion } from "./npm";
// import { getMakefileVersion } from "./makefile";
import { getAppPublisherVersion } from "./app-publisher";


export = getCurrentVersion;


async function getCurrentVersion(context: IContext): Promise<IVersionInfo>
{
    const logger = context.logger;

    let versionInfo: IVersionInfo = {
        version: undefined,
        versionSystem: "semver",
        versionInfo: undefined
    };

    function doCheck(v: IVersionInfo, type: string)
    {
        if (v && v.version) {
            if (versionInfo.version) {
                if (v.version !== versionInfo.version) {
                    logger.warn("There is a version mismatch in one or more of the version files:");
                    logger.warn("   Type             : " + type);
                    logger.warn("   Parsed version   : " + v.version);
                    logger.warn("   Recorded version : " + versionInfo.version);
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
    doCheck(await getChangelogVersion(context), "changelog");

    //
    // Check .publishrc if no version was found
    //
    // if ((!versionInfo || !versionInfo.version) && options.version)
    // {
    //     versionInfo = {
    //         version: options.version,
    //         versionSystem: "semver",
    //         versionInfo: undefined
    //     };
    // }

    if (!versionInfo || !versionInfo.version)
    {
        logger.warn("The current version cannot be determined from the local files");
    }
    else {
        logger.log("Retrieved local file version info");
        logger.log(`   Version   : ${versionInfo.version}`);
        logger.log(`   System    : ${versionInfo.versionSystem}`);
        logger.log(`   Xtra info : ${versionInfo.versionInfo}`);
    }

    return versionInfo;
}
