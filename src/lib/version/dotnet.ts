
import glob = require("glob");
import { IContext } from "../../interface";
import { addEdit } from "../repo";
import { replaceInFile, readFile } from "../utils/fs";
import { editFile } from "../utils/utils";


async function getDotNetFiles(logger)
{
    return new Promise<string[]>((resolve, reject) => {
        glob("**/assemblyinfo.cs", { nocase: true, ignore: "node_modules/**" }, (err, files) =>
        {
            if (err) {
                logger.error("Error tring to find assemblyinfo.cs files");
                reject(err);
            }
            else {
                resolve(files);
            }
        });
    });
}


export async function getDotNetVersion({logger}: IContext): Promise<{ version: string, versionSystem: string, versionInfo: any }>
{
    let version = "";
    const fileNames = await getDotNetFiles(logger);

    if (fileNames && fileNames.length >= 1)
    {
        logger.log(`Retrieving version from ${fileNames[0]}`);

        const fileContent = await readFile(fileNames[0]),
            regexp = new RegExp("AssemblyVersion[ ]*[(][ ]*[\"][0-9]+[.]{1}[0-9]+[.]{1}[0-9]+", "gm"),
            found = fileContent.match(regexp);
        if (found)
        {
            version = found[0].replace("AssemblyVersion", "");
            version = version.replace(" ", "");
            version = version.replace("(", "");
            version = version.replace("\"", "");
            // version = version.substring(0, version.lastIndexOf(".")); // Rid build number
            if (fileNames.length > 1) {
                logger.warn("Multiple assemblyinfo.cs files were found");
                logger.warn("You can set the specific file via the 'npmProjectFile' .publishrc property");
                logger.warn("Using : " + fileNames[0]);
            }
        }
        if (version) { logger.log("   Found version :" + version); }
        else { logger.log("   Not found"); }
    }

    return { version, versionSystem: ".net", versionInfo: undefined };
}


export async function setDotNetVersion(context: IContext)
{
    let semVersion = "";
    const {lastRelease, nextRelease, options, logger, cwd, env} = context,
          fileNames = await getDotNetFiles(logger);

    if (fileNames && fileNames.length >= 1)
    {   //
        // If this is '--task-revert', all we're doing here is collecting the paths of the
        // files that would be updated in a run, don't actually do the update
        //
        if (options.taskRevert) {
            await addEdit(context, fileNames[0]);
            return;
        }

        if (fileNames.length > 1) {
            logger.warn("Multiple assemblyinfo files were found");
            logger.warn("You can set the specific file via the 'dotnetProjectFile' .publishrc property");
            logger.warn("Using : " + fileNames[0]);
        }

        if (lastRelease.versionInfo.versionSystem === "incremental" || !nextRelease.version.includes("."))
        {
            for (const c of nextRelease.version) {
                semVersion = `${semVersion}${c}.`;
            }
            semVersion = semVersion.substring(0, semVersion.length - 1);
        }
        else {
            semVersion = nextRelease.version;
        }
        //
        // Replace version in assemblyinfo file
        //
        await replaceInFile(fileNames[0], "AssemblyVersion[ ]*[\\(][ ]*[\"][0-9a-z.]+", `AssemblyVersion("${semVersion}.0`);
        await replaceInFile(fileNames[0], "AssemblyFileVersion[ ]*[\\(][ ]*[\"][0-9a-z.]+", `AssemblyFileVersion("${semVersion}.0`);
        //
        // Allow manual modifications to mantisbt main plugin file and commit to modified list
        //
        await editFile({options, logger, nextRelease, cwd, env}, fileNames[0]);
        //
        // Return the filename
        //
        // return fileNames[0];
    }
}
