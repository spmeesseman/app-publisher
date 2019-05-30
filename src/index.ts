
import { visit, JSONVisitor } from 'jsonc-parser';
import { CommitAnalyzer } from './lib/commit-analyzer';
import * as util from './util';
import * as fs from 'fs';
import * as path from 'path';
import gradient from 'gradient-string';
import chalk from 'chalk';
import * as child_process from 'child_process';
import { template, pick } from 'lodash';
import * as marked from 'marked';
import { TerminalRenderer } from 'marked-terminal';
import envCi from 'env-ci';
import hookStd from 'hook-std';
import pkg from '../package.json';
import hideSensitive = require("./lib/hide-sensitive");
import getConfig = require('./lib/get-config');
import verify = require('./lib/verify');
import getCommits = require('./lib/get-commits');
import getNextVersion = require('./lib/get-next-version');
import getLastRelease = require('./lib/get-last-release');
import {extractErrors} from './lib/utils';
import getGitAuthUrl = require('./lib/get-git-auth-url');
import getLogger = require('./lib/get-logger');
import {fetch, verifyAuth, isBranchUpToDate, getGitHead, tag, push} from './lib/git';
import getError = require('./lib/get-error');
import {COMMIT_NAME, COMMIT_EMAIL} from './lib/definitions/constants';


marked.setOptions({ renderer: new TerminalRenderer() });

