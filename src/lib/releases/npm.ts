
import { pick } from "lodash";
import * as path from "path";
import { IContext } from "../../interface";
import { addEdit } from "../repo";
import { createDir, pathExists, writeFile } from "../utils/fs";
import { timeout, checkExitCode } from "../utils/utils";
const execa = require("execa");


export let npmLocation: string;
export let defaultBugs: string;
export let defaultHomePage: string;
export let defaultName: string;
export let defaultRepo: string;
export let defaultRepoType: string;
export let defaultScope: string;


export async function doNpmRelease(context: IContext)
{
    const options = context.options,
          logger = context.logger,
          nextRelease = context.nextRelease;

    logger.log("Starting NPM release");

    if (await pathExists("package.json"))
    {
        let proc: any;
        //
        // Pack tarball and mvoe to dist dir if specified
        //
        if (options.npmPackDist === "Y")
        {
            let tmpPkgFile;
            let proc = await execa("npm", ["pack"], pick(context, [ "cwd", "env"]));
            checkExitCode(proc.code, logger);

            if (!options.pathToDist)
            {
                logger.log("Creating tarball file directory and adding to version control");
                createDir(options.pathToDist);
            }

            const destPackedFile = path.join(options.pathToDist, `${options.projectName}.tgz`);
            timeout(100);
            if (options.npmScope) {
                tmpPkgFile = `${options.npmScope}-${options.projectName}-${nextRelease.version}.tgz`.substring(1);
            }
            else {
                tmpPkgFile = `${options.projectName}-${nextRelease.version}.tgz`;
            }
            //
            // Move file
            //
            timeout(500);
            logger.log("Moving package:");
            logger.log("   " + tmpPkgFile);
            logger.log("To:");
            logger.log("   " + destPackedFile);

            if (process.platform === "win32") {
                proc = await execa.shell(`move /Y "${tmpPkgFile}" "${destPackedFile}`);
            }
            else {
                proc = await execa.shell(`mv -f "${tmpPkgFile}" "${destPackedFile}`);
            }
            checkExitCode(proc.code, logger);
            //
            // Track modified file
            //
            addEdit(context, destPackedFile);
        }
        //
        // Publish to npm server
        //
        if (!options.dryRun)
        {
            if (options.npmRegistry) {
                logger.log("Publishing npm package to " + options.npmRegistry);
                proc = await execa("npm", [ "publish", "--registry", options.npmRegistry]);
            }
            else {
                logger.log("Publishing npm package to default registry");
                proc = await execa("npm", [ "publish" ]);
            }
        }
        else
        {
            if (options.npmRegistry) {
                logger.log("Dry Run - Publishing npm package to " + options.npmRegistry);
                proc = await execa("npm", [ "publish", "--registry", options.npmRegistry, "--dry-run"]);
            }
            else {
                logger.log("Dry Run - Publishing npm package to default registry");
                proc = await execa("npm", [ "publish", "--dry-run"]);
            }
        }
        checkExitCode(proc.code, logger);
        //
        //
        //
        if (proc.code === 0)
        {
            if (options.npmScope) {
                npmLocation = `${options.npmRegistry}/-/web/detail/${options.npmScope}/${options.projectName}`;
            }
            else {
                npmLocation = `${options.npmRegistry}/-/web/detail/${options.projectName}`;
            }
        }
        else {
            throw new Error("180");
        }
    }
    else {
        logger.warn("Could not find package.json");
    }
}


export async function setPackageJson({options, logger})
{
    let modified = false;

    if (options.taskMode && !options.taskNpmRelease) {
        return modified;
    }

    const packageJsonExists = await pathExists("package.json"),
          packageJson = packageJsonExists ? require(path.join(process.cwd(), "package.json")) : undefined,
          packageLockFileExists = packageJsonExists ? await pathExists("package-lock.json") : undefined,
          packageLockJson = packageLockFileExists ? require(path.join(process.cwd(), "package-lock.json")) : undefined;

    if (!packageJsonExists) {
        return modified;
    }

    //
    // A full publish run can modify the npm configs at runtime and have them restored to
    // the defaults when finished.  In task mode, this isn't possible.
    //
    if (options.repo && options.repo !== packageJson.repository.url)
    {
        logger.log("Setting repository in package.json");
        defaultRepo = packageJson.repository.url;
        logger.log("Repository: " + defaultRepo);
        logger.log("Setting repository in package.json: " + options.repo);
        packageJson.repository.url = options.repo;
        modified = true;
    }

    if (options.repoType && options.repoType !== packageJson.repository.type)
    {
        logger.log("Setting repository type in package.json");
        defaultRepoType = packageJson.repository.type;
        logger.log("Repository Type: " + defaultRepoType);
        logger.log("Setting repository type in package.json: " + options.repoType);
        packageJson.repository.type = options.repoType;
        modified = true;
    }

    if (options.homePage && options.homePage !== packageJson.homepage)
    {
        logger.log("Setting homepage in package.json");
        defaultHomePage = packageJson.homepage;
        logger.log("Homepage: " + defaultHomePage);
        logger.log("Setting homepage in package.json: " + options.homePage);
        packageJson.homepage = options.homePage;
        modified = true;
    }

    if (options.bugs && options.bugs !== packageJson.bugs.url)
    {
        logger.log("Setting bugs page in package.json");
        defaultBugs = packageJson.bugs.url;
        logger.log("Bugs page: " + defaultBugs);
        logger.log("Setting bugs page in package.json: " + options.bugs);
        packageJson.bugs.url = options.bugs;
        modified = true;
    }

    //
    // Scope/name - package.json
    //
    if (!defaultName) {
        defaultName = packageJson.name;
        if (defaultName.includes("@") && defaultName.includes("/")) {
            defaultScope = defaultName.substring(0, defaultName.indexOf("/"));
        }
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
        await writeFile("package.json", JSON.stringify(packageJson, undefined, 4));
        if (packageLockFileExists)
        {
            await writeFile("package-lock.json", JSON.stringify(packageLockJson, undefined, 4));
        }
    }

    return modified;
}


export async function restorePackageJson({options, logger})
{
    if (options.taskMode && !options.taskNpmRelease) {
        return;
    }

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
        await writeFile("package.json", JSON.stringify(packageJson, undefined, 4));
        if (packageLockFileExists)
        {
            await writeFile("package-lock.json", JSON.stringify(packageLockJson, undefined, 4));
        }
    }
}
