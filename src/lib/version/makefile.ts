
import { replaceInFile, pathExists } from "../utils/fs";
import { editFile } from "../utils/utils";


export async function getMakefileVersion({logger, options}): Promise<{ version: string, versionSystem: string, versionInfo: any }>
{
    throw new Error("Method not implemented");
}


export async function setMakefileVersion({nextRelease, options, logger, cwd, env})
{
    if (options.mantisBtPlugin && await pathExists("app.json"))
    {
        if (options.cProjectRcFile && await pathExists(options.cProjectRcFile))
        {
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
                rcVersion = nextRelease.version.Replace(".", ", ") + ", 0";
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
            await replaceInFile(options.cProjectRcFile, `FileVersion[ ]*["][ ]*,[ ]*["][ ][0-9, ]+[ ]*["]`, `FileVersion", "${rcVersion}"`);
            await replaceInFile(options.cProjectRcFile, `ProductVersion[ ]*["][ ]*,[ ]*["][ ]*[0-9, ]+[ ]*["]`, `ProductVersion", "${rcVersion}"`);
            //
            // Allow manual modifications to mantisbt main plugin file and commit to modified list
            //
            await editFile({options, logger, nextRelease, cwd, env}, options.cProjectRcFile);
        }
    }
}
