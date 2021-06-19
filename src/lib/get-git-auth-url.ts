const { parse, format } = require("url"); // eslint-disable-line node/no-deprecated-api
const { isNil } = require("lodash");
const hostedGitInfo = require('hosted-git-info');
const { verifyAuth } = require("./repo");

const GIT_TOKENS = {
    GIT_CREDENTIALS: undefined,
    GH_TOKEN: undefined,
    GITHUB_TOKEN: undefined,
    GL_TOKEN: "gitlab-ci-token:",
    GITLAB_TOKEN: "gitlab-ci-token:",
    BB_TOKEN: "x-token-auth:",
    BITBUCKET_TOKEN: "x-token-auth:",
};

export = getGitAuthUrl;

/**
 * Determine the the git repository URL to use to push, either:
 * - The `repo` as is if allowed to push
 * - The `repo` converted to `https` or `http` with Basic Authentication
 *
 * In addition, expand shortcut URLs (`owner/repo` => `https://github.com/owner/repo.git`) and transform `git+https` / `git+http` URLs to `https` / `http`.
 *
 * @param {Object} context app-publisher context.
 *
 * @return {String} The formatted Git repository URL.
 */
async function getGitAuthUrl({ cwd, env, options: { repo, branch } })
{
    const info = hostedGitInfo.fromUrl(repo, { noGitPlus: true });
    const { protocol, ...parsed } = parse(repo);

    if (info && info.getDefaultRepresentation() === "shortcut")
    {
        // Expand shorthand URLs (such as `owner/repo` or `gitlab:owner/repo`)
        repo = info.https();
    } 
    else if (protocol && protocol.includes("http"))
    {
        // Replace `git+https` and `git+http` with `https` or `http`
        repo = format({ ...parsed, protocol: protocol.includes("https") ? "https" : "http", href: null });
    }

    // Test if push is allowed without transforming the URL (e.g. is ssh keys are set up)
    try
    {
        await verifyAuth(repo, branch, { cwd, env });
    }
    catch (error)
    {
        const envVar = Object.keys(GIT_TOKENS).find(envVar => !isNil(env[envVar]));
        const gitCredentials = `${GIT_TOKENS[envVar] || ""}${env[envVar] || ""}`;

        if (gitCredentials)
        {
            // If credentials are set via environment variables, convert the URL to http/https and add basic auth, otherwise return `repo` as is
            const [match, auth, host, path ] = /^(?!.+:\/\/)(?:(.*)@)?(.*?):(.*)$/.exec(repo) || [undefined, undefined, undefined, undefined];
            return format({
                ...parse(match ? `ssh://${auth ? `${auth}@` : ""}${host}/${path}` : repo),
                auth: gitCredentials,
                protocol: protocol && /http[^s]/.test(protocol) ? "http" : "https",
            });
        }
    }

    return repo;
}
