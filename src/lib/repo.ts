
import * as path from "path";
const execa = require("execa");
const debug = require("debug")("app-publisher:git");
const xml2js = require("xml2js");


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
export async function isVersioned({options, env}, objectPath: string, execaOpts: any, appendPre = false, changePath = false)
{
    let vcFile = objectPath,
        isVersioned = false,
        proc: any;

    if (appendPre && options.pathPreRoot) {
        vcFile = path.normalize(path.join(options.pathPreRoot, objectPath));
    }

    if (changePath && options.pathToMainRoot && options.pathToMainRoot !== ".") {
        process.chdir(path.normalize(options.pathToMainRoot));
    }
    if (options.repoType === "svn")
    {
        proc = await execSvn(["info", vcFile], execaOpts);
    }
    else {
        proc = await execa("git", ["ls-files", "--error-unmatch", vcFile ], execaOpts);
    }
    if (proc.code === 0) {
        isVersioned = true;
    }
    //
    // Change directory back to project root
    // PATHTOPREROOT will be defined if PATHTOMAINROOT is
    //
    if (changePath && options.pathToMainRoot && options.pathToMainRoot !== ".") {
        process.chdir(path.normalize(options.pathPreRoot));
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
export async function tag({options, logger, nextRelease}, execaOpts: any, repoType = "git")
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

    if (repoType === "git")
    {
        tagLocation = nextRelease.tag;
        if (options.vcTagPrefix && options.vcTagPrefix !== ".")
        {
            tagLocation = `${nextRelease.vcTagPrefix}-${nextRelease.tag}`;
            tagMessage = `chore(release): tag ${nextRelease.vcTagPrefix} version ${nextRelease.version} [skip ci]`;
        }
        logger.log(`Tagging SVN version at ${tagLocation}`);
        if (options.githubRelease !== "Y" && options.githubRelease !== true) {
            await execa("git", ["tag", "-a", tagLocation, "-m", tagMessage], execaOpts);
        }
        else {
            logger.log("Re-tagging after release");
            const proc = await execa("git", [ "push", "origin", ":refs/tags/" + tagLocation ], execaOpts);
            if (proc.code === 0) {
                await execa("git", ["tag", "-fa", tagLocation, "-m", tagMessage], execaOpts);
            }
        }
    }
    else if (repoType === "svn")
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
export async function push(repo: any, execaOpts: any, version: string, repoType = "git")
{
    if (repoType === "git") {
        await execa("git", ["push", "--tags", repo], execaOpts);
    }
    else if (repoType === "svn") {
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
export async function commit({options}, execaOpts: any, version: string)
{
    if (options.repoType === "git") {
        const proc = await execa("git", ["commit", "--quiet", "-m", `"chore(release): $VERSION [skip ci]` ], execaOpts);
        if (proc.code === 0) {
            await execa("git", ["commit", "push", "origin", `${options.branch}:${options.branch}` ], execaOpts);
        }
    }
    else if (options.repoType === "svn") {
        await execa("svn", ["commit", "-m", `chore: v${version} [skip ci]`], execaOpts);
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
export async function revert(changeList: string[] | undefined, execaOpts: any, repoType = "git")
{
    if (repoType === "git") {
        throw new Error("Method not implemented");
    }
    else if (repoType === "svn") {
        if (!changeList) {
            await execa("svn", [ "revert", "-R", "." ], execaOpts);
            await execa("svn", [ "cleanup", ".", "--remove-unversioned" ], execaOpts);
        }
        else {
            await execa("svn", [ "revert", "-R", ...changeList ], execaOpts);
            // for (const change of changeList)
            // {
            //     await execa("svn", ["revert", change ], execaOpts);
            // }
        }
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
