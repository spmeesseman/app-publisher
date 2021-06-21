
import { replaceInFile, readFile, pathExists } from "../utils/fs";
import { editFile } from "../utils/utils";


export async function getMantisBtVersion({logger, options}): Promise<{ version: string, versionSystem: string, versionInfo: any }>
{
    let version = "";
    logger.log("Retrieving MantisBT plugin version from $MANTISBTPLUGIN");

    const fileContent = await readFile(options.mantisBtPlugin),
            regexp = new RegExp("this->version[ ]*=[ ]*(\"|')[0-9]+[.]{1}[0-9]+[.]{1}[0-9]+", "gm"),
            found = fileContent.match(regexp);
    if (found)
    {
            version = found[0].replace("this->version", "");
            version = version.replace(" ", "");
            version = version.replace("=", "");
            version = version.replace("\"", "");
            version = version.replace("'", "");
    }

    return { version, versionSystem: "semver", versionInfo: undefined };
}


export async function setMantisBtVersion({options, logger, nextRelease, cwd, env})
{
    if (options.mantisBtPlugin && await pathExists(options.mantisBtPlugin))
    {   //
        // Replace version in defined main mantisbt plugin file
        //
        await replaceInFile(options.mantisBtPlugin, `this->version[ ]*[=][ ]*['"][0-9a-z.\-]+`, `this->version = '${nextRelease.version}`);
        //
        // Allow manual modifications to mantisbt main plugin file and commit to modified list
        //
        await editFile({options, logger, nextRelease, cwd, env}, options.mantisBtPlugin);
    }
}
