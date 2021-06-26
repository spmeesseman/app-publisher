
import { pathExists, replaceInFile } from "../utils/fs";
import { editFile, isString } from "../utils/utils";
import { setAppPublisherVersion } from "./app-publisher";
import { setDotNetVersion, getDotNetFiles } from "./dotnet";
import { setExtJsVersion } from "./extjs";
import { setMakefileVersion } from "./makefile";
import { setMantisBtVersion } from "./mantisbt";
import { setPomVersion } from "./pom";
import { setNpmVersion } from "./npm";
import { IContext } from "../../interface";
import { EOL } from "os";
import { addEdit } from "../repo";

export = setVersions;


/**
 * Sets all versions in all fiels.
 *
 * @since 2.8.0
 *
 * @param context context
 */
async function setVersions(context: IContext): Promise<void>
{
    const options = context.options,
          logger = context.logger;
    //
    // NPM managed project, update package.json if required
    //
    if (await pathExists("package.json")) {
        await setNpmVersion(context);
    }
    //
    // AppPublisher publishrc version
    //
    if (options.version) {
        await setAppPublisherVersion(context);
    }
    //
    // ExtJs build
    //
    if (await pathExists("app.json") && (await pathExists("workspace.json") || await pathExists("build.xml"))) {
        await setExtJsVersion(context);
    }
    //
    // Maven managed project, update pom.xml if required
    //
    if (await pathExists("pom.xml")) {
        setPomVersion(context);
    }
    //
    // Mantisbt plugin project, update main plugin file if required
    //
    if (options.mantisbtPlugin) {
        await setMantisBtVersion(context);
    }
    //
    // C project, update main rc file if required
    //
    if (options.cProjectRcFile) {
        await setMakefileVersion(context);
    }
    //
    // If this is a .NET build, update assemblyinfo file
    // Search root dir and one level deep.  If the assembly file is located deeper than 1 dir
    // from the root dir, it should be specified using the versionFiles arry of .publishrc
    //
    // $AssemblyInfoLoc = Get-ChildItem -Name -Recurse -Depth 1 -Filter "assemblyinfo.cs" -File -Path . -ErrorAction SilentlyContinue
    // if ($AssemblyInfoLoc -is [system.string] && ![string]::IsNullOrEmpty($AssemblyInfoLoc))
    // {
    await setDotNetVersion(context);
    // }
    // else if ($AssemblyInfoLoc -is [System.Array] && $AssemblyInfoLoc.Length -gt 0) {
    //    foreach ($AssemblyInfoLocFile in $AssemblyInfoLoc) {
    //        Set-DotNetBuild $AssemblyInfoLocFile
    //    }
    // }
    //
    // Version bump specified files in publishrc config 'versionFiles'
    //
    await setVersionFiles(context);
}


async function setVersionFiles(context: IContext): Promise<void>
{
    const options = context.options,
          logger = context.logger,
          nextRelease = context.nextRelease,
          lastRelease = context.lastRelease;
    let incremental = false,
        semVersion = "", semVersionCUR = "";

    if (!options.versionFiles || options.versionFiles.length === 0) {
        return;
    }

    //
    // If this is '--task-revert', all we're doing here is collecting the paths of the files
    // that would be updated in a run, don't actually do the update.  So we don't need to
    // look at any version stuff.
    //
    if (!options.taskRevert)
    {
        logger.log("Update 'versionFiles' specified files");
        logger.log("   # of files : " + options.versionFiles.length);
        if (options.verbose) {
            if (!isString(options.versionFiles)) {
                context.stdout.write(options.versionFiles.join(EOL) + EOL);
            }
            else {
                context.stdout.write(options.versionFiles + EOL);
            }
        }

        //
        // Below is set to handle an assemblyinfo.cs file or other version file in semver format, but the
        // build version type is incremental
        //
        if (!nextRelease.version.includes("."))
        {
            incremental = true;
            for (const c of nextRelease.version) {
                semVersion = `${semVersion}${c}.`;
            }
            semVersion = semVersion.substring(0, semVersion.length - 1);
        }
        else {
            semVersion = nextRelease.version;
        }

        if (!lastRelease.version.includes("."))
        {
            for (const c of lastRelease.version) {
                semVersionCUR = `${semVersionCUR}${c}.`;
            }
            semVersionCUR = semVersionCUR.substring(0, semVersionCUR.length - 1);
        }
        else {
            semVersionCUR = lastRelease.version;
        }
    }

    //
    // Loop through all specified files and replace version number
    //
    for (const versionFile of options.versionFiles)
    {
        let vFile = versionFile;

        //
        // Don't remember why these replacements are here, seems unnecessary
        //
        vFile = vFile.replace(/\$\{NEWVERSION\}/gi, nextRelease.version);
        vFile = vFile.replace(/\${VERSION\}/gi, nextRelease.version);
        vFile = vFile.replace(/\${CURRENTVERSION\}/gi, lastRelease.version);
        vFile = vFile.replace(/\$\{LASTVERSION\}/gi, lastRelease.version);

        if (await pathExists(vFile))
        {   //
            // If this is '--task-revert', all we're doing here is collecting the paths of the
            // files that would be updated in a run, don't actually do the update
            //
            if (options.taskRevert) {
                await addEdit(context, vFile);
                continue;
            }
            //
            // Replace version in file
            //
            let rc = false;
            logger.log(`Writing new version ${semVersion} to ${vFile}`);
            //
            // versionReplaceTags
            //
            if (options.versionReplaceTags && options.versionReplaceTags.length > 0)
            {
                for (const replaceTag of options.versionReplaceTags)
                {
                    rc = await replaceInFile(vFile, replaceTag + semVersionCUR, replaceTag + semVersion);
                    if (rc === true) {
                        break;
                    }
                }
            }
            //
            // Replace
            //
            if (rc !== true)
            {
                rc = await replaceInFile(vFile, `"${lastRelease.version}"`, `"${semVersion}"`);
                if (rc !== true)
                {
                    rc = await replaceInFile(vFile, `'${lastRelease.version}'`, `'${semVersion}'`);
                    if (rc !== true)
                    {
                        rc = await replaceInFile(vFile, lastRelease.version, semVersion);
                        if (rc !== true)
                        {
                            throw new Error("Can't write version");
                        }
                    }
                }
            }
            //
            // Below handles an assemblyinfo.cs file or other version file in semver format, but the
            // build version type is incremental
            //
            if (incremental === true)
            {
                rc = await replaceInFile(vFile, `"${semVersionCUR}"`, `"${semVersion}"`);
                if (rc !== true)
                {
                    rc = await replaceInFile(vFile, `'${semVersionCUR}'`, `'${semVersion}'`);
                    if (rc !== true)
                    {
                        rc = await replaceInFile(vFile, semVersionCUR, semVersion);
                    }
                }
            }
            await editFile(context, vFile);
        }
    }
}
