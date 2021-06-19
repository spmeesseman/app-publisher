using namespace System
using namespace System.IO
using namespace System.Text.RegularExpressions

#
# Command line args are for future semantic-release chain.  Currently, the below variables 
# are $in this script.
#
# If this is a node based project (i.e. the directory node_modules exists), then the
# current version is determined from package.json, and the next release version is determined
# by the semver module.
# If this is not a node based project (i.e. C project, Java, .NET), we determine the current
# version from the history.txt file.  Depending on the current version semantics, we either
# increment the version number (legacy incremental versioning) or use the semver module (semantic
# versioning maj.min.patch) to determine the next version number.
#
param ( 
    $options
)
$options = ConvertFrom-Json -InputObject $options

$XRUNS = @()
if ($options.xRuns) {
    $XRUNS = $options.xRuns
}
$NUMRUNS = $XRUNS.Length + 1
#
# Version will be set by spawning nodejs process, do not set
#
$APPPUBLISHERVERSION = ""
if ($options.appPublisherVersion) {
    $APPPUBLISHERVERSION = $options.appPublisherVersion
}

#**************************************************************#

#####  #       #    #####  #####  #####  ##### 
#      #      # #   #      #      #      #     
#      #     #####  #####  #####  ####   ##### 
#      #     #   #      #      #  #          # 
#####  ####  #   #  #####  #####  #####  ##### 

#**************************************************************#

#region Classes

#
# Define some script classes:
#
#     Vc
#     HistoryFile
#     AnalyzeCommits
#

class Vc
{
    [array]getCommits($RepoType, $Repo, $Branch, $CurrentVersion, $TagPrefix)
    {
        $comments = @()
        LogMessage "Getting commits made since prior release/version"

        $TagPre = "v"
        if (![string]::IsNullOrEmpty($TagPrefix) -and $TagPrefix -ne ".") {
            $TagPre = "$TagPrefix-v"
        }

        LogMessage "   Repo type      :  $RepoType"
        LogMessage "   Repo           :  $Repo"
        LogMessage "   CurrentVersion :  $CurrentVersion"
        LogMessage "   TagPrefix      :  $TagPre"

        if ($RepoType -eq "svn")
        {
            $svnUser = $Env:SVN_AUTHOR_NAME
            $svnToken = $Env:SVN_TOKEN
            
            LogMessage "Retrieving most recent tag"
            #
            # Issue SVN log command
            #
            $TagLocation = $Repo.Replace("trunk", "tags").Replace("branches/" + $Branch, "tags");
            
            if (![string]::IsNullOrEmpty($svnUser) -and ![string]::IsNullOrEmpty($svnToken)) {
                $xml = svn log --xml "$TagLocation" --verbose --limit 50 --non-interactive --no-auth-cache --username "$svnUser" --password "$svnToken"
            }
            else {
                $xml = svn log --xml "$TagLocation" --verbose --limit 50 --non-interactive --no-auth-cache
            }
            if ($LASTEXITCODE -ne 0) {
                LogMessage "No commits found or no version tag exists" "yellow"
                return $comments
            }

            #
            # Parse log response
            #

            $path = $null
            $rev = $null
            $date = $null

            LogMessage "Parsing response from SVN"
            try {
                $xmlObj = (([Xml] ($xml)).Log.LogEntry.Paths.Path |
                Where-Object { $_.action -eq 'A' -and $_.kind -eq 'dir' -and $_.InnerText -like "*tags/$TagPre[1-9]*"} |
                Select-Object -Property @(
                    @{N='revision'; E={$_.ParentNode.ParentNode.Revision}},
                    @{N='date'; E={$_.ParentNode.ParentNode.Date}},
                    @{N='path'; E={$_.InnerText}} )|
                Sort-Object Date -Descending | Select-Object -First 2)
                $path = $xmlObj[0].path
                $rev = $xmlObj[0].revision
                $date = $xmlObj[0].date
                #
                # Make sure it exists
                #
                $TagVers = $path.Substring($path.LastIndexOf("/") + 1);
                
                if (![string]::IsNullOrEmpty($svnUser) -and ![string]::IsNullOrEmpty($svnToken)) {
                    $xml = svn ls "$TagLocation/$TagVers" --non-interactive --no-auth-cache --username "$svnUser" --password "$svnToken" >$null 2>&1 
                }
                else {
                    $xml = svn ls "$TagLocation/$TagVers" --non-interactive >$null 2>&1
                }
                if ($LASTEXITCODE -ne 0) {
                    $path = $xmlObj[1].path
                    $rev = $xmlObj[1].revision
                    $date = $xmlObj[1].date 
                }
            }
            catch {
                LogMessage "Response could not be parsed, invalid module, no commits found, or no version tag exists" "red"
                return $comments
            }

            if ([string]::IsNullOrEmpty($path) -or [string]::IsNullOrEmpty($rev) -or [string]::IsNullOrEmpty($date)) {
                LogMessage "Response could not be parsed, invalid module, no commits found, or no version tag exists" "red"
                return $comments
            }

            #
            LogMessage "   Found version tag:"
            LogMessage "      Rev     : $rev"
            LogMessage "      Path    : $path"
            LogMessage "      Date    : $date"

            #
            # Retrieve commits since last version tag
            #
            LogMessage "Retrieving commits since last version"
            
            if (![string]::IsNullOrEmpty($svnUser) -and ![string]::IsNullOrEmpty($svnToken)) {
                $xml = svn log --xml "$Repo" --verbose --limit 250 -r ${rev}:HEAD --non-interactive --no-auth-cache --username "$svnUser" --password "$svnToken"
            }
            else {
                $xml = svn log --xml "$Repo" --verbose --limit 250 -r ${rev}:HEAD --non-interactive
            }
            if ($LASTEXITCODE -ne 0) {
                LogMessage "Failed to retrieve commits" "red"
                return $comments
            }
            LogMessage "Parsing response from SVN"

            #
            # Create xml document object from SVN log response
            #
            $xdoc = $null;
            try {
                $xdoc = [Xml]$xml
            }
            catch {
                LogMessage "No commits found or no version tag exists" "red"
                $Proceed = read-host -prompt "Do you want to get all commits on this branch? Y[N]"
                if ($Proceed.ToUpper() -eq "Y") {
                    
                    if (![string]::IsNullOrEmpty($svnUser) -and ![string]::IsNullOrEmpty($svnToken)) {
                        $xml = svn log --xml "$Repo" --verbose --limit 250 --non-interactive --no-auth-cache --username "$svnUser" --password "$svnToken"
                    }
                    else {
                        $xml = svn log --xml "$Repo" --verbose --limit 250 --non-interactive
                    }
                    if ($LASTEXITCODE -ne 0) {
                        LogMessage "No commits found or no version tag exists" "red"
                        return $comments
                    }
                    try {
                        $xdoc = [Xml]$xml
                    }
                    catch {
                        LogMessage "No commits found" "red"
                        return $comments
                    }
                }
                else {
                    return $comments
                }
            }
            #
            # Parse the commit messages
            #
            foreach ($msg in $xdoc.log.logentry.msg) {
                if ($null -ne $msg -and $msg -ne "") {
                    $comments += $msg
                }
            }
        }
        elseif ($RepoType -eq "git")
        {
            # Issue GIT log command
            #
            $separator = [string[]]@("|^*|")
            $GitOut = & git log $TagPre$CurrentVersion..HEAD --pretty=format:"%B$separator"
            $GitOut = $GitOut -join "`r`n"
            if ($LASTEXITCODE -eq 0 -and ![string]::IsNullOrEmpty($GitOut)) {
                $comments = $GitOut.Substring(0, $GitOut.Length - 5).Split($separator, [System.StringSplitOptions]::RemoveEmptyEntries)
            }
            else {
                LogMessage "No commits found or no version tag exists" "red"
                LogMessage "Git Output: $GitOut" "red"
                return $comments
            }
        }
        else 
        {
            LogMessage "Invalid repository type specified: $RepoType" "red"
            return $comments
        }

        $NumCommits = $comments.Length;
        LogMessage "Found $NumCommits commits"

        #
        # Sort comments array
        #
        $retComments = @()
        if ($comments.Length -gt 0)
        {
            $comments = $comments | Sort-Object -Unique
            #
            # Re-sort comments array and put 'build' comments last
            #
            $toAddAtEnd = @();
            foreach ($comment in $comments)
            {
                if ($comment.IndexOf("build:") -ne -1 -or $comment.IndexOf("build(") -ne -1 -or 
                    $comment.IndexOf("ci:") -ne -1 -or $comment.IndexOf("ci(") -ne -1)
                {
                    $toAddAtEnd += $comment;
                }
                else {
                    $retComments += $comment;
                }
            }
            foreach ($comment in $toAddAtEnd)
            {
                $retComments += $comment
            }
        }

        return $retComments
    }
}


class CommitAnalyzer
{
    [object]$CommitMap = $null

    [string]get($Commits) 
    {
        $linefmt = $null
        $ReleaseLevel = "patch";
        #
        # Loop through each line and look at the comment tag.  The comment tag needs to be
        # at the start of the comment, and be appended by a ':' character.  For example:
        #
        #     feat: add internet explorer support
        #
        # A tag can be scoped, for example:
        #
        #     chore(release): version 1.1.0 post release check in files
        #
        foreach($line in $Commits)
        {
            if ([string]::IsNullOrEmpty($line)) { continue; }
            $linefmt = $line.ToLower().Trim();
            if ($linefmt.Contains("breaking change")) # bump major on breaking change
            {
                LogMessage "Breaking change found"
                $ReleaseLevel = "major";
            }
            elseif ($linefmt.StartsWith("majfeat: ") -or $linefmt.StartsWith("majfeat(")) # bump major on major feature
            {
                LogMessage "Major feature found"
                $ReleaseLevel = "major";
            }
            elseif ($linefmt.StartsWith("featmaj: ") -or $linefmt.StartsWith("featmaj(")) # bump major on major feature
            {
                LogMessage "Major feature found"
                $ReleaseLevel = "major";
            }
            elseif ($linefmt.StartsWith("featmin:") -or $linefmt.StartsWith("featmin(")) # bump patch on minor feature
            {
                LogMessage "Minor feature found";
                if ($ReleaseLevel -ne "minor") {
                    $ReleaseLevel = "patch";
                }
            }
            elseif ($linefmt.StartsWith("minfeat:") -or $linefmt.StartsWith("minfeat(")) # bump patch on minor feature
            {
                LogMessage "Minor feature found";
                if ($ReleaseLevel -ne "minor") {
                    $ReleaseLevel = "patch";
                }
            }
            elseif ($linefmt.StartsWith("feat:") -or $linefmt.StartsWith("feat(")) # bump minor on feature
            {
                LogMessage "Feature found";
                $ReleaseLevel = "minor";
            }
            elseif ($linefmt.StartsWith("perfmin:") -or $linefmt.StartsWith("perfmin("))
            {
                LogMessage "Minor performance enhancement found";
                if ($ReleaseLevel -ne "minor") {
                    $ReleaseLevel = "patch";
                }
            }
            elseif ($linefmt.StartsWith("minperf:") -or $linefmt.StartsWith("minperf("))
            {
                LogMessage "Minor performance enhancement found";
                if ($ReleaseLevel -ne "minor") {
                    $ReleaseLevel = "patch";
                }
            }
            elseif ($linefmt.StartsWith("perf:") -or $linefmt.StartsWith("perf("))
            {
                LogMessage "Performance enhancement found";
                $ReleaseLevel = "minor";
            }
            elseif ($linefmt.StartsWith("fix:") -or $linefmt.StartsWith("fix("))
            {
                LogMessage "Fix found";
                if ($ReleaseLevel -ne "minor") {
                    $ReleaseLevel = "patch";
                }
            }
            elseif ($null -ne $this.CommitMap)
            {
                $this.CommitMap.psobject.Properties | ForEach-Object { # Bracket must stay same line as ForEach-Object
                    LogMessage ("Processing custom commit message map property '" + $_.Name + "'")
                    if ($linefmt.StartsWith($_.Name + ":") -or $linefmt.StartsWith($_.Name + "("))
                    {
                        LogMessage ($_.Value.formatText + " found")
                        if ($_.Value.versionBump -ne "none" -and $_.Value.include -ne $false)
                        {
                            if ($_.Value.versionBump -eq 'patch' -or $_.Value.versionBump -eq 'minor' -or $_.Value.versionBump -eq 'major')
                            {
                                LogMessage ("Found '" + $_.Value.versionBump + "' custom version bump")
                                $ReleaseLevel = $_.Value.versionBump
                                if ($_.Value.versionBump -eq "patch") {
                                    if ($ReleaseLevel -ne "minor" -and $ReleaseLevel -ne "major") {
                                        $ReleaseLevel = "patch";
                                    }
                                }
                                else {
                                    $ReleaseLevel = $_.Value.versionBump;
                                }
                            }
                            else {
                                LogMessage ("Found '" + $_.Value.versionBump + "' custom version bump", "red")
                                LogMessage "Invalid custom version bump", "red"
                            }
                        }
                    }
                }
            }
            
            if ($ReleaseLevel -eq "major") {
                break;
            }
        }

        return $ReleaseLevel;
    }

    [string] getFormatted($Subject)
    {
        $FormattedSubject = $Subject.ToLower();

        switch ($FormattedSubject)
        {
            "build"   { $FormattedSubject = "Build System"; break }
            "chore"   { $FormattedSubject = "Chores"; break }
            "ci"      { $FormattedSubject = "Continuous Integration"; break }
            "docs"    { $FormattedSubject = "Documentation"; break }
            "doc"     { $FormattedSubject = "Documentation"; break }
            "feat"    { $FormattedSubject = "Features"; break }
            "feature" { $FormattedSubject = "Features"; break }
            "featmin" { $FormattedSubject = "Features"; break }
            "fix"     { $FormattedSubject = "Bug Fixes"; break }
            "layout"  { $FormattedSubject = "Project Layout"; break }
            "minfeat" { $FormattedSubject = "Features"; break }
            "perf"    { $FormattedSubject = "Performance Enhancements"; break }
            "perfmin" { $FormattedSubject = "Performance Enhancements"; break }
            "minperf" { $FormattedSubject = "Performance Enhancements"; break }
            "progress"{ $FormattedSubject = "Ongoing Progress"; break }
            "project" { $FormattedSubject = "Project Structure"; break }
            "refactor"{ $FormattedSubject = "Refactoring"; break }
            "style"   { $FormattedSubject = "Code Styling"; break }
            "test"    { $FormattedSubject = "Tests"; break }
            "tweak"   { $FormattedSubject = "Refactoring"; break }
            "visual"  { $FormattedSubject = "Visuals"; break }
            default   { $FormattedSubject = $Subject; break }
        }

        if ($this.CommitMap)
        {
            $this.CommitMap.psobject.Properties | ForEach-Object { # Bracket must stay same line as ForEach-Object
                LogMessage ("Processing custom commit message map property '" + $_.Name + "'")
                if ($Subject -eq $_.Name)
                {
                    $FormattedSubject = $_.Value.formatText
                }
            }
        }

        return $FormattedSubject
    }
}


class HistoryFile
{
    [object]$CommitMap = $null

    [bool] containsValidSubject($LineText)
    {
        $valid = $false;

        if ([string]::IsNullOrEmpty($LineText)) {
            return $valid;
        }

        $valid = ($LineText.Contains("Build System") -or $LineText.Contains("Chore") -or $LineText.Contains("Documentation") -or
            $LineText.Contains("Feature") -or $LineText.Contains("Bug Fix") -or $LineText.Contains("Performance") -or
            $LineText.Contains("Ongoing Progress") -or $LineText.Contains("Refactoring") -or $LineText.Contains("Code Styling") -or
            $LineText.Contains("Tests") -or $LineText.Contains("Project Structure") -or $LineText.Contains("Project Layout") -or
            $LineText.Contains("Visual") -or $LineText.StartsWith("Fix") -or $LineText.StartsWith("General") -or
            $LineText.StartsWith("Continuous Integration"))

        if (!$valid -and $this.CommitMap)
        {
            $this.CommitMap.psobject.Properties | ForEach-Object { # Bracket must stay same line as ForEach-Object
                LogMessage ("Processing custom commit message map property '" + $_.Name + "'")
                if ($LineText.Contains($_.Value.formatText))
                {
                    $valid = $true;
                }
            }
        }

        return $valid;
    }

    [string]getVersion($in, $stringver)
    {
        return $this.getHistory("", "", 0, $stringver, $false, $in, "", "", "", "", "", "", "", @(), "")
    }

    [string]createSectionFromCommits($CommitsList, $LineLen)
    {
        $TextInfo = (Get-Culture).TextInfo
        $comments = ""
        $commentNum = 1

        if ($null -eq $CommitsList -or $CommitsList.Length -eq 0) {
            return $comments
        }

        #
        # Parse the commit messages
        #
        foreach ($msg in $CommitsList)
        {
            $msg = $msg.Trim()
            $msgLwr = $msg.ToLower()

            $customIgnoreFound = $false
            
            if ($this.CommitMap)
            {
                $this.CommitMap.psobject.Properties | ForEach-Object { # Bracket must stay same line as ForEach-Object
                    if ($msg.ToLower().StartsWith($_.Name ) -and !$_.Value.include) {
                        $customIgnoreFound = $true
                    }
                }
            }

            if ($customIgnoreFound) {
                continue;
            }

            if ($null -ne $msg -and $msg -ne "" -and !$msgLwr.StartsWith("chore") -and
                !$msgLwr.StartsWith("progress") -and !$msgLwr.StartsWith("style") -and !$msgLwr.StartsWith("project"))
            {   #
                # Remove CI related tags
                #
                $msg = $msg.Replace("[skip-ci] ", "")
                $msg = $msg.Replace(" [skip-ci]", "")
                $msg = $msg.Replace("[skip-ci]", "")
                $msg = $msg.Replace("[skip ci]", "")
                $msg = $msg.Replace(" [skip ci]", "")
                $msg = $msg.Replace("[skip ci]", "")
                #
                # Replace commit tags with full text (non-scoped)
                #
                # Commit tags should be at the start of the commit message.
                #
                # Examples of commit tags:
                #
                #     feat: add internet explorer support
                #
                $msg = $msg.Replace("build: ", "Build System`r`n`r`n")
                $msg = $msg.Replace("chore: ", "Chore`r`n`r`n")
                $msg = $msg.Replace("ci: ", "Continuous Integration`r`n`r`n")
                $msg = $msg.Replace("docs: ", "Documentation`r`n`r`n")
                $msg = $msg.Replace("doc: ", "Documentation`r`n`r`n")
                $msg = $msg.Replace("minfeat: ", "Feature`r`n`r`n")
                $msg = $msg.Replace("featmin: ", "Feature`r`n`r`n")
                $msg = $msg.Replace("feat: ", "Feature`r`n`r`n")
                $msg = $msg.Replace("fix: ", "Bug Fix`r`n`r`n")
                $msg = $msg.Replace("perf: ", "Performance`r`n`r`n")
                $msg = $msg.Replace("perfmin: ", "Performance`r`n`r`n")
                $msg = $msg.Replace("minperf: ", "Performance`r`n`r`n")
                $msg = $msg.Replace("progress: ", "Ongoing Progress`r`n`r`n")
                $msg = $msg.Replace("refactor: ", "Refactoring`r`n`r`n")
                $msg = $msg.Replace("style: ", "Code Styling`r`n`r`n")
                $msg = $msg.Replace("test: ", "Tests`r`n`r`n")
                $msg = $msg.Replace("tweak: ", "Refactoring`r`n`r`n")
                $msg = $msg.Replace("project: ", "Project Structure`r`n`r`n")
                $msg = $msg.Replace("layout: ", "Project Layout`r`n`r`n")
                $msg = $msg.Replace("visual: ", "Visual`r`n`r`n")
                $msg = $msg.Replace("misc: ", "Miscellaneous`r`n`r`n")
                #
                # Replace commit tags with full text (scoped)
                #
                # A tag can be scoped, for example:
                #
                #     fix(footpedal): pressing multiple buttons at same time breaks audio player
                #
                $msg = $msg.Replace("build(", "Build System(")
                $msg = $msg.Replace("chore(", "Chore(")
                $msg = $msg.Replace("ci(", "Continuous Integration(")
                $msg = $msg.Replace("docs(", "Documentation(")
                $msg = $msg.Replace("doc(", "Documentation(")
                $msg = $msg.Replace("featmin(", "Feature(")
                $msg = $msg.Replace("minfeat(", "Feature(")
                $msg = $msg.Replace("feat(", "Feature(")
                $msg = $msg.Replace("fix(", "Bug Fix(")
                $msg = $msg.Replace("perf(", "Performance(")
                $msg = $msg.Replace("perfmin(", "Performance(")
                $msg = $msg.Replace("minperf(", "Performance(")
                $msg = $msg.Replace("refactor(", "Refactoring(")
                $msg = $msg.Replace("project(", "Project Structure(")
                $msg = $msg.Replace("test(", "Tests(")
                $msg = $msg.Replace("tweak(", "Refactoring(")
                $msg = $msg.Replace("style(", "Code Styling(")
                $msg = $msg.Replace("layout(", "Project Layout(")
                $msg = $msg.Replace("visual(", "Visual(")
                $msg = $msg.Replace("progress(", "Ongoing Progress(")
                $msg = $msg.Replace("misc(", "Miscellaneous(")

                if ($this.CommitMap)
                {
                    $this.CommitMap.psobject.Properties | ForEach-Object { # Bracket must stay same line as ForEach-Object
                        $msg = $msg.Replace($_.Name + ": ", $_.Value.formatText + "`r`n`r`n")
                        $msg = $msg.Replace($_.Name + "(", $_.Value.formatText + "(")
                    }
                }

                #
                # Take any parenthesized scopes, remove the parenthesis and line break the message
                # that follows
                #
                [Match] $match = [Regex]::Match($msg, "[(][a-z0-9\- ]*[)]\s*[:][ ]{0,}") # subject - all lower case, or numbers
                while ($match.Success) {
                    $NewText = $match.Value.Replace("(", "")
                    $NewText = $NewText.Replace(")", "")
                    $NewText = $NewText.Replace(":", "").Trim()
                    if ($NewText.ToLower() -eq "ap") {
                        $NewText = "App-Publisher"
                    }
                    $NewText = $TextInfo.ToTitleCase($NewText.ToLower()) # title case
                    $msg = $msg.Replace($match.Value, ":  $NewText`r`n`r`n")
                    $match = $match.NextMatch()
                }
                [Match] $match = [Regex]::Match($msg, "[(][a-z\- _.A-Z]*[)]\s*[:][ ]{0,}") # scope - all thats left (all caps or user formatted)
                while ($match.Success) {
                    $NewText = $match.Value.Replace("(", "")
                    $NewText = $NewText.Replace(")", "")
                    $NewText = $NewText.Replace(":", "").Trim()
                    if ($NewText.ToLower() -eq "ap") {
                        $NewText = "App-Publisher"
                    }
                    $msg = $msg.Replace($match.Value, ":  $NewText`r`n`r`n")
                    $match = $match.NextMatch()
                }
                #
                # Take ticket# tags and put them on separate line at bottom of message, skip tags already on 
                # their own line
                #
                $match = [Regex]::Match($msg, "[ ]{0,1}\[(&nbsp;| )*(bugs?|issues?|closed?s?|fixe?d?s?|resolved?s?|refs?|references?){1}(&nbsp;| )*#[0-9]+((&nbsp;| )*,(&nbsp;| )*#[0-9]+){0,}(&nbsp;| )*\]", [Text.RegularExpressions.RegexOptions]::IgnoreCase);
                while ($match.Success) 
                {
                    $NewText = $match.Value.ToLower();
                    if ($NewText.Contains("fixed ")) {
                        $NewText = $NewText.Replace("fixed ", "fixes ")
                    }
                    elseif ($NewText.Contains("fix ")) {
                        $NewText = $NewText.Replace("fix ", "fixes ")
                    }
                    elseif ($NewText.Contains("closed ")) {
                        $NewText = $NewText.Replace("closed ", "closes ")
                    }
                    elseif ($NewText.Contains("close ")) {
                        $NewText = $NewText.Replace("close ", "closes ")
                    }
                    elseif ($NewText.Contains("resolved ")) {
                        $NewText = $NewText.Replace("resolved ", "resolves ")
                    }
                    elseif ($NewText.Contains("resolve ")) {
                        $NewText = $NewText.Replace("resolve ", "resolves ")
                    }
                    elseif ($NewText.Contains("reference ")) {
                        $NewText = $NewText.Replace("reference ", "references ")
                    }
                    elseif ($NewText.Contains("refs ")) {
                        $NewText = $NewText.Replace("refs ", "references ")
                    }
                    elseif ($NewText.Contains("ref ")) {
                        $NewText = $NewText.Replace("ref ", "reference ")
                    }
                    elseif ($NewText.Contains("bugs ")) {
                        $NewText = "bug "
                    }
                    elseif ($NewText.Contains("issues ")) {
                        $NewText = "issue "
                    }
                    $NewText = $TextInfo.ToTitleCase($NewText).Trim()
                    $msg = $msg.Replace($match.Value, "`r`n`r`n$NewText")
                    $msg = $msg.Replace("`n`n`r`n`r`n", "`r`n`r`n")
                    $msg = $msg.Replace("`n`r`n`r`n", "`r`n`r`n")
                    $match = $match.NextMatch()
                }
                #
                # Typically when writing the commit messages all lowercase is used.  Capitalize the first 
                # letter following the commit message tag
                #
                $match = [Regex]::Match($msg, "[\r\n]{2}\s*[a-z]");
                while ($match.Success) {
                    if ($match.Value.Contains("`r`n`r`n")) { # ps regex is buggy on [\r\n]{2}
                        $msg = $msg.Replace($match.Value, $match.Value.ToUpper())
                    }
                    $match = $match.NextMatch()
                }

                #
                # Capitalize first word
                #
                $msg1 = $msg.Substring(0, 1).ToUpper();
                $msg2 = $msg.Substring(1);
                $msg = "$msg1$msg2"

                #
                # Initialize new line broken entry
                #
                $line = "";
                
                #
                # Order the entries in an ordered list, 1., 2., 3., etc...
                #
                if ($commentNum -lt 10) {
                    $line = "$commentNum.  "
                }
                else {
                    $line = "$commentNum. "
                }

                #
                # Format the messages to the maximum line length for each line, breaking up lines longer 
                # than $LineLen
                #
                $msgLines = $msg.Split("`n");
                for ($i = 0; $i -lt $msgLines.Length; $i++)
                {
                    $indented = ""
                    
                    if ($i -gt 0) {
                        $line += "`r`n"
                    }

                    $msgPart = $msgLines[$i];

                    #
                    # If this message line is longer than $LineLen - 4, break it up
                    # (allow 4 spaces or numbered item 1.  , 2.  , etc)
                    #
                    $l = $LineLen - 4;
                    if ($msgPart.Length -gt $l)
                    {
                        $idx = $msgPart.LastIndexOf(" ", $l)
                        $PartLine = $msgPart.SubString(0, $idx)
                        while ($PartLine.Length -gt $l) 
                        {
                            $idx = $msgPart.LastIndexOf(" ", $PartLine.Length - 1)
                            $PartLine = $msgPart.SubString(0, $idx).Trim()
                        }

                        #
                        # Check indentation, don't trim the leading spaces of a purposely indented line
                        #
                        if ($PartLine.StartsWith("   ")) 
                        {
                            $isListSPace = ""

                            # Record the number of spaces in the indentation to apply to any broken lines
                            #
                            for ($j = 0; $j -lt $PartLine.Length; $j++) 
                            {
                                if ($PartLine[$j] -eq " ") {
                                    $indented += " "
                                }
                                else {    # unordered list?
                                    if ($PartLine[$j] -eq "*") {
                                        $indented +=  "  "
                                    }
                                    else { # numbered list?
                                        $match = [Regex]::Match($PartLine.Substring($j,2), "[1-9](\.|\))");
                                        if ($match.Success) {
                                            $indented +=  "   "
                                        }
                                    }
                                    break;
                                }
                            }
                            $line += $PartLine.TrimEnd();
                        }
                        else {
                            $line += $PartLine.Trim();
                        }

                        #
                        # Keep going until we've broken the whole message line down...
                        #
                        while ($msgPart.Length -gt $l)
                        {
                            $msgPart = $msgPart.SubString($idx + 1) # use 'idx+1' since char at idx is always a space char
                            $line += "`r`n";
                            if ($msgPart.Length -gt $l -and $msgPart.LastIndexOf(" ") -ne -1) 
                            {
                                $idx = $msgPart.LastIndexOf(" ", $l - $indented.Length)
                                $PartLine =$msgPart.SubString(0, $idx);
                                while ($PartLine.Length -gt $l) 
                                {
                                    $idx = $msgPart.LastIndexOf(" ", $PartLine.Length - 1)
                                    $PartLine = $msgPart.SubString(0, $idx);
                                }
                                #
                                # Don't trim the leading spaces of a purposely indented line
                                #
                                if ($indented -ne "") 
                                {
                                    $line += ($indented + $PartLine.Trim());
                                }
                                else {
                                    $line += $PartLine.Trim();
                                }
                            }
                            else {
                                #
                                # Don't trim the leading spaces of a purposely indented line
                                #
                                $line += ($indented + $msgPart.Trim());
                                $indented = ""
                            }
                        }
                    }
                    else {
                        $indented = ""
                        #
                        # Don't trim the leading spaces of a purposely indented line
                        #
                        if ($msgPart.StartsWith("   ")) {
                            $indented = $true
                            $line += $msgPart.TrimEnd();
                        }
                        else {
                            $line += $msgPart.Trim();
                        }
                    }
                }

                #
                # Space all lines lined up with first to the right of the bullet number, ie:
                #
                #     1.  This is line 1
                #
                #         Line2 needs to be moved right 4 spaces from line beginnign to line it up with line1
                #
                #     2.  .......
                #
                $idx = $line.IndexOf("`n");
                if ($idx -eq -1)
                {   #
                    # Auto append '.' to single lines if there isn't one already, and the line isn't ended
                    # with a boxed tag, e.g. [skip ci] , [fixes #333] , etc
                    #
                    $line = $line.TrimEnd()
                    if (!$line.EndsWith(".") -and !$line.EndsWith("]")) {
                        $line = "$line."
                    }
                }
                else {
                    $lCt = 0
                    while ($idx -ne -1)
                    {
                        ++$lCt;
                        $line = $line.Substring(0, $idx + 1) + "    " + $line.Substring($idx + 1)
                        $idx = $line.IndexOf("`n", $idx + 1)
                    }
                    if ($lCt -eq 2)
                    {
                        if ([Regex]::Match($line, "^[1-9]{1,2}\. ").Success)
                        {   #
                            # Auto append '.' to single lines if there isn't one already, and the line isn't ended
                            # with a boxed tag, e.g. [skip ci] , [fixes #333] , etc
                            #
                            $line = $line.TrimEnd()
                            if (!$line.EndsWith(".") -and !$line.EndsWith("]")) {
                                $line = "$line."
                            }
                        }
                    }
                }

                $comments = $comments + $line + "`r`n`r`n"
            
                $commentNum++
            }
        }
        
        #
        # Format the commit messages before adding to the hostory file
        #
        $comments = $comments.Replace("`n`n", "`r`n`r`n")
       
        #
        # Use two new lines after new section
        #
        if (!$comments.EndsWith("`r`n`r`n")) {
            $comments = $comments + "`r`n";
        }

        #
        # Perform spell checking (currently the projectoxford has been taken down after the
        # Microsoft deal with the facial rec api)
        #
        #$comments = CheckSpelling $comments $false

        return $comments
    }

    [string]getEmailHeader($project, $version, $stringver, $targetloc, $npmpkg, $nugetpkg, $mantisRelease, $mantisUrl, $historyFileHref, $emailHrefs, $vcWebPath)
    {
        $szHrefs = ""

        if (![string]::IsNullOrEmpty($targetloc) -or ![string]::IsNullOrEmpty($npmpkg) -or ![string]::IsNullOrEmpty($nugetpkg) -or ![string]::IsNullOrEmpty($historyFileHref) -or ($mantisRelease -eq "Y" -and ![string]::IsNullOrEmpty($mantisUrl))) 
        {
            $szHrefs = "<table>"

            $szHrefs += "<tr><td colspan=`"2`"><b>$project $stringver $version has been released.</b><br><br></td></tr>"

            if ($mantisRelease -eq "Y" -and ![string]::IsNullOrEmpty($mantisUrl)) {
                $szHrefs += "<tr><td>Release Page</td><td style=`"padding-left:10px`"><a href=`"$mantisUrl/set_project.php?project=$project&make_default=no&ref=plugin.php%3Fpage=Releases%2Freleases`">Releases - Projects Board</a></td></tr>"
            }

            if (![string]::IsNullOrEmpty($targetloc)) {
                $szHrefs += "<tr><td>Network Location</td><td style=`"padding-left:10px`"><a href=`"$targetloc`">Network Drive Location</a></td></tr>"
            }

            if (![string]::IsNullOrEmpty($npmpkg))
            {
                $szHrefs += "<tr><td>NPM Location</td><td style=`"padding-left:10px`"><a href=`"$npmpkg`">NPM Registry</a></td></tr>"
            }

            if (![string]::IsNullOrEmpty($nugetpkg))
            {
                $szHrefs += "<tr><td>Nuget Location</td><td style=`"padding-left:10px`"><a href=`"$nugetpkg`">Nuget Registry</a></td></tr>"
            }

            #
            # history file
            #
            if (![string]::IsNullOrEmpty($historyFileHref)) {
                $szHrefs += "<tr><td>Complete History</td><td style=`"padding-left:10px`">$historyFileHref</td></tr>"
            }
            elseif (![string]::IsNullOrEmpty($targetloc) -and !$targetloc.Contains("http://") -and !$targetloc.Contains("https://")) {
                $szHrefs += "<tr><td>Complete History</td><td style=`"padding-left:10px`"><a href=`"$targetloc\history.txt`">History File - Filesystem Storage</a></td></tr>"
            }
            elseif ($mantisRelease -eq "Y" -and ![string]::IsNullOrEmpty($mantisUrl) -and ![string]::IsNullOrEmpty($vcWebPath)) {
                $szHrefs += "<tr><td>Complete History</td><td style=`"padding-left:10px`"><a href=`"$mantisUrl/plugin.php?page=IFramed/main?title=History&url=$vcWebPath%2F$project%2Ftrunk%2Fdoc%2Fhistory.txt`">History File - Projects Board</a></td></tr>"
            }
            
            foreach ($emailHref in $emailHrefs) 
            {
                $eLink = $emailHref;
                $eLinkName = $emailHref;
                $eLinkDescrip = ""
                if ($emailHref.Contains("|"))
                {
                    $emailHrefParts = $emailHref.Split("|")
                    $eLink = $emailHrefParts[0]
                    $eLinkDescrip= $emailHrefParts[1]
                    if ($emailHrefParts.Length -gt 2) {
                        $eLinkName = $emailHrefParts[2]
                    }
                    $szHrefs += "<tr><td>$eLinkDescrip</td><td style=`"padding-left:10px`"><a href=`"$eLink`">$eLinkName</a></td></tr>"
                }
            }

            $szHrefs += "</table>";
        }

