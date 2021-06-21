
import * as path from "path";
import { isString } from "./utils/utils";
import { deleteFile, pathExists } from "./utils/fs";
const execa = require("execa");
const debug = require("debug")("app-publisher:git");
const xml2js = require("xml2js");


export async function addEdit({options, nextRelease, env, cwd}, pathToAdd: string | string[])
{
    if (!pathToAdd || pathToAdd.length === 0) {
        return;
    }

    function _add(p: string) // , isDir = false)
    {
        let editType = "M";
        const pathResolved = path.relative(cwd, path.resolve(p));
        if (!isVersioned({options}, pathResolved, {cwd, env}))
        {
            // if (!isDir) {
                const dir = path.dirname(pathResolved);
                if (!isVersioned({options}, dir, {cwd, env})) {
                    _add(dir); // , true);
                }
            // }
            editType = "A";
        }
        nextRelease.edits.push({
            path: pathResolved,
            type: editType
        });
    }

    if (isString(pathToAdd)) {
        _add(pathToAdd);
    }
    else {
        for (const p of pathToAdd) {
            _add(p);
        }
    }
}


/**
 * Get the commit sha for a given tag.
 *
 * @param tagName Tag name for which to retrieve the commit sha.
 * @param execaOpts Options to pass to `execa`.
 *
 * @returns {string} The commit sha of the tag in parameter or `null`.
 */
export async function getTagHead(tagName: any, execaOpts: { cwd: any; env: any; }, { branch, repo, repoType })
{
    try
    {
        if (repoType === "git")
        {
            return await execa.stdout("git", ["rev-list", "-1", tagName], execaOpts);
        }
        else if (repoType === "svn")
        {
            const tagLocation = repo.replace("trunk", "tags").replace("branches/" + branch, "tags"),
                  head = await execa.stdout("svn", ["log", tagLocation + "/" + tagName, "-v", "--stop-on-copy"], execaOpts);
            let match: RegExpExecArray;
            if ((match = /^r([0-9]+) \|/m.exec(head)) !== null)
            {
                return match[1];
            }
        }
        else {
            throw new Error("Invalid repository type");
        }
    } catch (error)
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
 * @throws {Error} If the `git` or `svn` command fails.
 */
export async function getTags({env, options, logger}, execaOpts: any)
{
    if (options.repoType === "git")
    {
        return (await execa.stdout("git", ["tag"], execaOpts))
            .split("\n")
            .map((tag: { trim: () => void; }) => tag.trim())
            .filter(Boolean);
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

        logger.log("Parsing response from SVN");
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
                            // logger.log("Found version tag:");
                            // logger.log(`   Tag     : ${match[1]}`);
                            // logger.log(`   Rev     : ${logEntry.$.revision}`);
                            // logger.log(`   Path    : ${pathObj._}`);
                            // logger.log(`   Date    : ${logEntry.date[0]}`);
                            tags.push(match[1]);
                        }
                    }
                }
            });
            logger.log("Found " + tags.length + " version tags");
            return tags;
        }
        catch (e) {
            logger.error("Response could not be parsed, invalid module, no commits found, or no version tag exists");
            throw e;
        }
    }
    else {
        throw new Error("Invalid repository type");
    }
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
 * Unshallow the git repository if necessary and fetch all the tags.
 *
 * @param context context
 * @param execaOpts execa options
 */
export async function fetch({ repo, repoType }, execaOpts: any)
{
    if (repoType === "git")
    {
        try {
            await execa("git", ["fetch", "--unshallow", "--tags", repo], execaOpts);
        }
        catch (error) {
            await execa("git", ["fetch", "--tags", repo], execaOpts);
        }
    }
    else if (repoType === "svn")
    {
        await execSvn([ "update", "--force" ], execaOpts);
    }
    else {
        throw new Error("Invalid repository type");
    }
}


/**
 * Get the HEAD sha.
 *
 * @param execaOpts Options to pass to `execa`.
 *
 * @returns The sha of the HEAD commit.
 */
export function getHead(execaOpts: any, repoType = "git")
{
    if (repoType === "git") {
        return execa.stdout("git", ["rev-parse", "HEAD"], execaOpts);
    }
    else if (repoType === "svn")
    {
        const head = execa.stdout("svn", ["info", "-r", "HEAD"], execaOpts);
        let match: RegExpExecArray;
        if ((match = /^Revision: ([0-9]+)$/m.exec(head)) !== null)
        {
            return match[1];
        }
    }
    else {
        throw new Error("Invalid repository type");
    }
}


/**
 * Get the repository remote URL.
 *
 * @param execaOpts Options to pass to `execa`.
 *
 * @returns The value of the remote git URL.
 */
