
import * as path from "path";
import { checkExitCode, pathExists, replaceInFile, readFile, editFile, timeout } from "../utils";
const json = require("json");
const execa = require("execa");

let defaultBugs: string;
let defaultHomePage: string;
let defaultName: string;
let defaultRepo: string;
let defaultRepoType: string;
let defaultScope: string;


export async function setPackageJson({options, lastRelease, nextRelease, logger, cwd, env})
{
    const packageJson = require(path.join(process.cwd(), "package.json")),
          packageLockFileExists = await pathExists("package-lock.json");
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
        // Save
        logger.log("Saving repository in package.json");
        defaultRepo = packageJson.repository.url;
        logger.log("Repository: " + defaultRepo);
        // Set repo
        logger.log("Setting repository in package.json: " + options.repo);
        // proc = & json -I -4 -f package.json -e "this.repository.url='$REPO'"
        // checkExitCode(proc.code, logger);
    }

    if (options.repoType)
    {
        // Save
        logger.log("Saving repository type in package.json");
        defaultRepoType = packageJson.repository.type;
        logger.log("Repository Type: " + defaultRepoType);
        // Set repo type
        logger.log("Setting repository type in package.json: " + options.repoType);
        // proc = & json -I -4 -f package.json -e "this.repository.type='$REPOTYPE'"
        // checkExitCode(proc.code, logger);
    }

    if (options.homePage)
    {
        // Save
        logger.log("Saving homepage in package.json");
        defaultHomePage = packageJson.homepage;
        logger.log("Homepage: " + defaultHomePage);
        // Set homepage
        logger.log("Setting homepage in package.json: " + options.homePage);
        //
        // A bug in npm module json where writing an ampersand throws an error, if the bugs page contains
        // one then use powershell replace mechanism for replacement
        //
        if (!options.homePage.includes("&"))
        {
            // proc = & json -I -4 -f package.json -e "this.homepage='$HOMEPAGE'"
        }
        else {
             // proc = & json -I -4 -f package.json -e "this.homepage='$HOMEPAGE'"
        }
        // checkExitCode(proc.code, logger);
    }

    if (options.bugs)
    {
        // Save
        logger.log("Saving bugs page in package.json");
        defaultBugs = packageJson.bugs.url;
        logger.log("Bugs page: " + defaultBugs);
        // Set
        logger.log("Setting bugs page in package.json: " + options.bugs);
        //
        // A bug in npm module json where writing an ampersand throws an error, if the bugs page contains
        // one then use powershell replace mechanism for replacement
        //
        if (!options.bugs.includes("&"))
        {
            // proc = & json -I -4 -f package.json -e "this.bugs.url='$BUGS'"
        }
        else {
            // proc = & json -I -4 -f package.json -e "this.bugs.url='$BUGS'"
        }
        // checkExitCode(proc.code, logger);
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
            logger.log(`Setting package name in package.json: ${options.npmScope}/${options.projectName}`);
            // proc = & json -I -4 -f package.json -e "this.name='$NPMSCOPE/$PROJECTNAME'"
            // checkExitCode(proc.code, logger);
            //
            // Scope - package-lock.json
            //
            if (packageLockFileExists)
            {
                logger.log(`Setting package name in package-lock.json: ${options.npmScope}/${options.projectName}`);
                // proc = & json -I -4 -f package-lock.json -e "this.name='$NPMSCOPE/$PROJECTNAME'"
                // checkExitCode(proc.code, logger);
            }
        }
    }

    //
    // The json utility will output line feed only, replace with windows stle crlf
    //
    // logger.log("Set windows line feeds in package.json"
    // ((Get-Content -path "package.json" -Raw) -replace "`n", "`r`n") | Set-Content -NoNewline -Path "package.json"
    // CheckExitCode
    //
    // Allow manual modifications to package.json and package-lock.json
    //
    editFile({options}, "package.json", false,  (options.skipVersionEdits === " Y" || options.taskTouchVersions));
    if (packageLockFileExists)
    {
        // The json utility will output line feed only, replace with windows stle crlf
        //
        // logger.log("Set windows line feeds in package-lock.json"
        // ((Get-Content -path "package-lock.json" -Raw) -replace "`n", "`r`n") | Set-Content -NoNewline -Path "package-lock.json"
        // CheckPsCmdSuccess
        editFile({options}, "package-lock.json", false, (options.skipVersionEdits === " Y" || options.taskTouchVersions));
    }
}

export async function restorePackageJson({options, lastRelease, nextRelease, logger, cwd, env})
{
    //
    // Set repo
    //
    if (defaultRepo)
    {
        // proc = & json -I -4 -f package.json -e "this.repository.url='defaultRepo'"
        // checkExitCode(proc.code, logger);
    }
    //
    // Set repo type
    //
    if (defaultRepoType)
    {
        // proc = & json -I -4 -f package.json -e "this.repository.type='defaultRepoType'"
        // checkExitCode(proc.code, logger);
    }
    //
    // Set bugs
    //
    if (defaultBugs)
    {
        logger.log("Re-setting default bugs page in package.json: " + defaultBugs);
        //
        // A bug in npm module json where writing an ampersand throws an error, if the bugs page contains
        // one then use powershell replace mechanism for replacement
        //
        if (!defaultBugs.includes("&"))
        {
            // proc = & json -I -4 -f package.json -e "this.bugs.url='defaultBugs'"
            // checkExitCode(proc.code, logger);
        }
        else {
            // proc = & json -I -4 -f package.json -e "this.bugs.url='defaultBugs'"
            // checkExitCode(proc.code, logger);
        }
    }
    //
    // Set homepage
    //
    if (defaultHomePage)
    {
        logger.log("Re-setting default homepage in package.json: " + defaultHomePage);
        //
        // A bug in npm module json where writing an ampersand throws an error, if the bugs page contains
        // one then use powershell replace mechanism for replacement
        //
        if (!defaultHomePage.includes("&"))
        {
            // proc = & json -I -4 -f package.json -e "this.homepage='$DefaultHomePage'"
            // checkExitCode(proc.code, logger);
        }
        else {
            // proc = & json -I -4 -f package.json -e "this.homepage='$DefaultHomePage'"
            // checkExitCode(proc.code, logger);
        }
    }
    //
    // Scope/name - package.json
    //
    if (options.npmScope && !defaultName.includes(options.npmScope))
    {
        logger.log("Re-setting default package name in package.json: " + defaultName);
        // proc = json -I -4 -f package.json -e "this.name='defaultName'"
        // checkExitCode(proc.code, logger);
        //
        // Scope - package-lock.json
        //
        if (await pathExists("package-lock.json"))
        {
            logger.log("Re-scoping default package name in package-lock.json: " + defaultName);
            // proc = json -I -4 -f package-lock.json -e "this.name='defaultName'"
            // checkExitCode(proc.code, logger);
        }
    }
}
