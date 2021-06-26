
import semver from "semver";
import { getVersion, getProjectChangelogFile } from "../changelog-file";
import { replaceInFile, pathExists } from "../utils/fs";
import { editFile } from "../utils/utils";


export async function getIncrementalVersion({logger, options}): Promise<{ version: string; versionSystem: string; versionInfo: any }>
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


export async function setIncrementalersion({options, logger, nextRelease, cwd, env})
{
    if (nextRelease.versionInfo.length === 2 && await pathExists("pom.xml"))
    {
        const clFile = getProjectChangelogFile(options);
        await replaceInFile(clFile, `${options.versionText}[ ]+[0-9a-z.\-]+[ ]*$`, `${options.versionText} ${nextRelease.version}`);
        //
        // Allow manual modifications to mantisbt main plugin file and commit to modified list
        //
        await editFile({options, logger, nextRelease, cwd, env}, clFile);
    }
}
