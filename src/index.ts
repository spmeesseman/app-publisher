
import * as util from "./lib/utils/utils";
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
import { getNextVersion } from "./lib/version/get-next-version";
import getLastRelease = require("./lib/get-last-release");
import getGitAuthUrl = require("./lib/get-git-auth-url");
import getLogger = require("./lib/get-logger");
import validateOptions = require("./lib/validate-options");
import doDistRelease = require("./lib/releases/dist");
import { doGithubRelease, publishGithubRelease } from "./lib/releases/github";
import doMantisbtRelease = require("./lib/releases/mantisbt");
import setVersions = require("./lib/version/set-versions");
import { last, template } from "lodash";
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
            if (options[o] === true || (o === "taskChangelogPrintVersion" && options[o]) || (o === "taskChangelogViewVersion" && options[o])) {
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
        logger.error("A new version won’t be published");
        return false;
    }
    else if (ciBranch !== options.branch && !options.taskModeStdOut)
    {
        logger.warn(`This ${runTxt} was triggered on the branch '${ciBranch}', but is configured to ` +
                    `publish from '${options.branch}'`);
        logger.warn("Continuing in non-ci environment");
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
            await revertChanges(context);
            logger.error("Release run returned failure status");
        }
    }
    catch (e) {
        await callFail(context, plugins, e);
        const eStr = e.toString();
        logger.error("Release run threw failure exception");
        if (eStr.endsWith("\n")) {
            context.stdout.write(`Exception:  ${eStr}${EOL}`);
        }
        else {
            logger.error(eStr);
        }
    }

    return success;
}


function logTaskResult(result: boolean | string, taskName: string, logger: any)
{
    if (util.isString(result)) {
        logger.error(result);
    }
    else if (result === true) {
        logger.success(`Successfully completed task ${taskName}`);
    }
}


