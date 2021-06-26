
import { getDotNetVersion } from "./dotnet";
import { getIncrementalVersion } from "./incremental";
import { getMantisBtVersion } from "./mantisbt";
import { getPomVersion } from "./pom";
import { IVersionInfo } from "../../interface";
import { getNpmVersion } from "./npm";
import { getMakefileVersion } from "./makefile";


export = getCurrentVersion;


async function getCurrentVersion(context: any): Promise<IVersionInfo>
{
    const options = context.options,
          logger = context.logger,
          cwd = context.cwd;

    let versionInfo = {
        version: undefined,
        versionSystem: "semver",
        versionInfo: undefined
    };

    //
    // If node_modules dir exists, use package.json to obtain cur version
    //
    versionInfo = await getNpmVersion(context);
    //
    // .NET with AssemblyInfo.cs file
    //
    if (!versionInfo || !versionInfo.version)
    {
        versionInfo = await getDotNetVersion(context);
    }
    //
    // Makefile/RC Project
    //
    if (!versionInfo || !versionInfo.version)
    {
        versionInfo = await getMakefileVersion(context);
    }
    //
    // Maven pom.xml based Plugin
    //
    if (!versionInfo || !versionInfo.version)
    {
        versionInfo = await getPomVersion(context);
    }
    //
    // MantisBT Plugin
    // The 'mantisbtPlugin' option specifies the main class file, containing version #
    //
    if (!versionInfo || !versionInfo.version)
    {
        versionInfo = await getMantisBtVersion(context);
    }
    //
    // Extract from changelog/history file
    //
    if (!versionInfo || !versionInfo.version)
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
        logger.error("The current version cannot be determined from the local files");
    }
    else {
        logger.log("Retrieved local file version info");
        logger.log(`   Version   : ${versionInfo.version}`);
        logger.log(`   System    : ${versionInfo.versionSystem}`);
        logger.log(`   Xtra info : ${versionInfo.versionInfo}`);
    }

    return versionInfo;
}
