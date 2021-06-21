import { escapeRegExp, template } from "lodash";
import semver from "semver";
import pLocate from "p-locate";
const debug = require("debug")("app-publisher:get-last-release");
import { getTags, isRefInHistory, getTagHead } from "./repo";

export = getLastRelease;

/**
 * Last release.
 *
 * @typedef {Object} LastRelease
 * @property {string} version The version number of the last release.
 * @property {string} [head] The Git reference used to make the last release.
 */

/**
 * Determine the Git tag and version of the last tagged release.
 *
 * - Obtain all the tags referencing commits in the current branch history
 * - Filter out the ones that are not valid semantic version or doesn't match the `tagFormat`
 * - Sort the versions
 * - Retrieve the highest version
 *
 * @param {Object} context app-publisher context.
 *
 * @return {Promise<LastRelease>} The last tagged release or `undefined` if none is found.
 */
async function getLastRelease({ cwd, env, options, logger })
{
    //
    // Generate a regex to parse tags formatted with `tagFormat`
    // by replacing the `version` variable in the template by `(.+)`.
    // The `tagFormat` is compiled with space as the `version` as it's an invalid tag character,
    // so it's guaranteed to not be present in the `tagFormat`.
    //
    const tagRegexp = `^${escapeRegExp(template(options.tagFormat)({ version: " " })).replace(" ", "(.+)")}`,
          tagsRaw = await getTags({ env, options, logger }, options.repoType);

    const tags = tagsRaw
                 .map((tag: any) => ({ tag, version: (tag.match(tagRegexp) || new Array(2))[1] }))
                 .filter(
                     tag => tag.version && semver.valid(semver.clean(tag.version)) && !semver.prerelease(semver.clean(tag.version))
                 )
                 .sort((a: any, b: any) => semver.rcompare(a.version, b.version));

    debug("found tags: %o", tags);

    const tag: any = await pLocate(tags, (tag: any) => isRefInHistory(tag.tag, { cwd, env }, options, true), { preserveOrder: true });

    if (tag)
    {
        logger.info(`Found ${options.repoType} tag ${tag.tag} associated with version ${tag.version}`);
        return { head: await getTagHead({options, logger}, tag.tag, { cwd, env }), ...tag };
    }

    logger.info(`No ${options.repoType} tag version found`);
    return {};
}