async function runRelease(context: IContext, plugins: any)
{
    const { options, logger } = context;

    const nextRelease: INextRelease = context.nextRelease = {
        level: undefined,
        head: undefined,
        version: undefined,
        tag: undefined,
        edits: [],
        versionInfo: undefined
    };

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
    // If 'revert tak', we can just revertand exit.  setVersions() will recognize the
    // task and only populate a list of files that 'would be' or 'have been' edited by
    // a run.  Files that the run doesnt touch that have been edited by the user wont get
    // reverted (or someone be in trouble)
    //
    if (options.taskRevert)
    {
        await setVersions(context);
        await revert(context);
        return true;
    }

    //
    // If a level-1 stdout task is processed, we'll be done
    //
    let taskDone = await processTasksStdOut1(context);
    if (taskDone) {
        logTaskResult(taskDone, "stdout level 1", logger);
        return taskDone;
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
    // validateOptions() will have attempted to set repo
    //
    if (!options.repo) {
        logger.error("Repository tmust be specified on cmd line, package.json or publishrc");
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
    // Populate context with last release info, populates version number, uses
    // remote method with getTags()
    //
    const lastRelease = await getLastRelease(context);

    //
    // Populate context with last release version info, parsed from local version files
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
        if (!options.taskMode && !options.republish)
        {
            logger.error("Version mismatch found between latest tag and local files");
            logger.error("   Tagged : " + lastRelease.version);
            logger.error("   Local  : " + lastRelease.versionInfo.version);
            logger.error("Need to correct versioning difference, exiting");
            throw new Error("101");
        }
        else {
            logger.warn("Version mismatch found between latest tag and local files");
            logger.warn(`   Continuing in ${options.taskMode ? "task" : "republish"} mode`);
            lastRelease.versionInfo.version = lastRelease.version;
        }
    }

    //
    // Populate context with last release info
    //
    context.lastRelease = lastRelease;

    //
    // needNoCommits
    //
    const needNoCommits = options.taskChangelogPrintVersion || options.taskChangelogViewVersion;

    //
    // Populate context with commits
    //
    if (!options.versionForceCurrent && !needNoCommits) {
        context.commits = await getCommits(context);
    }
    else {
        context.commits = [];
    }

    if (!options.versionForceCurrent)
    {
        nextRelease.level = await getReleaseLevel(context);
        nextRelease.head = await getHead(context);
    }
    else if (options.verbose) {
        logger.log("Skip release level calc and head rev retrieval, versionForceCurrent=true");
    }

    //
    // If there were no commits that set the release level to 'patch', 'minor', or 'major',
    // then we're done
    //
    if (!nextRelease.level && !needNoCommits)
    {   //
        // There are certain tasks a user may want to run after a release is made.  e.g. re-send
        // a notification email, or redo a Mantis or GitHub release. In these cases, user must
        // pass the --version-force-current switch on the command line.
        // validateOptions() willhave made sure that only certin tasks are run with this switch
        //
        if (!options.versionForceCurrent)
        {
            if (options.taskVersionCurrent || options.taskVersionNext) {
                context.stdout.write(lastRelease.version);
                return true;
            }
            logger.log("There are no relevant commits, no new version is released.");
            return false;
        }
    }

    //
    // Next version
    //
    if (!options.versionForceCurrent && !needNoCommits)
    {
        nextRelease.versionInfo = getNextVersion(context);
        if (options.versionForceNext)
        {
            logger.log("Forcing next version to " + options.versionForceNext);
            nextRelease.version = options.versionForceNext;
            if (!util.validateVersion(nextRelease.version, lastRelease.version, logger))
            {
                logger.error("Invalid 'next version' specified");
                return false;
            }
        }
        else {
            nextRelease.version = nextRelease.versionInfo.version;
            if (options.promptVersion === "Y")
            {
                const promptSchema = {
                    properties: {
                        version: {
                            description: "Enter version number",
                            pattern: /^(?:[0-9]+\.[0-9]+\.[0-9]+(?:[\-]{0,1}[a-zA-Z]+\.[0-9]+){0,1})$|^[0-9]+$/,
                            default: nextRelease.version,
                            message: "Version must only contain 0-9, '.', chars and '-' for pre-release",
                            required: false
                        }
                    }
                };
                const prompt = require("prompt");
                prompt.start();
                const { version } = await prompt.get(promptSchema);
                if (version) {
                    nextRelease.version = version;
                    if (!util.validateVersion(nextRelease.version, lastRelease.version, logger))
                    {
                        logger.error("Invalid 'next version' specified");
                        return false;
                    }
                }
            }
        }
    }
    else {
        logger.log("Force next version to current version " + lastRelease.version);
        nextRelease.versionInfo = lastRelease.versionInfo;
        nextRelease.version = lastRelease.version;
    }

    //
    // If a level2 stdout/fileout task is processed, we'll be done
    //
    taskDone = await processTasksStdOut2(context);
    if (taskDone) {
        logTaskResult(taskDone, "stdout level 2", logger);
        return taskDone;
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
    const doChangelog = !options.versionForceCurrent && (options.taskChangelog || options.taskChangelogView ||
                        options.taskChangelogPrint || options.taskChangelogHtmlView || options.taskChangelogFile ||
                        options.taskChangelogPrintVersion || options.taskChangelogViewVersion || !options.taskMode);
    if (doChangelog)
    {   //
        // We need to populate 'notes' right now for the changelog/history file edit.
        // populateChangelogs() does the rest of the work below after the changelog file edit
        //
        if (!options.taskChangelogPrintVersion && !options.taskChangelogViewVersion) {
            context.changelog.notes = createSectionFromCommits(context);
        }
        //
        // Do edit/view
        //
        await doEdit(context);
        //
        // If this is task mode, we're done maybe
        //
        if (options.taskMode) {
            logTaskResult(true, "changelog*", logger);
            // if (!options.taskChangelog) {
                return true;
            // }
        }
    }

    //
    // Create release notes / changelog
    // TODO - Plugins maybe?
    //
    // context.changelog.notes = await plugins.generateNotes(context);
    //
    // TODO - can probably do some more options checking in populateChangelog so that they
    // arent built under certin task mode conditions
    //
    await populateChangelogs(context);

    //
    // Pre-build scipts (.publishrc)
    // Scripts that are run before manipluation of the verson files and before any build
    // scripts are ran.
    //
    await util.runScripts(context, "preBuild", options.preBuildCommand, options.taskBuild, true, true);

    //
    // Pre - NPM release
    // We can manipulate the package.json file for an npm release with various properties
    // on the options object.  Can be used to release the same build to multiple npm
    // repositories.  THis needs to be done now before any version edits are made and before
    // any build scripts are ran.
    //
    let packageJsonModified = false;
    if (options.npmRelease === "Y" && (!options.taskMode || options.taskNpmRelease || options.taskNpmJsonUpdate))
    {
        packageJsonModified = await npm.setPackageJson(context);
        // if (options.taskVersionUpdate) { // for taskVersionUpdate, we don't restore
        //     packageJsonModified = false;
        // }
        if (packageJsonModified)
        {   //
            // If this is task mode, we're done maybe
            //
            if (options.taskNpmJsonUpdate) {
                logTaskResult(true, "npm json update", logger);
                if (!options.taskVersionUpdate) { // && !options.taskBuild) {
                    return true;
                }
            }
            else if (options.taskNpmRelease) {
                logger.log("The package.json file has been updated for 'NPM release' task");
            }
        }
    }

    //
    // Update relevant local files with the new version #
    //
    if (!options.versionForceCurrent && (!options.taskMode || options.taskVersionUpdate))
    {   //
        // Sets next version in all version files.  Includes files spcified in .publishrc
        // by the 'versionFiles' property
        //
        await setVersions(context);
        //
        // If this is task mode, we're done maybe
        //
        if (options.taskVersionUpdate) {
            logTaskResult(true, "version update", logger);
            // if (!options.taskBuild) {
                return true;
            // }
        }
    }

    //
    // Build scipts (.publishrc)
    //
    await util.runScripts(context, "build", options.buildCommand, options.taskBuild, true, true);
    //
    // If this is task mode, lof this task's result
    //
    if (options.taskBuild) {
        logTaskResult(true, "build", logger);
    }

    //
    // Post-build scripts (.publishrc)
    //
    await util.runScripts(context, "postBuild", options.postBuildCommand, options.taskBuild);

    //
    // NPM release
    //
    if (options.npmRelease === "Y" && (!options.taskMode || options.taskNpmRelease))
    {   //
        //   Run pre npm-release scripts if specified.
        //
        await util.runScripts(context, "preNpmRelease", options.npmReleasePreCommand, options.taskNpmRelease);
        //
        // Perform dist / network folder release
        //
        await npm.doNpmRelease(context);
        //
        // If this is task mode, we're done maybe
        //
        if (options.taskNpmRelease) {
            logTaskResult(true, "npm release", logger);
            return true;
        }
        //
        //  Run pre npm-release scripts if specified.
        //
        await util.runScripts(context, "postNpmRelease", options.npmReleasePostCommand, options.taskNpmRelease);
    }

    //
    // Dist (network share / directory) release
    //
    if (options.distRelease === "Y" && (!options.taskMode || options.taskDistRelease))
    {
        logger.log("Starting Distribution release");
        //
        // Run pre distribution-release scripts if specified.
        //
        await util.runScripts(context, "preDistRelease", options.distReleasePreCommand, options.taskDistRelease);
        //
        // Perform dist / network folder release
        //
        await doDistRelease(context);
        //
        // If this is task mode, we're done maybe
        //
        if (options.taskDistRelease) {
            logTaskResult(true, "dist release", logger);
            return true;
        }
        //
        // Run pre distribution-release scripts if specified.
        //
        await util.runScripts(context, "postDistRelease", options.distReleasePostCommand, options.taskDistRelease);
    }

    //
    // Github release
    //
    // At this point, we make an "un-published/draft" release if this is a full publish run.
    // After the repository is tagged with the version tag and everything else has succeeded,
    // the release is updated/patched to a 'released/non-draft' state.
    // If this is a 'taskGithubRelease' task, then we immediately make a 'published/non-draft'
    // release.  In this mode, the repository will be tagged with the version tag vX.Y.Z if it
    // didnt exist already.
    //
    let githubReleaseId;
    if (options.repoType === "git" && options.githubRelease === "Y" && (!options.taskMode || options.taskGithubRelease))
    {   //
        // Pre-github release (.publishrc).
        //
        await util.runScripts(context, "preGithubRelease", options.githubReleasePreCommand, options.taskGithubRelease);
        //
        // Perform Github release
        //
        const ghRc = await doGithubRelease(context);
        if (options.taskMode && ghRc.error) {
            logTaskResult(ghRc.error, "github release", logger);
            return false;
        }
        else if (options.taskGithubRelease) {
            logTaskResult(true, "github release", logger);
        }
        //
        // Post-github release (.publishrc).
        //
        await util.runScripts(context, "postGithubRelease", options.githubReleasePostCommand, options.taskGithubRelease);
        //
        // Set flag to 'publish' release once changes are committed and tag is created
        //
        githubReleaseId = ghRc.id.toString();
    }

    //
    // MantisBT release
    //
    // The Mantis 'Releases' plugin required
    //    @ https://github.com/mantisbt-plugins/Releases
    //
    if (options.mantisbtRelease === "Y" && (!options.taskMode || options.taskMantisbtRelease))
    {   //
        // Pre-mantis release scripts (.publishrc).
        //
        await util.runScripts(context, "preMantisRelease", options.mantisbtReleasePreCommand, options.taskMantisbtRelease);
        //
        // Perform MantisBT release
        //
        const mantisRc = await doMantisbtRelease(context);
        if (options.taskMode && mantisRc.error) {
            logTaskResult(mantisRc.error, "mantisbt release", logger);
            return false;
        }
        if (options.taskMantisbtRelease) {
            logTaskResult(true, "mantisbt release", logger);
        }
        //
        // Post-mantis release scripts (.publishrc).
        //
        await util.runScripts(context, "postMantisRelease", options.mantisbtReleasePostCommand, options.taskMantisbtRelease);
    }

    //
    // Deployment scripts (.publishrc)
    //
    if (options.taskDeploy || !options.taskMode)
    {
        if (!options.dryRun || options.taskDeploy)
        {
            if (options.taskDeploy) {
                logger.log("Run deployment in dry-run mode to 'deployment task' options");
            }
            await util.runScripts(context, "deploy", options.deployCommand, options.taskDeploy);
        }
        else {
            logger.log("Skipped running custom deploy script");
        }
    }

    //
    // Notification email
    //
    if (options.emailNotification === "Y" && (!options.taskMode || options.taskEmail)) {
        await sendNotificationEmail(context, nextRelease.version);
        if (options.taskEmail) {
            logTaskResult(true, "email notification", logger);
        }
    }

    //
    // Post NPM release - restore package.json properties if necessary
    // Restore any configured package.json values to the original values
    //
    if (packageJsonModified || options.taskNpmJsonRestore) {
        await npm.restorePackageJson(context);
    }

    //
    // Commit / Tag
    //
    if (!options.taskMode || options.taskCommit || options.taskTag)
    {   //
        // Commit
        //
        if (!options.taskTag || options.taskCommit || !options.taskMode)
        {   //
            // Pre-commit scripts
            //
            await util.runScripts(context, "preCommit", options.preCommitCommand); // (.publishrc)
            //
            // Commit changes to vcs
            //
            try {
                await commit(context);
            }
            catch (e) {
                logger.warn(`Failed to commit changes for v${nextRelease.version}`);
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
        await revertChanges(context);
    }

    //
    // TODO - Plugins maybe?
    //
    // context.releases = await plugins.publish(context);
    // await plugins.success(context);

    //
    // Display changelog notes if this is a dry run
    //
    if (options.dryRun && !options.taskMode)
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
        logger.success((options.dryRun ? "Dry Run: " : "") + "Successfully completed all task(s)");
    }

    return true; // pick(context, [ "lastRelease", "commits", "nextRelease", "releases" ]);
}


/**
 * Tasks that can be processed without retrieving commits and other tag related info
 *
 * @param context The run context object.
 */
async function processTasksStdOut1(context: IContext): Promise<boolean>
{
    const options = context.options;

    if (options.taskDevTest)
    {
        runDevCodeTests(context);
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
 * Tasks that need to be processed "after" retrieving commits and other tag related info
 *
 * @param context The run context object.
 */
async function processTasksStdOut2(context: IContext): Promise<boolean>
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

    return false;
}


function getTasks2()
{
    return [ "taskCiEnvInfo", "taskCiEnvSet", "taskVersionInfo", "taskVersionNext" ];
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


async function revertChanges(context: IContext)
{//
    // Revert all changes if dry run, and configured to do so
    //
    if (context.options.dryRun && context.options.dryRunVcRevert)
    {
        await revert(context);
    }
}


async function callFail(context: IContext, plugins, err)
{
    await revertChanges(context);
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
