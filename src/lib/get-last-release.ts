import { escapeRegExp, template } from "lodash";
import semver from "semver";
import pLocate from "p-locate";
import { getTags, isRefInHistory, getTagHead } from "./repo";
import { IContext, IRelease, IVersionInfo } from "../interface";
import { EOL } from "os";
import { isNumeric } from "./utils/utils";

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
 * @param context app-publisher context.
 *
 * @return {Promise<LastRelease>} The last tagged release or `undefined` if none is found.
 */
async function getLastRelease(context: IContext, lastVersionInfo: IVersionInfo): Promise<IRelease>
{
    const { env, options, logger } = context;
    const isValid = (v: string) => {
        if (!v) { return false; }
        if (lastVersionInfo.system !== "incremental") { console.log(4);
            return semver.valid(semver.clean(v)) && !semver.prerelease(semver.clean(v));
        }
        return isNumeric(v);
    };
    const doSort = (a: any, b: any) => {
        if (lastVersionInfo.system !== "incremental") {
            return semver.rcompare(a.version, b.version);
        }
        return a === b ? 0 : (a < b ? 1 : -1);
    };
    //
    // Generate a regex to parse tags formatted with `tagFormat`
    // by replacing the `version` variable in the template by `(.+)`.
    // The `tagFormat` is compiled with space as the `version` as it's an invalid tag character,
    // so it's guaranteed to not be present in the `tagFormat`.
    //
    const tagRegexp = `^${escapeRegExp(template(options.tagFormat)({ version: " " })).replace(" ", "(.+)")}`,
          tagsRaw = await getTags({ env, options, logger } as IContext);

    const tags = tagsRaw
                 .map((tag: any) => ({ tag, version: (tag.match(tagRegexp) || new Array(2))[1] }))
                 .filter((tag: any) => isValid(tag.version))
                 .sort((a: any, b: any) => doSort);

    if (options.verbose) {
        context.stdout.write("Tags:" + EOL + JSON.stringify(tags, undefined, 2) + EOL);
    }

    const tag: any = await pLocate(tags, (tag: any) => isRefInHistory(context, tag.tag, true), { preserveOrder: true });

    if (tag)
    {
        logger.info(`Found ${options.repoType} tag ${tag.tag} associated with version ${tag.version}`);
        return { head: await getTagHead(context, tag.tag), versionInfo: lastVersionInfo, ...tag };
    }

    logger.info(`No ${options.repoType} tag version found`);
    return {
        head: undefined,
        tag: undefined,
        version: undefined,
        versionInfo: undefined
    };
}
