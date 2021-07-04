
import * as path from "path";
import { execaEx, isString } from "./utils/utils";
import { deleteFile, pathExists } from "./utils/fs";
import { IContext, IEdit } from "../interface";
const execa = require("execa");
const xml2js = require("xml2js");
import { EOL } from "os";


export async function addEdit(context: IContext, pathToAdd: string | string[])
{
    if (!pathToAdd || pathToAdd.length === 0) {
        return;
    }

    const {nextRelease} = context;

    async function doAdd(p: string) // , isDir = false)
    {
        let editType = "M";
        //
        // Check existence in edits already
        //
        for (const e of nextRelease.edits)
        {
            if (p === e.path) {
                return;
            }
        }
        //
        // Resolve path, our cwd may not be the process cwd
        //
        const pathResolved = path.relative(process.cwd(), path.resolve(p)),
              versioned = await isVersioned(context, pathResolved);
        //
        // If the edit is already versioned, tag it with "M", if it is not under vc, then
        // tag it with an "A".  If it is ignored from vc, tag it with an "I". Non-vc files
        // will get deleted on revert in the event of a run fail or a dry run completion (if
        // the 'vcRevert' flag is set to Y).
        //
        if (!versioned)
        {
            const ignored = await isIgnored(context, pathResolved);
            editType = !ignored ? "A" : "I";
        }
        //
        // Save the edit
        //
        nextRelease.edits.push({
            path: pathResolved,
            type: editType
        });
    }

    if (isString(pathToAdd)) {
        await doAdd(pathToAdd);
    }
    else {
        for (const p of pathToAdd) {
            await doAdd(p);
        }
    }
}


/**
 * Push to the remote repository.
 *
 * @param context The run context object.
 *
 * @throws {Error} if the commit failed or the repository type is invalid.
 */
