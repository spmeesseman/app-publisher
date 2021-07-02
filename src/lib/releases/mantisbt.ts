
import * as path from "path";
import semver from "semver";
import { btoa } from "../utils/utils";
import { pathExists, readFile } from "../utils/fs";
import { contentTypeMap } from "./content-type-map";
import { isString } from "lodash";
import { APP_NAME } from "../definitions/constants";
import { IContext, IReturnStatus } from "../../interface";
const got = require("got");

export = doMantisRelease;


async function doMantisRelease(context: IContext): Promise<IReturnStatus>
{
    const { options, logger, nextRelease, lastRelease } = context;

    logger.log("Starting MantisBT release");
    logger.log(`   Version : ${nextRelease.version}`);

    const rc: IReturnStatus = {
        id: -1,
        success: false,
        error: undefined
    };

    if (semver.prerelease(semver.clean(nextRelease.version)))
    {
        rc.error = `MantisBT release v${nextRelease.version} failure - cannot pubish a pre-release`;
        logger.error(rc.error);
        return rc;
    }

    let dryRun = 0;
    if (options.dryRun)
    {
        logger.log("Dry run only, will pass 'dryrun' flag to Mantis Releases API");
        dryRun = 1;
    }

    const notesIsMarkdown = 0,
          mantisChangelog = context.changelog.htmlNotes || context.changelog.htmlNotesLast;

    if (!mantisChangelog) {
        rc.error = `MantisBT release v${nextRelease.version} failure - no changelog`;
        logger.error(rc.error);
        return rc;
    }
    //
    // Log the changelog contents if this is a dry run
    //
    if (options.dryRun === true)
    {
        logger.log("Dry run has generated an html changelog to test functionality:");
        context.stdout.write(mantisChangelog);
    }

    //
    // TODO - Allow user to edit html changelog
    //
    // if (options.mantisbtChgLogEdit === "Y")
    // {
    //     // const tmpFile = path.join(env.Temp, "changelog.tmp.html");
    //     // writeFile(tmpFile, mantisChangelog);
    //     // timeout(750);
    //     // $TextEditorProcess = Start-Process -filepath "notepad" -args $TmpFile -PassThru
    //     // $TextEditorProcess.WaitForInputIdle() | Out-Null
    //     // Wait-Process -Id $TextEditorProcess.Id | Out-Null
    //     // mantisChangelog = Get-Content -path $TmpFile -Raw
    // }

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

            if (mbtAsset.includes("|"))
            {
                asset = mbtAsset.split("|")[0];
                assetDescrip = mbtAsset.split("|")[1];
            }

            const assetName = path.basename(asset);

            if (pathExists(asset))
            {
                const extension = path.extname(assetName).toLowerCase();
                // eslint-disable-next-line no-template-curly-in-string
                asset = asset.replace("$(VERSION)", nextRelease.version)
                             .replace("$(NEXTVERSION)", nextRelease.version)
                             .replace("$(LASTVERSION)", lastRelease.version);
                //
                // The format to upload an asset is the base64 encoded binary file data
                //
                logger.log(`Reading file asset ${asset}`);
                const fileData = await readFile(asset);
                logger.log(`   File size: ${fileData.length} bytes`);
                if (fileData && fileData.length > 0)
                {   //
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
                    logger.warn(`Partially failed to build MantisBT asset ${assetName} - could not read input file`);
                }
            }
            else {
                logger.log(`Partially failed to build MantisBT asset ${assetName} - input file does not exist`);
            }
        }
    }

    for (let i = 0; i < options.mantisbtUrl.length; i++)
    {   //
        // Set up the request header, this will be used to both create the release and to upload
        // any assets.  Note that for each asset, the content-type must be set appropriately
        // according to the type of asset being uploaded
        //
        const headers = {
            "Authorization": options.mantisbtApiToken[i],
            "Content-Type": "application/json; charset=UTF-8",
            "User-Agent": APP_NAME
        };
        //
        // Encode url part
        //
        const encPrjName = (options.mantisbtProject || options.projectName).replace(/ /g, "%20");
        //
        // Send the REST POST to create the release w/ assets
        //
        const url = options.mantisbtUrl[i] + "/plugins/Releases/api/releases/" + encPrjName;
        logger.log("Sending Add-Release REST request to " + url);
        //
        // Send it off
        //
        let response: any;
        try {
            response = await got(url, {
                headers,
                method: "POST",
                responseType: "json",
                json: request
            });
        }
        catch (e) {
            rc.error = `MantisBT release v${nextRelease.version} failure - ${e.toString()}`;
            logger.error(rc.error);
            return rc;
        }
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
                rc.id = response.body.id;
                logger.success(`MantisBT release v${nextRelease.version} success`);
                logger.log(`   ID         : ${rc.id}`);
                logger.log(`   Message    : ${response.body.msg}`);
                logger.log(`   URL        : ${options.mantisbtUrl[i]}`);
            }
        }
        else {
            rc.error = `MantisBT release v${nextRelease.version} failure - no response`;
            logger.error(rc.error);
            return rc;
        }
    }

    rc.success = true;
    return rc;
}
