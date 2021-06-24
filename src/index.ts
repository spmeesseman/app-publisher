
import * as util from "./lib/utils/utils";
import * as child_process from "child_process";
import * as npm from "./lib/releases/npm";
import gradient from "gradient-string";
import chalk from "chalk";
import marked from "marked";
import TerminalRenderer from "marked-terminal";
import hookStd from "hook-std";
import hideSensitive = require("./lib/hide-sensitive");
import getConfig = require("./lib/get-config");
import getReleaseLevel = require("./lib/commit-analyzer");
import verify = require("./lib/verify");
import getCommits = require("./lib/get-commits");
import getCurrentVersion = require("./lib/version/get-current-version");
import getNextVersion = require("./lib/version/get-next-version");
import getLastRelease = require("./lib/get-last-release");
import getGitAuthUrl = require("./lib/get-git-auth-url");
import getLogger = require("./lib/get-logger");
import validateOptions = require("./lib/validate-options");
import doDistRelease = require("./lib/releases/dist");
import { doGithubRelease, publishGithubRelease } from "./lib/releases/github";
import doMantisbtRelease = require("./lib/releases/mantisbt");
import setVersions = require("./lib/version/set-versions");
import { template } from "lodash";
import { COMMIT_NAME, COMMIT_EMAIL } from "./lib/definitions/constants";
import { sendNotificationEmail } from "./lib/email";
import { writeFile } from "./lib/utils/fs";
import { createSectionFromCommits, doEdit, getProjectChangelogFile, populateChangelogs } from "./lib/changelog-file";
import { commit, fetch, verifyAuth, getHead, tag, push, revert } from "./lib/repo";
import { EOL } from "os";
import { IContext, INextRelease } from "./interface";
import runDevCodeTests = require("./test");
const envCi = require("@spmeesseman/env-ci");
const pkg = require("../package.json");


marked.setOptions({ renderer: new TerminalRenderer() });


