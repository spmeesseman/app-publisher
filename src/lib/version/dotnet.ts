
import glob = require("glob");
import { IContext, IVersionInfo } from "../../interface";
import { addEdit } from "../repo";
import { replaceInFile, readFile } from "../utils/fs";
import { editFile } from "../utils/utils";


async function getDotNetFile(projectName: string, logger)
{
    return new Promise<any>((resolve, reject) => {
        glob("**/assemblyinfo.cs", { nocase: true, ignore: "node_modules/**" }, async (err, files) =>
        {
            if (err) {
                logger.error("Error tring to find assemblyinfo.cs files");
                reject(err);
            }
            else {
                for (const f of files)
                {
                    const fileContent = await readFile(f);
                    if (fileContent.indexOf(projectName) !== -1)
                    {
                        if (files.length > 1) {
                            logger.warn("Multiple assemblyinfo.cs files were found");
                            logger.warn("You can set the specific file via the 'npmProjectFile' .publishrc property");
                            logger.warn("Using : " + f);
                        }
                        resolve({
                            path: f,
                            content: fileContent
                        });
                        return;
                    }
                }
                resolve(undefined);
            }
        });
    });
}


export async function getDotNetVersion({logger, options}: IContext): Promise<IVersionInfo>
{
    let version = "";
    const fileInfo = await getDotNetFile(options.projectName, logger);

    if (fileInfo && fileInfo.path)
    {
        logger.log(`Retrieving version from ${fileInfo.path}`);

        const regexp = new RegExp("AssemblyVersion[ ]*[(][ ]*[\"][0-9]+[.]{1}[0-9]+[.]{1}[0-9]+", "gm"),
            found = fileInfo.content.match(regexp);

        if (found)
        {
            version = found[0].replace("AssemblyVersion", "");
            version = version.replace(" ", "");
            version = version.replace("(", "");
            version = version.replace("\"", "");
            // version = version.substring(0, version.lastIndexOf(".")); // Rid build number
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
          fileInfo = await getDotNetFile(options.projectName, logger);

    if (fileInfo && fileInfo.path)
    {   //
        // If this is '--task-revert', all we're doing here is collecting the paths of the
        // files that would be updated in a run, don't actually do the update
        //
        if (options.taskRevert) {
            await addEdit(context, fileInfo.path);
            return;
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
        await replaceInFile(fileInfo.path, "AssemblyVersion[ ]*[\\(][ ]*[\"][0-9a-z.]+", `AssemblyVersion("${semVersion}.0`);
        await replaceInFile(fileInfo.path, "AssemblyFileVersion[ ]*[\\(][ ]*[\"][0-9a-z.]+", `AssemblyFileVersion("${semVersion}.0`);
        //
        // Allow manual modifications to mantisbt main plugin file and commit to modified list
        //
        await editFile({options, logger, nextRelease, cwd, env}, fileInfo.path);
        //
        // Return the filename
        //
        // return fileInfo.path;
    }
}