        return $szHrefs
    }

    [array]getChangelogTypes($Changelog)
    {
        $ChangelogTypes = @()

        $match = [Regex]::Match($Changelog, "\w*(?<=### ).+?(?=(<br>-))")
        while ($match.Success) 
        {
            $Section = $match.Value
            #
            # Trim plurality
            #
            if ($Section.EndsWith("es<br>") -and $Section -ne "Features<br>") {
                $Section = $Section.SubString(0, $Section.Length - 6);
            }
            elseif ($Section.EndsWith("s<br>") -and $Section -ne "Miscellaneous<br>") {
                $Section = $Section.SubString(0, $Section.Length - 5);
            }
            #
            # count the messages for each section and add the subjects to the types array
            #
            $match2 = [Regex]::Match($Changelog, "\w*(?<=$Section).+?(?=(<br>###|$))")
            while ($match2.Success) 
            {
                $i1 = $match2.Value.IndexOf("<br>- ");
                while ($i1 -ne -1) {
                    $ChangelogTypes += $Section.Replace("<br>", "").Trim()
                    $i1 = $match2.Value.IndexOf("<br>- ", $i1 + 1);
                }
                $match2 = $match2.NextMatch()
            }
            $match = $match.NextMatch()
        }

        return $ChangelogTypes
    }

    [array]getChangelog($project, $version, $numsections, $stringver, $listonly, $in, $out, $targetloc, $npmpkg, $nugetpkg, $mantisRelease, $mantisUrl, $historyFileHref, $emailHrefs, $vcWebPath, $includeEmailHdr, $isAp)
    {
        $szInputFile = $in;
        $szNumSections = $numsections;
        #
        # Make sure user entered correct cmd line params
        #
        if (!(Test-Path $szInputFile) -or [string]::IsNullOrEmpty($szInputFile)) {
            LogMessage "Error: No changelog file specified" "red"
            exit 160;
        }

        if ([string]::IsNullOrEmpty($stringver)) {
            $stringver = "Version"
        }

        #
        # convert number of sections to int
        #
        try {
            $iNumSections = [int32]::Parse($szNumSections);
        }
        catch {
            LogMessage "   Parse Error - Invalid NumSections parameter" "red"
            LogMessage "   Error type  : $_.Exception.GetType().FullName" "red"
            LogMessage "   Error code  : $($_.Exception.ErrorCode)" "red"
            LogMessage "   Error text  : $($_.Exception.Message)" "red"
            exit 161;
        }

        LogMessage "Extract from changelog markdown file"
        LogMessage "   Input File         : '$szInputFile'"
        LogMessage "   Num Sections       : '$iNumSections'"
        LogMessage "   Version            : '$version'"
        LogMessage "   Version string     : '$stringver'"
        LogMessage "   List only          : '$listonly'"
        LogMessage "   Target Location    : '$targetloc'"
        LogMessage "   NPM                : '$npmpkg'"
        LogMessage "   Nuget              : '$nugetpkg'"
        LogMessage "   MantisBT release   : '$mantisRelease'"
        LogMessage "   MantisBT url       : '$mantisUrl'"
        LogMessage "   History file href  : '$historyFileHref'"
        LogMessage "   Email hrefs        : '$emailHrefs'"
        LogMessage "   Vc web path        : '$vcWebPath'"
        LogMessage "   Include email hdr  : '$includeEmailHdr'"
        LogMessage "   Is app-publisher   : '$isAp'"

        #
        # Code operation:
        #
        # Open the file
        #
        # Find the following string structure for the last entry:
        #
        #    ## Version 1.5.14 (June 27th, 2019)
        #
        #    ### Subject line....
        #
        #    - commit message 1
        #    - commit message 2
        #
        #    ### Subject 2 line...
        #
        #    - commit message 3
        #

        #
        # Extract the specified version entry, which in changelog convention should be at top of file
        #

        #
        # Read in contents of file
        #
        $szContents = Get-Content $szInputFile | Out-String

        #
        # Initialize parsing variables
        #
        $iIndex1 = 0
        $iIndex2 = 0

        $iIndex1 = $szContents.IndexOf("## $stringver $version")
        if ($iIndex1 -eq -1) {
            LogMessage "   Section could not be found, exit" "red"
            exit 165
        }
        $iIndex2 = $szContents.IndexOf("## $stringver ", $iIndex1 + 1)
        if ($iIndex2 -eq -1) {
            $iIndex2 = $szContents.Length
        }
        LogMessage "   Found version section(s)"
        $szContents = $szContents.Substring($iIndex1, $iIndex2 - $iIndex1)

        if ($listonly -is [system.string] -and $listonly -eq 'parts') 
        {
            LogMessage "Determining changelog parts"

            $TextInfo = (Get-Culture).TextInfo
            $typeParts = @()
            $msgParts = @()

            $szContents = $szContents.Replace("`r`n", "<br>")
            $szContents = $szContents.Replace("`n", "<br>")
            $szContents = $szContents.Replace("`t", "&nbsp;&nbsp;&nbsp;&nbsp;")

            $typeParts = $this.getChangelogTypes($szContents)
            if ($typeParts -eq $null -or $typeParts.Length -eq 0) {
                return @( "error" )
            }

            $match = [Regex]::Match($szContents, "\w*(?<=^|>)(- ){1}.+?(?=(<br>-|<br>##|$))");
            while ($match.Success) {
                $value = $match.Value.Substring(2)
                $value = $value.Replace("<br>&nbsp;&nbsp;&nbsp;&nbsp;[", "<br>[") # ticket tags
                if ($value.StartsWith("<br>")) {
                    $value = $value.Substring(4);
                }
                if ($value.EndsWith("<br>")) {
                    $value = $value.Substring(0, $value.Length - 4)
                }
                $msgParts += $value.Trim()
                $match = $match.NextMatch()
            }

            $szContents = @()

            if ($msgParts.Length -ne $typeParts.Length) {
                LogMessage "Error parsing changelog for commit parts" "red"
                LogMessage "Message parts array length $($msgParts.Length) is less than types array length $($typeParts.Length)" "red"
                return @( "error" )
            }

            for ($i = 0; $i -lt $typeParts.Length; $i++)
            {
                $scope = ""
                $tickets = ""
                $subject = $typeParts[$i]
                $message = $msgParts[$i];
                if ($msgParts[$i].Contains(":")) {
                    $scope = $msgParts[$i].Substring(0, $msgParts[$i].IndexOf(":")).Replace("**", "").Trim()
                    $message = $msgParts[$i].Substring($msgParts[$i].IndexOf(":") + 1).Replace("**", "").Trim()
                }
                $match = [Regex]::Match($msgParts[$i], "\[(&nbsp;| )*(bugs?|issues?|closed?s?|fixe?d?s?|resolved?s?|refs?|references?){1}(&nbsp;| )*#[0-9]+((&nbsp;| )*,(&nbsp;| )*#[0-9]+){0,}(&nbsp;| )*\]", [Text.RegularExpressions.RegexOptions]::IgnoreCase);
                while ($match.Success) {
                    $tickets = $match.Value
                    $tickets = $match.Value.Replace("[", "").Replace("]", "").Trim()
                    $tickets = $TextInfo.ToTitleCase($tickets.Replace("&nbsp;", " "))
                    $message = $message.Replace("<br><br>" + $match.Value, "")
                    $message = $message.Replace("<br>" + $match.Value, "").Trim()
                    $message = $message.Replace("&nbsp;&nbsp;&nbsp;&nbsp;" + $match.Value, "").Trim()
                    $message = $message.Replace("&nbsp;&nbsp;&nbsp;" + $match.Value, "").Trim()
                    $message = $message.Replace("&nbsp;&nbsp;" + $match.Value, "").Trim()
                    $message = $message.Replace("&nbsp;" + $match.Value, "").Trim()
                    $message = $message.Replace(" " + $match.Value, "").Trim()
                    $message = $message.Replace($match.Value, "").Trim()
                    $match = $match.NextMatch()
                }
                $obj = @{
                    "subject" = $subject
                    "scope" = $scope
                    "message" = $message
                    "tickets" = $tickets
                }
                $szContents += $obj
            }

            return $szContents
        }

        #
        # Convert to html
        #
        $szContents = $szContents.Replace("`r`n", "`n")
        New-Item -ItemType "file" -Force -Path "${Env:Temp}\changelog.md" -Value "$szContents" | Out-Null
        if (!$isAp) {
            $szContents = & app-publisher-marked --breaks --gfm --file "${Env:Temp}\changelog.md"
        }
        else {
            $szContents = & marked --breaks --gfm --file "${Env:Temp}\changelog.md"
        }
        CheckExitCode
        Remove-Item -Path "${Env:Temp}\changelog.md"

        if ($includeEmailHdr -eq $true)
        {
            $szHrefs = $this.getEmailHeader($project, $version, $stringver, $targetloc, $npmpkg, $nugetpkg, $mantisRelease, $mantisUrl, $historyFileHref, $emailHrefs, $vcWebPath)
            $szContents = $szHrefs + $szContents
        }

        LogMessage "   Successful" "darkgreen"

        return @($szContents)
    }

    [array]getHistory($project, $version, $numsections, $stringver, $listonly, $in, $out, $targetloc, $npmpkg, $nugetpkg, $mantisRelease, $mantisUrl, $historyFileHref, $emailHrefs, $vcWebPath)
    {
        $szInputFile = $in;
        $szOutputFile = $out;
        $szNumSections = $numsections;
        $iNumberOfDashesInVersionLine = 20;
        $szFinalContents = ""
        #
        # Make sure user entered correct cmd line params
        #
        if (!(Test-Path $szInputFile) -or [string]::IsNullOrEmpty($szInputFile)) {
            LogMessage "History file does not exist" "red"
            return $szFinalContents;
        }

        if ([string]::IsNullOrEmpty($stringver)) {
            $stringver = "Version"
        }

        if ($szOutputFile -eq $null) {
            $szOutputFile = "";
        }

        #
        # convert number of sections to int
        #
        try {
            $iNumSections = [int32]::Parse($szNumSections);
        }
        catch {
            LogMessage "   Parse Error - Invalid NumSections parameter" "red"
            LogMessage "   Error type  : $_.Exception.GetType().FullName" "red"
            LogMessage "   Error code  : $($_.Exception.ErrorCode)" "red"
            LogMessage "   Error text  : $($_.Exception.Message)" "red"
            exit 161;
        }

        LogMessage "Extract from history.txt file"
        LogMessage "   Input File         : '$szInputFile'"
        LogMessage "   Output File        : '$szOutputFile'"
        LogMessage "   Num Sections       : '$iNumSections'"
        LogMessage "   Version            : '$version'"
        LogMessage "   Version string     : '$stringver'"       
        LogMessage "   List only          : '$listonly'"
        LogMessage "   Target Location    : '$targetloc'"
        LogMessage "   NPM                : '$npmpkg'"
        LogMessage "   Nuget              : '$nugetpkg'"
        LogMessage "   MantisBT release   : '$mantisRelease'"
        LogMessage "   MantisBT url       : '$mantisUrl'"
        LogMessage "   History file href  : '$historyFileHref'"
        LogMessage "   Email hrefs        : '$emailHrefs'"
        LogMessage "   Vc web path        : '$vcWebPath'"

        #
        # Code operation:
        #
        # Open the file
        #
        # Find the following string structure for the last entry:
        #
        #    Build 101
        #    April 3rd, 2015
        #    ---------------------------------------------------------------------------
        #
        # Extract the latest entry
        #

        $szContents = "";
        #
        # Read in contents of file
        #
        $szContents = Get-Content $szInputFile | Out-String
        #
        # Initialize parsing variables
        #
        $iIndex1 = $szContents.Length
        $iIndex2 = 0
        $bFoundStart = 0
        $iSectionsFound = 0
        #
        # Loop to find our search text
        #
        while ($iIndex1 -ge 0)
        {
            # Get index of field name
            #
            $iIndex1 = $szContents.LastIndexOf("$stringver ", $iIndex1)
            #
            # make sure the field name was found
            #
            if ($iIndex1 -eq -1)
            {
                LogMessage "   Last section could not be found (0), exit" "red"
                exit 162
            }
            
            if ($szContents[$iIndex1 - 1] -ne "`n")
            {
                $iIndex1--
                continue
            }
            #
            # Check to make sure this is the beginning line, if it is then 2 lines underneath
            # will be a dashed line consisting of $NumberOfDashesInVersionLine dash characters
            #
            $iIndex2 = $szContents.IndexOf("`n", $iIndex1)
            # make sure the newline was found
            if ($iIndex2 -eq -1)
            {
                LogMessage "   Last section could not be found (1), exit" "red"
                exit 163
            }

            $iIndex2 = $szContents.IndexOf("`n", $iIndex2 + 1)
            #
            # Make sure the newline was found
            #
            if ($iIndex2 -eq -1)
            {
                LogMessage "   Last section could not be found (2), exit" "red"
                exit 164
            }
            
            #
            # Increment index2 past new line and on to 1st ch in next line
            #
            $iIndex2++;
            # Now $iIndex2 should be the index to the start of a dashed line
    
            $numdashes = 0
            for ($numdashes = 0; $numdashes -lt $iNumberOfDashesInVersionLine; $numdashes++) {
                if ($szContents[$iIndex2 + $numdashes] -ne '-') {
                    break
                }
            }
            #
            # Make sure we found our dashed line
            #
            if ($numdashes -eq $iNumberOfDashesInVersionLine) {
                $bFoundStart = 1
                $iSectionsFound++
                if ($iSectionsFound -ge $iNumSections) {
                    break
                }
            }
            #
            # Decrement $iIndex1, which is the index to the start of the string "Build ", but
            # this could have occurred in the body of the text, keep searching
            #
            $iIndex1--
        }
        #
        # Make sure we found our starting point  
        #
        if ($bFoundStart -eq 0)
        {
            LogMessage "   Last section could not be found, exit" "red"
            exit 165
        }

        LogMessage "   Found version section"
        $szContents = $szContents.Substring($iIndex1)

        #
        # Replace special chars
        #
        $szContents = $szContents.Replace("&", "&amp;")
        # Replace '<' and '>' with 'lt;' and 'gt;'
        $szContents = $szContents.Replace("<", "&lt;")
        $szContents = $szContents.Replace(">", "&gt;")
        # Replace spaces with &nbsp;
        $szContents = $szContents.Replace(" ", "&nbsp;")
        $szContents = $szContents.Replace("`r`n", "<br>")
        #
        # Style the contents to monospace font
        #
        $szContents = "<font face=`"Courier New`">" + $szContents + "</font>"

        # $iIndex1 is our start index
        # if version is empty, then the script is to return the version
        if ($version -ne "" -and $version -ne $null)
        {
            LogMessage "   Write header text to message"
            
            $szHrefs = $this.getEmailHeader($project, $version, $stringver, $targetloc, $npmpkg, $nugetpkg, $mantisRelease, $mantisUrl, $historyFileHref, $emailHrefs, $vcWebPath)

            $szFinalContents += "$szHrefs<br>Most Recent History File Entry:<br><br>";
            LogMessage "   Write $iNumSections history section(s) to message"

            if ($listonly -eq $false) {
                $szFinalContents += $szContents
            }
            else
            {   
                $hDelimiter = "**********"
                $iIndex1 = $szContents.IndexOf("**********")
                if ($iIndex1 -eq -1)
                {
                    $hDelimiter = "----------"
                }
                $iIndex1 = $szContents.IndexOf($hDelimiter)
                while ($iIndex1 -ne -1)
                {
                    $iIndex2 = $szContents.IndexOf("<br>", $iIndex1)
                    $iIndex1 = $szContents.IndexOf($hDelimiter, $iIndex2)
                }
                $szContents = $szContents.Substring($iIndex2 + 4)
                while ($szContents.StartsWith("<br>")) {
                    $szContents = $szContents.Substring(4)
                }
                if ($szContents.EndsWith("</font>")) {
                    $szContents = $szContents.Substring(0, $szContents.Length - 7)
                }
                while ($szContents.EndsWith("<br>")) {
                    $szContents = $szContents.Substring(0, $szContents.Length - 4)
                }

                # the history file is written with a max line char count, remove all line breaks in running text
                # for better display in web browser (and less vertical space)
                #[Match] $match = [Regex]::Match($szContents, "[a-zA-z0-9_.,;\/|`"']<br>(&nbsp;){4}[a-zA-z0-9_.,;\/|`"']");
                #while ($match.Success) {
                #    $szContents = $szContents.Replace($match.Value, $match.Value.Replace("<br>&nbsp;&nbsp;&nbsp;", "")); #leave a space
                #    $match = $match.NextMatch()
                #}
                [Match] $match = [Regex]::Match($szContents, "[a-zA-z0-9_\/|`"'][,.:]*(&nbsp;){0,1}<br>(&nbsp;){4}[a-zA-z0-9_\/|`"']");
                while ($match.Success) {
                    $szContents = $szContents.Replace($match.Value, $match.Value.Replace("<br>&nbsp;&nbsp;&nbsp;", "")); #leave a space
                    $match = $match.NextMatch()
                }
                #[Match] $match = [Regex]::Match($szContents, "[a-zA-z0-9_\/|`"'][,.:]*(&nbsp;){0,1}<br>(&nbsp;){4,}[a-zA-z0-9_\/|`"']");
                #while ($match.Success) {
                #    $szContents = $szContents.Replace($match.Value, $match.Value.Replace("<br>&nbsp;&nbsp;&nbsp;&nbsp;", "<br>"));
                #    $match = $match.NextMatch()
                #}

                # break up &nbsp;s
                $match = [Regex]::Match($szContents, "(&nbsp;)(\w|'|`")");
                while ($match.Success) {
                    $szContents = $szContents.Replace($match.Value, $match.Value.Replace("&nbsp;", " "));
                    $match = $match.NextMatch()
                }

                # Bold all numbered lines with a subject
                #$match = [Regex]::Match($szContents, "\w*(?<!&nbsp;)[1-9][0-9]{0,1}\.(&nbsp;| ).+?(?=<br>)   \w*(?<=^|>)[1-9][0-9]{0,1}\.(&nbsp;| ).+?(?=<br>)");
                $match = [Regex]::Match($szContents, "\w*(?<=^|>)[1-9][0-9]{0,1}(&nbsp;| ){0,1}\.(&nbsp;| ).+?(?=<br>)");
                while ($match.Success) {
                    $value = $match.Value;
                    if ($this.containsValidSubject($value)) {
                        $szContents = $szContents.Replace($value, "<b>$value</b>");
                    }
                    $match = $match.NextMatch()
                }

                if ($listonly -is [system.string] -and $listonly -eq 'parts')
                {
                    LogMessage "   Extracting parts"

                    $TextInfo = (Get-Culture).TextInfo
                    $typeParts = @()
                    $msgParts = @()

                    #
                    # Process entries with a subject (sorrounded by <b></b>)
                    #
                    $match = [Regex]::Match($szContents, "<b>\w*(?<=^|>)[1-9][0-9]{0,1}(&nbsp;){0,1}\.(&nbsp;| ).+?(?=<br>|<\/font>)");
                    while ($match.Success) {
                        $value = $match.Value.Replace("&nbsp;", "").Replace(".", "").Replace("<b>", "").Replace("</b>", "")
                        for ($i = 0; $i -lt 10; $i++) {
                            $value = $value.Replace($i, "").Trim()
                        }
                        $typeParts += $value
                        $match = $match.NextMatch()
                    }
                    
                    $szContents = $szContents.Replace("<br>&nbsp;&nbsp;&nbsp;&nbsp;<br>", "<br><br>")
                    $szContents = $szContents.Replace("<br>&nbsp;&nbsp;&nbsp;<br>", "<br><br>")
                    $match = [Regex]::Match($szContents, "(<\/b>){1}(<br>){0,1}(<br>){1}(&nbsp;){2,}[ ]{1}.+?(?=<br>(&nbsp;| ){0,}<br>(<b>|[1-9][0-9]{0,1}\.(&nbsp;| ))|$)");

                    while ($match.Success) 
                    {
                        $value = $match.Value.Replace("</b>", "")
                        $value = $value.Replace("<br>&nbsp;&nbsp;&nbsp;&nbsp;[", "<br>[") # ticket tags
                        $value = $value.Replace("<br>&nbsp;&nbsp;&nbsp; ", "<br>")

                        if ($this.containsValidSubject($typeParts[$msgParts.Length])) 
                        {
                            while ($value.StartsWith("<br>")) {
                                $value = $value.Substring(4);
                            }
                            while ($value.EndsWith("<br>")) {
                                $value = $value.Substring(0, $value.Length - 4)
                            }
                        }
                        $msgParts += $value.Trim()
                        $match = $match.NextMatch()
                    }

                    #
                    # Non-subject entries (no <b></b> wrap)
                    #
                    $match = [Regex]::Match($szContents, "\w*(?<!<b>)(\b[1-9][0-9]{0,1}(&nbsp;){0,1}\.(&nbsp;| ).+?(?=<br>[1-9]|$|<br><b>))");
                    while ($match.Success) {
                        $typeParts += ""
                        $match = $match.NextMatch()
                    }
                    
                    $match = [Regex]::Match($szContents, "\w*(?<!<b>)(\b[1-9][0-9]{0,1}(&nbsp;){0,1}\.(&nbsp;| ).+?(?=<br>[1-9]|$|<br><b>))");

                    while ($match.Success) 
                    {
                        $value = $match.Value.Replace("&nbsp;", "").Replace(".", "").Replace("<b>", "").Replace("</b>", "")
                        for ($i = 0; $i -lt 10; $i++) {
                            $value = $value.Replace($i, "").Trim()
                        }
                        while ($value.StartsWith("<br>")) {
                            $value = $value.Substring(4);
                        }
                        while ($value.EndsWith("<br>")) {
                            $value = $value.Substring(0, $value.Length - 4)
                        }
                        $msgParts += $value.Trim()
                        $match = $match.NextMatch()
                    }

                    $szContents = @()
                    for ($i = 0; $i -lt $typeParts.Length; $i++)
                    {
                        $scope = ""
                        $tickets = ""
                        $subject = $typeParts[$i]
                        $message = $msgParts[$i];
                        if ($this.containsValidSubject($subject)) {
                            if ($typeParts[$i].Contains(":")) {
                                $subject = $typeParts[$i].Substring(0, $typeParts[$i].IndexOf(":")).Trim()
                                $scope = $typeParts[$i].Substring($typeParts[$i].IndexOf(":") + 1).Trim()
                            }
                        }
                        else {
                            $subject = "Miscellaneous"
                            if ($typeParts[$i].Contains(":")) {
                                $scope = $typeParts[$i].Substring(0, $typeParts[$i].IndexOf(":")).Trim()
                                $message = $typeParts[$i].Substring($typeParts[$i].IndexOf(":") + 1) + $msgParts[$i];
                            }
                            elseif ([string]::IsNullOrEmpty($typeParts[$i])) {
                                $message = $msgParts[$i];
                            }
                            else {
                                $message = $typeParts[$i] + $msgParts[$i];
                            }
                        }                                               
                        $match = [Regex]::Match($msgParts[$i], "\[(&nbsp;| )*(bugs?|issues?|closed?s?|fixe?d?s?|resolved?s?|refs?|references?){1}(&nbsp;| )*#[0-9]+((&nbsp;| )*,(&nbsp;| )*#[0-9]+){0,}(&nbsp;| )*\]", [Text.RegularExpressions.RegexOptions]::IgnoreCase);
                        #$match = [Regex]::Match($msgParts[$i], "\[(&nbsp;| )*(?:bugs?|issues?|refs?|references?|reports|fixe?d?s?|closed?s?|resolved?s?)+\s*:?\s+(?:#(?:\d+)[,\.\s]*)+]");
                        while ($match.Success) {
                            $tickets = $match.Value
                            $tickets = $match.Value.Replace("[", "").Replace("]", "").Trim()
                            $tickets = $TextInfo.ToTitleCase($tickets.Replace("&nbsp;", " "))
                            $message = $message.Replace("<br><br>" + $match.Value, "")
                            $message = $message.Replace("<br>" + $match.Value, "").Trim()
                            $message = $message.Replace("&nbsp;&nbsp;" + $match.Value, "").Trim()
                            $message = $message.Replace("&nbsp;" + $match.Value, "").Trim()
                            $message = $message.Replace(" " + $match.Value, "").Trim()
                            $message = $message.Replace($match.Value, "").Trim()
                            $match = $match.NextMatch()
                        }
                        $obj = @{
                            "subject" = $subject
                            "scope" = $scope
                            "message" = $message
                            "tickets" = $tickets
                        }
                        $szContents += $obj
                    }
                }

               return $szContents
            }

            #
            # Reverse versions, display newest at top if more than 1 section
            #
            if ($iNumSections -gt 1)
            {   
                LogMessage "   Re-ordering $iNumSections sections newest to oldest"

                $sections = @()
                
                $iIndex2 = $szContents.IndexOf(">$stringver&nbsp;", 0) + 1
                for ($i = 0; $i -lt $iNumSections; $i++)
                {
                    $iIndex1 = $iIndex2
                    $iIndex2 = $szContents.IndexOf(">$stringver&nbsp;", $iIndex1 + 1) + 1
                    if ($iIndex2 -eq 0)
                    {
                        $iIndex2  = $szContents.IndexOf("</font>")
                    }
                    $sections += $szContents.Substring($iIndex1, $iIndex2 - $iIndex1);
                }  
                $szContents = "";  
                for ($i = $iNumSections - 1; $i -ge 0; $i--)
                {
                    $szContents += $sections[$i];
                    if ($szContents.Substring($szContents.Length - 12) -ne "<br><br><br>")
                    {
                        $szContents += "<br>"
                    }
                }
                $szFinalContents = "<font face=`"Courier New`" style=`"font-size:12px`">" + $szContents + "</font>"
            }
        }

        #
        # If version is empty, then this is a request for the latest version #.  Return version and exit
        #
        if ($version -eq "" -or $version -eq $null) 
        {
            #return latest version #
            $iIndex1 = $szContents.IndexOf(">$stringver&nbsp;", 0) + $stringver.Length + 7
            $iIndex2 = $szContents.IndexOf("<br>", $iIndex1)
            $curversion = $szContents.Substring($iIndex1, $iIndex2 - $iIndex1)
            LogMessage "   Found version $curversion"
            return $curversion
        }

        if ($szOutputFile -ne "" -and $szOutputFile -ne $null) {
            New-Item -ItemType "file" -Force -Path "$szOutputFile" -Value $szFinalContents | Out-Null
            LogMessage "   Saved release history output to $szOutputFile"
        }

        LogMessage "   Successful" "darkgreen"

        return @($szFinalContents)
    }
}

#endregion

#
# Define class instances
#
$ClsCommitAnalyzer = New-Object -TypeName CommitAnalyzer
$ClsHistoryFile = New-Object -TypeName HistoryFile
$ClsVc = New-Object -TypeName Vc
#
# Global var for holding the tag found that is the version tag for a Maven project
#
$MavenVersionTag = "version"


#************************************************************************#

#####  #   #  #   #  #####  #####  ###  #####  #   #  #####
#      #   #  ##  #  #        #     #   #   #  ##  #  #    
####   #   #  # # #  #        #     #   #   #  # # #  #####
#      #   #  #  ##  #        #     #   #   #  #  ##      #
#      #####  #   #  #####    #    ###  #####  #   #  #####

#************************************************************************#

#region Functions

function LogMessage($msg, $color, $noTag = $false)
{
    $msgTag = ""

    if ([string]::IsNullOrEmpty($msg)) {
        return
    }

    if (!$TASKMODESTDOUT -or $color -eq "red")
    {
        if ($color) 
        {
            $msgTag = ""
            switch ($color) 
            {
                "red" { $msgTag = "[ERROR]"; break; }
                "darkyellow" { $msgTag = "[WARNING]"; break; }
                "darkgreen" { $msgTag = "[SUCCESS]"; break; }
                "magenta" { $msgTag = "[NOTICE]"; break; }
                default: { break; }
            }
            if ($msgTag -ne "") {
                write-host -ForegroundColor $color "$msgTag $msg"
            }
            else {
                write-host -ForegroundColor $color $msg
            }
        }
        else {
            write-host $msg
        }
    }

    if ($WRITELOG -eq "Y") 
    {
         # Get current date time
        $CurrentDateTime = Get-Date -format "yyyy\/MM\/dd HH:mm:ss";
        # Construct complete message
        $FormattedMessage = "$CurrentDateTime $msgTag $msg";
        # Write the message to the file
        try {
            out-file -filepath $LogFileName -Append -inputobject $FormattedMessage  
        }
        catch {} 
    }
}

#
# Function to send the release notification email
#
# $targetloc is the unc or web path of the distribution (i.e. the softwareimages drive, the 
# npm server, or the nuget server)
#
function Send-Notification($targetloc, $npmloc, $nugetloc)
{
    #
    # Check to make sure all necessary parameters are set
    #
    if ([string]::IsNullOrEmpty($EMAILSERVER)) {
        LogMessage "   Notification could not be sent, invalid email server specified" "red"
        return
    }
    if ([string]::IsNullOrEmpty($EMAILRECIP)) {
        LogMessage "   Notification could not be sent, invalid recipient address specified" "red"
        return
    }
    if ([string]::IsNullOrEmpty($EMAILSENDER)) {
        LogMessage "   Notification could not be sent, invalid sender address specified" "red"
        return
    }

    # encoding="plain" (from ant)   ps cmd: -Encoding ASCII
    $EMAILBODY = ""
    if (![string]::IsNullOrEmpty($HISTORYFILE)) 
    {
        LogMessage "   Converting history text to html"
        $EMAILBODY = $ClsHistoryFile.getHistory($PROJECTNAME, $VERSION, 1, $VERSIONTEXT, $false, $HISTORYFILE, $null, $targetloc, $npmloc, $nugetloc, $MANTISBTRELEASE, $MANTISBTURL[0], $HISTORYHREF, $EMAILHREFS, $VCWEBPATH)
    }
    elseif (![string]::IsNullOrEmpty($CHANGELOGFILE)) 
    {
        LogMessage "   Converting changelog markdown to html"
        $EMAILBODY = $ClsHistoryFile.getChangelog($PROJECTNAME, $VERSION, 1, $VERSIONTEXT, $false, $CHANGELOGFILE, $null, $targetloc, $npmloc, $nugetloc, $MANTISBTRELEASE, $MANTISBTURL[0], $HISTORYHREF, $EMAILHREFS, $VCWEBPATH, $true, $IsAppPublisher)
    }
    else {
        LogMessage "   Notification could not be sent, history file not specified" "red"
        return
    }

    if ($EMAILBODY-eq $null -or $EMAILBODY.Length -eq 0 -or $EMAILBODY[0] -eq "error") {
        $EMAILBODY = "There was an error extracting the changelog, notify development"
    }
    else {
        $EMAILBODY = $EMAILBODY[0];
    }
    
    #
    # Attach app-publisher signature to body
    #
    $EMAILBODY += "<br><table><tr><td valign=`"middle`"><font style=`"font-size:12px;font-weight:bold`">";
    $EMAILBODY += "This automated email notification was generated and sent by </font></td><td>";
    $EMAILBODY += "<img src=`"https://app1.spmeesseman.com/res/img/app/app-publisher.png`" height=`"16`">"
    $EMAILBODY += "</td><td valign=`"middle`"><font style=`"color:#0000AA;font-size:12px;font-weight:bold`">"
    $EMAILBODY += "<i>app-publisher</i></font></td></tr><tr><td valign=`"middle`" colspan=`"3`">"
    $EMAILBODY += "<font style=`"font-size:10px;font-weight:bold`">Do not respond to this email message</font></td></tr></table>";

    LogMessage "Sending release notification email"
    try 
    {
        $ProjectNameFmt = $PROJECTNAME.Replace("-", " ")
        #
        # If all lower case project name, then title case the project name
        #
        if ($ProjectNameFmt -cmatch "^[a-z]*$")
        {
            $TextInfo = (Get-Culture).TextInfo
            $ProjectNameFmt = $TextInfo.ToTitleCase($ProjectNameFmt)
        }
        $Subject = "$ProjectNameFmt $VERSIONTEXT $VERSION"
        if ($DRYRUN -eq $false) 
        {
            if ($EMAILRECIP.Length -gt 0) 
            {
                if ($EMAILMODE -eq "ssl" -or $EMAILMODE -eq "tls") {
                    Send-MailMessage -SmtpServer $EMAILSERVER -BodyAsHtml -From $EMAILSENDER -To $EMAILRECIP -Subject $Subject -Body $EMAILBODY -Port $EMAILPORT -UseSsl
                }
                else {
                    Send-MailMessage -SmtpServer $EMAILSERVER -BodyAsHtml -From $EMAILSENDER -To $EMAILRECIP -Subject $Subject -Body $EMAILBODY -Port $EMAILPORT
                }
                CheckPsCmdSuccess
            }
            else {
                if ($TESTEMAILRECIP.Length -gt 0) 
                {
                    LogMessage "   Notification could not be sent to email recip, sending to test recip" "darkyellow"
                    if ($EMAILMODE -eq "ssl" -or $EMAILMODE -eq "tls") {
                        Send-MailMessage -SmtpServer $EMAILSERVER -BodyAsHtml -From $EMAILSENDER -To $TESTEMAILRECIP -Subject $Subject -Body $EMAILBODY -Port $EMAILPORT -UseSsl
                    }
                    else {
                        Send-MailMessage -SmtpServer $EMAILSERVER -BodyAsHtml -From $EMAILSENDER -To $TESTEMAILRECIP -Subject $Subject -Body $EMAILBODY -Port $EMAILPORT
                    }
                    CheckPsCmdSuccess
                }
                else {
                    LogMessage "   Notification could not be sent, invalid email address specified" "red"
                }
            }
        }
        else {
            $EMAILBODY = "<br><b>THIS IS A DRY RUN RELEASE, PLEASE IGNORE</b><br><br>" + $EMAILBODY
            $Subject = "[DRY RUN] " + $Subject
            if ($TESTEMAILRECIP.Length -gt 0) 
            {
                if ($EMAILMODE -eq "ssl" -or $EMAILMODE -eq "tls") {
                    Send-MailMessage -SmtpServer $EMAILSERVER -BodyAsHtml -From $EMAILSENDER -To $TESTEMAILRECIP -Subject $Subject -Body $EMAILBODY -Port $EMAILPORT -UseSsl
                }
                else {
                    Send-MailMessage -SmtpServer $EMAILSERVER -BodyAsHtml -From $EMAILSENDER -To $TESTEMAILRECIP -Subject $Subject -Body $EMAILBODY -Port $EMAILPORT
                }
                CheckPsCmdSuccess
            }
            else {
                LogMessage "   Notification could not be sent, invalid email address specified" "red"
            }
        }
    }
    catch {
        LogMessage "   Delivery failure" "red"
    }
}

#
# Function to check spelling in text
#
function CheckSpelling($String, $RemoveSpecialChars)
{
    $OutString = $String

    LogMessage "Perform spelling check"

    if ($RemoveSpecialChars) { 
        $String = Clean-String $String	
    }
    
    foreach ($S in $String)
    {
        $SplatInput = @{
            Uri= "https://api.projectoxford.ai/text/v1.0/spellcheck?Proof"
            Method = 'Post'
        }

        $Headers = @{'Ocp-Apim-Subscription-Key' = "XXXXXXXXXXXXXXXXXXXXXXXXXX"}
        $body = @{'text'=$s	}
        
        try
        {
            $SpellingErrors = (Invoke-RestMethod @SplatInput -Headers $Headers -Body $body ).SpellingErrors
            #
            if ($SpellingErrors)  # If Errors are Found
            {
                # Nested foreach to generate the Rectified string Post Spell-Check
                #
                foreach ($E in $spellingErrors)
                {
                    #
                    # If an unknown word identified, replace it with the respective sugeestion from the API results
                    #
                    if ($E.Type -eq 'UnknownToken') 
                    {
                        $OutString = foreach($s in $E.suggestions.token) {
                            $OutString -replace $E.token, $s
                        }
                    }
                    else { # If REPEATED WORDS then replace the set by an instance of repetition
                        $OutString = $OutString -replace "$($E.token) $($E.token) ", "$($E.token) "
                    }
                }
            }
            else { 
                #
                # No error was found in the input string	
                #
            }
            LogMessage "   Success" "darkgreen"
        }
        catch{
            LogMessage "   Failure" "red"
        }
    }

    return $OutString;
}


#
# Function to Remove special character s and punctuations from Input string
#
function Clean-String($Str)
{
    Foreach($Char in [Char[]]"!@#$%^&*(){}|\/?><,.][+=-_"){$str=$str.replace("$Char",'')}
    Return $str
}

function VcChangelistAddRemove($VcFile)
{
    if ($PATHPREROOT -ne "" -and $PATHPREROOT -ne $null) {
        $VcFile = Join-Path -Path "$PATHPREROOT" -ChildPath "$VcFile"
    }
    if (!$script:VCCHANGELISTRMV.Contains($VcFile)) {
        LogMessage "Adding $VcFile to failure/testrun vc removelist"
        $script:VCCHANGELISTRMV = "$script:VCCHANGELISTRMV|`"$VcFile`""
    }
}