async function run(context: IContext, plugins: any)
{
    const { cwd, env, options, logger } = context;
    const runTxt = !options.dryRun ? "run" : "test run";

    //
    // If user specified 'cfg' or '--config', then just display config and exit
    //
    if (options.config)
    {
        const title =
`----------------------------------------------------------------------------
 Run Configuration - .publishrc / cmd line
----------------------------------------------------------------------------
        `;
        context.stdout.write(chalk.bold(gradient("cyan", "pink").multiline(title, {interpolation: "hsv"})));
        context.stdout.write(JSON.stringify(options, undefined, 3));
        return true;
    }

    const {
        isCi, branch: ciBranch, isPr, name: ciName, root: ciRoot, build: ciBuild, buildUrl: ciBuildUrl, commit: ciCommit
    } = envCi({ env, cwd });

    //
    // Set branch to CI branch if not already set
    //
    if (!options.branch) {
        options.branch = ciBranch;
    }

    //
    // If user specified '--task-ci-env' then just display config and exit
    //
    if (options.taskCiEnv)
    {
        const title =
`----------------------------------------------------------------------------
 CI Environment Details
----------------------------------------------------------------------------
`;
        context.stdout.write(chalk.bold(gradient("cyan", "pink").multiline(title, {interpolation: "hsv"})));
        if (isCi)
        {
            context.stdout.write(`  CI Name           : ${ciName}${EOL}`);
            context.stdout.write(`  CI Branch         : ${ciBranch}${EOL}`);
            context.stdout.write(`  Is PR             : ${isPr}${EOL}`);
            context.stdout.write(`  Root              : ${ciRoot}${EOL}`);
            context.stdout.write(`  Commit            : ${ciCommit}${EOL}`);
            context.stdout.write(`  Build             : ${ciBuild}${EOL}`);
            context.stdout.write(`  Build URL         : ${ciBuildUrl}${EOL}`);
        }
        else {
            context.stdout.write("  No known CI environment was found" + EOL);
        }
        return true;
    }

    //
    // Set some additional options
    //
    options.appPublisherVersion = pkg.version;
    options.isNodeJsEnv = typeof module !== "undefined" && module.exports;

    //
    // Set task mode flag on the options object
    //
    for (const o in options)
    {
        if (o.startsWith("task")) {
            if (options[o] === true) {
                options.taskMode = true;
                break;
            }
        }
    }

    //
    // Display mode - bin mode, or node env
    //
    if (!options.taskModeStdOut)
    {
        const mode = options.isNodeJsEnv ? "Node.js" : "bin mode";
        context.stdout.write(EOL);
        logger.log("Loaded config from " + options.configFilePath);
        logger.log(`Running ${pkg.name} version ${pkg.version} in ${mode}`);
    }

    //
    // Check CI environment
    //
    if (!isCi && !options.dryRun && !options.noCi)
    {
        logger.error("This run was not triggered in a known CI environment, use --no-ci flag for local publish.");
        return false;
    }
    else
    {
        if (options.repoType === "git")
        {
            Object.assign(env, {
                GIT_AUTHOR_NAME: COMMIT_NAME,
                GIT_AUTHOR_EMAIL: COMMIT_EMAIL,
                GIT_COMMITTER_NAME: COMMIT_NAME,
                GIT_COMMITTER_EMAIL: COMMIT_EMAIL,
                ...env,
                GIT_ASKPASS: "echo",
                GIT_TERMINAL_PROMPT: 0
            });
        }
        else // default SVN
        {
            Object.assign(env, {
                SVN_AUTHOR_NAME: COMMIT_NAME,
                SVN_AUTHOR_EMAIL: COMMIT_EMAIL,
                SVN_COMMITTER_NAME: COMMIT_NAME,
                SVN_COMMITTER_EMAIL: COMMIT_EMAIL,
                ...env,
                SVN_ASKPASS: "echo",
                SVN_TERMINAL_PROMPT: 0
            });
        }
    }

    if (isCi && isPr && !options.noCi)
    {
        logger.error("This run was triggered by a pull request and therefore a new version won't be published.");
        return false;
    }

    if (isCi && ciBranch !== options.branch)
    {
        logger.error(`This ${runTxt} was triggered on the branch '${ciBranch}', but is configured to ` +
                     `publish from '${options.branch}'`);
        logger.error("   A new version won’t be published");
        return false;
    }
    else if (ciBranch !== options.branch && !options.taskModeStdOut)
    {
        logger.warn(`This ${runTxt} was triggered on the branch '${ciBranch}', but is configured to ` +
                    `publish from '${options.branch}'`);
        logger.warn("   Continuing in non-ci environment");
    }

    if (!options.taskModeStdOut) {
        logger[options.dryRun ? "warn" : "log"](
            `Run automated release from branch '${options.branch}'${options.dryRun ? " in dry-run mode" : ""}`
        );
    }

    //
    // If we're running a task only, then set the logger to empty methods other
    // than the error logger
    //
    if (options.taskModeStdOut && !options.verbose) {
        context.logger = {
            log: () => { /* */ },
            info: () => { /* */ },
            warn: () => { /* */ },
            success: () => { /* */ },
            error: context.logger.error
        };
    }

    let success = false;
    try {
        success = await runRelease(context, plugins);
        if (!success) {
            logger.error("Release run returned failure status");
        }
    }
    catch (e) {
        const eStr = e.toString();
        logger.error("Release run threw failure exception");
        if (eStr.endsWith("\n")) {
            context.stdout.write(`Exception:  ${eStr}${EOL}`);
        }
        else {
            logger.error(eStr);
        }
        // await callFail(context, plugins, e);
        // throw e;
    }

    return success;
}


function logTaskResult(result: boolean | string, logger: any)
{
    if (util.isString(result)) {
        logger.error(result);
    }
    else if (result === true) {
        logger.success("Successfully completed task");
    }
}


function hasMoreTasks(options: any, tasks: string[])
{
    let moreTasks = false;

    if (tasks && tasks.length > 0)
    {
        for (const task of tasks) {
            if (options[task] === true) {
                moreTasks = true;
                break;
            }
        }
    }

    return moreTasks;
}


