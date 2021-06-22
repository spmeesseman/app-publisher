
import * as path from "path";
import { copyDir, pathExists, copyFile } from "../utils/fs";
import { addEdit } from "../repo";
import { IContext } from "../../interface";

export = doDistRelease;


async function doDistRelease(context: IContext)
{
    const options = context.options,
          logger = context.logger,
          nextRelease = context.nextRelease;

    logger.log("Starting Distribution release");

    //
    // Copy history file to dist directory
    //
    if (options.historyFile)
    {
        logger.log("Copying history file to dist dir");
        logger.log("   Source : " + options.historyFile);
        logger.log("   Target : " + options.pathToDist);
        //
        // Copy to dist dir
        //
        await copyFile(options.historyFile, options.pathToDist);
        //
        // Track modified file
        //
        await addEdit(context, path.normalize(path.join(options.pathToDist, options.historyFile)));
    }
    //
    // Copy history file to dist directory
    //
    if (options.changelogFile)
    {
        logger.log("Copying changlog file to dist dir");
        logger.log("   Source : " + options.changelogFile);
        logger.log("   Target : " + options.pathToDist);
        //
        // Copy to dist dir
        //
        await copyFile(options.changelogFile, options.pathToDist);
        //
        // Track modified file
        //
        await addEdit(context, path.normalize(path.join(options.pathToDist, options.historyFile)));
    }

    const targetNetLocation = options.distReleasePath ? path.normalize(path.join(options.distReleasePath, options.projectName, nextRelease.version)) : undefined,
          targetDocLocation = options.distDocPath ? path.normalize(path.join(options.distDocPath, options.projectName, nextRelease.version)) : undefined;

    //
    // Copy contents of dist dir to target location, and pdf docs to docs location
    //
    logger.log("Deploying dist release files");
    if (options.pathToDist && targetNetLocation)
    {
        logger.log("   Source : " + options.pathToDist);
        logger.log("   Target : " + targetNetLocation);
        if (!options.dryRun)
        {   //
            // Copy all files in 'dist' directory that start with options.projectName, and the history file
            //
            await copyDir(options.pathToDist, targetNetLocation);
        }
        else {
            logger.log("   Dry run - skipped dist release file push");
        }
    }
    else {
        logger.warn("   Invalid path(s) - dist release files not copied");
    }

    //
    // DOC
    //
    logger.log("Deploying dist release pdf documentation");
    if (options.distDocPath && targetDocLocation)
    {   //
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
            else {
                async function checkBack(b1: string, b2: string, b3: string)
                {
                    let docDirTmp = path.resolve(path.normalize(b1));
                    if (!docDirTmp.includes(context.cwd)) {
                        return;
                    }
                    if (await pathExists(docDirTmp)) {
                        docDirSrc = docDirTmp;
                    }
                    docDirTmp = path.resolve(path.normalize(b2));
                    if (await pathExists(docDirTmp)) {
                        docDirSrc = docDirTmp;
                    }
                    docDirTmp = path.resolve(path.normalize(b3));
                    if (await pathExists(docDirTmp)) {
                        docDirSrc = docDirTmp;
                    }
                }
                await checkBack(path.join("..", "doc"), path.join("..", "docs"), path.join("..", "documentation"));
                if (!docDirSrc) {
                    await checkBack(path.join("..", "..", "doc"), path.join("..", "..", "docs"), path.join("..", "..", "documentation"));
                }
            }
        }

        logger.log("   Source : " + docDirSrc);
        logger.log("   Target : " + targetDocLocation);
        if (docDirSrc)
        {
            if (!options.dryRun) {
                await copyDir(docDirSrc, targetDocLocation, /.*\.pdf/i);
            }
            else {
                logger.info("   Dry Run - Skipped Dist doc push");
            }
        }
        else {
            logger.warn("   Skipped dist release doc push, source doc directory not found");
        }
    }
    else {
        logger.warn("   Invalid path(s) - dist release docs not copied");
    }
}
