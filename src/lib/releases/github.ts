import * as path from "path";
import { pathExists, timeout, runScripts, writeFile, readFile } from "../utils";
import { createReleaseChangelog } from "../changelog-file";
import { contentTypeMap } from "./content-type-map";
import { setOptions } from "marked";

export { doGithubRelease, publishGithubRelease };


let githubReleaseId;


async function doGithubRelease({ options, logger, lastRelease, env })
{
    logger.log("Creating GitHub v$VERSION release");

    const githubChangelog = await createReleaseChangelog({ options, logger, lastRelease }, false, false);
    if (githubChangelog && !options.dryRun)
    {   //
        // Allow user to edit html changelog
        //
        if (options.githubChgLogEdit === "Y")
        {
            const tmpFile = path.join(env.Temp, "changelog.tmp.html");
            writeFile(tmpFile, githubChangelog);
            timeout(750);
            //
            // TODO
            //
            // $TextEditorProcess = Start-Process -filepath "notepad" -args $TmpFile -PassThru
            // $TextEditorProcess.WaitForInputIdle() | Out-Null
            // Wait-Process -Id $TextEditorProcess.Id | Out-Null
            // $GithubChangelog = Get-Content -path $TmpFile -Raw
        }
        //
        // Set up the request body for the 'create release' request
        //
        const request = {
            tag_name: "v$VERSION",
            target_commitish: "$BRANCH",
            name: "v$VERSION",
            body: "$GithubChangelog",
            draft: true,
            prerelease: false
        };
        //
        // Set up the request header, this will be used to both create the release and to upload
        // any assets.  Note that for each asset, the content-type must be set appropriately
        // according to the type of asset being uploaded
        //
        const header = {
            "Accept": "application/vnd.github.v3+json",
            "mediaTypeVersion": "v3",
            "squirrelAcceptHeader": "application/vnd.github.squirrel-girl-preview",
            "symmetraAcceptHeader": "application/vnd.github.symmetra-preview+json",
            "Authorization": "token " + env.GITHUB_TOKEN,
            "Content-Type": "application/json; charset=UTF-8"
        };

        //
        // Enable TLS1.2
        //
        // [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

        //
        // Encode url parts
        //
        const encPrjName = options.projectName.replace(" ", "%20");
        //
        // Send the REST POST to create the release
        //
        let url = `https://api.github.com/repos/${options.githubUser}/${encPrjName}/releases`;
        const response = undefined; // Invoke-RestMethod $url -UseBasicParsing -Method POST -Body $Request -Headers $Header
        //
        // Make sure an upload_url value exists on the response object to check for success
        //
        if (response && response.upload_url)
        {
            githubReleaseId = response.id;

            logger.success("Successfully created GitHub release v$VERSION");
            logger.success("   ID         : $($Response.id)");
            logger.success("   Tarball URL: $($Response.zipball_url)");
            logger.success("   Zipball URL: $($Response.tarball_url)");
            //
            // Creating the release was successful, upload assets if any were specified
            //
            if (options.githubAssets.length > 0)
            {
                logger.log("Uploading GitHub assets");
                for (const asset of options.githubAssets)
                {
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
                        header["Content-Type"] = contentTypeMap[extension];
                        //
                        // The request to upload an asset is the raw binary file data
                        //
                        const request = await readFile(asset);
                        // $Request = Get-Content -Path $asset -Encoding Byte
                        if (request)
                        {   //
                            // Upload the asset via GitHub API.
                            //
                            // TODO
                            //
                            // url = $Response.upload_url
                            url = url.replace("{?name,label}", "") + "?name=assetName";
                            const response2 = undefined; // Invoke-RestMethod $url -UseBasicParsing -Method POST -Body $Request -Headers $Header
                            //
                            // Make sure an id value exists on the response object to check for success
                            //
                            if (response2 && response2.id) {
                                logger.success("Successfully uploaded GitHub asset assetName");
                                logger.success("   ID          : $($Response2.id)");
                                logger.success("   Download URL: $($Response2.browser_download_url)");
                            }
                            else {
                                logger.error("Failed to upload GitHub asset assetName");
                            }
                        }
                        else {
                            logger.error("Failed to upload GitHub asset assetName - could not read input file");
                        }
                    }
                    else {
                        const assetName = path.basename(asset);
                        logger.error(`Failed to upload GitHub asset ${assetName} - input file does not exist`);
                    }
                }
            }
        }
        else {
            logger.error("Failed to create GitHub v$VERSION release");
        }
    }
    else {
        if (githubChangelog) {
            logger.log("Dry run, skipping GitHub release");
            logger.log("Dry run has generated an html changelog from previous version to test functionality:");
            logger.log(githubChangelog);
        }
        else {
            logger.error("Failed to create GitHub v$VERSION release");
        }
    }
}


async function publishGithubRelease({options, nextRelease, logger})
{
    if (githubReleaseId && (options.githubRelease === "Y" || options.githubRelease === true))
    {
        logger.log("Marking release as published");
        //
        // Mark release published
        // Set up the request body for the 'create release' request
        //
        const request = {
            draft: false
        };
        //
        // Set up the request header
        //
        const header = {
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
        const url = `https://api.github.com/repos/${options.githubUser}/${options.projectName}/releases/${githubReleaseId}`;
        const response = undefined; // Invoke-RestMethod $url -UseBasicParsing -Method PATCH -Body $Request -Headers $Header
        // CheckPsCmdSuccess
        //
        // Make sure an upload_url value exists on the response object to check for success
        //
        if (response && response.upload_url)
        {
            logger.success(`Successfully patched/published GitHub release v${nextRelease.version}`);
        }
        else {
            logger.error(`Failed to publish/patch GitHub v${nextRelease.version} release`);
        }
    }
}
