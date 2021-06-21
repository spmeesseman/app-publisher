
import * as path from "path";
import { escapeRegExp, isString } from "./utils/utils";
import { deleteFile, pathExists, readFile } from "./utils/fs";
const execa = require("execa");
const debug = require("debug")("app-publisher:git");
const xml2js = require("xml2js");


export async function addEdit({options, nextRelease, logger,  env, cwd}, pathToAdd: string | string[])
{
    if (!pathToAdd || pathToAdd.length === 0) {
        return;
    }

    async function _add(p: string) // , isDir = false)
    {
        let editType = "M";
        const pathResolved = path.relative(cwd, path.resolve(p)),
              versioned = await isVersioned({options, logger}, pathResolved, {cwd, env});
        if (!versioned)
        {
            const ignored = await isIgnored({options, logger}, pathResolved, {cwd, env});
            // const dir = path.dirname(pathResolved);
            // if (!(await isVersioned({options}, dir, {cwd, env}))) {
            //     _add(dir); // , true);
            // }
            if (!ignored) {
                editType = "A";
            }
            else {
                editType = "I";
            }
        }

        nextRelease.edits.push({
            path: pathResolved,
            type: editType
        });
    }

    if (isString(pathToAdd)) {
        await _add(pathToAdd);
    }
    else {
        for (const p of pathToAdd) {
            await _add(p);
        }
    }
}


/**
 * Push to the remote repository.
 *
 * @param repo The remote repository URL.
 * @param execaOpts Options to pass to `execa`.
 *
 * @throws {Error} if the commit failed or the repository type is invalid.
 */
export async function commit({options, nextRelease, logger}, execaOpts: any)
{
    let proc: any;

    if (!nextRelease.edits || nextRelease.edits === 0) {
        logger.info("Commit - Nothing to commit");
        return;
    }

    const changeListAdd: string = nextRelease.edits.filter((e: any) => e.type === "A").map((e: any) => e.path).join(" ").trim(),
          changeList: string = nextRelease.edits.filter((e: any) => e.type !== "I").map((e: any) => e.path).join(" ").trim();

    if (options.repoType === "git")
    {
        if (changeListAdd)
        {
            logger.info("Adding unversioned touched files to git version control");
            logger.info("   " + changeListAdd);
            proc = await execa("git", [ "add", "--", changeListAdd ], execaOpts);
            if (proc.code !== 0) {
                logger.warning("Add file(s) to VCS failed");
            }
        }
        if (changeList)
        {
            logger.info("Committing touched files to git version control");
            if (!options.dryRun) {
                proc = await execa("git", [ "commit", "-m", `"chore(release): v${nextRelease.version} [skip ci]`, "--", changeList ], execaOpts);
            }
            else {
                proc = await execa("git", [ "commit", "--dry-run", "-m", `"chore(release): v${nextRelease.version} [skip ci]`, "--", changeList  ], execaOpts);
            }
            if (proc.code === 0) {
                logger.info("Pushing touched files to svn version control");
                if (!options.dryRun) {
                    proc = await execa("git", [ "push", "origin", `${options.branch}:${options.branch}` ], execaOpts);
                }
                else {
                    proc = await execa("git", [ "push", "--dry-run", "origin", `${options.branch}:${options.branch}` ], execaOpts);
                }
            }
            else {
                logger.warning("Add file(s) to VCS failed");
            }
        }
    }
    else if (options.repoType === "svn")
    {
        if (changeListAdd)
        {
            logger.info("Adding unversioned touched files to svn version control");
            logger.info("   " + changeListAdd);
            await execSvn([ "add", changeListAdd ], execaOpts);
        }
        if (changeList)
        {
            logger.info("Committing touched files to svn version control");
            if (!options.dryRun) {
                await execa("svn", ["commit", changeList, "-m", `chore: v${nextRelease.version} [skip ci]` ], execaOpts);
            }
            else {
                await execa("svn", ["merge", "--dry-run", "-r", "BASE:HEAD", "." ], execaOpts);
            }
        }
    }
    else {
        throwVcsError(`Invalid repository type: ${options.repoType}`, logger);
    }
}


