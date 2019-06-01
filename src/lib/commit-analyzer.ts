

export = getReleaseLevel;


async function getReleaseLevel({ options, commits })
{
    let level = "patch";

    for (const c in commits)
    {
        if (commits[c] === "") { continue; }

        commits[c] = commits[c].ToLower();
        if (commits[c].Contains("breaking change")) // bump major on breaking change
        {
            level = "major";
            break;
        }
        if (commits[c].Contains("majfeat: ")) // bump major on major feature
        {
            level = "major";
            break;
        }
        if (commits[c].Contains("feat: ")) // bump minor on feature
        {
            level = "minor";
            break;
        }
    }

    return level;
}
