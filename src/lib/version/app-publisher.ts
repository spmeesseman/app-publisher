
import glob = require("glob");
import { replaceInFile, editFile, pathExists } from "../utils/fs";


async function getFile(logger: any)
{
    return new Promise<string[]>((resolve, reject) =>
    {
        glob("**/.publishrc*", { nocase: true }, (err, files) =>
        {
            if (err) {
                logger.error("Error tring to find publishrc files");
                throw err;
            }
            else {
                resolve(files);
            }
        });
    });
}


export async function setAppPublisherVersion({nextRelease, options, logger})
{
    let fileName: string;
    if (options.version)
    {
        const files = await getFile(logger);
        if (!files || files.length === 0) {
            return;
        }
        fileName = files[0];
        if (await pathExists(fileName))
        {
            logger.log("Setting version in .publishrc");
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
    return fileName;
}
