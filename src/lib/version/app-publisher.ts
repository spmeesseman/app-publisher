
import * as path from "path";
import glob = require("glob");
import { existsSync } from "fs";
import { replaceInFile, readFile, editFile, writeFile } from "../utils/fs";


function getFile(logger: any)
{
    let fileNames: string[];
    glob("**/.publishrc*", { nocase: true }, (err, files) =>
    {
        if (err) {
            logger.error("Error tring to find assemblyinfo.cs files");
            throw err;
        } else {
            fileNames = files;
        }
    });
    return fileNames[0] || ".publishrc.json";
}


export async function getAppPublisherVersion({cwd, logger}): Promise<{ version: string, versionSystem: string, versionInfo: any }>
{
    let version = "";
    const fileName = getFile(logger);

    logger.log("Retrieving MantisBT plugin version from $MANTISBTPLUGIN");

    const fileContent = await readFile(fileName),
          regexp = new RegExp("version\"[ ]*:[ ]*\"[0-9]+[.]{0,1}[0-9]+[.]{0,1}[0-9]+[.]{0,1}[0-9]{0,}", "g"),
          found = fileContent.match(regexp);
    if (found)
    {
            version = found[0].replace("version", "");
            version = version.replace(":", "");
            version = version.replace(" ", "");
            version = version.replace("\"", "");
    }

    return { version, versionSystem: "semver", versionInfo: undefined };
}


export async function setAppPublisherVersion({nextRelease, options, logger})
{
    const fileName = getFile(logger);
    if (options.version && existsSync(fileName))
    {
        // const publishrcJson = require(path.join(process.cwd(), ".publishrc.json"));
        // if (publishrcJson.version)
        // {
            // publishrcJson.version = nextRelease.version;
            // await writeFile("package.json", JSON.stringify(publishrcJson, undefined, 4));
            await replaceInFile(".publishrc.json", `version"[ ]*:[ ]*["][0-9a-z.\-]+`, `version": "${nextRelease.version}`);
            //
            // Allow manual modifications to mantisbt main plugin file and commit to modified list
            //
            await editFile({options}, ".publishrc.json");
        // }
    }
}
