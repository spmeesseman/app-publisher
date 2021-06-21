
import * as path from "path";
import { addEdit } from "../repo";
import { pathExists, writeFile } from "../utils/fs";
import { editFile } from "../utils/utils";


export async function setNpmVersion({options, lastRelease, nextRelease, logger, cwd, env})
{
    let modified = false;
    const packageJsonExists = await pathExists("package.json"),
          packageJson = packageJsonExists ? require(path.join(process.cwd(), "package.json")) : undefined,
          packageLockFileExists = packageJsonExists ? await pathExists("package-lock.json") : undefined,
          packageLockJson = packageLockFileExists ? require(path.join(process.cwd(), "package-lock.json")) : undefined;

    if (!packageJsonExists) {
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
    const defaultName = packageJson.name;
    if (defaultName.includes("@") && defaultName.includes("/")) {
        options.npmScope = defaultName.substring(0, defaultName.indexOf("/"));
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
    await editFile({nextRelease, options, logger, cwd, env}, "package.json");
    if (packageLockFileExists) {
        await editFile({nextRelease, options, logger, cwd, env}, "package-lock.json");
    }
}