async function run(context, plugins)
{
    const { cwd, env, options, logger } = context;
    const { isCi, branch: ciBranch } = envCi({ env, cwd });

    //
    // Read config file:
    //
    //     .publishrc.json
    //     .publishrc
    //
    let fileCfg: string;
    if (fs.existsSync('.publishrc.json')) {
        fileCfg = fs.readFileSync('.publishrc.json').toString();
    }
    else if (fs.existsSync('.publishrc')) {
        fileCfg = fs.readFileSync('.publishrc').toString();
    }
    else {
        util.logError("Config file not found!! Exiting");
        process.exit(80);
    }

    //
    // Replace environment variables
    //
    // Environment variables in .publishconfig should be in the form:
    //
    //     ${VARIABLE_NAME}
    //
    for (var key in process.env) 
    {
        var envVar = "[$][{]\\b" + key + "\\b[}]";
        fileCfg = fileCfg.replace(new RegExp(envVar), process.env[key].replace(/\\/, "\\\\"));
    }

    //
    // If user specified '--read-config', then just display config and exit
    //
    if (options.readConfig)
    {
        let title = `----------------------------------------------------------------------------
    Cofiguration file contents
    ----------------------------------------------------------------------------
        `;
        util.log(chalk.bold(gradient('cyan', 'pink').multiline(title, {interpolation: 'hsv'})));
        util.log(fileCfg);
        process.exit(0);
    }


    //
    // Convert file config to JSON object
    //
    fileCfg = JSON.parse(fileCfg);

    //
    // Set dry run flags
    //
    let dryCfg = {
        testMode: options.dryRun ? "Y" : "N",
        testModeSvnRevert: options.dryRun ? "Y" : (fileCfg.testModeSvnRevert ? fileCfg.testModeSvnRevert : "N"),
        skipDeployPush: options.dryRun ? "Y" : (fileCfg.skipDeployPush ? fileCfg.skipDeployPush : "N")
    };

    //
    // Merge configs
    //
    let config = { ...fileCfg, ...dryCfg };

    let runCt = 0;
    let reposCommited:Array<string> = [];
    let runsCfg = [{}];

    if (config.xRuns)
    {
        //
        // Push the run config, use JSON.parse(JSON.stringify) to  clone the object so
        // we can then delete it
        //
        runsCfg.push(...JSON.parse(JSON.stringify(config.xRuns)));
        delete config.xRuns;
    }

    //
    // Run publish
    //
    for (var run in runsCfg)
    {
        runCt++;
        config = { ...config, ...runsCfg[run] };

        if (!options.profile || options.profile === "node") {
            //const commitAnalyzer = new CommitAnalyzer({});
            util.log('Generic publisher not yet implemented, use --profile=ps');
        }
        else if (options.profile === "ps") 
        {
            let soptions = "";
            let cProperty: string;
            let aProperty: string;
            //
            // Format config for powershell script arguments
            //
            let visitor: JSONVisitor = 
            {
                onError() { cProperty = undefined; },
                onObjectEnd() 
                { 
                    cProperty = undefined;
                    aProperty = undefined;
                },
                onArrayBegin(offset: number, length: number, startLine: number, startCharacter: number)
                {
                    let propStart = "-" + cProperty.toUpperCase() + " ";
                    aProperty = cProperty;
                    if (soptions.includes(propStart)) {
                        util.logError("Configuration parameter '" + cProperty + "' defined twice, check casing");
                        util.logError("   soptions = " + soptions);
                        process.exit(81);
                    }
                    soptions += (propStart);
                },
                onArrayEnd(offset: number, length: number, startLine: number, startCharacter: number)
                {
                    aProperty = undefined;
                    if (soptions.endsWith(",")) {
                        soptions = soptions.substring(0, soptions.length - 1) + " ";
                    } 
                },
                onLiteralValue(value: any, offset: number, _length: number) 
                {
                    if (cProperty && typeof value === 'string') 
                    {
                        if (!aProperty) 
                        {
                            let propStart = "-" + cProperty.toUpperCase() + " ";
                            if (soptions.includes(propStart)) 
                            {
                                util.logError("   Configuration parameter '" + cProperty + "' defined twice, check casing");
                                util.logError("   soptions = " + soptions);
                                process.exit(82);
                            }
                            util.log("   Value: '" + value + "'");
                            soptions += (propStart + "'" + value + "' ");
                        }
                        else {
                            util.log("   Adding array value: '" + value + "'");
                            soptions += ("\"" + value + "\",");
                        }
                    }
                    else if (aProperty && typeof value === 'string')
                    {
                        soptions += ("'" + value + "',");
                    }
                    else if (cProperty && value)
                    {
                        if (!aProperty)
                        {
                            let propStart = "-" + cProperty.toUpperCase() + " ";
                            if (soptions.includes(propStart)) {
                                util.logError("   Configuration parameter '" + cProperty + "' defined twice, check casing");
                                util.logError("   soptions = " + soptions);
                                process.exit(83);
                            }
                            util.log("   Value: " + value.toString());
                            soptions += (propStart + value + " ");
                        }
                        else {
                            soptions += (value + ",");
                        }
                    }
                    cProperty = undefined;
                },
                onObjectProperty(property: string, offset: number, _length: number) 
                {
                    util.log("Found configuration parameter '" + property + "'");
                    cProperty = property;
                }
            };
            visit(JSON.stringify(config), visitor);

            //
            // Get the repository url if not specified
            //
            if (!config.repo) 
            {
                let cwd = process.cwd();
                let appPackageJson = path.join(cwd, 'package.json');
                if (fs.existsSync(appPackageJson)) {
                    let repository = require(appPackageJson).repository;
                    if (repository) 
                    {
                        if (typeof repository === 'string') {
                            config.repo = repository;
                        }
                        else {
                            config.repo = repository.url;
                        }
                    }
                }
                if (!config.repo)
                {
                    util.logError("Repository url must be sepcified in .publishrc or package.json");
                    process.exit(85);
                }
            }

            //
            // Get the repository type if not specified
            //
            if (!config.repoType) 
            {
                let cwd = process.cwd();
                let appPackageJson = path.join(cwd, 'package.json');
                if (fs.existsSync(appPackageJson)) {
                    let repository = require(appPackageJson).repository;
                    if (repository) {
                        if (typeof repository === 'object') {
                            config.repoType = repository.type;
                        }
                    }
                }
                if (!config.repoType)
                {
                    util.logError("Repository type must be sepcified in .publishrc or package.json");
                    util.logError("   Possible values:  svn, git");
                    process.exit(85);
                }
                else if (config.repoType !== 'svn' && config.repoType !== 'git') 
                {
                    util.logError("Invalid repository type sepcified, must be 'svn' or 'git'");
                    process.exit(86);
                }
            }

            //
            // If this is a 2nd run (or more), and the repository is the same, then skip the comit
            //
            if (reposCommited.indexOf(config.repoType) >= 0) 
            {
                soptions = soptions + " -skipCommit Y";
                if (!soptions.includes(" -vcTag N")) {
                    soptions = soptions.replace(/-vcTag Y/gi, "");
                    soptions = soptions + " -vcTag N";
                }
            }
            else {
                reposCommited.push(config.repoType);
            }

            soptions = soptions + ` -apppublisherversion ${version}`;
            soptions = soptions + ` -run ${runCt}`;

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
            var ps1Script;
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
                    let gModuleDir = process.env.CODE_HOME + "\\nodejs\\node_modules";
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
                util.logError("Could not find powershell script app-publisher.ps1");
                process.exit(102);
            }

            //
            // Launch Powershell script
            //
            let ec = child_process.spawnSync("powershell.exe", [`${ps1Script} ${soptions}`], { stdio: 'inherit'});
            if (ec.status !== 0)
            {
                util.logError("Powershell exited with error code " + ec.status.toString());
                process.exit(ec.status);
            }

            // let child = child_process.spawn("powershell.exe", [`${ps1Script} ${soptions}`], { stdio: ['pipe', 'inherit', 'inherit'] });
            // process.stdin.on('data', function(data) {
            //     if (!child.killed) {
            //         child.stdin.write(data);
            //     }
            // });
            // child.on('exit', function(code) {
            //     process.exit(code);
            // });
        }
    }
    /*
    if (!isCi && !options.dryRun && !options.noCi)
    {
        logger.warn('This run was not triggered in a known CI environment, running in dry-run mode.');
        options.dryRun = true;
    } else
    {
        // When running on CI, set the commits author and commiter info and prevent the `git` CLI to prompt for username/password. See #703.
        Object.assign(env, {
            GIT_AUTHOR_NAME: COMMIT_NAME,
            GIT_AUTHOR_EMAIL: COMMIT_EMAIL,
            GIT_COMMITTER_NAME: COMMIT_NAME,
            GIT_COMMITTER_EMAIL: COMMIT_EMAIL,
            ...env,
            GIT_ASKPASS: 'echo',
            GIT_TERMINAL_PROMPT: 0
        });
    }

    if (isCi && isPr && !options.noCi)
    {
        logger.log("This run was triggered by a pull request and therefore a new version won't be published.");
        return false;
    }

    if (ciBranch !== options.branch)
    {
        logger.log(
            `This test run was triggered on the branch ${ciBranch}, while semantic-release is configured to only publish from ${
            options.branch
            }, therefore a new version won’t be published.`
        );
        return false;
    }

    logger[options.dryRun ? 'warn' : 'success'](
        `Run automated release from branch ${ciBranch}${options.dryRun ? ' in dry-run mode' : ''}`
    );

    await verify(context);

    options.repositoryUrl = await getGitAuthUrl(context);

    try
    {
        try
        {
            await verifyAuth(options.repositoryUrl, options.branch, { cwd, env });
        } catch (error)
        {
            if (!(await isBranchUpToDate(options.branch, { cwd, env })))
            {
                logger.log(
                    `The local branch ${
                    options.branch
                    } is behind the remote one, therefore a new version won't be published.`
                );
                return false;
            }

            throw error;
        }
    } catch (error)
    {
        logger.error(`The command "${error.cmd}" failed with the error message ${error.stderr}.`);
        throw getError('EGITNOPERMISSION', { options });
    }

    logger.success(`Allowed to push to the Git repository`);

    await plugins.verifyConditions(context);

    await fetch(options.repositoryUrl, { cwd, env });

    context.lastRelease = await getLastRelease(context);
    context.commits = await getCommits(context);

    const nextRelease = { type: await plugins.analyzeCommits(context), gitHead: await getGitHead({ cwd, env }) };

    if (!nextRelease.type)
    {
        logger.log('There are no relevant changes, so no new version is released.');
        return false;
    }

    context.nextRelease = nextRelease;
    nextRelease.version = getNextVersion(context);
    nextRelease.gitTag = template(options.tagFormat)({ version: nextRelease.version });

    await plugins.verifyRelease(context);

    nextRelease.notes = await plugins.generateNotes(context);

    await plugins.prepare(context);

    if (options.dryRun)
    {
        logger.warn(`Skip ${nextRelease.gitTag} tag creation in dry-run mode`);
    } else
    {
        // Create the tag before calling the publish plugins as some require the tag to exists
        await tag(nextRelease.gitTag, { cwd, env });
        await push(options.repositoryUrl, { cwd, env });
        logger.success(`Created tag ${nextRelease.gitTag}`);
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

    return pick(context, ['lastRelease', 'commits', 'nextRelease', 'releases']);
    */
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
        } else
        {
            logger.error('An error occurred while running semantic-release: %O', error);
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

module.exports = async (opts = {}, { cwd = process.cwd(), env = process.env, stdout, stderr } = {}) =>
{
    const { unhook } = hookStd(
        { silent: false, streams: [process.stdout, process.stderr, stdout, stderr].filter(Boolean) },
        hideSensitive(env)
    );
    const context = { cwd, env, stdout: stdout || process.stdout, stderr: stderr || process.stderr };
    context.logger = getLogger(context);
    context.logger.log(`Running ${pkg.name} version ${pkg.version}`);
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

