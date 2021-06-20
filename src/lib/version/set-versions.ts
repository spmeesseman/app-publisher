import { editFile, pathExists, replaceInFile } from "../utils/fs";
import { setAppPublisherVersion } from "./app-publisher";
import { setDotNetVersion } from "./dotnet";
import { setExtJsVersion } from "./extjs";
import { setMakefileVersion } from "./makefile";
import { setMantisBtVersion } from "./mantisbt";
import { setPomVersion } from "./pom";
import { setNpmVersion } from "./npm";
// import { relative } from "path";

export = setVersions;


/**
 * Sets all versions in all fiels.
 *
 * @since 2.8.0
 *
 * @param context context
 */
async function setVersions({options, logger, lastRelease, nextRelease, cwd, env}): Promise<string[]>
{
    const edits: string[] = [];
    //
    // NPM managed project, update package.json if required
    //
    if (await pathExists("package.json")) {
        await setNpmVersion({options, logger, lastRelease, nextRelease, cwd, env});
        //
        // Track modified files
        //
        edits.push("package.json");
    }
    //
    // AppPublisher publishrc version
    //
    if (options.version) {
        const rcFiles = await setAppPublisherVersion({options, logger, nextRelease, cwd});
        if (rcFiles) {
            edits.push(...rcFiles);
            // edits.push(relative(process.cwd(), ...rcFiles));
        }
    }
    //
    // ExtJs build
    //
    if (await pathExists("app.json") && (await pathExists("workspace.json") || await pathExists("build.xml"))) {
        await setExtJsVersion({options, nextRelease});
        edits.push("app.json");
    }
    //
    // Maven managed project, update pom.xml if required
    //
    if (await pathExists("pom.xml")) {
        setPomVersion({options, nextRelease});
        edits.push("pom.xml");
    }
    //
    // Mantisbt plugin project, update main plugin file if required
    //
    if (options.mantisbtPlugin) {
        await setMantisBtVersion({options, nextRelease});
        edits.push(options.mantisbtPlugin);
    }
    //
    // C project, update main rc file if required
    //
    if (options.cProjectRcFile) {
        await setMakefileVersion({options, nextRelease});
        edits.push(options.cProjectRcFile);
    }
    //
    // If this is a .NET build, update assemblyinfo file
    // Search root dir and one level deep.  If the assembly file is located deeper than 1 dir
    // from the root dir, it should be specified using the versionFiles arry of .publishrc
    //
    // $AssemblyInfoLoc = Get-ChildItem -Name -Recurse -Depth 1 -Filter "assemblyinfo.cs" -File -Path . -ErrorAction SilentlyContinue
    // if ($AssemblyInfoLoc -is [system.string] && ![string]::IsNullOrEmpty($AssemblyInfoLoc))
    // {
    const dotNetFile = await setDotNetVersion({options, logger, nextRelease});
    if (dotNetFile) {
        edits.push(dotNetFile);
    }
    // }
    // else if ($AssemblyInfoLoc -is [System.Array] && $AssemblyInfoLoc.Length -gt 0) {
    //    foreach ($AssemblyInfoLocFile in $AssemblyInfoLoc) {
    //        Set-DotNetBuild $AssemblyInfoLocFile
    //    }
    // }
    //
    // Version bump specified files in publishrc config 'versionFiles'
    //
    const vFiles = await setVersionFiles({options, logger, lastRelease, nextRelease});
    if (vFiles.length > 0) {
        edits.push(...vFiles);
    }

    return edits;
}


async function setVersionFiles({options, logger, lastRelease, nextRelease}): Promise<string[]>
{
    const vFiles: string[] = [];

    if (!options.versionFiles || options.versionFiles.length === 0)
    {
        return vFiles;
    }

    logger.log("Preparing version files");
    let incremental = false;

    //
    // Below is set to handle an assemblyinfo.cs file or other version file in semver format, but the
    // build version type is incremental
    //
    let semVersion = "";
    if (!nextRelease.version.Contains("."))
    {
        incremental = true;
        for (const c of nextRelease.version.length) {
            semVersion = `${semVersion}${c}.`;
        }
        semVersion = semVersion.substring(0, semVersion.length - 1);
    }
    else {
        semVersion = nextRelease.version;
    }

    let semVersionCUR = "";
    if (!lastRelease.version.Contains("."))
    {
        for (const c of lastRelease.version.length) {
            semVersionCUR = `${semVersionCUR}${c}.`;
        }
        semVersionCUR = semVersionCUR.substring(0, semVersionCUR.length - 1);
    }
    else {
        semVersionCUR = lastRelease.version;
    }

    //
    // Loop through all specified files and replace version number
    //
    for (const versionFile of options.versionFiles)
    {
        let vFile = versionFile;

        vFile = vFile.replace("`\${NEWVERSION}", nextRelease.version);
        vFile = vFile.replace("`\${VERSION}", nextRelease.version);
        vFile = vFile.replace("`\${CURRENTVERSION}", lastRelease.version);
        vFile = vFile.replace("`\${LASTVERSION}", lastRelease.version);

        if (await pathExists(vFile) && !options.versionFilesEdited.Contains(vFile))
        {
            // replace version in file
            //
            let rc = false;
            logger.log(`Writing new version ${semVersion} to ${vFile}`);
            if (options.versionReplaceTags.length > 0)
            {
                for (const replaceTag of options.versionReplaceTags)
                {
                    rc = await replaceInFile(vFile, replaceTag + semVersionCUR, replaceTag + semVersion);
                    if (rc === true) {
                        break;
                    }
                }
            }
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
                rc = await replaceInFile(vFile, `"${semVersionCUR}"`, `"semVersion"`);
                if (rc !== true)
                {
                    rc = await replaceInFile(vFile, `'${semVersionCUR}'`, `'semVersion'`);
                    if (rc !== true)
                    {
                        rc = await replaceInFile(vFile, semVersionCUR, semVersion);
                    }
                }
            }
            //
            // Allow manual modifications to vFile and commit to modified list
            // Edit-File will add this file to options.versionFilesEdited
            //
            vFiles.push(vFile);
            await editFile({options}, vFile);
        }
    }

    return vFiles;
}
