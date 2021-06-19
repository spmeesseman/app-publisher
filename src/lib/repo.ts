const execa = require("execa");
const debug = require("debug")("app-publisher:git");
const xml2js = require("xml2js");


/**
 * Get the commit sha for a given tag.
 *
 * @param {String} tagName Tag name for which to retrieve the commit sha.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @return {string} The commit sha of the tag in parameter or `null`.
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
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @returns {Array<String>} List of git tags.
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
 * @param {String} ref The reference to look for.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @return {Boolean} `true` if the reference is in the history of the current branch, falsy otherwise.
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
        try
        {
            await execa("git", ["fetch", "--unshallow", "--tags", repo], execaOpts);
        }
        catch (error)
        {
            await execa("git", ["fetch", "--tags", repo], execaOpts);
        }
    }
}


/**
 * Get the HEAD sha.
 *
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @return {String} the sha of the HEAD commit.
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
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @return {string} The value of the remote git URL.
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
 * @param {Object} [execaOpts] Options to pass to `execa`.
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
 * @param execaOpts Options to pass to `execa`
 *
 * @return `true` if the current working directory is in a git repository, falsy otherwise.
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
export async function tag(tagName: any, execaOpts: any, repoType = "git")
{
    if (repoType === "git") {
        await execa("git", ["tag", tagName], execaOpts);
    }
    else if (repoType === "svn") {
        //
        // TODO
        //
        await execa("svn", ["tag", tagName], execaOpts);
    }
    else {
        throw new Error("Invalid repository type");
    }
}

/**
 * Push to the remote repository.
 *
 * @param {String} repo The remote repository URL.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @throws {Error} if the push failed.
 */
export async function push(repo: any, execaOpts: any, version: string, repoType = "git")
{
    if (repoType === "git") {
        await execa("git", ["push", "--tags", repo], execaOpts);
    }
    else if (repoType === "svn") {
        await execa("svn", ["commit", "-m", "chore: v" + version + " [skip ci]"], execaOpts);
    }
    else {
        throw new Error("Invalid repository type");
    }
}


/**
 * Verify a tag name is a valid Git reference.
 *
 * @param {String} tagName the tag name to verify.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @return {Boolean} `true` if valid, falsy otherwise.
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
 * @param {String} branch The repository branch for which to verify status.
 * @param {Object} [execaOpts] Options to pass to `execa`.
 *
 * @return {Boolean} `true` is the HEAD of the current local branch is the same as the HEAD of the remote branch, falsy otherwise.
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
