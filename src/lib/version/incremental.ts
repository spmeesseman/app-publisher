
import semver from "semver";
import { getVersion } from "../changelog-file";
import { replaceInFile, pathExists, editFile } from "../utils/fs";


async function getChangelogFile(options: any)
{
    if (options.historyFile && await pathExists(options.historyFile)) {
        return options.historyFile;
    }
    else if (options.changelogFile && await pathExists(options.changelogFile)) {
        return options.changelogFile;
    }
}


export async function getIncrementalVersion({logger, options}): Promise<{ version: string, versionSystem: string, versionInfo: any }>
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


export async function setIncrementalersion({nextRelease, options})
{
    if (nextRelease.versionInfo.length === 2 && await pathExists("pom.xml"))
    {
        const clFile = await getChangelogFile(options);
        await replaceInFile(clFile, `${options.versionText}[ ]+[0-9a-z.\-]+[ ]*$`, `${options.versionText} ${nextRelease.version}`);
        //
        // Allow manual modifications to mantisbt main plugin file and commit to modified list
        //
        await editFile({options}, clFile, false, (options.skipVersionEdits === " Y" || options.taskTouchVersions));
    }
}
