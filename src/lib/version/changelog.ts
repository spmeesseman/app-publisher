
import semver from "semver";
import { IContext, IVersionInfo } from "../../interface";


export async function getChangelogVersion(context: IContext): Promise<IVersionInfo>
{
    let versionSystem: "auto" | "semver" | "incremental";
    const version = await context.changelog.getVersion(context);

    if (!version)
    {
        versionSystem = "semver";
    }
    else if (semver.valid(semver.clean(version)))
    {
        versionSystem = "semver";
    }
    else {
        versionSystem = "incremental";
    }

    return { version, system: versionSystem, info: undefined };
}