/**
 * Executes svn command with credentials if set in the environment.
 *
 * @since 2.8.0
 *
 * @param svnArgs Arguments to pass to `svn`
 * @param execaOpts Options to pass to `execa`
 *
 * @returns The process object returned by execa()
 */
async function execSvn(svnArgs: string[], execaOpts: any, stdout = false)
{
    let proc: any;
    const svnUser = process.env.SVN_AUTHOR_NAME,
          svnToken = process.env.SVN_TOKEN;
    if (svnUser && svnToken) {
        if (!stdout) {
             proc = await execa("svn", [...svnArgs, "--non-interactive", "--no-auth-cache", "--username", svnUser, "--password", svnToken ], execaOpts);
        }
        else {
            proc = await execa.stdout("svn", [...svnArgs, "--non-interactive", "--no-auth-cache", "--username", svnUser, "--password", svnToken ], execaOpts);
        }
    }
    else {
        if (!stdout) {
            proc = await execa("svn", [...svnArgs, "--non-interactive" ], execaOpts);
        }
        else {
            proc = await execa.stdout("svn", [...svnArgs, "--non-interactive" ], execaOpts);
        }
    }
    return proc;
}


/**
 * Unshallow the git repository if necessary and fetch all the tags.
 *
 * @param context context
 * @param execaOpts execa options
 */
export async function fetch({ options, logger }, execaOpts: any)
{
    if (options.repoType === "git")
    {
        try {
            await execa("git", ["fetch", "--unshallow", "--tags", options.repo], execaOpts);
        }
        catch (error) {
            await execa("git", ["fetch", "--tags", options.repo], execaOpts);
        }
    }
    else if (options.repoType === "svn")
    {
        await execSvn([ "update", "--force" ], execaOpts);
    }
    else {
        throwVcsError(`Invalid repository type: ${options.repoType}`, logger);
    }
}


/**
 * Get the HEAD sha.
 *
 * @param execaOpts Options to pass to `execa`.
 *
 * @returns The sha of the HEAD commit.
 */
export function getHead({options, logger}, execaOpts: any)
{
    if (options.repoType === "git") {
        return execa.stdout("git", ["rev-parse", "HEAD"], execaOpts);
    }
    else if (options.repoType === "svn")
    {
        const head = execa.stdout("svn", ["info", "-r", "HEAD"], execaOpts);
        let match: RegExpExecArray;
        if ((match = /^Revision: ([0-9]+)$/m.exec(head)) !== null)
        {
            return match[1];
        }
    }
    else {
        throwVcsError(`Invalid repository type: ${options.repoType}`, logger);
    }
}



/**
 * Get the commit sha for a given tag.
 *
 * @param tagName Tag name for which to retrieve the commit sha.
 * @param execaOpts Options to pass to `execa`.
 *
 * @returns The commit sha of the tag in parameter or `null`.
 */
export async function getTagHead({options, logger}, tagName: any, execaOpts: { cwd: any; env: any; })
{
    try
    {
        if (options.repoType === "git")
        {
            return await execa.stdout("git", ["rev-list", "-1", tagName], execaOpts);
        }
        else if (options.repoType === "svn")
        {
            const tagLocation = options.repo.replace("trunk", "tags").replace("branches/" + options.branch, "tags"),
                  head = await execa.stdout("svn", ["log", tagLocation + "/" + tagName, "-v", "--stop-on-copy"], execaOpts);
            let match: RegExpExecArray;
            if ((match = /^r([0-9]+) \|/m.exec(head)) !== null)
            {
                return match[1];
            }
        }
        else {
            throwVcsError(`Invalid repository type: ${options.repoType}`, logger);
        }
    }
    catch (error)
    {
        debug(error);
    }
}


/**
 * Get all the repository tags.
 *
 * @param execaOpts Options to pass to `execa`.
 *
 * @returns List of git tags.
 * @throws {Error} If the `git` or `svn` command fails or the repository type is invalid.
 */
