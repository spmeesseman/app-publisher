import * as path from "path";
import semver from "semver";
import { pathExists, readFileBuf } from "../utils/fs";
import { contentTypeMap } from "./content-type-map";
import { APP_NAME } from "../definitions/constants";
import { IContext, IReturnStatus } from "../../interface";
import { doesTagExist, push, tag } from "../repo";
const got = require("got");

export { doGithubRelease, publishGithubRelease };


async function doGithubRelease(context: IContext): Promise<IReturnStatus>
{
    const { options, logger, nextRelease, env } = context;

    logger.log("Starting GitHub release");
    logger.log(`   Version : ${nextRelease.version}`);
    logger.log(`   Creating GitHub release associated to tag ${nextRelease.tag}`);

    const rc: IReturnStatus = {
        id: -1,
        success: false,
        error: undefined
    };

    const githubChangelog = context.changelog.htmlNotes || context.changelog.htmlNotesLast;
    if (!githubChangelog) {
        rc.error = `GitHub release v${nextRelease.version} failure - no changelog`;
        logger.error(rc.error);
        return rc;
    }

    //
    // Log the changelog contents if this is a dry run
    //
    if (options.dryRun === true)
    {
        logger.log("Dry run has generated an html changelog to test functionality:");
        context.stdout.write(githubChangelog);
    }

    //
    // TODO - Allow user to edit html changelog
    //
    // if (options.githubChgLogEdit === "Y")
    // {
    //     // const tmpFile = path.join(env.Temp, "changelog.tmp.html");
    //     // writeFile(tmpFile, githubChangelog);
    //     // timeout(750);
    //     // $TextEditorProcess = Start-Process -filepath "notepad" -args $TmpFile -PassThru
    //     // $TextEditorProcess.WaitForInputIdle() | Out-Null
    //     // Wait-Process -Id $TextEditorProcess.Id | Out-Null
    //     // $GithubChangelog = Get-Content -path $TmpFile -Raw
    // }

    //
    //
    // Set up the request header, this will be used to both create the release and to upload
    // any assets.  Note that for each asset, the content-type must be set appropriately
    // according to the type of asset being uploaded
    //
    const headers = {
        "Accept": "application/vnd.github.v3+json",
        "mediaTypeVersion": "v3",
        "squirrelAcceptHeader": "application/vnd.github.squirrel-girl-preview",
        "symmetraAcceptHeader": "application/vnd.github.symmetra-preview+json",
        "Authorization": "token " + env.GITHUB_TOKEN,
        "Content-Type": "application/json; charset=UTF-8",
        "User-Agent": APP_NAME
    };

    //
    // Encode url parts
    //
    const encPrjName = options.projectName.replace(/ /g, "%20");

    //
    // Check on some things based on whether this is a 'draft' or not
    //
    if (options.taskGithubRelease)
    {
        logger.log("This will be a published release (task mode)");
        //
        // We need to tag the repository with the version tag if it doesnt exist already
        //
        if (!(await doesTagExist(context, nextRelease.tag)))
        {
            logger.log(`Version tag '${nextRelease.tag}' does not exist, create new tag`);
            await tag(context);
            await push(context);
        }
    }
    else {
        logger.log("This will be a non-published release, to be published after commit/tag");
    }

    //
    // Send the REST POST to create the release
    //
    let response: any,
        url = `https://api.github.com/repos/${options.githubUser}/${encPrjName}/releases`;

    if (!options.dryRun)
    {
        const isPreRelease = semver.prerelease(semver.clean(nextRelease.version));

        logger.log("Submtting release request to GitHub");
        logger.log(`   Body length      : ${githubChangelog.length}`);
        logger.log(`   Draft            : ${!options.taskGithubRelease}`);
        logger.log(`   Name             : ${nextRelease.tag}`);
        logger.log(`   Pre-release      : ${isPreRelease}`);
        logger.log(`   Tag name         : ${nextRelease.tag}`);
        logger.log(`   Target commitish : ${options.branch}`);

        try {
            response = await got(url, {
                headers,
                method: "POST",
                responseType: "json",
                json: {
                    tag_name: nextRelease.tag,
                    target_commitish: options.branch,
                    name: nextRelease.tag,
                    body: githubChangelog,
                    draft: !options.taskGithubRelease,
                    prerelease: !!isPreRelease
                }
            });
        }
        catch (e) {
            rc.error = `GitHub release v${nextRelease.version} failure - ${e.toString()}`;
            logger.error(rc.error);
            return rc;
        }
    }
    else {
        logger.log("Dry run - skip rest request, emulate response");
        response = {
            body: {
                id: "dry-run-id",
                upload_url: "https://this-is-a-dry-run.com",
                tarball_url: "https://this-is-a-dry-run.com/tarball.tar",
                zipball_url: "https://this-is-a-dry-run.com/zipball.zip"
            }
        };
    }

    //
    // Make sure an upload_url value exists on the response object to check for success
    //
    if (response && response.body && response.body.upload_url)
    {
        rc.id = response.body.id;

        logger.success("Successfully created GitHub release");
        logger.log(`   ID          : ${rc.id}`);
        logger.log(`   Version     : ${nextRelease.version}`);
        logger.log(`   Tag name    : ${nextRelease.tag}`);
        logger.log(`   Upload url  : ${response.body.upload_url}`);
        logger.log(`   Tarball url : ${response.body.zipball_url}`);
        logger.log(`   Zipball url : ${response.body.tarball_url}`);
        //
        // Creating the release was successful, upload assets if any were specified
        //
        if (options.githubAssets.length > 0)
        {
            logger.log(`Process ${options.githubAssets.length} GitHub assets`);

            for (const ghAsset of options.githubAssets)
            {
                let asset = ghAsset;
                if (ghAsset.includes("|")) {
                    asset = ghAsset.split("|")[0];
                }

                // eslint-disable-next-line no-template-curly-in-string
                asset = asset.replace("$(VERSION)", nextRelease.version);

                if (await pathExists(asset))
                {
                    //
                    // Get filename to be use as a GET parameter in url
                    //
                    const assetName = path.basename(asset);
                    const extension = path.extname(assetName).toLowerCase();
                    //
                    // Set the content-type header value to the mime type of the asset
                    //
                    headers["Content-Type"] = contentTypeMap[extension];
                    //
                    // The request to upload an asset is the raw binary file data
                    //
                    logger.log(`Reading file asset ${asset}`);
                    const fileData = await readFileBuf(asset);
                    logger.log(`   File size: ${fileData.length} bytes`);
                    if (fileData)
                    {   //
                        // Upload the asset
                        //
                        url = response.body.upload_url.replace("{?name,label}", "") + "?name=" + assetName;
                        let response2: any;
                        if (!options.dryRun)
                        {
                            logger.log("Submitting asset upload request to " + url);
                            try {
                                response2 = await got(url, {
                                    body: fileData,
                                    responseType: "json",
                                    method: "POST",
                                    headers
                                });
                            }
                            catch (e) {
                                logger.warn(`Failed to upload GitHub asset ${assetName} - ${e.toString()}`);
                            }
                        }
                        else {
                            logger.log("Dry run - Emulate asset upload request to " + url);
                            response2 = {
                                body: {
                                    id: "dry-run-asset-id",
                                    browser_download_url: "https://this-is-a-dry-run.com/" + assetName,
                                    tarball_url: "https://this-is-a-dry-run.com/tarball.tar",
                                    zipball_url: "https://this-is-a-dry-run.com/zipball.zip"
                                }
                            };
                        }
                        //
                        // Make sure an id value exists on the response object to check for success
                        //
                        if (response2 && response2.body.id) {
                            logger.success("Successfully uploaded GitHub asset " + assetName);
                            logger.log(`   ID          : ${response2.body.id}`);
                            logger.log(`   Download URL: ${response2.body.browser_download_url}`);
                        }
                    }
                    else {
                        logger.warn(`Failed to upload GitHub asset ${assetName} - could not read input file`);
                    }
                }
                else {
                    const assetName = path.basename(asset);
                    logger.warn(`Failed to upload GitHub asset ${assetName} - input file does not exist`);
                }
            }
        }
    }
    else {
        rc.error = `GitHub release v${nextRelease.version} failure - no response`;
        logger.error(rc.error);
        return rc;
    }

    rc.success = true;
    return rc;
}


