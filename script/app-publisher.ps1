using namespace System.IO
using namespace System.Text.RegularExpressions

#*********************************************************************************************#

#####  ##   ##  ###      #     ###  #   #  #####    #####    #    #####    #     ##   ##  #####
#      # # # #  #  #     #      #   ##  #  #        #   #   # #   #   #   # #    # # # #  #
#      #  #  #  #   #    #      #   # # #  ####     #####  #####  ####   #####   #  #  #  #####
#      #     #  #  #     #      #   #  ##  #        #      #   #  #  #   #   #   #     #      #
#####  #     #  ###      ####  ###  #   #  #####    #      #   #  #   #  #   #   #     #  #####

#*********************************************************************************************#
#
# Command line args are for future semantic-release chain.  Currently, the below variables 
# are $in this script.
#
# If this is a node based project (i.e. the directory node_modules exists), then the
# current version is determined from package.json, and the next release version is determined
# by the semver module.
# If this is not a node based project (i.e. C project, Java, .NET), we determine the current
# version from the history.txt file.  Depending on the current version semantics, we either
# increment the version number (legacy pj versioning) or use the semver module (semantic
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

#
# Define some script classes:
#
#     Vc
#     HistoryFile
#     AnalyzeCommits
#

class Vc
{
    [array]getCommits($RepoType, $Repo, $CurrentVersion, $TagPrefix)
    {
        $comments = @()
        Log-Message "Getting commits made since prior release/version"

        $TagPre = "v"
        if (![string]::IsNullOrEmpty($TagPrefix) -and $TagPrefix -ne ".") {
            $TagPre = "$TagPrefix-v"
        }

        Log-Message "   Repo type      :  $RepoType"
        Log-Message "   Repo           :  $Repo"
        Log-Message "   CurrentVersion :  $CurrentVersion"
        Log-Message "   TagPrefix      :  $TagPre"

        if ($RepoType -eq "svn")
        {
            Log-Message "Retrieving most recent tag"
            #
            # Issue SVN log command
            #
            $TagLocation = $Repo.Replace("trunk", "tags");
            $xml = svn log --xml "$TagLocation" --verbose --limit 50
            if ($LASTEXITCODE -ne 0) {
                Log-Message "No commits found or no version tag exists" "red"
                return $comments
            }
            #
            # Parse log response
            #
            $path = $null
            Log-Message "Parsing response from SVN"
            try {
                $path = (([Xml] ($xml)).Log.LogEntry.Paths.Path |
                Where-Object { $_.action -eq 'A' -and $_.kind -eq 'dir' -and $_.InnerText -like "*tags/$TagPre[1-9]*"} |
                Select-Object -Property @(
                    @{N='date'; E={$_.ParentNode.ParentNode.Date}},
                    @{N='path'; E={$_.InnerText}} )|
                Sort-Object Date -Descending | Select-Object -First 1).path
            }
            catch {
                Log-Message "Response could not be parsed, invalid module, no commits found, or no version tag exists" "red"
                return $comments
            }
            #
            $rev = (([Xml]($xml)).Log.LogEntry | Where-Object { $_.revision -ne ''} | Select-Object -First 1).revision
            #
            Log-Message "   Found version tag:"
            Log-Message "      Rev     : $rev"
            Log-Message "      Path    : $path"
            #
            # Retrieve commits since last version tag
            #
            Log-Message "Retrieving commits since last version"
            $xml = svn log --xml --verbose --limit 50 -r ${rev}:HEAD
            Log-Message "Parsing response from SVN"
            #
            # Create xml document object from SVN log response
            #
            $xdoc = $null;
            try {
                $xdoc = [Xml]$xml
            }
            catch {
                Log-Message "No commits found or no version tag exists" "red"
                return $comments
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
            $GitOut = & git log $TagPre$CurrentVersion..HEAD --pretty=format:"%s"
            if ($LASTEXITCODE -eq 0 -and ![string]::IsNullOrEmpty($GitOut)) {
                $comments = $GitOut.Split("`n")
            }
            else {
                Log-Message "No commits found or no version tag exists" "red"
                Log-Message "Git Output: $GitOut" "red"
                return $comments
            }
        }
        else 
        {
            Log-Message "Invalid repository type specified: $RepoType" "red"
            return $comments
        }

        $NumCommits = $comments.Length;
        Log-Message "Found $NumCommits commits"

        #
        # Sort comments array
        #
        if ($comments.Length -gt 0) {
            $comments = $comments | Sort -Unique
        }

        return $comments
    }
}


class CommitAnalyzer
{
    [string]get($Commits) 
    {
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
            if ($line -eq "") { continue; }

            $linefmt = $line.ToLower();
            if ($linefmt.Contains("breaking change")) # bump major on breaking change
            {
                Log-Message "Breaking change found"
                $ReleaseLevel = "major";
                break;
            }
            if ($linefmt.Contains("majfeat: ")) # bump major on major feature
            {
                Log-Message "Major feature found"
                $ReleaseLevel = "major";
                break;
            }
            if ($linefmt.Contains("feat: ")) # bump minor on feature
            {
                Log-Message "Feature found";
                $ReleaseLevel = "minor";
                break;
            }
            #if ($linefmt.Contains("perf"))
            #{
            #    Log-Message "Performance enhancement found";
            #    $ReleaseLevel = "minor";
            #    break;
            #}
        }

        return $ReleaseLevel;
    }

    [string] getFormatted($Subject)
    {
        $FormattedSubject = $Subject

        switch ($Subject)
        {
            "build"   { $FormattedSubject = "Build System"; break }
            "chore"   { $FormattedSubject = "Chores"; break }
            "docs"    { $FormattedSubject = "Documentation"; break }
            "feat"    { $FormattedSubject = "Features"; break }
            "featmin" { $FormattedSubject = "Minor Features"; break }
            "minfeat" { $FormattedSubject = "Minor Features"; break }
            "fix"     { $FormattedSubject = "Bug Fixes"; break }
            "perf"    { $FormattedSubject = "Performance Enhancement"; break }
            "refactor"{ $FormattedSubject = "Code Refactoring"; break }
            "style"   { $FormattedSubject = "Code Styling"; break }
            "test"    { $FormattedSubject = "Tests"; break }
            "project" { $FormattedSubject = "Project Structure"; break }
            "layout"  { $FormattedSubject = "Layout"; break }
            default   { $FormattedSubject = $Subject; break }
        }

        return $FormattedSubject
    }
}


class HistoryFile
{
    [string]getVersion($in, $stringver)
    {
        return $this.getHistory("", "", 0, $stringver, $false, $in, "", "", "", "")
    }

    [string]createSectionFromCommits($CommitsList, $LineLen)
    {
        $comments = ""
        $commentNum = 1

        if ($CommitsList -eq $null -or $CommitsList.Length -eq 0) {
            return $comments
        }

        #
        # Parse the commit messages
        #
        foreach ($msg in $CommitsList)
        {
            $msg = $msg.Trim()
            if($null -ne $msg -and $msg -ne "" -and !$msg.ToLower().StartsWith("chore"))
            {
                $line = "";
                
                if ($commentNum -lt 10) {
                    $line = "$commentNum.  "
                }
                else {
                    $line = "$commentNum. "
                }

                $msgs = $msg.Split("`n");
                for ($i = 0; $i -lt $msgs.Length; $i++)
                {
                    if ($i -gt 0) {
                        $line += "`r`n"
                    }
                    $msg = $msgs[$i];
                    if ($msg.Length -gt $LineLen)
                    {
                        $idx = $msg.LastIndexOf(" ", $LineLen)
                        $line += $msg.SubString(0, $idx)
                        while ($msg.Length -gt $LineLen)
                        {
                            $msg = $msg.SubString($idx)
                            $line += "`r`n";
                            if ($msg.Length -gt $LineLen) {
                                $idx = $msg.LastIndexOf(" ", $LineLen)
                                $line += $msg.SubString(0, $idx).Trim()
                            }
                            else {
                                $line += $msg.Trim()
                            }
                        }
                    }
                    else {
                        $line +=  $msg.Trim();
                    }
                }

                $idx = $line.IndexOf("`n");
                while ($idx -ne -1)
                {
                    $line = $line.Substring(0, $idx + 1) + "    " + $line.Substring($idx + 1)
                    $idx = $line.IndexOf("`n", $idx + 1)
                }

                $comments = $comments + $line + "`r`n`r`n"
            
                $commentNum++
            }
        }
        
        return $comments
    }

