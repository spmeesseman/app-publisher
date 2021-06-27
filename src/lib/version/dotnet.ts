
import { join } from "path";
import glob = require("glob");
import { IContext, IVersionInfo } from "../../interface";
import { addEdit } from "../repo";
import { replaceInFile, readFile, pathExists } from "../utils/fs";
import { editFile } from "../utils/utils";


async function getDotNetFile({options, logger}: IContext)
{
    return new Promise<string>(async (resolve, reject) =>
    {
        if (options.projectFileDotNet && await pathExists(options.projectFileDotNet)) {
            resolve(options.projectFileDotNet);
            return;
        }

        if (await pathExists("assemblyinfo.cs")) {
            resolve("assemblyinfo.cs");
            return;
        }

        if (await pathExists(join("properties", "assemblyinfo.cs"))) {
            resolve(join("properties", "assemblyinfo.cs"));
            return;
        }

        glob("**/assemblyinfo.cs", { nocase: true, ignore: "node_modules/**" }, async (err, files) =>
        {
            if (err) {
                logger.error("Error tring to find assemblyinfo.cs files");
                reject(err);
            }
            else {
                if (files.length > 1) {
                    logger.warn("Multiple assemblyinfo.cs files were found");
                    logger.warn("You can set the specific file via the 'projectFileDotNet' .publishrc property");
                }
                for (const f of files)
                {
                    const fileContent = await readFile(f);
                    if (fileContent.indexOf(options.projectName) !== -1)
                    {
                        if (files.length > 1) {
                            logger.warn("Using : " + f);
                        }
                        resolve(f);
                        return;
                    }
                }
                resolve(undefined);
            }
        });
    });
}


export async function getDotNetVersion(context: IContext): Promise<IVersionInfo>
{
    let version = "";
    const file = await getDotNetFile(context);
    const {logger, options} = context;

    if (file)
    {
        logger.log(`Retrieving version from ${file}`);

        const regexp = new RegExp("AssemblyVersion[ ]*[(][ ]*[\"][0-9]+[.]{1}[0-9]+[.]{1}[0-9]+", "gm"),
              content = await readFile(file),
              found = content.match(regexp);

        if (found)
        {
            version = found[0].replace("AssemblyVersion", "");
            version = version.replace(" ", "");
            version = version.replace("(", "");
            version = version.replace("\"", "");
            // version = version.substring(0, version.lastIndexOf(".")); // Rid build number
        }
        if (version) { logger.log("   Found version    : " + version); }
        else { logger.warn("   Not found"); }
    }

    return { version, versionSystem: ".net", versionInfo: undefined };
}


export async function setDotNetVersion(context: IContext)
{
    let semVersion = "";
    const {lastRelease, nextRelease, options, logger, cwd, env} = context,
          file = await getDotNetFile(context);

    if (file)
    {   //
        // If this is '--task-revert', all we're doing here is collecting the paths of the
        // files that would be updated in a run, don't actually do the update
        //
        if (options.taskRevert) {
            await addEdit(context, file);
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
        await replaceInFile(file, "AssemblyVersion[ ]*[\\(][ ]*[\"][0-9a-z.]+", `AssemblyVersion("${semVersion}.0`);
        await replaceInFile(file, "AssemblyFileVersion[ ]*[\\(][ ]*[\"][0-9a-z.]+", `AssemblyFileVersion("${semVersion}.0`);
        //
        // Allow manual modifications to mantisbt main plugin file and commit to modified list
        //
        await editFile({options, logger, nextRelease, cwd, env}, file);
        //
        // Return the filename
        //
        // return file;
    }
}
