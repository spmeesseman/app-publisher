
import * as path from "path";
import { createDir, pathExists, runScripts, timeout, checkExitCode } from "../utils";
const execa = require("execa");

export = doNpmRelease;


let npmLocation;


async function doNpmRelease({ options, logger, nextVersion, cwd, env }, defaultScope: string)
{
    if (options.npmRelease === "Y" && !options.taskMode)
    {
        logger.log("Starting NPM release");

        //
        // Run pre npm-release scripts if specified
        //
        runScripts({ options, logger }, "preNpmRelease", options.npmReleasePreCommand);

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
                    tmpPkgFile = `$DefaultScope-${options.projectName}-${nextVersion.version}.tgz`.substring(1);
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
                    proc = await execa.shell("cmd", [ "/c", "move", "/Y", tmpPkgFile, destPackedFile]);
                }
                else {
                    proc = await execa.shell("sh", [ "mv", "-f", tmpPkgFile, destPackedFile]);
                }
                checkExitCode(proc.code, logger);
                // if(proc.code === 0) {
                //     VcChangelistAdd "destPackedFile"
                //     $TarballVersioned = VcIsVersioned destPackedFile
                //     if (!$TarballVersioned) {
                //         VcChangelistAddNew "destPackedFile"
                //         VcChangelistAddRemove "destPackedFile"
                //     }
                // }
                publishFailed = proc.code !== 0;
            }
            //
            // Publish to npm server
            //
            logger.log("Publishing npm package to " + options.npmRegistry);
            if (!options.dryRun)
            {
                proc = await execa("npm", [ "--access", "public", "--registry", options.npmRegistry]);
                checkExitCode(proc.code, logger);
            }
            else
            {
                logger.log("Dry run, performing publish dry run only");
                proc = await execa("npm", [ "--access", "public", "--registry", options.npmRegistry, "--dry-run"]);
                checkExitCode(proc.code, logger);
                logger.log("Dry run, dry run publish finished");
            }
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

        //
        // Run pre npm-release scripts if specified
        //
        runScripts({options, logger}, "postNpmRelease", options.npmReleasePostCommand);
    }
    else if (options.npmRelease === "Y" && options.taskMode)
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
}
