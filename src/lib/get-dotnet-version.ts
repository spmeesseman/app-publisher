
import { readFileSync } from "fs";
import glob = require("glob");

export = getDotNetVersion;


function getDotNetVersion({logger}): { version: string, versionSystem: string, versionInfo: any }
{
    let version = "",
        fileNames: string[];

    logger.log("Retrieving assemblyinfo version from $AssemblyInfoLocation");

    glob("**/assemblyinfo.cs", { nocase: true }, (err, files) =>
    {
        if (err) {
            logger.error("Error tring to find assemblyinfo.cs files");
            throw err;
        } else {
            fileNames = files;
        }
    });

    if (fileNames && fileNames.length === 1)
    {
        const fileContent = readFileSync(fileNames[0]).toString(),
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
