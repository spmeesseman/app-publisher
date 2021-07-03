
import * as path from "path";
import * as util from "./lib/utils/utils";
import * as npm from "./lib/releases/npm";
import semver from "semver";
import gradient from "gradient-string";
import chalk from "chalk";
import marked from "marked";
import TerminalRenderer from "marked-terminal";
import hookStd from "hook-std";
import hideSensitive = require("./lib/hide-sensitive");
import getReleaseLevel = require("./lib/commit-analyzer");
import verify = require("./lib/verify");
import getCommits = require("./lib/get-commits");
import getContext from "./lib/get-context";
import getCurrentVersion = require("./lib/version/get-current-version");
import doMantisbtRelease = require("./lib/releases/mantisbt");
import setVersions = require("./lib/version/set-versions");
import getLastRelease = require("./lib/get-last-release");
import getGitAuthUrl = require("./lib/get-git-auth-url");
import validateOptions = require("./lib/validate-options");
import doDistRelease = require("./lib/releases/dist");
import runDevCodeTests = require("./test");
import { publishRcOpts } from "./args";
import { getNextVersion } from "./lib/version/get-next-version";
import { doGithubRelease, publishGithubRelease } from "./lib/releases/github";
import { last, template } from "lodash";
import { COMMIT_NAME, COMMIT_EMAIL, FIRST_RELEASE } from "./lib/definitions/constants";
import { sendNotificationEmail } from "./lib/email";
import { writeFile } from "./lib/utils/fs";
import { commit, fetch, verifyAuth, getHead, tag, push, revert, addEdit } from "./lib/repo";
import { EOL } from "os";
import { IContext, INextRelease, IOptions } from "./interface";
import { ChangelogMd } from "./lib/changelog/changelog-md";
import { ChangelogTxt } from "./lib/changelog/changelog-txt";
const displayHelp = require("@spmeesseman/arg-parser").displayHelp;


marked.setOptions({ renderer: new TerminalRenderer() });


