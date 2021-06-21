
import * as semver from "semver";
import { FIRST_RELEASE, FIRST_RELEASE_INC } from "../definitions/constants";

export = getNextVersion;


function getNextVersion({nextRelease: {level}, lastRelease, logger})
{
    let version: string;
    if (lastRelease.version) {
        if (lastRelease.versionInfo.versionSystem === "incremental") {
            version = (parseInt(lastRelease.version) + 1).toString();
        }
        else {
            version = semver.inc(lastRelease.version, level);
        }
        logger.log(`The next version is ${version}`);
    }
    else {
        if (lastRelease.versionInfo.versionSystem === "incremental") {
            version = FIRST_RELEASE_INC;
        }
        else {
            version = FIRST_RELEASE;
        }
        logger.log(`There is no previous release, the next version is ${version}`);
    }

    const lrVersionInfo = lastRelease.versionInfo.versionInfo;

    return { version, versionInfo: {
                    version,
                    versionInfo: lrVersionInfo ? [ ...lrVersionInfo ] : undefined,
                    versionSystem: lastRelease.versionInfo.versionSystem
                }
            };
}
