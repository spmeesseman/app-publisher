
import * as path from "path";
import { isString, validateVersion } from "./utils/utils";
import { createDir, pathExists } from "./utils/fs";
import { IContext } from "../interface";

export = validateOptions;


function error(logger: any, err: string)
{
    logger.error(err);
    return false;
}

async function validateOptions({cwd, env, logger, options}: IContext): Promise<boolean>
{
    const environ = { ...process.env, ...env };
    logger.log("Validating all options...");

    //
    // Convert array params to arrays, if specified as string on cmdline or publishrc
    //
    if (options.deployCommand && isString(options.deployCommand))
    {
        options.deployCommand = [ options.deployCommand ]; // convert to array
    }
    if (options.buildCommand && isString(options.buildCommand))
    {
        options.buildCommand = [ options.buildCommand ]; // convert to array
    }
    if (options.postBuildCommand && isString(options.postBuildCommand))
    {
        options.postBuildCommand = [ options.postBuildCommand ]; // convert to array
    }
    if (options.preBuildCommand && isString(options.preBuildCommand))
    {
        options.preBuildCommand = [ options.preBuildCommand ]; // convert to array
    }
    if (options.postReleaseCommand && isString(options.postReleaseCommand))
    {
        options.postReleaseCommand = [ options.postReleaseCommand ]; // convert to array
    }
    if (options.postCommitCommand && isString(options.postCommitCommand))
    {
        options.postCommitCommand = [ options.postCommitCommand ]; // convert to array
    }
    if (options.preCommitCommand &&  isString(options.preCommitCommand))
    {
        options.preCommitCommand = [ options.preCommitCommand ]; // convert to array
    }
    if (options.distReleasePreCommand && isString(options.distReleasePreCommand))
    {
        options.distReleasePreCommand = [ options.distReleasePreCommand ]; // convert to array
    }
    if (options.distReleasePostCommand && isString(options.distReleasePostCommand))
    {
        options.distReleasePostCommand = [ options.distReleasePostCommand ]; // convert to array
    }
    if (options.githubAssets && isString(options.githubAssets))
    {
        options.githubAssets = [ options.githubAssets ]; // convert to array
    }
    if (options.githubReleasePreCommand && isString(options.githubReleasePreCommand))
    {
        options.githubReleasePreCommand = [ options.githubReleasePreCommand ]; // convert to array
    }
    if (options.githubReleasePostCommand && isString(options.githubReleasePostCommand))
    {
        options.githubReleasePostCommand = [ options.githubReleasePostCommand ]; // convert to array
    }
    if (options.mantisbtUrl && isString(options.mantisbtUrl))
    {
        options.mantisbtUrl = [ options.mantisbtUrl ]; // convert to array
    }
    if (options.mantisbtApiToken && isString(options.mantisbtApiToken))
    {
        options.mantisbtApiToken = [ options.mantisbtApiToken ]; // convert to array
    }
    if (options.mantisbtAssets && isString(options.mantisbtAssets))
    {
        options.mantisbtAssets = [ options.mantisbtAssets ]; // convert to array
    }
    if (options.mantisbtReleasePreCommand && isString(options.mantisbtReleasePreCommand))
    {
        options.mantisbtReleasePreCommand = [ options.mantisbtReleasePreCommand ]; // convert to array
    }
    if (options.mantisbtReleasePostCommand && isString(options.mantisbtReleasePostCommand))
    {
        options.mantisbtReleasePostCommand = [ options.mantisbtReleasePostCommand ]; // convert to array
    }
    if (options.npmReleasePreCommand && isString(options.npmReleasePreCommand))
    {
        options.npmReleasePreCommand = [ options.npmReleasePreCommand ]; // convert to array
    }
    if (options.npmReleasePostCommand && isString(options.npmReleasePostCommand))
    {
        options.npmReleasePostCommand = [ options.npmReleasePostCommand ]; // convert to array
    }
    if (options.versionFiles && isString(options.versionFiles))
    {
        options.versionFiles = [ options.versionFiles ]; // convert to array
    }
    if (options.versionFilesEditAlways && isString(options.versionFilesEditAlways))
    {
        options.versionFilesEditAlways = [ options.versionFilesEditAlways ]; // convert to array
    }
    if (options.versionFilesScrollDown && isString(options.versionFilesScrollDown))
    {
        options.versionFilesScrollDown = [ options.versionFilesScrollDown ]; // convert to array
    }
    if (options.versionReplaceTags && isString(options.versionReplaceTags))
    {
        options.versionReplaceTags = [ options.versionReplaceTags ]; // convert to array
    }
    if (options.emailRecip && isString(options.emailRecip))
    {
        options.emailRecip = [ options.emailRecip ]; // convert to array
    }
    if (options.testEmailRecip && isString(options.testEmailRecip))
    {
        options.testEmailRecip = [ options.testEmailRecip ]; // convert to array
    }

    //
    // Email configuratin
    //
    if (options.emailNotification === "Y") {
        if (!options.emailRecip || !options.emailSender || !options.emailServer || (!options.emailRecip && !options.testEmailRecip)) {
            logger.error("Email step is specified Y, but email is not configured in .publishrc");
            logger.error("Configure related email properties in .publishrc");
            return false;
        }
    }

    //
    // Set up log file
    //
    if (options.writeLog === "Y")
    {   //
        // Define log folder name
        //
        const logFolder = path.join(environ.LOCALAPPDATA, "app-publisher", "log");
        //
        // Define log file name
        //
        // const date = Get-Date -format "yyyyMMddHHmmss";
        // const logFile = path.join(logFolder, "app-publisher-CurrentDate.log");
        //
        // Create the log directory
        //
        if (!(await pathExists(logFolder))) {
            await createDir(logFolder);
        }
    }

    //
    // Set repository and repository type
    //
    if (!options.repo || !options.repoType)
    {
        if (await pathExists(path.join(cwd, "package.json")))
        {
            const packageJson = require(path.join(process.cwd(), "package.json"));

            if (!options.repo && packageJson.repository && packageJson.repository.url)
            {
                options.repo = packageJson.repository.url;
            }
            if (!options.repoType && packageJson.repository && packageJson.repository.type)
            {
                options.repo = packageJson.repository.type;
            }
        }
    }

    if (!options.repoType) {
        logger.error("Repository type must be specified on cmd line, package.json or publishrc");
        return false;
    }
    else if (options.repoType !== "git" && options.repoType !== "svn")
    {
        logger.error("Invalid repository type, must be 'git' or 'svn'");
        return false;
    }

    //
    // Branch
    //
    if (!options.branch)
    {
        if (options.repoType === "git")
        {
            logger.warn("Setting branch name to default 'main'");
            options.branch = "main";
        }
        else // if (options.repoType === "svn")
        {
            logger.log("Setting branch name to default 'trunk'");
            options.branch = "trunk";
        }
    }

    //
    // SVN repo path
    //
    if (options.repoType === "svn")
    {
        if (options.branch === "trunk")
        {
            if (!options.repo.includes("trunk"))
            {
                if (options.repo.includes("branches/"))
                {
                    options.repo = options.repo.substring(0, options.repo.indexOf("branches/")) + "trunk";
                }
                else {
                    options.repo = (options.repo + "/" + options.branch).replace("//", "/");
                }
            }
        }
        else
        {
            if (options.repo.indexOf("branches/") === -1)
            {
                if (options.repo.indexOf("trunk") !== -1)
                {
                    options.repo = options.repo.replace("trunk", "branches/" + options.branch);
                }
                else {
                    options.repo = (options.repo + "/branches/" + options.branch).replace("//", "/");
                }
            }
        }
    }

    //
    // If specified editor doesnt exist, then switch to notepad or pico
    //
    if (options.textEditor)
    {
        options.textEditor = options.textEditor.trim();
        if (!options.textEditor.toLowerCase().startsWith("notepad") && !(await pathExists(options.textEditor, false)))
        {
            let found = false;
            const paths = environ.Path.split(";");
            for (const p of paths)
            {
                let fullPath = path.join(p, options.textEditor);
                if (await pathExists(fullPath)) {
                    found = true;
                    break;
                }
                fullPath = path.join(p, options.textEditor + ".exe");
                if (await pathExists(fullPath)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                logger.log("Text editor not found, falling back to 'notepad'");
                options.textEditor = "notepad";
            }
        }
    }

    //
    // Create dist directory if it doesnt exist
    //
    if (options.pathToDist && !(await pathExists(options.pathToDist)))
    {
        logger.log("Creating dist directory");
        await createDir(options.pathToDist);
        // VcChangelistAddRemove "$PATHTODIST";
    }

    //
    // History file line length
    //
    if (!options.historyLineLen) {
        options.historyLineLen = 80;
    }

    //
    // NPM
    //
    if (options.taskNpmRelease) {
        options.npmRelease = "Y";
    }
    if (options.npmRelease)
    {
        options.npmRelease = options.npmRelease.toUpperCase();
        if (options.npmRelease !== "Y" && options.npmRelease !== "N") {
            logger.error("Invalid value specified for npmRelease, accepted values are y/n/Y/N");
            return false;
        }
        if (options.npmPackDist === "Y")
        {
            if (!options.pathToDist) {
                logger.error("You must specify 'pathToDist' if 'npmPackDist' flag is set to Y");
                return false;
            }
        }
        //
        // Set a default NPM registry
        //
        if (!options.npmRegistry) {
            options.npmRegistry = "https://registry.npmjs.org";
        }
    }

    //
    // Convert any Y/N vars to upper case and check validity
    //
    if (options.taskDistRelease) {
        options.distRelease = "Y";
    }
    if (options.distRelease) {
        options.distRelease = options.distRelease.toUpperCase();
        if (options.distRelease !== "Y" && options.distRelease !== "N") {
            logger.error("Invalid value specified for distRelease, accepted values are y/n/Y/N");
            return false;
        }
    }

    //
    // Github Release
    //
    if (options.taskGithubRelease) {
        options.githubRelease = "Y";
    }
    if (options.githubRelease) {
        options.githubRelease = options.githubRelease.toUpperCase();
        if (options.githubRelease !== "Y" && options.githubRelease !== "N") {
            logger.error("Invalid value specified for githubRelease, accepted values are y/n/Y/N");
            return false;
        }
        if (options.githubRelease === "Y")
        {
            if (!options.githubUser) {
                logger.error("You must specify githubUser for a GitHub release type");
                return false;
            }
            if (!environ.GITHUB_TOKEN) {
                logger.error("You must have GITHUB_TOKEN defined in the environment for a GitHub release type");
                logger.error("Set the environment variable GITHUB_TOKEN using the token value created on the GitHub website");
                return false;
            }
        }
    }

    //
    // Mantis Plugin
    //
    if (options.mantisbtPlugin)
    {
        if (!options.mantisbtPlugin.includes((".php"))) {
            return error(logger, "Invalid value for mantisbtPlugin, file must have a php extension");
        }
        if (!(await pathExists(options.mantisbtPlugin))) {
            return error(logger, "Invalid value for mantisbtPlugin, non-existent file specified");
        }
    }

    //
    // Mantis Release
    //
    if (options.taskMantisbtRelease) {
        options.mantisbtRelease = "Y";
    }
    if (options.mantisbtRelease)
    {
        options.mantisbtRelease = options.mantisbtRelease.toUpperCase();
        if (options.mantisbtRelease !== "Y" && options.mantisbtRelease !== "N") {
            logger.error("Invalid value specified for mantisbtRelease, accepted values are y/n/Y/N");
            return false;
        }
        if (options.mantisbtRelease === "Y")
        {
            if (options.mantisbtUrl.length === 0) {
                logger.error("You must specify mantisbtUrl for a MantisBT release type");
                return false;
            }
            if (options.mantisbtApiToken.length === 0) {
                logger.error("You must have MANTISBT_API_TOKEN defined for a MantisBT release type");
                logger.error("-or- you must have mantisbtApiToken defined in publishrc");
                logger.error("Set the envvar MANTISBT_API_TOKEN or the config mantisApiToken with the token value created on the MantisBT website");
                logger.error("To create a token, see the \"Tokens\" section of your Mantis User Preferences page");
                return false;
            }
            if (options.mantisbtUrl.length !== options.mantisbtApiToken.length) {
                logger.error("You must specify the same number of MantisBT urls and API tokens");
                return false;
            }
        }
    }

    if (options.cProjectRcFile) {
        if (!options.cProjectRcFile.toLowerCase().includes((".rc"))) {
            logger.error("Invalid value for cProjectRcFile, file must have an rc extension");
            return false;
        }
        if (!(await pathExists(options.cProjectRcFile))) {
            logger.error("Invalid value for cProjectRcFile, non-existent file specified");
            return false;
        }
    }

    if (options.dryRunVcRevert) {
        options.dryRunVcRevert = options.dryRunVcRevert.toUpperCase();
        if (options.dryRunVcRevert !== "Y" && options.dryRunVcRevert !== "N") {
            logger.error("Invalid value specified for testModeSvnRevert, accepted values are y/n/Y/N");
            return false;
        }
    }
    else {
        options.dryRunVcRevert = "Y";
    }

    if (options.writeLog) {
        options.writeLog = options.writeLog.toUpperCase();
        if (options.writeLog !== "Y" && options.writeLog !== "N") {
            logger.error("Invalid value specified for writeLog, accepted values are y/n/Y/N");
            return false;
        }
    }

    if (options.promptVersion) {
        options.promptVersion = options.promptVersion.toUpperCase();
        if (options.promptVersion !== "Y" && options.promptVersion !== "N") {
            logger.error("Invalid value specified for promptVersion, accepted values are y/n/Y/N");
            return false;
        }
    }

    if (options.skipChangelogEdits) {
        options.skipChangelogEdits = options.skipChangelogEdits.toUpperCase();
        if (options.skipChangelogEdits !== "Y" && options.skipChangelogEdits !== "N") {
            logger.error("Invalid value specified for skipChangelogEdits, accepted values are y/n/Y/N");
            return false;
        }
        if (options.dryRun === true && !options.taskMode) {
            options.skipChangelogEdits = "N";
            logger.warn("Overriding skipChangelogEdits on dry run, auto set to 'N'");
        }
    }

    if (options.skipVersionEdits) {
        options.skipVersionEdits = options.skipVersionEdits.toUpperCase();
        if (options.skipVersionEdits !== "Y" && options.skipVersionEdits !== "N") {
            logger.error("Invalid value specified for skipVersionEdits, accepted values are y/n/Y/N");
            return false;
        }
        if (options.dryRun === true) {
            options.skipVersionEdits = "N";
            logger.warn("Overriding skipVersionEdits on dry run, auto set to 'N'");
        }
    }
    //
    // Check dist release path for dist release
    //
    if (options.distRelease === "Y" && !options.pathToDist) {
        logger.error("pathToDist must be specified for dist release");
        return false;
    }

    if (!options.versionText) {
        options.versionText = "Version";
    }

    //
    // Must specify one of changelogFile or hisotryFile
    //
    if (!options.changelogFile && !options.historyFile)
    {
        logger.error("changelogFile or historyFile must be specified");
        return false;
    }

    //
    // Check for environment vars that did not get set.  Env vars are wrapped in ${} and will
    // have been replaced by the nodejs config parser if they exist in the env.  Provide a warning
    // if any of the variables are not found in the environment.
    //
    Object.entries(options).forEach(([property, value]) =>
    {
        if (!property || !value) {
            return; // continue forEach()
        }
        if (value instanceof Array)
        {
            for (const val of value) {
                if (val instanceof String || typeof(val) === "string") {
                    if (val.trim().startsWith("$`{") && val.trim().endsWith("`}")) {
                        logger.warn(`Option ${property} environment value was not found/set`);
                        logger.warn("   " + val);
                    }
                }
            }
        }
        else {
            if (value instanceof String || typeof(value) === "string") {
                if (value.trim().startsWith("$`{") && value.trim().endsWith("`}")) {
                    logger.warn(`Option ${property} environment value was not found/set`);
                    logger.warn("   " + value);
                }
            }
        }
    });

    //
    // CI
    //
    if (!options.noCi)
    {
        options.skipChangelogEdits = "Y";
        options.skipVersionEdits = "Y";
        options.versionFilesEditAlways = "";
        options.promptVersion = "N";
        logger.warn("CI environment detected, the following flags/properties have been cleared:");
        logger.warn("   skipChangelogEdits");
        logger.warn("   skipVersionEdits");
        logger.warn("   promptVersion");
        logger.warn("   versionFilesEditAlways");
    }

    //
    // *** TASKS ***
    //

    //
    // Set transitive task flags
    //
    if (options.taskChangelogFile) {
        options.taskChangelog = true;
    }
    if (options.taskEmail || options.taskVersionUpdate || options.taskMantisbtRelease) {
        options.skipChangelogEdits = "Y";
    }

    //
    // Certain 'single-task mode' options can't be used together...
    //
    if ((options.taskChangelog && options.taskEmail) || (options.taskChangelog && options.taskVersionUpdate) ||
        (options.taskVersionUpdate && options.taskEmail) || (options.taskMantisbtRelease && options.taskEmail) ||
        (options.taskMantisbtRelease && options.taskVersionUpdate) || (options.taskMantisbtRelease && options.taskChangelog) ||
        (options.taskGithubRelease && options.taskEmail) || (options.taskGithubRelease && options.taskVersionUpdate) ||
        (options.taskGithubRelease && options.taskChangelog) || (options.taskChangelogView && options.taskChangelogHtmlView) ||
        (options.taskChangelogView && options.taskChangelogPrint) || (options.taskChangelogPrint && options.taskChangelogHtmlView) ||
        (options.taskChangelogFile && options.taskChangelogHtmlFile) ||
        (options.taskChangelog && (options.taskChangelogFile || options.taskChangelogHtmlFile)) ||
        (options.taskChangelog && (options.taskChangelogView || options.taskChangelogHtmlView || options.taskChangelogPrint)) ||
        (options.taskVersionUpdate && options.versionForceCurrent))
    {
        logger.error("Invalid options specified:");
        logger.error("  Two or more of the specified tasks cannot be used together");
        logger.error("    changeLog           : " + options.taskChangelog);
        logger.error("    changeLog view      : " + options.taskChangelogView);
        logger.error("    changeLog view hmtl : " + options.taskChangelogHtmlView);
        logger.error("    changeLog file     : " + options.taskChangelogFile);
        logger.error("    changeLog file hmtl : " + options.taskChangelogHtmlFile);
        logger.error("    email               : " + options.taskEmail);
        logger.error("    githubRelease       : " + options.taskGithubRelease);
        logger.error("    mantisRelease       : " + options.taskMantisbtRelease);
        logger.error("    republish           : " + options.republish);
        logger.error("    touchVersions       : " + options.taskVersionUpdate);
        return false;
    }

    //
    // Only certain tasks are allowed with --version-force-current.  e.g. re-send a notification
    // email, or redo a Mantis or GitHub or NPM or other release
    //
    if (options.versionForceCurrent)
    {
        if (!options.taskMode)
        {
            logger.error("Invalid options specified:");
            logger.error("  The --version-force-current switch can only be usedin task mode");
            return false;
        }
        let taskSet = false;
        for (const o in options)
        {
            if (o.startsWith("task") && options[o] === true)
            {
                if (!o.endsWith("Release") && o !== "taskEmail" && o !== "taskMode" && o !== "taskModeStdOut")
                {
                    logger.error("Invalid options specified:");
                    logger.error(`  The versionForceCurrent switch cannot be used with '${o}'`);
                    return false;
                }
                taskSet = true;
            }
        }
        if (!taskSet) {
            logger.error("Invalid options specified:");
            logger.error("The versionForceCurrent switch can only be used with the following tasks:");
            logger.error("  task*XYZ*Release, taskEmail");
            return false;
        }
    }

    //
    // Task email must have email configured
    //
    if (options.taskEmail && options.emailNotification !== "Y") {
        logger.error("Email task specified, but email is not configured in .publishrc");
        logger.error("Configure email with 'emailNotification' flag and related properties");
        return false;
    }

    //
    // Only one stdout mode task can be used at a time
    //
    if (options.taskModeStdOut)
    {
        for (const o in options)
        {
            if (o.startsWith("task"))
            {
                if (options[o] === true) {
                    if (o !== "taskVersionCurrent" && o !== "taskVersionNext" && o !== "taskVersionInfo" && o !== "taskChangelogPrint" &&
                        o !== "taskCiEvInfo" && o !== "taskVersionPreReleaseId" && o !== "taskMode" && o !== "taskModeStdOut")
                    {
                        logger.error("The specified task cannot be used with a 'stdout' type task:");
                        logger.error("   " + o);
                        return false;
                    }
                }
            }
        }
    }

    //
    // Valudate version specified by taskChangelogPrintVersion or taskChangelogViewVersion
    // Only allow one of theseocmmands at a time.  TODO - allow running both at same time
    //
    if (options.taskChangelogPrintVersion && options.taskChangelogViewVersion) {
        logger.error("Tasks changelogPrintVersion and changelogViewVersion cannot be used in the same run");
        return false;
    }
    if (options.taskChangelogPrintVersion || options.taskChangelogViewVersion) {
        if (!validateVersion(options.taskChangelogPrintVersion || options.taskChangelogViewVersion)) {
            logger.error(`Invalid version ${options.taskChangelogPrintVersion} specified for taskChangelogPrintVersion`);
            return false;
        }
    }

    //
    // Good to go...
    //
    logger.log("Options validated");
    return true;
}
