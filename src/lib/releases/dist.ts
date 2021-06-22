
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

    //
    // Create remote paths
    //
    const targetNetLocation = path.normalize(path.join(options.distReleasePath, options.projectName, nextRelease.version)),
            targetDocLocation = path.normalize(path.join(options.distDocPath, options.projectName, nextRelease.version));

    logger.log("Deploying distribution files to specified location:");
    logger.log("   Source : " + targetNetLocation);
    logger.log("   Target : " + targetNetLocation);

    //
    // Copy contents of dist dir to target location, and pdf docs to docs location
    //
    if (!options.dryRun)
    {   //
        // Copy all files in 'dist' directory that start with options.projectName, and the history file
        //
        logger.log(`Deploying files to ${targetNetLocation}`);
        await copyDir(options.pathToDist, targetNetLocation);
        //
        // DOC
        //
        if (options.distDocPath)
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
                    await checkBack(path.join("..", "..", "doc"), path.join("..", "..", "docs"), path.join("..", "..", "documentation"));
                }
            }
            if (docDirSrc)
            {
                logger.log(`Deploying pdf documentation to ${targetDocLocation}`);
                await copyDir(docDirSrc, targetDocLocation, /.*\.pdf/i);
            }
            else {
                logger.warn("Skipping Dist doc push to shared drive / directory, doc direcory not found");
            }
        }
    }
    else {
        logger.log("Dry run, skipping Dist push to shared drive / directory");
    }
}
