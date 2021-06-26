
import glob from "glob";
import * as path from "path";
import { IContext } from "../../interface";
import { addEdit } from "../repo";
import { pathExists, readFile, writeFile } from "../utils/fs";
import { editFile } from "../utils/utils";


async function getNpmFiles(logger: any)
{
    return new Promise<string[]>((resolve, reject) => {
        glob("**/package.json", { nocase: true, ignore: "node_modules/**" }, (err, files) =>
        {
            if (err) {
                logger.error("package.json");
                reject(err);
            }
            else {
                resolve(files);
            }
        });
    });
}


export async function getNpmVersion({cwd, logger}: IContext)
{
    logger.log("Retrieving npm version package.json");

    let version = "";
    const fileNames = await getNpmFiles(logger);

    if (fileNames && fileNames.length >= 1)
    {
        version = require(path.join(cwd, fileNames[0])).version;

        if (fileNames.length > 1) {
            logger.warning("Multiple package.json files were found");
            logger.warning("You can set the specific file via the 'npmProjectFile' .publishrc property");
            logger.warning("Using : " + fileNames[0]);
        }
    }
    else {
        logger.error("The current version cannot be determined");
    }

    return { version, versionSystem: "semver", versionInfo: undefined };
}


export async function setNpmVersion(context: IContext)
{
    let modified = false;
    const {options, nextRelease, logger} = context,
          fileNames = await getNpmFiles(logger);

    if (fileNames && fileNames.length >= 1)
    {
        const packageJson = require(path.join(process.cwd(), fileNames[0])),
              packageJsonDir = path.dirname(fileNames[0]),
              packageLockFile = path.join(packageJsonDir, "package-lock.json"),
              packageLockFileExists = await pathExists(packageLockFile),
              packageLockJson = packageLockFileExists ? require(path.join(process.cwd(), packageLockFile)) : undefined;
        //
        // If this is '--task-revert', all we're doing here is collecting the paths of the
        // files that would be updated in a run
        //
        if (options.taskRevert) {
            await addEdit(context, fileNames[0]);
            if (packageLockFileExists) {
                await addEdit(context, packageLockFile);
            }
            return;
        }

        if (fileNames.length > 1) {
            logger.warning("Multiple app.json files were found");
            logger.warning("Using : " + fileNames[0]);
        }

        if (nextRelease.version !== packageJson.version)
        {
            logger.log(`Setting version ${nextRelease.version} in ${fileNames[0]}`);
            packageJson.version = nextRelease.version;
            if (packageLockJson) {
                packageLockJson.version = nextRelease.version;
            }
            modified = true;
        }
        else {
            logger.warn(`Version ${nextRelease.version} already set in ${fileNames[0]}`);
        }

        //
        // Scope/name - package.json
        //
        if (!options.npmScope) {
            const defaultName = packageJson.name;
            if (defaultName.includes("@") && defaultName.includes("/")) {
                options.npmScope = defaultName.substring(0, defaultName.indexOf("/"));
            }
        }

        if (modified) {
            await writeFile(fileNames[0], JSON.stringify(packageJson, undefined, 4));
            if (packageLockFileExists)
            {
                await writeFile(packageLockFile, JSON.stringify(packageLockJson, undefined, 4));
            }
        }

        //
        // Allow manual modifications to package.json and package-lock.json
        //
        await editFile(context, fileNames[0]);
        if (packageLockFileExists) {
            await editFile(context, packageLockFile);
        }
    }
}