    [string]getHistory($project, $version, $numsections, $stringver, $listonly, $in, $out, $targetloc, $npmpkg, $nugetpkg)
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
            Log-Message "Error: No history file specified" "red"
            exit 160;
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
            Log-Message "   Parse Error - Invalid NumSections parameter" "red"
            Log-Message "   Error type  : $_.Exception.GetType().FullName" "red"
            Log-Message "   Error code  : $($_.Exception.ErrorCode)" "red"
            Log-Message "   Error text  : $($_.Exception.Message)" "red"
            exit 161;
        }

        Log-Message "Extract from history.txt file"
        Log-Message "   Input File         : '$szInputFile'"
        Log-Message "   Output File        : '$szOutputFile'"
        Log-Message "   Num Sections       : '$iNumSections'"

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
                Log-Message "   Last section could not be found (0), exit" "red"
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
                Log-Message "   Last section could not be found (1), exit" "red"
                exit 163
            }

            $iIndex2 = $szContents.IndexOf("`n", $iIndex2 + 1)
            #
            # Make sure the newline was found
            #
            if ($iIndex2 -eq -1)
            {
                Log-Message "   Last section could not be found (2), exit" "red"
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
                    break;
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
            Log-Message "   Last section could not be found, exit" "red"
            exit 165
        }

        Log-Message "   Found version section"
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
        if ($version -ne "" -and $version -ne $null -and (![string]::IsNullOrEmpty($targetloc) -or ![string]::IsNullOrEmpty($npmpkg) -or ![string]::IsNullOrEmpty($nugetpkg)))
        {
            Log-Message "   Write header text to message"

            $szFinalContents = "<b>$project $stringver $version has been released.</b><br><br>"
                
            if (![string]::IsNullOrEmpty($targetloc)) {
                $szFinalContents += "Release Location: $targetloc<br><br>"
            }

            if (![string]::IsNullOrEmpty($npmpkg))
            {
                $szFinalContents += "NPM Location: $npmpkg<br><br>"
            }

            if (![string]::IsNullOrEmpty($nugetpkg))
            {
                $szFinalContents += "Nuget Location: $nugetpkg<br><br>"
            }

            #
            # Installer release, write unc path to history file
            #
            if (!$targetloc.Contains("http://") -and !$targetloc.Contains("https://")) {
                $szFinalContents += "Complete History: $targetloc\history.txt<br><br>"
            }

            $szFinalContents += "Most Recent History File Entry:<br><br>";

            Log-Message "   Write $iNumSections history section(s) to message"

            if ($listonly -eq $false) {
                $szFinalContents += $szContents
            }
            else
            {
                $iIndex1 = $szContents.IndexOf("*")
                while ($iIndex1 -ne -1)
                {
                    $iIndex2 = $szContents.IndexOf("<br>", $iIndex1)
                    $szContents = $szContents.Substring(0, $iIndex1) + $szContents.Substring($iIndex2 + 4)
                    $iIndex1 = $szContents.IndexOf("*")
                }
                $szFinalContents = "<font face=`"Courier New`">" + $szContents + "</font>"
            }
            #
            # Reverse versions, display newest at top if more than 1 section
            #
            if ($iNumSections -gt 1)
            {   
                Log-Message "   Re-ordering $iNumSections sections newest to oldest"

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
            Log-Message "   Found version $curversion"
            return $curversion
        }

        if ($szOutputFile -ne "" -and $szOutputFile -ne $null) {
            New-Item -ItemType "file" -Path "$szOutputFile" -Value $szFinalContents | Out-Null
            Log-Message "   Saved release history output to $szOutputFile"
        }

        Log-Message "   Successful" "darkgreen"

        return $szFinalContents
    }
}

#
# Define class instances
#
$ClsCommitAnalyzer = New-Object -TypeName CommitAnalyzer
$ClsHistoryFile = New-Object -TypeName HistoryFile
$ClsVc = New-Object -TypeName Vc


#************************************************************************#

#####  #   #  #   #  #####  #####  ###  #####  #   #  #####
#      #   #  ##  #  #        #     #   #   #  ##  #  #    
####   #   #  # # #  #        #     #   #   #  # # #  #####
#      #   #  #  ##  #        #     #   #   #  #  ##      #
#      #####  #   #  #####    #    ###  #####  #   #  #####

#************************************************************************#

function Log-Message($msg, $color, $noTag = $false)
{
    $msgTag = ""

    if ([string]::IsNullOrEmpty($msg)) {
        return
    }

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
        Log-Message "   Notification could not be sent, invalid email server specified" "red"
        return
    }
    if ([string]::IsNullOrEmpty($EMAILRECIP)) {
        Log-Message "   Notification could not be sent, invalid recipient address specified" "red"
        return
    }
    if ([string]::IsNullOrEmpty($EMAILSENDER)) {
        Log-Message "   Notification could not be sent, invalid sender address specified" "red"
        return
    }

    # encoding="plain" (from ant)   ps cmd: -Encoding ASCII
    $EMAILBODY = ""
    if (![string]::IsNullOrEmpty($HISTORYFILE)) 
    {
        Log-Message "   Converting history text to html"
        $EMAILBODY = $ClsHistoryFile.getHistory($PROJECTNAME, $VERSION, 1, $VERSIONTEXT, $false, $HISTORYFILE, $null, $targetloc, $npmloc, $nugetloc);
    }
    elseif (![string]::IsNullOrEmpty($CHANGELOGFILE)) 
    {
        # TODO -  extract only latest version release notes
        Log-Message "   Converting changelog markdown to html"
        #
        # Use marked module for conversion
        #
        $EMAILBODY = & app-publisher-marked -f $CHANGELOGFILE
        Check-ExitCode
    }
    else {
        Log-Message "   Notification could not be sent, history file not specified" "red"
        return
    }

    Log-Message "Sending release notification email"
    try 
    {
        $ProjectNameFmt = $PROJECTNAME.Replace("-", " ")
        $TextInfo = (Get-Culture).TextInfo
        $ProjectNameFmt = $TextInfo.ToTitleCase($ProjectNameFmt)
        $Subject = "$ProjectNameFmt $VERSIONTEXT $VERSION"

        if ($DRYRUN -eq $false) 
        {
            if (![string]::IsNullOrEmpty($EMAILRECIP) -and $EMAILRECIP.Contains("@") -and $EMAILRECIP.Contains(".")) 
            {
                send-mailmessage -SmtpServer $EMAILSERVER -BodyAsHtml -From $EMAILSENDER -To $EMAILRECIP -Subject $Subject -Body $EMAILBODY
            }
            else {
                if (![string]::IsNullOrEmpty($TESTEMAILRECIP) -and $TESTEMAILRECIP.Contains("@") -and $TESTEMAILRECIP.Contains(".")) 
                {
                    Log-Message "   Notification could not be sent to email recip, sending to test recip" "darkyellow"
                    Send-MailMessage -SmtpServer $EMAILSERVER -BodyAsHtml -From $EMAILSENDER -To $TESTEMAILRECIP -Subject $Subject -Body $EMAILBODY
                    Check-PsCmdSuccess
                }
                else {
                    Log-Message "   Notification could not be sent, invalid email address specified" "red"
                }
            }
        }
        else {
            if (![string]::IsNullOrEmpty($TESTEMAILRECIP) -and $TESTEMAILRECIP.Contains("@") -and $TESTEMAILRECIP.Contains(".")) 
            {
                Send-MailMessage -SmtpServer $EMAILSERVER -BodyAsHtml -From $EMAILSENDER -To $TESTEMAILRECIP -Subject $Subject -Body $EMAILBODY
                Check-PsCmdSuccess
            }
            else {
                Log-Message "   Notification could not be sent, invalid email address specified" "red"
            }
        }
    }
    catch {
        Log-Message "   Delivery failure" "red"
    }
}

#
# Function to check spelling in text
#
function CheckSpelling($String, $RemoveSpecialChars)
{
    $OutString = $String

    Log-Message "Perform spelling check"

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
            Log-Message "   Success" "darkgreen"
        }
        catch{
            Log-Message "   Failure" "red"
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

function Vc-Changelist-AddRemove($VcFile)
{
    if ($PATHPREROOT -ne "" -and $PATHPREROOT -ne $null) {
        $VcFile = Join-Path -Path "$PATHPREROOT" -ChildPath "$VcFile"
    }
    if (!$script:VCCHANGELISTRMV.Contains($VcFile)) {
        Log-Message "Adding $VcFile to failure/testrun vc removelist"
        $script:VCCHANGELISTRMV = "$script:VCCHANGELISTRMV `"$VcFile`""
    }
}

function Vc-Changelist-Add($VcFile)
{
    if ($PATHPREROOT -ne "" -and $PATHPREROOT -ne $null) {
        $VcFile = Join-Path -Path "$PATHPREROOT" -ChildPath "$VcFile"
    }
    if (!$script:VCCHANGELIST.Contains($VcFile)) {
        Log-Message "Adding $VcFile to vc changelist"
        $script:VCCHANGELIST = "$script:VCCHANGELIST `"$VcFile`""
    }
}

function Vc-Changelist-AddMulti($VcFile)
{
    if ($PATHPREROOT -ne "" -and $PATHPREROOT -ne $null) {
        $VcFile = Join-Path -Path "$PATHPREROOT" -ChildPath "$VcFile"
    }
    if (!$script:VCCHANGELISTMLT.Contains($VcFile)) {
        Log-Message "Adding $VcFile to multi-publish vc changelist"
        $script:VCCHANGELISTMLT = "$script:VCCHANGELISTMLT `"$VcFile`""
    }
}

