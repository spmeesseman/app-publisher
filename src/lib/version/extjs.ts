
import { replaceInFile, pathExists } from "../utils/fs";
import { editFile } from "../utils/utils";


export async function getExtJsVersion({logger, options}): Promise<{ version: string, versionSystem: string, versionInfo: any }>
{
    throw new Error("Method not implemented");
}


export async function setExtJsVersion({options, logger, nextRelease, cwd, env})
{
    if (options.mantisBtPlugin && await pathExists("app.json"))
    {   //
        // Replace version in defined main mantisbt plugin file
        //
        await replaceInFile(options.mantisBtPlugin, `appVersion"[ ]*:[ ]*["][0-9a-z.\-]+`, `appVersion": "${nextRelease.version}`, true);
        await replaceInFile(options.mantisBtPlugin, `version"[ ]*:[ ]*["][0-9a-z.\-]+`, `version": "${nextRelease.version}`, true);
        //
        // Allow manual modifications to mantisbt main plugin file and commit to modified list
        //
        await editFile({options, logger, nextRelease, cwd, env}, options.mantisBtPlugin);
    }
}