async function runStart(context: IContext)
{
    const { env, options, logger } = context;
    const runTxt = !options.dryRun ? "run" : "test run";
    const {
        isCi, branch: ciBranch, isPr, name: ciName, root: ciRoot, build: ciBuild, buildUrl: ciBuildUrl, commit: ciCommit
    } = options.ciInfo;

    //
    // If user specified '-h' or --help', then just display help and exit
    //
    if (options.help)
    {
        const title =
`----------------------------------------------------------------------------
Detailed Help
----------------------------------------------------------------------------
`;
        context.stdout.write(chalk.bold(gradient("cyan", "pink").multiline(title, {interpolation: "hsv"})));
        displayHelp(publishRcOpts);
        return 0;
    }

    //
    // If user specified '--version', then just display version and exit
    //
    if (options.version)
    {
        const title =
`----------------------------------------------------------------------------
 App-Publisher Version :  ${options.appPublisherVersion}
----------------------------------------------------------------------------
`;
        context.stdout.write(chalk.bold(gradient("cyan", "pink").multiline(title, {interpolation: "hsv"})));
        return 0;
    }

    //
    // If user specified 'cfg' or '--config', then just display config and exit
    //
    if (options.config || options.verbose)
    {
        const title =
`----------------------------------------------------------------------------
 Pre-Validation Options Object
----------------------------------------------------------------------------
`;
        context.stdout.write(chalk.bold(gradient("cyan", "pink").multiline(title, {interpolation: "hsv"})));
        context.stdout.write(JSON.stringify(options, undefined, 3));
        if (options.config) {
            return 0;
        }
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
        return 0;
    }

    //
    // Display mode - bin mode, or node env
    //
    if (!options.taskModeStdOut)
    {
        const mode = options.isNodeJsEnv ? "Node.js" : "bin mode";
        context.stdout.write(EOL);
        logger.log("Loaded config from " + options.configFilePath);
        logger.log(`Running in ${mode}`);
    }

    //
    // Set branch to CI branch if not already set
    //
    if (!options.branch) {
        options.branch = ciBranch;
    }

    //
    // Check CI environment
    //
    if (!isCi && !options.dryRun && !options.noCi)
    {
        logger.error("This run was not triggered in a known CI environment, use --no-ci flag for local publish.");
        return 1;
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
        return 1;
    }

    if (ciBranch !== options.branch)
    {
        const ciMsg = `This ${runTxt} was triggered on the branch '${ciBranch}', but is configured to ` +
                      `publish from '${options.branch}'`;
        if (isCi) {
            logger.error(ciMsg);
            logger.error("A new version won’t be published");
            return 1;
        }
        else if (!options.taskModeStdOut) {
            logger.warn(ciMsg);
            logger.warn("Continuing in non-ci environment");
        }
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

    try {
        const success = await runRelease(context);
        if (!success) {
            await revertChanges(context);
            logger.error("Release run returned failure status");
            return 1;
        }
    }
    catch (e) {
        await callFail(context, e);
        return 1;
    }

    return 0;
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


async function runRelease(context: IContext)
{
    let firstRelease = false;
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
    // Get the IChangelog for thus run
    //
    // The changelog object can have 3 parts, 'fileNotes' that are read from the changelog file
    // itself, 'notes' with are buiilt from the commit messages, and htmlNotes which are built
    // from the changelog file itself and converted to html style changelog for GitHub and
    // MantisBT releases.
    //
    if (path.extname(options.changelogFile) !== ".txt") {
        context.changelog = new ChangelogMd(context);
    }
    else {
        context.changelog = new ChangelogTxt(context);
    }

    //
    // STDOUT TASKS
    // If a level-1 stdout task is processed, we'll be done.  taskDone returns `true` if
    // a task ran auccessfully, `false` if no task ran, and a `string` if there was an error
    //
    let taskDone = await processTasksLevel1(context);
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
    // Some tasks we can just process and exit after authentication verification, without
    // any other processing
    //
    taskDone = await processTasksLevel2(context);
    if (taskDone) {
        logTaskResult(taskDone, "standard level 1", logger);
        return taskDone;
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
    // Populate context with last release version info, parsed from local version files
    //
    //    version (should be same as context.lastRelease.version)
    //    versionSystem (semver or incremental)
    //    versionInfo (for mavn builds and auto constructing version #)
    //
    const lastVersionInfo = await getCurrentVersion(context);
    //
    // Populate context with last release info, populates version number, uses
    // remote method with getTags()
    //
    const lastRelease = await getLastRelease(context, lastVersionInfo);

    //
    // Check to see if last version found with the latestversion tag matches what was
    // found by examining the local files for version info.  Give a warning if so.
    //
    if (lastRelease.version !== lastRelease.versionInfo.version)
    {
        if (!lastRelease.version && !lastRelease.tag) // if both undefined, then getTags() found no remote tags
        {
            logger.warn("There was no remote version tag found, this is a first release");
            logger.warn("   Continuing");
            firstRelease = true;
        }
        else if (!options.taskMode && !options.republish)
        {
            logger.error("Version mismatch found between latest tag and local files");
            logger.error("   Tagged : " + lastRelease.version);
            logger.error("   Local  : " + lastRelease.versionInfo.version);
            logger.error("Need to correct versioning difference, exiting");
            return false;
        }
        else {
            logger.warn("Version mismatch found between latest tag and local files");
            logger.warn(`   Continuing in ${options.taskMode ? "task" : "republish"} mode`);
        }
    }

    //
    // Populate context with last release info
    //
    context.lastRelease = lastRelease;

    //
    // Some tasks we can just process and exit after authentication verification, without
    // any other processing
    //
    taskDone = await processTasksLevel3(context);
    if (taskDone) {
        logTaskResult(taskDone, "standard level 1", logger);
        return taskDone;
    }

    //
    // needNoCommits
    // The taskChangelogPrintVersion and taskChangelogViewVersion tasks just display a
    // section from the changelog (specified by version), so its referencing an existing
    // version, no need to look at ay commits or anything like that.
    //
    const needNoCommits = options.taskChangelogPrintVersion || options.taskChangelogViewVersion;
    //
    // Populate context with commits.  Retrieve all commits since the previous version tag,
    // or all commits if a version tag does not exist.
    //
    if (!options.versionForceCurrent && !needNoCommits) {
        context.commits = await getCommits(context);
    }
    else {
        context.commits = [];
    }

    //
    // Set the release level based on commit messages, and retrieve the HEAD revision.
    //
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
    if (!nextRelease.level && !needNoCommits && lastRelease.versionInfo.system === "semver")
    {   //
        // There are certain tasks a user may want to run after a release is made.  e.g. re-send
        // a notification email, or redo a Mantis or GitHub release. In these cases, user must
        // pass the --version-force-current switch on the command line.
        // validateOptions() willhave made sure that only certin tasks are run with this switch
        //
        if (!options.versionForceCurrent)
        {
            if (options.taskVersionNext) {
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
    {   //
        // Get version using release level bump.  Sets to FIRST_RELEASE if no previous release.
        //
        nextRelease.versionInfo = getNextVersion(context);
        //
        // Check 'next version' manipulation flags
        //
        if (options.versionForceNext)
        {
            logger.log("Forcing next version to " + options.versionForceNext);
            logger.log("   From version : " + nextRelease.versionInfo.version);
            logger.log("   Last version : " + lastRelease.version);
            nextRelease.version = options.versionForceNext;
            if (!util.validateVersion(nextRelease.version, nextRelease.versionInfo.system, lastRelease.version, logger))
            {
                logger.error("Invalid 'next version' specified");
                return false;
            }
        }
        else {
            nextRelease.version = nextRelease.versionInfo.version;
            //
            // Note that in the case of firstRelease == true, nextRelease.version == FIRST_RELEASE,
            // lastRelease.version == undefined, and lastRelease.versionInfo.version == current_file_version
            //
            const firstReleaseMismatch = firstRelease && semver.gt(lastRelease.versionInfo.version, nextRelease.version);
            if (options.promptVersion === "Y" || (options.noCi && firstReleaseMismatch))
            {
                if (firstRelease && options.promptVersion !== "Y") {
                    logger.log("Prompting for version due to:");
                    logger.log("    1. The 'no-ci' and 'first-release' flags are set");
                    logger.log(`    2. The version extracted from local files ${lastRelease.versionInfo.version} > ${FIRST_RELEASE}`);
                }
                nextRelease.version = await promptForVersion(lastRelease.version, lastRelease.versionInfo.system, nextRelease.version || FIRST_RELEASE, logger);
                if (!nextRelease.version) {
                    return false;
                }
            }
            else if (firstReleaseMismatch)
            {
                logger.error("There is a conflict with the version extracted from the local version files");
                logger.error(`   No remote tag was found, but local version > ${FIRST_RELEASE}`);
                logger.error("   Either use the --force-version-next option, or, publish in a non-ci environment");
                return false;
            }
        }
    }
    else {
        if (firstRelease && options.versionForceCurrent) {
            logger.error("Cannot use the --version-force-current switch for a first release");
            return false;
        }
        logger.log("Force next version to current version " + lastRelease.version);
        nextRelease.versionInfo = lastRelease.versionInfo;
        nextRelease.version = lastRelease.version;
    }

    //
    // Get the tag name for the next release
    //
    nextRelease.tag = template(options.tagFormat)({ version: nextRelease.version });

    //
    // STDOUT TASKS
    // If a level2 stdout/fileout task is processed, we'll be done.  taskDone returns `true` if
    // a task ran auccessfully, `false` if no task ran, and a `string` if there was an error
    //
    taskDone = await processTasksLevel4(context);
    if (taskDone) {
        logTaskResult(taskDone, "stdout level 2", logger);
        return taskDone;
    }

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
            context.changelog.notes = context.changelog.createSectionFromCommits(context);
        }
        //
        // Do edit/view
        //
        await context.changelog.doEdit(context);
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
    await context.changelog.populate(context, !!doChangelog);

    //
    // Pre-build scipts (.publishrc)
    // Scripts that are run before manipluation of the verson files and before any build
    // scripts are ran.
    //
    await util.runScripts(context, "preBuild", options.preBuildCommand, options.taskBuild, true);

    //
    // Pre - NPM release - Package.json manipulation for multi-destination releases.
    //
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
    // Build scripts
    //
    if (options.buildCommand && options.buildCommand.length > 0 && (!options.taskMode || options.taskBuild))
    {
        await util.runScripts(context, "build", options.buildCommand, options.taskBuild, true);
        //
        // Post-build scripts (.publishrc)
        //
        await util.runScripts(context, "postBuild", options.postBuildCommand, options.taskBuild);
        //
        // If this is task mode, lof this task's result
        //
        if (options.taskBuild) {
            logTaskResult(true, "build", logger);
        }
    }

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
        //  Run pre npm-release scripts if specified.
        //
        await util.runScripts(context, "postNpmRelease", options.npmReleasePostCommand, options.taskNpmRelease);
        //
        // If this is task mode, we're done maybe
        //
        if (options.taskNpmRelease) {
            logTaskResult(true, "npm release", logger);
            return true;
        }
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
        // Run pre distribution-release scripts if specified.
        //
        await util.runScripts(context, "postDistRelease", options.distReleasePostCommand, options.taskDistRelease);
        //
        // If this is task mode, we're done maybe
        //
        if (options.taskDistRelease) {
            logTaskResult(true, "dist release", logger);
            return true;
        }
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
        //
        // Post-github release (.publishrc).
        //
        await util.runScripts(context, "postGithubRelease", options.githubReleasePostCommand, options.taskGithubRelease);
        if (options.taskMode && ghRc.error) {
            logTaskResult(ghRc.error, "github release", logger);
            return false;
        }
        else if (options.taskGithubRelease) {
            logTaskResult(true, "github release", logger);
        }
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
        //
        // Post-mantis release scripts (.publishrc).
        //
        await util.runScripts(context, "postMantisRelease", options.mantisbtReleasePostCommand, options.taskMantisbtRelease);
        if (options.taskMode && mantisRc.error) {
            logTaskResult(mantisRc.error, "mantisbt release", logger);
            return false;
        }
        if (options.taskMantisbtRelease) {
            logTaskResult(true, "mantisbt release", logger);
        }
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
    if (!options.taskMode)
    {
        await commitAndTag(context, githubReleaseId);
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


async function commitAndTag(context: IContext, githubReleaseId: string)
{
    const { options, logger, nextRelease } = context;
    //
    // Commit
    //
    if (options.taskCommit || (!options.taskMode && options.skipCommit !== "Y"))
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
    if (options.taskTag || (!options.taskMode && options.skipTag !== "Y"))
    {
        try {
            await tag(context);
            await push(context); // doesnt do anything for svn
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
    // Revert all changes - only reverts if dry run, and configured to do so
    //
    await revertChanges(context);
}


/**
 * Tasks that can be processed without retrieving commits and other tag related info
 * including authentication verification with the VCS.
 *
 * @param context The run context object.
 */
async function processTasksLevel1(context: IContext): Promise<string | boolean>
{
    const options = context.options;

    if (options.taskDevTest)
    {
        runDevCodeTests(context);
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
 * Tasks that can be processed before version info is obtained, but after authentication
 * is verified with the VCS.
 *
 * @param context The run context object.
 */
async function processTasksLevel2(context: IContext): Promise<string | boolean>
{
    const options = context.options;

    //
    // Use setVersions() will recognize the task and only populate a list of files that
    // 'would be' or 'have been' edited by a run.  Files that the run doesnt touch that
    // have been edited by the user wont get reverted (or someone be in trouble)
    //
    if (options.taskRevert)
    {
        await addEdit(context, options.changelogFile);
        await setVersions(context, true);
        await revert(context);
        return true;
    }

    return false;
}


/**
 * Tasks that can be processed once version info is obtained
 *
 * @param context The run context object.
 */
async function processTasksLevel3(context: IContext): Promise<string | boolean>
{
    const { options, lastRelease, nextRelease } = context;

    //
    // STDOUT TASKS
    // Task '--task-version-current'
    //
    if (options.taskVersionCurrent)
    {
        context.stdout.write(lastRelease.version || FIRST_RELEASE);
        // logTaskResult(true, "task version current", logger);
        return true;
    }

    //
    // Tasks --task-commit / --task-tag
    // When these tasks are used, the local version files should be updated with the new
    // version already from a '--task-version-update' run.  lastRelease.versionInfo.version
    // will contain the new version read from the local files.  lastRelease.version will have
    // been set to the current version that was read from the version tags.
    //
    if (options.taskCommit || options.taskTag)
    {
        if (options.taskTagVersion) {
            if (!util.validateVersion(options.taskTagVersion, lastRelease.versionInfo.system)) {
                return `Invalid version provided with --task-tag-version : ${options.taskTagVersion}`;
            }
        }
        nextRelease.version = options.taskTagVersion || lastRelease.versionInfo.version;
        nextRelease.tag = template(options.tagFormat)({ version: nextRelease.version });
        await addEdit(context, options.changelogFile);
        await setVersions(context, true);
        await commitAndTag(context, undefined);
        return true;
    }

    return false;
}


/**
 * Tasks that need to be processed after retrieving commits and populating the
 * nextRelease object, but before any of the editing, build, and release operations
 * take place (i.e. just before the changelog edit stage and the following release
 * type processing).
 *
 * @param context The run context object.
 */
async function processTasksLevel4(context: IContext): Promise<string | boolean>
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
        context.stdout.write(lastRelease.version + "|" + nextRelease.version + "|" + nextRelease.level);
        return true;
    }

    if (options.taskCiEnvSet)
    {
        logger.log("Write CI environment to file 'ap.env'");
        let fileContent = lastRelease.version + EOL + nextRelease.version + EOL;
        if (options.changelogFile) {
            fileContent += (options.changelogFile + EOL);
        }
        await writeFile("ap.env", fileContent);
        return true;
    }

    if (options.taskCiEnvInfo)
    {
        if (options.changelogFile) {
            context.stdout.write(`${lastRelease.version}|${nextRelease.version}|${options.changelogFile}`);
        }
        else {
            context.stdout.write(`${lastRelease.version}|${nextRelease.version}`);
        }
        return true;
    }

    //
    // Task '--task-version-current'
    //
    if (options.taskReleaseLevel)
    {
        context.stdout.write(nextRelease.level ?? "none");
        return true;
    }

    return false;
}



async function promptForVersion(lastVersion: string, versionSystem: "auto" | "manual" | "semver" | "incremental", proposedNextVersion: string, logger: any)
{
    let version = proposedNextVersion;
    const promptSchema = {
        properties: {
            inVersion: {
                description: "Enter version number",
                pattern: /^(?:[0-9]+\.[0-9]+\.[0-9]+(?:[\-]{0,1}[a-zA-Z]+\.[0-9]+){0,1})$|^[0-9]+$/,
                default: proposedNextVersion,
                message: "Version must only contain 0-9, '.', chars and '-' for pre-release",
                required: false
            }
        }
    };
    const prompt = require("prompt");
    prompt.start();
    const { inVersion } = await prompt.get(promptSchema);
    if (inVersion) {
        version = inVersion;
        if (!util.validateVersion(version, versionSystem, lastVersion, logger))
        {
            logger.error("Invalid 'next version' specified");
            return "";
        }
    }
    return version;
}


function logErrors({ logger, stderr }, err)
{
    const errors = util.extractErrors(err).sort(error => (error.appPublisher ? -1 : 0));
    for (const error of errors)
    {
        if (error.appPublisher)
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
    if (context.options.dryRun && context.options.vcRevert)
    {
        await revert(context);
    }
}


async function callFail(context: IContext, err: Error)
{
    const eStr = err.toString(),
          { logger } = context;
    await revertChanges(context);
    logger.error("Release run threw failure exception");
    if (eStr.endsWith("\n")) {
        context.stdout.write(`Exception:  ${eStr}${EOL}`);
    }
    else {
        logger.error(eStr);
    }
    // const errors = util.extractErrors(err).filter(err => err.appPublisher);
    // logErrors(context, error);
    // if (errors.length > 0)
    // {
    //     try {
    //         await context.plugins.fail({ ...context, errors });
    //     }
    //     catch (error) {
    //         logErrors(context, error);
    //     }
    // }
}


export = async (opts = {}, { cwd = process.cwd(), env = process.env, stdout = undefined, stderr = undefined } = {}) =>
{
    const { unhook } = hookStd(
        { silent: false, streams: [process.stdout, process.stderr, stdout, stderr].filter(Boolean) },
        hideSensitive(env)
    );

    const context = await getContext(opts as IOptions, cwd, env, stdout, stderr);

    try {
        try {
            const result = await runStart(context);
            unhook();
            return result;
        }
        catch (error)
        {
            await callFail(context, error);
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
