
export = getIncrementalVersion;

function getIncrementalVersion({logger, options}): { version: string, versionSystem: string, versionInfo: any }
{
    let version,
        versionSystem,
        historyFile = options.historyFile,
        versionText = options.versionText;

    version = "000";
    // $ClsHistoryFile.getVersion($HISTORYFILE, $VERSIONTEXT);

    if (!version)
    {
        versionSystem = "manual";
    }
    else if (!version.Contains("."))
    {
        versionSystem = "incremental";
    }
    else {
        versionSystem = "semver";
    }
    return { version, versionSystem, versionInfo: undefined };
}