async function runRelease(context: IContext, plugins: any)
{
    const { cwd, env, options, logger } = context;

    //
    // Validate options / cmd line arguments
    //
    if (!(await validateOptions(context)))
    {
        return false;
    }

    if (options.verbose) {
        const title =
`----------------------------------------------------------------------------
    Options Object
----------------------------------------------------------------------------
`;
        context.stdout.write(chalk.bold(gradient("cyan", "pink").multiline(title, {interpolation: "hsv"})));
        logger.log(JSON.stringify(options, undefined, 3));
    }

    //
    // If a l1 task is processed, we'll be done
    //
    let taskDone = await processTasks1(context);
    if (taskDone !== false) {
        logTaskResult(taskDone, logger);
        if (taskDone !== true || !hasMoreTasks(options, [ ...getTasks3(), ...getTasks4(), ...getTasks5() ])) {
            return taskDone;
        }
    }

    //
    // Verify
    //
    await verify(context);

    //
    // If theres not a git url specified in .publishrc or cmd line, get remote origin url
    //
    // TODO - for svn too
    //
    if (options.repoType === "git" && !options.repo)
    {
        options.repo = await getGitAuthUrl(context);
    }

    //
    // VCS Authentication
    //
    try {
        await verifyAuth(context);
    }
    catch (error) {
        throw error;
    }

    //
    // TODO - Plugins maybe?
    //
    // await plugins.verifyConditions(context);

    //
    // Fetch tags (git only)
    //
    await fetch(context);

    //
    // Populate context with last release info
    //
    const lastRelease = await getLastRelease(context); // calls getTags()
    //
    // Populate context with last release version info
    //
    //    version (should be same as context.lastRelease.version)
    //    versionSystem (semver or incremental)
    //    versionInfo (for mavn builds and auto constructing version #)
    //
    lastRelease.versionInfo = await getCurrentVersion(context);
    //
    // Check to see if last version found with the latestversion tag matches what was
    // found by examining the local files for version info.  Give a warning if so.
    //
    if (lastRelease.version !== lastRelease.versionInfo.version)
    {
        logger.warn("Version mismatch found betw. latest tag and local files version");
    }
    //
    // Can force version with --version-force-current
    //
    if (options.versionForceCurrent) {
        logger.log("Forcing current version to " + options.versionForceCurrent);
        lastRelease.version = options.versionForceCurrent;
        lastRelease.versionInfo.version = options.versionForceCurrent;
    }
    context.lastRelease = lastRelease;

    //
    // If a l2 task is processed, we'll be done
    //
    taskDone = await processTasks2(context);
    if (taskDone !== false) {
        logTaskResult(taskDone, logger);
        if (taskDone !== true || !hasMoreTasks(options, [ ...getTasks3(), ...getTasks4(), ...getTasks5() ])) {
            return taskDone;
        }
    }

    //
    // Populate context with commits
    //
    context.commits = await getCommits(context);

    //
    // Populate next release info
    //
    const nextRelease: INextRelease = {
        level: await getReleaseLevel(context),
        head: await getHead(context),
        version: undefined,
        tag: undefined,
        edits: [],
        versionInfo: undefined
    };

    //
    // If there wer eno commits that set the release level to 'patch', 'minor', or 'major',
    // then we're done
    //
    if (!nextRelease.level)
    {
        if (!options.taskGithubRelease && !options.taskMantisbtRelease && !options.taskNpmRelease && !options.taskDistRelease) {
            logger.log("There are no relevant commits, no new version is released.");
            return false;
        }
        nextRelease.level = "nochange";
        options.versionForceCurrent = context.lastRelease.version;
    }

    //
    // Populate context with next release info
    //
    context.nextRelease = nextRelease;

    //
    // Next version
    //
    const versionInfo = getNextVersion(context);
    if (options.versionForceNext)
    {
        logger.log("Forcing next version to " + options.versionForceNext);
        nextRelease.version = options.versionForceNext;
    }
    else {
        nextRelease.version = versionInfo.version;
        if (options.promptVersion === "Y")
        {
            const schema = {
                properties: {
                    version: {
                        description: "Enter version number (empty for default)",
                        pattern: /^(?:[0-9]+\.[0-9]+\.[0-9]+(?:[\-]{0,1}[a-z]+\.[0-9]+){0,1})$|^[0-9]+$/,
                        default: nextRelease.version,
                        message: "Version must contain 0-9 and '.', small chars and '-' for pre-release",
                        required: false
                    }
                }
            };
            const prompt = require("prompt");
            prompt.start();
            const { version } = await prompt.get(schema);
            if (version) {
                nextRelease.version = version;
            }
        }
    }

    //
    // If a l3 task is processed, we'll be done
    //
    taskDone = await processTasks3(context);
    if (taskDone !== false) {
        logTaskResult(taskDone, logger);
        if (taskDone !== true || !hasMoreTasks(options, [ ...getTasks4(), ...getTasks5() ])) {
            return taskDone;
        }
    }

    //
    // Get the tag name for the next release
    //
    nextRelease.tag = template(options.tagFormat)({ version: nextRelease.version });

    //
    // The changelog object can have 3 parts, 'fileNotes' that are read from the changelog file
    // itself, 'notes' with are buiilt from the commit messages, and htmlNotes which are built
    // from the changelog file itself and converted to heml style changelog.
    //
    context.changelog = {
        entries: undefined,
        fileNotes: undefined,
        fileNotesLast: undefined,
        htmlNotes: undefined,
        htmlNotesLast: undefined,
        notes: undefined,
        notesLast: undefined,
        file: getProjectChangelogFile(context)
    };

    //
    // TODO - Plugins maybe?
    //
    // await plugins.verifyRelease(context);
    //
    // TODO - Plugins maybe?
    //
    // await plugins.prepare(context);

    //
    // Edit/touch changelog / history file
    // Can be a history style TXT or a changeloge type MD
    //
    const doChangelog = options.taskChangelog || options.taskChangelogView || options.taskChangelogView ||
                        options.taskChangelogHtmlView || options.taskChangelogFile || !options.taskMode;
    if (doChangelog)
    {   //
        // We need to populate 'notes' right now for the changelog/history file edit.
        //
        context.changelog.notes = createSectionFromCommits(context);
        //
        // Do edit/view
        //
        await doEdit(context);
        //
        // If this is task mode, we're done if there aren't any higher lvl tasks left to run
        //
        if (options.taskMode) {
            logTaskResult(true, logger);
            if (options.taskChangelogHtmlFile || options.taskChangelogHtmlView || !hasMoreTasks(options, getTasks5())) {
                return true;
            }
        }
    }

    //
    // Create release notes / changelog
    // TODO - Plugins maybe?
    //
    // context.changelog.notes = await plugins.generateNotes(context);
    await populateChangelogs(context);

    //
    // Pre-build scipts (.publishrc)
    // Scripts that are run before manipluation of the verson files and before any build
    // scripts are ran.
    //
    await util.runScripts({ options, logger, cwd, env }, "preBuild", options.preBuildCommand, true, true);

    //
    // Pre - NPM release
    // We can manipulate the package.json file for an npm release with various properties
    // on the options object.  Can be used to release the same build to multiple npm
    // repositories.  THis needs to be done now before any version edits are made and before
    // any build scripts are ran.
    //
    let packageJsonModified = false;
    if (options.npmRelease === "Y" && (!options.taskMode || options.taskNpmRelease))
    {   //
        // User can specify values in publishrc that override what;s in the package.json
        // file.  Manipulate the package.json file if needed
        //
        packageJsonModified = await npm.setPackageJson({options, logger});
    }

    //
    // Update relevant local files with the new version #
    //
    if (!options.taskMode)
    {
        await setVersions(context);
    }

    //
    // Build scipts (.publishrc)
    //
    if (!options.taskMode || options.taskBuild) {
        await util.runScripts({ options, logger, cwd, env }, "build", options.buildCommand, true, true);
        //
        // If this is task mode, we're done if there aren't any higher lvl tasks left to run
        //
        if (options.taskBuild) {
            logTaskResult(true, logger);
            if (!hasMoreTasks(options, getTasks5())) {
                return true;
            }
        }
    }

    //
    // Post-build scripts (.publishrc)
    //
    await util.runScripts({ options, logger, cwd, env }, "postBuild", options.postBuildCommand);

    //
    // NPM release
    //
    if (options.npmRelease === "Y" && (!options.taskMode || options.taskNpmRelease))
    {   //
        //   Run pre npm-release scripts if specified.  Ignored in task mode.
        //
        await util.runScripts({ options, logger, cwd, env }, "preNpmRelease", options.npmReleasePreCommand);
        //
        // Perform dist / network folder release
        //
        await npm.doNpmRelease(context);
        //
        //  Run pre npm-release scripts if specified.  Ignored in task mode.
        //
        await util.runScripts({options, logger, cwd, env}, "postNpmRelease", options.npmReleasePostCommand);
    }

    //
    // Dist (network share / directory) release
    //
    if (options.distRelease === "Y" && (!options.taskMode || options.taskDistRelease))
    {
        logger.log("Starting Distribution release");
        //
        // Run pre distribution-release scripts if specified.  Ignored in task mode.
        //
        await util.runScripts({ options, logger, cwd, env }, "preDistRelease", options.distReleasePreCommand);
        //
        // Perform dist / network folder release
        //
        await doDistRelease(context);
        //
        // Run pre distribution-release scripts if specified.  Ignored in task mode.
        //
        await util.runScripts({ options, logger, cwd, env }, "postDistRelease", options.distReleasePostCommand);
    }

    //
    // If a l4 task is processed, we'll be done
    //
    taskDone = await processTasks4(context);
    if (taskDone !== false) {
        logTaskResult(taskDone, logger);
        if (taskDone !== true || !hasMoreTasks(options, getTasks5())) {
            return taskDone;
        }
    }

    //
    // Github release
    //
    let githubReleaseId;
    if (options.repoType === "git" && options.githubRelease === "Y" && (!options.taskMode || options.taskGithubRelease))
    {   //
        // Pre-github release (.publishrc).  Ignored in task mode.
        //
        if (!options.taskMode) {
            await util.runScripts({ options, logger, cwd, env }, "preGithubRelease", options.githubReleasePreCommand);
        }
        //
        // Perform Github release
        //
        const ghRc = await doGithubRelease(context);
        if (options.taskMode && ghRc.error) {
            logTaskResult(ghRc.error, logger);
            return false;
        }
        //
        // Post-github release (.publishrc).  Ignored in task mode.
        //
        if (!options.taskMode) {
            await util.runScripts({ options, logger, cwd, env }, "postGithubRelease", options.githubReleasePostCommand);
        }
        //
        // Check task mode
        //
        else {
            // await publishGithubRelease({options, nextRelease, logger});
            logTaskResult(ghRc.error || true, logger);
            if (!hasMoreTasks(options, getTasks5())) {
                return true;
            }
        }
        //
        // Set flag to 'publish' release once changes are committed and tag is created
        //
        githubReleaseId = ghRc.id.toString();
    }

    //
    // MantisBT release
    //
    if (options.mantisbtRelease === "Y" && (!options.taskMode || options.taskMantisbtRelease))
    {   //
        // Pre-mantis release (.publishrc).  Ignored in task mode.
        //
        if (!options.taskMode) {
            await util.runScripts({ options, logger, cwd, env }, "preMantisRelease", options.mantisbtReleasePreCommand);
        }
        //
        // Perform MantisBT release
        //
        const mantisRc = await doMantisbtRelease(context);
        if (options.taskMode && mantisRc.error) {
            logTaskResult(mantisRc.error, logger);
            return false;
        }
        //
        // Post-mantis release scripts (.publishrc).  Ignored in task mode.
        //
        if (!options.taskMode) {
            await util.runScripts({ options, logger, cwd, env }, "postMantisRelease", options.mantisbtReleasePostCommand);
        }
        //
        // If this is task mode, we're done
        //
        else {
            logTaskResult(true, logger);
            if (!hasMoreTasks(options, getTasks5())) {
                return true;
            }
        }
    }

    //
    // Deployment scripts
    //
    if (!options.taskMode)
    {
        if (!options.dryRun)
        {
            await util.runScripts(context, "deploy", options.deployCommand); // (.publishrc)
        }
        else {
            logger.log("Skipped running custom deploy script");
        }
    }

    //
    // Notifiation email
    //
    if (!options.taskMode && (options.emailNotification === "Y" || options.taskEmail)) {
        await sendNotificationEmail(context, nextRelease.version);
    }

    //
    // Post - NPM release
    //
    if (packageJsonModified)
    {   //
        // Restore any configured package.json values to the original values
        //
        await npm.restorePackageJson(context);
    }

    //
    // Pre-commit scripts
    //
    await util.runScripts(context, "preCommit", options.preCommitCommand); // (.publishrc)

    //
    // Commit / Tag
    //
    if (!options.taskMode || options.taskCommit || options.taskTag)
    {   //
        // Commit
        //
        if (!options.taskTag || options.taskCommit || !options.taskMode)
        {
            try {
                await commit(context);
            }
            catch (e) {
                logger.warn(`Failed to committed changes for v${nextRelease.version}`);
                util.logWarning(context, "Manually commit the changes using the commit message format 'chore: vX.X.X'", e);
            }
        }
        //
        // Create the tag before calling the publish plugins as some require the tag to exists
        //
        if (!options.taskCommit || options.taskTag || !options.taskMode)
        {
            try {
                await tag(context);
                await push(context);
            }
            catch (e) {
                logger.warn(`Failed to tag v${nextRelease.version}`);
                util.logWarning(context, `Manually tag the repository using the tag '${nextRelease.tag}'`, e);
            }
            //
            // If there was a Github release made, then publish it and re-tag
            //
            // TODO - I think we can do just one release creation request at this point, and do
            // a 'draft: false' here, instead of doing it b4 the commit/tag, and then issuing a
            // patch request here
            //
            if (githubReleaseId) {
                try {
                    await publishGithubRelease(context, githubReleaseId);
                }
                catch (e) {
                    logger.warn(`Failed to tag v${nextRelease.version}`);
                    util.logWarning(context, "Manually publish the release using the GitHub website", e);
                }
            }
        }
        //
        // Revert all changes if dry run, and configured to do so
        //
        if (options.dryRun && options.dryRunVcRevert === "Y")
        {
            await revert(context);
        }
    }

    //
    // TODO - Plugins maybe?
    //
    // context.releases = await plugins.publish(context);
    // await plugins.success(context);

    //
    // Display changelog notes if this is a dry run
    //
    if (options.dryRun)
    {
        logger.log(`Release notes for version ${nextRelease.version}:`);
        if (context.changelog.notes)
        {
            if (options.changelogFile) {
                context.stdout.write(marked(context.changelog.notes));
            }
            else {
                context.stdout.write(context.changelog.notes.replace(/\r\n/g, "\n"));
            }
        }
    }

    //
    // Success
    //
    if (!options.taskMode) {
        logger.success((options.dryRun ? "Dry Run: " : "") + `Published release ${nextRelease.version}`);
    }
    else {
        logger.success((options.dryRun ? "Dry Run: " : "") + "Successfully completed task(s)");
    }

    return true; // pick(context, [ "lastRelease", "commits", "nextRelease", "releases" ]);
}


