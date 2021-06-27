
import * as semver from "semver";
import { IContext, IVersionInfo } from "../../interface";
import { FIRST_RELEASE, FIRST_RELEASE_INC } from "../definitions/constants";


export function getNextVersion(context: IContext)
{
    const {nextRelease, lastRelease, options, logger} = context;
    let version: string;

    logger.log("Get next version");
    logger.log("   Level  : " + nextRelease.level);

    if (lastRelease.version)
    {
        if (lastRelease.versionInfo.system === "incremental")
        {
            version = (parseInt(lastRelease.version) + 1).toString();
        }
        else {
            if (!options.versionPreReleaseId) {
                version = semver.inc(lastRelease.version, nextRelease.level);
            }
            else {
            // if (options.versionPreReleaseId) {
                // const isAlreadyPre = semver.prerelease(version) !== null;
                logger.log("   Pre Id : " + options.versionPreReleaseId);
                // if (isAlreadyPre) {
                    version = semver.inc(lastRelease.version, "prerelease", options.versionPreReleaseId);
                // }
                // else {
                //     version += "-pre.0";
                // }
            }
            logger.log(`The next version is ${version}`);
        }
    }
    else {
        if (lastRelease.versionInfo.system === "incremental") {
            version = FIRST_RELEASE_INC;
        }
        else {
            version = FIRST_RELEASE;
        }
        logger.log(`There is no previous release, the next version is ${version}`);
    }

    const lrVersionInfo = lastRelease.versionInfo.info ? [ ...lastRelease.versionInfo.info ] : undefined;

    return {
        version,
        info: lrVersionInfo,
        system: lastRelease.versionInfo.system
     } as IVersionInfo;
}