export async function commit(context: IContext)
{
    let proc: any,
        vcRcFileCt = 0;
    const {options, nextRelease, lastRelease, logger, cwd, env} = context;

    if (!nextRelease.edits || nextRelease.edits.length === 0) {
        logger.info("Commit - Nothing to commit");
        return;
    }

    const changeListAdd = nextRelease.edits.filter((e: any) => e.type === "A"),
          changeList = nextRelease.edits.filter((e: any) => e.type !== "I");

    logger.info("Commit changes");

    if (options.vcFiles)
    {
        for (let vcFile of options.vcFiles)
        {
            vcFile = vcFile.replace("$(VERSION)", nextRelease.version)
                           .replace("$(NEXTVERSION)", nextRelease.version)
                           .replace("$(LASTVERSION)", lastRelease.version);
            if (await pathExists(vcFile))
            {
                if (await isVersioned(context, vcFile)) {
                    if (options.verbose) {
                        logger.info(`vcFiles: Pushed ${vcFile} to 'modified' files`);
                    }
                    changeList.push({ path: vcFile, type: "M" });
                }
                else {
                    if (options.verbose) {
                        logger.info(`vcFiles: Pushed ${vcFile} to 'added' files`);
                    }
                    changeListAdd.push({ path: vcFile, type: "A" });
                    changeList.push({ path: vcFile, type: "A" });
                }
                ++vcRcFileCt;
            }
            else {
                logger.warn(`   The file ${vcFile} specified in 'vcFiles' does not exist`);
            }
        }
    }

    logger.info(`   Total Edits     : ${vcRcFileCt + nextRelease.edits.length}`);
    logger.info(`   Additions       : ${changeListAdd.length}`);
    logger.info(`   Total to commit : ${changeList.length}`);

    if (options.repoType === "git")
    {
        if (changeListAdd.length > 0)
        {
            const chgListPathsAdded = changeListAdd.map((e: any) => e.path);
            logger.info("Adding unversioned touched files to git version control");
            if (options.verbose) {
                context.stdout.write("   " + chgListPathsAdded.join(EOL + "   ") + EOL);
            }
            if (!options.dryRun) {
                proc = await execa("git", [ "add", "--", ...chgListPathsAdded ], { cwd, env });
            }
            else {
                proc = await execa("git", [ "add", "--dry-run", "--", ...chgListPathsAdded ], { cwd, env });
            }
            if (proc.code !== 0) {
                logger.warn("Add file(s) to VCS failed");
            }
            //
            // Remove 'added' files from thr main changelist if this is a dry run
            //
            if (options.dryRun)
            {
                for (const c of changeListAdd) {
                    if (changeList.includes(c)) {
                        changeList.splice(changeList.indexOf(c), 1);
                    }
                }
            }
        }
        if (changeList.length > 0)
        {
            const chgListPaths = changeList.map((e: any) => e.path);
            logger.info("Committing touched files to git version control");
            if (options.verbose) {
                context.stdout.write("   " + chgListPaths.join(EOL + "   ") + EOL);
            }
            if (!options.dryRun) {
                proc = await execaEx(context, "git", [ "commit", "-m", `"chore(release): v${nextRelease.version} [skip ci]"`, "--", ...chgListPaths ]);
            }
            else {
                proc = await execaEx(context, "git", [ "commit", "--dry-run", "-m", `"chore(release): v${nextRelease.version} [skip ci]"`, "--", ...chgListPaths  ]);
            }
            if (proc.code === 0) {
                logger.info("Pushing touched files to git version control");
                if (!options.dryRun) {
                    proc = await execaEx(context, "git", [ "push", "origin", `${options.branch}:${options.branch}` ]);
                }
                else {
                    proc = await execaEx(context, "git", [ "push", "--dry-run", "origin", `${options.branch}:${options.branch}` ]);
                }
            }
            else {
                logger.warn("Add file(s) to VCS failed");
            }
        }
    }
    else if (options.repoType === "svn")
    {
        if (changeListAdd.length > 0)
        {
            const chgListPathsAdded = changeListAdd.map((e: any) => e.path);
            logger.info("Adding unversioned touched files to svn version control");
            if (options.verbose) {
                context.stdout.write("   " + chgListPathsAdded.join(EOL + "   ") + EOL);
            }
            if (!options.dryRun) {
                await execSvn(context, [ "add", ...chgListPathsAdded ]);
            }
            else {
                await execSvn(context, ["merge", "--dry-run", "-r", "BASE:HEAD", "." ]);
            }
        }
        if (changeList.length > 0)
        {
            const chgListPaths = changeList.map((e: any) => e.path);
            logger.info("Committing touched files to svn version control");
            if (options.verbose) {
                context.stdout.write("   " + chgListPaths.join(EOL + "   ") + EOL);
            }
            if (!options.dryRun) {
                await execSvn(context, ["commit", ...chgListPaths, "-m", `"chore: v${nextRelease.version} [skip ci]"` ]);
            }
            else {
                await execSvn(context, ["merge", "--dry-run", "-r", "BASE:HEAD", "." ]);
            }
        }
    }
    else {
        throwVcsError(`Invalid repository type: ${options.repoType}`, logger);
    }

    logger.success((options.dryRun ? "Dry run - " : "") + `Successfully committed changes for v${nextRelease.version}`);
}


/**
 * Checks if a tag exists in the repository
 *
 * @param context The run context object.
 * @param tag The tag name to check for.
 *
 * @returns `true` if the tag exists, `false` otherwise
 * @throws {Error} If the `git` or `svn` command fails or the repository type is invalid.
 */
