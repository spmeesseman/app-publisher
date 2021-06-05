
// import { visit, JSONVisitor } from "jsonc-parser";
import * as util from "./util";
// import * as fs from "fs";
// import * as path from "path";
import gradient from "gradient-string";
import chalk from "chalk";
import * as child_process from "child_process";
// import { template, pick } from "lodash";
import marked from "marked";
import TerminalRenderer from "marked-terminal";
const envCi = require("@spmeesseman/env-ci");
// import envCi from "env-ci";
import hookStd from "hook-std";
import hideSensitive = require("./lib/hide-sensitive");
import getConfig = require("./lib/get-config");
// import getReleaseLevel = require("./lib/commit-analyzer");
// import verify = require("./lib/verify");
// import getCommits = require("./lib/get-commits");
// import getNextVersion = require("./lib/get-next-version");
// import getLastRelease = require("./lib/get-last-release");
import { extractErrors } from "./lib/utils";
// import { sendEmail } from "./lib/email";
// import getGitAuthUrl = require("./lib/get-git-auth-url");
import getLogger = require("./lib/get-logger");
// import { fetch, verifyAuth, isBranchUpToDate, getHead, tag, push } from "./lib/repo";
// import getError = require("./lib/get-error");
import { COMMIT_NAME, COMMIT_EMAIL } from "./lib/definitions/constants";

const pkg = require("../package.json");

marked.setOptions({ renderer: new TerminalRenderer() });

async function run(context, plugins)
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
        console.log(chalk.bold(gradient("cyan", "pink").multiline(title, {interpolation: "hsv"})));
        console.log(options);
        return true;
    }

    const {
        isCi, branch: ciBranch, isPr, name: ciName, root: ciRoot, build: ciBuild, buildUrl: ciBuildUrl, commit: ciCommit
    } = envCi({ env, cwd });

    if (!options.branch) {
        options.branch = ciBranch;
    }

    //
    // If user specified 'cfg' or '--config', then just display config and exit
    //
    if (options.taskCiEnv)
    {
        const title =
`----------------------------------------------------------------------------
 CI Environment Details
----------------------------------------------------------------------------
        `;
        console.log(chalk.bold(gradient("cyan", "pink").multiline(title, {interpolation: "hsv"})));
        if (isCi)
        {
            console.log("  CI Name           : " + ciName);
            console.log("  CI Branch         : " + ciBranch);
            console.log("  Is PR             : " + isPr);
            console.log("  Commit            : " + isPr);
            console.log("  Root              : " + ciRoot);
            console.log("  Commit            : " + ciCommit);
            console.log("  Build             : " + ciBuild);
            console.log("  Build URL         : " + ciBuildUrl);
        }
        else {
            console.log("  No known CI environment was found");
        }
        return true;
    }

    //
    // Set some additional options specific to powershell script
    //
    options.appPublisherVersion = pkg.version;
    // tslint:disable-next-line: quotemark
    options.isNodeJsEnv = typeof module !== 'undefined' && module.exports;

    if (!options.taskVersionCurrent && !options.taskVersionNext)
    {
        const mode = options.isNodeJsEnv ? "Node.js" : "bin mode";
        logger.log(`Running ${pkg.name} version ${pkg.version} in ${mode}`);
    }

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
    else if (ciBranch !== options.branch && !options.taskVersionCurrent && !options.taskVersionNext)
    {
        logger.warn(`This ${runTxt} was triggered on the branch '${ciBranch}', but is configured to ` +
                    `publish from '${options.branch}'`);
        logger.warn("   Continuing due to non-ci environment");
    }

    if (!options.taskVersionCurrent && !options.taskVersionNext) {
        logger[options.dryRun ? "warn" : "log"](
            `Run automated release from branch '${options.branch}'${options.dryRun ? " in dry-run mode" : ""}`
        );
    }

    if (options.verbose) // even if it's a stdout type task
    {
        logger.log(JSON.stringify(options, undefined, 3));
    }

    // if (options.emailOnly)
    // {
    //     // await sendEmail(logger);
    //     await runPowershellScript(options, logger);
    //     // await runNodeScript(context, plugins);
    // }
    // else {
         await runPowershellScript(options, logger);
    // }
}

