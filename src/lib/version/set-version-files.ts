import { editFile, pathExists, replaceInFile } from "../utils";

export { setVersionFiles };


async function setVersionFiles({options, logger, lastRelease, nextRelease}): Promise<void>
{
    if (!options.versionFiles || options.versionFiles.length === 0)
    {
        return;
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
            editFile({options}, vFile, false, (options.skipVersionEdits === " Y" || options.taskTouchVersions));
        }
    }
}
