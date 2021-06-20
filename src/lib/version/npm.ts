
import * as path from "path";
import { pathExists, editFile, writeFile } from "../utils/fs";

export let defaultBugs: string;
export let defaultHomePage: string;
export let defaultName: string;
export let defaultRepo: string;
export let defaultRepoType: string;
export let defaultScope: string;


export async function setPackageJson({options, lastRelease, nextRelease, logger, cwd, env})
{
    let modified = false;
    const packageJsonExists = await pathExists("package.json"),
          packageJson = packageJsonExists ? require(path.join(process.cwd(), "package.json")) : undefined,
          packageLockFileExists = packageJsonExists ? await pathExists("package-lock.json") : undefined,
          packageLockJson = packageLockFileExists ? require(path.join(process.cwd(), "package-lock.json")) : undefined;

    if (!packageJsonExists) {
        return;
    }

    //
    // Replace current version with new version in package.json and package-lock.json
    // 5/25/19 - Use regext text replacement after npm version command, sencha packages will contain
    // two version tags, on for the main package.json field, and one in the sencha object definition, we
    // want to replace them both if they match
    //
    logger.log(`Setting new version ${nextRelease.version} in package.json`);
    // let proc = await execa("npm", ["version", "--no-git-tag-version", "--allow-same-version", nextRelease.version], {cwd, env});
    // checkExitCode(proc.code, logger);
    // timeout(750);
    // replaceInFile("package.json", `version"[ ]*:[ ]*["]${lastRelease.version}`, `version": "${nextRelease.version}`);

    if (options.repo)
    {
        logger.log("Saving repository in package.json");
        defaultRepo = packageJson.repository.url;
        logger.log("Repository: " + defaultRepo);
        logger.log("Setting repository in package.json: " + options.repo);
        packageJson.repository.url = options.repo;
        modified = true;
    }

    if (options.repoType)
    {
        logger.log("Saving repository type in package.json");
        defaultRepoType = packageJson.repository.type;
        logger.log("Repository Type: " + defaultRepoType);
        logger.log("Setting repository type in package.json: " + options.repoType);
        packageJson.repository.type = options.repoType;
        modified = true;
    }

    if (options.homePage)
    {
        logger.log("Saving homepage in package.json");
        defaultHomePage = packageJson.homepage;
        logger.log("Homepage: " + defaultHomePage);
        logger.log("Setting homepage in package.json: " + options.homePage);
        packageJson.homepage = options.homePage;
        modified = true;
    }

    if (options.bugs)
    {
        logger.log("Saving bugs page in package.json");
        defaultBugs = packageJson.bugs.url;
        logger.log("Bugs page: " + defaultBugs);
        logger.log("Setting bugs page in package.json: " + options.bugs);
        packageJson.bugs.url = options.bugs;
        modified = true;
    }

    //
    // Scope/name - package.json
    //
    logger.log("Saving package name in package.json");
    defaultName = packageJson.name;
    logger.log("Package name : " + defaultName);
    if (defaultName.includes("@") && defaultName.includes("/")) {
        defaultScope = defaultName.substring(0, defaultName.indexOf("/"));
        logger.log("Package scope: " + defaultScope);
    }

    if (options.npmScope)
    {
        if (!defaultName.includes(options.npmScope))
        {
            const name = options.npmScope + "/" + options.projectName;
            logger.log(`Setting package name in package.json: ${name}`);
            packageJson.name = name;
            //
            // package-lock.json
            //
            if (packageLockFileExists)
            {
                logger.log(`Setting package name in package-lock.json: ${name}`);
                packageLockJson.name = name;
            }
            modified = true;
        }
    }

    if (modified) {
        await writeFile("package.json", JSON.stringify(packageJson));
        if (packageLockFileExists)
        {
            await writeFile("package-lock.json", JSON.stringify(packageLockJson));
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

export async function restorePackageJson({options, lastRelease, nextRelease, logger, cwd, env})
{
    let modified = false;
    const packageJsonExists = await pathExists("package.json"),
          packageJson = packageJsonExists ? require(path.join(process.cwd(), "package.json")) : undefined,
          packageLockFileExists = packageJsonExists ? await pathExists("package-lock.json") : undefined,
          packageLockJson = packageLockFileExists ? require(path.join(process.cwd(), "package-lock.json")) : undefined;

    if (!packageJsonExists) {
        return;
    }

    //
    // Set repo
    //
    if (defaultRepo)
    {
        logger.log(`Reset default repo in package.json: ${defaultRepo}`);
        packageJson.repository.url = options.repo;
        modified = true;
    }
    //
    // Set repo type
    //
    if (defaultRepoType)
    {
        logger.log(`Reset default repo in package.json: ${defaultRepoType}`);
        packageJson.repository.type = defaultRepoType;
        modified = true;
    }
    //
    // Set bugs
    //
    if (defaultBugs)
    {
        logger.log(`Reset default bugs page in package.json: ${defaultBugs}`);
        packageJson.bugs.url = defaultBugs;
        modified = true;
    }
    //
    // Set homepage
    //
    if (defaultHomePage)
    {
        logger.log("Reset default home page in package.json: " + defaultHomePage);
        packageJson.homepage = defaultBugs;
        modified = true;
    }
    //
    // Scope/name - package.json
    //
    if (options.npmScope && !defaultName.includes(options.npmScope))
    {
        logger.log("Reset default package name in package.json: " + defaultName);
        packageJson.name = defaultName;
        modified = true;
        //
        // package-lock.json
        //
        if (packageLockFileExists)
        {
            logger.log("Reset default package name in package-lock.json: " + defaultName);
            packageLockJson.name = defaultName;
        }
        modified = true;
    }

    if (modified) {
        await writeFile("package.json", JSON.stringify(packageJson));
        if (packageLockFileExists)
        {
            await writeFile("package-lock.json", JSON.stringify(packageLockJson));
        }
    }
}
