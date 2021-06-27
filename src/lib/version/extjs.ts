
import * as path from "path";
import * as json5 from "json5";
import glob from "glob";
import { IContext, IVersionInfo } from "../../interface";
import { addEdit } from "../repo";
import { replaceInFile, pathExists, readFile, writeFile } from "../utils/fs";
import { editFile } from "../utils/utils";


export async function getExtJsFiles({logger, options}: IContext)
{
    return new Promise<string>(async (resolve, reject) =>
    {
        if (options.projectFileExtJs && await pathExists(options.projectFileExtJs)) {
            resolve(options.projectFileExtJs);
            return;
        }

        if (await pathExists("app.json")) {
            resolve("app.json");
            return;
        }

        glob("**/app.json", { nocase: true, ignore: "node_modules/**" }, async (err, files) =>
        {
            if (err) {
                logger.error("app.json");
                reject(err);
            }
            else {
                if (files.length > 1) {
                    logger.warn("Multiple app.json files were found");
                    logger.warn("You can set the specific file via the 'projectFileExtJs' .publishrc property");
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


export async function getExtJsVersion(context: IContext): Promise<IVersionInfo>
{
    let version = "";
    const {logger, cwd} = context,
          file = await getExtJsFiles(context);

    if (file)
    {
        logger.log(`Retrieving version from ${file}`);
        version = (await json5.parse(path.join(cwd, file))).version;
        if (version) { logger.log("   Found version :" + version); }
        else { logger.log("   Not found"); }
    }

    return { version, versionSystem: "semver", versionInfo: undefined };
}


export async function setExtJsVersion(context: IContext)
{
    const {nextRelease, options, logger} = context,
          file = await getExtJsFiles(logger);

    if (file)
    {   //
        // If this is '--task-revert', all we're doing here is collecting the paths of the
        // files that would be updated in a run, don't actually do the update
        //
        if (options.taskRevert) {
            await addEdit(context, file);
            return;
        }

        const appJson = require(path.join(process.cwd(), file)); // ,
              // appJsonDir = path.dirname(file),
              // wsFile = path.join(appJsonDir, "workspace.json"),
              // buildFile = path.join(appJsonDir, "build.xml"),
              // wsFileExists = await pathExists(wsFile),
              // buildFileExists = await pathExists(buildFile);

        // if (buildFileExists && wsFileExists)
        // {

            if (nextRelease.version !== appJson.version)
            {
                logger.log(`Setting version ${nextRelease.version} in ${file}`);
                appJson.version = nextRelease.version;
                appJson.appVersion = nextRelease.version;
                await writeFile(file, json5.stringify(appJson, undefined, 4));
            }
            else {
                logger.warn(`Version ${nextRelease.version} already set in ${file}`);
            }

            //
            // Replace version in defined main mantisbt plugin file
            //
            // await replaceInFile(file, "appVersion\"[ ]*:[ ]*[\"][0-9a-z.\-]+", `appVersion": "${nextRelease.version}`, true);
            // await replaceInFile(file, "version\"[ ]*:[ ]*[\"][0-9a-z.\-]+", `version": "${nextRelease.version}`, true);

            //
            // Allow manual modifications to mantisbt main plugin file and commit to modified list
            //
            await editFile(context, file);
        // }
        // else {
        //     console.warn("Found ExtJs app.json, but no matching workspace or build file found");
        // }
    }
}
