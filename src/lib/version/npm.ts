
import * as path from "path";
import { pathExists, editFile, writeFile } from "../utils/fs";

export let defaultBugs: string;
export let defaultHomePage: string;
export let defaultName: string;
export let defaultRepo: string;
export let defaultRepoType: string;
export let defaultScope: string;


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
    // A full publish run can modify the npm configs at runtime and have them restored to
    // the defaults when finished.  In task mode, this isn't possible.
    //
    // if (!options.taskTouchVersions)
    // {
        // if (options.repo && options.repo !== packageJson.repository.url)
        // {
        //     logger.log("Setting repository in package.json");
        //     defaultRepo = packageJson.repository.url;
        //     logger.log("Repository: " + defaultRepo);
        //     logger.log("Setting repository in package.json: " + options.repo);
        //     packageJson.repository.url = options.repo;
        //     modified = true;
        // }
        //
        // if (options.repoType && options.repoType !== packageJson.repository.type)
        // {
        //     logger.log("Setting repository type in package.json");
        //     defaultRepoType = packageJson.repository.type;
        //     logger.log("Repository Type: " + defaultRepoType);
        //     logger.log("Setting repository type in package.json: " + options.repoType);
        //     packageJson.repository.type = options.repoType;
        //     modified = true;
        // }
        //
        // if (options.homePage && options.homePage !== packageJson.homepage)
        // {
        //     logger.log("Setting homepage in package.json");
        //     defaultHomePage = packageJson.homepage;
        //     logger.log("Homepage: " + defaultHomePage);
        //     logger.log("Setting homepage in package.json: " + options.homePage);
        //     packageJson.homepage = options.homePage;
        //     modified = true;
        // }
        //
        // if (options.bugs && options.bugs !== packageJson.bugs.url)
        // {
        //     logger.log("Setting bugs page in package.json");
        //     defaultBugs = packageJson.bugs.url;
        //     logger.log("Bugs page: " + defaultBugs);
        //     logger.log("Setting bugs page in package.json: " + options.bugs);
        //     packageJson.bugs.url = options.bugs;
        //     modified = true;
        // }

        //
        // Scope/name - package.json
        //
    // defaultName = packageJson.name;
    // if (defaultName.includes("@") && defaultName.includes("/")) {
    //     defaultScope = defaultName.substring(0, defaultName.indexOf("/"));
    // }
    //
    //     if (options.npmScope)
    //     {
    //         if (!defaultName.includes(options.npmScope))
    //         {
    //             const name = options.npmScope + "/" + options.projectName;
    //             logger.log(`Setting package name in package.json: ${name}`);
    //             packageJson.name = name;
    //             //
    //             // package-lock.json
    //             //
    //             if (packageLockFileExists)
    //             {
    //                 logger.log(`Setting package name in package-lock.json: ${name}`);
    //                 packageLockJson.name = name;
    //             }
    //             modified = true;
    //         }
    //     }
    // }

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
    editFile({options}, "package.json");
    if (packageLockFileExists)
    {
        await editFile({options}, "package-lock.json");
    }
}

//
// export async function restorePackageJson({options, lastRelease, nextRelease, logger, cwd, env})
// {
//     let modified = false;
//     const packageJsonExists = await pathExists("package.json"),
//           packageJson = packageJsonExists ? require(path.join(process.cwd(), "package.json")) : undefined,
//           packageLockFileExists = packageJsonExists ? await pathExists("package-lock.json") : undefined,
//           packageLockJson = packageLockFileExists ? require(path.join(process.cwd(), "package-lock.json")) : undefined;
//
//     if (!packageJsonExists) {
//         return;
//     }
//
//     //
//     // Set repo
//     //
//     if (defaultRepo)
//     {
//         logger.log(`Reset default repo in package.json: ${defaultRepo}`);
//         packageJson.repository.url = options.repo;
//         modified = true;
//     }
//     //
//     // Set repo type
//     //
//     if (defaultRepoType)
//     {
//         logger.log(`Reset default repo in package.json: ${defaultRepoType}`);
//         packageJson.repository.type = defaultRepoType;
//         modified = true;
//     }
//     //
//     // Set bugs
//     //
//     if (defaultBugs)
//     {
//         logger.log(`Reset default bugs page in package.json: ${defaultBugs}`);
//         packageJson.bugs.url = defaultBugs;
//         modified = true;
//     }
//     //
//     // Set homepage
//     //
//     if (defaultHomePage)
//     {
//         logger.log("Reset default home page in package.json: " + defaultHomePage);
//         packageJson.homepage = defaultBugs;
//         modified = true;
//     }
//     //
//     // Scope/name - package.json
//     //
//     if (options.npmScope && !defaultName.includes(options.npmScope))
//     {
//         logger.log("Reset default package name in package.json: " + defaultName);
//         packageJson.name = defaultName;
//         modified = true;
//         //
//         // package-lock.json
//         //
//         if (packageLockFileExists)
//         {
//             logger.log("Reset default package name in package-lock.json: " + defaultName);
//             packageLockJson.name = defaultName;
//         }
//         modified = true;
//     }
//
//     if (modified) {
//         await writeFile("package.json", JSON.stringify(packageJson, undefined, 4));
//         if (packageLockFileExists)
//         {
//             await writeFile("package-lock.json", JSON.stringify(packageLockJson, undefined, 4));
//         }
//     }
// }
//