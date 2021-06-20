
import glob = require("glob");
import { relative } from "path";
import { replaceInFile, editFile, pathExists } from "../utils/fs";


async function getFiles(logger: any)
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


export async function setAppPublisherVersion({nextRelease, options, logger, cwd})
{
    let files: string[] = [];
    if (options.version)
    {
        files = await getFiles(logger);
        if (!files || files.length === 0) {
            return files;
        }
        for (const file of files)
        {
            if (await pathExists(file))
            {
                logger.log(`Setting version ${nextRelease.version} in ` + relative(cwd, file));
                // const publishrcJson = require(path.join(process.cwd(), file));
                // if (publishrcJson.version)
                // {
                    // publishrcJson.version = nextRelease.version;
                    // await writeFile("package.json", JSON.stringify(publishrcJson, undefined, 4));
                    await replaceInFile(file, `version"[ ]*:[ ]*["][0-9a-z.\-]+`, `version": "${nextRelease.version}`);
                    //
                    // Allow manual modifications to mantisbt main plugin file and commit to modified list
                    //
                    await editFile({options}, file);
                // }
            }
        }
    }
    return files;
}
