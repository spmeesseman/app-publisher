
import { replaceInFile, editFile, pathExists } from "../utils/fs";


export async function getExtJsVersion({logger, options}): Promise<{ version: string, versionSystem: string, versionInfo: any }>
{
    throw new Error("Method not implemented");
}


export async function setExtJsVersion({nextRelease, options})
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
        await editFile({options}, options.mantisBtPlugin);
    }
}
