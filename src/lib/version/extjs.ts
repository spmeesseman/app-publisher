
import * as path from "path";
import glob from "glob";
import { IContext, IVersionInfo } from "../../interface";
import { addEdit } from "../repo";
import { replaceInFile, pathExists } from "../utils/fs";
import { editFile } from "../utils/utils";


export async function getExtJsFiles(logger)
{
    return new Promise<string[]>((resolve, reject) => {
        glob("**/app.json", { nocase: true, ignore: "node_modules/**" }, (err, files) =>
        {
            if (err) {
                logger.error("app.json");
                reject(err);
            }
            else {
                resolve(files);
            }
        });
    });
}


export async function getExtJsVersion(): Promise<IVersionInfo>
{
    throw new Error("Method not implemented");
}


export async function setExtJsVersion(context: IContext)
{
    const {nextRelease, options, logger} = context,
           fileNames = await getExtJsFiles(logger);

    if (fileNames && fileNames.length >= 1)
    {   //
        // If this is '--task-revert', all we're doing here is collecting the paths of the
        // files that would be updated in a run, don't actually do the update
        //
        if (options.taskRevert) {
            await addEdit(context, fileNames[0]);
            return;
        }

        const appJsonDir = path.dirname(fileNames[0]),
              wsFile = path.join(appJsonDir, "workspace.json"),
              buildFile = path.join(appJsonDir, "build.xml"),
              wsFileExists = await pathExists(wsFile),
              buildFileExists = await pathExists(buildFile);

        if (buildFileExists && wsFileExists)
        {
            logger.log(`Retrieving version from ${fileNames[0]}`);

            if (fileNames.length > 1) {
                logger.warn("Multiple app.json files were found");
                logger.warn("You can set the specific file via the 'extjsProjectFile' .publishrc property");
                logger.warn("Using : " + fileNames[0]);
            }
            //
            // Replace version in defined main mantisbt plugin file
            //
            await replaceInFile(fileNames[0], "appVersion\"[ ]*:[ ]*[\"][0-9a-z.\-]+", `appVersion": "${nextRelease.version}`, true);
            await replaceInFile(fileNames[0], "version\"[ ]*:[ ]*[\"][0-9a-z.\-]+", `version": "${nextRelease.version}`, true);
            //
            // Allow manual modifications to mantisbt main plugin file and commit to modified list
            //
            await editFile(context, fileNames[0]);
        }
        else {
            console.warn("Found ExtJs app.json, but no matching workspace or build file found");
        }
    }
}
