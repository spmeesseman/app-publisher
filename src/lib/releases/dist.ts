
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

    const mkdir = async (d: string) => {
        if (!await pathExists(d)) {
            await createDir(d);
            return 1;
        }
        return 0;
    };

    //
    // Copy changelog file to dist directory
    //
    if (options.changelogFile)
    {
        logger.log("Copying changlog file to dist dir");
        logger.log("   Source : " + options.changelogFile);
        logger.log("   Target : " + options.distReleasePathSrc);
        //
        // Copy to dist dir
        //
        if (!options.dryRun || options.tests) {
            const rc = await mkdir(options.distReleasePathSrc);
            try {
                await copyFile(options.changelogFile, options.distReleasePathSrc);
                //
                // Track modified file/folder
                //
                if (rc === 0) {
                    await addEdit(context, path.normalize(path.join(options.distReleasePathSrc, path.basename(options.changelogFile))));
                }
                else {
                    await addEdit(context, path.normalize(options.distReleasePathSrc));
                }
            }
            catch (e) {
                console.warn("Failed to copy changelog file to dist source:");
                console.warn(e.toString().trim());
                console.warn("Manually copy the files if required, continuing");
            }
        }
        else {
            logger.log("   Dry run - skipped changelog copy to dist");
        }
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
            try {
                await mkdir(targetNetLocation);
                await copyDir(options.distReleasePathSrc, targetNetLocation);
            }
            catch (e) {
                console.warn("Failed to copy files to dist destination:");
                console.warn(e.toString().trim());
                console.warn("Manually copy the files if required, continuing");
            }
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
                try {
                    await mkdir(targetDocLocation);
                    await copyDir(docDirSrc, targetDocLocation, new RegExp(`.*\.(?:pdf|${nextRelease.version})$`, "i"));
                }
                catch (e) {
                    console.warn("Failed to copy documentation to dist destination:");
                    console.warn(e.toString().trim());
                    console.warn("Manually copy the documentation if required, continuing");
                }
            }
            else {
                logger.info("   Dry Run - Skipped dist doc push");
            }
        }
        else {
            logger.warn("   Skipped dist doc push, source doc directory not found");
        }
    }
}