/**
 * Tasks that can be processed without retrieving commits and other tag related info
 *
 * @param context The run context object.
 */
async function processTasks1(context: IContext): Promise<boolean>
{
    const options = context.options;

    if (options.taskDevTest)
    {
        runDevCodeTests();
        return true;
    }
    else if (options.taskVersionCurrent)
    {
        const versionInfo = await getCurrentVersion(context);
        context.stdout.write(versionInfo.version);
        return true;
    }
    else if (options.taskVersionPreReleaseId && util.isString(options.taskVersionPreReleaseId))
    {
        let preRelId = "error",
            match: RegExpExecArray;
        if ((match = /^(?:v|V){0,1}[0-9.]+\-([a-z]+)\.{0,1}[0-9]*$/m.exec(options.taskVersionPreReleaseId)) !== null)
        {
            preRelId = match[1];
        }
        context.stdout.write(preRelId);
        return true;
    }

    return false;
}


/**
 * Tasks that can be processed without retrieving commits, but last release info is required
 *
 * @param context The run context object.
 */
async function processTasks2(context: IContext): Promise<boolean>
{
    if (context.options.taskEmail)
    {
        await sendNotificationEmail(context, context.lastRelease.version);
        return true;
    }
    return false;
}


/**
 * Tasks that can be processed without retrieving commits, but last and next release info
 * is required
 *
 * @param context The run context object.
 */
