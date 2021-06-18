

export = getReleaseLevel;


async function getReleaseLevel({ options, commits, logger })
{
    let level: string;

    //
    // TODO - read in user defined release levels from options
    //

    logger.log(`Analyze ${commits.length} commit messages for release level`)

    for (const c in commits)
    {
        if (!commits[c] || !commits[c].message) { continue; }

        const msg = commits[c].message.toLowerCase();
        if (msg.includes("breaking change")) // bump major on breaking change
        {
            logger.log("   Major (breaking change)");
            level = "major";
        }
        else if (msg.startsWith("majfeat:") || msg.startsWith("featmaj:")) // bump major on major feature
        {
            logger.log("   Major (feature)");
            level = "major";
        }
        else if (msg.startsWith("feat:")) // bump minor on feature
        {
            logger.log("   Minor (feature)");
            level = "minor";
        }
        else if (msg.startsWith("perf:")) // bump minor on feature
        {
            logger.log("   Minor (performance enhancement)");
            level = "minor";
        }
        else if (msg.startsWith("featmin:") || msg.startsWith("minfeat:")) // bump patch on minor feature
        {
            logger.log("   Patch (minor feature)");
            if (level === "") { level = "patch"; }
        }
        else if (msg.startsWith("perfmin:") || msg.startsWith("minperf:")) // bump patch on minor performance enh.
        {
            logger.log("   Patch (minor performance enhancement)");
            if (level === "") { level = "patch"; }
        }
        else if (msg.startsWith("fix:")) // bump patch on fix
        {
            logger.log("   Patch (fix)");
            if (level === "") { level = "patch"; }
        }
        else if (msg.startsWith("refactor:")) // bump patch on refactoring
        {
            logger.log("   Patch (refactoring)");
            if (level === "") { level = "patch"; }
        }
        else if (options.commitMsgMap)
        {
            Object.entries(options.commitMsgMap).forEach((keys) =>
            {
                const property = keys[0],
                      value: any = keys[1];
                if (msg.startsWith(property + ":") || msg.startsWith(property + "("))
                {
                    if (value.versionBump !== "none")
                    {
                        if (value.include !== false)
                        {
                            if (value.versionBump === "patch" || value.versionBump === "minor" || value.versionBump === "major")
                            {
                                logger.log(`   ${value.versionBump} (${value.formatText})(custom map)`);
                                if (value.versionBump === "patch") {
                                    if (level !== "minor" && level !== "major") {
                                        level = "patch";
                                    }
                                }
                                else {
                                    level = value.versionBump;
                                }
                            }
                            else {
                                logger.warn(`   ${value.versionBump} (Invalid)(custom map) IGNORED`);
                                logger.warn("      Must be one of 'patch', 'minor', or 'major'");
                            }
                        }
                        else {
                            logger.warn(`      ${value.versionBump} (custom map) IGNORED`);
                        }
                    }
                }
            });
        }

        if (level === "major") {
            break;
        }
    }

    // if (!level) {
    //     logger.warn("There were no commits found that set the release level, forcing to 'patch'");
    //     level = "patch";
    // }

    return level;
}
