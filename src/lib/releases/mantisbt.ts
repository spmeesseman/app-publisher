
import * as path from "path";
import { pathExists, timeout, runScripts, writeFile, readFile } from "../utils";
import { createReleaseChangelog } from "../changelog-file";
import { contentTypeMap } from "./content-type-map";
import { isString } from "lodash";

export = doMantisRelease;


async function doMantisRelease({ options, commits, logger, lastRelease, nextRelease, env })
{
    logger.log("Starting MantisBT release");
    logger.log(`Creating MantisBT v${nextRelease.version} release`);

    let dryRun = 0;
    if (options.dryRun)
    {
        logger.log("Dry run only, will pass 'dryrun' flag to Mantis Releases API");
        dryRun = 1;
    }

    const notesIsMarkdown = 0,
          mantisChangelog = await createReleaseChangelog({ options, logger, lastRelease }, false, false);

    if (mantisChangelog)
    {
        //
        // Log the changelog contents if this is a dry run
        //
        if (options.dryRun === true)
        {
            logger.log("Dry run has generated an html changelog to test functionality:");
            logger.log(mantisChangelog);
        }

        //
        // Allow user to edit html changelog
        //
        if (options.mantisbtChgLogEdit === "Y")
        {
            const tmpFile = path.join(env.Temp, "changelog.tmp.html");
            writeFile(tmpFile, mantisChangelog);
            timeout(750);
            //
            // TODO
            //
            // $TextEditorProcess = Start-Process -filepath "notepad" -args $TmpFile -PassThru
            // $TextEditorProcess.WaitForInputIdle() | Out-Null
            // Wait-Process -Id $TextEditorProcess.Id | Out-Null
            // mantisChangelog = Get-Content -path $TmpFile -Raw
        }

        //
        // Set up the request body for the 'create release' request
        //
        const request = {
            dryrun: dryRun,
            version: nextRelease.version,
            notes: mantisChangelog,
            notesismd: notesIsMarkdown,
            assets: []
        };
        //
        // Build assets list
        //
        if (options.mantisbtAssets.length > 0)
        {
            logger.log("Building MantisBT assets list");
            for (const mbtAsset of options.mantisbtAssets)
            {
                let asset = mbtAsset;
                let assetDescrip = "";

                if (mbtAsset.Contains("|"))
                {
                    asset = mbtAsset.Split("|")[0];
                    assetDescrip = mbtAsset.Split("|")[1];
                }

                const assetName = path.basename(asset);

                if (pathExists(asset))
                {
                    const extension = path.extname(assetName).toLowerCase();
                    //
                    // The format to upload an asset is the base64 encoded binary file data
                    //
                    logger.log("Reading file asset");
                    const fileData = await readFile(asset);
                    if (fileData && fileData.length > 0)
                    {
                        // Base 64 encode file data
                        //
                        const fileData64 = btoa(fileData);
                        //
                        // Build json
                        //
                        const assetData = {
                            name: assetName,
                            desc: assetDescrip,
                            type: contentTypeMap[extension],
                            data: fileData64,
                        };

                        request.assets.push(assetData);
                    }
                    else {
                        logger.log(`Partially failed to build MantisBT asset ${assetName} - could not read input file`);
                    }
                }
                else {
                    logger.log(`Partially failed to build MantisBT asset ${assetName} - input file does not exist`);
                }
            }
        }

        //
        // Enable TLS1.2 in the case of HTTPS
        //
        // [Net.ServicePointManager];::SecurityProtocol = [Net.SecurityProtocolType];::Tls12;

        for (let i = 0; i < options.mantisbtUrl.length; i++)
        {   //
            // Set up the request header, this will be used to both create the release and to upload
            // any assets.  Note that for each asset, the content-type must be set appropriately
            // according to the type of asset being uploaded
            //
            const header = {
                "Authorization": options.mantisbtApiToken[i],
                "Content-Type": "application/json; charset=UTF-8"
            };
            //
            // Encode url part
            //
            const encPrjName = options.mantisbtProject.replace(/ /g, "%20");
            //
            // Send the REST POST to create the release w/ assets
            //
            const url = options.mantisbtUrl[i] + "/plugins/Releases/api/releases/" + encPrjName;
            logger.log("Sending Add-Release REST request to " + url);
            //
            // TODO
            //
            const response = undefined; // Invoke-RestMethod $url; -UseBasicParsing -Method; POST -Body; $Request -Headers; $Header;
            // CheckPsCmdSuccess
            //
            // Check response object for success
            //
            if (response)
            {
                if (isString(response))
                {
                    logger.error("Partial error creating MantisBT release vnextRelease.version");
                    logger.error(response);
                }
                else {
                    logger.success(`Successfully created MantisBT release v${nextRelease.version}`);
                    logger.success(`   ID         : ${response.id}`);
                    logger.success(`   Message    : ${response.msg}`);
                    logger.success(`   URL        : ${options.mantisbtUrl[i]}`);
                }
            }
            else {
                logger.error("Failed to create MantisBT vnextRelease.version release");
            }
        }
    }
    else {
        logger.error("Failed to create MantisBT vnextRelease.version release");
    }
}