async function processTasks3(context: IContext): Promise<boolean>
{
    if (context.options.taskTouchVersions)
    {
        await setVersions(context);
        return true;
    }
    return false;
}


/**
 * Tasks that need to be processed "after" retrieving commits and other tag related info
 *
 * @param context The run context object.
 */
async function processTasks4(context: IContext): Promise<boolean>
{
    const options = context.options,
          logger = context.logger,
          lastRelease = context.lastRelease,
          nextRelease = context.nextRelease;

    if (options.taskVersionNext)
    {
        context.stdout.write(context.nextRelease.version);
        return true;
    }

    if (options.taskVersionInfo) {
        context.stdout.write(lastRelease.version + "|" + nextRelease.version);
        return true;
    }

    if (options.taskCiEnvSet)
    {
        logger.log("Write CI environment to file 'ap.env'");
        let fileContent = lastRelease.version + EOL + nextRelease.version + EOL;
        if (options.historyFile) {
            fileContent += (options.historyFile + EOL);
        }
        else if (options.changelogFile) {
            fileContent += (options.changelogFile + EOL);
        }
        await writeFile("ap.env", fileContent);
        return true;
    }

    if (options.taskCiEnvInfo)
    {
        if (options.historyFile) {
            context.stdout.write(`${lastRelease.version}|${nextRelease.version}|${options.historyFile}`);
        }
        else if (options.changelogFile) {
            context.stdout.write(`${lastRelease.version}|${nextRelease.version}|${options.changelogFile}`);
        }
        else {
            context.stdout.write(`${lastRelease.version}|${nextRelease.version}`);
        }
        return true;
    }

    // if (szOutputFile) {
    //     writeFileSync(szOutputFile, szFinalContents);
    //     logger.log("   Saved release history output to $szOutputFile");
    // }

    return false;
}


