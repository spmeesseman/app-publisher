import gitLogParser from "git-log-parser";
import getStream from "get-stream";
const debug = require("debug")("app-publisher:get-commits");
const execa = require("execa");
const xml2js = require("xml2js");

export = getCommits;

/**
 * Retrieve the list of commits on the current branch since the commit sha associated with the last release, or all the commits of the current branch if there is no last released version.
 *
 * @param {Object} context app-publisher context.
 *
 * @return {Promise<Array<Object>>} The list of commits on the branch `branch` since the last release.
 */
async function getCommits({ cwd, env, options, lastRelease: { head }, logger })
{
    let commits: any[] = [];

    if (head)
    {
        debug("Use head: %s", head);
    }
    else
    {
        logger.log("No previous release found, retrieving all commits");
    }

    if (options.repoType === "git")
    {
        function processCommits(commit: any)
        {
            commit.message = commit.message.trim();
            commit.gitTags = commit.gitTags.trim();
            return commit;
        }

        Object.assign(gitLogParser.fields, { hash: "H", message: "B", gitTags: "d", committerDate: { key: "ci", type: Date } });

        commits = (await getStream.array(
            gitLogParser.parse({
                _: `${head ? head + ".." : ""}HEAD` }, { cwd, env: { ...process.env, ...env }
            })
        ))
        .map(processCommits);
    }
    else if (options.repoType === "svn")
    {
        //
        // Sample log entry:
        //
        // <log>
        //    <logentry
        //       revision="16845">
        //       <author>smeesseman</author>
        //       <date>2021-06-17T04:22:16.273124Z</date>
        //       <paths>
        //          <path copyfrom-path="/app-publisher/trunk"
        //                copyfrom-rev="16844"
        //                action="A"
        //                prop-mods="true"
        //                text-mods="false"
        //                kind="dir">
        //             /app-publisher/tags/v2.7.2
        //          </path>
        //       </paths>
        //       <msg>chore(release): tag version 2.7.2 [skip ci]</msg>
        //    </logentry>
        // </log>

        let xml;
        const svnUser = env.SVN_AUTHOR_NAME,
              svnToken = env.SVN_TOKEN,
              parser = new xml2js.Parser();
        //
        // Retrieve commits since last version tag
        //
        logger.log(`Retrieving commits since last version (revision ${head})`);

        if (svnUser && svnToken) {
            xml = await execa.stdout("svn", ["log", "--xml", `${options.repo}`, "--verbose", "--limit", "250", "-r", `${head}:HEAD`,
                                             "--non-interactive", "--no-auth-cache", "--username", svnUser, "--password", `${svnToken}`]);
        }
        else {
            xml = await execa.stdout("svn", ["log", "--xml", `${options.repo}`, "--verbose", "--limit", "250", "-r", `${head}:HEAD`,
                                             "--non-interactive", "--no-auth-cache"]);
        }
        //
        // TODO - check execa rtn code?
        //
        // if ($LASTEXITCODE -ne 0) {
        //     logger.log("Failed to retrieve commits" "red"
        //     return $comments
        // }
        logger.log("Parsing commits response from SVN");

        try {
            parser.parseString(xml, (err, result) =>
            {
                if (err) {
                    console.log("Err");
                    console.log(err);
                    return commits;
                }
                //
                // Parse the commit messages
                //
                for (const logEntry of result.log.logentry) {
                    if (logEntry.msg && logEntry.msg[0]) {
                        commits.push({
                            author: logEntry.author[0],
                            message: logEntry.msg[0].trim(),
                            revision: logEntry.$.revision,
                            date: logEntry.date[0]
                        });
                    }
                }
            });
        }
        catch {
            logger.warn("No commits found or no version tag exists");
        }
    }

    logger.log(`Found ${commits.length} commits since last release`);
    debug("Parsed commits: %o", commits);

    return commits;
}