export async function doesTagExist(context: IContext, tag: string): Promise<boolean>
{
    const {options, logger, cwd, env} = context;

    logger.info("Check tag exists : " + tag);

    if (options.repoType === "git")
    {
        return (await execa.stdout("git", ["tag"], { cwd, env }))
                           .split("\n")
                           .map((tag: { trim: () => void }) => tag.trim())
                           .filter((f: string) => f === tag)
                           .length > 0;
    }
    else if (options.repoType === "svn")
    {
        const tags: string[] = [],
              parser = new xml2js.Parser(),
              tagLocation = getSvnTagLocation({options, logger});

        const xml = await execSvn(context, [ "log", "--xml", `${tagLocation}`, "--verbose", "--limit", "50" ], true);

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
                        if (pathObj.$ && pathObj.$.action === "A" && pathObj.$.kind === "dir" && match && match[1] === tag)
                        {
                            return true;
                        }
                    }
                }
            });
        }
        catch (e) {
            logger.error("Response could not be parsed, invalid module, no commits found, or no version tag exists");
            throw e;
        }
    }
    else {
        throwVcsError(`Invalid repository type: ${options.repoType}`, logger);
    }

    return false;
}


/**
 * Executes svn command with credentials if set in the environment.
 *
 * @since 2.8.0
 *
 * @param svnArgs Arguments to pass to `svn`
 * @param execaOpts Options to pass to `execa`
 * @param stdout Return stdout as opposed to process rc
 *
 * @returns The process object returned by execa()
 */
async function execSvn(context: IContext, svnArgs: string[], stdout = false)
{
    let proc: any;
    const {cwd, env} = context,
          svnUser = process.env.SVN_AUTHOR_NAME,
          svnToken = process.env.SVN_TOKEN;

    if (svnUser && svnToken) {
        if (!stdout) {
             proc = await execaEx(context, "svn", [...svnArgs, "--non-interactive", "--no-auth-cache", "--username", svnUser, "--password", svnToken ]);
        }
        else {
            try {
                proc = await execa.stdout("svn", [...svnArgs, "--non-interactive", "--no-auth-cache", "--username", svnUser, "--password", svnToken ], {cwd, env});
            }
            catch (e) {
                return e.toString();
            }
        }
    }
    else {
        if (!stdout) {
            proc = await execaEx(context, "svn", [...svnArgs, "--non-interactive" ]);
        }
        else {
            try {
                proc = await execa.stdout("svn", [...svnArgs, "--non-interactive" ], {cwd, env});
            }
            catch (e) {
                return e.toString();
            }
        }
    }
    return proc;
}


/**
 * Unshallow the git repository if necessary and fetch all the tags.
 *
 * @param context The run context object.
 * @param execaOpts execa options
 */
export async function fetch(context: IContext)
{
    const { options, logger, cwd, env, stdout } = context;

    if (options.repoType === "git")
    {
        try {
            await execaEx(context, "git", ["fetch", "--unshallow", "--tags", options.repo]);
        }
        catch (error) {
            await execaEx(context, "git", ["fetch", "--tags", options.repo]);
        }
    }
    else if (options.repoType === "svn")
    {
        await execSvn(context, [ "update", "--force" ]);
    }
    else {
        throwVcsError(`Invalid repository type: ${options.repoType}`, logger);
    }
}


/**
 * Get the HEAD sha.
 *
 * @param context The run context object.
 *
 * @returns The sha of the HEAD commit.
 */
