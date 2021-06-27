
import semver from "semver";
import { IContext } from "../../interface";
import { getVersion } from "../changelog-file";


export async function getChangelogVersion({logger, options}: IContext): Promise<{ version: string; versionSystem: string; versionInfo: any }>
{
    let versionSystem: string;
    const version = await getVersion({logger, options});

    if (!version)
    {
        versionSystem = "manual";
    }
    else if (semver.valid(semver.clean(version)))
    {
        versionSystem = "semver";
    }
    else {
        versionSystem = "incremental";
    }

    return { version, versionSystem, versionInfo: undefined };
}
