
import * as path from "path";
import * as json5 from "json5";
import glob from "glob";
import { IContext, IVersionInfo } from "../../interface";
import { addEdit } from "../repo";
import { replaceInFile, pathExists, readFile, writeFile } from "../utils/fs";
import { editFile } from "../utils/utils";


export async function getExtJsFiles({logger, options, cwd}: IContext)
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

        glob("**/app.json", { nocase: true, ignore: "node_modules/**", cwd }, async (err, files) =>
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
                    const fileContent = await readFile(f); // ,
                    // appJsonDir = path.dirname(file),
                    // wsFile = path.join(appJsonDir, "workspace.json"),
                    // buildFile = path.join(appJsonDir, "build.xml"),
                    // wsFileExists = await pathExists(wsFile),
                    // buildFileExists = await pathExists(buildFile);
                    // if (buildFileExists && wsFileExists) {
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
        version = json5.parse(await readFile(path.join(cwd, file))).version;
        if (version) {
            logger.log("   Found version      : " + version);
            //
            // Sencha Cmd doesnt support a dash in the filename, development builds succeed but production
            // builds fail with the error in page-impl.xml (e.g. for a version named 2.0.2-pre.0):
            //
            //     java.lang.NumberFormatException: For input string: "2-"
            //
            // So, we always write a pre-release version of x.y.z-tag.0 as x.y.z.tag.0 to app.json
            // Check if we need to convery bac to a valid pre-release id
            //
            let match: RegExpExecArray;
            const regex = /^[0-9]+\.[0-9]+\.[0-9]+(\.[a-z]+\.[0-9]+)$/gi;
            if ((match = regex.exec(version)) !== null) {
                version = version.replace(match[1], "-" + match[1].substring(1));
                logger.log("   This is formatted pre-release version used because of Sencha Cmd");
                logger.log(`   Converted formatted pre-release version back to ${version}`);
            }
        }
        else { logger.warn("   Not found"); }
    }

    return { version, system: "semver", info: undefined };
}


export async function setExtJsVersion(context: IContext)
{
    const {nextRelease, options, logger, cwd} = context,
          file = await getExtJsFiles(context);

    if (file)
    {   //
        // If this is '--task-revert', all we're doing here is collecting the paths of the
        // files that would be updated in a run, don't actually do the update
        //
        if (options.taskRevert) {
            await addEdit(context, file);
            return;
        }

        const appJson = json5.parse(await readFile(path.join(cwd, file)));
        if (nextRelease.version !== appJson.version || nextRelease.version !== appJson.appVersion)
        {
            let version = nextRelease.version;
            logger.log(`Setting version ${version} in ${file}`);
            //
            // Sencha Cmd doesnt support a dash in the filename, development builds succeed but production
            // builds fail with the error in page-impl.xml (e.g. for a version named 2.0.2-pre.0):
            //
            //     java.lang.NumberFormatException: For input string: "2-"
            //
            if (version.indexOf("-") !== -1) {
                version = version.replace(/\-/g, ".");
                logger.log("   Sencha Cmd does not support the '-' character in a version number");
                logger.log(`   Converted pre-release version to ${version} for Cmd build`);
            }
            await replaceInFile(file, "appVersion\"[ ]*:[ ]*[\"][0-9a-z.\-]+", `appVersion": "${version}`, true);
            logger.log(`   Set version        : ${version}`);
            await replaceInFile(file, "version\"[ ]*:[ ]*[\"][0-9a-z.\-]+", `version": "${version}`, true);
            logger.log(`   Set app version    : ${version}`);
        }
        else {
            logger.warn(`Version ${nextRelease.version} already set in ${file}`);
        }

        //
        // Allow manual modifications to mantisbt main plugin file and commit to modified list
        //
        await editFile(context, file);
    }
}
