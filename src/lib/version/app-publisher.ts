
import glob = require("glob");
import semver from "semver";
import { options } from "marked";
import { relative } from "path";
import { IContext, IVersionInfo } from "../../interface";
import { addEdit, isIgnored } from "../repo";
import { replaceInFile, pathExists } from "../utils/fs";
import { editFile } from "../utils/utils";


async function getFiles(logger: any)
{
    return new Promise<string[]>((resolve, reject) =>
    {
        glob("**/.publishrc*", { nocase: true, ignore: "node_modules/**" }, (err, files) =>
        {
            if (err) {
                logger.error("Error tring to find publishrc files");
                throw err;
            }
            else {
                resolve(files);
            }
        });
    });
}


export function getAppPublisherVersion({options, logger}: IContext): IVersionInfo
{
    let versionSystem: string;
    const version = options.projectVersion;

    if (version)
    {
        logger.log("Retrieving version from .publishrc");

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

        if (version) { logger.log("   Found version      : " + version); }
        else { logger.warn("   Not found"); }
    }

    return { version, system: versionSystem, info: undefined };
}


export async function setAppPublisherVersion(context: IContext)
{
    let files: string[] = [];
    const {nextRelease, options, logger, cwd, env} = context;

    if (!options.projectVersion) {
        return;
    }

    files = await getFiles(logger);
    if (!files || files.length === 0) {
        return files;
    }
    for (const file of files)
    {
        if (await pathExists(file) && !(await isIgnored({options, logger, cwd, env} as IContext, file)))
        {
            const rFile = relative(cwd, file);
            //
            // If this is '--task-revert', all we're doing here is collecting the paths of the
            // files that would be updated in a run, don't actually do the update
            //
            if (options.taskRevert) {
                await addEdit({options, logger, nextRelease, cwd, env} as IContext, rFile);
                continue;
            }

            logger.log(`Setting version ${nextRelease.version} in ` + rFile);
            // const publishrcJson = require(path.join(process.cwd(), file));
            // if (publishrcJson.projectVersion)
            // {
                // publishrcJson.projectVersion = nextRelease.version;
                // await writeFile(file, JSON.stringify(publishrcJson, undefined, 4));
                await replaceInFile(file, "\"projectVersion\"[ ]*:[ ]*[\"][0-9a-z.\-]+", `"projectVersion": "${nextRelease.version}`);
                //
                // Allow manual modifications to mantisbt main plugin file and commit to modified list
                //
                await editFile({nextRelease, options, logger, cwd, env}, file);
            // }
        }
    }

    return files;
}