function Vc-Changelist-AddNew($VcFile)
{
    if ($PATHPREROOT -ne "" -and $PATHPREROOT -ne $null) {
        $VcFile = Join-Path -Path "$PATHPREROOT" -ChildPath "$VcFile"
    }
    if (!$script:VCCHANGELISTADD.Contains($VcFile)) {
        Log-Message "Adding $VcFile to vc 'add' changelist"
        $script:VCCHANGELISTADD = "$script:VCCHANGELISTADD `"$VcFile`""
    }
}

function Vc-IsVersioned($ObjectPath, $AppendPre = $false, $ChangePath = $false)
{
    $IsVersioned = $false

    if ($AppendPre -and ![string]::IsNullOrEmpty($PATHPREROOT)) {
        $VcFile = Join-Path -Path "$PATHPREROOT" -ChildPath "$ObjectPath"
    }

    if ($ChangePath -and ![string]::IsNullOrEmpty($PATHTOMAINROOT) -and $PATHTOMAINROOT -ne ".") {
        set-location $PATHTOMAINROOT
    }
    if ($_RepoType -eq "svn") {
        $tmp = & svn info "$ObjectPath"
    }
    else {
        $tmp = & git ls-files --error-unmatch "$ObjectPath"
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

function Vc-Revert($ChangePath = $false)
{
    if (![string]::IsNullOrEmpty($VCCHANGELIST)) 
    {
        Log-Message "Removing new files / reverting touched files under version control"
        Log-Message "Stored Commit List: $VCCHANGELIST"
        Log-Message "Stored Add List   : $VCCHANGELISTADD"
        Log-Message "Stored Remove List: $VCCHANGELISTRMV"

        #
        # Change dir to project root, all changelist entries will be in respect to the project root dir
        #
        if ($ChangePath -and ![string]::IsNullOrEmpty($PATHTOMAINROOT) -and $PATHTOMAINROOT -ne ".") {
            set-location $PATHTOMAINROOT
        }

        $VcRevertList = ""
        $VcRevertListParts = $VCCHANGELISTRMV.Trim().Split(' ')

        for ($i = 0; $i -lt $VcRevertListParts.Length; $i++)
        {
            $VcRevertFile = $VcRevertListParts[$i].Replace("`"", "")
            if ($VcRevertFile -eq "") {
                continue;
            }
            if (Test-Path($VcRevertFile)) 
            {
                Log-Message "Deleting unversioned $($VcRevertListParts[$i]) from fs"
                Remove-Item -path $VcRevertListParts[$i].Replace("`"", "") -Recurse | Out-Null
                Check-PsCmdSuccess
            }
        }

        $VcRevertList = ""
        $VcRevertListParts = $VCCHANGELISTADD.Trim().Split(' ')

        for ($i = 0; $i -lt $VcRevertListParts.Length; $i++)
        {
            $VcRevertFile = $VcRevertListParts[$i].Replace("`"", "")
            if ($VcRevertFile -eq "") {
                continue;
            }
            if ((Test-Path($VcRevertFile)))
            {
                Log-Message "Deleting unversioned $($VcRevertListParts[$i]) from fs"
                Remove-Item -path $VcRevertFile -Recurse | Out-Null
                Check-PsCmdSuccess
            }
        }

        $VcRevertList = ""
        $VcRevertListParts = $VCCHANGELIST.Trim().Split(' ')

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
                    if (Vc-IsVersioned($VcRevertFile)) 
                    {
                        Log-Message " - Adding versioned $VcRevertFile to revert list"
                        $VcRevertList = "$VcRevertList $($VcRevertListParts[$i])"
                    }
                    else # delete unversioned file
                    {
                        Log-Message " - Deleting unversioned $VcRevertFile from fs"
                        Remove-Item -path "$VcRevertFile" -Recurse | Out-Null
                        Check-PsCmdSuccess
                    }
                }
            }
            if (![string]::IsNullOrEmpty($VcRevertList)) 
            {
                $VcRevertList = $VcRevertList.Trim()
                Log-Message "Versioned List:  $VcRevertList"
                Invoke-Expression -Command "svn revert -R $VcRevertList"
                Check-ExitCode
            }
            else {
                Log-Message "0 versioned files to revert"
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
                    if (Vc-IsVersioned($VcRevertFile)) {
                        Log-Message " - Adding versioned $VcRevertFile to revert list"
                        $VcRevertList = "$VcRevertList $($VcRevertListParts[$i])"
                    }
                    else 
                    {   # delete unversioned file
                        Log-Message "Deleting unversioned $VcRevertFile from fs"
                        Remove-Item -path "$VcRevertFile" -Recurse | Out-Null
                        Check-PsCmdSuccess
                    }
                }
            }
            if (![string]::IsNullOrEmpty($VcRevertList)) 
            {
                $VcRevertList = $VcRevertList.Trim()
                Log-Message "Versioned List:  $VcRevertList"
                Invoke-Expression -Command "git stash push -- $VcRevertList"
                Check-ExitCode
                Invoke-Expression -Command "git stash drop"
                Check-ExitCode
            }
            else {
                Log-Message "0 versioned files to revert"
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

function Check-ExitCode($ExitOnError = $false, $ChangePath = $true)
{
    $ECode = $LASTEXITCODE
    #
    # Check script error code, 0 is success
    #
    if ($ECode -eq 0) {
        Log-Message "Exit Code 0" "darkgreen"
    }
    else {
        Log-Message "Exit Code $ECode" "red"
        if ($ExitOnError -eq $true) {
            Vc-Revert $ChangePath
            exit $ECode
        }
    }
}

function Check-PsCmdSuccess($ExitOnError = $false, $ChangePath = $true)
{
    #
    # Check script error code, 0 is success
    #
    if ($? -eq $true) {
        Log-Message "Status True" "darkgreen"
    }
    else {
        Log-Message "Status False" "red"
        if ($ExitOnError -eq $true) {
            Vc-Revert $ChangePath
            exit 110
        }
    }
}

function Replace-Version($File, $Old, $New)
{
    Log-Message "Write new version $VERSION to $File"
    ((Get-Content -path $File -Raw) -replace "$Old", "$New") | Set-Content -NoNewline -Path $File
    Check-PsCmdSuccess
}

function Run-Scripts($ScriptType, $Scripts, $ExitOnError, $RunInTestMode = $false)
{
    if ($Scripts.Length -gt 0 -and !$script:BuildCmdsRun.Contains($ScriptType))
    {
        # Run custom script
        #
        Log-Message "Running custom $ScriptType script(s)"

        if ($DRYRUN -eq $false -or $RunInTestMode) 
        {
            foreach ($Script in $Scripts) 
            {
                Invoke-Expression -Command "$Script"
                Check-ExitCode $ExitOnError
            }
        }
        else {
            Log-Message "   Dry run, skipping script run" "magenta"
        }

        $script:BuildCmdsRun += $ScriptType
    }
}

function Prepare-VersionFiles()
{
    if ($VERSIONFILES.Length -gt 0)
    {
        Log-Message "Preparing version files"

        foreach ($VersionFile in $VERSIONFILES) 
        {
            if ((Test-Path($VersionFile)) -and !$VersionFilesEdited.Contains($VersionFile))
            {
                Log-Message "Writing new version $VERSION to $VersionFile"
                #
                # replace version in nsi file
                #
                Replace-Version $VersionFile "`"$CURRENTVERSION`"" "`"$VERSION`""
                if ($LASTEXITCODE -ne 0)
                {
                    Replace-Version $VersionFile "'$CURRENTVERSION'" "'$VERSION'"
                    if ($LASTEXITCODE -ne 0)
                    {
                        Replace-Version $VersionFile $CURRENTVERSION $VERSION
                    }
                }
                #
                # Allow manual modifications to $VersionFile
                # Edit-File will add this file to $VersionFilesEdited
                #
                Edit-File $VersionFile
            }
        }
    }
}

function Prepare-ExtJsBuild()
{
    #
    # Replace version in app.json
    #
    Replace-Version "app.json" "version`"[ ]*:[ ]*[`"]$CURRENTVERSION" "version`": `"$VERSION"
    #
    # Allow manual modifications to app.json
    #
    Edit-File "app.json"
}

function Prepare-DotNetBuild($AssemblyInfoLocation)
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
    Replace-Version $AssemblyInfoLocation "AssemblyVersion[ ]*[(][ ]*[`"]$SEMVERSIONCUR" "AssemblyVersion(`"$SEMVERSION"
    Replace-Version $AssemblyInfoLocation "AssemblyFileVersion[ ]*[(][ ]*[`"]$SEMVERSIONCUR" "AssemblyFileVersion(`"$SEMVERSION"
    #
    # Allow manual modifications to assembly file
    #
    Edit-File $AssemblyInfoLocation
}


function Get-AssemblyInfoVersion($AssemblyInfoLocation)
{
    $AssemblyInfoVersion = ""
    Log-Message "Retrieving assemblyinfo version from $AssemblyInfoLocation"
    if (Test-Path($AssemblyInfoLocation))
    {
        $AssemblyInfoContent = Get-Content -Path $AssemblyInfoLocation -Raw
        [Match] $match = [Regex]::Match($AssemblyInfoContent, "AssemblyVersion[ ]*[(][ ]*[`"][1-9.]*");
        if ($match.Success) 
        {
            $AssemblyInfoVersion = $match.Value.Replace("AssemblyVersion", "")
            $AssemblyInfoVersion = $match.Value.Replace(" ", "")
            $AssemblyInfoVersion = $match.Value.Replace("(", "")
            # Rid build number
            $AssemblyInfoVersion = $AssemblyInfoVersion.Substring(0, $AssemblyInfoVersion.LastIndexOf("."))
        }
    }
    else {
        Log-Message "Could not retrieve version, $AssemblyInfoLocation does not exist" "red"
    }
    return $AssemblyInfoVersion
}


$DefaultRepo = ""
$DefaultRepoType = ""
$DefaultHomePage = ""
$DefaultBugs = ""
$DefaultName = ""
$DefaultScope = ""

function Prepare-PackageJson()
{
    #
    # Replace current version with new version in package.json and package-lock.json
    # 5/25/19 - Use regext text replacement after npm version command, sencha packages will contain 
    # two version tags, on for the main package.json field, and one in the sencha object definition, we 
    # want to replace them both if they match
    #
    Log-Message "Setting new version $VERSION in package.json"
    & npm version --no-git-tag-version --allow-same-version $VERSION
    Check-ExitCode
    Replace-Version "package.json" "version`"[ ]*:[ ]*[`"]$CURRENTVERSION" "version`": `"$VERSION"

    if (![string]::IsNullOrEmpty($REPO))
    {
        #Save
        Log-Message "Saving repository in package.json"
        $script:DefaultRepo = & app-publisher-json -f package.json repository.url
        Check-ExitCode
        Log-Message "Repository: $DefaultRepo"
        # Set repo
        Log-Message "Setting repository in package.json: $REPO"
        & app-publisher-json -I -4 -f package.json -e "this.repository.url='$REPO'"
        Check-ExitCode
    }

    if (![string]::IsNullOrEmpty($REPOTYPE))
    {
        #Save
        Log-Message "Saving repository type in package.json"
        $script:DefaultRepoType = & app-publisher-json -f package.json repository.type
        Check-ExitCode
        Log-Message "Repository Type: $DefaultRepoType"
        # Set repo type
        Log-Message "Setting repository type in package.json: $REPOTYPE"
        & app-publisher-json -I -4 -f package.json -e "this.repository.type='$REPOTYPE'"
        Check-ExitCode
    }

    if (![string]::IsNullOrEmpty($HOMEPAGE))
    {
        #Save
        Log-Message "Saving homepage in package.json"
        $script:DefaultHomePage = & app-publisher-json -f package.json homepage
        Check-ExitCode
        Log-Message "Homepage: $DefaultHomePage"
        # Set homepage 
        Log-Message "Setting homepage in package.json: $HOMEPAGE"
        & app-publisher-json -I -4 -f package.json -e "this.homepage='$HOMEPAGE'"
        Check-ExitCode
    }

    if (![string]::IsNullOrEmpty($BUGS))
    {
        #Save
        Log-Message "Saving bugs page in package.json"
        $script:DefaultBugs = & app-publisher-json -f package.json bugs.url
        Check-ExitCode
        Log-Message "Bugs page: $DefaultBugs"
        # Set
        Log-Message "Setting bugs page in package.json: $BUGS"
        & app-publisher-json -I -4 -f package.json -e "this.bugs.url='$BUGS'"
        Check-ExitCode
    }

    #
    # Scope/name - package.json
    #
    Log-Message "Saving package name in package.json"
    $script:DefaultName = & app-publisher-json -f package.json name
    Check-ExitCode
    Log-Message "Package name : $DefaultName"
    if ($DefaultName.Contains("@") -and $DefaultName.Contains("/")) {
        $script:DefaultScope = $DefaultName.Substring(0, $DefaultName.IndexOf("/"));
        Log-Message "Package scope: $DefaultScope"
    }

    if (![string]::IsNullOrEmpty($NPMSCOPE))
    {
        if (!$DefaultName.Contains($NPMSCOPE))
        {
            Log-Message "Setting package name in package.json: $NPMSCOPE/$PROJECTNAME"
            & app-publisher-json -I -4 -f package.json -e "this.name='$NPMSCOPE/$PROJECTNAME'"
            Check-ExitCode
            if ($LASTEXITCODE -ne 0) {
                Log-Message "Setting package name in package.json failed, retrying"
                [System.Threading.Thread]::Sleep(500)
                & app-publisher-json -I -4 -f package.json -e "this.name='$NPMSCOPE/$PROJECTNAME'"
                Check-ExitCode
            }
            #
            # Scope - package-lock.json
            #
            if (Test-Path("package-lock.json")) 
            {
                Log-Message "Setting package name in package-lock.json: $NPMSCOPE/$PROJECTNAME"
                & app-publisher-json -I -4 -f package-lock.json -e "this.name='$NPMSCOPE/$PROJECTNAME'"
                Check-ExitCode
                if ($LASTEXITCODE -ne 0) {
                    Log-Message "Setting package name in package-lock.json failed, retrying"
                    [System.Threading.Thread]::Sleep(500)
                    & app-publisher-json -I -4 -f package-lock.json -e "this.name='$NPMSCOPE/$PROJECTNAME'"
                    Check-ExitCode
                }
            }
        }
    }
    
    #
    # The json utility will output line feed only, replace with windows stle crlf
    #
    #Log-Message "Set windows line feeds in package.json"
    #((Get-Content -path "package.json" -Raw) -replace "`n", "`r`n") | Set-Content -NoNewline -Path "package.json"
    #Check-ExitCode
    #
    # Allow manual modifications to package.json and package-lock.json
    #
    Edit-File "package.json"
    if (Test-Path("package-lock.json")) 
    {
        # The json utility will output line feed only, replace with windows stle crlf
        #
        #Log-Message "Set windows line feeds in package-lock.json"
        #((Get-Content -path "package-lock.json" -Raw) -replace "`n", "`r`n") | Set-Content -NoNewline -Path "package-lock.json"
        #Check-PsCmdSuccess
        Edit-File "package-lock.json"
    }
}

function Restore-PackageJson()
{
    #
    # Set repo
    #
    if (![string]::IsNullOrEmpty($DefaultRepo))
    {
        Log-Message "Re-setting default repository in package.json: $DefaultRepo"
        & app-publisher-json -I -4 -f package.json -e "this.repository.url='$DefaultRepo'"
        Check-ExitCode
    }
    #
    # Set repo type
    #
    if (![string]::IsNullOrEmpty($DefaultRepoType))
    {
        Log-Message "Re-setting default repository type in package.json: $DefaultRepoType"
        & app-publisher-json -I -4 -f package.json -e "this.repository.type='$DefaultRepoType'"
        Check-ExitCode
    }
    #
    # Set bugs
    #
    if (![string]::IsNullOrEmpty($DefaultBugs))
    {
        Log-Message "Re-setting default bugs page in package.json: $DefaultBugs"
        & app-publisher-json -I -4 -f package.json -e "this.bugs.url='$DefaultBugs'"
        Check-ExitCode
    }
    #
    # Set homepage 
    #
    if (![string]::IsNullOrEmpty($DefaultHomePage))
    {
        Log-Message "Re-setting default homepage in package.json: $DefaultHomePage"
        & app-publisher-json -I -4 -f package.json -e "this.homepage='$DefaultHomePage'"
        Check-ExitCode
    }
    #
    # Scope/name - package.json
    #
    if (![string]::IsNullOrEmpty($NPMSCOPE) -and !$DefaultName.Contains($NPMSCOPE))
    {
        Log-Message "Re-setting default package name in package.json: $DefaultName"
        & app-publisher-json -I -4 -f package.json -e "this.name='$DefaultName'"
        Check-ExitCode
        #
        # Scope - package-lock.json
        #
        if (Test-Path("package-lock.json")) 
        {
            Log-Message "Re-scoping default package name in package-lock.json: $DefaultName"
            & app-publisher-json -I -4 -f package-lock.json -e "this.name='$DefaultName'"
            Check-ExitCode
        }
    }
}

$FirstEditFileDone = $false

function Edit-File($File, $SeekToEnd = $false)
{
    if (![string]::IsNullOrEmpty($File) -and (Test-Path($File)) -and !$VersionFilesEdited.Contains($File))
    {
        $script:VersionFilesEdited += $File
        
        #if (Vc-IsVersioned($File, $true, $true)) {
            Vc-Changelist-Add $File
        #}

        if (![string]::IsNullOrEmpty($TEXTEDITOR))
        {
            Log-Message "Edit $File"
            #
            # Create scripting shell for process activation and sendkeys
            #
            $WSShell = New-Object -ComObject WScript.Shell
            #
            # Start Notepad process ro edit specified file
            #
            $TextEditorProcess = Start-Process -filepath $TEXTEDITOR -args $File -PassThru
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
            if ($FirstEditFileDone -eq $false) # -and $INTERACTIVE -eq "Y")
            {
                $CodeProcess = Get-Process "Code" | Where-Object {$_.mainWindowTitle}
                #[System.Threading.Thread]::Sleep(500);
                if ($CodeProcess -ne $null) {
                    $Tmp = $WSShell.AppActivate($CodeProcess.Id)
                } 
                #[System.Threading.Thread]::Sleep(500);
                $WSShell.sendkeys("");
                $Tmp = $WSShell.AppActivate($TextEditorProcess.Id)
                $WSShell.sendkeys("");
                if ($CodeProcess -ne $null) {
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
            #
            if ($SeekToEnd -eq $true) {
                $WSShell.sendkeys("^{END}");
            }
            #
            # Wait for the notepad process to be closed by the user
            #
            Wait-Process -Id $TextEditorProcess.Id | Out-Null
            Check-PsCmdSuccess
        }
    }
}

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
Log-Message "----------------------------------------------------------------" "darkblue" $true
Log-Message " App Publisher PowerShell Script" "darkblue" $true
Log-Message "   Version   : $APPPUBLISHERVERSION" "cyan" $true
Log-Message "   Author    : Scott Meesseman" "cyan" $true

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
    Log-Message "----------------------------------------------------------------" "darkblue" $true
}

Log-Message "   Run #     : $RUN of $NUMRUNS" "cyan" $true
Log-Message "   Directory : $CWD" "cyan" $true
Log-Message "----------------------------------------------------------------" "darkblue" $true
#
#
#
$BRANCH = ""
if ($options.branch) {
    $BRANCH = $options.branch
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
# Name of the project.  This must macth throughout the build files and the SVN project name
#
$PROJECTNAME = ""
if ($options.projectName) {
    $PROJECTNAME = $options.projectName
}
#
# The location of this changelog file, can be a relative or full path.
#
$CHANGELOGFILE = ""
if ($options.changelogFile) {
    $CHANGELOGFILE = $options.changelogFile
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
$DISTDOCPATH = ""
if ($options.distDocPath) {
    $DISTDOCPATH = $options.distDocPath
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
#
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
$EMAILRECIP = ""
if ($options.emailRecip) {
    $EMAILRECIP = $options.emailRecip
}
#
$EMAILSENDER = ""
if ($options.emailSender) {
    $EMAILSENDER = $options.emailSender
}
#
#
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
# Interactive (prompts for version after extracting what we think should be the next 
# version)
#
$INTERACTIVE = "N"
if ($options.interactive) {
    $INTERACTIVE = $options.interactive
}
#
$TEXTEDITOR = ""
if ($options.textEditor) {
    $TEXTEDITOR = $options.textEditor
}
#
#
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
$PATHTODIST = ""
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
#
#
$REPO = ""
if ($options.repo) {
    $REPO = $options.repo
}
#
$REPOTYPE = ""
if ($options.repoType) {
    $REPOTYPE = $options.repoType
}
#
$BUGS = ""
if ($options.bugs) {
    $BUGS = $options.bugs
}
#
$HOMEPAGE = ""
if ($options.homePage) {
    $HOMEPAGE = $options.homePage
}
#
# Skip uploading dist files to dist release folder (primarily used for releasing
# from home office where two datacenters cannot be reached at the same time, in this
# case the installer files are manually copied)
#
$SKIPDEPLOYPUSH = "Y"
if ($options.skipDeployPush) {
    $SKIPDEPLOYPUSH = $options.skipDeployPush
}
#
$TESTEMAILRECIP = ""
if ($options.testEmailRecip) {
    $TESTEMAILRECIP = $options.testEmailRecip
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
# Whether or not to tag the new version in SVN.  Default is Yes.
#
$VERSIONFILES = @()
if ($options.versionFiles) {
    $VERSIONFILES = $options.versionFiles
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

$SKIPCOMMIT = "N"
$CURRENTVERSION = ""
$VERSION = "" 
$COMMITS = @()
$TDATE = ""
$REPOSCOMMITED = @()

#
# Define a variable to track changed files for check-in to SVN
# This will be a space delimited list of quoted strings/paths
#
$VCCHANGELIST = ""
$VCCHANGELISTADD = ""
$VCCHANGELISTRMV = ""
$VCCHANGELISTMLT = ""
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
# Set a default Nuget registry if necessary
#
if ([string]::IsNullOrEmpty($NPMREGISTRY)) {
    $NPMREGISTRY = "https://registry.nuget.org"
}

#
# Set up log file
#
if ($WRITELOG -eq "Y") 
{
    # Determine current date  
    $CurrentDate = Get-Date -format "yyyyMMddHHmmss";
    # Define log file name
    $LogFileName = "${env:LOCALAPPDATA}\Perry Johnson & Associates\app-publisher\log\app-publisher-$CurrentDate.log";
    # Create the log directory
    New-Item -ItemType directory -Force -Path "${env:LOCALAPPDATA}\Perry Johnson & Associates\app-publisher\log" | Out-Null;
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
        Log-Message "Reading repository in package.json"
        $_Repo = & app-publisher-json -f package.json repository.url
        Check-ExitCode
        Log-Message "Repository: $_Repo"
    }

    if ([string]::IsNullOrEmpty($_RepoType))
    {
        Log-Message "Saving repository type in package.json"
        $_RepoType = & app-publisher-json -f package.json repository.type
        Check-ExitCode
        Log-Message "Repository Type: $_RepoType"
    }
}
if ([string]::IsNullOrEmpty($_Repo)) {
    Log-Message "Repository must be specified on cmd line, package.json or publishrc" "red"
    exit 1
}
elseif ([string]::IsNullOrEmpty($_RepoType)) {
    Log-Message "Repository type must be specified on cmd line, package.json or publishrc" "red"
    exit 1
}
if ($_RepoType -ne "git" -and $_RepoType -ne "svn")
{
    Log-Message "Invalid repository type, must be 'git' or 'svn'" "red"
    exit 1
}

#
# Branch
#
if ([string]::IsNullOrEmpty($BRANCH)) 
{
    if ($_Repo -eq "git") 
    {
        Log-Message "Setting branch name to default 'master'" "darkyellow"
        $BRANCH = "master"
    }
    elseif ($_Repo -eq "svn") 
    {
        Log-Message "Setting branch name to default 'trunk'" "darkyellow"
        $BRANCH = "trunk"
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
                Log-Message "Text editor not found, falling back to notepad" "magenta"
                $TEXTEDITOR = "notepad"
            }
            else {
                Log-Message "Text editor not found" "red"
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
    Log-Message "pathPreRoot must be specified with pathToMainRoot" "red"
    exit 1
}

if (![string]::IsNullOrEmpty($PATHPREROOT) -and [string]::IsNullOrEmpty($PATHTOMAINROOT)) {
    Log-Message "pathToMainRoot must be specified with pathPreRoot" "red"
    exit 1
}

if (![string]::IsNullOrEmpty($PATHTOMAINROOT)) 
{
    if ([string]::IsNullOrEmpty($PATHPREROOT)) { 
        Log-Message "Invalid value specified for pathPreRoot" "red"
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
        Log-Message "Invalid values specified for pathToMainRoot and pathPreRoot" "red"
        Log-Message "    pathToMainRoot indicates the path to the root project folder with respect to the initial working directory" "red"
        Log-Message "    pathPreRoot indicates the path back to the initial working directory with respect to the project root" "red"
        exit 1
    }
    Set-Location $PATHPREROOT
}

#
# Convert any Y/N vars to upper case and check validity
#
if (![string]::IsNullOrEmpty($DISTRELEASE)) {
    $DISTRELEASE = $DISTRELEASE.ToUpper()
    if ($DISTRELEASE -ne "Y" -and $DISTRELEASE -ne "N") {
        Log-Message "Invalid value specified for distRelease, accepted values are y/n/Y/N" "red"
        exit 1
    }
}
if (![string]::IsNullOrEmpty($NPMRELEASE)) {
    $NPMRELEASE = $NPMRELEASE.ToUpper()
    if ($NPMRELEASE -ne "Y" -and $NPMRELEASE -ne "N") {
        Log-Message "Invalid value specified for npmRelease, accepted values are y/n/Y/N" "red"
        exit 1
    }
}
if (![string]::IsNullOrEmpty($NUGETRELEASE)) {
    $NUGETRELEASE = $NUGETRELEASE.ToUpper()
    if ($NUGETRELEASE -ne "Y" -and $NUGETRELEASE -ne "N") {
        Log-Message "Invalid value specified for nugetRelease, accepted values are y/n/Y/N" "red"
        exit 1
    }
}
if (![string]::IsNullOrEmpty($GITHUBRELEASE)) {
    $GITHUBRELEASE = $GITHUBRELEASE.ToUpper()
    if ($GITHUBRELEASE -ne "Y" -and $GITHUBRELEASE -ne "N") {
        Log-Message "Invalid value specified for githubRelease, accepted values are y/n/Y/N" "red"
        exit 1
    }
    if ($GITHUBRELEASE -eq "Y")
    {
        if ([string]::IsNullOrEmpty($GITHUBUSER)) {
            Log-Message "You must specify githubUser for a GitHub release type" "red"
            exit 1
        }
        if ([string]::IsNullOrEmpty(${Env:GITHUB_TOKEN})) {
            Log-Message "You must have GITHUB_TOKEN defined in the environment for a GitHub release type" "red"
            Log-Message "Set the environment variable GITHUB_TOKEN using the token value created on the GitHub website" "red"
            exit 1
        }
    }
}
if (![string]::IsNullOrEmpty($SKIPDEPLOYPUSH)) {
    $SKIPDEPLOYPUSH = $SKIPDEPLOYPUSH.ToUpper()
    if ($SKIPDEPLOYPUSH -ne "Y" -and $SKIPDEPLOYPUSH -ne "N") {
        Log-Message "Invalid value specified for skipDeployPush, accepted values are y/n/Y/N" "red"
        exit 1
    }
}
if (![string]::IsNullOrEmpty($DRYRUNVCREVERT)) {
    $DRYRUNVCREVERT = $DRYRUNVCREVERT.ToUpper()
    if ($DRYRUNVCREVERT -ne "Y" -and $DRYRUNVCREVERT -ne "N") {
        Log-Message "Invalid value specified for testModeSvnRevert, accepted values are y/n/Y/N" "red"
        exit 1
    }
}
if (![string]::IsNullOrEmpty($WRITELOG)) {
    $WRITELOG = $WRITELOG.ToUpper()
    if ($WRITELOG -ne "Y" -and $WRITELOG -ne "N") {
        Log-Message "Invalid value specified for writeLog, accepted values are y/n/Y/N" "red"
        exit 1
    }
}
if (![string]::IsNullOrEmpty($INTERACTIVE)) {
    $INTERACTIVE = $INTERACTIVE.ToUpper()
    if ($INTERACTIVE -ne "Y" -and $INTERACTIVE -ne "N") {
        Log-Message "Invalid value specified for interactive, accepted values are y/n/Y/N" "red"
        exit 1
    }
}
if (![string]::IsNullOrEmpty($VCTAG)) {
    $VCTAG = $VCTAG.ToUpper()
    if ($VCTAG -ne "Y" -and $VCTAG -ne "N") {
        Log-Message "Invalid value specified for svnTag, accepted values are y/n/Y/N" "red"
        exit 1
    }
}

#
# Get execution policy, this needs to be equlat  to 'RemoteSigned'
#
$ExecPolicy = Get-ExecutionPolicy
if ($ExecPolicy -ne "RemoteSigned")
{
    Log-Message "The powershell execution policy must be set to 'RemoteSigned'" "red"
    Log-Message "Run the following command in a powershell with elevated priveleges:" "red"
    Log-Message "   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine" "red"
    exit 90
}

#
# Check dist release path for dist release
#
if ($DISTRELEASE -eq "Y" -and [string]::IsNullOrEmpty($PATHTODIST)) {
    Log-Message "pathToDist must be specified for dist release" "red"
    exit 1
}

#
# Write project specific properties
#
Log-Message "Project specific script configuration:"
Log-Message "   Project          : $PROJECTNAME"
Log-Message "   Build cmd        : $BUILDCOMMAND"
Log-Message "   Bugs Page        : $BUGS"
Log-Message "   Changelog file   : $CHANGELOGFILE"
Log-Message "   Deploy cmd       : $DEPLOYCOMMAND"
Log-Message "   Dist release     : $DISTRELEASE"
Log-Message "   Dry run          : $DRYRUN"
Log-Message "   Dry run vc revert: $DRYRUNVCREVERT"
Log-Message "   Github release   : $GITHUBRELEASE"
Log-Message "   Github user      : $GITHUBUSER"
Log-Message "   Github assets    : $GITHUBASSETS"
Log-Message "   History file     : $HISTORYFILE"
Log-Message "   History file line: $HISTORYLINELEN"
Log-Message "   History hdr file : $HISTORYHDRFILE"
Log-Message "   Home Page        : $HOMEPAGE"
Log-Message "   Interactive      : $INTERACTIVE"
Log-Message "   NPM release      : $NPMRELEASE"
Log-Message "   NPM registry     : $NPMREGISTRY"
Log-Message "   NPM scope        : $NPMSCOPE"
Log-Message "   Nuget release    : $NUGETRELEASE"
Log-Message "   Post Build cmd   : $POSTBUILDCOMMAND"
Log-Message "   Path to root     : $PATHTOROOT"
Log-Message "   Path to main root: $PATHTOMAINROOT"
Log-Message "   Path pre root    : $PATHPREROOT"
Log-Message "   Repo             : $_Repo"
Log-Message "   RepoType         : $_RepoType"
Log-Message "   Branch           : $BRANCH"
Log-Message "   Skip deploy/push : $SKIPDEPLOYPUSH"
Log-Message "   Tag version      : $VCTAG"
Log-Message "   Tag format       : $VCTAGFORMAT"
Log-Message "   Tag prefix       : $VCTAGPREFIX"
Log-Message "   Text editor      : $TEXTEDITOR"
Log-Message "   Test email       : $TESTEMAILRECIP"
Log-Message "   Version files    : $VERSIONFILES"
Log-Message "   Version text     : $VERSIONTEXT"

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
if ($VERSIONFILES -is [system.string] -and ![string]::IsNullOrEmpty($VERSIONFILES))
{
    $VERSIONFILES = @($VERSIONFILES); #convert to array
}
if ($GITHUBASSETS -is [system.string] -and ![string]::IsNullOrEmpty($GITHUBASSETS))
{
    $GITHUBASSETS = @($GITHUBASSETS); #convert to array
}

#
# Get the current version number
#
# Currently two versioning methods are supported :
#
#     1. Incremental (100, 101, 102)
#     2. Semantic (major.minor.patch)
#
$VersionSystem = ""
if ($CURRENTVERSION -eq "") 
{
    Log-Message "Retrieve current version and calculate next version number"

    if (Test-Path("node_modules"))
    {
        if (Test-Path("node_modules\semver"))
        {
            if (Test-Path("package.json"))
            {
                Log-Message "Using semver to obtain next version number"
                #
                # use package.json properties to retrieve current version
                #
                $CURRENTVERSION = & node -e "console.log(require('./package.json').version);"
                $VersionSystem = "semver"
            } 
            else {
                Log-Message "Semver found, but package.json not found" "red"
                exit 127
            }
        } 
        else {
            Log-Message "Semver not found.  Run 'npm install --save-dev semver'" "red"
            exit 129
        }
    }
    elseif (![string]::IsNullOrEmpty($HISTORYFILE))
    {
        $CURRENTVERSION = $ClsHistoryFile.getVersion($HISTORYFILE, $VERSIONTEXT)
        if (!$CURRENTVERSION.Contains(".")) 
        {
            $VersionSystem = "incremental"
        }
        else {
            #
            # Semantic versioning non-npm project
            #
            Log-Message "Using non-npm project semantic versioning"
            Log-Message "Semver not found, run 'npm install -g semver' to automate semantic versioning of non-NPM projects" "darkyellow"
        }
    } 
    else 
    {
        $AssemblyInfoLoc = Get-ChildItem -Name -Recurse -Depth 1 -Filter "assemblyinfo.cs" -File -Path . -ErrorAction SilentlyContinue
        if ($AssemblyInfoLoc -is [system.string] -and ![string]::IsNullOrEmpty($AssemblyInfoLoc))
        {
            $CURRENTVERSION = Get-AssemblyInfoVersion $AssemblyInfoLoc
            if (![string]::IsNullOrEmpty($CURRENTVERSION )) {
                $VersionSystem = "semver"
            }
            else {
                Log-Message "The current version cannot be determined" "red"
                Log-Message "Provided the current version in publishrc or on the command line" "red"
                exit 130
            }
        }
        elseif ($AssemblyInfoLoc -is [System.Array] -and $AssemblyInfoLoc.Length -gt 0) {
            Log-Message "The current version cannot be determined, multiple assemblyinfo files found" "red"
            Log-Message "Provided the assembly info file in publishrc or on the command line" "red"
            exit 130
        }
        else {
            Log-Message "The current version cannot be determined" "red"
            Log-Message "Provided the current version in publishrc or on the command line" "red"
            exit 130
        }
    }
}

if ($CURRENTVERSION -eq "") {
    Log-Message "Could not determine current version, correct issue and re-run publish" "red"
    exit 131
}

#
# Validate current version if necessary
#
Log-Message "Validating current version found: $CURRENTVERSION"
if ($VersionSystem -eq "semver")
{
    $ValidationVersion = & node -e "console.log(require('semver').valid('$CURRENTVERSION'));"
    if ([string]::IsNullOrEmpty($ValidationVersion)) {
        Log-Message "The current semantic version found ($CURRENTVERSION) is invalid" "red"
        exit 132
    }
}
else # incremental versioning
{
    # TODO - Version should contain all digits
    #
    if ($false) {
        Log-Message "The current incremental version ($CURRENTVERSION) is invalid" "red"
        exit 134
    }
}
Log-Message "Current version has been validated" "darkgreen"

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
if ($RUN -eq 1 -or $DRYRUN -eq $true) 
{
    Log-Message "The current version is $CURRENTVERSION"
    #
    # Get commit messages since last version
    #
    # The previous version tag in the form 'vX.X.X' must exist in svn/projectroot/tags in
    # order to successfully obtain the latest commit messages.  If it does not exist, the
    # most current tag will be used
    #
    $COMMITS = $ClsVc.getCommits($_RepoType, $_Repo, $CURRENTVERSION, $VCTAGPREFIX)
    #
    # Check to ensure we got commits since last version.  If not, prompt user whether or
    # not to proceed, since technically the first time this script is used, we don't know
    # how to retrieve the latest commits
    #
    if ($COMMITS -eq $null -or $COMMITS.Length -eq 0) 
    {
        Log-Message "Commits since the last version or the version tag could not be found"
        Log-Message "[PROMPT] User input required"
        $Proceed = read-host -prompt "Proceed anyway? Y[N]"
        if ($Proceed.ToUpper() -ne "Y") {
            Log-Message "User cancelled, exiting" "red"
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
    #     1. Legacy PJ version (100, 101, 102)
    #     2. Semantically versioned (major.minor.patch)
    #
    # If this is a semantically versioned project (whether the version was obtained via node or 
    # history file parsing), we will use semver to calculate the next version if possible.  If 
    # semver is not available, prompt user for next version number.
    #
    # If this is a legacy PJ versioned project, the verison obtained in the history will be
    # incremented by +1.
    #
    $VersionInteractive = "N"
    #
    if ($VersionSystem -eq "semver")
    {
        #
        # use semver to retrieve next version
        # Analyze the commits to determine major, minor, patch release
        #
        $RELEASELEVEL = $ClsCommitAnalyzer.get($COMMITS)
        #
        # Get next version
        #
        if ($RUN -eq 1 -or $DRYRUN -eq $true) {
            $VERSION = & node -e "console.log(require('semver').inc('$CURRENTVERSION', '$RELEASELEVEL'));"
        }
        else {
            $VERSION = $CURRENTVERSION
        }
    }
    elseif ($VersionSystem -eq "incremental")
    {
        #
        # Whole # incremental versioning, i.e. 100, 101, 102...
        #
        Log-Message "Using legacy PJ versioning"
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
    # If version could not be found, then prompt for version 
    #
    if (![string]::IsNullOrEmpty($VERSION)) 
    {
        Log-Message "The suggested new version is $VERSION"
    }
    else 
    {
        Log-Message "New version could not be determined, you must manually input the new version"
        $VersionInteractive = "Y"
    }
    if ($INTERACTIVE -eq "Y" -or $VersionInteractive -eq "Y") 
    {
        Log-Message "[PROMPT] User input required"
        $NewVersion = read-host -prompt "Enter the version #, or C to cancel [$VERSION]"
        if ($NewVersion.ToUpper() -eq "C") {
            Log-Message "User cancelled process, exiting" "red"
            exit 155
        }
        if (![string]::IsNullOrEmpty($NewVersion)) {
            $VERSION = $NewVersion
        }
    }

    if ([string]::IsNullOrEmpty($VERSION)) {
        Log-Message "Invalid version for release, exiting" "red"
        exit 133
    }

    #
    # Validate new version
    #
    Log-Message "Validating new version: $VERSION"
    if ($VersionSystem -eq "semver" -or $VERSION.Contains("."))
    {
        $ValidationVersion = & node -e "console.log(require('semver').valid('$VERSION'));"
        if ([string]::IsNullOrEmpty($ValidationVersion)) {
            Log-Message "The new semantic version ($VERSION) is invalid" "red"
            exit 133
        }
    }
    else # incremental versioning
    {
        #
        # TODO - Version should contain all digits
        #
        if ($false) {
            Log-Message "The new incremental version ($VERSION) is invalid" "red"
            exit 134
        }
    }
    Log-Message "New version has been validated" "darkgreen"
}
else 
{
    $VERSION = $CURRENTVERSION
    Log-Message "This is pulish run #$RUN, the current version $CURRENTVERSION is also the new version" "magenta"
}


#
# Get formatted date in the form:
#
#     May 6th, 1974
#     October 3rd, 2003
#
if ($TDATE -eq "") {
    $date = Get-Date
    $Day = $date.Day.ToString()
    $Month = get-date -format "MMMM"
    $Year = get-date -format "yyyy"
    switch ($Day[$Day.Length - 1]) 
    {
        "1" { $Day = "${Day}st"; break }
        "2" { $Day = "${Day}nd"; break }
        "3" { $Day = "${Day}rd"; break }
        default { $Day = "${Day}th"; break }
    }
    $TDATE = "$Month $Day, $Year"
}

#
# Output some calculated info to console
#
Log-Message "Current Version     : $CURRENTVERSION"
Log-Message "Next Version        : $VERSION"
Log-Message "Date                : $TDATE"

#
# Process $HISTORYFILE
#
if (![string]::IsNullOrEmpty($HISTORYFILE))
{
    #
    # If history file doesnt exist, create one with the project name as a title
    #
    $HistoryPath = Split-Path "$HISTORYFILE"
    if ($HistoryPath -ne "" -and !(Test-Path($HistoryPath))) 
    {
        Log-Message "Creating history file directory and adding to version control" "magenta"
        New-Item -ItemType "directory" -Path "$HistoryPath" | Out-Null
        Vc-Changelist-AddNew "$HistoryPath"
        Vc-Changelist-AddRemove "$HistoryPath"
        Vc-Changelist-Add "$HistoryPath"
    }
    if (!(Test-Path($HISTORYFILE))) 
    {
        Log-Message "Creating new history file and adding to version control" "magenta"
        New-Item -ItemType "file" -Path "$HISTORYFILE" -Value "$PROJECTNAME`r`n`r`n" | Out-Null
        Vc-Changelist-AddRemove "$HISTORYFILE"
        Vc-Changelist-AddNew "$HISTORYFILE"
    }
    if (!(Test-Path($HISTORYFILE))) 
    {
        Log-Message "Could not create history file, exiting" "red"
        exit 140;
    }
    if ($CURRENTVERSION -ne $VERSION -and ($RUN -eq 1 -or $DRYRUN -eq $true))
    {
        $TmpCommits = $ClsHistoryFile.createSectionFromCommits($COMMITS, $HISTORYLINELEN)

        Log-Message "Preparing history file"
        #
        # Touch history file with the latest version info, either update existing, or create 
        # a new one if it doesnt exist
        #
        # Add lines 'version', 'date', then the header content
        #                         
        Add-Content -NoNewline -Path $HISTORYFILE -Value "`r`n"                        #
        Add-Content -NoNewline -Path $HISTORYFILE -Value "$VERSIONTEXT $VERSION`r`n"   # Version x.y.z
        Add-Content -NoNewline -Path $HISTORYFILE -Value "$TDATE`r`n"                  # May 9, 2019
        if (Test-Path($HISTORYHDRFILE)) 
        {
            $HISTORYHDRFILE = Get-Content $HISTORYHDRFILE -Raw 
            Add-Content -NoNewline -Path $HISTORYFILE -Value $HISTORYHDRFILE
        }
        else {   
            Log-Message "History header template not found" "darkyellow"
            Add-Content -NoNewline -Path $HISTORYFILE -Value "`r`n"  
        }                                                      
        Add-Content -NoNewline -Path $HISTORYFILE -Value "`r`n"
        #
        # Format the commit messages before adding to the hostory file
        #
        $TmpCommits = $TmpCommits.Replace("`n`n", "`r`n`r`n")
        #
        # Replace commit tags with full text (non-scoped)
        #
        # Commit tags should be at the start of the commit message.
        #
        # Examples of commit tags:
        #
        #     feat: add internet explorer support
        #
        $TmpCommits = $TmpCommits.Replace("build: ", "Build System`r`n`r`n    ")
        $TmpCommits = $TmpCommits.Replace("chore: ", "Chore`r`n`r`n    ")
        $TmpCommits = $TmpCommits.Replace("docs: ", "Documentation`r`n`r`n    ")
        $TmpCommits = $TmpCommits.Replace("feat: ", "Feature`r`n`r`n    ")
        $TmpCommits = $TmpCommits.Replace("featmin: ", "Minor Feature`r`n`r`n    ")
        $TmpCommits = $TmpCommits.Replace("minfeat: ", "Minor Feature`r`n`r`n    ")
        $TmpCommits = $TmpCommits.Replace("fix: ", "Bug Fix`r`n`r`n    ")
        $TmpCommits = $TmpCommits.Replace("perf: ", "Performance Enhancement`r`n`r`n    ")
        $TmpCommits = $TmpCommits.Replace("refactor: ", "Code Refactoring`r`n`r`n    ")
        $TmpCommits = $TmpCommits.Replace("style: ", "Code Styling`r`n`r`n    ")
        $TmpCommits = $TmpCommits.Replace("test: ", "Tests`r`n`r`n    ")
        $TmpCommits = $TmpCommits.Replace("project: ", "Project Structure`r`n`r`n    ")
        $TmpCommits = $TmpCommits.Replace("layout: ", "Layout`r`n`r`n    ")
        #
        # Replace commit tags with full text (scoped)
        #
        # A tag can be scoped, for example:
        #
        #     fix(footpedal): pressing multiple buttons at same time breaks audio player
        #
        $TmpCommits = $TmpCommits.Replace("build(", "Build System(")
        $TmpCommits = $TmpCommits.Replace("chore(", "Chore(")
        $TmpCommits = $TmpCommits.Replace("docs(", "Documentation(")
        $TmpCommits = $TmpCommits.Replace("feat(", "Feature(")
        $TmpCommits = $TmpCommits.Replace("featmin(", "Minor Feature(")
        $TmpCommits = $TmpCommits.Replace("minfeat(", "Minor Feature(")
        $TmpCommits = $TmpCommits.Replace("fix(", "Bug Fix(")
        $TmpCommits = $TmpCommits.Replace("perf(", "Performance Enhancement(")
        $TmpCommits = $TmpCommits.Replace("refactor(", "Code Refactoring(")
        $TmpCommits = $TmpCommits.Replace("project(", "Project Structure(")
        $TmpCommits = $TmpCommits.Replace("test(", "Tests(")
        $TmpCommits = $TmpCommits.Replace("style(", "Code Styling(")
        $TmpCommits = $TmpCommits.Replace("layout(", "Layout(")
        #
        # Take any parenthesized scopes, remove the prenthesis and line break the message
        # that follows
        #
        [Match] $match = [Regex]::Match($TmpCommits, "[(][a-z\- A-Z]*[)]\s*[:][ ]");
        while ($match.Success) {
            $NewText = $match.Value.Replace("(", "")
            $NewText = $NewText.Replace(")", "")
            $NewText = $NewText.Replace(": ", "")
            $TmpCommits = $TmpCommits.Replace($match.Value, ":  $NewText`r`n`r`n    ")
            $match = $match.NextMatch()
        }
        #
        # Typically when writing the commit messages lowercase is used.  Capitalize the first 
        # letter following the commit message tag
        #
        [Match] $match = [Regex]::Match($TmpCommits, "[\r\n]{2}\s*[a-z]");
        while ($match.Success) {
            if ($match.Value.Contains("`r`n`r`n")) { # ps regex is buggy on [\r\n]{2}
                $TmpCommits = $TmpCommits.Replace($match.Value, $match.Value.ToUpper())
            }
            $match = $match.NextMatch()
        }
        #
        # Use two new lines after new section
        #
        if (!$TmpCommits.EndsWith("`r`n`r`n")) {
            $TmpCommits = $TmpCommits + "`r`n";
        }
        #
        # Perform spell checking (currently the projectoxford has been taken down after the
        # Microsoft deal with the facial rec api)
        #
        #$TmpCommits = CheckSpelling $TmpCommits $false
        #
        # Write the formatted commits text to $HISTORYFILE
        # Formatted commits are also contained in the temp text file $Env:TEMP\history.txt
        # Replace all newline pairs with cr/nl pairs as SVN will have sent commit comments back
        # with newlines only
        #
        [System.Threading.Thread]::Sleep(500);
        Add-Content $HISTORYFILE $TmpCommits
    }
    else {
        Log-Message "Version match, not touching history file" "darkyellow"
    }
    #
    # Add to changelist for scm check in.  This would be the first file modified so just
    # set changelist equal to history file
    #
    Vc-Changelist-Add $HISTORYFILE
    #
    # Allow manual modifications to history file
    #
    Edit-File $HISTORYFILE $true
}

#
# Process $CHANGELOGFILE
#
if (![string]::IsNullOrEmpty($CHANGELOGFILE))
{
    #
    # If changelog markdown file doesnt exist, create one with the project name as a title
    #
    $NewChangelog = $false
    $ChangeLogPath = Split-Path "$CHANGELOGFILE"
    if ($ChangeLogPath -ne "" -and !(Test-Path($ChangeLogPath))) 
    {
        Log-Message "Creating changelog file directory and adding to version control" "magenta"
        New-Item -ItemType "directory" -Path "$ChangeLogPath" | Out-Null
        Vc-Changelist-AddNew "$ChangeLogPath"
        Vc-Changelist-AddRemove "$ChangeLogPath"
        Vc-Changelist-Add "$ChangeLogPath"
    }
    if (!(Test-Path($CHANGELOGFILE))) 
    {
        Log-Message "Creating new changelog file and adding to version control" "magenta"
        New-Item -ItemType "file" -Path "$CHANGELOGFILE" -Value "$ChangeLogTitle`r`n`r`n" | Out-Null
        Vc-Changelist-AddRemove $CHANGELOGFILE
        Vc-Changelist-AddNew $CHANGELOGFILE
        $NewChangelog = $true
    }
    if (!(Test-Path($CHANGELOGFILE))) 
    {
        Vc-Revert $true
        Log-Message "Could not create changelog file, exiting" "red"
        exit 141
    }

    if ($CURRENTVERSION -ne $VERSION -and ($RUN -eq 1 -or $DRYRUN -eq $true))
    {
        $TmpCommits = ""
        $LastSection = ""
        $Sectionless = @()
        $ChangeLogTitle = "# $PROJECTNAME Change Log".ToUpper()

        Log-Message "Preparing changelog file"
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
                $Scope = $TmpCommit.SubString($idx1 + 1, $TmpCommit.IndexOf(")") - $idx1 - 1).Trim()
            }
            else {
                $Section = $TmpCommit.SubString(0, $idx2).TrimEnd();
            }
            #
            # Ignore chores
            #
            if ($Section.ToLower() -eq "chore") {
                continue;
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
        Log-Message "Version match, not touching changelog file" "darkyellow"
    }
    #
    # Allow manual modifications to changelog file
    #
    Edit-File $CHANGELOGFILE
    #
    # Add to changelist for svn check in.  This would be the first file modified so just
    # set changelist equal to history file
    #
    Vc-Changelist-Add $CHANGELOGFILE
}

$DistIsVersioned = $false
if ($DISTRELEASE -eq "Y")
{
    $DistDirCreated = $false
    #
    # Create dist directory if it doesnt exist
    #
    if (!(Test-Path($PATHTODIST))) {
        Log-Message "Creating dist directory" "magenta"
        New-Item -Path "$PATHTODIST" -ItemType "directory" | Out-Null
        Vc-Changelist-AddRemove "$PATHTODIST"
        $DistDirCreated = $true
    }
    #
    # Get whether or not dist dir is under vesion control, in some cases it may not be
    #
    $DistIsVersioned = Vc-IsVersioned($PATHTODIST, $true, $true)
    #
    #
    #
    if (!$DistDirCreated -and $DistIsVersioned) 
    {
        Vc-Changelist-Add "$PATHTODIST"
        Vc-Changelist-AddMulti "$PATHTODIST"
    }
}

#
# Check if this is an ExtJs build.  ExtJs build will be an dist release, but it will
# contain both package.json and app.json that will need version updated.  A node_modules
# directory will exist, so the current version was extracted by node and and next version  
# was calculated by semver.
#
if ((Test-Path("app.json")) -and (Test-Path("package.json"))) {
    Prepare-ExtJsBuild
}
#
# Check to see if its a npm managed project, update package.json if required
#
if ((Test-Path("package.json"))) {
    Prepare-PackageJson
}
#
# If this is a .NET build, update assemblyinfo file
# Search root dir and one level deep.  If the assembly file is located deeper than 1 dir
# from the root dir, it should be specified using the versionFiles arry of .publishrc
#
$AssemblyInfoLoc = Get-ChildItem -Name -Recurse -Depth 1 -Filter "assemblyinfo.cs" -File -Path . -ErrorAction SilentlyContinue
if ($AssemblyInfoLoc -is [system.string] -and ![string]::IsNullOrEmpty($AssemblyInfoLoc))
{
    Prepare-DotNetBuild $AssemblyInfoLoc
}
elseif ($AssemblyInfoLoc -is [System.Array] -and $AssemblyInfoLoc.Length -gt 0) {
    foreach ($AssemblyInfoLocFile in $AssemblyInfoLoc) {
        Prepare-DotNetBuild $AssemblyInfoLocFile
    }
}
#
# Version bump specified files in publishrc config 'versionFiles'
#
Prepare-VersionFiles
#
# Run custom build scipts if specified
#
Run-Scripts "build" $BUILDCOMMAND $true $true

#
# Store location paths depending on publish types, these will be used to set links to
# locations in the release email
#
$TargetNetLocation = ""
$NpmLocation = ""
$NugetLocation = ""

#
# NPM Release
#
if ($NPMRELEASE -eq "Y") 
{
    Log-Message "Starting NPM release"
    if (Test-Path("package.json"))
    {
        $PublishFailed = $false;
        #
        # Pack tarball and mvoe to dist dir if specified
        #
        if ($NPMPACKDIST -eq "Y" -and $DISTRELEASE -eq "Y") 
        {
            & npm pack
            Check-ExitCode
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
            #Check-PsCmdSuccess
            [System.Threading.Thread]::Sleep(500)
            Log-Message "Moving package:"
            Log-Message "   $TmpPkgFile"
            Log-Message "To:"
            Log-Message "   $DestPackedFile"
            & cmd /c move /Y "$TmpPkgFile" "$DestPackedFile"
            Check-ExitCode
        }
        #
        # Publish to npm server
        #
        Log-Message "Publishing npm package to $NPMREGISTRY"
        if ($DRYRUN -eq $false) 
        {
            & npm publish --access public --registry $NPMREGISTRY
            Check-ExitCode
        }
        else 
        {
            Log-Message "   Dry run, performing publish dry run only" "magenta"
            & npm publish --access public --registry $NPMREGISTRY --dry-run
            Log-Message "   Dry run, dry run publish finished" "magenta"
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
            Vc-Revert $true
            exit 150
        }
    }
    else {
        Log-Message "Could not find package.json" "darkyellow"
    }
}

#
# TODO - Nuget Release / .NET
#
if ($NUGETRELEASE -eq "Y") 
{
    Log-Message "Starting Nuget release"
    Log-Message "Nuget release not yet supported" "darkyellow"
}

#
# Network Release
#
if ($DISTRELEASE -eq "Y") 
{
    Log-Message "Starting Distribution release"
    #
    # Copy history file to dist directory
    #
    if (![string]::IsNullOrEmpty($HISTORYFILE))
    {
        if (!(Test-Path("$PATHTODIST\$HISTORYFILE")) -and $DistIsVersioned) 
        {
            $HistoryFileName = [Path]::GetFileName($HISTORYFILE);
            Vc-Changelist-AddRemove "$PATHTODIST\$HistoryFileName"
            Vc-Changelist-AddNew "$PATHTODIST\$HistoryFileName"
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
        if ($DRYRUN -eq $true) 
        {
            Log-Message "Deploying distribution files to specified location:"
            Log-Message "   $TargetNetLocation"
            #
            # SoftwareImages Upload
            #
            # Create directory on network drive
            # TargetNetLocation is defined above as it is needed for email notification fn as well
            #
            if (!(Test-Path($TargetNetLocation))) {
                Log-Message "Create directory $TargetNetLocation"
                New-Item -Path "$TargetNetLocation" -ItemType "directory" | Out-Null
                Check-PsCmdSuccess
            }
            #
            # Copy all files in 'dist' directory that start with $PROJECTNAME, and the history file
            #
            Log-Message "Deploying files to $TargetNetLocation"
            Copy-Item "$PATHTODIST\*" -Destination "$TargetNetLocation" | Out-Null
            Check-PsCmdSuccess
            #
            # Create directory on doc share
            #
            New-Item -Path "$TargetDocLocation" -ItemType "directory" | Out-Null
            #
            # Copy all pdf files in 'dist' and 'doc' and 'documentation' directories
            #
            Log-Message "Deploying pdf documentation to $TargetDocLocation"
            if (Test-Path("documentation")) {
                Copy-Item "documentation\*.pdf" -Destination "$TargetDocLocation" | Out-Null
            }
            if (Test-Path("doc")) {
                Copy-Item "doc\*.pdf" -Destination "$TargetDocLocation" | Out-Null
            }
            if (Test-Path("$PATHTODIST")) {
                Copy-Item "$PATHTODIST\*.pdf" -Destination "$TargetDocLocation" | Out-Null
            }
            Check-PsCmdSuccess
        }
        else {
            Log-Message "Dry run, skipping basic push to network drive" "magenta"
        }
    }
    else {
        Log-Message "Skipped network release push (user specified)" "magenta"
    }
}

#
# Run post build scripts if specified
#
Run-Scripts "postBuild" $POSTBUILDCOMMAND $true $true

#
# Restore any configured package.json values to the original values
#
if ((Test-Path("package.json"))) {
    Restore-PackageJson
}

#
# Run custom deploy script if specified
#
if ($SKIPDEPLOYPUSH -ne "Y" -and $DRYRUN -eq $false)
{
    Run-Scripts "deploy" $DEPLOYCOMMAND $false $false
}
else {
    Log-Message "Skipped running custom deploy script" "magenta"
}

#
# Send release notification email
#
if ($EMAILNOTIFICATION -eq "Y") {
    if (![string]::IsNullOrEmpty($TargetNetLocation) -or ![string]::IsNullOrEmpty($NpmLocation) -or ![string]::IsNullOrEmpty($NugetLocation) ) {
        Send-Notification "$TargetNetLocation" "$NpmLocation" "$NugetLocation"
    }
}

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
        #$VCCHANGELIST = $VCCHANGELIST.Trim()
        #
        # Check version changes in to SVN if there's any touched files
        #
        if ($VCCHANGELIST -ne "") 
        {
            if ($DRYRUN -eq $false) 
            {
                if ($SKIPCOMMIT -ne "Y")
                {
                    # SVN add
                    #
                    if ($VCCHANGELISTADD -ne "")
                    {
                        Log-Message "Adding unversioned touched files to GIT version control"
                        Log-Message "   $VCCHANGELISTADD"
                        Invoke-Expression -Command "svn add $VCCHANGELISTADD"
                        Check-ExitCode $false
                    }
                    Log-Message "Committing touched files to SVN version control"
                    Log-Message "   $VCCHANGELIST"
                    #
                    # SVN commit
                    #
                    Invoke-Expression -Command "svn commit $VCCHANGELIST -m `"chore(release): $VERSION [skip ci]`""
                    Check-ExitCode $false
                }
                elseif (![string]::IsNullOrEmpty($VCCHANGELISTMLT)) 
                {
                    Log-Message "Committing touched multi-publish files to SVN version control"
                    Log-Message "   $VCCHANGELISTMLT"
                    #
                    # SVN commit
                    #
                    Invoke-Expression -Command "svn commit $VCCHANGELISTMLT -m `"chore(release-mlt): $VERSION [skip ci]`""
                    Check-ExitCode $false
                }
                else {
                    Log-Message "Skipping touched file SVN commit, user specified" "darkyellow"
                }
            }
            else 
            {
                if ($DRYRUNVCREVERT -eq "Y") {
                    Log-Message "Dry run, reverting changes" "magenta"
                    Vc-Revert
                }
                if ($DRYRUN -eq $true) {
                    Log-Message "   Dry run, skipping touched file SVN commit" "magenta"
                }
            }
        }

        #
        # Create version tag
        #
        if ($VCTAG -eq "Y")
        {
            $TagLocation = $_Repo.Replace("trunk", "tags")
            if (![string]::IsNullOrEmpty($PATHPREROOT) -and [string]::IsNullOrEmpty($VCTAGPREFIX))
            {

                Log-Message "Skipping version tag, 'vcTagPrefix' must be set for subprojects" "darkyellow"
                Log-Message "The project must be tagged manually using the following command:" "magenta"
                Log-Message "   svn copy `"$_Repo`" `"$TagLocation/prefix-v$VERSION`" -m `"chore(release): tag v$VERSION [skip ci]`"" "magenta"
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
                Log-Message "Tagging SVN version at $TagLocation"
                if ($DRYRUN -eq $false) 
                {
                    #
                    # Call svn copy to create 'tag'
                    #
                    & svn copy "$_Repo" "$TagLocation" -m "$TagMessage"
                    Check-ExitCode $false
                }
                else {
                    Log-Message "Dry run, skipping create version tag" "magenta"
                }
            }
        }
        else {
            Log-Message "Skipping version tag, user specified" "darkyellow"
        }
    }
    else {
        Log-Message "Could not find .svn folder, skipping commit and version tag" "red"
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
        if ($VCCHANGELIST -ne "") 
        {
            if ($DRYRUN -eq $false) 
            {
                if ($SKIPCOMMIT -ne "Y")
                {
                    # GIT add
                    #
                    if ($VCCHANGELISTADD -ne "")
                    {
                        Log-Message "Adding unversioned touched files to GIT version control"
                        Log-Message "   $VCCHANGELISTADD"
                        Invoke-Expression -Command "git add -- $VCCHANGELISTADD"
                        Check-ExitCode $false
                    }
                    #
                    # GIT commit and GIT push
                    #
                    Log-Message "Committing touched files to GIT version control"
                    Log-Message "   $VCCHANGELIST"
                    Invoke-Expression -Command "git commit --quiet -m `"chore(release): $VERSION [skip ci]`" -- $VCCHANGELIST"
                    Check-ExitCode $false
                    Invoke-Expression -Command "git push origin master:master"
                    Check-ExitCode $false
                }
                elseif (![string]::IsNullOrEmpty($VCCHANGELISTMLT))
                {
                    Log-Message "Committing touched multi-publish files to SVN version control"
                    Log-Message "   $VCCHANGELISTMLT"
                    #
                    # GIT commit
                    #
                    Invoke-Expression -Command "git commit --quiet -m `"chore(release-mlt): $VERSION [skip ci]`" -- $VCCHANGELISTMLT"
                    Check-ExitCode $false
                    Invoke-Expression -Command "git push origin master:master"
                    Check-ExitCode $false
                }
                else {
                    Log-Message "Skipping touched file GIT commit, user specified" "darkyellow"
                }
            }
            else 
            {
                if ($DRYRUNVCREVERT -eq "Y") {
                    Log-Message "Dry run, reverting changes" "magenta"
                    Vc-Revert
                }
                if ($DRYRUN -eq $true) {
                    Log-Message "Dry run, skipping touched file GIT commit" "magenta"
                }
            }
        }

        #
        # Create version tag
        #
        if ($VCTAG -eq "Y")
        {
            if (![string]::IsNullOrEmpty($PATHPREROOT) -and [string]::IsNullOrEmpty($VCTAGPREFIX))
            {
                Log-Message "Skipping version tag, 'vcTagPrefix' must be set for subprojects" "darkyellow"
                Log-Message "The project must be tagged manually using the following command:" "magenta"
                Log-Message "   git tag -a prefix-v$VERSION -m `"chore(release): tag v$VERSION [skip ci]`"" "magenta"
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
                Log-Message "Tagging GIT version $TagLocation"
                if ($DRYRUN -eq $false) 
                {
                    #
                    # Call git tag to create 'tag', then push to remote with push --tags
                    #
                    & git tag -a $TagLocation -m "$TagMessage"
                    Check-ExitCode $false
                    & git push --tags
                    Check-ExitCode $false
                }
                else {
                    Log-Message "Dry run, skipping create version tag" "magenta"
                }
            }
        }
        else {
            Log-Message "Skipping version tag, user specified" "darkyellow"
        }
    }
    else {
        Log-Message "Could not find .git folder, skipping commit and version tag" "red"
    }
}

if (![string]::IsNullOrEmpty($PATHTOMAINROOT) -and $PATHTOMAINROOT -ne ".") {
    set-location $PATHPREROOT
}

#
# Github Release
#
if ($_RepoType -eq "git" -and $GITHUBRELEASE -eq "Y") 
{
    Log-Message "Starting GitHub release"
 
    if ($DRYRUN -eq $false) 
    {
        Log-Message "Creating GitHub v$VERSION release"
        #
        # Set up the request body for the 'create release' request
        #
        $Request = @{
            "tag_name" = "v$VERSION"
            "target_commitish" = "$BRANCH"
            "name" = "v$VERSION"
            "body" = "Version $VERSION Release"
            "draft" = $false
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
        # Send the REST POST to create the release
        #
        $url = "https://api.github.com/repos/$GITHUBUSER/$PROJECTNAME/releases"
        $Response = Invoke-RestMethod $url -UseBasicParsing -Method POST -Body $Request -Headers $Header
        Check-PsCmdSuccess
        #
        # Make sure an upload_url value exists on the response object to check for success
        #
        if ($? -eq $true -and $Response.upload_url)
        {
            Log-Message "Successfully created GitHub release v$VERSION" "darkgreen"
            Log-Message "   ID         : $($Response.id)" "darkgreen"
            Log-Message "   Tarball URL: $($Response.zipball_url)" "darkgreen"
            Log-Message "   Zipball URL: $($Response.tarball_url)" "darkgreen"
            #
            # Creating the release was successful, upload assets if any were specified
            #
            if ($GITHUBASSETS.Length -gt 0)
            {
                Log-Message "Uploading GitHub assets"
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
                        Check-PsCmdSuccess
                        if ($? -eq $true)
                        {
                            #
                            # Upload the asset via GitHub API.
                            #
                            $url = $Response.upload_url
                            $url = $url.Replace("{?name,label}", "") + "?name=$AssetName"
                            $Response2 = Invoke-RestMethod $url -UseBasicParsing -Method POST -Body $Request -Headers $Header
                            Check-PsCmdSuccess
                            #
                            # Make sure an id value exists on the response object to check for success
                            #
                            if ($? -eq $true -and $Response2.id) {
                                Log-Message "Successfully uploaded GitHub asset $AssetName" "darkgreen"
                                Log-Message "   ID          : $($Response2.id)" "darkgreen"
                                Log-Message "   Download URL: $($Response2.browser_download_url)" "darkgreen"
                            }
                            else {
                                Log-Message "Failed to upload GitHub asset $AssetName" "red"
                            }
                        }
                        else {
                            Log-Message "Failed to upload GitHub asset $AssetName - could not read input file" "red"
                        }
                    }
                    else {
                        Log-Message "Failed to upload GitHub asset $AssetName - input file does not exist" "red"
                    }
                }
            }
        }
        else {
            Log-Message "Failed to create GitHub v$VERSION release" "red"
        }
    }
    else {
        Log-Message "Dry run, skipping GitHub release" "magenta"
    }
}

if ($DRYRUN -eq $true) {
    Log-Message "Dry run completed"
    if ($DRYRUNVCREVERT -ne "Y") {
        Log-Message "   You should manually revert any auto-touched files via SCM" "magenta"
    }
}

Log-Message "Completed"
Log-Message "Finished successfully" "darkgreen"

}

exit