export async function getHead(context: IContext)
{
    const {options, logger, cwd, env} = context;
    try {
        if (options.repoType === "git") {
            return await execa.stdout("git", ["rev-parse", "HEAD"], { cwd, env });
        }
        else if (options.repoType === "svn")
        {
            const head = await execSvn(context, ["info", "-r", "HEAD"], true);
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
    catch (error)
    {
        throwVcsError(error.toString(), logger);
    }
}


function getSvnTagLocation({options, logger})
{
    const svnTagLoc = options.repo.replace(options.branch, "tags");
    if (options.verbose) {
        logger.info("The svn tag location is " + svnTagLoc);
    }
    return svnTagLoc;
}


/**
 * Get the commit sha for a given tag.
 *
 * @param context The run context object.
 * @param tagName Tag name for which to retrieve the commit sha.
 *
 * @returns The commit sha of the tag in parameter or `null`.
 */
export async function getTagHead(context: IContext, tagName: any): Promise<string>
{
    const {options, logger, cwd, env} = context;
    try {
        if (options.repoType === "git")
        {
            return await execa.stdout("git", ["rev-list", "-1", tagName], { cwd, env });
        }
        else if (options.repoType === "svn")
        {
            const tagLocation = options.repo.replace(options.branch, "tags"),
                  head = await execSvn(context, ["log", tagLocation + "/" + tagName, "-v", "--stop-on-copy"], true);
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
        throwVcsError(error.toString(), logger);
    }
}


/**
 * Get all the repository tags.
 *
 * @param context The run context object.
 *
 * @returns List of tags.
 * @throws {Error} If the `git` or `svn` command fails or the repository type is invalid.
 */
export async function getTags(context: IContext)
{
    const {options, logger, cwd, env} = context;

    logger.info("Get tags");

    if (options.repoType === "git")
    {
        return (await execa.stdout("git", ["tag"], { cwd, env })).split("\n").map((tag: { trim: () => void }) => tag.trim()).filter(Boolean);
    }
    else if (options.repoType === "svn")
    {
        const tags: string[] = [],
              parser = new xml2js.Parser(),
              tagLocation = getSvnTagLocation({options, logger});

        const xml = await execSvn(context, [ "log", "--xml", `${tagLocation}`, "--verbose", "--limit", "50" ], true);

        logger.info("Parsing response from SVN");
        try {
            parser.parseString(xml, (err: any, result: any) =>
            {
                if (err) {
                    throw new Error(err);
                }
                for (const logEntry of result.log.logentry) {
                    for (const p of logEntry.paths)
                    {
                        const pathObj = p.path[0],
                              regex = new RegExp(".*/tags/(v[0-9\.]+)"),
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
 * @param context The run context object.
 * @param branch The repository branch for which to verify status.
 *
 * @returns `true` is the HEAD of the current local branch is the same as the HEAD of the remote branch, falsy otherwise.
 */
export async function isBranchUpToDate(context: IContext, branch: any)
{
    const {options, logger, cwd, env} = context,
          execaOpts = { cwd, env };
    try
    {
        if (options.repoType === "git") {
            const remoteHead = await execa.stdout("git", ["ls-remote", "--heads", "origin", branch], execaOpts);
            return await isRefInHistory(context, remoteHead.match(/^(\w+)?/)[1]);
        }
        else if (options.repoType === "svn") {
            //
            // TODO
            //
            return true;
            // return await isRefInHistory(context, remoteHead.match(/^(\w+)?/)[1]);
        }
        else {
            throwVcsError(`Invalid repository type: ${options.repoType}`, logger);
        }
    }
    catch (error)
    {
        logger.error("Exception in isBranchUpToDate: " + error.toString());
        throw error;
    }
}


/**
 * Test if the current working directory is a Git repository.
 *
 * @param context The run context object.
 *
 * @returns `true` if the current working directory is in a git repository, falsy otherwise.
 */
export async function isGitRepo(context: IContext)
{
    const { logger, cwd, env } = context;
    try
    {
        return (await execaEx(context, "git", ["rev-parse", "--git-dir"])).code === 0;
    }
    catch (error) {
        logger.error("Exception in isGitRepo: " + error.toString());
    }
}


export async function isIgnored(context: IContext, objectPath: string)
{
    const {options, logger, cwd, env} = context,
          nPath = path.normalize(objectPath);

    // const excapedRegex = escapeRegExp(objectPath);
    logger.info(`Check ignored property for '${nPath}'`);

    if (options.repoType === "svn")
    {
        try {
            const stdout = await execSvn(context, ["propget", "svn:ignore", path.dirname(objectPath) ], true);
            if (new RegExp(`^${objectPath}$`, "gm").test(stdout)) {
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
            try {
                const proc = await execaEx(context, "git", ["check-ignore", "--quiet", objectPath ]);
                if (proc.code === 0) {
                    logger.info("   This file is being ignored from version control");
                    return true;
                }
            }
            catch (e) {
                if (e.code !== 1) {
                    throw(e);
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
 * @param context The run context object.
 * @param ref The reference to look for.
 * @param isTags isTags?
 *
 * @returns `true` if the reference is in the history of the current branch, falsy otherwise.
 */
export async function isRefInHistory(context: IContext, ref: any, isTags = false)
{
    const { options: {repo, branch, repoType}, cwd, env, logger } = context;
    try
    {
        if (repoType === "git") {
            await execaEx(context, "git", ["merge-base", "--is-ancestor", ref, "HEAD"]);
        }
        else if (repoType === "svn") {
            const tagLoc = !isTags ? repo : repo.replace(branch, "tags");
            await execSvn(context, ["ls", tagLoc + "/" + ref]);
        }
        else {
            throw new Error("Invalid repository type");
        }
        return true;
    }
    catch (error) {
        logger.error("Exception in isRefInHistory: " + error.toString());
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
export async function isSvnRepo(context: IContext)
{
    const {logger} = context;
    try
    {
        return (await execSvn(context, ["info"])).code === 0;
    }
    catch (error) {
        logger.error("Exception in isSvnRepo: " + error.toString());
    }
}


/**
 * Determines whether the specifed file or directory is under version control.
 *
 * @since 2.8.0
 *
 * @param context The run context object.
 * @param objectPath Path to the file or directory
 *
 * @throws {Error} if the repository type is invalid
 * @returns `true` if the specifed file or directory is under version control, `false` otherwise.
 */
export async function isVersioned(context: IContext, objectPath: string)
{
    let isVersioned = false,
        stdout: string;
    const {options, logger, cwd, env} = context;
    try {
        if (options.repoType === "svn")
        {   //
            // If not versioned, the error message shouldbe:
            //     svn: warning: W155010: The node '...' was not found.
            //     svn: E200009: Could not display info for all targets because some targets don't exist
            //
            stdout = await execSvn(context, ["info", objectPath], true);
            isVersioned = !stdout.includes("W155010") && !stdout.includes("E200009");
        }
        else if (options.repoType === "git")
        {   //
            // If not versioned, the error message shouldbe:
            //     error: pathspec 'test.txt' did not match any file(s) known to git
            //
            stdout = await execa.stdout("git", ["ls-files", "--error-unmatch", objectPath ], { cwd, env });
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
 * @param context The run context object.
 *
 * @throws {Error} if the push failed or the repository type is invalid.
 */
export async function push(context: IContext)
{
    const {options, logger} = context;
    if (options.repoType === "git") {
        if (!options.dryRun) {
            await execaEx(context, "git", ["push", "--tags", options.repo]);
        }
        else {
            await execaEx(context, "git", ["push", "--dry-run", "--tags", options.repo]);
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
 * @param context The run context object.
 *
 * @returns The value of the remote git URL.
 */
export async function repoUrl({options, logger, cwd, env}: IContext)
{
    const execaOpts = { cwd, env };
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
        logger.error("Exception in repoUrl: " + error.toString());
    }
}


/**
 * Revert in vcs.  If 'files' is not specified, reverts all changes made by the publish run.
 *
 * @since 2.8.0
 * @param context The run context object.
 * @param files The filesto revert.  If not specified, all changes made by the publish run are reverted.
 * @throws {Error} if the vcs command failed or the repository type is invalid.
 */
export async function revert(context: IContext, files?: IEdit[])
{
    const {options, nextRelease, lastRelease, logger} = context;

    if (!files && (!nextRelease || !nextRelease.edits)) {
        return;
    }

    let vcRcFileCt = 0;
    const changeListAdd = !files ? nextRelease.edits.filter((e: any) => e.type === "A") :
                                   files.filter((e: any) => e.type === "A"),
          changeListModify = !files ? nextRelease.edits.filter((e: any) => e.type === "M") :
                                      files.filter((e: any) => e.type === "M");

    logger.info("Revert changes");

    if (options.vcRevertFiles)
    {
        for (let vcFile of options.vcRevertFiles)
        {
            vcFile = vcFile.replace("$(VERSION)", nextRelease.version)
                           .replace("$(NEXTVERSION)", nextRelease.version)
                           .replace("$(LASTVERSION)", lastRelease.version);
            if (await pathExists(vcFile))
            {
                if (await isVersioned(context, vcFile)) {
                    if (options.verbose) {
                        logger.info(`vcRevertFiles: Pushed ${vcFile} to 'modified' files`);
                    }
                    changeListModify.push({ path: vcFile, type: "M" });
                }
                else {
                    if (options.verbose) {
                        logger.info(`vcRevertFiles: Pushed ${vcFile} to 'added' files`);
                    }
                    changeListAdd.push({ path: vcFile, type: "A" });
                }
                ++vcRcFileCt;
            }
            else {
                logger.warn(`   The file ${vcFile} specified in 'vcRevertFiles' does not exist`);
            }
        }
    }

    logger.info(`   Total Edits   : ${vcRcFileCt + (!files ? nextRelease.edits.length : files.length)}`);
    logger.info(`   Additions     : ${changeListAdd.length}`);
    logger.info(`   Modifications : ${changeListModify.length}`);

    //
    // Additions - delete/remove
    //
    for (const changeEntry of changeListAdd) {
        try {
            logger.info(`Removing added file '${changeEntry.path}'`);
            await deleteFile(changeEntry.path);
        }
        catch (e) {
            logger.warn(`Could not remove file '${changeEntry.path}'`);
        }
    }

    //
    // Modifications - vc revert
    //
    if (changeListModify.length > 0) {
        try {
            const chgListPaths = changeListModify.map((e: any) => e.path);
            logger.info("Reverting all modifications:");
            logger.info("   " + chgListPaths.join(" "));
            if (options.repoType === "git") {
                await execaEx(context, "git", [ "stash", "push", "--", ...chgListPaths ]);
                await execaEx(context, "git", [ "stash", "drop" ]);
            }
            else if (options.repoType === "svn") {
                await execSvn(context, [ "revert", "-R", ...chgListPaths ]);
            }
            else {
                throwVcsError(`Invalid repository type: ${options.repoType}`, logger);
            }
        }
        catch (e) {
            logger.warn("Could not revert modified files");
        }
    }
}


/**
 * Tag the commit head on the local repository.
 *
 * @param context The run context object.
 *
 * @throws {Error} if the tag creation failed or the repository type is invalid.
 */
export async function tag(context: IContext)
{
    let tagMessage: string,
        tagLocation: string;
    const {options, logger, nextRelease, cwd, env} = context;

    if (options.repoType === "git")
    {
        tagLocation = nextRelease.tag;
        if (options.vcTagPrefix && options.vcTagPrefix !== ".")
        {
            tagLocation = `${options.vcTagPrefix}-${nextRelease.tag}`;
            tagMessage = `chore(release): tag ${options.vcTagPrefix} version ${nextRelease.version} [skip ci]`;
        }

        logger.info(`Tagging Git version at ${tagLocation}`);

        if (options.githubRelease !== "Y" || options.taskGithubRelease) {
            if (!options.dryRun) {
                await execaEx(context, "git", ["tag", "-a", tagLocation, "-m", tagMessage]);
            }
            else {
                await execaEx(context, "git", ["tag", "--dry-run",  "-a", tagLocation, "-m", tagMessage]);
            }
        }
        else { //
              // Making a github release even if 'unpublished' tags the repo.  Re-tag
             //
            logger.info("Re-tagging after release");
            if (!options.dryRun) {
                const proc = await execaEx(context, "git", [ "push", "origin", ":refs/tags/" + tagLocation ]);
                if (proc.code === 0) {
                    await execaEx(context, "git", ["tag", "-fa", tagLocation, "-m", tagMessage]);
                }
            }
            else {
                logger.info("   Dry-run emulate tag, success");
                // const proc = await execaEx(context, "git", [ "push", "--dry-run", "origin", ":refs/tags/" + tagLocation ]);
                // if (proc.code === 0) {
                //     await execaEx(context, "git", ["tag", "--dry-run", "-fa", tagLocation, "-m", tagMessage]);
                // }
            }
        }
    }
    else if (options.repoType === "svn")
    {
        tagLocation = getSvnTagLocation({options, logger});
        if (!options.vcTagPrefix || options.vcTagPrefix === ".")
        {
            tagLocation = `${tagLocation}/${nextRelease.tag}`;
            tagMessage = `chore(release): tag version ${nextRelease.version} [skip ci]`;
        }
        else {
            tagLocation = `${tagLocation}/${options.vcTagPrefix}-${nextRelease.tag}`;
            tagMessage = `chore(release): tag ${options.vcTagPrefix} version ${nextRelease.version} [skip ci]`;
        }
        logger.info(`Tagging SVN version at ${tagLocation}`);
        if (!options.dryRun) {
            await execSvn(context, ["copy", options.repo, tagLocation, "-m", tagMessage]);
        }
        else {
            logger.info("   Dry-run emulate tag, success");
        }
    }
    else {
        throwVcsError(`Invalid repository type: ${options.repoType}`, logger);
    }

    logger.success((options.dryRun ? "Dry run - " : "") + `Created tag ${nextRelease.tag}`);
}


/**
 * @private
 * @since 3.0.0
 * @param msg error message
 * @param logger logger
 */
function throwVcsError(msg: string, logger: any)
{
    logger.error(msg);
    throw new Error(msg);
}


/**
 * Verify the write access authorization to remote repository with push dry-run.
 *
 * @param context The run context object.
 *
 * @throws {Error} if not authorized to push or the repository type is invalid.
 */
export async function verifyAuth(context: IContext)
{
    const { options, logger, cwd, env } = context;

    logger.info("Verify vcs authorization");

    try
    {
        if (options.repoType === "git") {
            try {
                await execaEx(context, "git", ["push", "--dry-run", options.repo, `HEAD:${options.branch}`]);
            }
            catch (error) {
                if (!(await isBranchUpToDate(context, options.branch)))
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
                await execSvn(context, ["merge", "--dry-run", "-r", "BASE:HEAD", "." ]);
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
            throwVcsError(`Invalid repository type: ${options.repoType}`, logger);
        }

        logger.info(`Allowed to push to the ${options.repoType} repository`);
    }
    catch (error)
    {
        logger.error("Exception in verifyAuth: " + error.toString());
        throw error;
    }
}


/**
 * Verify a tag name is a valid Git reference.
 *
 * @param context The run context object.
 * @param tagName the tag name to verify.
 *
 * @return `true` if valid, falsy otherwise.
 */
export async function verifyTagName(context: IContext, tagName: string)
{
    const { options, logger, cwd, env } = context;

    logger.info("verify tag name");
    logger.info(`   Tag format    : ${tagName}`);

    try
    {
        if (options.repoType === "git") {
            return (await execaEx(context, "git", ["check-ref-format", `refs/tags/${tagName}`])).code === 0;
        }
        else if (options.repoType === "svn") {
            //
            // TODO - does svn have something similar to git?
            //
            // const tagLocation = getSvnTagLocation({options, logger});
            // return (await execSvn(["info", "-r", `${tagLocation}/${tagName}`])).code === 0;
            return /v[0-9\.\-]+/.test(tagName);
        }
        else {
            throw new Error("Invalid repository type");
        }
    }
    catch (error)
    {
        logger.error("Exception in verifyTagName: " + error.toString());
        throw error;
    }
}
