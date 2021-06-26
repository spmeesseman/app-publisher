
import { IContext } from "../../interface";
import { addEdit } from "../repo";
import { replaceInFile, pathExists } from "../utils/fs";
import { editFile } from "../utils/utils";
import { getIncrementalVersion } from "./incremental";


export async function getMakefileVersion(context: IContext): Promise<{ version: string; versionSystem: string; versionInfo: any }>
{
    return getIncrementalVersion(context);
}


export async function setMakefileVersion(context: IContext)
{
    const {nextRelease, options, logger, cwd, env} = context;

    if (options.cProjectRcFile && await pathExists(options.cProjectRcFile))
    {   //
        // If this is '--task-revert', all we're doing here is collecting the paths of the
        // files that would be updated in a run, don't actually do the update
        //
        if (options.taskRevert) {
            await addEdit(context, options.cProjectRcFile);
            return;
        }
        let i = 0;
        let rcVersion = "";
        if (!nextRelease.version.includes(".")) //  versionsystem "incremental"
        {
            for (i = 0; i < nextRelease.version.length; i++) {
                if ((i === 0 && nextRelease.version.length > 3) || i === nextRelease.version.length - 1) {
                    rcVersion = `${rcVersion}${nextRelease.version[i]}`;
                }
                else {
                    rcVersion = `${rcVersion}${nextRelease.version[i]}, `;
                }
            }
            rcVersion = rcVersion + ", 0";
        }
        else { //  versionsystem "semver"
            rcVersion = nextRelease.version.replace(".", ", ") + ", 0";
        }
        //
        // Replace version in defined rc file
        //
        // FILEVERSION 8,7,3,0
        // PRODUCTVERSION 7,0,0,0
        //
        // VALUE "FileVersion", "8, 7, 3, 0"
        // VALUE "FileVersion", "10,4,1,0"
        // VALUE "ProductVersion", "7, 0, 0, 0"
        //
        await replaceInFile(options.cProjectRcFile, "FileVersion[ ]*[\"][ ]*,[ ]*[\"][ ][0-9, ]+[ ]*[\"]", `FileVersion", "${rcVersion}"`);
        await replaceInFile(options.cProjectRcFile, "ProductVersion[ ]*[\"][ ]*,[ ]*[\"][ ]*[0-9, ]+[ ]*[\"]", `ProductVersion", "${rcVersion}"`);
        //
        // Allow manual modifications to mantisbt main plugin file and commit to modified list
        //
        await editFile({options, logger, nextRelease, cwd, env}, options.cProjectRcFile);
    }
}
