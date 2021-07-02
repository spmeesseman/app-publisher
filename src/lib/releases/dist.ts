
import * as path from "path";
import { copyDir, pathExists, copyFile, createDir } from "../utils/fs";
import { addEdit } from "../repo";
import { IContext } from "../../interface";

export = doDistRelease;


async function doDistRelease(context: IContext)
{
    const options = context.options,
          logger = context.logger,
          nextRelease = context.nextRelease;

    logger.log("Starting Distribution release");

    const mkdir = async (d) => {
        if (!await pathExists(d)) {
            await createDir(d);
        }
    };

    //
    // Copy changelog file to dist directory
    //
    if (options.changelogFile)
    {
        logger.log("Copying changlog file to dist dir");
        logger.log("   Source : " + options.changelogFile);
        logger.log("   Target : " + options.distReleasePath);
        //
        // Copy to dist dir
        //
        await mkdir(options.distReleasePath);
        await copyFile(options.changelogFile, options.distReleasePath);
        //
        // Track modified file
        //
        await addEdit(context, path.normalize(path.join(options.distReleasePath, options.changelogFile)));
    }

    const targetNetLocation = options.distReleasePath ? path.normalize(path.join(options.distReleasePath, options.projectName, nextRelease.version)) : undefined,
          targetDocLocation = options.distDocPath ? path.normalize(path.join(options.distDocPath, options.projectName, nextRelease.version)) : undefined;

    //
    // Copy contents of dist dir to target location, and pdf docs to docs location
    //
    logger.log("Deploying dist release files");
    if (options.distReleasePathSrc && targetNetLocation)
    {
        logger.log("   Source : " + options.distReleasePathSrc);
        logger.log("   Target : " + targetNetLocation);
        if (!options.dryRun || options.tests)
        {   //
            // Copy all files in 'dist' directory that start with options.projectName, and the history file
            //
            await mkdir(targetNetLocation);
            await copyDir(options.distReleasePathSrc, targetNetLocation);
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
            if (!options.dryRun || options.tests) {
                await mkdir(targetDocLocation);
                await copyDir(docDirSrc, targetDocLocation, new RegExp(`/.*\.(?:pdf|${nextRelease.version})`, ""));
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
