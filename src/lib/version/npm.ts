
import * as path from "path";
import { IContext } from "../../interface";
import { addEdit } from "../repo";
import { pathExists, writeFile } from "../utils/fs";
import { editFile } from "../utils/utils";


export async function setNpmVersion(context: IContext)
{
    let modified = false;
    const {options, nextRelease, logger, cwd, env} = context,
          packageJsonExists = await pathExists("package.json"),
          packageJson = packageJsonExists ? require(path.join(process.cwd(), "package.json")) : undefined,
          packageLockFileExists = packageJsonExists ? await pathExists("package-lock.json") : undefined,
          packageLockJson = packageLockFileExists ? require(path.join(process.cwd(), "package-lock.json")) : undefined;

    if (!packageJsonExists) {
        return;
    }

    //
    // If this is '--task-revert', all we're doing here is collecting the paths of the
    // files that would be updated in a run
    //
    if (options.taskRevert) {
        await addEdit(context, "package.json");
        if (packageLockFileExists) {
            await addEdit(context, "package-lock.json");
        }
        return;
    }

    if (nextRelease.version !== packageJson.version)
    {
        logger.log(`Setting version ${nextRelease.version} in package.json`);
        packageJson.version = nextRelease.version;
        if (packageLockJson) {
            packageLockJson.version = nextRelease.version;
        }
        modified = true;
    }
    else {
        logger.warn(`Version ${nextRelease.version} already set in package.json`);
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
        await writeFile("package.json", JSON.stringify(packageJson, undefined, 4));
        if (packageLockFileExists)
        {
            await writeFile("package-lock.json", JSON.stringify(packageLockJson, undefined, 4));
        }
    }

    //
    // Allow manual modifications to package.json and package-lock.json
    //
    await editFile(context, "package.json");
    if (packageLockFileExists) {
        await editFile(context, "package-lock.json");
    }
}
