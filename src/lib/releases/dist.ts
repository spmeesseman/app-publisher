
import * as path from "path";
import { copyDir, createDir, pathExists, copyFile, runScripts } from "../utils";

export = doDistRelease;


async function doDistRelease({ options, commits, logger, nextRelease })
{
    //
    // Create remote paths
    //
    let targetNetLocation: string,
        targetDocLocation: string;

    logger.log("Starting Distribution release");

    //
    // Run pre distribution-release scripts if specified
    //
    runScripts({ options, logger }, "preDistRelease", options.distReleasePreCommand);

    //
    // Copy history file to dist directory
    //
    if (options.historyFile)
    {
        // if (!pathExists("$PATHTODIST\$HISTORYFILE") && $DistIsVersioned)
        // {
        //     $HistoryFileName = [Path];::GetFileName($HISTORYFILE);
        //     VcChangelistAddRemove; "$PATHTODIST\$HistoryFileName";
        //     VcChangelistAddNew; "$PATHTODIST\$HistoryFileName";
        // }
        await copyFile(options.historyFile, options.pathToDist);
    }
    //
    // Create remote paths
    //
    targetNetLocation = path.join(options.distReleasePath, options.projectName, nextRelease.version);
    targetDocLocation = path.join(options.distDocPath, options.projectName, nextRelease.version);
    //
    // Check for legacy Deploy.xml script.  The scipt should at least be modified to NOT
    // send the notification email.
    //
    if (options.skipDeployPush !== "Y")
    {    //
        // Copy contents of dist dir to target location, and pdf docs to docs location
        //
        if (options.dryRun === false)
        {
            logger.log("Deploying distribution files to specified location:");
            logger.log("   " + targetNetLocation);
            //
            // SoftwareImages Upload
            //
            // Create directory on network drive
            // TargetNetLocation is defined above as it is needed for email notification fn as well
            //
            if (!(await pathExists(targetNetLocation))) {
                logger.log("Create directory targetNetLocation");
                await createDir(targetNetLocation);
            }
            //
            // Copy all files in 'dist' directory that start with options.projectName, and the history file
            //
            logger.log("Deploying files to " + targetNetLocation);
            await copyDir(options.pathToDist, targetNetLocation);
            //
            // DOC
            //
            if (options.distDocPath !== "")
            {
                //
                // Create directory on doc share
                //
                await createDir(targetDocLocation);
                //
                // Copy all pdf files in 'dist' and 'doc' and 'documentation' directories
                //
                let docDirSrc = options.distDocPathSrc;
                if (!docDirSrc)
                {
                    if (await pathExists("documentation")) {
                        docDirSrc = "documentation";
                    }
                    else if (await pathExists("doc")) {
                        docDirSrc = "doc";
                    }
                    else if (await pathExists("docs")) {
                        docDirSrc = "docs";
                    }
                    else if (options.pathToMainRoot)
                    {
                        if (await pathExists("$PATHTOMAINROOT\doc")) {
                            docDirSrc = "$PATHTOMAINROOT\doc";
                        }
                        if (await pathExists("$PATHTOMAINROOT\docs")) {
                            docDirSrc = "$PATHTOMAINROOT\docs";
                        }
                        if (await pathExists("$PATHTOMAINROOT\documentation")) {
                            docDirSrc = "$PATHTOMAINROOT\documentation";
                        }
                    }
                }
                if (docDirSrc)
                {
                    logger.log("Deploying pdf documentation to targetDocLocation");
                    await copyFile(path.join(docDirSrc, "*.pdf"), targetDocLocation);
                    // logger.log("Deploying txt documentation to targetDocLocation"
                    // Copy-Item "docDirSrc\*.txt" -Destination "targetDocLocation" | Out-Null
                    // CheckPsCmdSuccess
                }
                else {
                    logger.warn("Skipping documentation network push, doc direcory not found");
                }
            }
        }
        else {
            logger.log("Dry run, skipping basic push to network drive");
        }
    }
    else {
        logger.log("Skipped network release push (user specified)");
    }

    //
    // Check DIST dir for unversioned files, add them if needed
    //
    if (options.distAddAllToVc === "Y")
    {
        // Get-ChildItem "$PATHTODIST" -Recurse -Filter *.* | Foreach-Object {  # Bracket must stay same line as ForEach-Object
        //     $DistIsVersioned = VcIsVersioned $_.FullName
        //     logger.log($_.FullName);
        //     if (!$DistIsVersioned)
        //     {
        //         $fullName = $_.FullName.Replace("`${VERSION}", nextRelease.version).Replace("`${NEWVERSION}", nextRelease.version).Replace("`${CURRENTVERSION}", $CURRENTVERSION).Replace("`${LASTVERSION}", $CURRENTVERSION);
        //         logger.log("Adding unversioned $($_.Name) to vc addition list");
        //         # VcChangelistAddNew "$PATHTODIST\$_.Name"
        //         # VcChangelistAddRemove "$PATHTODIST\$_.Name"
        //         VcChangelistAddNew $fullName $true
        //         VcChangelistAddRemove $fullName $true
        //     }
        // }
    }
}
