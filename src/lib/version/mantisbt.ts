
import { IContext, IVersionInfo } from "../../interface";
import { addEdit } from "../repo";
import { replaceInFile, readFile, pathExists } from "../utils/fs";
import { editFile } from "../utils/utils";


export async function getMantisBtVersion({logger, options}: IContext): Promise<IVersionInfo>
{
    let version = "";

    if (options.mantisbtPlugin && await pathExists(options.mantisbtPlugin))
    {
        logger.log(`Retrieving MantisBT plugin version from ${options.mantisbtPlugin}`);

        const fileContent = await readFile(options.mantisbtPlugin),
                regexp = new RegExp("this->version[ ]*=[ ]*(\"|')[0-9]+[.]{1}[0-9]+[.]{1}[0-9]+", "gm"),
                found = fileContent.match(regexp);
        if (found)
        {
                version = found[0].replace("this->version", "");
                version = version.replace(/['"= ]/g, "");
        }
        if (version) { logger.log("   Found version      : " + version); }
        else { logger.warn("   Not found"); }
    }

    return { version, system: "semver", info: undefined };
}


export async function setMantisBtVersion(context: IContext, recordEditOnly: boolean)
{
    const {options, logger, nextRelease, cwd, env} = context;

    if (!options.mantisbtPlugin) {
        return;
    }

    if (options.mantisbtPlugin && await pathExists(options.mantisbtPlugin))
    {   //
        // If this is '--task-revert', all we're doing here is collecting the paths of the
        // files that would be updated in a run, don't actually do the update
        //
        if (recordEditOnly) {
            await addEdit(context, options.mantisbtPlugin);
            return;
        }
        //
        // Replace version in defined main mantisbt plugin file
        //
        await replaceInFile(options.mantisbtPlugin, "this->version *= *'[0-9a-z.\-]+'", `this->version = '${nextRelease.version}'`);
        await replaceInFile(options.mantisbtPlugin, "this->version *= *\"[0-9a-z.\-]+\"", `this->version = "${nextRelease.version}"`);
        //
        // Allow manual modifications to mantisbt main plugin file and commit to modified list
        //
        await editFile(context, options.mantisbtPlugin);
    }
}