export async function getTags({env, options, logger}, execaOpts: any)
{
    if (options.repoType === "git")
    {
        return (await execa.stdout("git", ["tag"], execaOpts))
            .split("\n")
            .map((tag: { trim: () => void; }) => tag.trim()) // um ok
            .filter(Boolean); // why??
    }
    else if (options.repoType === "svn")
    {
        let xml: string;
        const tags: string[] = [],
              svnUser = env.SVN_AUTHOR_NAME,
              svnToken = env.SVN_TOKEN,
              parser = new xml2js.Parser(),
              tagLocation = options.repo.replace("trunk", "tags").replace("branches/" + options.branch, "tags");

        //
        // TODO - how to pass quotes to execa?  i.e. `"${tagLocation}"` they are encoded as %22 and we get:
        //   E170000: Illegal repository URL '%22https://svn.development.pjats.com/pja/app-publisher/tags%22'\r\n
        //
        if (svnUser && svnToken) {
            xml = await execa.stdout("svn", ["log", "--xml", `${tagLocation}`, "--verbose", "--limit", "50", "--non-interactive",
                                             "--no-auth-cache", "--username", svnUser, "--password", `${svnToken}`], execaOpts);
        }
        else {
            xml = await execa.stdout("svn", ["log", "--xml", `${tagLocation}`, "--verbose", "--limit", "50", "--non-interactive",
                                             "--no-auth-cache"], execaOpts);
        }

        logger.info("Parsing response from SVN");
        try {
            parser.parseString(xml, (err: any, result: any) =>
            {
                if (err) {
                    throw new Error(err);
                }
                for (const logEntry of result.log.logentry) {
                    for (const p of logEntry.paths) {
                        const pathObj = p.path[0],
                              regex = new RegExp(`.*/tags/(${options.vcTagPrefix}[0-9\.]+)`),
                              match = regex.exec(pathObj._);
                        if (pathObj.$ && pathObj.$.action === "A" && pathObj.$.kind === "dir" && match)
                        {
                            // logger.info("Found version tag:");
                            // logger.info(`   Tag     : ${match[1]}`);
                            // logger.info(`   Rev     : ${logEntry.$.revision}`);
                            // logger.info(`   Path    : ${pathObj._}`);
                            // logger.info(`   Date    : ${logEntry.date[0]}`);
                            tags.push(match[1]);
                        }
                    }
                }
            });
            logger.info("Found " + tags.length + " version tags");
            return tags;
        }
        catch (e) {
            logger.error("Response could not be parsed, invalid module, no commits found, or no version tag exists");
            throw e;
        }
    }
    else {
        throwVcsError(`Invalid repository type: ${options.repoType}`, logger);
    }
}


/**
 * Verify the local branch is up to date with the remote one.
 *
 * @param branch The repository branch for which to verify status.
 * @param execaOpts Options to pass to `execa`.
 *
 * @returns `true` is the HEAD of the current local branch is the same as the HEAD of the remote branch, falsy otherwise.
 */
export async function isBranchUpToDate({options, logger}, branch: any, execaOpts: any)
{
    const remoteHead = await execa.stdout("git", ["ls-remote", "--heads", "origin", branch], execaOpts);
    try
    {
        if (options.repoType === "git") {
            return await isRefInHistory(remoteHead.match(/^(\w+)?/)[1], execaOpts, options);
        }
        else if (options.repoType === "svn") {
            //
            // TODO
            //
            return await isRefInHistory(remoteHead.match(/^(\w+)?/)[1], execaOpts, options);
        }
        else {
            throwVcsError(`Invalid repository type: ${options.repoType}`, logger);
        }
    }
    catch (error)
    {
        debug(error);
        throw error;
    }
}


/**
 * Test if the current working directory is a Git repository.
 *
 * @param execaOpts Options to pass to `execa`.
 *
 * @returns `true` if the current working directory is in a git repository, falsy otherwise.
 */
export async function isGitRepo(execaOpts: { cwd: any; env: any; })
{
    try
    {
        return (await execa("git", ["rev-parse", "--git-dir"], execaOpts)).code === 0;
    }
    catch (error) {
        debug(error);
    }
}