/*
async function runNodeScript(context: any, plugins: any)
{
    const { cwd, env, options, logger } = context;

    await verify(context);

    if (options.repoType === "git")
    {
        options.repositoryUrl = await getGitAuthUrl(context);

        try
        {
            try
            {
                await verifyAuth(options.repositoryUrl, options.branch, { cwd, env });
            }
            catch (error)
            {
                if (!(await isBranchUpToDate(options.branch, { cwd, env })))
                {
                    logger.log(
                        `The local branch ${
                        options.branch
                        } is behind the remote one, therefore a new version won't be published.`
                    );
                    return;
                }

                throw error;
            }
        }
        catch (error)
        {
            logger.error(`The command "${error.cmd}" failed with the error message ${error.stderr}.`);
            throw getError("EGITNOPERMISSION", { options });
        }

        logger.success(`Allowed to push to the Git repository`);
    }
    else
    {
        //
        // TODO - Check permissions on svn repo
        //
        logger.success(`Allowed to push to the Subversion repository`);
    }

    await plugins.verifyConditions(context);

    await fetch(options.repositoryUrl, { cwd, env });

    context.lastRelease = await getLastRelease(context);
    context.commits = await getCommits(context);

    const nextRelease = {
        type: await getReleaseLevel(context),
        head: await getHead({ cwd, env }),
        version: undefined,
        tag: undefined,
        notes: undefined
    };

    if (!nextRelease.type)
    {
        logger.log("There are no relevant changes, so no new version is released.");
        return false;
    }

    context.nextRelease = nextRelease;
    nextRelease.version = getNextVersion(context);
    nextRelease.tag = template(options.tagFormat)({ version: nextRelease.version });

    await plugins.verifyRelease(context);

    nextRelease.notes = await plugins.generateNotes(context);

    await plugins.prepare(context);

    if (options.dryRun)
    {
        logger.warn(`Skip ${nextRelease.tag} tag creation in dry-run mode`);
    } else
    {
        // Create the tag before calling the publish plugins as some require the tag to exists
        await tag(nextRelease.tag, { cwd, env });
        await push(options.repositoryUrl, { cwd, env });
        logger.success(`Created tag ${nextRelease.tag}`);
    }

    context.releases = await plugins.publish(context);

    await plugins.success(context);

    logger.success(`Published release ${nextRelease.version}`);

    if (options.dryRun)
    {
        logger.log(`Release note for version ${nextRelease.version}:`);
        if (nextRelease.notes)
        {
            context.stdout.write(marked(nextRelease.notes));
        }
    }

    return pick(context, ["lastRelease", "commits", "nextRelease", "releases"]);
}
*/

