import gitLogParser from "git-log-parser";
import getStream from "get-stream";
const debug = require("debug")("app-publisher:get-commits");

export = getCommits;

/**
 * Retrieve the list of commits on the current branch since the commit sha associated with the last release, or all the commits of the current branch if there is no last released version.
 *
 * @param {Object} context app-publisher context.
 *
 * @return {Promise<Array<Object>>} The list of commits on the branch `branch` since the last release.
 */
async function getCommits({ cwd, env, lastRelease: { head }, logger })
{
  if (head)
  {
    debug("Use head: %s", head);
  } else
  {
    logger.log("No previous release found, retrieving all commits");
  }

  function processCommits(commit: any) 
  {
    commit.message = commit.message.trim();
    commit.gitTags = commit.gitTags.trim();
    return commit;
  }

  Object.assign(gitLogParser.fields, { hash: "H", message: "B", gitTags: "d", committerDate: { key: "ci", type: Date } });
  const commits = (await getStream.array(
    gitLogParser.parse({ _: `${head ? head + ".." : ""}HEAD` }, { cwd, env: { ...process.env, ...env } })
  )).map(processCommits);

  logger.log(`Found ${commits.length} commits since last release`);
  debug("Parsed commits: %o", commits);
  
  return commits;
}