export async function repoUrl(execaOpts: any, repoType = "git")
{
    try
    {
        if (repoType === "git") {
            return await execa.stdout("git", ["config", "--get", "remote.origin.url"], execaOpts);
        }
        else if (repoType === "svn") {
            //
            // TODO
            //
            return await execa.stdout("svn", ["config", "--get", "remote.origin.url"], execaOpts);
        }
        else {
            throw new Error("Invalid repository type");
        }
    }
    catch (error)
    {
        debug(error);
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
 * Executes svn command with credentials if set in the environment.
 *
 * @since 2.8.0
 *
 * @param execaArgs Arguments to pass to `svn`
 * @param execaOpts Options to pass to `execa`
 *
 * @returns The process object returned by execa()
 */
async function execSvn(execaArgs: string[], execaOpts: any)
{
    let proc: any;
    const svnUser = process.env.SVN_AUTHOR_NAME,
          svnToken = process.env.SVN_TOKEN;
    if (svnUser && svnToken) {
        proc = await execa("svn", [...execaArgs, "--non-interactive", "--no-auth-cache", "--username", svnUser, "--password", svnToken ], execaOpts);
    }
    else {
        proc = await execa("svn", [...execaArgs, "--non-interactive" ], execaOpts);
    }
    return proc;
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
 * @returns `true` if the specifed file or directory is under version control.
 */
export async function isVersioned({options}, objectPath: string, execaOpts: any, appendPre = false, changePath = false)
{
    let isVersioned = false,
        proc: any;

    if (options.repoType === "svn")
    {
        proc = await execSvn(["info", objectPath], execaOpts);
    }
    else {
        proc = await execa("git", ["ls-files", "--error-unmatch", objectPath ], execaOpts);
    }
    if (proc.code === 0) {
        isVersioned = true;
    }

    return isVersioned;
}


/**
 * Verify the write access authorization to remote repository with push dry-run.
 *
 * @param context context
 * @param execaOpts Options to pass to `execa`.
 *
 * @throws {Error} if not authorized to push.
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
                    logger.log(
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
                    logger.log(
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

        logger.log(`Allowed to push to the ${options.repoType} repository`);
    }
    catch (error)
    {
        debug(error);
        throw error;
    }
}

/**
 * Tag the commit head on the local repository.
 *
 * @param tagName The name of the tag.
 * @param execaOpts Options to pass to `execa`.
 *
 * @throws {Error} if the tag creation failed.
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
        logger.log(`Tagging Git version at ${tagLocation}`);
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
            logger.log("Re-tagging after release");
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
        logger.log(`Tagging SVN version at ${tagLocation}`);
        await execSvn(["copy", options.repo, tagLocation, "-m", tagMessage], execaOpts);
    }
    else {
        throw new Error("Invalid repository type");
    }
}

/**
 * Push to the remote repository.
 *
 * @param repo The remote repository URL.
 * @param execaOpts Options to pass to `execa`.
 *
 * @throws {Error} if the push failed.
 */
export async function push({options}, execaOpts: any)
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
        throw new Error("Invalid repository type");
    }
}


/**
 * Push to the remote repository.
 *
 * @param repo The remote repository URL.
 * @param execaOpts Options to pass to `execa`.
 *
 * @throws {Error} if the commit failed.
 */
export async function commit({options, nextRelease, logger}, execaOpts: any)
{
    let proc,
        addFailed = false;

    if (!nextRelease.edits || nextRelease.edits === 0) {
        logger.info("Commit - Nothing to commit");
        return;
    }

    const changeListAdd: string = nextRelease.edits.filter((e: any) => e.type === "A").map((e: any) => e.path).join(" ").trim(),
          changeList: string = nextRelease.edits.map((e: any) => e.path).join(" ").trim();

    if (options.repoType === "git")
    {
        if (changeListAdd)
        {
            logger.info("Adding unversioned touched files to git version control");
            logger.info("   " + changeListAdd);
            proc = await execa("git", [ "add", "--", changeListAdd ], execaOpts);
            addFailed = proc.code !== 0;
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
        throw new Error("Invalid repository type");
    }
}


/**
 * @since 2.8.0
 * @param changeList Changelist.  If not specified, a recursive revert is done
 * @param execaOpts Options to pass to `execa`.
 * @param repoType Repositorytype, one of 'git' or 'svn'
 */
export async function revert(edits: string[] | undefined, execaOpts: any, repoType = "git")
{
    const changeListAdd = edits.filter((e: any) => e.type === "A").join(" "),
          changeListModify = edits.filter((e: any) => e.type === "M").join(" ");

    for (const file of changeListAdd) {
        await deleteFile(file);
    }

    if (repoType === "git") {
        await execa("git", [ "stash", "push", "--", changeListModify ], execaOpts);
        await execa("git", [ "stash", "drop" ], execaOpts);
    }
    else if (repoType === "svn") {
        await execSvn([ "revert", "-R", changeListModify ], execaOpts);
    }
    else {
        throw new Error("Invalid repository type");
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

/**
 * Verify the local branch is up to date with the remote one.
 *
 * @param branch The repository branch for which to verify status.
 * @param execaOpts Options to pass to `execa`.
 *
 * @returns `true` is the HEAD of the current local branch is the same as the HEAD of the remote branch, falsy otherwise.
 */
export async function isBranchUpToDate(branch: any, execaOpts: any, options: any)
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
        throw new Error("Invalid repository type");
    }
    catch (error)
    {
        debug(error);
        throw error;
    }
}