async function runPowershellScript(options: any, logger: any)
{
    //
    // Find Powershell script
    //
    // Perform search in the following order:
    //
    //     1. Local node_modules
    //     2. Local script dir
    //     3. Global node_modules
    //     4. Windows install
    //
    let ps1Script;
    if (util.pathExists(".\\node_modules\\@spmeesseman\\app-publisher")) {
        ps1Script = ".\\node_modules\\@spmeesseman\\app-publisher\\script\\app-publisher.ps1";
    }
    else if (util.pathExists(".\\node_modules\\@perryjohnson\\app-publisher")) {
        ps1Script = ".\\node_modules\\@perryjohnson\\app-publisher\\script\\app-publisher.ps1";
    }
    else if (util.pathExists(".\\script\\app-publisher.ps1")) {
        ps1Script = ".\\script\\app-publisher.ps1";
    }
    else
    {
        if (process.env.CODE_HOME)
        {
            // Check global node_modules
            //
            const gModuleDir = process.env.CODE_HOME + "\\nodejs\\node_modules";
            if (util.pathExists(gModuleDir + "\\@perryjohnson\\app-publisher\\script\\app-publisher.ps1")) {
                ps1Script = gModuleDir + "\\@perryjohnson\\app-publisher\\script\\app-publisher.ps1";
            }
            else if (util.pathExists(gModuleDir + "\\@spmeesseman\\app-publisher\\script\\app-publisher.ps1")) {
                ps1Script = gModuleDir + "\\@spmeesseman\\app-publisher\\script\\app-publisher.ps1";
            }
        }
        // Check windows install
        //
        else if (process.env.APP_PUBLISHER_HOME)
        {
            if (util.pathExists(process.env.APP_PUBLISHER_HOME + "\\app-publisher.ps1")) {
                ps1Script = ".\\app-publisher.ps1";
            }
        }
    }

    if (!ps1Script) {
        logger.error("Could not find powershell script app-publisher.ps1");
        return;
    }

    //
    // Launch Powershell script
    //
    // const ec = child_process.spawnSync("powershell.exe", [`${ps1Script} ${options}`], { stdio: "inherit"});
    // if (ec.status !== 0)
    // {
    //    logger.error("Powershell script exited with error code " + ec.status.toString());
    //    return ec.status;
    // }
    // logger.success("Published release successfully");
    // logger.success(`Published release ${nextRelease.version}`);
    const isTaskCmd = options.taskChangelog || options.taskEmail || options.taskTouchVersions || options.taskMantisbtRelease ||
                      options.taskVersionCurrent || options.taskVersionNext || options.taskCiEnvSet,
          isStdOutCmd = options.taskVersionCurrent || options.taskVersionNext,
          child = child_process.spawn("powershell.exe", [`${ps1Script} '${JSON.stringify(options)}'`], { stdio: ["pipe", "pipe", "pipe"], env: process.env});
    // const child = child_process.spawn("powershell.exe", [`${ps1Script} ${options}`], { stdio: ["pipe", "inherit", "inherit"] });

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    process.stdin.on("data", data => {
        if (!child.killed) {
            child.stdin.write(data);
        }
    });

    child.stdout.on("data", data =>
    {
        if (child.killed) {
            return;
        }
        logPowershell(data, logger, isStdOutCmd);
    });

    child.stderr.on("data", data => {
        if (child.killed) {
            return;
        }
        logPowershell(data, logger, isStdOutCmd);
    });

    let iCode: number;
    child.on("exit", code =>
    {
        // if (fs.existsSync("ap.env"))
        // {
        //     const envContent = fs.readFileSync("ap.env");
        //     if (envContent)
        //     {
        //         const envVars = envContent.toString().split("\n");
        //         process.env.AP_CURRENT_VERSION = envVars[0];
        //         process.env.AP_NEXT_VERSION = envVars[1];
        //         process.env.AP_CHANGELOG_FILE = envVars[2];
        //         fs.unlinkSync("ap.env");
        //     }
        // }
        iCode = code;
        if (iCode === 0) {
            if (!isStdOutCmd) {
                if (!isTaskCmd) {
                    logger.success("Successfully published release");
                }
                else {
                    logger.success("Successfully completed task");
                }
            }
        }
        else {
            logger.error(`Failed to publish release - return code '${iCode}'`);
        }
        process.exit(iCode);
    });
}


function logPowershell(data: string, logger: any, isStdOutCmd: boolean)
{
    if (!data) {
        return;
    }

    //
    // Trim
    //
    data = data.trimRight();
    while (data[0] === "\n" || data[0] === "\r") {
        data = data.substring(1);
    }

    if (!data) {
        return;
    }

    const isError = data.includes("[ERROR] ");

    if (isStdOutCmd && !isError) {
        console.log(data);
        return;
    }

    if (data.includes("\r\n")) {
        data.replace(/\r\n/gm, "\r\n                                  ");
    }
    else if (data.includes("\n")) {
        data.replace(/\n/gm, "\n                                  ");
    }
    if (data.includes("[INFO] ")) {
        logger.log(data.substring(7));
    }
    else if (data.includes("[NOTICE] ")) {
        logger.log(data.substring(9));
    }
    else if (data.includes("[WARNING] ")) {
        logger.warn(data.substring(10));
    }
    else if (data.includes("[SUCCESS] ")) {
        logger.success(data.substring(10));
    }
    else if (isError) {
        logger.error(data.substring(8));
    }
    else if (data.includes("[PROMPT] ")) {
        logger.star(data.substring(9));
    }
    else if (data.includes("[INPUT] ")) {
        logger.star(data.substring(8));
    }
    else if (data.includes("[RAW] ")) {
        console.log(data.substring(6));
    }
    else {
        logger.log(data);
    }
}


function logErrors({ logger, stderr }, err)
{
    const errors = extractErrors(err).sort(error => (error.semanticRelease ? -1 : 0));
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


async function callFail(context, plugins, err)
{
    const errors = extractErrors(err).filter(err => err.semanticRelease);
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
    const context = { cwd, env, stdout: stdout || process.stdout, stderr: stderr || process.stderr, logger: undefined, options: undefined };
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
        } catch (error)
        {
            await callFail(context, plugins, error);
            throw error;
        }
    } catch (error)
    {
        logErrors(context, error);
        unhook();
        throw error;
    }
};
