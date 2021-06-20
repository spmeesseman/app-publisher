
import * as path from "path";
import { createDir, pathExists } from "../utils/fs";
import { timeout, checkExitCode } from "../utils/utils";
const execa = require("execa");


export let npmLocation: string;


export async function doNpmRelease({ options, logger, nextVersion, cwd, env }, defaultScope: string)
{
    logger.log("Starting NPM release");

    if (await pathExists("package.json"))
    {
        let publishFailed = false;
        let proc: any;
        //
        // Pack tarball and mvoe to dist dir if specified
        //
        if (options.npmPackDist === "Y")
        {
            let tmpPkgFile;
            let proc = await execa("npm", ["pack"], {cwd, env});
            checkExitCode(proc.code, logger);

            if (!options.pathToDist)
            {
                logger.log("Creating tarball file directory and adding to version control");
                createDir(options.pathToDist);
            }

            const destPackedFile = path.join(options.pathToDist, `${options.projectName}.tgz`);
            timeout(100);
            if (options.npmScope) {
                tmpPkgFile = `${options.npmScope}-${options.projectName}-${nextVersion.version}.tgz`.substring(1);
            }
            else if (defaultScope) {
                tmpPkgFile = `${defaultScope}-${options.projectName}-${nextVersion.version}.tgz`.substring(1);
            }
            else {
                tmpPkgFile = `${options.projectName}-${nextVersion.version}.tgz`;
            }
            // Move-Item  -Force "*$VERSION.*" $PackedFile
            // CheckPsCmdSuccess
            timeout(500);
            logger.log("Moving package:");
            logger.log("   " + tmpPkgFile);
            logger.log("To:");
            logger.log("   " + destPackedFile);

            if (process.platform === "win32") {
                proc = await execa.shell("move", [ "/Y", tmpPkgFile, destPackedFile]);
            }
            else {
                proc = await execa.shell("mv", [ "-f", tmpPkgFile, destPackedFile]);
            }
            checkExitCode(proc.code, logger);
            publishFailed = proc.code !== 0;
        }
        //
        // Publish to npm server
        //
        if (!options.dryRun)
        {
            if (options.npmRegistry) {
                logger.log("Publishing npm package to " + options.npmRegistry);
                proc = await execa("npm", [ "publish", "--registry", options.npmRegistry]);
            }
            else {
                logger.log("Publishing npm package to default registry");
                proc = await execa("npm", [ "publish" ]);
            }
        }
        else
        {
            if (options.npmRegistry) {
                logger.log("Dry Run - Publishing npm package to " + options.npmRegistry);
                proc = await execa("npm", [ "publish", "--registry", options.npmRegistry, "--dry-run"]);
            }
            else {
                logger.log("Dry Run - Publishing npm package to default registry");
                proc = await execa("npm", [ "publish", "--dry-run"]);
            }
        }
        checkExitCode(proc.code, logger);
        //
        //
        //
        if (!publishFailed)
        {
            if (options.npmScope) {
                npmLocation = `${options.npmRegistry}/-/web/detail/${options.npmScope}/${options.projectName}`;
            }
            else if (defaultScope) {
                npmLocation = `${options.npmRegistry}/-/web/detail/${defaultScope}/${options.projectName}`;
            }
            else {
                npmLocation = `${options.npmRegistry}/-/web/detail/${options.projectName}`;
            }
        }
        else {
            throw new Error("180");
        }
    }
    else {
        logger.warn("Could not find package.json");
    }
}