function getTasks3()
{
    return [ "taskTouchVersions" ];
}


function getTasks4()
{
    return [ "taskCiEnvInfo", "taskCiEnvSet", "taskVersionInfo", "taskVersionNext" ];
}


function getTasks5()
{
    return [ "taskCommit", "taskDistRelease", "taskGithubRelease", "taskMantisbtRelease",
             "taskNpmRelease", "taskNugetRelease", "taskTag" ];
}


function logErrors({ logger, stderr }, err)
{
    const errors = util.extractErrors(err).sort(error => (error.semanticRelease ? -1 : 0));
    for (const error of errors)
    {
        if (error.semanticRelease)
        {
            logger.error(`${error.code} ${error.message}`);
            if (error.details)
            {
                stderr.write(marked(error.details));
            }
        }
        else {
            logger.error("An error occurred while running app-publisher: %O", error);
        }
    }
}


async function callFail(context: IContext, plugins, err)
{
    //
    // Revert all changes if dry run, and configured to do so
    //
    if (context.options.dryRun && context.options.dryRunVcRevert)
    {
        await revert(context);
    }

    const errors = util.extractErrors(err).filter(err => err.semanticRelease);
    if (errors.length > 0)
    {
        try
        {
            await plugins.fail({ ...context, errors });
        } catch (error)
        {
            logErrors(context, error);
        }
    }
}


export = async (opts = {}, { cwd = process.cwd(), env = process.env, stdout = undefined, stderr = undefined } = {}) =>
{
    const { unhook } = hookStd(
        { silent: false, streams: [process.stdout, process.stderr, stdout, stderr].filter(Boolean) },
        hideSensitive(env)
    );

    const context: IContext = {
        cwd, env,
        stdout: stdout || process.stdout,
        stderr: stderr || process.stderr,
        logger: undefined,
        options: undefined,
        lastRelease: undefined,
        nextRelease: undefined,
        commits: undefined,
        changelog: undefined
    };
    context.logger = getLogger(context);

    try
    {
        const { plugins, options } = await getConfig(context, opts);
        context.options = options;
        try
        {
            const result = await run(context, plugins);
            unhook();
            return result;
        }
        catch (error)
        {
            await callFail(context, plugins, error);
            throw error;
        }
    }
    catch (error)
    {
        logErrors(context, error);
        unhook();
        throw error;
    }
};