export async function isIgnored({options, logger}, objectPath: string, execaOpts: any)
{
    const excapedRegex = escapeRegExp(objectPath);

    logger.info(`Check ignored property for '${objectPath}'`);

    if (options.repoType === "svn")
    {
        try {
            const stdout = await execSvn(["propget", "svn:ignore", path.dirname(objectPath) ], execaOpts, true);
            if (new RegExp(`^${excapedRegex}$`).test(stdout)) {
                logger.info("   This file is being ignored from version control");
                return true;
            }
        }
        catch (e) // no propget in base dir W200017 E200000
        {    //
            // svn: warning: W200017: Property 'svn:ignore' not found on '...'
           // svn: E200000: A problem occurred; see other errors for details
          // Nothing to do here, returning 'false'
        }
    }
    else if (options.repoType === "git")
    {
        if (await pathExists(".gitignore"))
        {
            const fileData = await readFile(".gitignore");
            if (fileData && fileData.length > 0) {
                if (new RegExp(`^${excapedRegex}$`).test(fileData)) {
                    logger.info("   This file is being ignored from version control");
                    return true;
                }
            }
        }
    }
    else {
        throwVcsError(`Invalid repository type: ${options.repoType}`, logger);
    }

    return false;
}


/**
 * Verify if the `ref` is in the direct history of the current branch.
 *
 * @param ref The reference to look for.
 * @param execaOpts Options to pass to `execa`.
 *
 * @returns `true` if the reference is in the history of the current branch, falsy otherwise.
 */
export async function isRefInHistory(ref: any, execaOpts: any, { repo, branch, repoType }, isTags = false)
{
    try
    {
        if (repoType === "git") {
            await execa("git", ["merge-base", "--is-ancestor", ref, "HEAD"], execaOpts);
        }
        else if (repoType === "svn") {
            const tagLoc = !isTags ? repo : repo.replace("trunk", "tags").replace("branches/" + branch, "tags");
            await execa("svn", ["ls", tagLoc + "/" + ref], execaOpts);
        }
        else {
            throw new Error("Invalid repository type");
        }
        return true;
    }
    catch (error) {
        debug(error);
    }

    return false;
}


/**
 * Test if the current working directory is a Git repository.
 *
 * @since 2.8.0
 *
 * @param execaOpts Options to pass to `execa`
 *
 * @returns `true` if the current working directory is in a git repository, falsy otherwise.
 */
export async function isSvnRepo(execaOpts: { cwd: any; env: any; })
{
    try
    {
        return (await execa("svn", ["info"], execaOpts)).code === 0;
    }
    catch (error) {
        debug(error);
    }
}


/**
 * Determines whether the specifed file or directory is under version control.
 *
 * @since 2.8.0
 *
 * @param context run context
 * @param objectPath Path to the file or directory
 * @param execaOpts Options to pass to `execa`
 * @param appendPre manipulate cwd
 * @param changePath manipulate cwd
 *
 * @throws {Error} if the repository type is invalid
 * @returns `true` if the specifed file or directory is under version control, `false` otherwise.
 */
export async function isVersioned({options, logger}, objectPath: string, execaOpts: any)
{
    let isVersioned = false,
        stdout: string;

    try {
        if (options.repoType === "svn")
        {   //
            // If not versioned, the error message shouldbe:
            //     svn: warning: W155010: The node '...' was not found.
            //     svn: E200009: Could not display info for all targets because some targets don't exist
            //
            stdout = await execSvn(["info", objectPath], execaOpts, true);
            isVersioned = !stdout.includes("W155010") && !stdout.includes("E200009");
        }
        else if (options.repoType === "git")
        {   //
            // If not versioned, the error message shouldbe:
            //     error: pathspec 'test.txt' did not match any file(s) known to git
            //
            stdout = await execa.stdout("git", ["ls-files", "--error-unmatch", objectPath ], execaOpts);
            isVersioned = !stdout.includes("E200009");
        }
        else {
            throwVcsError(`Invalid repository type: ${options.repoType}`, logger);
        }
    }
    catch (e) { /* */ }

    return isVersioned;
}

/**
 * Push to the remote repository.
 *
 * @param repo The remote repository URL.
 * @param execaOpts Options to pass to `execa`.
 *
 * @throws {Error} if the push failed or the repository type is invalid.
 */
