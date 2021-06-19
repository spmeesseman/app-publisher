
import * as semver from "semver";
import { FIRST_RELEASE } from "./definitions/constants";

export = getNextVersion;


function getNextVersion({nextRelease: {level}, lastRelease, logger})
{
    let version: string;
    if (lastRelease.version) {
        version = semver.inc(lastRelease.version, level);
        logger.log(`The next release version is ${version}`);
    }
    else {
        version = FIRST_RELEASE;
        logger.log(`There is no previous release, the next release version is ${version}`);
    }

    return { version, versionInfo: undefined };
}
