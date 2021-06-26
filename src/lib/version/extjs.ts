
import { IContext } from "../../interface";
import { addEdit } from "../repo";
import { replaceInFile, pathExists } from "../utils/fs";
import { editFile } from "../utils/utils";


export async function getExtJsVersion({logger, options}): Promise<{ version: string, versionSystem: string, versionInfo: any }>
{
    throw new Error("Method not implemented");
}


export async function setExtJsVersion({options, logger, nextRelease, cwd, env})
{
    if (await pathExists("app.json"))
    {   //
        // If this is '--task-revert', all we're doing here is collecting the paths of the
        // files that would be updated in a run, don't actually do the update
        //
        if (options.taskRevert) {
            await addEdit({options, logger, nextRelease, cwd, env} as IContext, "app.json");
            return;
        }
        //
        // Replace version in defined main mantisbt plugin file
        //
        await replaceInFile("app.json", "appVersion\"[ ]*:[ ]*[\"][0-9a-z.\-]+", `appVersion": "${nextRelease.version}`, true);
        await replaceInFile("app.json", "version\"[ ]*:[ ]*[\"][0-9a-z.\-]+", `version": "${nextRelease.version}`, true);
        //
        // Allow manual modifications to mantisbt main plugin file and commit to modified list
        //
        await editFile({options, logger, nextRelease, cwd, env}, "app.json");
    }
}
