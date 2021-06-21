
import glob = require("glob");
import { replaceInFile, readFile } from "../utils/fs";
import { editFile } from "../utils/utils";


export async function getDotNetFiles(logger)
{
    return new Promise<string[]>((resolve, reject) => {
        glob("**/assemblyinfo.cs", { nocase: true }, (err, files) =>
        {
            if (err) {
                logger.error("Error tring to find assemblyinfo.cs files");
                reject(err);
            } else {
                resolve(files);
            }
        });
    });
}


export async function getDotNetVersion({logger}): Promise<{ version: string, versionSystem: string, versionInfo: any }>
{
    logger.log("Retrieving assemblyinfo version AssemblyInfo.cs");

    let version = "";
    const fileNames = await getDotNetFiles(logger);

    if (fileNames && fileNames.length === 1)
    {
        const fileContent = await readFile(fileNames[0]),
            regexp = new RegExp("AssemblyVersion[ ]*[(][ ]*[\"][0-9]+[.]{1}[0-9]+[.]{1}[0-9]+", "gm"),
            found = fileContent.match(regexp);
        if (found)
        {
            version = found[0].replace("AssemblyVersion", "");
            version = version.replace(" ", "");
            version = version.replace("(", "");
            version = version.replace("\"", "");
            // Rid build number
            version = version.substring(0, version.lastIndexOf("."));
        }
    }
    else if (fileNames && fileNames.length > 0) {
        logger.error("The current version cannot be determined, multiple assemblyinfo files found");
    }
    else {
        logger.error("The current version cannot be determined");
    }

    return { version, versionSystem: ".net", versionInfo: undefined };
}


export async function setDotNetVersion({nextRelease, options, logger, cwd, env})
{
    let semVersion = "";
    const fileNames = await getDotNetFiles(logger);

    if (fileNames)
    {
        if (fileNames.length >= 1)
        {
            if (!nextRelease.version.Contains("."))
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
            await replaceInFile(fileNames[0], `AssemblyVersion[ ]*[\\(][ ]*["][0-9a-z.]+`, `AssemblyVersion("${semVersion}`);
            //
            // Allow manual modifications to mantisbt main plugin file and commit to modified list
            //
            await editFile({options, logger, nextRelease, cwd, env}, fileNames[0]);
            //
            // Return the filename
            //
            return fileNames[0];
        }

        if (fileNames.length > 0) {
            logger.warning("Multiple assemblyinfo files found");
            logger.warning("Using: " + fileNames[0]);
        }
    }
}
