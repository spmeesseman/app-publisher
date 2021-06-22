
import * as path from "path";
import { runScripts } from "../utils/utils";
import { copyDir, createDir, pathExists, copyFile } from "../utils/fs";
import { addEdit } from "../repo";
import { IContext } from "../../interface";
const copydir = require("copy-dir");

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
    {
        //
        // SoftwareImages Upload
        //
        // Create directory on network drive
        // TargetNetLocation is defined above as it is needed for email notification fn as well
        //
        if (!(await pathExists(targetNetLocation))) {
            logger.log(`Create directory ${targetNetLocation}`);
            await createDir(targetNetLocation);
        }
        //
        // Copy all files in 'dist' directory that start with options.projectName, and the history file
        //
        logger.log(`Deploying files to ${targetNetLocation}`);
        await copyDir(options.pathToDist, targetNetLocation);
        //
        // DOC
        //
        if (options.distDocPath)
        {   //
            // Create directory on doc share
            //
            if (!(await pathExists(targetDocLocation))) {
                await createDir(targetDocLocation);
            }
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
                await copydir(docDirSrc, targetDocLocation, {
                    filter: (stat: string, filepath: string, filename: string) => {
                        return stat === "file" && path.extname(filepath).toLowerCase() === ".pdf";
                    }
                });
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