async function publishGithubRelease({options, nextRelease, logger}, githubReleaseId: string): Promise<IReturnStatus>
{
    let rc: IReturnStatus = {
        success: false
    };

    logger.log(`Publish GitHub v${nextRelease.version} release`);
    if (!githubReleaseId) {
        logger.warn("Invalid argument - empty GitHub release id");
        logger.warn("   Skip publishing of GitHub release");
        return;
    }

    //
    // Mark release published
    // Set up the request body for the 'create release' request
    //
    // Set up the request header
    //
    const headers = {
        "Accept": "application/vnd.github.v3+json",
        "mediaTypeVersion": "v3",
        "squirrelAcceptHeader": "application/vnd.github.squirrel-girl-preview",
        "symmetraAcceptHeader": "application/vnd.github.symmetra-preview+json",
        "Authorization": "token " + process.env.GITHUB_TOKEN,
        "Content-Type": "application/json; charset=UTF-8"
    };
    //
    // Send the REST POST to publish the release
    //
    let response: any;
    const url = `https://api.github.com/repos/${options.githubUser}/${options.projectName}/releases/${githubReleaseId}`;
    if (!options.dryRun)
    {
        try {
            response = await got(url, {
                json: {
                    draft: false
                },
                method: "PATCH",
                responseType: "json",
                headers
            });
        }
        catch (e) {
            rc = { success: false, error: `GitHub release v${nextRelease.version} publish failure - ${e.toString()}` };
            logger.error(rc.error);
            return rc;
        }
    }
    else {
        logger.log("Dry run - skip rest request, emulate response");
        response = {
            body: {
                upload_url: "https://this-is-a-dry-run.com"
            }
        };
    }
    //
    // Make sure an upload_url value exists on the response object to check for success
    //
    if (response && response.body.upload_url)
    {
        logger.success(`Successfully patched/published GitHub release v${nextRelease.version}`);
    }
    else {
        logger.error(`Failed to publish/patch GitHub v${nextRelease.version} release`);
    }

    rc.success = true;
    return rc;
}
