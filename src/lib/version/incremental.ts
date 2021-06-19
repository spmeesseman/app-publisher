
export = getIncrementalVersion;

import { getVersion } from "../changelog-file";


async function getIncrementalVersion({logger, options}): Promise<{ version: string, versionSystem: string, versionInfo: any }>
{
    const version = await getVersion({logger, options});
    let versionSystem: string;

    if (!version)
    {
        versionSystem = "manual";
    }
    else if (!version.includes("."))
    {
        versionSystem = "incremental";
    }
    else {
        versionSystem = "semver";
    }
    return { version, versionSystem, versionInfo: undefined };
}