export async function push({options, logger}, execaOpts: any)
{
    if (options.repoType === "git") {
        if (!options.dryRun) {
            await execa("git", ["push", "--tags", options.repo], execaOpts);
        }
        else {
            await execa("git", ["push", "--dry-run", "--tags", options.repo], execaOpts);
        }
    }
    else if (options.repoType === "svn") {
        // Nothing to do
    }
    else {
        throwVcsError(`Invalid repository type: ${options.repoType}`, logger);
    }
}


/**
 * Get the repository remote URL.
 *
 * @param execaOpts Options to pass to `execa`.
 *
 * @returns The value of the remote git URL.
 */
export async function repoUrl({options, logger}, execaOpts: any)
{
    try
    {
        if (options.repoType === "git") {
            return await execa.stdout("git", ["config", "--get", "remote.origin.url"], execaOpts);
        }
        else if (options.repoType === "svn") {
            //
            // TODO
            //
            return await execa.stdout("svn", ["config", "--get", "remote.origin.url"], execaOpts);
        }
        else {
            throwVcsError(`Invalid repository type: ${options.repoType}`, logger);
        }
    }
    catch (error)
    {
        debug(error);
    }
}


/**
 * @since 2.8.0
 * @param changeList Changelist.  If not specified, a recursive revert is done
 * @param execaOpts Options to pass to `execa`.
 * @param repoType Repositorytype, one of 'git' or 'svn'
 */
export async function revert({options, nextRelease, logger}, execaOpts: any)
{
    const changeListAdd = nextRelease.edits.filter((e: any) => e.type === "A").join(" "),
          changeListModify = nextRelease.edits.filter((e: any) => e.type === "M").join(" ");

    logger.info("Revert changes");
    logger.info(`   Total Edits   : ${nextRelease.edits.length}`);
    logger.info(`   Additions     : ${changeListAdd.length}`);
    logger.info(`   Modifications : ${changeListModify.length}`);

    for (const file of changeListAdd) {
        try {
            await deleteFile(file);
        }
        catch (e) {
            logger.warn(`Could not remove file '${file}'`);
        }
    }

    try {
        if (options.repoType === "git") {
            await execa("git", [ "stash", "push", "--", changeListModify ], execaOpts);
            await execa("git", [ "stash", "drop" ], execaOpts);
        }
        else if (options.repoType === "svn") {
            await execSvn([ "revert", "-R", changeListModify ], execaOpts);
        }
        else {
            throwVcsError(`Invalid repository type: ${options.repoType}`, logger);
        }
    }
    catch (e) {
        logger.warn("Could not revert files:");
        logger.warn("   " + changeListModify);
    }
}


/**
 * Tag the commit head on the local repository.
 *
 * @param tagName The name of the tag.
 * @param execaOpts Options to pass to `execa`.
 *
 * @throws {Error} if the tag creation failed or the repository type is invalid.
 */