function VcChangelistAdd($VcFile)
{
    if ($PATHPREROOT -ne "" -and $PATHPREROOT -ne $null) {
        $VcFile = Join-Path -Path "$PATHPREROOT" -ChildPath "$VcFile"
    }
    if (!$script:VCCHANGELIST.Contains($VcFile)) {
        LogMessage "Adding $VcFile to vc changelist"
        $script:VCCHANGELIST = "$script:VCCHANGELIST|`"$VcFile`""
    }
}

function VcChangelistAddMulti($VcFile)
{
    if ($PATHPREROOT -ne "" -and $PATHPREROOT -ne $null) {
        $VcFile = Join-Path -Path "$PATHPREROOT" -ChildPath "$VcFile"
    }
    if (!$script:VCCHANGELISTMLT.Contains($VcFile)) {
        LogMessage "Adding $VcFile to multi-publish vc changelist"
        $script:VCCHANGELISTMLT = "$script:VCCHANGELISTMLT|`"$VcFile`""
    }
}

function VcChangelistAddNew($VcFile, $isFullPath = $false)
{
    if ($PATHPREROOT -ne "" -and $PATHPREROOT -ne $null -and $isFullPath -eq $false) {
        $VcFile = Join-Path -Path "$PATHPREROOT" -ChildPath "$VcFile"
    }
    if (!$script:VCCHANGELISTADD.Contains($VcFile)) {
        LogMessage "Adding $VcFile to vc 'add' changelist"
        $script:VCCHANGELISTADD = "$script:VCCHANGELISTADD|`"$VcFile`""
    }
}

function VcIsVersioned($ObjectPath, $AppendPre = $false, $ChangePath = $false)
{
    $IsVersioned = $false
    $VcFile = $ObjectPath

    if ($AppendPre -and ![string]::IsNullOrEmpty($PATHPREROOT)) {
        $VcFile = Join-Path -Path "$PATHPREROOT" -ChildPath "$ObjectPath"
    }

    if ($ChangePath -and ![string]::IsNullOrEmpty($PATHTOMAINROOT) -and $PATHTOMAINROOT -ne ".") {
        set-location $PATHTOMAINROOT
    }
    if ($_RepoType -eq "svn") {
        $svnUser = $Env:SVN_AUTHOR_NAME
        $svnToken = $Env:SVN_TOKEN
        if (![string]::IsNullOrEmpty($svnUser) -and ![string]::IsNullOrEmpty($svnToken)) {
            $tmp = & svn info "$VcFile" --non-interactive --no-auth-cache --username "$svnUser" --password "$svnToken"
        }
        else {
            $tmp = & svn info "$VcFile" --non-interactive
        }
    }
    else {
        $tmp = & git ls-files --error-unmatch "$VcFile"
    }
    if ($LASTEXITCODE -eq 0) {
        $IsVersioned = $true
    }
    #
    # Change directory back to project root
    # PATHTOPREROOT will be defined if PATHTOMAINROOT is
    #
    if ($ChangePath -and ![string]::IsNullOrEmpty($PATHTOMAINROOT) -and $PATHTOMAINROOT -ne ".") { 
        set-location $PATHPREROOT
    }

    return $IsVersioned
}

function VcRevert($ChangePath = $false)
{
    if (![string]::IsNullOrEmpty($VCCHANGELIST)) 
    {
        LogMessage "Removing new files / reverting touched files under version control"
        LogMessage "Stored Commit List: $VCCHANGELIST"
        LogMessage "Stored Add List   : $VCCHANGELISTADD"
        LogMessage "Stored Remove List: $VCCHANGELISTRMV"

        #
        # Back up copies of history/changelog just in case user made edits and they are about
        # to be lost because of a publish run error
        #
        if (![string]::IsNullOrEmpty($HISTORYFILE) -and (Test-Path($HISTORYFILE)))
        {
            $TmpFile = "${Env:Temp}\history.save.txt"
            LogMessage "Saving temporary copy of history file to $TmpFile" "magenta"
            Copy-Item -Path "$HISTORYFILE" -PassThru -Force -Destination "$TmpFile" | Out-Null
        }

        if (![string]::IsNullOrEmpty($CHANGELOGFILE) -and (Test-Path($CHANGELOGFILE)))
        {
            $TmpFile = "${Env:Temp}\changelog.save.md"
            LogMessage "Saving temporary copy of history file to $TmpFile" "magenta"
            Copy-Item -Path "$CHANGELOGFILE" -PassThru -Force -Destination "$TmpFile" | Out-Null
        }

        #
        # Change dir to project root, all changelist entries will be in respect to the project root dir
        #
        if ($ChangePath -and ![string]::IsNullOrEmpty($PATHTOMAINROOT) -and $PATHTOMAINROOT -ne ".") {
            set-location $PATHTOMAINROOT
        }

        $VcRevertList = ""
        $VcRevertListParts = $VCCHANGELISTRMV.Trim().Split('|')

        for ($i = 0; $i -lt $VcRevertListParts.Length; $i++)
        {
            $VcRevertFile = $VcRevertListParts[$i].Replace("`"", "")
            if ($VcRevertFile -eq "") {
                continue;
            }
            if (Test-Path($VcRevertFile)) 
            {
                LogMessage "Deleting unversioned $($VcRevertListParts[$i]) from fs"
                Remove-Item -path $VcRevertListParts[$i].Replace("`"", "") -Recurse | Out-Null
                CheckPsCmdSuccess
            }
        }

        $VcRevertList = ""
        $VcRevertListParts = $VCCHANGELISTADD.Trim().Split('|')

        for ($i = 0; $i -lt $VcRevertListParts.Length; $i++)
        {
            $VcRevertFile = $VcRevertListParts[$i].Replace("`"", "")
            if ($VcRevertFile -eq "") {
                continue;
            }
            if ((Test-Path($VcRevertFile)))
            {
                LogMessage "Deleting unversioned $($VcRevertListParts[$i]) from fs"
                Remove-Item -path $VcRevertFile -Recurse | Out-Null
                CheckPsCmdSuccess
            }
        }

        $VcRevertList = ""
        $VcRevertListParts = $VCCHANGELIST.Trim().Split('|')

        if ($_RepoType -eq "svn")
        {
            for ($i = 0; $i -lt $VcRevertListParts.Length; $i++)
            {
                $VcRevertFile = $VcRevertListParts[$i].Replace("`"", "")
                if ($VcRevertFile -eq "") {
                    continue;
                }
                if (Test-Path($VcRevertFile))
                {
                    if (VcIsVersioned($VcRevertFile)) 
                    {
                        LogMessage " - Adding versioned $VcRevertFile to revert list"
                        $VcRevertList = "$VcRevertList $($VcRevertListParts[$i])"
                    }
                    else # delete unversioned file
                    {
                        LogMessage " - Deleting unversioned $VcRevertFile from fs"
                        Remove-Item -path "$VcRevertFile" -Recurse | Out-Null
                        CheckPsCmdSuccess
                    }
                }
            }
            if (![string]::IsNullOrEmpty($VcRevertList)) 
            {
                $VcRevertList = $VcRevertList.Trim()
                LogMessage "Versioned List:  $VcRevertList"
                $svnUser = $Env:SVN_AUTHOR_NAME
                $svnToken = $Env:SVN_TOKEN
                if (![string]::IsNullOrEmpty($svnUser) -and ![string]::IsNullOrEmpty($svnToken)) {
                    Invoke-Expression -Command "svn revert -R $VcRevertList --non-interactive --no-auth-cache --username $svnUser --password $svnToken"
                }
                else {
                    Invoke-Expression -Command "svn revert -R $VcRevertList --non-interactive"
                }
                CheckExitCode
            }
            else {
                LogMessage "0 versioned files to revert"
            }
        }
        elseif ($_RepoType -eq "git") 
        {
            for ($i = 0; $i -lt $VcRevertListParts.Length; $i++)
            {
                $VcRevertFile = $VcRevertListParts[$i].Replace("`"", "");
                if ($VcRevertFile -eq "") {
                    continue
                }
                if (Test-Path($VcRevertFile))
                {
                    if (VcIsVersioned($VcRevertFile)) {
                        LogMessage " - Adding versioned $VcRevertFile to revert list"
                        $VcRevertList = "$VcRevertList $($VcRevertListParts[$i])"
                    }
                    else 
                    {   # delete unversioned file
                        LogMessage "Deleting unversioned $VcRevertFile from fs"
                        Remove-Item -path "$VcRevertFile" -Recurse | Out-Null
                        CheckPsCmdSuccess
                    }
                }
            }
            if (![string]::IsNullOrEmpty($VcRevertList)) 
            {
                $VcRevertList = $VcRevertList.Trim()
                LogMessage "Versioned List:  $VcRevertList"
                Invoke-Expression -Command "git stash push -- $VcRevertList"
                CheckExitCode
                Invoke-Expression -Command "git stash drop"
                CheckExitCode
            }
            else {
                LogMessage "0 versioned files to revert"
            }
        }
        #
        # Change directory back to project root
        # PATHTOPREROOT will be defined if PATHTOMAINROOT is
        #
        if ($ChangePath -and ![string]::IsNullOrEmpty($PATHTOMAINROOT) -and $PATHTOMAINROOT -ne ".") { 
            set-location $PATHPREROOT
        }
    }
}

function CheckExitCode($ExitOnError = $false, $ChangePath = $true)
{
    $ECode = $LASTEXITCODE
    #
    # Check script error code, 0 is success
    #
    if ($ECode -eq 0) {
        LogMessage "Exit Code 0" "darkgreen"
    }
    else {
        LogMessage "Exit Code $ECode" "red"
        if ($ExitOnError -eq $true) {
            VcRevert $ChangePath
            exit $ECode
        }
    }
}

function CheckPsCmdSuccess($ExitOnError = $false, $ChangePath = $true)
{
    #
    # Check script error code, 0 is success
    #
    if ($? -eq $true) {
        LogMessage "Status True" "darkgreen"
    }
    else {
        LogMessage "Status False" "red"
        if ($ExitOnError -eq $true) {
            VcRevert $ChangePath
            exit 110
        }
    }
}

function ReplaceVersion($File, $Old, $New, $CaseSensitive = $false)
{
    LogMessage "Write new version $New, previously $Old, to $File"
    $Content = Get-Content -path $File -Raw
    CheckPsCmdSuccess
    $ContentNew = ""
    if ($CaseSensitive -eq $false) {
        $ContentNew = ((Get-Content -path $File -Raw) -replace "$Old", "$New");
    }
    else {
        $ContentNew = ((Get-Content -path $File -Raw) -creplace "$Old", "$New");
    }
    CheckPsCmdSuccess
    if ($Content -ne $ContentNew)
    {
        Set-Content -NoNewline -Path $File -Value $ContentNew
        CheckPsCmdSuccess
        [System.Threading.Thread]::Sleep(750)
    }
    return ($Content -ne $ContentNew)
}

function RunScripts($ScriptType, $Scripts, $ExitOnError, $RunInTestMode = $false)
{
    if ($Scripts.Length -gt 0 -and !$script:BuildCmdsRun.Contains($ScriptType))
    {
        # Run custom script
        #
        LogMessage "Running custom $ScriptType script(s)"

        if ($DRYRUN -eq $false -or $RunInTestMode) 
        {
            foreach ($Script in $Scripts) 
            {
                Invoke-Expression -Command "$Script"
                CheckExitCode $ExitOnError
            }
        }
        else {
            LogMessage "   Dry run, skipping script run" "magenta"
        }

        $script:BuildCmdsRun += $ScriptType
    }
}

function Set-VersionFiles()
{
    if ($VERSIONFILES.Length -gt 0)
    {
        LogMessage "Preparing version files"
        $Incremental = $false

        #
        # Below is set to handle an assemblyinfo.cs file or other version file in semver format, but the
        # build version type is incremental
        #
        $SEMVERSION = ""
        if (!$VERSION.Contains("."))
        {
            $Incremental = $true
            for ($i = 0; $i -lt $VERSION.Length; $i++) {
                $SEMVERSION = "$SEMVERSION$($VERSION[$i])."
            }
            $SEMVERSION = $SEMVERSION.Substring(0, $SEMVERSION.Length - 1);
        }
        else {
            $SEMVERSION = $VERSION
        }
        $SEMVERSIONCUR = ""
        if (!$CURRENTVERSION.Contains("."))
        {
            for ($i = 0; $i -lt $CURRENTVERSION.Length; $i++) {
                $SEMVERSIONCUR = "$SEMVERSIONCUR$($CURRENTVERSION[$i])."
            }
            $SEMVERSIONCUR = $SEMVERSIONCUR.Substring(0, $SEMVERSIONCUR.Length - 1);
        }
        else {
            $SEMVERSIONCUR = $CURRENTVERSION
        }

        #
        # Loop through all specified files and replace version number
        #
        foreach ($VersionFile in $VERSIONFILES) 
        {
            $vFile = $VersionFile;
    
            $vFile = $vFile.Replace("`${NEWVERSION}", $VERSION);
            $vFile = $vFile.Replace("`${VERSION}", $VERSION);
            $vFile = $vFile.Replace("`${CURRENTVERSION}", $CURRENTVERSION);
            $vFile = $vFile.Replace("`${LASTVERSION}", $CURRENTVERSION);

            if ((Test-Path($vFile)) -and !$VersionFilesEdited.Contains($vFile))
            {
                # replace version in file
                #
                $rc = $false
                LogMessage "Writing new version $VERSION to $vFile"
                if ($VERSIONREPLACETAGS.Length -gt 0)
                {
                    foreach ($ReplaceTag in $VERSIONREPLACETAGS) 
                    {
                        $rc = ReplaceVersion $vFile "$ReplaceTag$CURRENTVERSION" "$ReplaceTag$VERSION"
                        if ($rc -eq $true) {
                            break;
                        }
                    }
                }
                if ($rc -ne $true)
                {
                    $rc = ReplaceVersion $vFile "`"$CURRENTVERSION`"" "`"$VERSION`""
                    if ($rc -ne $true)
                    {
                        $rc = ReplaceVersion $vFile "'$CURRENTVERSION'" "'$VERSION'"
                        if ($rc -ne $true)
                        {
                            $rc = ReplaceVersion $vFile $CURRENTVERSION $VERSION
                            if ($rc -ne $true)
                            {
                                # TODO
                                # Error!
                            }
                        }
                    }
                }
                #
                # Below handles an assemblyinfo.cs file or other version file in semver format, but the
                # build version type is incremental
                #
                if ($Incremental -eq $true)
                {
                    $rc = ReplaceVersion $vFile "`"$SEMVERSIONCUR`"" "`"$SEMVERSION`""
                    if ($rc -ne $true)
                    {
                        $rc = ReplaceVersion $vFile "'$SEMVERSIONCUR'" "'$SEMVERSION'"
                        if ($rc -ne $true)
                        {
                            $rc = ReplaceVersion $vFile $SEMVERSIONCUR $SEMVERSION
                        }
                    }
                }
                #
                # Allow manual modifications to $vFile and commit to modified list
                # Edit-File will add this file to $VersionFilesEdited
                #
                Edit-File $vFile $false ($SKIPVERSIONEDITS -eq "Y" -or $TASKTOUCHVERSIONS)
            }
        }
    }
}

function Set-ExtJsBuild()
{   #
    # Replace version in app.json
    # Unfortunately Sencha Cmd does not support the pre-release identifier so replace any
    # '-' chars in the version string with a '.'.  The app.json version is primarily only
    # a visual and any change in its textual representation triggers a 'new build' as far
    # as the ExtJs bootloader is concerned, there's no concept of new/old version.
    #
    $ExtJsVersion = $VERSION.Replace("-", ".");
    $ExtJsCurrentVersion = $CURRENTVERSION.Replace("-", ".");
    ReplaceVersion "app.json" "appVersion`"[ ]*:[ ]*[`"]$ExtJsCurrentVersion" "appVersion`": `"$ExtJsVersion" $true
    ReplaceVersion "app.json" "version`"[ ]*:[ ]*[`"]$ExtJsCurrentVersion" "version`": `"$ExtJsVersion" $true
    #
    # Allow manual modifications to app.json
    #
    Edit-File "app.json" $false $TASKTOUCHVERSIONS
}

function Set-DotNetBuild($AssemblyInfoLocation)
{
    $SEMVERSION = ""
    if (!$VERSION.Contains("."))
    {
        for ($i = 0; $i -lt $VERSION.Length; $i++) {
            $SEMVERSION = "$SEMVERSION$($VERSION[$i])."
        }
        $SEMVERSION = $SEMVERSION.Substring(0, $SEMVERSION.Length - 1);
    }
    else {
        $SEMVERSION = $VERSION
    }
    $SEMVERSIONCUR = ""
    if (!$CURRENTVERSION.Contains("."))
    {
        for ($i = 0; $i -lt $CURRENTVERSION.Length; $i++) {
            $SEMVERSIONCUR = "$SEMVERSIONCUR$($CURRENTVERSION[$i])."
        }
        $SEMVERSIONCUR = $SEMVERSIONCUR.Substring(0, $SEMVERSIONCUR.Length - 1);
    }
    else {
        $SEMVERSIONCUR = $CURRENTVERSION
    }
    #
    # Replace version in assemblyinfo file
    #
    ReplaceVersion $AssemblyInfoLocation "AssemblyVersion[ ]*[(][ ]*[`"]$SEMVERSIONCUR" "AssemblyVersion(`"$SEMVERSION"
    ReplaceVersion $AssemblyInfoLocation "AssemblyFileVersion[ ]*[(][ ]*[`"]$SEMVERSIONCUR" "AssemblyFileVersion(`"$SEMVERSION"
    #
    # Allow manual modifications to assembly file and commit to modified list
    #
    Edit-File $AssemblyInfoLocation $false  ($SKIPVERSIONEDITS -eq "Y" -or $TASKTOUCHVERSIONS)
}


function Set-AppPublisherBuild()
{
    if ($APPPUBLISHERVERSION -eq $true) {
        #
        # Replace version in defined main mantisbt plugin file
        #
        ReplaceVersion ".publishrc.json" "version`"[ ]*:[ ]*[`"]$CURRENTVERSION" "version`": `"$VERSION"
        #
        # Allow manual modifications to publishrc and commit to modified list
        #
        Edit-File ".publishrc.json" $false ($SKIPVERSIONEDITS -eq "Y" -or $TASKTOUCHVERSIONS)
    }
}


function Set-MantisPluginBuild()
{
    if (![string]::IsNullOrEmpty($MANTISBTPLUGIN))
    {
        if (Test-Path($MANTISBTPLUGIN))
        {
            #
            # Replace version in defined main mantisbt plugin file
            #
            ReplaceVersion $MANTISBTPLUGIN "this->version[ ]*[=][ ]*[`"]$CURRENTVERSION" "this->version = `"$VERSION"
            ReplaceVersion $MANTISBTPLUGIN "this->version[ ]*[=][ ]*[']$CURRENTVERSION" "this->version = '$VERSION"
            #
            # Allow manual modifications to mantisbt main plugin file and commit to modified list
            #
            Edit-File $MANTISBTPLUGIN $false ($SKIPVERSIONEDITS -eq "Y" -or $TASKTOUCHVERSIONS)
        }
    }
}


function Set-MavenPomBuild($mavenTag)
{
    if ($MavenTags.Length -eq 2 -and (Test-Path("pom.xml")))
    {
        ReplaceVersion "pom.xml" "<$MmvenTag>$CURRENTVERSION</$mavenTag>" "<$mavenTag>$VERSION</$mavenTag>"
        #
        # Allow manual modifications to mantisbt main plugin file and commit to modified list
        #
        Edit-File "pom.xml" $false ($SKIPVERSIONEDITS -eq "Y" -or $TASKTOUCHVERSIONS)
    }
}


function Set-CProjectBuild()
{
    if (![string]::IsNullOrEmpty($CPROJECTRCFILE))
    {
        if (Test-Path($CPROJECTRCFILE))
        {
            $i = 0;
            $RcVersion = ""
            if (!$VERSION.Contains(".")) #  $VERSIONSYSTEM -eq "incremental"
            {
                for ($i = 0; $i -lt $VERSION.Length; $i++) {
                    if (($i -eq 0 -and $VERSION.Length -gt 3) -or $i -eq $VERSION.Length - 1) {
                        $RcVersion = "$RcVersion$($VERSION[$i])";
                    }
                    else {
                        $RcVersion = "$RcVersion$($VERSION[$i]), "
                    }
                }
                $RcVersion = $RcVersion + ", 0"
            }
            else { #  $VERSIONSYSTEM -eq "semver"
                $RcVersion = $VERSION.Replace(".", ", ") + ", 0"
            }
            $RcVersionCUR = ""
            if (!$CURRENTVERSION.Contains(".")) #  $VERSIONSYSTEM -eq "incremental"
            {
                for ($i = 0; $i -lt $CURRENTVERSION.Length; $i++) {
                    if (($i -eq 0 -and $CURRENTVERSION.Length -gt 3) -or $i -eq $CURRENTVERSION.Length - 1) {
                        $RcVersionCUR = "$RcVersionCUR$($CURRENTVERSION[$i])";
                    }
                    else {
                        $RcVersionCUR = "$RcVersionCUR$($CURRENTVERSION[$i]), "
                    }
                }
                $RcVersionCUR = $RcVersionCUR + ", 0"
            }
            else { #  $VERSIONSYSTEM -eq "semver"
                $RcVersionCUR = $CURRENTVERSION.Replace(".", ", ") + ", 0"
            }
            #
            # Replace version in defined rc file
            #
            # FILEVERSION 8,7,3,0
            # PRODUCTVERSION 7,0,0,0
            #
            # VALUE "FileVersion", "8, 7, 3, 0"
            # VALUE "FileVersion", "10,4,1,0"
            # VALUE "ProductVersion", "7, 0, 0, 0"
            #
            ReplaceVersion $CPROJECTRCFILE "FileVersion[ ]*[`"][ ]*,[ ]*[`"][ ]*$RcVersionCUR[ ]*[`"]" "FileVersion`", `"$RcVersion`""
            ReplaceVersion $CPROJECTRCFILE "ProductVersion[ ]*[`"][ ]*,[ ]*[`"][ ]*$RcVersionCUR[ ]*[`"]" "ProductVersion`", `"$RcVersion`""
            $RcVersionCUR = $RcVersionCUR.Replace(" ", ""); # and try without spaces in the version number too
            ReplaceVersion $CPROJECTRCFILE "FileVersion[ ]*[`"][ ]*,[ ]*[`"][ ]*$RcVersionCUR[ ]*[`"]" "FileVersion`", `"$RcVersion`""
            ReplaceVersion $CPROJECTRCFILE "ProductVersion[ ]*[`"][ ]*,[ ]*[`"][ ]*$RcVersionCUR[ ]*[`"]" "ProductVersion`", `"$RcVersion`""
            $RcVersion = $RcVersion.Replace(" ", ""); 
            ReplaceVersion $CPROJECTRCFILE "FILEVERSION[ ]*$RcVersionCUR" "FILEVERSION $RcVersion"
            ReplaceVersion $CPROJECTRCFILE "PRODUCTVERSION[ ]*$RcVersionCUR" "PRODUCTVERSION $RcVersion"
            #
            # Allow manual modifications to rc file and commit to modified list
            #
            Edit-File $CPROJECTRCFILE $false ($SKIPVERSIONEDITS -eq "Y" -or $TASKTOUCHVERSIONS)
        }
    }
}


function Get-AssemblyInfoVersion($AssemblyInfoLocation)
{
    $AssemblyInfoVersion = ""
    LogMessage "Retrieving assemblyinfo version from $AssemblyInfoLocation"
    if (Test-Path($AssemblyInfoLocation))
    {
        $AssemblyInfoContent = Get-Content -Path $AssemblyInfoLocation -Raw
        [Match] $match = [Regex]::Match($AssemblyInfoContent, "AssemblyVersion[ ]*[(][ ]*[`"][0-9]+[.]{1}[0-9]+[.]{1}[0-9]+");
        if ($match.Success) 
        {
            $AssemblyInfoVersion = $match.Value.Replace("AssemblyVersion", "")
            $AssemblyInfoVersion = $AssemblyInfoVersion.Replace(" ", "")
            $AssemblyInfoVersion = $AssemblyInfoVersion.Replace("(", "")
            $AssemblyInfoVersion = $AssemblyInfoVersion.Replace("`"", "")
            # Rid build number
            $AssemblyInfoVersion = $AssemblyInfoVersion.Substring(0, $AssemblyInfoVersion.LastIndexOf("."))
        }
    }
    else {
        LogMessage "Could not retrieve version, $AssemblyInfoLocation does not exist" "red"
    }
    return $AssemblyInfoVersion
}


function Get-MantisPluginVersion()
{
    $MantisVersion = ""
    LogMessage "Retrieving MantisBT plugin version from $MANTISBTPLUGIN"
    if (Test-Path($MANTISBTPLUGIN))
    {
        $PluginFileContent = Get-Content -Path $MANTISBTPLUGIN -Raw
        [Match] $match = [Regex]::Match($PluginFileContent, "this->version[ ]*=[ ]*(`"|')[0-9]+[.]{1}[0-9]+[.]{1}[0-9]+");
        if ($match.Success)
        {
            $MantisVersion = $match.Value.Replace("this->version", "")
            $MantisVersion = $MantisVersion.Replace(" ", "")
            $MantisVersion = $MantisVersion.Replace("=", "")
            $MantisVersion = $MantisVersion.Replace("`"", "")
            $MantisVersion = $MantisVersion.Replace("'", "")
        }
    }
    else {
        LogMessage "Could not retrieve version, '$MANTISBTPLUGIN' does not exist" "red"
    }
    return $MantisVersion
}


function Get-MavenPomVersion()
{   #
    # POM can be a preporty replacement version within the file itself:
    #
    # <version>${revision}${changelist}</version>
    # <name>MantisBT Plugin</name>
    # <properties>
    #     <revision>0.2.0</revision>
    #     <changelist>-PRE</changelist>
    #     ...
    # </properties>
    #
    $mavenVersion = "0.0.0"
    $mavenVersionInfo = @()
    LogMessage "Retrieving Maven plugin version from pom.xml"
    if (Test-Path("pom.xml"))
    {
        $PomFileContent = Get-Content -Path "pom.xml" -Raw

        $match = [Regex]::Match($PomFileContent, "\$\{(.+?)\}(?=\<\/version|\$\{\w+\})");
        if ($match.Success -and $match.Groups.Length -gt 1)
        {
            while ($match.Success)
            {
                $prop = $match.Groups[1].Value;
                if ($mavenVersionInfo.Length -eq 0) {
                    $mavenVersionInfo += $prop;
                }
                [Match] $match2 = [Regex]::Match($PomFileContent, "<$prop>(.+)<\/$prop>");
                if ($match2.Success -and $match2.Groups.Length -gt 1)
                {
                    if ($mavenVersion -eq "0.0.0") {
                        $mavenVersion = "";
                    }
                    $mavenVersion += $match2.Groups[1].Value;
                }
                $match = $match.NextMatch()
            }
            $mavenVersionInfo += $mavenVersion
        }
        else {
            [Match] $match = [Regex]::Match($PomFileContent, "<version>([0-9]+[.]{1}[0-9]+[.]{1}[0-9]+)<\/version>");
            if ($match.Success -and $match.Groups.Length -gt 1)
            {
                $mavenVersionInfo += "version"
                $mavenVersionInfo += $match.Groups[1].Value
            }
        }
    }
    else {
        LogMessage "Could not retrieve version, 'pom.xml' does not exist" "red"
    }
    return $mavenVersionInfo
}


function Get-AppPublisherVersion()
{
    $AppPublisherVersion = ""
    LogMessage "Retrieving App-Publisher publishrc version"
    $FileContent = Get-Content -Path ".publishrc.json" -Raw
    [Match] $match = [Regex]::Match($FileContent, "version`"[ ]*:[ ]*`"[0-9]+[.]{0,1}[0-9]+[.]{0,1}[0-9]+[.]{0,1}[0-9]{0,}");
    if ($match.Success)
    {
        $AppPublisherVersion = $match.Value.Replace("version", "")
        $AppPublisherVersion = $MantisVersion.Replace(":", "")
        $AppPublisherVersion = $MantisVersion.Replace(" ", "")
        $AppPublisherVersion = $MantisVersion.Replace("`"", "")
    }
    return $AppPublisherVersion
}


$DefaultRepo = ""
$DefaultRepoType = ""
$DefaultHomePage = ""
$DefaultBugs = ""
$DefaultName = ""
$DefaultScope = ""

function Set-PackageJson()
{
    #
    # Replace current version with new version in package.json and package-lock.json
    # 5/25/19 - Use regext text replacement after npm version command, sencha packages will contain 
    # two version tags, on for the main package.json field, and one in the sencha object definition, we 
    # want to replace them both if they match
    #
    LogMessage "Setting new version $VERSION in package.json"
    & npm version --no-git-tag-version --allow-same-version $VERSION
    CheckExitCode
    [System.Threading.Thread]::Sleep(750)
    ReplaceVersion "package.json" "version`"[ ]*:[ ]*[`"]$CURRENTVERSION" "version`": `"$VERSION"

    if (![string]::IsNullOrEmpty($REPO))
    {
        #Save
        LogMessage "Saving repository in package.json"
        if (!$IsAppPublisher) {
            $script:DefaultRepo = & app-publisher-json -f package.json repository.url
        }
        else {
            $script:DefaultRepo = & json -f package.json repository.url
        }
        CheckExitCode
        LogMessage "Repository: $DefaultRepo"
        # Set repo
        LogMessage "Setting repository in package.json: $REPO"
        if (!$IsAppPublisher) {
            & app-publisher-json -I -4 -f package.json -e "this.repository.url='$REPO'"
        }
        else {
            & json -I -4 -f package.json -e "this.repository.url='$REPO'"
        }
        CheckExitCode
    }

    if (![string]::IsNullOrEmpty($REPOTYPE))
    {
        #Save
        LogMessage "Saving repository type in package.json"
        if (!$IsAppPublisher) {
            $script:DefaultRepoType = & app-publisher-json -f package.json repository.type
        }
        else {
            $script:DefaultRepoType = & json -f package.json repository.type
        }
        CheckExitCode
        LogMessage "Repository Type: $DefaultRepoType"
        # Set repo type
        LogMessage "Setting repository type in package.json: $REPOTYPE"
        if (!$IsAppPublisher) {
            & app-publisher-json -I -4 -f package.json -e "this.repository.type='$REPOTYPE'"
        }
        else {
            & json -I -4 -f package.json -e "this.repository.type='$REPOTYPE'"
        }
        CheckExitCode
    }

    if (![string]::IsNullOrEmpty($HOMEPAGE))
    {
        #Save
        LogMessage "Saving homepage in package.json"
        if (!$IsAppPublisher) {
            $script:DefaultHomePage = & app-publisher-json -f package.json homepage
        }
        else {
            $script:DefaultHomePage = & json -f package.json homepage
        }
        CheckExitCode
        LogMessage "Homepage: $DefaultHomePage"
        # Set homepage 
        LogMessage "Setting homepage in package.json: $HOMEPAGE"
        #
        # A bug in npm module json where writing an ampersand throws an error, if the bugs page contains
        # one then use powershell replace mechanism for replacement
        #
        if (!$HOMEPAGE.Contains("&"))
        {
            if (!$IsAppPublisher) {
                & app-publisher-json -I -4 -f package.json -e "this.homepage='$HOMEPAGE'"
            }
            else {
                & json -I -4 -f package.json -e "this.homepage='$HOMEPAGE'"
            }
            CheckExitCode
        }
        else {
            ((Get-Content -path "package.json" -Raw) -replace "$DefaultHomePage", "$HOMEPAGE") | Set-Content -NoNewline -Path "package.json"
            CheckPsCmdSuccess
            [System.Threading.Thread]::Sleep(500) # removed this ps stuff to begin with because of access errors. try to sleep
        }
    }

    if (![string]::IsNullOrEmpty($BUGS))
    {
        #Save
        LogMessage "Saving bugs page in package.json"
        if (!$IsAppPublisher) {
            $script:DefaultBugs = & app-publisher-json -f package.json bugs.url
        }
        else {
            $script:DefaultBugs =  & json -f package.json bugs.url
        }
        CheckExitCode
        LogMessage "Bugs page: $DefaultBugs"
        # Set
        LogMessage "Setting bugs page in package.json: $BUGS"
        #
        # A bug in npm module json where writing an ampersand throws an error, if the bugs page contains
        # one then use powershell replace mechanism for replacement
        #
        if (!$BUGS.Contains("&"))
        {
            if (!$IsAppPublisher) {
                & app-publisher-json -I -4 -f package.json -e "this.bugs.url='$BUGS'"
            }
            else {
                & json -I -4 -f package.json -e "this.bugs.url='$BUGS'"
            }
        }
        else {
            ((Get-Content -path "package.json" -Raw) -replace "$DefaultBugs", "$BUGS") | Set-Content -NoNewline -Path "package.json"
            CheckPsCmdSuccess
            [System.Threading.Thread]::Sleep(500) # removed this ps stuff to begin with because of access errors. try to sleep
        }
        CheckExitCode
    }

    #
    # Scope/name - package.json
    #
    LogMessage "Saving package name in package.json"
    if (!$IsAppPublisher) {
        $script:DefaultName = & app-publisher-json -f package.json name
    }
    else {
        $script:DefaultName = & json -f package.json name
    }
    CheckExitCode
    LogMessage "Package name : $DefaultName"
    if ($DefaultName.Contains("@") -and $DefaultName.Contains("/")) {
        $script:DefaultScope = $DefaultName.Substring(0, $DefaultName.IndexOf("/"));
        LogMessage "Package scope: $DefaultScope"
    }

    if (![string]::IsNullOrEmpty($NPMSCOPE))
    {
        if (!$DefaultName.Contains($NPMSCOPE))
        {
            LogMessage "Setting package name in package.json: $NPMSCOPE/$PROJECTNAME"
            if (!$IsAppPublisher) {
                & app-publisher-json -I -4 -f package.json -e "this.name='$NPMSCOPE/$PROJECTNAME'"
            }
            else {
                & json -I -4 -f package.json -e "this.name='$NPMSCOPE/$PROJECTNAME'"
            }
            CheckExitCode
            if ($LASTEXITCODE -ne 0) {
                LogMessage "Setting package name in package.json failed, retrying"
                [System.Threading.Thread]::Sleep(500)
                if (!$IsAppPublisher) {
                    & app-publisher-json -I -4 -f package.json -e "this.name='$NPMSCOPE/$PROJECTNAME'"
                }
                else {
                    & json -I -4 -f package.json -e "this.name='$NPMSCOPE/$PROJECTNAME'"
                }
                CheckExitCode
            }
            #
            # Scope - package-lock.json
            #
            if (Test-Path("package-lock.json")) 
            {
                LogMessage "Setting package name in package-lock.json: $NPMSCOPE/$PROJECTNAME"
                if (!$IsAppPublisher) {
                    & app-publisher-json -I -4 -f package-lock.json -e "this.name='$NPMSCOPE/$PROJECTNAME'"
                }
                else {
                    & json -I -4 -f package-lock.json -e "this.name='$NPMSCOPE/$PROJECTNAME'"
                }
                CheckExitCode
                if ($LASTEXITCODE -ne 0) {
                    LogMessage "Setting package name in package-lock.json failed, retrying"
                    [System.Threading.Thread]::Sleep(500)
                    if (!$IsAppPublisher) {
                        & app-publisher-json -I -4 -f package-lock.json -e "this.name='$NPMSCOPE/$PROJECTNAME'"
                    }
                    else {
                        & json -I -4 -f package-lock.json -e "this.name='$NPMSCOPE/$PROJECTNAME'"
                    }
                    CheckExitCode
                }
            }
        }
    }
    
    #
    # The json utility will output line feed only, replace with windows stle crlf
    #
    #LogMessage "Set windows line feeds in package.json"
    #((Get-Content -path "package.json" -Raw) -replace "`n", "`r`n") | Set-Content -NoNewline -Path "package.json"
    #CheckExitCode
    #
    # Allow manual modifications to package.json and package-lock.json
    #
    Edit-File "package.json" $false  ($SKIPVERSIONEDITS -eq "Y")
    if (Test-Path("package-lock.json")) 
    {
        # The json utility will output line feed only, replace with windows stle crlf
        #
        #LogMessage "Set windows line feeds in package-lock.json"
        #((Get-Content -path "package-lock.json" -Raw) -replace "`n", "`r`n") | Set-Content -NoNewline -Path "package-lock.json"
        #CheckPsCmdSuccess
        Edit-File "package-lock.json" $false  ($SKIPVERSIONEDITS -eq "Y")
    }
}

function Restore-PackageJson()
{
    #
    # Set repo
    #
    if (![string]::IsNullOrEmpty($DefaultRepo))
    {
        LogMessage "Re-setting default repository in package.json: $DefaultRepo"
        if (!$IsAppPublisher) {
            & app-publisher-json -I -4 -f package.json -e "this.repository.url='$DefaultRepo'"
        }
        else {
            & json -I -4 -f package.json -e "this.repository.url='$DefaultRepo'"
        }
        CheckExitCode
    }
    #
    # Set repo type
    #
    if (![string]::IsNullOrEmpty($DefaultRepoType))
    {
        LogMessage "Re-setting default repository type in package.json: $DefaultRepoType"
        if (!$IsAppPublisher) {
            & app-publisher-json -I -4 -f package.json -e "this.repository.type='$DefaultRepoType'"
        }
        else {
            & json -I -4 -f package.json -e "this.repository.type='$DefaultRepoType'"
        }
        CheckExitCode
    }
    #
    # Set bugs
    #
    if (![string]::IsNullOrEmpty($DefaultBugs))
    {
        LogMessage "Re-setting default bugs page in package.json: $DefaultBugs"
        #
        # A bug in npm module json where writing an ampersand throws an error, if the bugs page contains
        # one then use powershell replace mechanism for replacement
        #
        if (!$DefaultBugs.Contains("&"))
        {
            if (!$IsAppPublisher) {
                & app-publisher-json -I -4 -f package.json -e "this.bugs.url='$DefaultBugs'"
            }
            else {
                & json -I -4 -f package.json -e "this.bugs.url='$DefaultBugs'"
            }
            CheckExitCode
        }
        else {
            ((Get-Content -path "package.json" -Raw) -replace "$BUGS", "$DefaultBugs") | Set-Content -NoNewline -Path "package.json"
            CheckPsCmdSuccess
            [System.Threading.Thread]::Sleep(500) # removed this ps stuff to begin with because of access errors. try to sleep
        }
    }
    #
    # Set homepage 
    #
    if (![string]::IsNullOrEmpty($DefaultHomePage))
    {
        LogMessage "Re-setting default homepage in package.json: $DefaultHomePage"
        #
        # A bug in npm module json where writing an ampersand throws an error, if the bugs page contains
        # one then use powershell replace mechanism for replacement
        #
        if (!$DefaultHomePage.Contains("&"))
        {
            if (!$IsAppPublisher) {
                & app-publisher-json -I -4 -f package.json -e "this.homepage='$DefaultHomePage'"
            }
            else {
                & json -I -4 -f package.json -e "this.homepage='$DefaultHomePage'"
            }
            CheckExitCode
        }
        else {
            ((Get-Content -path "package.json" -Raw) -replace "$HOMEPAGE", "$DefaultHomePage") | Set-Content -NoNewline -Path "package.json"
            CheckPsCmdSuccess
            [System.Threading.Thread]::Sleep(500) # removed this ps stuff to begin with because of access errors. try to sleep
        }
    }
    #
    # Scope/name - package.json
    #
    if (![string]::IsNullOrEmpty($NPMSCOPE) -and !$DefaultName.Contains($NPMSCOPE))
    {
        LogMessage "Re-setting default package name in package.json: $DefaultName"
        if (!$IsAppPublisher) {
            & app-publisher-json -I -4 -f package.json -e "this.name='$DefaultName'"
        }
        else {
            & json -I -4 -f package.json -e "this.name='$DefaultName'"
        }
        CheckExitCode
        #
        # Scope - package-lock.json
        #
        if (Test-Path("package-lock.json")) 
        {
            LogMessage "Re-scoping default package name in package-lock.json: $DefaultName"
            if (!$IsAppPublisher) {
                & app-publisher-json -I -4 -f package-lock.json -e "this.name='$DefaultName'"
            }
            else {
                & json -I -4 -f package-lock.json -e "this.name='$DefaultName'"
            }
            CheckExitCode
        }
    }
}

$FirstEditFileDone = $false

function Edit-File($editFile, $SeekToEnd = $false, $skipEdit = $false, $async = $false)
{
    $nFile = $editFile;

    LogMessage "edit file $nFile" "cyan" $true

    if (![string]::IsNullOrEmpty($nFile) -and (Test-Path($nFile)) -and !$VersionFilesEdited.Contains($nFile))
    {
        $script:VersionFilesEdited += $nFile
        
        if (!$TASKMODE -or $TASKCOMMIT) {
            VcChangelistAdd $nFile
        }

        if ($skipEdit -and $VERSIONFILESEDITALWAYS.Contains($nFile)) 
        {
            LogMessage "Set Edit Always Version File - $nFile"  
            $skipEdit = $false
        }

        #
        # publishrc can specify a file should be scrolled to bottom
        #
        if ($VERSIONFILESSCROLLDOWN.Contains($nFile))
        {
            $SeekToEnd = $true
        }

        if (!$skipEdit -and ![string]::IsNullOrEmpty($TEXTEDITOR))
        {
            LogMessage "Edit $nFile"
            #
            # Create scripting shell for process activation and sendkeys
            #
            $WSShell = New-Object -ComObject WScript.Shell
            #
            # Start Notepad process ro edit specified file
            #
            $TextEditorProcess = Start-Process -filepath $TEXTEDITOR -args $nFile -PassThru
            #
            # Wait until Notepad has finished loading and is ready
            #
            $TextEditorProcess.WaitForInputIdle() | Out-Null;
            #
            # Next is some crazy hack.  For whatever reason, starting the powershell process from
            # node in an embedded VSCode terminal, it would launch the notepad window but the VSCode
            # window would remain in the foreground, with the notepad window behind.  This behavior
            # was seen in the past when messing around with VSCode tasks.json tasks, where if the
            # "ant" application was started using the full path, notepad windows would come up on
            # top, but if ant was called just by the program name (as it was registered in PATH), the
            # notepad wnidows displayed the same strange behavior.  Still not quite sure how this
            # is happening.  Therefore this hack to solve the issue:
            #
            #     1.  Find the main VSCode window (there are at least a half dozen Code processes 
            #         running at any given time)
            #
            #     2. Activate the VSCode window.
            #
            #     3. Activate the Notepad window.
            #
            # This seems to work, but why?
            #
            # Another methos was found that might work if there are ever problems with this, but using
            # an external library, leaving for reference:
            #
            #     powershell gallery module Install-Module -Name Pscx gives Set-ForegroundWindow function
            #     Set-ForegroundWindow $TextEditorProcess.MainWindowHandle
            #
            # Update - 5/22/19 - Found that activating the vscode window is not necessary provided
            # we call sendkeys on the fist notepad edit before calling acticate?????  Really, really strange.
            #
            # Heres an even bigger hack than the one mentioned above.  If the "interactive" flag is set
            # the above hack doesnt work for the fist notepad window opened after inputting the version 
            # number manually.  Subsequent notepad windows work fine with the above mentioned workaround.
            # If this is the first notepad edit, then do some extra hackish stuff, like activate the
            # Code window and call SendKeys, the keys are not received by the Code window, but without
            # this the notepad window opens in the background as described above.
            #
            if ($FirstEditFileDone -eq $false -or $TEXTEDITOR.ToLower() -eq "notepad" -or $TEXTEDITOR.ToLower() -eq "notepad.exe")
            {
                $CodeProcess = Get-Process "Code" | Where-Object {$_.mainWindowTitle}
                #[System.Threading.Thread]::Sleep(500);
                if ($null -ne $CodeProcess) {
                    $Tmp = $WSShell.AppActivate($CodeProcess.Id)
                } 
                #[System.Threading.Thread]::Sleep(500);
                $WSShell.sendkeys("");
                $Tmp = $WSShell.AppActivate($TextEditorProcess.Id)
                $WSShell.sendkeys("");
                if ($null -ne $CodeProcess) {
                    $Tmp = $WSShell.AppActivate($CodeProcess.Id)
                } 
                $Tmp = $WSShell.AppActivate($TextEditorProcess.Id)
                $WSShell.sendkeys("");
                $script:FirstEditFileDone = $true
            }
            $Tmp = $WSShell.AppActivate($TextEditorProcess.Id) # Set to variable to avoid cmdlet stdout
            #
            # If specified, send CTRL+{END} key combination to notepad process to place cursor at end
            # of the file being edited.  Useful for large files (i.e. changelog/history).
            #$SeekToEnd
            if ($SeekToEnd -eq $true) {
                $WSShell.sendkeys("^{END}");
            }
            #
            # Wait for the notepad process to be closed by the user
            #
            if ($async -ne $true) {
                Wait-Process -Id $TextEditorProcess.Id | Out-Null
                CheckPsCmdSuccess
            }
        }
    }
}

function Get-ReleaseChangelog($ChangeLogParts, $UseFaIcons = $false, $IncludeStyling = $false)
{
    $ChangeLog = ""
    
    if ($ChangeLogParts.Length -gt 0)
    {
        if ($IncludeStyling -eq $true)
        {
            $ChangeLog += "<span><style type=`"text/css`" scoped>"
            $ChangeLog += ".changelog-table td { padding-top: 5px; padding-bottom: 5px; }"
            $ChangeLog += ".changelog-table tr { display: tr; border-collapse: separate; border-style: solid; border-color: rgb(211, 208, 208); border-width: 0px; border-spacing: 2px; border-bottom-width: 1px !important; }"
            $ChangeLog += "</style>"
        }

        $ChangeLog += "<span class=`"changelog-table`">"
        $ChangeLog += "<table width=`"100%`" style=`"display:inline`">"

        foreach ($commit in $ChangeLogParts)
        {
            $ChangeLog += "<tr>"
            if ($UseFaIcons -eq $true)
            {
                $ChangeLog += "<td nowrap valign=`"top`" style=`"font-weight:bold;color:#5090c1`"><b>"
                if ($commit.subject.Contains("Fix")) {
                    $ChangeLog += "<i class=`"fa fa-bug`"></i> ";
                }
                elseif ($commit.subject.Contains("Feature")) {
                    $ChangeLog += "<i class=`"fa fa-plus`"></i> ";
                }
                elseif ($commit.subject.Contains("Refactor")) {
                    $ChangeLog += "<i class=`"fa fa-recycle`"></i> ";
                }
                elseif ($commit.subject.Contains("Visual")) {
                    $ChangeLog += "<i class=`"fa fa-eye`"></i> ";
                }
                elseif ($commit.subject.Contains("Documentation")) {
                    $ChangeLog += "<i class=`"fa fa-book`"></i> ";
                }
                elseif ($commit.subject.Contains("Progress")) {
                    $ChangeLog += "<i class=`"fa fa-tasks`"></i> ";
                }
                elseif ($commit.subject.Contains("Build")) {
                    $ChangeLog += "<i class=`"fa fa-cog`"></i> ";
                }
                else {
                    $iconSet = $false;
                    if ($COMMITMSGMAP)
                    {
                        $COMMITMSGMAP.psobject.Properties | ForEach-Object { # Bracket must stay same line as ForEach-Object
                            if (!$iconSet -and $commit.subject.Contains($_.Value.formatText) -and $_.Value.iconCls)
                            {
                                $ChangeLog += "<i class=`"fa "
                                $ChangeLog += $_.Value.iconCls
                                $ChangeLog += "`"></i> ";
                                $iconSet = $true;
                            }
                        }
                    }
                    if (!$iconSet) {
                        $ChangeLog += "<i class=`"fa fa-asterisk`"></i> ";
                    }
                }
                $ChangeLog += "</td><td nowrap valign=`"top`" style=`"font-weight:bold;padding-left:3px`">"
            }
            else {
                $ChangeLog += "<td nowrap valign=`"top`" style=`"font-weight:bold`"><b>"
            }

            $ChangeLog += $commit.subject
            if (![string]::IsNullOrEmpty($commit.scope)) {
                $ChangeLog += "</b></td><td nowrap valign=`"top`" style=`"padding-left:10px`">"
                $ChangeLog += $commit.scope
            }
            else {
                $ChangeLog += "</td><td>"
            }
            $ChangeLog += "</td><td width=`"100%`" style=`"padding-left:15px`">"
            $ChangeLog += $commit.message
            if (![string]::IsNullOrEmpty($commit.tickets)) {
                $ChangeLog += "</td><td nowrap align=`"right`" valign=`"top`" style=`"padding-left:15px;padding-right:10px`">"
                $ChangeLog += $commit.tickets
            }
            else {
                $ChangeLog += "</td><td>"
            }
            $ChangeLog += "</td></tr>"
        }

        $ChangeLog += "</table></span>"
        if ($IncludeStyling -eq $true)
        {
            $ChangeLog += "</span>"
        }
    }

    return $ChangeLog      
}

#endregion

#region ContentTypeMap

$ContentTypeMap = @{
    ".323"= "text/h323";
    ".3g2"= "video/3gpp2";
    ".3gp"= "video/3gpp";
    ".3gp2"= "video/3gpp2";
    ".3gpp"= "video/3gpp";
    ".7z"= "application/x-7z-compressed";
    ".aa"= "audio/audible";
    ".AAC"= "audio/aac";
    ".aaf"= "application/octet-stream";
    ".aax"= "audio/vnd.audible.aax";
    ".ac3"= "audio/ac3";
    ".aca"= "application/octet-stream";
    ".accda"= "application/msaccess.addin";
    ".accdb"= "application/msaccess";
    ".accdc"= "application/msaccess.cab";
    ".accde"= "application/msaccess";
    ".accdr"= "application/msaccess.runtime";
    ".accdt"= "application/msaccess";
    ".accdw"= "application/msaccess.webapplication";
    ".accft"= "application/msaccess.ftemplate";
    ".acx"= "application/internet-property-stream";
    ".AddIn"= "text/xml";
    ".ade"= "application/msaccess";
    ".adobebridge"= "application/x-bridge-url";
    ".adp"= "application/msaccess";
    ".ADT"= "audio/vnd.dlna.adts";
    ".ADTS"= "audio/aac";
    ".afm"= "application/octet-stream";
    ".ai"= "application/postscript";
    ".aif"= "audio/aiff";
    ".aifc"= "audio/aiff";
    ".aiff"= "audio/aiff";
    ".air"= "application/vnd.adobe.air-application-installer-package+zip";
    ".amc"= "application/mpeg";
    ".anx"= "application/annodex";
    ".apk"= "application/vnd.android.package-archive" ;
    ".application"= "application/x-ms-application";
    ".art"= "image/x-jg";
    ".asa"= "application/xml";
    ".asax"= "application/xml";
    ".ascx"= "application/xml";
    ".asd"= "application/octet-stream";
    ".asf"= "video/x-ms-asf";
    ".ashx"= "application/xml";
    ".asi"= "application/octet-stream";
    ".asm"= "text/plain";
    ".asmx"= "application/xml";
    ".aspx"= "application/xml";
    ".asr"= "video/x-ms-asf";
    ".asx"= "video/x-ms-asf";
    ".atom"= "application/atom+xml";
    ".au"= "audio/basic";
    ".avi"= "video/x-msvideo";
    ".axa"= "audio/annodex";
    ".axs"= "application/olescript";
    ".axv"= "video/annodex";
    ".bas"= "text/plain";
    ".bcpio"= "application/x-bcpio";
    ".bin"= "application/octet-stream";
    ".bmp"= "image/bmp";
    ".c"= "text/plain";
    ".cab"= "application/octet-stream";
    ".caf"= "audio/x-caf";
    ".calx"= "application/vnd.ms-office.calx";
    ".cat"= "application/vnd.ms-pki.seccat";
    ".cc"= "text/plain";
    ".cd"= "text/plain";
    ".cdda"= "audio/aiff";
    ".cdf"= "application/x-cdf";
    ".cer"= "application/x-x509-ca-cert";
    ".cfg"= "text/plain";
    ".chm"= "application/octet-stream";
    ".class"= "application/x-java-applet";
    ".clp"= "application/x-msclip";
    ".cmd"= "text/plain";
    ".cmx"= "image/x-cmx";
    ".cnf"= "text/plain";
    ".cod"= "image/cis-cod";
    ".config"= "application/xml";
    ".contact"= "text/x-ms-contact";
    ".coverage"= "application/xml";
    ".cpio"= "application/x-cpio";
    ".cpp"= "text/plain";
    ".crd"= "application/x-mscardfile";
    ".crl"= "application/pkix-crl";
    ".crt"= "application/x-x509-ca-cert";
    ".cs"= "text/plain";
    ".csdproj"= "text/plain";
    ".csh"= "application/x-csh";
    ".csproj"= "text/plain";
    ".css"= "text/css";
    ".csv"= "text/csv";
    ".cur"= "application/octet-stream";
    ".cxx"= "text/plain";
    ".dat"= "application/octet-stream";
    ".datasource"= "application/xml";
    ".dbproj"= "text/plain";
    ".dcr"= "application/x-director";
    ".def"= "text/plain";
    ".deploy"= "application/octet-stream";
    ".der"= "application/x-x509-ca-cert";
    ".dgml"= "application/xml";
    ".dib"= "image/bmp";
    ".dif"= "video/x-dv";
    ".dir"= "application/x-director";
    ".disco"= "text/xml";
    ".divx"= "video/divx";
    ".dll"= "application/x-msdownload";
    ".dll.config"= "text/xml";
    ".dlm"= "text/dlm";
    ".doc"= "application/msword";
    ".docm"= "application/vnd.ms-word.document.macroEnabled.12";
    ".docx"= "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    ".dot"= "application/msword";
    ".dotm"= "application/vnd.ms-word.template.macroEnabled.12";
    ".dotx"= "application/vnd.openxmlformats-officedocument.wordprocessingml.template";
    ".dsp"= "application/octet-stream";
    ".dsw"= "text/plain";
    ".dtd"= "text/xml";
    ".dtsConfig"= "text/xml";
    ".dv"= "video/x-dv";
    ".dvi"= "application/x-dvi";
    ".dwf"= "drawing/x-dwf";
    ".dwp"= "application/octet-stream";
    ".dxr"= "application/x-director";
    ".eml"= "message/rfc822";
    ".emz"= "application/octet-stream";
    ".eot"= "application/vnd.ms-fontobject";
    ".eps"= "application/postscript";
    ".etl"= "application/etl";
    ".etx"= "text/x-setext";
    ".evy"= "application/envoy";
    ".exe"= "application/octet-stream";
    ".exe.config"= "text/xml";
    ".fdf"= "application/vnd.fdf";
    ".fif"= "application/fractals";
    ".filters"= "application/xml";
    ".fla"= "application/octet-stream";
    ".flac"= "audio/flac";
    ".flr"= "x-world/x-vrml";
    ".flv"= "video/x-flv";
    ".fsscript"= "application/fsharp-script";
    ".fsx"= "application/fsharp-script";
    ".generictest"= "application/xml";
    ".gif"= "image/gif";
    ".gpx"= "application/gpx+xml";
    ".group"= "text/x-ms-group";
    ".gsm"= "audio/x-gsm";
    ".gtar"= "application/x-gtar";
    ".gz"= "application/x-gzip";
    ".h"= "text/plain";
    ".hdf"= "application/x-hdf";
    ".hdml"= "text/x-hdml";
    ".hhc"= "application/x-oleobject";
    ".hhk"= "application/octet-stream";
    ".hhp"= "application/octet-stream";
    ".hlp"= "application/winhlp";
    ".hpp"= "text/plain";
    ".hqx"= "application/mac-binhex40";
    ".hta"= "application/hta";
    ".htc"= "text/x-component";
    ".htm"= "text/html";
    ".html"= "text/html";
    ".htt"= "text/webviewhtml";
    ".hxa"= "application/xml";
    ".hxc"= "application/xml";
    ".hxd"= "application/octet-stream";
    ".hxe"= "application/xml";
    ".hxf"= "application/xml";
    ".hxh"= "application/octet-stream";
    ".hxi"= "application/octet-stream";
    ".hxk"= "application/xml";
    ".hxq"= "application/octet-stream";
    ".hxr"= "application/octet-stream";
    ".hxs"= "application/octet-stream";
    ".hxt"= "text/html";
    ".hxv"= "application/xml";
    ".hxw"= "application/octet-stream";
    ".hxx"= "text/plain";
    ".i"= "text/plain";
    ".ico"= "image/x-icon";
    ".ics"= "application/octet-stream";
    ".idl"= "text/plain";
    ".ief"= "image/ief";
    ".iii"= "application/x-iphone";
    ".inc"= "text/plain";
    ".inf"= "application/octet-stream";
    ".ini"= "text/plain";
    ".inl"= "text/plain";
    ".ins"= "application/x-internet-signup";
    ".ipa"= "application/x-itunes-ipa";
    ".ipg"= "application/x-itunes-ipg";
    ".ipproj"= "text/plain";
    ".ipsw"= "application/x-itunes-ipsw";
    ".iqy"= "text/x-ms-iqy";
    ".isp"= "application/x-internet-signup";
    ".ite"= "application/x-itunes-ite";
    ".itlp"= "application/x-itunes-itlp";
    ".itms"= "application/x-itunes-itms";
    ".itpc"= "application/x-itunes-itpc";
    ".IVF"= "video/x-ivf";
    ".jar"= "application/java-archive";
    ".java"= "application/octet-stream";
    ".jck"= "application/liquidmotion";
    ".jcz"= "application/liquidmotion";
    ".jfif"= "image/pjpeg";
    ".jnlp"= "application/x-java-jnlp-file";
    ".jpb"= "application/octet-stream";
    ".jpe"= "image/jpeg";
    ".jpeg"= "image/jpeg";
    ".jpg"= "image/jpeg";
    ".js"= "application/javascript";
    ".json"= "application/json";
    ".jsx"= "text/jscript";
    ".jsxbin"= "text/plain";
    ".latex"= "application/x-latex";
    ".library-ms"= "application/windows-library+xml";
    ".lit"= "application/x-ms-reader";
    ".loadtest"= "application/xml";
    ".lpk"= "application/octet-stream";
    ".lsf"= "video/x-la-asf";
    ".lst"= "text/plain";
    ".lsx"= "video/x-la-asf";
    ".lzh"= "application/octet-stream";
    ".m13"= "application/x-msmediaview";
    ".m14"= "application/x-msmediaview";
    ".m1v"= "video/mpeg";
    ".m2t"= "video/vnd.dlna.mpeg-tts";
    ".m2ts"= "video/vnd.dlna.mpeg-tts";
    ".m2v"= "video/mpeg";
    ".m3u"= "audio/x-mpegurl";
    ".m3u8"= "audio/x-mpegurl";
    ".m4a"= "audio/m4a";
    ".m4b"= "audio/m4b";
    ".m4p"= "audio/m4p";
    ".m4r"= "audio/x-m4r";
    ".m4v"= "video/x-m4v";
    ".mac"= "image/x-macpaint";
    ".mak"= "text/plain";
    ".man"= "application/x-troff-man";
    ".manifest"= "application/x-ms-manifest";
    ".map"= "text/plain";
    ".master"= "application/xml";
    ".mda"= "application/msaccess";
    ".mdb"= "application/x-msaccess";
    ".mde"= "application/msaccess";
    ".mdp"= "application/octet-stream";
    ".me"= "application/x-troff-me";
    ".mfp"= "application/x-shockwave-flash";
    ".mht"= "message/rfc822";
    ".mhtml"= "message/rfc822";
    ".mid"= "audio/mid";
    ".midi"= "audio/mid";
    ".mix"= "application/octet-stream";
    ".mk"= "text/plain";
    ".mmf"= "application/x-smaf";
    ".mno"= "text/xml";
    ".mny"= "application/x-msmoney";
    ".mod"= "video/mpeg";
    ".mov"= "video/quicktime";
    ".movie"= "video/x-sgi-movie";
    ".mp2"= "video/mpeg";
    ".mp2v"= "video/mpeg";
    ".mp3"= "audio/mpeg";
    ".mp4"= "video/mp4";
    ".mp4v"= "video/mp4";
    ".mpa"= "video/mpeg";
    ".mpe"= "video/mpeg";
    ".mpeg"= "video/mpeg";
    ".mpf"= "application/vnd.ms-mediapackage";
    ".mpg"= "video/mpeg";
    ".mpp"= "application/vnd.ms-project";
    ".mpv2"= "video/mpeg";
    ".mqv"= "video/quicktime";
    ".ms"= "application/x-troff-ms";
    ".msi"= "application/octet-stream";
    ".mso"= "application/octet-stream";
    ".mts"= "video/vnd.dlna.mpeg-tts";
    ".mtx"= "application/xml";
    ".mvb"= "application/x-msmediaview";
    ".mvc"= "application/x-miva-compiled";
    ".mxp"= "application/x-mmxp";
    ".nc"= "application/x-netcdf";
    ".nsc"= "video/x-ms-asf";
    ".nws"= "message/rfc822";
    ".ocx"= "application/octet-stream";
    ".oda"= "application/oda";
    ".odb"= "application/vnd.oasis.opendocument.database";
    ".odc"= "application/vnd.oasis.opendocument.chart";
    ".odf"= "application/vnd.oasis.opendocument.formula";
    ".odg"= "application/vnd.oasis.opendocument.graphics";
    ".odh"= "text/plain";
    ".odi"= "application/vnd.oasis.opendocument.image";
    ".odl"= "text/plain";
    ".odm"= "application/vnd.oasis.opendocument.text-master";
    ".odp"= "application/vnd.oasis.opendocument.presentation";
    ".ods"= "application/vnd.oasis.opendocument.spreadsheet";
    ".odt"= "application/vnd.oasis.opendocument.text";
    ".oga"= "audio/ogg";
    ".ogg"= "audio/ogg";
    ".ogv"= "video/ogg";
    ".ogx"= "application/ogg";
    ".one"= "application/onenote";
    ".onea"= "application/onenote";
    ".onepkg"= "application/onenote";
    ".onetmp"= "application/onenote";
    ".onetoc"= "application/onenote";
    ".onetoc2"= "application/onenote";
    ".opus"= "audio/ogg";
    ".orderedtest"= "application/xml";
    ".osdx"= "application/opensearchdescription+xml";
    ".otf"= "application/font-sfnt";
    ".otg"= "application/vnd.oasis.opendocument.graphics-template";
    ".oth"= "application/vnd.oasis.opendocument.text-web";
    ".otp"= "application/vnd.oasis.opendocument.presentation-template";
    ".ots"= "application/vnd.oasis.opendocument.spreadsheet-template";
    ".ott"= "application/vnd.oasis.opendocument.text-template";
    ".oxt"= "application/vnd.openofficeorg.extension";
    ".p10"= "application/pkcs10";
    ".p12"= "application/x-pkcs12";
    ".p7b"= "application/x-pkcs7-certificates";
    ".p7c"= "application/pkcs7-mime";
    ".p7m"= "application/pkcs7-mime";
    ".p7r"= "application/x-pkcs7-certreqresp";
    ".p7s"= "application/pkcs7-signature";
    ".pbm"= "image/x-portable-bitmap";
    ".pcast"= "application/x-podcast";
    ".pct"= "image/pict";
    ".pcx"= "application/octet-stream";
    ".pcz"= "application/octet-stream";
    ".pdf"= "application/pdf";
    ".pfb"= "application/octet-stream";
    ".pfm"= "application/octet-stream";
    ".pfx"= "application/x-pkcs12";
    ".pgm"= "image/x-portable-graymap";
    ".pic"= "image/pict";
    ".pict"= "image/pict";
    ".pkgdef"= "text/plain";
    ".pkgundef"= "text/plain";
    ".pko"= "application/vnd.ms-pki.pko";
    ".pls"= "audio/scpls";
    ".pma"= "application/x-perfmon";
    ".pmc"= "application/x-perfmon";
    ".pml"= "application/x-perfmon";
    ".pmr"= "application/x-perfmon";
    ".pmw"= "application/x-perfmon";
    ".png"= "image/png";
    ".pnm"= "image/x-portable-anymap";
    ".pnt"= "image/x-macpaint";
    ".pntg"= "image/x-macpaint";
    ".pnz"= "image/png";
    ".pot"= "application/vnd.ms-powerpoint";
    ".potm"= "application/vnd.ms-powerpoint.template.macroEnabled.12";
    ".potx"= "application/vnd.openxmlformats-officedocument.presentationml.template";
    ".ppa"= "application/vnd.ms-powerpoint";
    ".ppam"= "application/vnd.ms-powerpoint.addin.macroEnabled.12";
    ".ppm"= "image/x-portable-pixmap";
    ".pps"= "application/vnd.ms-powerpoint";
    ".ppsm"= "application/vnd.ms-powerpoint.slideshow.macroEnabled.12";
    ".ppsx"= "application/vnd.openxmlformats-officedocument.presentationml.slideshow";
    ".ppt"= "application/vnd.ms-powerpoint";
    ".pptm"= "application/vnd.ms-powerpoint.presentation.macroEnabled.12";
    ".pptx"= "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    ".prf"= "application/pics-rules";
    ".prm"= "application/octet-stream";
    ".prx"= "application/octet-stream";
    ".ps"= "application/postscript";
    ".psc1"= "application/PowerShell";
    ".psd"= "application/octet-stream";
    ".psess"= "application/xml";
    ".psm"= "application/octet-stream";
    ".psp"= "application/octet-stream";
    ".pub"= "application/x-mspublisher";
    ".pwz"= "application/vnd.ms-powerpoint";
    ".qht"= "text/x-html-insertion";
    ".qhtm"= "text/x-html-insertion";
    ".qt"= "video/quicktime";
    ".qti"= "image/x-quicktime";
    ".qtif"= "image/x-quicktime";
    ".qtl"= "application/x-quicktimeplayer";
    ".qxd"= "application/octet-stream";
    ".ra"= "audio/x-pn-realaudio";
    ".ram"= "audio/x-pn-realaudio";
    ".rar"= "application/x-rar-compressed";
    ".ras"= "image/x-cmu-raster";
    ".rat"= "application/rat-file";
    ".rc"= "text/plain";
    ".rc2"= "text/plain";
    ".rct"= "text/plain";
    ".rdlc"= "application/xml";
    ".reg"= "text/plain";
    ".resx"= "application/xml";
    ".rf"= "image/vnd.rn-realflash";
    ".rgb"= "image/x-rgb";
    ".rgs"= "text/plain";
    ".rm"= "application/vnd.rn-realmedia";
    ".rmi"= "audio/mid";
    ".rmp"= "application/vnd.rn-rn_music_package";
    ".roff"= "application/x-troff";
    ".rpm"= "audio/x-pn-realaudio-plugin";
    ".rqy"= "text/x-ms-rqy";
    ".rtf"= "application/rtf";
    ".rtx"= "text/richtext";
    ".ruleset"= "application/xml";
    ".s"= "text/plain";
    ".safariextz"= "application/x-safari-safariextz";
    ".scd"= "application/x-msschedule";
    ".scr"= "text/plain";
    ".sct"= "text/scriptlet";
    ".sd2"= "audio/x-sd2";
    ".sdp"= "application/sdp";
    ".sea"= "application/octet-stream";
    ".searchConnector-ms"= "application/windows-search-connector+xml";
    ".setpay"= "application/set-payment-initiation";
    ".setreg"= "application/set-registration-initiation";
    ".settings"= "application/xml";
    ".sgimb"= "application/x-sgimb";
    ".sgml"= "text/sgml";
    ".sh"= "application/x-sh";
    ".shar"= "application/x-shar";
    ".shtml"= "text/html";
    ".sit"= "application/x-stuffit";
    ".sitemap"= "application/xml";
    ".skin"= "application/xml";
    ".sldm"= "application/vnd.ms-powerpoint.slide.macroEnabled.12";
    ".sldx"= "application/vnd.openxmlformats-officedocument.presentationml.slide";
    ".slk"= "application/vnd.ms-excel";
    ".sln"= "text/plain";
    ".slupkg-ms"= "application/x-ms-license";
    ".smd"= "audio/x-smd";
    ".smi"= "application/octet-stream";
    ".smx"= "audio/x-smd";
    ".smz"= "audio/x-smd";
    ".snd"= "audio/basic";
    ".snippet"= "application/xml";
    ".snp"= "application/octet-stream";
    ".sol"= "text/plain";
    ".sor"= "text/plain";
    ".spc"= "application/x-pkcs7-certificates";
    ".spl"= "application/futuresplash";
    ".spx"= "audio/ogg";
    ".src"= "application/x-wais-source";
    ".srf"= "text/plain";
    ".SSISDeploymentManifest"= "text/xml";
    ".ssm"= "application/streamingmedia";
    ".sst"= "application/vnd.ms-pki.certstore";
    ".stl"= "application/vnd.ms-pki.stl";
    ".sv4cpio"= "application/x-sv4cpio";
    ".sv4crc"= "application/x-sv4crc";
    ".svc"= "application/xml";
    ".svg"= "image/svg+xml";
    ".swf"= "application/x-shockwave-flash";
    ".step"= "application/step";
    ".stp"= "application/step";
    ".t"= "application/x-troff";
    ".tar"= "application/x-tar";
    ".tcl"= "application/x-tcl";
    ".testrunconfig"= "application/xml";
    ".testsettings"= "application/xml";
    ".tex"= "application/x-tex";
    ".texi"= "application/x-texinfo";
    ".texinfo"= "application/x-texinfo";
    ".tgz"= "application/x-compressed";
    ".thmx"= "application/vnd.ms-officetheme";
    ".thn"= "application/octet-stream";
    ".tif"= "image/tiff";
    ".tiff"= "image/tiff";
    ".tlh"= "text/plain";
    ".tli"= "text/plain";
    ".toc"= "application/octet-stream";
    ".tr"= "application/x-troff";
    ".trm"= "application/x-msterminal";
    ".trx"= "application/xml";
    ".ts"= "video/vnd.dlna.mpeg-tts";
    ".tsv"= "text/tab-separated-values";
    ".ttf"= "application/font-sfnt";
    ".tts"= "video/vnd.dlna.mpeg-tts";
    ".txt"= "text/plain";
    ".u32"= "application/octet-stream";
    ".uls"= "text/iuls";
    ".user"= "text/plain";
    ".ustar"= "application/x-ustar";
    ".vb"= "text/plain";
    ".vbdproj"= "text/plain";
    ".vbk"= "video/mpeg";
    ".vbproj"= "text/plain";
    ".vbs"= "text/vbscript";
    ".vcf"= "text/x-vcard";
    ".vcproj"= "application/xml";
    ".vcs"= "text/plain";
    ".vcxproj"= "application/xml";
    ".vddproj"= "text/plain";
    ".vdp"= "text/plain";
    ".vdproj"= "text/plain";
    ".vdx"= "application/vnd.ms-visio.viewer";
    ".vml"= "text/xml";
    ".vscontent"= "application/xml";
    ".vsct"= "text/xml";
    ".vsd"= "application/vnd.visio";
    ".vsi"= "application/ms-vsi";
    ".vsix"= "application/vsix";
    ".vsixlangpack"= "text/xml";
    ".vsixmanifest"= "text/xml";
    ".vsmdi"= "application/xml";
    ".vspscc"= "text/plain";
    ".vss"= "application/vnd.visio";
    ".vsscc"= "text/plain";
    ".vssettings"= "text/xml";
    ".vssscc"= "text/plain";
    ".vst"= "application/vnd.visio";
    ".vstemplate"= "text/xml";
    ".vsto"= "application/x-ms-vsto";
    ".vsw"= "application/vnd.visio";
    ".vsx"= "application/vnd.visio";
    ".vtx"= "application/vnd.visio";
    ".wav"= "audio/wav";
    ".wave"= "audio/wav";
    ".wax"= "audio/x-ms-wax";
    ".wbk"= "application/msword";
    ".wbmp"= "image/vnd.wap.wbmp";
    ".wcm"= "application/vnd.ms-works";
    ".wdb"= "application/vnd.ms-works";
    ".wdp"= "image/vnd.ms-photo";
    ".webarchive"= "application/x-safari-webarchive";
    ".webm"= "video/webm";
    ".webp"= "image/webp";
    ".webtest"= "application/xml";
    ".wiq"= "application/xml";
    ".wiz"= "application/msword";
    ".wks"= "application/vnd.ms-works";
    ".WLMP"= "application/wlmoviemaker";
    ".wlpginstall"= "application/x-wlpg-detect";
    ".wlpginstall3"= "application/x-wlpg3-detect";
    ".wm"= "video/x-ms-wm";
    ".wma"= "audio/x-ms-wma";
    ".wmd"= "application/x-ms-wmd";
    ".wmf"= "application/x-msmetafile";
    ".wml"= "text/vnd.wap.wml";
    ".wmlc"= "application/vnd.wap.wmlc";
    ".wmls"= "text/vnd.wap.wmlscript";
    ".wmlsc"= "application/vnd.wap.wmlscriptc";
    ".wmp"= "video/x-ms-wmp";
    ".wmv"= "video/x-ms-wmv";
    ".wmx"= "video/x-ms-wmx";
    ".wmz"= "application/x-ms-wmz";
    ".woff"= "application/font-woff";
    ".wpl"= "application/vnd.ms-wpl";
    ".wps"= "application/vnd.ms-works";
    ".wri"= "application/x-mswrite";
    ".wrl"= "x-world/x-vrml";
    ".wrz"= "x-world/x-vrml";
    ".wsc"= "text/scriptlet";
    ".wsdl"= "text/xml";
    ".wvx"= "video/x-ms-wvx";
    ".x"= "application/directx";
    ".xaf"= "x-world/x-vrml";
    ".xaml"= "application/xaml+xml";
    ".xap"= "application/x-silverlight-app";
    ".xbap"= "application/x-ms-xbap";
    ".xbm"= "image/x-xbitmap";
    ".xdr"= "text/plain";
    ".xht"= "application/xhtml+xml";
    ".xhtml"= "application/xhtml+xml";
    ".xla"= "application/vnd.ms-excel";
    ".xlam"= "application/vnd.ms-excel.addin.macroEnabled.12";
    ".xlc"= "application/vnd.ms-excel";
    ".xld"= "application/vnd.ms-excel";
    ".xlk"= "application/vnd.ms-excel";
    ".xll"= "application/vnd.ms-excel";
    ".xlm"= "application/vnd.ms-excel";
    ".xls"= "application/vnd.ms-excel";
    ".xlsb"= "application/vnd.ms-excel.sheet.binary.macroEnabled.12";
    ".xlsm"= "application/vnd.ms-excel.sheet.macroEnabled.12";
    ".xlsx"= "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    ".xlt"= "application/vnd.ms-excel";
    ".xltm"= "application/vnd.ms-excel.template.macroEnabled.12";
    ".xltx"= "application/vnd.openxmlformats-officedocument.spreadsheetml.template";
    ".xlw"= "application/vnd.ms-excel";
    ".xml"= "text/xml";
    ".xmta"= "application/xml";
    ".xof"= "x-world/x-vrml";
    ".XOML"= "text/plain";
    ".xpm"= "image/x-xpixmap";
    ".xps"= "application/vnd.ms-xpsdocument";
    ".xrm-ms"= "text/xml";
    ".xsc"= "application/xml";
    ".xsd"= "text/xml";
    ".xsf"= "text/xml";
    ".xsl"= "text/xml";
    ".xslt"= "text/xml";
    ".xsn"= "application/octet-stream";
    ".xss"= "application/xml";
    ".xspf"= "application/xspf+xml";
    ".xtp"= "application/octet-stream";
    ".xwd"= "image/x-xwindowdump";
    ".z"= "application/x-compress";
    ".zip"= "application/zip";
}

#endregion

#***************************************************************************#

#####  #####  #####  ###  ##### #####     #####  #   #  #####  #####  #   #
#      #      #   #   #   #   #   #       #      ##  #    #    #   #   # #
#####  #      ####    #   #####   #       ####   # # #    #    ####     #
    #  #      #  #    #   #       #       #      #  ##    #    #  #     #
#####  #####  #   #  ###  #       #       #####  #   #    #    #   #    #

#***************************************************************************#

#
# Start logging
#
if (!$options.taskModeStdOut) {
    LogMessage "----------------------------------------------------------------" "darkblue" $true
    LogMessage " App Publisher PowerShell Script" "darkblue" $true
    LogMessage "   Version   : $APPPUBLISHERVERSION" "cyan" $true
    LogMessage "   Author    : Scott Meesseman" "cyan" $true
}

#
# Define some local vars that should not be reset on multiple runs past the first one
#
$VERSIONSYSTEM = ""
$CURRENTVERSION = ""
$VERSION = ""

#
# Publish runs!
#
for ($RUN = 1; $RUN -le $NUMRUNS; $RUN++) {

#
# PATHTOROOT - Set this variable to:
#
#     A relative or full path that will equate to the project root as seen from the 
#     script's location.  For example, if this script is in PROJECTDIR\script, then 
#     the rel path to root would be "..".  If the script is in PROJECTDIR\install\script,
#     then the rel path to root would be "..\.."
#
# $DEPLOYFILE = "install\deploy.xml"
# $CREATEINSTALLFILE = "install\createinstall.xml"
#
# The value should be relative to the script dir, dont use a full path as this will not
# share across users well keeping project files in different directories
#
$PATHTOROOT = "."
if ($options.pathToRoot) {
    $PATHTOROOT = $options.pathToRoot
}    
# Set location to root
#
set-location -Path $PATHTOROOT
$CWD = Get-Location

#
# Merge xRuns object properties into options for additional runs
#
if ($RUN -gt 1) 
{
    $XRUNS[$RUN-2].psobject.Properties | ForEach-Object {
        $options | Add-Member -MemberType $_.MemberType -Name $_.Name -Value $_.Value -Force
    }
    if (!$options.taskModeStdOut) {
        LogMessage "----------------------------------------------------------------" "darkblue" $true
    }
}

if (!$options.taskModeStdOut) {
    LogMessage "   Run #     : $RUN of $NUMRUNS" "cyan" $true
    LogMessage "   Directory : $CWD" "cyan" $true
    LogMessage "----------------------------------------------------------------" "darkblue" $true
}

#region Merge Run

#
# Merge republish
#
if ($options.republish -and $options.republish.Count -gt 0)
{
    #
    # Set everything to OFF and then apply the republish config
    #
    if ($options.distRelease) {
        $options.distRelease = "N"
    }
    if ($options.emailNotification) {
        $options.emailNotification = "N"
    }
    if ($options.githubRelease) {
        $options.githubRelease = "N"
    }
    if ($options.mantisbtRelease) {
        $options.mantisbtRelease = "N"
    }
    if ($options.npmRelease) {
        $options.npmRelease = "N"
    }
    if ($options.nugetRelease) {
        $options.nugetRelease = "N"
    }
    if ($options.buildCommand) {
        $options.buildCommand = @()
    }
    if ($options.deployCommand) {
        $options.deployCommand = @()
    }
    if ($options.preBuildCommand) {
        $options.preBuildCommand = @()
    }
    if ($options.postBuildCommand) {
        $options.postBuildCommand = @()
    }
    if ($options.postReleaseCommand) {
        $options.postReleaseCommand = @()
    }
    if ($options.preCommitCommand) {
        $options.preCommitCommand = @()
    }
    if ($options.postCommitCommand) {
        $options.postCommitCommand = @()
    }
    if ($options.mantisbtReleasePreCommand) {
        $options.mantisbtReleasePreCommand = @()
    }
    if ($options.mantisbtReleasePostCommand) {
        $options.mantisbtReleasePostCommand = @()
    }
    if ($options.npmReleasePreCommand) {
        $options.npmReleasePreCommand = @()
    }
    if ($options.npmReleasePostCommand) {
        $options.npmReleasePostCommand = @()
    }
    if ($options.githubReleasePreCommand) {
        $options.githubReleasePreCommand = @()
    }
    if ($options.githubReleasePostCommand) {
        $options.githubReleasePostCommand = @()
    }
    if ($options.distReleasePreCommand) {
        $options.distReleasePreCommand = @()
    }
    if ($options.distReleasePostCommand) {
        $options.distReleasePostCommand = @()
    }
    $options.republish.psobject.Properties | ForEach-Object {
        $options | Add-Member -MemberType $_.MemberType -Name $_.Name -Value $_.Value -Force
    }
}

#endregion

#*********************************************************************************************#

#####  ##   ##  ###      #     ###  #   #  #####    #####    #    #####    #     ##   ##  #####
#      # # # #  #  #     #      #   ##  #  #        #   #   # #   #   #   # #    # # # #  #
#      #  #  #  #   #    #      #   # # #  ####     #####  #####  ####   #####   #  #  #  #####
#      #     #  #  #     #      #   #  ##  #        #      #   #  #  #   #   #   #     #      #
#####  #     #  ###      ####  ###  #   #  #####    #      #   #  #   #  #   #   #     #  #####

#*********************************************************************************************#

#region Command Line Arguments

#region  NON-TASK RELATED ARGUMENTS

#
# Name of the project.  This must macth throughout the build files and the SVN project name
#
$PROJECTNAME = ""
if ($options.projectName) {
    $PROJECTNAME = $options.projectName
}
#
#
#
$BRANCH = ""
if ($options.branch) {
    $BRANCH = $options.branch
}
#
#
#
$BUGS = ""
if ($options.bugs) {
    $BUGS = $options.bugs
}
#
# The build command(s) to run once versions have been updated in version files (i.e. package.json,
# history.txt, assemblyinfo.cs, etc)
#
$BUILDCOMMAND = @()
if ($options.buildCommand) {
    $BUILDCOMMAND = $options.buildCommand
}
#
# The location of this changelog file, can be a relative or full path.
#
$CHANGELOGFILE = ""
if ($options.changelogFile) {
    $CHANGELOGFILE = $options.changelogFile
}
#
# Commit message mapping
#
$COMMITMSGMAP = $null
if ($options.commitMsgMap) {
    $COMMITMSGMAP = $options.commitMsgMap
    $ClsCommitAnalyzer.CommitMap = $COMMITMSGMAP
    $ClsHistoryFile.CommitMap = $COMMITMSGMAP
}
#
#
#
$CPROJECTRCFILE = ""
if ($options.cProjectRcFile) {
    $CPROJECTRCFILE = $options.cProjectRcFile
}
#
# App Publisher publishrc can define version, set current version to version
# defined 
#
if ($RUN -eq 1) {
    $CURRENTVERSION = ""
    $APPPUBLISHERVERSION = $false
    if ($options.version) {
        $CURRENTVERSION = $options.version
        $APPPUBLISHERVERSION = $true
    }
}
#
# The deploy command(s) to run once internal deployment has been completed
#
$DEPLOYCOMMAND = @()
if ($options.deployCommand) {
    $DEPLOYCOMMAND = $options.deployCommand
}
#
# To build the dist release, set this flag to "Y"
#
$DISTRELEASE = "N"
if ($options.distRelease) {
    $DISTRELEASE = $options.distRelease
}
#
# distAddAllToVC
#
$DISTADDALLTOVC = "N"
if ($options.distAddAllToVC) {
    $DISTADDALLTOVC = $options.distAddAllToVC
}
#
$DISTDOCPATH = ""
if ($options.distDocPath) {
    $DISTDOCPATH = $options.distDocPath
}
##
$DISTDOCPATHSRC = ""
if ($options.distDocPathSrc) {
    $DISTDOCPATHSRC = $options.distDocPathSrc
}
#
$DISTRELEASEPATH = ""
if ($options.distReleasePath) {
    $DISTRELEASEPATH = $options.distReleasePath
}
#
# Dry run
#
# In Dry run, the following holds:
#
#     1) Build scripts are not run, if specified (by default, they are ran)
#     2) Dist release upload/deploy is not performed
#     2) Deploy scripts are not run
#     3) Email notification will be sent only to $TESTEMAILRECIP
#     4) Commit package/build file changes (svn) are not made
#     5) Version tag (svn) is not made
#
# Some local files may be changed in dryrun mode (i.e. updated version numbers in build and
# package files).  These changes should be reverted to original state via SCM
#
$DRYRUN = $false
if ($options.dryRun) {
    $DRYRUN = $options.dryRun
}
#
$DRYRUNVCREVERT = "Y"
if ($options.dryRunVcRevert) {
    $DRYRUNVCREVERT = $options.dryRunVcRevert
}
#
# NOTIFICATION EMAIL CONFIG OPTIONS
#
$EMAILNOTIFICATION = "Y"
if ($options.emailNotification) {
    $EMAILNOTIFICATION = $options.emailNotification
}
#
$EMAILSERVER = ""
if ($options.emailServer) {
    $EMAILSERVER = $options.emailServer
}
#
$EMAILRECIP = @()
if ($options.emailRecip) {
    $EMAILRECIP = $options.emailRecip
}
#
$EMAILSENDER = ""
if ($options.emailSender) {
    $EMAILSENDER = $options.emailSender
}
#
# Email Mode
#
$EMAILMODE = ""
if ($options.emailMode) {
    $EMAILMODE = $options.emailMode
}
#
# Email port
#
$EMAILPORT = 25
if ($options.emailPort) {
    $EMAILPORT = $options.emailPort
}
#
#
#
$EMAILHREFS = @()
if ($options.emailHrefs) {
    $EMAILHREFS = $options.emailHrefs
}
if ($EMAILHREFS -is [system.string])
{
    $EMAILHREFS = @($EMAILHREFS); #convert to array
}
#
# GITHUB RELEASE CONFIG OPTIONS
#
$GITHUBRELEASE = "N"
if ($options.githubRelease) {
    $GITHUBRELEASE = $options.githubRelease
}
#
#
#
$GITHUBUSER = ""
if ($options.githubUser) {
    $GITHUBUSER = $options.githubUser
}
#
# Changelog edit
#
$GITHUBCHGLOGEDIT = "N"
if ($options.githubChglogEdit) {
    $GITHUBCHGLOGEDIT = $options.githubChglogEdit
}
#
#
#
$GITHUBASSETS = @()
if ($options.githubAssets) {
    $GITHUBASSETS = $options.githubAssets
}
#
# The location of this history file, can be a relative or full path.
#
$HISTORYFILE = ""
if ($options.historyFile) {
    $HISTORYFILE = $options.historyFile
}
#
$HISTORYHDRFILE = ""
if ($options.historyHdrFile) {
    $HISTORYHDRFILE = $options.historyHdrFile
}
#
$HISTORYLINELEN = 80
if ($options.historyLineLen) {
    $HISTORYLINELEN = $options.historyLineLen
}
#
$HISTORYHREF = 80
if ($options.historyHref) {
    $HISTORYHREF = $options.historyHref
}
#
# Homepage (package.json property)
#
$HOMEPAGE = ""
if ($options.homePage) {
    $HOMEPAGE = $options.homePage
}
#
# For MantisBT Plugin Releases
#
$MANTISBTPLUGIN = ""
if ($options.mantisbtPlugin) {
    $MANTISBTPLUGIN = $options.mantisbtPlugin
}
#
# MantisBT Release
#
$MANTISBTRELEASE = "N"
if ($options.mantisbtRelease) {
    $MANTISBTRELEASE = $options.mantisbtRelease
}
#
# MantisBT Changelog edit
#
$MANTISBTCHGLOGEDIT = "N"
if ($options.mantisbtChglogEdit) {
    $MANTISBTCHGLOGEDIT = $options.mantisbtChglogEdit
}
#
# MantisBT API Token
#
$MANTISBTAPITOKEN = @()
if ($options.mantisbtApiToken) {
    $MANTISBTAPITOKEN = $options.mantisbtApiToken
    if ($MANTISBTAPITOKEN -is [system.string])
    {
        if (![string]::IsNullOrEmpty($MANTISBTAPITOKEN)) {
            $MANTISBTAPITOKEN = @($MANTISBTAPITOKEN); #convert to array
        }
        else {
            $MANTISBTAPITOKEN = @()
        }
    }
}
if ([string]::IsNullOrEmpty($MANTISBTAPITOKEN)) {
    if (![string]::IsNullOrEmpty(${Env:MANTISBT_API_TOKEN})) {
        $MANTISBTAPITOKEN = @( ${Env:MANTISBT_API_TOKEN} )
    }
}
#
# MantisBT Project Name
#
$MANTISBTPROJECT = $PROJECTNAME
if ($options.mantisbtProject) {
    $MANTISBTPROJECT = $options.mantisbtProject
}
#
# MantisBT URL
#
$MANTISBTURL = @()
if ($options.mantisbtUrl) {
    $MANTISBTURL = $options.mantisbtUrl
    if ($MANTISBTURL -is [system.string])
    {
        if (![string]::IsNullOrEmpty($MANTISBTURL)) {
            $MANTISBTURL = @($MANTISBTURL); #convert to array
        }
        else {
            $MANTISBTURL = @()
        }
    }
    for ($i = 0; $i -lt $MANTISBTURL.Length; $i++)
    {
        if ($MANTISBTURL[$i].EndsWith("/")) {
            $MANTISBTURL[$i] = $MANTISBTURL[$i].Substring(0, $MANTISBTURL[$i].Length - 1);
        }
    }
}
#
# MantisBT Release Assets
#
$MANTISBTASSETS = @()
if ($options.mantisbtAssets) {
    $MANTISBTASSETS = $options.mantisbtAssets
}
#
# NPM Registry
#
$NPMREGISTRY = "https://registry.npmjs.org"
if ($options.npmRegistry) {
    $NPMREGISTRY = $options.npmRegistry
}
#
$NPMRELEASE = "N"
if ($options.npmRelease) {
    $NPMRELEASE = $options.npmRelease
}
#
$NPMSCOPE = ""
if ($options.npmScope) {
    $NPMSCOPE = $options.npmScope
}
#
$NPMPACKDIST = "Y"
if ($options.npmPackDist) {
    $NPMPACKDIST = $options.npmPackDist
}
#
# To build the nuget release, set this flag to "Y"
#
$NUGETRELEASE = "N"
if ($options.nugetRelease) {
    $NUGETRELEASE = $options.nugetRelease
}
#
$NUGETREGISTRY = "https://registry.nuget.org"
if ($options.nugetRegistry) {
    $NUGETREGISTRY = $options.nugetRegistry
}
#
# This in most cases sould be an empty string if the project is the 'main' project.  If
# a sub-project exists within a main project in SVN, then this needs to be set to the 
# relative directory to the main project root, as seen from the sub-project root.
#
# Note this should be where the '.svn' folder resides.
#
$PATHTOMAINROOT = ""
if ($options.pathToMainRoot) {
    $PATHTOMAINROOT = $options.pathToMainRoot
}
#
# Path to DIST should be relative to PATHTOROOT
#
$PATHTODIST = "install\\dist"
if ($options.pathToDist) {
    $PATHTODIST = $options.pathToDist
}
#
# This in most cases sould be an empty string if the project is the 'main' project.  If
# a sub-project exists within a main project in SVN, then this needs to be set to the 
# relative directory to the project path, as seen from the main project root.
#
# For example, the following project contains a layout with 3 separate projects 'fp', 'ui', 
# and 'svr':
#
#     GEMS2
#         app
#             fpc
#             svr
#             ui
#
# The main project root is GEMS2.  In the case of each of these projects, SVNPREPATH should
# be set to app\fpc, app\ui, or app\svr, for each specific sub-project.
#
# This mainly is be used for SVN commands which need to be ran in the directory containing
# the .svn folder.
#
$PATHPREROOT = ""
if ($options.pathPreRoot) {
    $PATHPREROOT = $options.pathPreRoot
}
#
# The build command(s) to after the internal builds have been completed
#
$POSTBUILDCOMMAND = @()
if ($options.postBuildCommand) {
    $POSTBUILDCOMMAND = $options.postBuildCommand
}
#
# The build command(s) to after the internal builds have been completed
#
$PREBUILDCOMMAND = @()
if ($options.preBuildCommand) {
    $PREBUILDCOMMAND = $options.preBuildCommand
}
#
# The build command(s) to before changes are committed to version control
#
$PRECOMMITCOMMAND = @()
if ($options.preCommitCommand) {
    $PRECOMMITCOMMAND = $options.preCommitCommand
}
#
# The build command(s) to after changes are committed to version control
#
$POSTCOMMITCOMMAND = @()
if ($options.postCommitCommand) {
    $POSTCOMMITCOMMAND = $options.postCommitCommand
}
#
# The build command(s) to before a dist release is made
#
$DISTRELEASEPRECOMMAND = @()
if ($options.distReleasePreCommand) {
    $DISTRELEASEPRECOMMAND = $options.distReleasePreCommand
}
#
# The build command(s) to after a dist release is made
#
$DISTRELEASEPOSTCOMMAND = @()
if ($options.distReleasePostCommand) {
    $DISTRELEASEPOSTCOMMAND = $options.distReleasePostCommand
}
#
# The build command(s) to before a mantis release is made
#
$mantisbtReleasePreCommand = @()
if ($options.mantisbtReleasePreCommand) {
    $mantisbtReleasePreCommand = $options.mantisbtReleasePreCommand
}
#
# The build command(s) to after a mantis release is made
#
$mantisbtReleasePostCommand = @()
if ($options.mantisbtReleasePostCommand) {
    $mantisbtReleasePostCommand = $options.mantisbtReleasePostCommand
}
#
# The build command(s) to before a npm release is made
#
$NPMRELEASEPRECOMMAND = @()
if ($options.npmReleasePreCommand) {
    $NPMRELEASEPRECOMMAND = $options.npmReleasePreCommand
}
#
# The build command(s) to after a npm release is made
#
$NPMRELEASEPOSTCOMMAND = @()
if ($options.npmReleasePostCommand) {
    $NPMRELEASEPOSTCOMMAND = $options.npmReleasePostCommand
}
#
# The build command(s) to before a Github release is made
#
$GITHUBRELEASEPRECOMMAND = @()
if ($options.githubReleasePreCommand) {
    $GITHUBRELEASEPRECOMMAND = $options.githubReleasePreCommand
}
#
# The build command(s) to after a Github release is made
#
$GITHUBRELEASEPOSTCOMMAND = @()
if ($options.githubReleasePostCommand) {
    $GITHUBRELEASEPOSTCOMMAND = $options.githubReleasePostCommand
}
#
# The build command(s) to after the internal builds have been completed
#
$POSTRELEASECOMMAND = @()
if ($options.postReleaseCommand) {
    $POSTRELEASECOMMAND = $options.postReleaseCommand
}
#
# Prompt for version after extracting what we think should be the next version
# This was the 'interactive' property prior to v 1.21.
#
$PROMPTVERSION = "N"
if ($options.prompt) {
    $PROMPTVERSION = $options.prompt
}
elseif ($options.promptVersion) {
    $PROMPTVERSION = $options.promptVersion
}
elseif ($options.interactive) { # for backwards compat
    $PROMPTVERSION = $options.interactive
}
#
# Repository url
#
$REPO = ""
if ($options.repo) {
    $REPO = $options.repo
}
#
# Repository type - svn or git
#
$REPOTYPE = ""
if ($options.repoType) {
    $REPOTYPE = $options.repoType
}
#
#
#
$REPUBLISH = @{}
if ($options.republish) {
    $REPUBLISH = $options.republish
}
#
# Skip changelog edits (ci)
#
$SKIPCHANGELOGEDITS = "N"
if ($options.skipChangelogEdits) {
    $SKIPCHANGELOGEDITS = $options.skipChangelogEdits
}
#
# Skip uploading dist files to dist release folder (primarily used for releasing
# from home office where two datacenters cannot be reached at the same time, in this
# case the installer files are manually copied)
#
$SKIPDEPLOYPUSH = "N"
if ($options.skipDeployPush) {
    $SKIPDEPLOYPUSH = $options.skipDeployPush
}
#
# Skip version edits (notepad/notepad++ window)
#
$SKIPVERSIONEDITS = "N"
if ($options.skipVersionEdits) {
    $SKIPVERSIONEDITS = $options.skipVersionEdits
}
#
# Email recipients to use when a dry run is being performed (overrides emailRecip)
#
$TESTEMAILRECIP = @()
if ($options.testEmailRecip) {
    $TESTEMAILRECIP = $options.testEmailRecip
}
#
# Text Editor preference
#
$TEXTEDITOR = ""
if ($options.textEditor) {
    $TEXTEDITOR = $options.textEditor
}
#
# Whether or not to tag the new version in SVN.  Default is Yes.
#
$VCTAG = "Y"
if ($options.vcTag) {
    $VCTAG = $options.vcTag
}
#
# Tag prefix - to be used for "sub-projects" within a main project
#
$VCTAGPREFIX = ""
if ($options.vcTagPrefix) {
    $VCTAGPREFIX = $options.vcTagPrefix
}
#
# The format to use for tag name, input should be in the following form:
#
#     tagFormat: v${version}
#
$VCTAGFORMAT = ""
if ($options.tagFormat) {
    $VCTAGFORMAT = $options.tagFormat
}
#
# The path to the web viewer for version control
#
# WebSVN example:
#
#     https://websvn.domain.com/filedetails.php?repname=reponame&path=%2Fapp-publisher%2Ftrunk%2Fdoc%2Fhistory.txt&usemime=1
#
# GitHub example:
#
#     https://github.com/username/projectname/master/raw/filename.ext
#
$VCWEBPATH = ""
if ($options.vcWebPath) {
    $VCWEBPATH = $options.vcWebPath
}
if (![string]::IsNullOrEmpty($VCWEBPATH))
{
    if ($VCWEBPATH.EndsWith("/")) {
        $VCWEBPATH = $VCWEBPATH.Substring(0, $VCWEBPATH.Length - 1);
    }
}
#
# Array of files that are to be checked into version control (in addition to any files touched
# by the publish run)
#
$VCFILES = @()
if ($options.vcFiles) {
    $VCFILES = $options.vcFiles
    if ($VCFILES -is [system.string] -and ![string]::IsNullOrEmpty($VCFILES))
    {
        $VCFILES = @($VCFILES); #convert to array
    }
}
#
# Array of files that will have version number text replacements
#
$VERSIONFILES = @()
if ($options.versionFiles) {
    $VERSIONFILES = $options.versionFiles
}
#
#
#
$VERSIONFILESEDITALWAYS = @()
if ($options.versionFilesEditAlways) {
    $VERSIONFILESEDITALWAYS = $options.versionFilesEditAlways
}
#
#
#
$VERSIONFILESSCROLLDOWN = @()
if ($options.versionFilesScrollDown) {
    $VERSIONFILESSCROLLDOWN = $options.versionFilesScrollDown
}
#
# Version pre-release identifier
#
$VERSIONPRERELEASEID = ""
if (![string]::IsNullOrEmpty($options.versionPreReleaseId)) {
    $VERSIONPRERELEASEID = $options.versionPreReleaseId
}
#
# Whether or not to tag the new version in SVN.  Default is Yes.
#
$VERSIONFORCECURRENT = $false
if (![string]::IsNullOrEmpty($options.versionForceCurrent)) {
    $VERSIONFORCECURRENT = $true
    $CURRENTVERSION = $options.versionForceCurrent
}
#
# Whether or not to tag the new version in SVN.  Default is Yes.
#
$VERSIONFORCENEXT = $false
if (![string]::IsNullOrEmpty($options.versionForceNext)) {
    $VERSIONFORCENEXT = $true
    $VERSION = $options.versionForceNext
}
elseif (![string]::IsNullOrEmpty($options.versionForce)) {
    $VERSIONFORCENEXT = $true
    $VERSION = $options.versionForce
}
#
#
#
$VERSIONREPLACETAGS = @()
if ($options.versionReplaceTags) {
    $VERSIONREPLACETAGS = $options.versionReplaceTags
}
#
# The text tag to use in the history file for preceding the version number.  It should 
# be one of the following:
#
#     1. Version
#     2. Build
#     3. Release
#
$VERSIONTEXT = "Version"
if ($options.versionText) {
    $VERSIONTEXT = $options.versionText
}
#
# Whether or not to write stdout to log file.  Default is No
#
$WRITELOG = "N"
if ($options.writeLog) {
    $WRITELOG = $options.writeLog
}

#
# Set flag whether or not this is app-publisher, we run npm commands differently for
# this project since it is running a publish run on itself
#
$IsAppPublisher = $false
if ($PROJECTNAME -eq "app-publisher" -and $options.isNodeJsEnv) {
    $IsAppPublisher = $true
}

#
# Define some local vars
#
$SKIPCOMMIT = "N"
$COMMITS = @()
$TDATE = ""


#
# Define a variable to track changed files for check-in to SVN
# This will be a space delimited list of quoted strings/paths
#
$VCCHANGELIST = ""
$VCCHANGELISTADD = ""
$VCCHANGELISTRMV = ""
$VCCHANGELISTMLT = ""
#
# Add any user defined files from config publishrc
#
if ($VCFILES.Length -gt 0)
{
    foreach ($File in $VCFILES) 
    {
        if (Test-Path($File)) 
        {
            $VcFile = $File
            #
            # If pathPreRoot is set, then prepend the named file with the preroot path
            # This is used since the final commit is run from the directory containing the .svn/.git dir
            #
            if (![string]::IsNullOrEmpty($PATHPREROOT)) {
                $VcFile = Join-Path -Path "$PATHPREROOT" -ChildPath "$File"
            }
            $VCCHANGELIST = "$VCCHANGELIST `"$VcFile`""
        }
        else {
            LogMessage "Specified file $File for version control addition does not exist" "red"
            exit 1
        }
    }
}

#endregion

#region Task Related Command Line Arguments

#
# TASK RELATED ARGUMENTS
#
# *IMPORTANT*
# Any new args added need to be included in the setting of the $TASKMODE flag
# at the bottom of this region
#

$TASKEMAIL = $false
if ($options.taskEmail) {
    $TASKEMAIL = $options.taskEmail
}
if ($TASKEMAIL -eq "Y") {
    $TASKEMAIL = $true
    $EMAILNOTIFICATION = "Y"
}
#
# Changelog file only
#
$TASKCHANGELOG = $false
$TASKCHANGELOGVIEW = $false
$TASKCHANGELOGFILE = ""
if ($options.taskChangelog) {
    $TASKCHANGELOG = $options.taskChangelog
}
if ($options.taskChangelogView) {
    $TASKCHANGELOG = $true
    $TASKCHANGELOGVIEW = $true
}
if (![string]::IsNullOrEmpty($options.taskChangelogFile))
{
    if (!$TASKCHANGELOGVIEW)
    {
        $TASKCHANGELOG = $true
        $TASKCHANGELOGFILE = $options.taskChangelogFile
    }
    else {
        LogMessage "The '--task-changelog-view' option overrides '--task-changelog-file'" "yellow"
    }
}
if ($TASKCHANGELOG)
{
    $hFileSpecified = ![string]::IsNullOrEmpty($HISTORYFILE);
    $cFileSpecified = ![string]::IsNullOrEmpty($CHANGELOGFILE);
    if (!$hFileSpecified -and !$cFileSpecified)
    {   #
        # Attempt to find a history.txt file
        #
        $hFileLoc = Get-ChildItem -Name -Recurse -Depth 1 -Filter "history.txt" -File -Path "$PATHTOROOT/doc" -ErrorAction SilentlyContinue
        if ($hFileLoc -is [system.string] -and ![string]::IsNullOrEmpty($hFileLoc))
        {
            $HISTORYFILE = $hFileLoc
        }
        else {
            $cFileLoc = Get-ChildItem -Name -Recurse -Depth 1 -Filter "changelog.md" -File -Path "$PATHTOROOT/doc" -ErrorAction SilentlyContinue
            if ($cFileLoc -is [system.string] -and ![string]::IsNullOrEmpty($cFileLoc))
            {
                $HISTORYFILE = $cFileLoc
            }
        }

        $hFileSpecified = ![string]::IsNullOrEmpty($HISTORYFILE);
        $cFileSpecified = ![string]::IsNullOrEmpty($CHANGELOGFILE);

        if (!$hFileSpecified -and !$cFileSpecified) {
            LogMessage "Specified a 'changelog' task, but no changelog or history file is configured or could be found" "red"
            LogMessage "   A valid changelog file must configured using the 'historyFile' or 'changelogFile' publishrc properties" "red"
            exit 1
        }
    }
}
#
# Get current and next version.  Gets output to stdout inthe form 'current|next'
#
$TASKCIENVINFO = $false
if ($options.taskCiEnvInfo) {
    $TASKCIENVINFO= $true
}
#
# Set CI Envoronment task
#
$TASKCIENVSET = $false
if ($options.taskCiEnvSet)
{
    $TASKCIENVSET = $true
}
#
# MantisBT Release ONLY - individual task mode
#
$TASKMANTISBT = $false
if ($options.taskMantisbtRelease) {
    if (![string]::IsNullOrEmpty($MANTISBTURL) -and ![string]::IsNullOrEmpty($MANTISBTAPITOKEN))
    {
        $TASKMANTISBT = $true
        $MANTISBTRELEASE = "Y"
        if (!$options.noCi) {
            $MANTISBTCHGLOGEDIT = "N"
        }
    }
    else {
        LogMessage "Specified task 'mantis release' but not configured in .publishrc" "red"
        LogMessage "   A valid URL and token must be configured" "red"
        exit 1
    }
}
#
# Get current version
#
$TASKVERSIONCURRENT = $false
if ($options.taskVersionCurrent) {
    $TASKVERSIONCURRENT = $true
}
#
# Get next version
#
$TASKVERSIONNEXT = $false
if ($options.taskVersionNext) {
    $TASKVERSIONNEXT = $true
}

#
# Version pre-release identifier
#
$TASKVERSIONPRERELEASEID = ""
if (![string]::IsNullOrEmpty($options.taskVersionPreReleaseId)) {
    $TASKVERSIONPRERELEASEID = $options.taskVersionPreReleaseId
}
#
# Get current and next version.  Gets output to stdout inthe form 'current|next'
#
$TASKVERSIONINFO = $false
if ($options.taskVersionInfo) {
    $TASKVERSIONINFO= $true
}
#
# Need to check TASKCOMMIT with TASKTOUCHVERSIONS
# Touch version files w/ new/next version
#
$TASKTOUCHVERSIONS = $false
$TASKCOMMIT = $false
if ($options.taskTouchVersions) {
    $TASKTOUCHVERSIONS = $true
}
if ($options.taskCommit) {
    $TASKCOMMIT = $true
    $TASKTOUCHVERSIONS = $true
}
#
# Task TAG
# Need to check TASKTAG with TASKTOUCHVERSIONS
#
$TASKTAG = $false
if (![string]::IsNullOrEmpty($options.taskTag)) {
    $TASKTAG = $true
    if ($options.taskTag -ne "auto") {
        $VERSION = $options.taskTag
    }
}

#
# Single task mode flag to skip most of the functionality in the publisher chain except for
# the particular task that is going to be ran.
#
$TASKMODE = $TASKCHANGELOG -or $TASKEMAIL -or $TASKTOUCHVERSIONS -or $TASKMANTISBT -or $TASKVERSIONCURRENT -or $TASKTAG -or
            $TASKVERSIONNEXT -or $TASKCIENVSET -or $TASKVERSIONINFO -or $TASKCIENVINFO -or $TASKVERSIONPRERELEASEID
$TASKMODESTDOUT = $options.taskModeStdOut

#endregion


#********************************************************************************************************************#

#####  #   #  ###      #####  ##   ##  ###      #     ###  #   #  #####    #####    #    #####    #     ##   ##  #####
#      ##  #  #  #     #      # # # #  #  #     #      #   ##  #  #        #   #   # #   #   #   # #    # # # #  #
####   # # #  #   #    #      #  #  #  #   #    #      #   # # #  ####     #####  #####  ####   #####   #  #  #  #####
#      #  ##  #  #     #      #     #  #  #     #      #   #  ##  #        #      #   #  #  #   #   #   #     #      #
#####  #   #  ###      #####  #     #  ###      ####  ###  #   #  #####    #      #   #  #   #  #   #   #     #  #####

#********************************************************************************************************************#

#endregion

#region Command Line Arguments Validation

#
# A flag to set if the build commands are run, which technically could happen up
# to 3 times if distRelease, npmRelease, and nugetRelease command line
# params are all set to "Y"
#
$BuildCmdsRun = @()
$VersionFilesEdited = @()

#
# If root path is empty then set to "." , by default its "." but just in case
# user sets to empty string in config
#
if ([string]::IsNullOrEmpty($PATHTOROOT)) {
    $PATHTOROOT = "."
}

#
# Set a default NPM registry if necessary
#
if ([string]::IsNullOrEmpty($NPMREGISTRY)) {
    $NPMREGISTRY = "https://registry.npmjs.org"
}

#
# Set up log file
#
if ($WRITELOG -eq "Y") 
{
    # Determine current date  
    $CurrentDate = Get-Date -format "yyyyMMddHHmmss";
    # Define log file name
    $LogFileName = "${env:LOCALAPPDATA}\app-publisher\log\app-publisher-$CurrentDate.log";
    # Create the log directory
    New-Item -ItemType directory -Force -Path "${env:LOCALAPPDATA}\app-publisher\log" | Out-Null;
}

#
# Set repository and repository type
#
$_Repo = $REPO
$_RepoType = $REPOTYPE
if (Test-Path("package.json"))
{
    if ([string]::IsNullOrEmpty($_Repo))
    {
        LogMessage "Reading repository in package.json"
        if (!$IsAppPublisher) {
            $_Repo = & app-publisher-json -f package.json repository.url
        }
        else {
            $_Repo = & json -f package.json repository.url
        }
        CheckExitCode
        LogMessage "Repository: $_Repo"
    }

    if ([string]::IsNullOrEmpty($_RepoType))
    {
        LogMessage "Saving repository type in package.json"
        if (!$IsAppPublisher) {
            $_RepoType = & app-publisher-json -f package.json repository.type
        }
        else {
            $_RepoType = & json -f package.json repository.type
        }
        CheckExitCode
        LogMessage "Repository Type: $_RepoType"
    }
}
if ([string]::IsNullOrEmpty($_Repo)) {
    LogMessage "Repository must be specified on cmd line, package.json or publishrc" "red"
    exit 1
}
elseif ([string]::IsNullOrEmpty($_RepoType)) {
    LogMessage "Repository type must be specified on cmd line, package.json or publishrc" "red"
    exit 1
}
if ($_RepoType -ne "git" -and $_RepoType -ne "svn")
{
    LogMessage "Invalid repository type, must be 'git' or 'svn'" "red"
    exit 1
}

#
# Branch
#
if ([string]::IsNullOrEmpty($BRANCH)) 
{
    if ($_RepoType -eq "git") 
    {
        LogMessage "Setting branch name to default 'master'" "darkyellow"
        $BRANCH = "master"
    }
    else # if ($_RepoType -eq "svn") 
    {
        LogMessage "Setting branch name to default 'trunk'" "darkyellow"
        $BRANCH = "trunk"
    }
}

#
# SVN repo path
#
if ($_RepoType -eq "svn")
{
    if ($BRANCH -eq "trunk")
    {
        if ($_Repo.IndexOf("trunk") -eq -1)
        {
            if ($_Repo.IndexOf("branches/") -ne -1)
            {
                $_Repo = $_Repo.Substring(0, $_Repo.IndexOf("branches/")) + "trunk";
            }
            else {
                $_Repo = ($_Repo + "/" + $BRANCH).Replace("//", "/");
            }
        }
    }
    else
    {
        if ($_Repo.IndexOf("branches/") -eq -1)
        {
            if ($_Repo.IndexOf("trunk") -ne -1)
            {
                $_Repo = $_Repo.Replace("trunk", "branches/" + $BRANCH);
            }
            else {
                $_Repo = ($_Repo + "/branches/" + $BRANCH).Replace("//", "/");
            }
        }
    }
}

#
# If specified editor doesnt exist, then switch to notepad or pico
#
if (![string]::IsNullOrEmpty($TEXTEDITOR))
{
    if (!(Test-Path($TEXTEDITOR))) 
    {
        $Found = $false;
        $Paths = $Env:Path.Split(";");
        foreach ($Path in $Paths) 
        {
            $FullPath = [Path]::Combine($Path, $TEXTEDITOR)
            if (Test-Path($FullPath)) {
                $Found = $true;
                break;
            }
            $FullPath = [Path]::Combine($Path, "$TEXTEDITOR.exe")
            if (Test-Path($FullPath)) {
                $Found = $true;
                break;
            }
        }
        if (!$Found) {
            if ($TEXTEDITOR.ToLower() -ne "notepad" -and $TEXTEDITOR.ToLower() -ne "notepad.exe") {
                LogMessage "Text editor not found, falling back to notepad" "magenta"
                $TEXTEDITOR = "notepad"
            }
            else {
                LogMessage "Text editor not found" "red"
                exit 1
            }
        }
    }
}

#
# If PATHTOMAINROOT is set, then PATHPREROOT must be set also, and refer to the same
# mirrored location with respect to project/sub-project directories
#

if (![string]::IsNullOrEmpty($PATHTOMAINROOT) -and [string]::IsNullOrEmpty($PATHPREROOT)) {
    LogMessage "pathPreRoot must be specified with pathToMainRoot" "red"
    exit 1
}

if (![string]::IsNullOrEmpty($PATHPREROOT) -and [string]::IsNullOrEmpty($PATHTOMAINROOT)) {
    LogMessage "pathToMainRoot must be specified with pathPreRoot" "red"
    exit 1
}

#
# Ensure version control directory exists
# $_RepoType is either git or svn
#
if ([string]::IsNullOrEmpty($PATHPREROOT) -and !(Test-Path(".$_RepoType")))
{
    LogMessage "The .$_RepoType directory was not found" "red"
    LogMessage "Set pathToPreRoot, or ensure a branch (i.e. trunk) is the root directory" "red"
    exit 1
}

if (![string]::IsNullOrEmpty($PATHTOMAINROOT)) 
{
    if ([string]::IsNullOrEmpty($PATHPREROOT)) { 
        LogMessage "Invalid value specified for pathPreRoot" "red"
        exit 1
    }
    #
    # Behavior:
    #
    #     pathToMainRoot indicates the path to the root project folder with respect to the 
    #     initial working directory.
    #
    #     pathPreRoot indicates the path back to the initial working directory with respect
    #     to the project root.
    #
    #     Check to ensire this holds true
    #
    $Path1 = Get-Location
    Set-Location $PATHTOMAINROOT
    $Path2 = Get-Location
    $Path2 = [Path]::Combine($Path2, $PATHPREROOT)
    if ($Path1.ToString() -ne $Path2.ToString()) {
        LogMessage "Invalid values specified for pathToMainRoot and pathPreRoot" "red"
        LogMessage "    pathToMainRoot indicates the path to the root project folder with respect to the initial working directory" "red"
        LogMessage "    pathPreRoot indicates the path back to the initial working directory with respect to the project root" "red"
        exit 1
    }
    Set-Location $PATHPREROOT
}

if ($NPMPACKDIST -eq "Y") 
{
    if ([string]::IsNullOrEmpty($PATHTODIST)) {
        LogMessage "You must specify 'pathToDist' if 'npmPackDist' flag is set to Y" "red"
        exit 1
    }
}

if (![string]::IsNullOrEmpty($CURRENTVERSION)) {
    if ($CURRENTVERSION.Contains(".")) {
        $VERSIONSYSTEM = "semver"
    }
    else {
        $VERSIONSYSTEM = "incremental"
    }
}

#
# Convert any Y/N vars to upper case and check validity
#
if (![string]::IsNullOrEmpty($DISTRELEASE)) {
    $DISTRELEASE = $DISTRELEASE.ToUpper()
    if ($DISTRELEASE -ne "Y" -and $DISTRELEASE -ne "N") {
        LogMessage "Invalid value specified for distRelease, accepted values are y/n/Y/N" "red"
        exit 1
    }
}
if (![string]::IsNullOrEmpty($NPMRELEASE)) {
    $NPMRELEASE = $NPMRELEASE.ToUpper()
    if ($NPMRELEASE -ne "Y" -and $NPMRELEASE -ne "N") {
        LogMessage "Invalid value specified for npmRelease, accepted values are y/n/Y/N" "red"
        exit 1
    }
}
if (![string]::IsNullOrEmpty($NUGETRELEASE)) {
    $NUGETRELEASE = $NUGETRELEASE.ToUpper()
    if ($NUGETRELEASE -ne "Y" -and $NUGETRELEASE -ne "N") {
        LogMessage "Invalid value specified for nugetRelease, accepted values are y/n/Y/N" "red"
        exit 1
    }
}
if (![string]::IsNullOrEmpty($GITHUBRELEASE)) {
    $GITHUBRELEASE = $GITHUBRELEASE.ToUpper()
    if ($GITHUBRELEASE -ne "Y" -and $GITHUBRELEASE -ne "N") {
        LogMessage "Invalid value specified for githubRelease, accepted values are y/n/Y/N" "red"
        exit 1
    }
    if ($GITHUBRELEASE -eq "Y")
    {
        if ([string]::IsNullOrEmpty($GITHUBUSER)) {
            LogMessage "You must specify githubUser for a GitHub release type" "red"
            exit 1
        }
        if ([string]::IsNullOrEmpty(${Env:GITHUB_TOKEN})) {
            LogMessage "You must have GITHUB_TOKEN defined in the environment for a GitHub release type" "red"
            LogMessage "Set the environment variable GITHUB_TOKEN using the token value created on the GitHub website" "red"
            exit 1
        }
    }
}
if (![string]::IsNullOrEmpty($MANTISBTPLUGIN)) {
    if (!$MANTISBTPLUGIN.Contains((".php"))) {
        LogMessage "Invalid value for mantisbtPlugin, file must have a php extension" "red"
        exit 1
    }
    if (!(Test-Path($MANTISBTPLUGIN))) {
        LogMessage "Invalid value for mantisbtPlugin, non-existent file specified" "red"
        exit 1
    }
}
if (![string]::IsNullOrEmpty($MANTISBTRELEASE)) {
    $MANTISBTRELEASE = $MANTISBTRELEASE.ToUpper()
    if ($MANTISBTRELEASE -ne "Y" -and $MANTISBTRELEASE -ne "N") {
        LogMessage "Invalid value specified for mantisbtRelease, accepted values are y/n/Y/N" "red"
        exit 1
    }
    if ($MANTISBTRELEASE -eq "Y")
    {
        if ($MANTISBTURL.Length -eq 0) {
            LogMessage "You must specify mantisbtUrl for a MantisBT release type" "red"
            exit 1
        }
        if ($MANTISBTAPITOKEN.Length -eq 0) {
            LogMessage "You must have MANTISBT_API_TOKEN defined for a MantisBT release type" "red"
            LogMessage "-or- you must have mantisbtApiToken defined in publishrc" "red"
            LogMessage "Set the envvar MANTISBT_API_TOKEN or the config mantisApiToken with the token value created on the MantisBT website" "red"
            LogMessage "To create a token, see the `"Tokens`" section of your Mantis User Preferences page" "red"
            exit 1
        }
        if ($MANTISBTURL.Length -ne $MANTISBTAPITOKEN.Length) {
            LogMessage "You must specify the same number of MantisBT urls and API tokens" "red"
            exit 1
        }
    }
}
if (![string]::IsNullOrEmpty($CPROJECTRCFILE)) {
    if (!$CPROJECTRCFILE.Contains((".rc"))) {
        LogMessage "Invalid value for cProjectRcFile, file must have an rc extension" "red"
        exit 1
    }
    if (!(Test-Path($CPROJECTRCFILE))) {
        LogMessage "Invalid value for cProjectRcFile, non-existent file specified" "red"
        exit 1
    }
}
if (![string]::IsNullOrEmpty($SKIPDEPLOYPUSH)) {
    $SKIPDEPLOYPUSH = $SKIPDEPLOYPUSH.ToUpper()
    if ($SKIPDEPLOYPUSH -ne "Y" -and $SKIPDEPLOYPUSH -ne "N") {
        LogMessage "Invalid value specified for skipDeployPush, accepted values are y/n/Y/N" "red"
        exit 1
    }
}
if (![string]::IsNullOrEmpty($DRYRUNVCREVERT)) {
    $DRYRUNVCREVERT = $DRYRUNVCREVERT.ToUpper()
    if ($DRYRUNVCREVERT -ne "Y" -and $DRYRUNVCREVERT -ne "N") {
        LogMessage "Invalid value specified for testModeSvnRevert, accepted values are y/n/Y/N" "red"
        exit 1
    }
}
if (![string]::IsNullOrEmpty($WRITELOG)) {
    $WRITELOG = $WRITELOG.ToUpper()
    if ($WRITELOG -ne "Y" -and $WRITELOG -ne "N") {
        LogMessage "Invalid value specified for writeLog, accepted values are y/n/Y/N" "red"
        exit 1
    }
}
if (![string]::IsNullOrEmpty($PROMPTVERSION)) {
    $PROMPTVERSION = $PROMPTVERSION.ToUpper()
    if ($PROMPTVERSION -ne "Y" -and $PROMPTVERSION -ne "N") {
        LogMessage "Invalid value specified for promptVersion, accepted values are y/n/Y/N" "red"
        exit 1
    }
}
if (![string]::IsNullOrEmpty($VCTAG)) {
    $VCTAG = $VCTAG.ToUpper()
    if ($VCTAG -ne "Y" -and $VCTAG -ne "N") {
        LogMessage "Invalid value specified for svnTag, accepted values are y/n/Y/N" "red"
        exit 1
    }
}
if (![string]::IsNullOrEmpty($SKIPCHANGELOGEDITS)) {
    $SKIPCHANGELOGEDITS = $SKIPCHANGELOGEDITS.ToUpper()
    if ($SKIPCHANGELOGEDITS -ne "Y" -and $SKIPCHANGELOGEDITS -ne "N") {
        LogMessage "Invalid value specified for skipChangelogEdits, accepted values are y/n/Y/N" "red"
        exit 1
    }
    if ($DRYRUN -eq $true -and !$TASKMODE) {
        $SKIPCHANGELOGEDITS = "N"
        LogMessage "Overriding skipChangelogEdits on dry run, auto set to 'N'" "darkyellow"
    }
}
if (![string]::IsNullOrEmpty($SKIPVERSIONEDITS)) {
    $SKIPVERSIONEDITS = $SKIPVERSIONEDITS.ToUpper()
    if ($SKIPVERSIONEDITS -ne "Y" -and $SKIPVERSIONEDITS -ne "N") {
        LogMessage "Invalid value specified for skipVersionEdits, accepted values are y/n/Y/N" "red"
        exit 1
    }
    if ($DRYRUN -eq $true) {
        $SKIPVERSIONEDITS = "N"
        LogMessage "Overriding skipVersionEdits on dry run, auto set to 'N'" "darkyellow"
    }
}

#
# Check dist release path for dist release
#
if ($DISTRELEASE -eq "Y" -and [string]::IsNullOrEmpty($PATHTODIST)) {
    LogMessage "pathToDist must be specified for dist release" "red"
    exit 1
}

#
# Make sure execution policy is RemoteSigned
#
$ExecutionPolicy = Get-ExecutionPolicy
if ($ExecutionPolicy -ne "RemoteSigned")
{
    LogMessage "You must set the powershell execution policy for localhost to 'RemoteSigned'" "red"
    if (![string]::IsNullOrEmpty($ExecutionPolicy)) {
        LogMessage "    Current policy is '$ExecutionPolicy'" "red"
    }
    else {
        LogMessage "    There is no current policy set" "red"
    }
    LogMessage "    Open an elevated command shell using 'Run as Administrator' and execute the following commands:" "red"
    LogMessage "        powershell" "red"
    LogMessage "        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned" "red"
    exit 1;
}

#endregion

#region Log Command Line Arguments and PublishRC Options

#
# Check for environment vars that did not get set.  Env vars are wrapped in ${} and will
# have been replaced by the nodejs config parser if they exist in the env.  Provide a warning
# if any of the variables are not found in the environment.
#
$objMembers = $options.psobject.Members | where-object membertype -like 'noteproperty'
foreach ($option in $objMembers) {
    if ($null -eq $option.Value) {
        continue;
    }
    if ($option.Value -is [system.array])
    {
        foreach ($val in $option.Value) {
            if ($val -is [system.string]) {
                if ($val.Trim().StartsWith("$`{") -and $val.Trim().EndsWith("`}")) {
                    LogMessage "Option $($option.Name) environment value was not found/set" "yellow"
                    LogMessage "   $($option.Value)" "yellow"
                }
            }
        }
    }
    else {
        if ($option.Value -is [system.string]) {
            if ($option.Value.Trim().StartsWith("$`{") -and $option.Value.Trim().EndsWith("`}")) {
                LogMessage "Option $($option.Name) environment value was not found/set" "yellow"
                LogMessage "   $($option.Value)" "yellow"
            }
        }
    }
}

#
# Log publishrc options
#
LogMessage "Options received from .publishrc"
$objMembers = $options.psobject.Members | where-object membertype -like 'noteproperty'
foreach ($option in $objMembers) {
    $logMsg = "   "
    $logMsg += $option.Name
    for ($i = $logMsg.Length; $i -lt 20; $i++) {
        $logMsg += " "
    }
    if ($null -ne $option.Value) {
        $logMsg += ": $($option.Value)"
    }
    else {
        $logMsg += ": null"
    }
    LogMessage $logMsg
}

#
# Write project specific properties
#
LogMessage "Project specific script configuration:"
LogMessage "   Branch           : $BRANCH"
LogMessage "   Current Version  : $CURRENTVERSION"
LogMessage "   Build cmd        : $BUILDCOMMAND"
LogMessage "   Bugs Page        : $BUGS"
LogMessage "   Changelog file   : $CHANGELOGFILE"
LogMessage "   C Project Rc File: $CPROJECTRCFILE"
LogMessage "   Deploy cmd       : $DEPLOYCOMMAND"
LogMessage "   Dist release     : $DISTRELEASE"
LogMessage "   Dry run          : $DRYRUN"
LogMessage "   Dry run vc revert: $DRYRUNVCREVERT"
LogMessage "   Email only       : $TASKEMAIL"
LogMessage "   Github release   : $GITHUBRELEASE"
LogMessage "   Github user      : $GITHUBUSER"
LogMessage "   Github assets    : $GITHUBASSETS"
LogMessage "   History file     : $HISTORYFILE"
LogMessage "   History file line: $HISTORYLINELEN"
LogMessage "   History hdr file : $HISTORYHDRFILE"
LogMessage "   Home page        : $HOMEPAGE"
LogMessage "   MantisBT plugin  : $MANTISBTPLUGIN"
LogMessage "   MantisBT release : $MANTISBTRELEASE"
LogMessage "   MantisBT project : $MANTISBTPROJECT"
LogMessage "   MantisBT url     : $MANTISBTURL"
LogMessage "   MantisBT assets  : $MANTISBTASSETS"
LogMessage "   NPM release      : $NPMRELEASE"
LogMessage "   NPM registry     : $NPMREGISTRY"
LogMessage "   NPM scope        : $NPMSCOPE"
LogMessage "   Nuget release    : $NUGETRELEASE"
LogMessage "   Path to root     : $PATHTOROOT"
LogMessage "   Path to main root: $PATHTOMAINROOT"
LogMessage "   Path pre root    : $PATHPREROOT"
LogMessage "   Post Build cmd   : $POSTBUILDCOMMAND"
LogMessage "   Post Commit cmd  : $POSTCOMMITCOMMAND"
LogMessage "   Post Dist cmd    : $DISTRELEASEPOSTCOMMAND"
LogMessage "   Post Github cmd  : $GITHUBRELEASEPOSTCOMMAND"
LogMessage "   Post Mantis cmd  : $mantisbtReleasePostCommand"
LogMessage "   Post Npm cmd     : $NPMRELEASEPOSTCOMMAND"
LogMessage "   Post Release cmd : $POSTRELEASECOMMAND"
LogMessage "   Pre Build cmd    : $PREBUILDCOMMAND"
LogMessage "   Pre Commit cmd   : $PRECOMMITCOMMAND"
LogMessage "   Pre Dist cmd     : $DISTRELEASEPRECOMMAND"
LogMessage "   Pre Github cmd   : $GITHUBRELEASEPRECOMMAND"
LogMessage "   Pre Mantis cmd   : $mantisbtReleasePreCommand"
LogMessage "   Pre Npm cmd      : $NPMRELEASEPRECOMMAND"
LogMessage "   Project name     : $PROJECTNAME"
LogMessage "   Prompt version   : $PROMPTVERSION"
LogMessage "   Repo             : $_Repo"
LogMessage "   RepoType         : $_RepoType"
LogMessage "   Skip chglog edit : $SKIPCHANGELOGEDITS"
LogMessage "   Skip deploy/push : $SKIPDEPLOYPUSH"
LogMessage "   Skip version edit: $SKIPVERSIONEDITS"
LogMessage "   Task mode        : $TASKMODE"
LogMessage "   Task stdout mode : $TASKMODESTDOUT"
LogMessage "   Task Chglog      : $TASKCHANGELOG"
LogMessage "   Task Chglog file : $TASKCHANGELOGFILE"
LogMessage "   Task CI info out : $TASKCIENVINFO"
LogMessage "   Task CI set env  : $TASKCIENVSET"
LogMessage "   Task Commit      : $TASKCOMMIT"
LogMessage "   Task Tag         : $TASKTAG"
LogMessage "   Task Version Cur : $TASKVERSIONCURRENT"
LogMessage "   Task Version Next: $TASKVERSIONNEXT"
LogMessage "   Task Version Info: $TASKVERSIONINFO"
LogMessage "   Task Vers. Pre.Re: $TASKVERSIONPRERELEASEID"
LogMessage "   Tag version      : $VCTAG"
LogMessage "   Tag format       : $VCTAGFORMAT"
LogMessage "   Tag prefix       : $VCTAGPREFIX"
LogMessage "   Text editor      : $TEXTEDITOR"
LogMessage "   Test email       : $TESTEMAILRECIP"
LogMessage "   Version files    : $VERSIONFILES"
LogMessage "   Vers.files alw.ed: $VERSIONFILESEDITALWAYS"
LogMessage "   Vers.files scroll: $VERSIONFILESSCROLLDOWN"
LogMessage "   Version pre id   : $VERSIONPRERELEASEID"
LogMessage "   Vers.replace tags: $VERSIONREPLACETAGS"
LogMessage "   Version text     : $VERSIONTEXT"

#endregion

#region Command Line Arguments Validation - Post Logging

#
# If this is a CI environment, then skip all interaction / edits
#
if (!$options.noCi)
{
    $SKIPCHANGELOGEDITS = "Y"
    $SKIPVERSIONEDITS = "Y"
    $VERSIONFILESEDITALWAYS = ""
    $PROMPTVERSION = "N"
    LogMessage "CI environment detected, the following flags/properties have been cleared:" "yellow"
    LogMessage "   skipChangelogEdits" "yellow"
    LogMessage "   skipVersionEdits" "yellow"
    LogMessage "   promptVersion" "yellow"
    LogMessage "   versionFilesEditAlways" "yellow"
}

#
# Convert array params to arrays, if specified as string on cmdline or publishrc
#
if ($DEPLOYCOMMAND -is [system.string] -and ![string]::IsNullOrEmpty($DEPLOYCOMMAND))
{
    $DEPLOYCOMMAND = @($DEPLOYCOMMAND); #convert to array
}
if ($BUILDCOMMAND -is [system.string] -and ![string]::IsNullOrEmpty($BUILDCOMMAND))
{
    $BUILDCOMMAND = @($BUILDCOMMAND); #convert to array
}
if ($POSTBUILDCOMMAND -is [system.string] -and ![string]::IsNullOrEmpty($POSTBUILDCOMMAND))
{
    $POSTBUILDCOMMAND = @($POSTBUILDCOMMAND); #convert to array
}
if ($PREBUILDCOMMAND -is [system.string] -and ![string]::IsNullOrEmpty($PREBUILDCOMMAND))
{
    $PREBUILDCOMMAND = @($PREBUILDCOMMAND); #convert to array
}
if ($POSTRELEASECOMMAND -is [system.string] -and ![string]::IsNullOrEmpty($POSTRELEASECOMMAND))
{
    $POSTRELEASECOMMAND = @($POSTRELEASECOMMAND); #convert to array
}
if ($POSTCOMMITCOMMAND -is [system.string] -and ![string]::IsNullOrEmpty($POSTCOMMITCOMMAND))
{
    $POSTCOMMITCOMMAND = @($POSTCOMMITCOMMAND); #convert to array
}
if ($PRECOMMITCOMMAND -is [system.string] -and ![string]::IsNullOrEmpty($PRECOMMITCOMMAND))
{
    $PRECOMMITCOMMAND = @($PRECOMMITCOMMAND); #convert to array
}
if ($DISTRELEASEPRECOMMAND -is [system.string] -and ![string]::IsNullOrEmpty($DISTRELEASEPRECOMMAND))
{
    $DISTRELEASEPRECOMMAND = @($DISTRELEASEPRECOMMAND); #convert to array
}
if ($DISTRELEASEPOSTCOMMAND -is [system.string] -and ![string]::IsNullOrEmpty($DISTRELEASEPOSTCOMMAND))
{
    $DISTRELEASEPOSTCOMMAND = @($DISTRELEASEPOSTCOMMAND); #convert to array
}
if ($GITHUBRELEASEPRECOMMAND -is [system.string] -and ![string]::IsNullOrEmpty($GITHUBRELEASEPRECOMMAND))
{
    $GITHUBRELEASEPRECOMMAND = @($GITHUBRELEASEPRECOMMAND); #convert to array
}
if ($GITHUBRELEASEPOSTCOMMAND -is [system.string] -and ![string]::IsNullOrEmpty($GITHUBRELEASEPOSTCOMMAND))
{
    $GITHUBRELEASEPOSTCOMMAND = @($GITHUBRELEASEPOSTCOMMAND); #convert to array
}
if ($mantisbtReleasePreCommand -is [system.string] -and ![string]::IsNullOrEmpty($mantisbtReleasePreCommand))
{
    $mantisbtReleasePreCommand = @($mantisbtReleasePreCommand); #convert to array
}
if ($mantisbtReleasePostCommand -is [system.string] -and ![string]::IsNullOrEmpty($mantisbtReleasePostCommand))
{
    $mantisbtReleasePostCommand = @($mantisbtReleasePostCommand); #convert to array
}
if ($NPMRELEASEPRECOMMAND -is [system.string] -and ![string]::IsNullOrEmpty($NPMRELEASEPRECOMMAND))
{
    $NPMRELEASEPRECOMMAND = @($NPMRELEASEPRECOMMAND); #convert to array
}
if ($NPMRELEASEPOSTCOMMAND -is [system.string] -and ![string]::IsNullOrEmpty($NPMRELEASEPOSTCOMMAND))
{
    $NPMRELEASEPOSTCOMMAND = @($NPMRELEASEPOSTCOMMAND); #convert to array
}
if ($VERSIONFILES -is [system.string] -and ![string]::IsNullOrEmpty($VERSIONFILES))
{
    $VERSIONFILES = @($VERSIONFILES); #convert to array
}
if ($VERSIONFILESEDITALWAYS -is [system.string] -and ![string]::IsNullOrEmpty($VERSIONFILESEDITALWAYS))
{
    $VERSIONFILESEDITALWAYS = @($VERSIONFILESEDITALWAYS); #convert to array
}
if ($VERSIONFILESSCROLLDOWN-is [system.string] -and ![string]::IsNullOrEmpty($VERSIONFILESSCROLLDOWN))
{
    $VERSIONFILESSCROLLDOWN = @($VERSIONFILESSCROLLDOWN); #convert to array
}
if ($VERSIONREPLACETAGS -is [system.string] -and ![string]::IsNullOrEmpty($VERSIONREPLACETAGS))
{
    $VERSIONREPLACETAGS = @($VERSIONREPLACETAGS); #convert to array
}
if ($GITHUBASSETS -is [system.string] -and ![string]::IsNullOrEmpty($GITHUBASSETS))
{
    $GITHUBASSETS = @($GITHUBASSETS); #convert to array
}
if ($EMAILRECIP -is [system.string] -and ![string]::IsNullOrEmpty($EMAILRECIP))
{
    $EMAILRECIP = @($EMAILRECIP); #convert to array
}
if ($TESTEMAILRECIP -is [system.string] -and ![string]::IsNullOrEmpty($TESTEMAILRECIP))
{
    $TESTEMAILRECIP = @($TESTEMAILRECIP); #convert to array
}

#endregion

#region Current and Next Version / Get Commits

#
# Get the current version number
#
# Currently two versioning methods are supported :
#
#     1. Incremental (100, 101, 102)
#     2. Semantic (major.minor.patch)
#
if ($CURRENTVERSION -eq "" -or ($VERSIONFORCECURRENT -and $RUN -eq 1) -or ($TASKTAG -and $RUN -eq 1))
{
    LogMessage "Retrieve current version and calculate next version number"
    #
    # If node_modules dir exists, use package.json to obtain cur version
    #
    if (Test-Path("package.json"))
    {
        LogMessage "Using node to obtain next version number"
        #
        # use package.json properties to retrieve current version
        #
        if (!$VERSIONFORCECURRENT) {
            $CURRENTVERSION = & node -e "console.log(require('./package.json').version);"
        }
        $VERSIONSYSTEM = "semver"
    }
    #
    # Maven pom.xml based Plugin
    #
    elseif (Test-Path("pom.xml"))
    {
        if (!$VERSIONFORCECURRENT) {
            $mavenInfo = Get-MavenPomVersion
            $CURRENTVERSION = $mavenInfo[1]
            $MavenVersionTag = $mavenInfo[0]
        }
        if (!$CURRENTVERSION.Contains(".")) 
        {
            LogMessage "App-Publisher based Maven projects must use semantic versioning" "red"
            LogMessage "Invalid version found '$CURRENTVERSION'" "red"
            LogMessage "Check you pom.xml file for valid version syntax" "red"
            if ($TASKMODESTDOUT) {
                Write-Host "0.0.0"
            }
            exit 130
        }
        $VERSIONSYSTEM = "semver"
    } 
    #
    # MantisBT Plugin
    # $MANTISBTPLUGIN specified the main class file, containing version #
    #
    elseif (![string]::IsNullOrEmpty($MANTISBTPLUGIN))
    {
        if (!$VERSIONFORCECURRENT) {
            $CURRENTVERSION = Get-MantisPluginVersion
        }
        if (!$CURRENTVERSION.Contains(".")) 
        {
            LogMessage "MantisBT plugins must use semantic versioning" "red"
            LogMessage "Invalid version found '$CURRENTVERSION'" "red"
            LogMessage "Check you mantis plugin file for valid version syntax" "red"
            if ($TASKMODESTDOUT) {
                Write-Host "0.0.0"
            }
            exit 130
        }
        #$VERSIONSYSTEM = "mantisbt"
        $VERSIONSYSTEM = "semver"
    } 
    #
    # Test style History file
    #
    elseif (![string]::IsNullOrEmpty($HISTORYFILE))
    {
        if (!$VERSIONFORCECURRENT) {
            $CURRENTVERSION = $ClsHistoryFile.getVersion($HISTORYFILE, $VERSIONTEXT)
        }
        if ([string]::IsNullOrEmpty($CURRENTVERSION))
        {
            $VERSIONSYSTEM = "manual"
        }
        if (!$CURRENTVERSION.Contains(".")) 
        {
            $VERSIONSYSTEM = "incremental"
        }
        else {
            $VERSIONSYSTEM = "semver"
            #
            # Semantic versioning non-npm project
            #
            #LogMessage "Using non-npm project semantic versioning"
            #LogMessage "Semver not found, run 'npm install -g semver' to automate semantic versioning of non-NPM projects" "darkyellow"
        }
    } 
    #
    # .NET with AssemblyInfo.cs file
    #
    else 
    {
        $AssemblyInfoLoc = Get-ChildItem -Name -Recurse -Depth 1 -Filter "assemblyinfo.cs" -File -Path . -ErrorAction SilentlyContinue
        if ($AssemblyInfoLoc -is [system.string] -and ![string]::IsNullOrEmpty($AssemblyInfoLoc))
        {
            if (!$VERSIONFORCECURRENT) {
                $CURRENTVERSION = Get-AssemblyInfoVersion $AssemblyInfoLoc
            }
            if (![string]::IsNullOrEmpty($CURRENTVERSION )) {
                $VERSIONSYSTEM = ".net"
            }
            else {
                LogMessage "The current version cannot be determined" "red"
                LogMessage "Provided the current version in publishrc or on the command line" "red"
                if ($TASKMODESTDOUT) {
                    Write-Host "0.0.0"
                }
                exit 130
            }
        }
        elseif ($AssemblyInfoLoc -is [System.Array] -and $AssemblyInfoLoc.Length -gt 0) {
            LogMessage "The current version cannot be determined, multiple assemblyinfo files found" "red"
        }
        else {
            LogMessage "The current version cannot be determined" "red"
        }
    }
}
else {
    LogMessage "Current version obtained from publishrc /cmd line"
}

#
# If version system is mantisbt or .net, then look fora global semver installation
# to use for finding the next version number using semantic versioning module semver
#
if ($VERSIONSYSTEM -eq ".net" -or $VERSIONSYSTEM -eq "mantisbt")
{
    $Paths = ${Env::Path}.Split(";");
    foreach ($Path in $Paths) 
    {
        if (Test-Path([Path]::Combine($Path, "node.exe")))
        {
            if (Test-Path([Path]::Combine($Path, "\node_modules\semver")))
            {
                $VERSIONSYSTEM = "semver";
            }
        }
    }
}

#
# If current version was not found, then interactively get the current version, or exit with error
#
if ($CURRENTVERSION -eq "") 
{
    #if ($PROMPTVERSION) 
    #{
        
        #LogMessage "[PROMPT] User input required"
        #$CurVersion = read-host -prompt "Enter the current version #, or C to cancel [$CURRENTVERSION]"
        #if ($CurVersion.ToUpper() -eq "C") {
        #    LogMessage "User cancelled process, exiting" "red"
        #    exit 155
        #}
        #if (![string]::IsNullOrEmpty($CurVersion)) {
        #    $CURRENTVERSION = $CurVersion
        #}
        #else {
        #    LogMessage "Invalid current version, exiting" "red"
        #    exit 133
        #}
        $CURRENTVERSION = "1.0.0"
        $VERSION = "1.0.0"
        $VERSIONSYSTEM = "manual"
    #}
    #else {
    #    LogMessage "New version has been validated" "darkgreen"
    #    LogMessage "Could not determine current version, correct issue and re-run publish" "red"
    #    exit 131
    #}
}

#
# Validate current version if necessary
#
LogMessage "Validating current version found: $CURRENTVERSION"
if ($VERSIONSYSTEM -eq "semver")
{
    if (!$IsAppPublisher) {
        $ValidationVersion = & app-publisher-semver $CURRENTVERSION
    }
    else {
        $ValidationVersion = & semver $CURRENTVERSION
    }
    if ([string]::IsNullOrEmpty($ValidationVersion)) {
        LogMessage "The current semantic version found ($CURRENTVERSION) is invalid" "red"
        if ($TASKMODESTDOUT) {
            Write-Host $CURRENTVERSION
        }
        exit 132
    }
}
elseif ($VERSIONSYSTEM -eq '.net' -or $VERSIONSYSTEM -eq 'mantisbt')
{
    LogMessage "MantisBT/.NET version system has no validation method - todo" "darkyellow"
    # TODO - Version should digits and two dots
    #
    if ($false) {
        LogMessage "The current mantisbt version ($CURRENTVERSION) is invalid" "red"
        if ($TASKMODESTDOUT) {
            Write-Host $CURRENTVERSION
        }
        exit 134
    }
}
elseif ($VERSIONSYSTEM -eq 'incremental')
{
    LogMessage "Incremental version has no validation method - todo" "darkyellow"
    # TODO - Version should contain all digits
    #
    if ($false) {
        LogMessage "The current incremental version ($CURRENTVERSION) is invalid" "red"
        if ($TASKMODESTDOUT) {
            Write-Host $CURRENTVERSION
        }
        exit 134
    }
}
LogMessage "Current version has been validated" "darkgreen"

#
# Certain tasks only need to be done once if there are multiple publish runs configured to run.
#
# In dry run mode, we retrieve anyway just for the sake of testing the commit retrieval
#
# These tasks include:
#
#     1. Get commit comments since last version tag
#     2. Calculate the new version (it has already been set in all version files in 1st run)
#     3. Populate and edit history text file
#     4. Populate and edit changelog markdown file
#

if ($RUN -eq 1 -and $REPUBLISH.Count -eq 0)
{
    LogMessage "The current version is $CURRENTVERSION"

    if (!$TASKEMAIL)
    {
        if (!$VERSIONFORCENEXT -and !$TASKTAG)
        {
            #
            # Get commit messages since last version
            #
            # The previous version tag in the form 'vX.X.X' must exist in svn/projectroot/tags in
            # order to successfully obtain the latest commit messages.  If it does not exist, the
            # most current tag will be used
            #
            $COMMITS = $ClsVc.getCommits($_RepoType, $_Repo, $BRANCH, $CURRENTVERSION, $VCTAGPREFIX)
            #
            # Check to ensure we got commits since last version.  If not, prompt user whether or
            # not to proceed, since technically the first time this script is used, we don't know
            # how to retrieve the latest commits
            #
            if (($null -eq $COMMITS -or $COMMITS.Length -eq 0) -and !$TASKMODE) 
            {
                LogMessage "Commits since the last version or the version tag could not be found"
                LogMessage "[PROMPT] User input required"
                $Proceed = read-host -prompt "Proceed anyway? Y[N]"
                if ($Proceed.ToUpper() -ne "Y") {
                    LogMessage "User cancelled, exiting" "red"
                    exit 155
                }
            }

            #
            # Calculate next version number
            #
            # If this is an NPM project, we use node to determine the current version in package.json
            # For all other project types, we parse the history file for the current version.
            #
            # Currently projects are versioned in one of two ways:
            #
            #     1. Legacy incremental whole number version (100, 101, 102)
            #     2. Semantically versioned (major.minor.patch)
            #
            # If this is a semantically versioned project (whether the version was obtained via node or 
            # history file parsing), we will use semver to calculate the next version if possible.  If 
            # semver is not available, prompt user for next version number.
            #
            # If this is a legacy incremental versioned project, the verison obtained in the history will be
            # incremented by +1.
            #
            $VersionInteractive = "N"
            #
            if ($VERSIONSYSTEM -eq "semver")
            {   #
                # use semver to retrieve next version
                # Analyze the commits to determine major, minor, patch release
                #
                $RELEASELEVEL = $ClsCommitAnalyzer.get($COMMITS)
                if ($VERSIONPRERELEASEID -ne "") {
                    $RELEASELEVEL = "pre" + $RELEASELEVEL
                }
                
                #
                # Get next version
                # NOte that pre-release identifier will auto-bump minor revision
                #
                if ($RUN -eq 1 -or $DRYRUN -eq $true)
                {
                    if ($VERSIONPRERELEASEID -eq "")
                    {
                        if (!$IsAppPublisher) {
                            $VERSION = & app-publisher-semver -i $RELEASELEVEL $CURRENTVERSION
                        }
                        else {
                            $VERSION = & semver -i $RELEASELEVEL $CURRENTVERSION
                        }
                    }
                    #
                    # Pre-release identifier
                    #
                    else
                    {
                        if (!$IsAppPublisher) {
                            $VERSION = & app-publisher-semver -i $RELEASELEVEL $CURRENTVERSION --preid $VERSIONPRERELEASEID
                        }
                        else {
                            $VERSION = & semver -i $RELEASELEVEL $CURRENTVERSION --preid $VERSIONPRERELEASEID
                        }
                    }
                }
                else {
                    $VERSION = $CURRENTVERSION
                }
            }
            elseif ($VERSIONSYSTEM -eq "mantisbt" -or $VERSIONSYSTEM -eq '.net')
            {
                $VERSION = ""
                $VersionInteractive = "Y"
            }
            elseif ($VERSIONSYSTEM -eq "incremental")
            {
                #
                # Whole # incremental versioning, i.e. 100, 101, 102...
                #
                LogMessage "Using legacy incremental versioning"
                if ($VERSIONPRERELEASEID -ne "")
                {
                    LogMessage "Incremental versioning does not support a pre-release identifier" "yellow"
                }
                if ($RUN -eq 1 -or $DRYRUN -eq $true) {
                    try {
                        $VERSION = ([System.Int32]::Parse($CURRENTVERSION) + 1).ToString()
                    }
                    catch {
                        $VERSION = ""
                    }
                }
                else {
                    $VERSION = $CURRENTVERSION
                }
            }
            #
            # If version could not be found or version system is 'manual', then prompt for version 
            #
            if (![string]::IsNullOrEmpty($VERSION)) 
            {
                LogMessage "The suggested new version is $VERSION"
            }
            elseif ($VERSIONSYSTEM -ne "manual" -and $VersionInteractive -eq "N")
            {
                LogMessage "New version could not be determined, you must manually input the new version"
                $VersionInteractive = "Y"
            }
    
            if (($VERSIONSYSTEM -eq "manual" -or $PROMPTVERSION -eq "Y" -or $VersionInteractive -eq "Y") -and !$TASKCHANGELOG -and !$TASKMODESTDOUT) 
            {
                LogMessage "[PROMPT] User input required"
                $NewVersion = read-host -prompt "Enter the version #, or C to cancel [$VERSION]"
                if ($NewVersion.ToUpper() -eq "C") {
                    LogMessage "User cancelled process, exiting" "red"
                    exit 155
                }
                if (![string]::IsNullOrEmpty($NewVersion)) {
                    $VERSION = $NewVersion
                    if ($VERSIONSYSTEM -eq "manual") {
                        $CURRENTVERSION = $VERSION + "-pre";
                    }
                }
            }
        }

        #
        # Validate new version
        #
        if ([string]::IsNullOrEmpty($VERSION)) {
            LogMessage "Invalid version for release, exiting" "red"
            exit 133
        }
        LogMessage "Validating new version: $VERSION"
        if ($VERSIONSYSTEM -eq "semver")
        {
            if (!$IsAppPublisher) {
                $ValidationVersion = & app-publisher-semver $VERSION
            }
            else {
                $ValidationVersion = & semver $VERSION
            }
            if ([string]::IsNullOrEmpty($ValidationVersion)) {
                LogMessage "The new semantic version ($VERSION) is invalid" "red"
                exit 133
            }
        }
        elseif ( $VERSION.Contains(".")) # $VERSIONSYSTEM -eq "mantisbt" -or $VERSIONSYSTEM -eq '.net'
        {
            #
        }
        else # incremental versioning
        {
            #
            # TODO - Version should contain all digits
            #
            if ($false) {
                LogMessage "The new incremental version ($VERSION) is invalid" "red"
                exit 134
            }
        }
        LogMessage "New version has been validated" "darkgreen"
    }
    else
    { 
        LogMessage "Single task mode (Email) - Set version to $CURRENTVERSION"
        $VERSION = $CURRENTVERSION
    }
}
else
{
    LogMessage "The current version is $CURRENTVERSION"
    if ($REPUBLISH.Count -eq 0)
    {
        LogMessage "This is publish run #$RUN, the previously determined version $VERSION is the new version" "magenta"
    }
    else 
    {
        $VERSION = $CURRENTVERSION
        LogMessage "This is a re-publish run, setting version to $CURRENTVERSION" "magenta"
    }
}

#
# Output some calculated info to console
#
LogMessage "Current Version         : $CURRENTVERSION"
LogMessage "Next Version            : $VERSION"

#endregion

#
# If task mode is a version type task, then output required info to stdout and exit
#
if ($TASKVERSIONINFO) {
    Write-Host "$CURRENTVERSION|$VERSION" 
    exit 0
}
if ($TASKVERSIONCURRENT) {
    Write-Host $CURRENTVERSION
    exit 0
}
elseif ($TASKVERSIONNEXT) {
    Write-Host $VERSION
    exit 0
}
elseif (![string]::IsNullOrEmpty($TASKVERSIONPRERELEASEID))
{
    $preRelId = "error"
    $match = [Regex]::Match($TASKVERSIONPRERELEASEID, "^(?:v|V){0,1}[0-9.]+\-([a-z]+)\.{0,1}[0-9]*$");
    if ($match.Success -and $match.Groups.Length -gt 1)
    {
        $preRelId = $match.Groups[1].Value;
        
    }
    Write-Host $preRelId
    exit 0
}

#region History File Processing

#
# Get formatted date in the form used in history.txt:
#
#     May 6th, 1974
#     October 3rd, 2003
#
if ($TDATE -eq "") {
    $date = Get-Date
    $Day = $date.Day.ToString()
    $Month = get-date -format "MMMM"
    $Year = get-date -format "yyyy"
    if ($Day -eq 11 -or $Day -eq 12 -or $Day -eq 13)
    {
        $Day = "${Day}th"
    }
    else
    {
        switch ($Day[$Day.Length - 1]) 
        {
            "1" { $Day = "${Day}st"; break }
            "2" { $Day = "${Day}nd"; break }
            "3" { $Day = "${Day}rd"; break }
            default { $Day = "${Day}th"; break }
        }
    }
    $TDATE = "$Month $Day, $Year"
}
LogMessage "Date                 : $TDATE"

$doChangelog = $REPUBLISH.Count -eq 0 -and ($TASKCHANGELOG -or $TASKCHANGELOGVIEW -or $TASKCHANGELOGFILE -or !$TASKMODE)
LogMessage "Do cl / history file : $doChangelog"

#
# Process $HISTORYFILE
#
if (![string]::IsNullOrEmpty($HISTORYFILE) -and $doChangelog)
{
    if (![string]::IsNullOrEmpty($TASKCHANGELOGFILE))
    {
        $HISTORYFILE = $TASKCHANGELOGFILE
        if (Test-Path($HISTORYFILE))
        {
            Remove-Item -Force -Path "$HISTORYFILE" | Out-Null
        }
    }
    elseif ($TASKMODE -and !$TASKCHANGELOG)
    {
        $HISTORYFILE = "${Env:Temp}\history.$VERSION.txt"
        if (Test-Path($HISTORYFILE))
        {
            Remove-Item -Force -Path "$HISTORYFILE" | Out-Null
        }
    }

    #
    # If history file doesnt exist, create one with the project name as a title
    #
    $IsNewHistoryFile = $false;
    $IsNewHistoryFileHasContent = $false;
    $HistoryPath = Split-Path "$HISTORYFILE"
    if ($HistoryPath -ne "" -and !(Test-Path($HistoryPath))) 
    {
        LogMessage "Creating history file directory and adding to version control" "magenta"
        New-Item -ItemType "directory" -Force -Path "$HistoryPath" | Out-Null
        if (!$TASKMODE -or $TASKCHANGELOG)
        {
            VcChangelistAddNew "$HistoryPath"
            VcChangelistAddRemove "$HistoryPath"
            VcChangelistAdd "$HistoryPath"
        }
    }

    if (!(Test-Path($HISTORYFILE))) 
    {
        LogMessage "Creating new history file and adding to version control" "magenta"
        if (!$TASKCHANGELOG)
        {
            New-Item -ItemType "file" -Force -Path "$HISTORYFILE" -Value "$PROJECTNAME`r`n`r`n" | Out-Null
        }
        else
        {
            New-Item -ItemType "file" -Force -Path "$HISTORYFILE" -Value "" | Out-Null
        }
        $IsNewHistoryFile = $true;
        if (!$TASKMODE -or $TASKCHANGELOG)
        {
            VcChangelistAddRemove "$HISTORYFILE"
            VcChangelistAddNew "$HISTORYFILE"
        }
    }
    else 
    {   #
        # If the history file already existed, but had no entries, we need to still set the 'new' flag
        #
        $szContents = Get-Content $HISTORYFILE | Out-String
        if ($szContents.IndexOf($VERSIONTEXT) -eq -1)
        {
            $IsNewHistoryFile = $true;
            $IsNewHistoryFileHasContent = $true;
        }
    }
    if (!(Test-Path($HISTORYFILE))) 
    {
        LogMessage "Could not create history file, exiting" "red"
        exit 140;
    }
    if (($CURRENTVERSION -eq "1.0.0" -or $CURRENTVERSION -eq "0.0.1") -and $IsNewHistoryFile)
    {
        LogMessage "It appears this is the first release, resetting version"
        LogMessage "   Reset to Version    : $CURRENTVERSION"
    }
    #
    # Add the 'Version X' line, date, and commit content
    # 
    if (($CURRENTVERSION -ne $VERSION -or $IsNewHistoryFile -or $TASKMODE) -and ($RUN -eq 1 -or $DRYRUN -eq $true))
    {
        $TmpCommits = $ClsHistoryFile.createSectionFromCommits($COMMITS, $HISTORYLINELEN)

        LogMessage "Preparing history file"

        #
        # New file
        #
        if ($IsNewHistoryFile -and !$IsNewHistoryFileHasContent -and !$TASKCHANGELOG) {
            $HistoryFileTitle = "$PROJECTNAME History"
            Add-Content -NoNewline -Path $HISTORYFILE -Value "$HistoryFileTitle`r`n"
            [System.Threading.Thread]::Sleep(120)
        }

        #
        # Touch history file with the latest version info, either update existing, or create 
        # a new one if it doesnt exist
        #
        # Add lines 'version', 'date', then the header content
        #
        # Write the formatted commits text to $HISTORYFILE
        # Formatted commits are also contained in the temp text file $Env:TEMP\history.txt
        # Replace all newline pairs with cr/nl pairs as SVN will have sent commit comments back
        # with newlines only
        #
        if (Test-Path($HISTORYHDRFILE)) 
        {
            $HistoryHeader = Get-Content $HISTORYHDRFILE -Raw
            Add-Content -NoNewline -Path $HISTORYFILE -Value "`r`n$VERSIONTEXT $VERSION`r`n$TDATE`r`n$HistoryHeader`r`n$TmpCommits"
        }
        else {   
            LogMessage "History header template not found" "darkyellow"
            Add-Content -NoNewline -Path $HISTORYFILE -Value "`r`n$VERSIONTEXT $VERSION`r`n$TDATE`r`n`r`n`r`n$TmpCommits"  
        }
    }
    else {
        LogMessage "Version match, not touching history file" "darkyellow"
    }
    #
    # Allow manual modifications to history file
    #
    if (!$TASKCHANGELOG -and !$TASKCOMMIT)
    {   
        Edit-File $HISTORYFILE $true ($SKIPCHANGELOGEDITS -eq "Y")
    }
    elseif ($TASKCOMMIT) {
        Edit-File $HISTORYFILE $false $true
    }
    else {
        #
        # TODO - Cut just the version from the content, remove all the *** garb
        #
        $FileSpec = ![string]::IsNullOrEmpty($TASKCHANGELOGFILE);
        Edit-File $HISTORYFILE $false $FileSpec $true
    }
}

#endregion

#region Changelog File Processing

#
# Process $CHANGELOGFILE
#
if (![string]::IsNullOrEmpty($CHANGELOGFILE) -and $doChangelog)
{
    if (![string]::IsNullOrEmpty($TASKCHANGELOGFILE))
    {
        $CHANGELOGFILE = $TASKCHANGELOGFILE
        if (Test-Path($HISTORYFILE))
        {
            Remove-Item -Force -Path "$CHANGELOGFILE" | Out-Null
        }
    }
    elseif ($TASKMODE -and !$TASKCHANGELOG)
    {
        $CHANGELOGFILE = "${Env:Temp}\history.$VERSION.txt"
        if (Test-Path($CHANGELOGFILE))
        {
            Remove-Item -Force -Path "$CHANGELOGFILE" | Out-Null
        }
    }

    #
    # If changelog markdown file doesnt exist, create one with the project name as a title
    #
    $NewChangelog = $false
    $ChangeLogPath = Split-Path "$CHANGELOGFILE"
    if ($ChangeLogPath -ne "" -and !(Test-Path($ChangeLogPath))) 
    {
        LogMessage "Creating changelog file directory and adding to version control" "magenta"
        New-Item -ItemType "directory" -Path "$ChangeLogPath" | Out-Null
        if (!$TASKMODE -or $TASKCHANGELOG)
        {
            VcChangelistAddNew "$ChangeLogPath"
            VcChangelistAddRemove "$ChangeLogPath"
            VcChangelistAdd "$ChangeLogPath"
        }
    }
    if (!(Test-Path($CHANGELOGFILE))) 
    {
        LogMessage "Creating new changelog file and adding to version control" "magenta"
        New-Item -ItemType "file" -Path "$CHANGELOGFILE" -Value "$ChangeLogTitle`r`n`r`n" | Out-Null
        $NewChangelog = $true
        if (!$TASKMODE -or $TASKCHANGELOG)
        {
            VcChangelistAddRemove $CHANGELOGFILE
            VcChangelistAddNew $CHANGELOGFILE
        }
    }
    if (!(Test-Path($CHANGELOGFILE))) 
    {
        VcRevert $true
        LogMessage "Could not create changelog file, exiting" "red"
        exit 141
    }

    if (($CURRENTVERSION -ne $VERSION -or $NewChangelog -or $TASKMODE) -and ($RUN -eq 1 -or $DRYRUN -eq $true))
    {
        $TextInfo = (Get-Culture).TextInfo
        $TmpCommits = ""
        $LastSection = ""
        $Sectionless = @()
        $ChangeLogTitle = "# $PROJECTNAME Change Log".ToUpper()

        LogMessage "Preparing changelog file"
        #
        # Touch changelog file with the latest commits
        #
        # Add lines 'version', 'date', then the header content
        #  
        if (!$NewChangelog) {                       
            $TmpCommits = "`r`n"
        }
        $TmpCommits += "## $VERSIONTEXT $VERSION ($TDATE)`r`n"
        #
        # Loop through the commits and build the markdown for appending to the changelog
        #
        foreach ($Commit in $COMMITS)
        {
            $Scope = ""
            $TmpCommit = $Commit.Trim();
            $TmpCommit = $TmpCommit.Replace("`n", "`r`n")
            $idx1 = $TmpCommit.IndexOf("(")
            $idx2 = $TmpCommit.IndexOf(':')
            #
            # If there is no subject, then store the message in an array to process after
            # all of the commits with subject headers are processed.
            #
            # If the subject contains a scope, for example:
            #
            #     docs(readme)
            #
            # Then extract "readme" as the scope, and "docs" as the subject
            #
            if ($idx2 -eq -1) {
                $Sectionless += $Commit
                continue
            }
            elseif ($idx1 -ne -1 -and $idx1 -lt $idx2) {
                $Section = $TmpCommit.SubString(0, $idx1).TrimEnd()
                $Scope = $TextInfo.ToTitleCase($TmpCommit.SubString($idx1 + 1, $TmpCommit.IndexOf(")") - $idx1 - 1).ToLower().Trim())
            }
            else {
                $Section = $TextInfo.ToTitleCase($TmpCommit.SubString(0, $idx2).ToLower().TrimEnd())
            }
            #
            # Ignore chores, progress, and custom specified psubjects to ignore
            #
            if ($Section.ToLower() -eq "chore" -or $Section.ToLower() -eq "progress" -or 
                $Section.ToLower() -eq "project" -or $Section.ToLower() -eq "style") {
                continue
            }
            $doContinue = $false;
            if ($COMMITMSGMAP) {
                $COMMITMSGMAP.psobject.Properties | ForEach-Object { # Bracket must stay same line as ForEach-Object
                    if (!$Section.ToLower() -eq $_.Name -and !$_.Value.include) {
                        $doContinue = $true;
                    }
                }
            }
            if ($doContinue) {
                continue
            }
            $TmpCommit = $TmpCommit.SubString($idx2 + 1).Trim()
            #
            # Print out the subject as a title if it is different than the previous sections
            # title.  Comments are alphabetized.
            #
            if ($Section -ne $LastSection) {
                $TmpSection = $ClsCommitAnalyzer.getFormatted($Section)
                $TmpCommits += "`r`n### $TmpSection`r`n`r`n"
            }
            #
            # Start the comment list item, add scope in bold if necessary
            #
            $TmpCommits += "- ";
            if ($Scope -ne "") {
                $TmpCommits += "**$Scope`:** "
            }
            #
            # FOr multi-line comments, do some special processing
            #
            if ($TmpCommit.Contains("`r`n"))
            {
                $TmpCommitParts = $TmpCommit.Split("`r`n");
                $TmpCommits += $TmpCommitParts[0]
                for ($i = 1; $i -lt $TmpCommitParts.Length; $i++)
                {
                    if ($TmpCommitParts[$i] -eq "") {
                        continue
                    }
                    $TmpCommits += "`r`n`r`n`t$($TmpCommitParts[$i])`r`n"
                }
                $TmpCommits += "`r`n"
            }
            else {
                $TmpCommits += "$TmpCommit`r`n"
            }
            #
            # Record last subject, we only print the subject when it differes from previous
            #
            $LastSection = $Section
        }
        #
        # Add any commits that did not contain a conventional commit subject
        #
        if ($Sectionless.Length -gt 0)
        {
            $TmpCommits += "`r`n### Other Notes`r`n`r`n"
            foreach ($Commit in $Sectionless)
            {
                $TmpCommits += "- $TmpCommit`r`n";
            }
        }
        #
        # Perform spell checking (currently the projectoxford has been taken down after the
        # Microsoft deal with the facial rec api)
        #
        #$TmpCommits = CheckSpelling $TmpCommits $false
        #
        # Write the formatted commits text to the top of $CHANGELOGFILE, but underneath the
        # changelog title
        #
        $TmpCommits = $TmpCommits.Trim();
        $ChangeLogContents = Get-Content $CHANGELOGFILE | Out-String
        $ChangeLogContents = $ChangeLogContents.Replace("$ChangeLogTitle", "").Trim();
        $ChangeLogFinal = "$ChangeLogTitle`r`n`r`n"
        if (![string]::IsNullOrEmpty($TmpCommits)) {
            $ChangeLogFinal = "$ChangeLogFinal$TmpCommits`r`n`r`n"
        }
        if (![string]::IsNullOrEmpty($ChangeLogContents)) {
            $ChangeLogFinal = "$ChangeLogFinal$ChangeLogContents`r`n"
        }
        Set-Content $CHANGELOGFILE $ChangeLogFinal
    }
    else {
        LogMessage "Version match, not touching changelog file" "darkyellow"
    }
    #
    # Allow manual modifications to changelog file
    #
    if (!$TASKCHANGELOG -and !$TASKCOMMIT)
    {
        Edit-File $CHANGELOGFILE $true ($SKIPCHANGELOGEDITS -eq "Y")
    }
    elseif ($TASKCOMMIT) {
        Edit-File $CHANGELOGFILE $false $true
    }
    else {
        #
        # TODO - Cut just the version from the content, remove all the *** garb
        #
        $FileSpec = ![string]::IsNullOrEmpty($TASKCHANGELOGFILE);
        Edit-File $CHANGELOGFILE $false $FileSpec $true
    }
}

#endregion

$DistIsVersioned = $false
if ($DISTRELEASE -eq "Y" -and !$TASKMODE)
{
    $DistDirCreated = $false
    #
    # Create dist directory if it doesnt exist
    #
    if (!(Test-Path($PATHTODIST))) {
        LogMessage "Creating dist directory" "magenta"
        New-Item -Path "$PATHTODIST" -ItemType "directory" | Out-Null
        VcChangelistAddRemove "$PATHTODIST"
        $DistDirCreated = $true
    }
    #
    # Get whether or not dist dir is under vesion control, in some cases it may not be
    #
    $DistIsVersioned = VcIsVersioned $PATHTODIST $true $true
    #
    #
    #
    if (!$DistDirCreated -and $DistIsVersioned) 
    {
        VcChangelistAdd "$PATHTODIST"
        VcChangelistAddMulti "$PATHTODIST"
    }
}

#
# Run pre build scripts if specified, before version file edits
#
if (!$TASKMODE) {
    RunScripts "preBuild" $PREBUILDCOMMAND $true $true
}

#region Version Files Processing

if ($RUN -eq 1 -and $REPUBLISH.Count -eq 0 -and (!$TASKMODE -or $TASKTOUCHVERSIONS))
{
    #
    # AppPublisher publishrc version
    #
    Set-AppPublisherBuild
    #
    # ExtJs build
    #
    if ((Test-Path("app.json")) -and (Test-Path("package.json"))) {
        Set-ExtJsBuild
    }
    #
    # NPM managed project, update package.json if required
    #
    if ((Test-Path("package.json"))) {
        Set-PackageJson
    }
    #
    # Maven managed project, update pom.xml if required
    #
    if ((Test-Path("pom.xml"))) {
        Set-MavenPomBuild $MavenVersionTag
    }
    #
    # Mantisbt plugin project, update main plugin file if required
    #
    if (![string]::IsNullOrEmpty($MANTISBTPLUGIN)) {
        Set-MantisPluginBuild
    }
    #
    # C project, update main rc file if required
    #
    if (![string]::IsNullOrEmpty($CPROJECTRCFILE)) {
        Set-CprojectBuild
    }
    #
    # If this is a .NET build, update assemblyinfo file
    # Search root dir and one level deep.  If the assembly file is located deeper than 1 dir
    # from the root dir, it should be specified using the versionFiles arry of .publishrc
    #
    $AssemblyInfoLoc = Get-ChildItem -Name -Recurse -Depth 1 -Filter "assemblyinfo.cs" -File -Path . -ErrorAction SilentlyContinue
    if ($AssemblyInfoLoc -is [system.string] -and ![string]::IsNullOrEmpty($AssemblyInfoLoc))
    {
        Set-DotNetBuild $AssemblyInfoLoc
    }
    elseif ($AssemblyInfoLoc -is [System.Array] -and $AssemblyInfoLoc.Length -gt 0) {
        foreach ($AssemblyInfoLocFile in $AssemblyInfoLoc) {
            Set-DotNetBuild $AssemblyInfoLocFile
        }
    }
    #
    # Version bump specified files in publishrc config 'versionFiles'
    #
    Set-VersionFiles
}

#endregion

#
# Run custom build scipts if specified
#
if (!$TASKMODE) {
    RunScripts "build" $BUILDCOMMAND $true $true
}

#
# Store location paths depending on publish types, these will be used to set links to
# locations in the release email
#
$TargetNetLocation = ""
$NpmLocation = ""
$NugetLocation = ""

#region NPM Release

#
# NPM Release
#
if ($NPMRELEASE -eq "Y" -and !$TASKMODE) 
{
    LogMessage "Starting NPM release"
    
    #
    # Run pre npm-release scripts if specified
    #
    RunScripts "preNpmRelease" $NPMRELEASEPRECOMMAND $false $false

    if (Test-Path("package.json"))
    {
        $PublishFailed = $false;
        #
        # Pack tarball and mvoe to dist dir if specified
        #
        if ($NPMPACKDIST -eq "Y") 
        {
            & npm pack
            CheckExitCode

            if (!(Test-Path($PATHTODIST))) 
            {
                LogMessage "Creating tarball file directory and adding to version control" "magenta"
                New-Item -ItemType "directory" -Force -Path "$PATHTODIST" | Out-Null
                VcChangelistAddNew "$PATHTODIST"
                VcChangelistAddRemove "$PATHTODIST"
                VcChangelistAdd "$PATHTODIST"
            }

            $DestPackedFile = [Path]::Combine($PATHTODIST, "$PROJECTNAME.tgz")
            [System.Threading.Thread]::Sleep(100);
            if (![string]::IsNullOrEmpty($NPMSCOPE)) {
                $TmpPkgFile = "$NPMSCOPE-$PROJECTNAME-$VERSION.tgz".Substring(1)
            }
            elseif (![string]::IsNullOrEmpty($DefaultScope)) {
                $TmpPkgFile = "$DefaultScope-$PROJECTNAME-$VERSION.tgz".Substring(1)
            }
            else {
                $TmpPkgFile = "$PROJECTNAME-$VERSION.tgz"
            }
            #Move-Item  -Force "*$VERSION.*" $PackedFile
            #CheckPsCmdSuccess
            [System.Threading.Thread]::Sleep(500)
            LogMessage "Moving package:"
            LogMessage "   $TmpPkgFile"
            LogMessage "To:"
            LogMessage "   $DestPackedFile"

            & cmd /c move /Y "$TmpPkgFile" "$DestPackedFile"
            CheckExitCode
            if($LASTEXITCODE -eq 0) {
                VcChangelistAdd "$DestPackedFile"
                $TarballVersioned = VcIsVersioned $DestPackedFile
                if (!$TarballVersioned) {
                    VcChangelistAddNew "$DestPackedFile"
                    VcChangelistAddRemove "$DestPackedFile"
                }
            }
        }
        #
        # Publish to npm server
        #
        LogMessage "Publishing npm package to $NPMREGISTRY"
        if ($DRYRUN -eq $false) 
        {
            & npm publish --access public --registry $NPMREGISTRY
            CheckExitCode
        }
        else 
        {
            LogMessage "   Dry run, performing publish dry run only" "magenta"
            & npm publish --access public --registry $NPMREGISTRY --dry-run
            LogMessage "   Dry run, dry run publish finished" "magenta"
        }
        #
        #
        #
        if (!$PublishFailed) 
        {
            if (![string]::IsNullOrEmpty($NPMSCOPE)) {
                $NpmLocation = "$NPMREGISTRY/-/web/detail/$NPMSCOPE/$PROJECTNAME"
            }
            elseif (![string]::IsNullOrEmpty($DefaultScope)) {
                $NpmLocation = "$NPMREGISTRY/-/web/detail/$DefaultScope/$PROJECTNAME"
            }
            else {
                $NpmLocation = "$NPMREGISTRY/-/web/detail/$PROJECTNAME"
            }
        }
        else {
            VcRevert $true
            exit 150
        }
    }
    else {
        LogMessage "Could not find package.json" "darkyellow"
    }
    
    #
    # Run pre npm-release scripts if specified
    #
    RunScripts "postNpmRelease" $NPMRELEASEPOSTCOMMAND $false $false
}
elseif ($NPMRELEASE -eq "Y" -and $TASKMODE)
{
    if (![string]::IsNullOrEmpty($NPMSCOPE)) {
        $NpmLocation = "$NPMREGISTRY/-/web/detail/$NPMSCOPE/$PROJECTNAME"
    }
    elseif (![string]::IsNullOrEmpty($DefaultScope)) {
        $NpmLocation = "$NPMREGISTRY/-/web/detail/$DefaultScope/$PROJECTNAME"
    }
    else {
        $NpmLocation = "$NPMREGISTRY/-/web/detail/$PROJECTNAME"
    }
}

#endregion

#
# TODO - Nuget Release / .NET
#
if ($NUGETRELEASE -eq "Y" -and !$TASKMODE) 
{
    LogMessage "Starting Nuget release"
    LogMessage "Nuget release not yet supported" "darkyellow"
}

#region Network Release

#
# Network Release
#
if ($DISTRELEASE -eq "Y" -and !$TASKMODE) 
{
    LogMessage "Starting Distribution release"

    #
    # Run pre distribution-release scripts if specified
    #
    RunScripts "preDistRelease" $DISTRELEASEPRECOMMAND $false $false
    
    #
    # Copy history file to dist directory
    #
    if (![string]::IsNullOrEmpty($HISTORYFILE))
    {
        if (!(Test-Path("$PATHTODIST\$HISTORYFILE")) -and $DistIsVersioned) 
        {
            $HistoryFileName = [Path]::GetFileName($HISTORYFILE);
            VcChangelistAddRemove "$PATHTODIST\$HistoryFileName"
            VcChangelistAddNew "$PATHTODIST\$HistoryFileName"
        }
        Copy-Item -Path "$HISTORYFILE" -PassThru -Force -Destination "$PATHTODIST" | Out-Null
    }
    #
    # Create remote paths
    #
    $TargetNetLocation = [Path]::Combine($DISTRELEASEPATH, $PROJECTNAME, $VERSION)
    $TargetDocLocation = [Path]::Combine($DISTDOCPATH, $PROJECTNAME, $VERSION)
    #
    # Check for legacy Deploy.xml script.  The scipt should at least be modified to NOT
    # send the notification email.
    #
    if ($SKIPDEPLOYPUSH -ne "Y")
    {
        # Copy contents of dist dir to target location, and pdf docs to docs location
        #
        if ($DRYRUN -eq $false) 
        {
            LogMessage "Deploying distribution files to specified location:"
            LogMessage "   $TargetNetLocation"
            #
            # SoftwareImages Upload
            #
            # Create directory on network drive
            # TargetNetLocation is defined above as it is needed for email notification fn as well
            #
            if (!(Test-Path($TargetNetLocation))) {
                LogMessage "Create directory $TargetNetLocation"
                New-Item -Path "$TargetNetLocation" -ItemType "directory" | Out-Null
                CheckPsCmdSuccess
            }
            #
            # Copy all files in 'dist' directory that start with $PROJECTNAME, and the history file
            #
            LogMessage "Deploying files to $TargetNetLocation"
            Copy-Item "$PATHTODIST\*" -Destination "$TargetNetLocation" -Recurse | Out-Null
            CheckPsCmdSuccess
            #
            # DOC
            #
            if ($DISTDOCPATH -ne "")
            {
                #
                # Create directory on doc share
                #
                New-Item -Path "$TargetDocLocation" -ItemType "directory" | Out-Null
                CheckPsCmdSuccess
                #
                # Copy all pdf files in 'dist' and 'doc' and 'documentation' directories
                #
                $DocDirSrc = $DISTDOCPATHSRC
                if ([string]::IsNullOrEmpty($DocDirSrc)) 
                {
                    if (Test-Path("documentation")) {
                        $DocDirSrc = "documentation"
                    }
                    elseif (Test-Path("doc")) {
                        $DocDirSrc = "doc"
                    }
                    elseif (Test-Path("docs")) {
                        $DocDirSrc = "docs"
                    }
                    elseif (![string]::IsNullOrEmpty($PATHTOMAINROOT))
                    {
                        if (Test-Path("$PATHTOMAINROOT\doc")) {
                            $DocDirSrc = "$PATHTOMAINROOT\doc"
                        }
                        if (Test-Path("$PATHTOMAINROOT\docs")) {
                            $DocDirSrc = "$PATHTOMAINROOT\docs"
                        }
                        if (Test-Path("$PATHTOMAINROOT\documentation")) {
                            $DocDirSrc = "$PATHTOMAINROOT\documentation"
                        }
                    }
                }
                if (![string]::IsNullOrEmpty($DocDirSrc)) 
                {
                    LogMessage "Deploying pdf documentation to $TargetDocLocation"
                    Copy-Item "$DocDirSrc\*.pdf" -Destination "$TargetDocLocation" | Out-Null
                    CheckPsCmdSuccess
                    #LogMessage "Deploying txt documentation to $TargetDocLocation"
                    #Copy-Item "$DocDirSrc\*.txt" -Destination "$TargetDocLocation" | Out-Null
                    #CheckPsCmdSuccess
                }
                else {
                    LogMessage "Skipping documentation network push, doc direcory not found" "darkyellow"
                }
            }
        }
        else {
            LogMessage "Dry run, skipping basic push to network drive" "magenta"
        }
    }
    else {
        LogMessage "Skipped network release push (user specified)" "magenta"
    }

    #
    # Check DIST dir for unversioned files, add them if needed
    #
    if ($DISTADDALLTOVC -eq "Y")
    {
        Get-ChildItem "$PATHTODIST" -Recurse -Filter *.* | Foreach-Object {  # Bracket must stay same line as ForEach-Object
            $DistIsVersioned = VcIsVersioned $_.FullName
            LogMessage $_.FullName "magenta"
            if (!$DistIsVersioned) 
            {
                $fullName = $_.FullName.Replace("`${VERSION}", $VERSION).Replace("`${NEWVERSION}", $VERSION).Replace("`${CURRENTVERSION}", $CURRENTVERSION).Replace("`${LASTVERSION}", $CURRENTVERSION);
                LogMessage "Adding unversioned $($_.Name) to vc addition list" "magenta"
                # VcChangelistAddNew "$PATHTODIST\$_.Name"
                # VcChangelistAddRemove "$PATHTODIST\$_.Name"
                VcChangelistAddNew $fullName $true
                VcChangelistAddRemove $fullName $true
            }
        }
    }

    #
    # Run pre distribution-release scripts if specified
    #
    RunScripts "postDistRelease" $DISTRELEASEPOSTCOMMAND $false $false
}
elseif ($DISTRELEASE -eq "Y" -and $TASKEMAIL) 
{
    $TargetNetLocation = [Path]::Combine($DISTRELEASEPATH, $PROJECTNAME, $VERSION)
    $TargetDocLocation = [Path]::Combine($DISTDOCPATH, $PROJECTNAME, $VERSION)
}

#endregion

#
# Run post build scripts if specified
#
if (!$TASKMODE) {
    RunScripts "postBuild" $POSTBUILDCOMMAND $false $false
}

#
# Restore any configured package.json values to the original values
#
if ((Test-Path("package.json")) -and (!$TASKMODE -or $TASKTOUCHVERSIONS)) {
    Restore-PackageJson
}

#region Github Release

#
# Github Release
#
$GithubReleaseId = "";

if ($_RepoType -eq "git" -and $GITHUBRELEASE -eq "Y" -and !$TASKMODE) 
{
    LogMessage "Creating GitHub v$VERSION release"

    #
    # Run pre msntis-release scripts if specified
    #
    RunScripts "preGithubRelease" $GITHUBRELEASEPRECOMMAND $false $false

    #
    # Create changelog content
    #
    $ReleaseVersion = $VERSION;
    #
    $GithubChangelogParts = @()
    if (![string]::IsNullOrEmpty($HISTORYFILE)) 
    {
        LogMessage "   Converting history text to github release changelog html"
        $GithubChangelogParts = $ClsHistoryFile.getHistory($PROJECTNAME, $ReleaseVersion, 1, $VERSIONTEXT, "parts", $HISTORYFILE, "", "", "", "", "", "", "", @(), "")
    }
    elseif (![string]::IsNullOrEmpty($CHANGELOGFILE)) 
    {
        LogMessage "   Converting changelog markdown to github release changelog html"
        $GithubChangelogParts = $ClsHistoryFile.getChangelog($PROJECTNAME, $ReleaseVersion, 1, $VERSIONTEXT, "parts", $CHANGELOGFILE, "", "", "", "", "", "", "", @(), "", $false, $IsAppPublisher)
    }

    if ($GithubChangelogParts-eq $null -or $GithubChangelogParts.Length -eq 0 -or $GithubChangelogParts[0] -eq "error") {
        $GithubChangelogParts = $null
    }
    else {
        $GithubChangelog = Get-ReleaseChangelog $GithubChangelogParts $false $false # $true
    }

    if ($GithubChangelog -ne $null -and $DRYRUN -eq $false) 
    {
        # Allow user to edit html changelog
        #
        if ($GITHUBCHGLOGEDIT -eq "Y")
        {
            $TmpFile = "${Env:Temp}\changelog.tmp.html"
            Set-Content -NoNewline -Path $TmpFile -Value $GithubChangelog
            CheckPsCmdSuccess
            [System.Threading.Thread]::Sleep(750)
            $TextEditorProcess = Start-Process -filepath "notepad" -args $TmpFile -PassThru
            $TextEditorProcess.WaitForInputIdle() | Out-Null
            Wait-Process -Id $TextEditorProcess.Id | Out-Null
            $GithubChangelog = Get-Content -path $TmpFile -Raw
        }

        # Set up the request body for the 'create release' request
        #
        $Request = @{
            "tag_name" = "v$VERSION"
            "target_commitish" = "$BRANCH"
            "name" = "v$VERSION"
            "body" = "$GithubChangelog"
            "draft" = $true
            "prerelease" = $false
        } | ConvertTo-Json
        #
        # Set up the request header, this will be used to both create the release and to upload
        # any assets.  Note that for each asset, the content-type must be set appropriately
        # according to the type of asset being uploaded
        #
        $Header = @{
            "Accept" = "application/vnd.github.v3+json"
            "mediaTypeVersion" = "v3"
            "squirrelAcceptHeader" = "application/vnd.github.squirrel-girl-preview"
            "symmetraAcceptHeader" = "application/vnd.github.symmetra-preview+json"
            "Authorization" = "token ${Env:GITHUB_TOKEN}"
            "Content-Type" = "application/json; charset=UTF-8"
        }
        #
        # Enable TLS1.2
        #
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        #
        # Encode url parts
        #
        $encPrjName = $PROJECTNAME.Replace(" ", "%20")
        #
        # Send the REST POST to create the release
        #
        $url = "https://api.github.com/repos/$GITHUBUSER/$encPrjName/releases"
        $Response = Invoke-RestMethod $url -UseBasicParsing -Method POST -Body $Request -Headers $Header
        CheckPsCmdSuccess
        #
        # Make sure an upload_url value exists on the response object to check for success
        #
        if ($? -eq $true -and $Response.upload_url)
        {
            $GithubReleaseId = $Response.id;

            LogMessage "Successfully created GitHub release v$VERSION" "darkgreen"
            LogMessage "   ID         : $($Response.id)" "darkgreen"
            LogMessage "   Tarball URL: $($Response.zipball_url)" "darkgreen"
            LogMessage "   Zipball URL: $($Response.tarball_url)" "darkgreen"
            #
            # Creating the release was successful, upload assets if any were specified
            #
            if ($GITHUBASSETS.Length -gt 0)
            {
                LogMessage "Uploading GitHub assets"
                foreach ($Asset in $GITHUBASSETS)
                {
                    if (Test-Path($Asset))
                    {
                        #
                        # Get filename to be use as a GET parameter in url
                        #
                        $AssetName = [Path]::GetFileName($Asset)
                        $Extension = [Path]::GetExtension($AssetName).ToLower()
                        #
                        # Set the content-type header value to the mime type of the asset
                        #
                        $Header["Content-Type"] = $ContentTypeMap[$Extension]
                        #
                        # The request to upload an asset is the raw binary file data
                        #
                        $Request = [System.IO.File]::ReadAllBytes($Asset)
                        #$Request = Get-Content -Path $asset -Encoding Byte
                        CheckPsCmdSuccess
                        if ($? -eq $true)
                        {
                            #
                            # Upload the asset via GitHub API.
                            #
                            $url = $Response.upload_url
                            $url = $url.Replace("{?name,label}", "") + "?name=$AssetName"
                            $Response2 = Invoke-RestMethod $url -UseBasicParsing -Method POST -Body $Request -Headers $Header
                            CheckPsCmdSuccess
                            #
                            # Make sure an id value exists on the response object to check for success
                            #
                            if ($? -eq $true -and $Response2.id) {
                                LogMessage "Successfully uploaded GitHub asset $AssetName" "darkgreen"
                                LogMessage "   ID          : $($Response2.id)" "darkgreen"
                                LogMessage "   Download URL: $($Response2.browser_download_url)" "darkgreen"
                            }
                            else {
                                LogMessage "Failed to upload GitHub asset $AssetName" "red"
                            }
                        }
                        else {
                            LogMessage "Failed to upload GitHub asset $AssetName - could not read input file" "red"
                        }
                    }
                    else {
                        $AssetName = [Path]::GetFileName($Asset)
                        LogMessage "Failed to upload GitHub asset $AssetName - input file does not exist" "red"
                    }
                }
            }
        }
        else {
            LogMessage "Failed to create GitHub v$VERSION release" "red"
        }
    }
    else {
        if ($null -ne $GithubChangelog) {
            LogMessage "Dry run, skipping GitHub release"
            LogMessage "Dry run has generated an html changelog from previous version to test functionality:"
            LogMessage $GithubChangelog
        }
        else {
            LogMessage "Failed to create GitHub v$VERSION release" "red"
        }
    }

    #
    # Run pre msntis-release scripts if specified
    #
    RunScripts "postGithubRelease" $GITHUBRELEASEPOSTCOMMAND $false $false
}

#endregion

#region MantisBT Release

#
# MantisBT Release
#
if ($MANTISBTRELEASE -eq "Y" -and (!$TASKMODE -or $TASKMANTISBT)) 
{
    LogMessage "Starting MantisBT release"
    LogMessage "Creating MantisBT v$VERSION release"

    #
    # Run pre msntis-release scripts if specified
    #
    RunScripts "preMantisRelease" $mantisbtReleasePreCommand $false $false

    $dry_run = 0;
    $ReleaseVersion = $VERSION;
    if ($DRYRUN -eq $true) 
    {
        LogMessage "Dry run only, will pass 'dryrun' flag to Mantis Releases API"
        $dry_run = 1;
    }

    $NotesIsMarkdown = 0
    $MantisChangelog = $null
    $MantisChangeLogParts = @()
    
    if (![string]::IsNullOrEmpty($HISTORYFILE)) 
    {
        LogMessage "   Converting history text to mantisbt release changelog html"
        $MantisChangeLogParts = $ClsHistoryFile.getHistory($PROJECTNAME, $ReleaseVersion, 1, $VERSIONTEXT, "parts", $HISTORYFILE, "", "", "", "", "", "", "", @(), "")
    }
    elseif (![string]::IsNullOrEmpty($CHANGELOGFILE)) 
    {
        LogMessage "   Converting changelog markdown to mantisbt release changelog html"
        $MantisChangelogParts = $ClsHistoryFile.getChangelog($PROJECTNAME, $ReleaseVersion, 1, $VERSIONTEXT, "parts", $CHANGELOGFILE, "", "", "", "", "", "", "", @(), "", $false, $IsAppPublisher)
    }

    if ($null -eq $MantisChangelogParts -or $MantisChangelogParts.Length -eq 0 -or $MantisChangelogParts[0] -eq "error") {
        $MantisChangelog = $null
    }
    else {
        $MantisChangelog = Get-ReleaseChangelog $MantisChangeLogParts $true
    }

    if ($null -ne $MantisChangelog) 
    {
        #
        # Log the changelog contents if this is a dry run
        #
        if ($DRYRUN -eq $true)
        {
            LogMessage "Dry run has generated an html changelog to test functionality:"
            LogMessage $MantisChangelog
        }

        #
        # Allow user to edit html changelog
        #
        if ($MANTISBTCHGLOGEDIT -eq "Y")
        {
            $TmpFile = "${Env:Temp}\changelog.tmp.html"
            Set-Content -NoNewline -Path $TmpFile -Value $MantisChangelog
            CheckPsCmdSuccess
            [System.Threading.Thread]::Sleep(750)
            $TextEditorProcess = Start-Process -filepath "notepad" -args $TmpFile -PassThru
            $TextEditorProcess.WaitForInputIdle() | Out-Null
            Wait-Process -Id $TextEditorProcess.Id | Out-Null
            $MantisChangelog = Get-Content -path $TmpFile -Raw
        }

        #
        # Set up the request body for the 'create release' request
        #
        $Request = @{
            "dryrun" = $dry_run
            "version" = $VERSION
            "notes" = $MantisChangelog
            "notesismd" = $NotesIsMarkdown
            "assets" = @()
        }
        #
        # Build assets list
        #
        if ($MANTISBTASSETS.Length -gt 0)
        {
            LogMessage "Building MantisBT assets list"
            foreach ($MbtAsset in $MANTISBTASSETS)
            {
                $Asset = $MbtAsset;
                $AssetDescrip = ""

                if ($MbtAsset.Contains("|"))
                {
                    $Asset = $MbtAsset.Split("|")[0]
                    $AssetDescrip = $MbtAsset.Split("|")[1]
                }

                if (Test-Path($Asset))
                {
                    $AssetName = [Path]::GetFileName($Asset)
                    $Extension = [Path]::GetExtension($AssetName).ToLower()
                    #
                    # The format to upload an asset is the base64 encoded binary file data
                    #
                    LogMessage "Reading file $Asset"
                    $FileData = [System.IO.File]::ReadAllBytes($Asset)
                    CheckPsCmdSuccess
                    if ($? -eq $true)
                    {
                        # Base 64 encode file data
                        #
                        $FileDataBase64 = [Convert]::ToBase64String($FileData)
                        #
                        # Build json
                        #
                        $AssetData = @{
                            "name" = $AssetName
                            "desc" = $AssetDescrip
                            "type" = $ContentTypeMap[$Extension]
                            "data" = $FileDataBase64
                        }
                        
                        $Request.assets += $AssetData
                    }
                    else {
                        LogMessage "Partially failed to build MantisBT asset $AssetName - could not read input file" "red"
                    }
                }
                else {
                    $AssetName = [Path]::GetFileName($Asset)
                    LogMessage "Partially failed to build MantisBT asset $AssetName - input file does not exist" "red"
                }
            }
        }
        
        #
        # Format request JSON
        #
        $Request = $Request | ConvertTo-Json
        #
        # Enable TLS1.2 in the case of HTTPS
        #
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

        for ($i = 0; $i -lt $MANTISBTURL.Length; $i++)
        {
            #
            # Set up the request header, this will be used to both create the release and to upload
            # any assets.  Note that for each asset, the content-type must be set appropriately
            # according to the type of asset being uploaded
            #
            $Header = @{
                "Authorization" = $MANTISBTAPITOKEN[$i]
                "Content-Type" = "application/json; charset=UTF-8"
            }
            #
            # Encode url part
            #
            $encPrjName = $MANTISBTPROJECT.Replace(" ", "%20")
            #
            # Send the REST POST to create the release w/ assets
            #
            $url = $MANTISBTURL[$i] + "/plugins/Releases/api/releases/$encPrjName"
            LogMessage "Sending Add-Release REST request to $url"
            $Response = Invoke-RestMethod $url -UseBasicParsing -Method POST -Body $Request -Headers $Header
            CheckPsCmdSuccess
            #
            # Check response object for success
            #
            if ($? -eq $true)
            {
                if ($Response -is [System.String])
                {
                    LogMessage "Partial error creating MantisBT release v$VERSION" "red"
                    LogMessage $Response "red"
                }
                else {
                    LogMessage "Successfully created MantisBT release v$VERSION" "darkgreen"
                    LogMessage "   ID         : $($Response.id)" "darkgreen"
                    LogMessage "   Message    : $($Response.msg)" "darkgreen"
                    LogMessage "   URL        : $($MANTISBTURL[$i])" "darkgreen"
                    LogMessage "   Token      : $($MANTISBTAPITOKEN[$i])" "darkgreen"
                }
            }
            else {
                LogMessage "Failed to create MantisBT v$VERSION release" "red"
            }
        }
    }
    else {
        LogMessage "Failed to create MantisBT v$VERSION release" "red"
    }

    #
    # Run pre msntis-release scripts if specified
    #
    RunScripts "postMantisRelease" $mantisbtReleasePostCommand $false $false
}

#endregion

#
# Run custom deploy script if specified
#
if (!$TASKMODE)
{
    if ($SKIPDEPLOYPUSH -ne "Y" -and $DRYRUN -eq $false)
    {
        RunScripts "deploy" $DEPLOYCOMMAND $false $false
    }
    else {
        LogMessage "Skipped running custom deploy script" "magenta"
    }
}

#
# Send release notification email
#
if (!$TASKCHANGELOG -and !$TASKTOUCHVERSIONS -and !$TASKMANTISBT -and !$TASKCIENVSET -and !$TASKMODESTDOUT -and ($EMAILNOTIFICATION -eq "Y" -or $TASKEMAIL)) {
    Send-Notification "$TargetNetLocation" "$NpmLocation" "$NugetLocation"
}

#
# Run pre commit scripts if specified
#
if (!$TASKMODE) {
    RunScripts "preCommit" $PRECOMMITCOMMAND $false $false
}

#region Commit / Tag VC

if (!$TASKMODE -or $TASKCOMMIT -or $TASKTAG)
{
    #
    # Change dircetory to svn/git root that contains the .svn/.git folder to isse SVN commands,
    # all paths in the changelist will be relative to this root
    #
    if (![string]::IsNullOrEmpty($PATHTOMAINROOT) -and $PATHTOMAINROOT -ne ".") {
        set-location $PATHTOMAINROOT
    }

    if ($_RepoType -eq "svn")
    {
        if (Test-Path(".svn"))
        {
            $svnUser = $Env:SVN_AUTHOR_NAME
            $svnToken = $Env:SVN_TOKEN
            #$VCCHANGELIST = $VCCHANGELIST.Trim()
            #
            # Check version changes in to SVN if there's any touched files
            #
            if ($VCCHANGELIST -ne "" -and (!$TASKTAG -or $TASKCOMMIT)) 
            {
                if ($DRYRUN -eq $false) 
                {
                    if ($SKIPCOMMIT -ne "Y")
                    {
                        # SVN add
                        #
                        if ($VCCHANGELISTADD -ne "")
                        {
                            $cl = $VCCHANGELISTADD.Replace("|", " ");
                            LogMessage "Adding unversioned touched files to GIT version control"
                            LogMessage "   $cl"
                            if (![string]::IsNullOrEmpty($svnUser) -and ![string]::IsNullOrEmpty($svnToken)) {
                                Invoke-Expression -Command "svn add $cl --non-interactive --no-auth-cache --username `"$svnUser`" --password `"$svnToken`""
                            }
                            else {
                                Invoke-Expression -Command "svn add $cl --non-interactive"
                            }
                            CheckExitCode $false
                        }
                        $cl = $VCCHANGELIST.Replace("|", " ");
                        LogMessage "Committing touched files to SVN version control"
                        LogMessage "   $cl"
                        #
                        # SVN commit
                        #
                        if (![string]::IsNullOrEmpty($svnUser) -and ![string]::IsNullOrEmpty($svnToken)) {
                            Invoke-Expression -Command "svn commit $cl -m `"chore(release): $VERSION [skip ci]`" --non-interactive --no-auth-cache --username `"$svnUser`" --password `"$svnToken`""
                        }
                        else {
                            Invoke-Expression -Command "svn commit $cl -m `"chore(release): $VERSION [skip ci]`" --non-interactive"
                        }
                        CheckExitCode $false
                    }
                    elseif (![string]::IsNullOrEmpty($VCCHANGELISTMLT)) 
                    {
                        $cl = $VCCHANGELISTMLT.Replace("|", " ");
                        LogMessage "Committing touched multi-publish files to SVN version control"
                        LogMessage "   $cl"
                        #
                        # SVN commit
                        #
                        if (![string]::IsNullOrEmpty($svnUser) -and ![string]::IsNullOrEmpty($svnToken)) {
                            
                            Invoke-Expression -Command "svn commit $cl -m `"chore(release-mlt): $VERSION [skip ci]`" --non-interactive --no-auth-cache --username `"$svnUser`" --password `"$svnToken`""
                        }
                        else {
                            Invoke-Expression -Command "svn commit $cl -m `"chore(release-mlt): $VERSION [skip ci]`" --non-interactive"
                        }
                        CheckExitCode $false
                    }
                    else {
                        LogMessage "Skipping touched file SVN commit, user specified" "darkyellow"
                    }
                }
                else 
                {
                    if ($DRYRUNVCREVERT -eq "Y") {
                        LogMessage "Dry run, reverting changes" "magenta"
                        VcRevert
                    }
                    if ($DRYRUN -eq $true) {
                        LogMessage "   Dry run, skipping touched file SVN commit" "magenta"
                    }
                }
            }

            #
            # Create version tag
            #
            if ((!$TASKCOMMIT -and $VCTAG -eq "Y") -or $TASKTAG)
            {
                $TagLocation = $_Repo.Replace("trunk", "tags").Replace("branches/" + $BRANCH, "tags")
                if (![string]::IsNullOrEmpty($PATHPREROOT) -and [string]::IsNullOrEmpty($VCTAGPREFIX))
                {

                    LogMessage "Skipping version tag, 'vcTagPrefix' must be set for subprojects" "darkyellow"
                    LogMessage "The project must be tagged manually using the following command:" "magenta"
                    LogMessage "   svn copy `"$_Repo`" `"$TagLocation/prefix-v$VERSION`" -m `"chore(release): tag v$VERSION [skip ci]`"" "magenta"
                }
                else 
                {
                    $TagMessage = ""
                    if ([string]::IsNullOrEmpty($VCTAGPREFIX) -or $VCTAGPREFIX -eq ".") 
                    {
                        $TagLocation = "$TagLocation/v$VERSION"
                        $TagMessage = "chore(release): tag version $VERSION [skip ci]"
                    }
                    else {
                        $TagLocation = "$TagLocation/$VCTAGPREFIX-v$VERSION"
                        $TagMessage = "chore(release): tag $VCTAGPREFIX version $VERSION [skip ci]"
                    }
                    LogMessage "Tagging SVN version at $TagLocation"
                    if ($DRYRUN -eq $false) 
                    {   #
                        # Call svn copy to create 'tag'
                        #
                        if (![string]::IsNullOrEmpty($svnUser) -and ![string]::IsNullOrEmpty($svnToken)) {
                            
                            & svn copy "$_Repo" "$TagLocation" -m "$TagMessage" --non-interactive --no-auth-cache --username "$svnUser" --password "$svnToken"
                        }
                        else {
                            & svn copy "$_Repo" "$TagLocation" -m "$TagMessage" --non-interactive
                        }
                        CheckExitCode $false
                    }
                    else {
                        LogMessage "Dry run, skipping create version tag" "magenta"
                    }
                }
            }
            else {
                LogMessage "Skipping version tag, user specified" "darkyellow"
            }
        }
        else {
            LogMessage "Could not find .svn folder, skipping commit and version tag" "red"
        }
    }

    #
    # GIT
    #
    elseif ($_RepoType -eq "git")
    {
        if (Test-Path(".git"))
        {
            #$VCCHANGELIST = $VCCHANGELIST.Trim()
            #
            # Check version changes in to SVN if there's any touched files
            #
            if ($VCCHANGELIST -ne "" -and (!$TASKTAG -or $TASKCOMMIT)) 
            {
                if ($DRYRUN -eq $false) 
                {
                    if ($SKIPCOMMIT -ne "Y")
                    {
                        # GIT add
                        #
                        if ($VCCHANGELISTADD -ne "")
                        {
                            $cl = $VCCHANGELISTADD.Replace("|", " ");
                            LogMessage "Adding unversioned touched files to GIT version control"
                            LogMessage "   $cl"
                            Invoke-Expression -Command "git add -- $cl"
                            CheckExitCode $false
                        }
                        #
                        # GIT commit and GIT push
                        #
                        LogMessage "Committing touched files to GIT version control"
                        $cl = $VCCHANGELIST.Replace("|", " ");
                        LogMessage "   $cl"
                        Invoke-Expression -Command "git commit --quiet -m `"chore(release): $VERSION [skip ci]`" -- $cl"
                        CheckExitCode $false
                        Invoke-Expression -Command "git push origin master:master"
                        CheckExitCode $false
                    }
                    elseif (![string]::IsNullOrEmpty($VCCHANGELISTMLT))
                    {
                        $cl = $VCCHANGELISTMLT.Replace("|", " ");
                        LogMessage "Committing touched multi-publish files to SVN version control"
                        LogMessage "   $cl"
                        #
                        # GIT commit
                        #
                        Invoke-Expression -Command "git commit --quiet -m `"chore(release-mlt): $VERSION [skip ci]`" -- $cl"
                        CheckExitCode $false
                        Invoke-Expression -Command "git push origin master:master"
                        CheckExitCode $false
                    }
                    else {
                        LogMessage "Skipping touched file GIT commit, user specified" "darkyellow"
                    }
                }
                else 
                {
                    if ($DRYRUNVCREVERT -eq "Y") {
                        LogMessage "Dry run, reverting changes" "magenta"
                        VcRevert
                    }
                    if ($DRYRUN -eq $true) {
                        LogMessage "Dry run, skipping touched file GIT commit" "magenta"
                    }
                }
            }

            #
            # Create version tag
            #
            if ((!$TASKCOMMIT -and $VCTAG -eq "Y") -or $TASKTAG)
            {
                if (![string]::IsNullOrEmpty($PATHPREROOT) -and [string]::IsNullOrEmpty($VCTAGPREFIX))
                {
                    LogMessage "Skipping version tag, 'vcTagPrefix' must be set for subprojects" "darkyellow"
                    LogMessage "The project must be tagged manually using the following command:" "magenta"
                    LogMessage "   git tag -a prefix-v$VERSION -m `"chore(release): tag v$VERSION [skip ci]`"" "magenta"
                }
                else 
                {
                    $TagLocation = "v$VERSION"
                    $TagMessage = "chore(release): tag version $VERSION [skip ci]"
                    if (![string]::IsNullOrEmpty($VCTAGPREFIX) -and $VCTAGPREFIX -ne ".") 
                    {
                        $TagLocation = "${VCTAGPREFIX}-v$VERSION"
                        $TagMessage = "chore(release): tag $VCTAGPREFIX version $VERSION [skip ci]"
                    }
                    LogMessage "Tagging GIT version $TagLocation"
                    if ($DRYRUN -eq $false) 
                    {
                        #
                        # Call git tag to create 'tag', then push to remote with push --tags
                        # If a Github release was made, then the tag was created on release, remove that tag and re-tag
                        #
                        if ($GITHUBRELEASE -ne "Y") {
                            & git tag -a $TagLocation -m "$TagMessage"
                        }
                        else {
                            LogMessage "Re-tagging after release"
                            & git push origin :refs/tags/$TagLocation
                            CheckExitCode $false
                            & git tag -fa $TagLocation -m "$TagMessage"
                        }

                        CheckExitCode $false
                        & git push --tags
                        CheckExitCode $false

                        if ($GITHUBRELEASE -eq "Y" -and ![string]::IsNullOrEmpty($GithubReleaseId))
                        {
                            LogMessage "Marking release as published"
                            #
                            # Mark release published
                            # Set up the request body for the 'create release' request
                            #
                            $Request = @{
                                "draft" = $false
                            } | ConvertTo-Json
                            #
                            # Set up the request header
                            #
                            $Header = @{
                                "Accept" = "application/vnd.github.v3+json"
                                "mediaTypeVersion" = "v3"
                                "squirrelAcceptHeader" = "application/vnd.github.squirrel-girl-preview"
                                "symmetraAcceptHeader" = "application/vnd.github.symmetra-preview+json"
                                "Authorization" = "token ${Env:GITHUB_TOKEN}"
                                "Content-Type" = "application/json; charset=UTF-8"
                            }
                            #
                            # Send the REST POST to publish the release
                            #
                            $url = "https://api.github.com/repos/$GITHUBUSER/$PROJECTNAME/releases/" + $GithubReleaseId;
                            $Response = Invoke-RestMethod $url -UseBasicParsing -Method PATCH -Body $Request -Headers $Header
                            CheckPsCmdSuccess
                            #
                            # Make sure an upload_url value exists on the response object to check for success
                            #
                            if ($? -eq $true -and $Response.upload_url)
                            {
                                LogMessage "Successfully patched/published GitHub release v$VERSION" "darkgreen"
                            }
                            else {
                                LogMessage "Failed to publish/patch GitHub v$VERSION release" "red"
                            }
                        }
                    }
                    else {
                        LogMessage "Dry run, skipping create version tag" "magenta"
                    }
                }
            }
            else {
                LogMessage "Skipping version tag, user specified" "darkyellow"
            }
        }
        else {
            LogMessage "Could not find .git folder, skipping commit and version tag" "red"
        }
    }

    if (![string]::IsNullOrEmpty($PATHTOMAINROOT) -and $PATHTOMAINROOT -ne ".") {
        set-location $PATHPREROOT
    }

    #
    # Run pre commit scripts if specified
    #
    RunScripts "postCommit" $POSTCOMMITCOMMAND $false $false

    #
    # Run post build scripts if specified
    #
    RunScripts "postRelease" $POSTRELEASECOMMAND $false $false

    if ($DRYRUN -eq $true) {
        LogMessage "Dry run completed"
        if ($DRYRUNVCREVERT -ne "Y") {
            LogMessage "   You should manually revert any auto-touched files via SCM" "magenta"
        }
    }
}
else  # SINGLETASKMODE
{
    LogMessage "Single task mode run completed"
}

#endregion

#
# CI Tasks
#
if ($TASKCIENVSET)
{
    LogMessage "Write CI environment to file 'ap.env'"
    if (Test-Path("ap.env")) {
        Remove-Item -Force -Path "ap.env" | Out-Null
    }
    New-Item -ItemType "file" -Force -Path "ap.env" -Value "$CURRENTVERSION`n" | Out-Null
    Add-Content "ap.env" "$VERSION" | Out-Null
    if (![string]::IsNullOrEmpty($HISTORYFILE)) {
        Add-Content "ap.env" "$HISTORYFILE" | Out-Null
    }
    elseif (![string]::IsNullOrEmpty($CHANGELOGFILE)) {
        Add-Content "ap.env" "$CHANGELOGFILE" | Out-Null
    }
}
#
# CI Tasks
#
if ($TASKCIENVINFO)
{
    LogMessage "Output CI environment info"
    if (![string]::IsNullOrEmpty($HISTORYFILE)) {
        Write-Host "$CURRENTVERSION|$VERSION|$HISTORYFILE"
    }
    elseif (![string]::IsNullOrEmpty($CHANGELOGFILE)) {
        Write-Host "$CURRENTVERSION|$VERSION|$CHANGELOGFILE"
    }
    else {
        Write-Host "$CURRENTVERSION|$VERSION"
    }
}

LogMessage "Completed"
LogMessage "Finished successfully" "darkgreen"

} # end xRun

exit