export async function tag({options, logger, nextRelease}, execaOpts: any)
{
    let tagMessage: string,
        tagLocation: string;

    if (options.pathPreRoot && !options.vcTagPrefix)
    {
        logger.warn("Skipping version tag, 'vcTagPrefix' must be set for subprojects");
        logger.warn("The project must be tagged manually using the following command:");
        logger.warn(`   svn copy "${options.repo}" "${tagLocation}/PREFIX-v${nextRelease.version}" -m "chore(release): tag v${nextRelease.version} [skip ci]"`);
        return;
    }

    if (options.repoType === "git")
    {
        tagLocation = nextRelease.tag;
        if (options.vcTagPrefix && options.vcTagPrefix !== ".")
        {
            tagLocation = `${nextRelease.vcTagPrefix}-${nextRelease.tag}`;
            tagMessage = `chore(release): tag ${nextRelease.vcTagPrefix} version ${nextRelease.version} [skip ci]`;
        }
        logger.info(`Tagging Git version at ${tagLocation}`);
        if (options.githubRelease !== "Y") {
            if (!options.dryRun) {
                await execa("git", ["tag", "-a", tagLocation, "-m", tagMessage], execaOpts);
            }
            else {
                await execa("git", ["tag", "--dry-run",  "-a", tagLocation, "-m", tagMessage], execaOpts);
            }
        }
        else { //
              // Making a github release even if 'unpublished' tags the repo.  Re-tag
             //
            logger.info("Re-tagging after release");
            if (!options.dryRun) {
                const proc = await execa("git", [ "push", "origin", ":refs/tags/" + tagLocation ], execaOpts);
                if (proc.code === 0) {
                    await execa("git", ["tag", "-fa", tagLocation, "-m", tagMessage], execaOpts);
                }
            }
            else if (!options.dryRun) {
                const proc = await execa("git", [ "push", "--dry-run", "origin", ":refs/tags/" + tagLocation ], execaOpts);
                if (proc.code === 0) {
                    await execa("git", ["tag", "--dry-run", "-fa", tagLocation, "-m", tagMessage], execaOpts);
                }
            }
        }
    }
    else if (options.repoType === "svn")
    {
        tagLocation = options.repo.replace("trunk", "tags").replace("branches/" + options.branch, "tags");
        if (!options.vcTagPrefix || options.vcTagPrefix === ".")
        {
            tagLocation = `${tagLocation}/${nextRelease.tag}`;
            tagMessage = `chore(release): tag version ${nextRelease.version} [skip ci]`;
        }
        else {
            tagLocation = `${tagLocation}/${nextRelease.vcTagPrefix}-${nextRelease.tag}`;
            tagMessage = `chore(release): tag ${nextRelease.vcTagPrefix} version ${nextRelease.version} [skip ci]`;
        }
        logger.info(`Tagging SVN version at ${tagLocation}`);
        await execSvn(["copy", options.repo, tagLocation, "-m", tagMessage], execaOpts);
    }
    else {
        throw new Error("Invalid repository type");
    }
}


function throwVcsError(msg: string, logger: any)
{
    logger.error(msg);
    throw new Error(msg);
}



/**
 * Verify the write access authorization to remote repository with push dry-run.
 *
 * @param context context
 * @param execaOpts Options to pass to `execa`.
 *
 * @throws {Error} if not authorized to push or the repository type is invalid.
 */
export async function verifyAuth({ options, logger }, execaOpts: any)
{
    try
    {
        if (options.repoType === "git") {
            try {
                await execa("git", ["push", "--dry-run", options.repo, `HEAD:${options.branch}`], execaOpts);
            }
            catch (error) {
                if (!(await isBranchUpToDate(options.branch, context, options)))
                {
                    logger.info(
                        `The local branch ${
                        options.branch
                        } is behind the remote one, can't publish a new version.`
                    );
                    return;
                }
                throw error;
            }
        }
        else if (options.repoType === "svn")
        {
            try {
                await execa("svn", ["merge", "--dry-run", "-r", "BASE:HEAD", "." ], execaOpts);
            }
            catch (error) {
                if (!error.toString().includes("E195020")) { // Cannot merge into mixed-revision working copy
                    logger.info(
                        `The remote branch ${
                        options.branch
                        } is behind the local one, won't publish a new version.`
                    );
                    return;
                }
            }
        }
        else {
            throw new Error("Invalid repository type");
        }

        logger.info(`Allowed to push to the ${options.repoType} repository`);
    }
    catch (error)
    {
        debug(error);
        throw error;
    }
}


/**
 * Verify a tag name is a valid Git reference.
 *
 * @param tagName the tag name to verify.
 * @param execaOpts Options to pass to `execa`.
 *
 * @return `true` if valid, falsy otherwise.
 */
export async function verifyTagName(tagName: string, execaOpts: any, repoType = "git")
{
    try
    {
        if (repoType === "git") {
            return (await execa("git", ["check-ref-format", `refs/tags/${tagName}`], execaOpts)).code === 0;
        }
        else if (repoType === "svn") {
            //
            // TODO
            //
            return (await execa("svn", ["check-ref-format", `refs/tags/${tagName}`], execaOpts)).code === 0;
        }
        throw new Error("Invalid repository type");
    }
    catch (error)
    {
        debug(error);
        throw error;
    }
}
