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
# increment the version number (legacy pj versioning) or use the semver module (semantic
# versioning maj.min.patch) to determine the next version number.
#
param ( 
# ------------------------------------------------------------------------------------------
# ------------------------------------------------------------------------------------------
# Script configuration
# Modify the below variables per project
# ------------------------------------------------------------------------------------------
# ------------------------------------------------------------------------------------------
#
# Name of the project.  This must macth throughout the build files and the SVN project name
#
$PROJECTNAME = "",
#
#
#
$DEPLOYSCRIPT = "",
#
# To build the installer release, set this flag to "Y"
#
$INSTALLERRELEASE = "N",
#
# The location of the installer build script, this can be a relative to PATHTOROOT 
# or a full path.
# Note this parameter applies only to INSTALLRELEASE="Y"
#
$INSTALLERSCRIPT = "",
#
# The location of this history file, can be a relative or full path.
#
$HISTORYFILE = "doc\history.txt",
$HISTORYLINELEN = 80,
#
# The location of this history header file, can be a relative or full path.
#
$HISTORYHDRFILE = "install\history-hdr.txt",
#
#
#
$NOTEPADEDITS = "Y",
#
# To build the npm release, set this flag to "Y"
#
$NPMRELEASE = "N",
#
# NPM user (for NPMRELEASE="Y" only)
# 
# NPM username, password, and token should be store as environment variables
# for security.  The variable names should be:
#
#     PJ_NPM_USERNAME
#     PJ_NPM_PASSWORD
#     PJ_NPM_TOKEN
#
# To create an npm user if you dont have one, run the following command and follow 
# the prompts:
#
#     $ npm adduser --registry=npm.development.pjats.com --scope=@perryjohnson
#
#     Locate the file [USERDIR]\.npmrc, copy the created token from within
#     the file to the environment variable PJ_NPM_TOKEN
#
# The project file .npmrc will be used by npm when publishing packages, it reads
# the NPM environment variables as well.
#
$NPMUSER = $Env:PJ_NPM_USERNAME,
#
# To build the nuget release, set this flag to "Y"
#
$NUGETRELEASE = "N",
#
# PATHTOROOT - Set this variable to:
#
#     A relative or full path that will equate to the project root as seen from the 
#     script's location.  For example, if this script is in PROJECTDIR\script, then 
#     the rel path to root would be "..".  If the script is in PROJECTDIR\install\script,
#     then the rel path to root would be "..\.."
#
# It is assumed that installer build files are in $PATHTOROOT\install.
# 
# It is also assumed that the legacy CreateInstall.xml and Deploy.xml files are located in 
# $PATHTOROOT\install
#
# $DEPLOYFILE = "install\deploy.xml"
# $CREATEINSTALLFILE = "install\createinstall.xml"
#
# The value should be relative to the script dir, dont use a full path as this will not
# share across users well keeping project files in different directories
#
$PATHTOROOT = ".",
#
# This in most cases sould be an empty string if the project is the 'main' project.  If
# a sub-project exists within a main project in SVN, then this needs to be set to the 
# relative directory to the main project root, as seen from the sub-project root.
#
# Note this should be where the '.svn' folder resides.
#
$PATHTOMAINROOT = "",
#
# Path to DIST should be relative to PATHTOROOT
#
$PATHTODIST = "install\dist",
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
$PATHPREROOT = "",
#
# Skip uploading installer to network release folder (primarily used for releasing
# from hom office where two datacenters cannot be reached at the same time, in this
# case the installer files are manually copied)
#
$SKIPDEPLOYPUSH = "Y",
#
# The svn server address, can be domain name or IP
#
$SVNSERVER = "10.0.9.60",
#
# The SVN repository.  It should be one of the following:
#
#     1. pja
#     2. pjr
#
$SVNREPO = "pja",
#
# The SVN protocol to use for SVN commands.  It should be one of the following:
#
#     1. svn
#     2. https
#
$SVNPROTOCOL = "svn",
#
# Test mode - Y for 'yes', N for 'no'
#
# In test mode, the following holds:
#
#     1) Installer is not released/published
#     2) Email notification will be sent only to $TESTEMAILRECIP
#     3) Commit package/build file changes (svn) are not made
#     4) Version tag (svn) is not made
#
# Some local files may be changed in test mode (i.e. updated version numbers in build and
# package files).  These changes should be reverted to original state via SCM
#
$TESTMODE = "Y",
$TESTMODESVNREVERT = "Y",
$TESTEMAILRECIP = "smeesseman@pjats.com",
#
# The text tag to use in the history file for preceding the version number.  It should 
# be one of the following:
#
#     1. Version
#     2. Build
#     3. Release
#
$VERSIONTEXT = "Version"
#
# ------------------------------------------------------------------------------------------
# ------------------------------------------------------------------------------------------
# End script configuration
# ------------------------------------------------------------------------------------------
# ------------------------------------------------------------------------------------------
)

$SCRIPTVERSION = "1.0.0"
$CURRENTVERSION = ""
$VERSION = "" 
$BRANCH = ""
$COMMITS = ""
$TDATE = ""

#
# Define a variable to track changed files for check-in to SVN
# This will be a space delimited list of quoted strings/paths
#
$SVNCHANGELIST = ""

#
# Define some script classes:
#
#     Svn
#     HistoryFile
#     AnalyzeCommits
#

class Svn
{
    [string]getComments($Protocol, $Server, $Repo, $Module, $LineLen)
    {
        $comments = "";

        if ($Module -eq "")
        {
            return $comments;
        }

        #
        # Account for padding in line length
        #
        $LineLen = $LineLen - 4;

        #
        # Get tags
        #
        write-host("Retrieving most recent tag");
        $xml = svn log --xml "${Protocol}://$Server/$Repo/$Module/tags" --verbose --limit 50;
        $path = $null;

        #
        # Parse log response
        #
        write-host("Parsing response from SVN");
        try {
            $path = (([Xml] ($xml)).Log.LogEntry.Paths.Path |
            Where-Object { $_.action -eq 'A' -and $_.kind -eq 'dir' -and $_.InnerText -like '*tags*'} |
            Select-Object -Property @(
                @{N='date'; E={$_.ParentNode.ParentNode.Date}},
                @{N='path'; E={$_.InnerText}} )|
            Sort-Object Date -Descending | Select-Object -First 1).path
        }
        catch {
            write-host -ForegroundColor "red" "Response could not be parsed, invalid module, no commits found, or no version tag exists";
            return $comments;
        }

        $rev = (([Xml]($xml)).Log.LogEntry | Where-Object { $_.revision -ne ''} | Select-Object -First 1).revision;

        write-host("   Found version tag:");
        write-host("      Rev     : $rev");
        write-host("      Path    : $path");

        #
        # Retrieve commits since last version tag
        #
        write-host("Retrieving commits since last version");
        $xml = svn log --xml "${Protocol}://$Server/$Repo/$Module/trunk" --verbose --limit 50 -r ${rev}:HEAD;

        write-host("Parsing response from SVN");
        write-host("Comments found in commits:");
        $commentNum = 1;
        
        #
        # Create xml document object from SVN log response
        #
        $xdoc = $null;
        try {
            $xdoc = [Xml]$xml;
        }
        catch {
            write-host -ForegroundColor "red" "No commits found or no version tag exists";
            return $comments;
        }

        #
        # Parse the commit messages
        #
        foreach ($msg in $xdoc.log.logentry.msg)
        {
            if($null -ne $msg -and $msg -ne "")
            {
                $line = "";
                
                if ($commentNum -lt 10) {
                    $line = "$commentNum.  ";
                }
                else {
                    $line = "$commentNum. ";
                }

                $msgs = $msg.Split("`n");
                for ($i = 0; $i -lt $msgs.Length; $i++)
                {
                    if ($i -gt 0) {
                        $line += "`r`n";
                    }
                    $msg = $msgs[$i];
                    if ($msg.Length -gt $LineLen)
                    {
                        $idx = $msg.LastIndexOf(" ", $LineLen);
                        $line += $msg.SubString(0, $idx);
                        while ($msg.Length -gt $LineLen)
                        {
                            $msg = $msg.SubString($idx);
                            $line += "`r`n";
                            if ($msg.Length -gt $LineLen) {
                                $idx = $msg.LastIndexOf(" ", $LineLen);
                                $line += $msg.SubString(0, $idx).Trim();
                            }
                            else {
                                $line += $msg.Trim();
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
                    $line = $line.Substring(0, $idx + 1) + "    " + $line.Substring($idx + 1);
                    $idx = $line.IndexOf("`n", $idx + 1);
                }

                $comments = $comments + $line + "`r`n`r`n";
            
                $commentNum++;
            }
        }

        return $comments;
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
                write-host "Breaking change found"
                $ReleaseLevel = "major";
                break;
            }
            if ($linefmt.Contains("majfeat: ")) # bump major on major feature
            {
                write-host "Major feature found"
                $ReleaseLevel = "major";
                break;
            }
            if ($linefmt.Contains("feat: ")) # bump minor on feature
            {
                write-host "Feature found";
                $ReleaseLevel = "minor";
                break;
            }
            #if ($linefmt.Contains("perf"))
            #{
            #    write-host "Performance enhancement found";
            #    $ReleaseLevel = "minor";
            #    break;
            #}
        }

        return $ReleaseLevel;
    }
}

class HistoryFile
{
    [string]getVersion($in, $stringver)
    {
        return $this.getHistory("", "", 0, $stringver, $false, $in, "", "", "", "")
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
        if (!(Test-Path $szInputFile) -or $szInputFile -eq "" -or $szInputFile -eq $null) {
            write-host -ForegroundColor "red" "Error: No input file provided"
            exit 101;
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
            write-host -ForegroundColor "red" "   Parse Error - Invalid NumSections parameter"
            write-host -ForegroundColor "red" "   Error type  : $_.Exception.GetType().FullName"
            write-host -ForegroundColor "red" "   Error code  : $($_.Exception.ErrorCode)"
            write-host -ForegroundColor "red" "   Error text  : $($_.Exception.Message)"
            exit 101;
        }

        write-host "Extract from history.txt file"
        write-host "   Input File         : '$szInputFile'"
        write-host "   Output File        : '$szOutputFile'"
        write-host "   Num Sections       : '$iNumSections'"

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
                write-host -ForegroundColor "red" "   Last section could not be found (0), exit"
                exit 101
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
                write-host -ForegroundColor "red" "   Last section could not be found (1), exit"
                exit 101
            }

            $iIndex2 = $szContents.IndexOf("`n", $iIndex2 + 1)
            #
            # Make sure the newline was found
            #
            if ($iIndex2 -eq -1)
            {
                write-host -ForegroundColor "red" "   Last section could not be found (2), exit"
                exit 101
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
            write-host -ForegroundColor "red" "   Last section could not be found, exit"
            exit 101
        }

        write-host "   Found version section"
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
            write-host "   Write header text to message"

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

            write-host "   Write $iNumSections history section(s) to message"

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
                write-host "   Re-ordering $iNumSections sections newest to oldest"

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
                    #write-host($iIndex1);
                    #write-host($iIndex2);
                    #write-host($szContents.Substring($iIndex1, $iIndex2 - $iIndex1));
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
            $iIndex1 = $szContents.IndexOf(">$stringver&nbsp;", 0) + 14
            $iIndex2 = $szContents.IndexOf("<br>", $iIndex1)
            $curversion = $szContents.Substring($iIndex1, $iIndex2 - $iIndex1)
            write-host("   Found version $curversion")
            return $curversion
        }

        if ($szOutputFile -ne "" -and $szOutputFile -ne $null) {
            New-Item -ItemType "file" -Path "$szOutputFile" -Value $szFinalContents | Out-Null
            write-host "   Saved release history output to $szOutputFile"
        }

        write-host -ForegroundColor "darkgreen" "   Successful"

        return $szFinalContents
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
    # encoding="plain" (from ant)   ps cmd: -Encoding ASCII
    $rlh = New-Object -TypeName HistoryFile
    $EMAILBODY = $rlh.getHistory($PROJECTNAME, $VERSION, 1, $VERSIONTEXT, $false, $HISTORYFILE, $null, $targetloc, $npmloc, $nugetloc);
    write-host "Sending release notification email"
    try {
        if ($TESTMODE -ne "Y") {
            send-mailmessage -SmtpServer 10.0.7.50 -BodyAsHtml -From ProductBuild@pjats.com -To ProductRelease@pjats.com -Subject "$PROJECTNAME $VERSION" -Body $EMAILBODY
        }
        else {
            send-mailmessage -SmtpServer 10.0.7.50 -BodyAsHtml -From ProductBuild@pjats.com -To $TESTEMAILRECIP -Subject "$PROJECTNAME $VERSION" -Body $EMAILBODY
        }
        Check-ExitCode
    }
    catch {
        write-host -ForegroundColor "red" "   Delivery failure"
    }
}

#
# Function to check spelling in text
#
Function CheckSpelling($String, $RemoveSpecialChars)
{
    $OutString = $String

    write-host "Perform spelling check"

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
            write-host -ForegroundColor "darkgreen" "   Success"
        }
        catch{
            write-host -ForegroundColor "red" "   Failure"
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

function Svn-Changelist-Add($SvnFile)
{
    write-host "Adding $SvnFile to svn changelist"
    if ($PATHPREROOT -ne "" -and $PATHPREROOT -ne $null) {
        $SvnFile = Join-Path -Path "$PATHPREROOT" -ChildPath "$SvnFile"
    }
    $script:SVNCHANGELIST = "$script:SVNCHANGELIST `"$SvnFile`""
    #$script:SVNCHANGELIST += "`"$SvnFile`""
}

function Svn-Revert()
{
    if (![string]::IsNullOrEmpty($SVNCHANGELIST)) 
    {
        write-host "Reverting touched files under version control"
        Invoke-Expression -Command "svn revert $SVNCHANGELIST"
        Check-ExitCode
    }
}

function Check-ExitCode($ExitOnError = $false)
{
    #
    # Check script error code, 0 is success
    #
    if ($LASTEXITCODE -eq 0) {
        write-host -ForegroundColor "darkgreen" "Success"
    }
    else {
        write-host -ForegroundColor "red" "Failure"
        if ($ExitOnError -eq $true) {
            Svn-Revert
            exit
        }
    }
}

function Replace-Version($File, $Old, $New)
{
    write-host "Write new version $VERSION to $File"
    ((Get-Content -path $File -Raw) -replace "$Old", "$New") | Set-Content -NoNewline -Path $File
    #$FileContent = ((Get-Content -path $File -Raw) -replace "$Old", "$New")
    #Set-Content -NoNewline -Path $INSTALLERSCRIPT -Value $FileContent
    Check-ExitCode
}

#
# !!! SCRIPT ENTRY POINT !!!
#

#
# Set location to root
#
set-location -Path $PATHTOROOT
$CWD = Get-Location
write-host -ForegroundColor "darkblue" "----------------------------------------------------------------"
write-host -ForegroundColor "darkblue" "App Publisher"
write-host -ForegroundColor "blue"     "   Version   : $SCRIPTVERSION"
write-host -ForegroundColor "blue"     "   Author    : Scott Meesseman"
write-host -ForegroundColor "blue"     "   Directory : $CWD"
write-host -ForegroundColor "darkblue" "----------------------------------------------------------------"

#
# Write project specific properties
#
write-host "Project specific script configuration:"
write-host "   Project          : $PROJECTNAME"
write-host "   Path to root     : $PATHTOROOT"
write-host "   SVN server       : $SVNSERVER"
write-host "   SVN repo         : $SVNREPO"
write-host "   SVN protocol     : $SVNPROTOCOL"
write-host "   History file     : $HISTORYFILE"
write-host "   History file line: $HISTORYLINELEN"
write-host "   History hdr file : $HISTORYHDRFILE"
write-host "   Next Version     : $VERSIONTEXT"
write-host "   NPM user         : $NPMUSER"
write-host "   Is Install releas: $INSTALLERRELEASE"
write-host "   Installer script : $INSTALLERSCRIPT"
write-host "   Deploy script    : $DEPLOYSCRIPT"
write-host "   Skip deploy/push : $SKIPDEPLOYPUSH"
write-host "   Is NPM release   : $NPMRELEASE"
write-host "   Is Nuget release : $NUGETRELEASE"
write-host "   Notepad edits    : $NOTEPADEDITS"
write-host "   Is test mode     : $TESTMODE"
write-host "   Test email       : $TESTEMAILRECIP"

#
# Define the NPM and Nuget package servers
#
$NPMSERVER = "http://npm.development.pjats.com";
$NUGETSERVER = "http://nuget.development.pjats.com/nuget";

#
# Set default npm user if one was not specified
#
if ($NPMUSER -eq "") {
    $NPMUSER = "smeesseman";
}

#
# Must have code-package installed to run this script
#
if (!(Test-Path($Env:CODE_HOME))) {
    write-hpst -ForegroundColor "red" "Code Package must be installed to run this script"
    write-host -ForegroundColor "red" "Install Code Package from softwareimages\code-package\x.x.x"
    exit
}

#
# Deploy script(s).  String, or an array of strings
#
$IsAnt = $false;
if ($DEPLOYSCRIPT -is [system.string] -and ![string]::IsNullOrEmpty($DEPLOYSCRIPT))
{
    $DEPLOYSCRIPT = @($DEPLOYSCRIPT); #convert to array
}
if ($DEPLOYSCRIPT -is [system.array] -and $DEPLOYSCRIPT.Length -gt 0)
{
    foreach ($Script in $DEPLOYSCRIPT) 
    {
        $ScriptParts = $Script.Split(' ');
        if (!(Test-Path($ScriptParts[0]))) {
            write-host -ForegroundColor "red" "Script ${ScriptParts[0]} not found"
            exit
        }
        if ($Script.Contains(".xml")) {
            $IsAnt = $true
        }
    }
}
else {
    $DEPLOYSCRIPT = [string[]] @() # initialize to empty array.  see comment above about weird ps eval
}

if ($IsAnt -eq $true) 
{
    # Verify ANT/ANSICON install
    #
    if (!(Test-Path("$Env:CODE_HOME\ant"))) {
        write-hpst -ForegroundColor "red" "The ANT/ANSICON package must be installed to run this script"
        write-host "Re-run the code-package installer and add the Ant/Ansicon package"
        exit
    }
}

if (![string]::IsNullOrEmpty($INSTALLERSCRIPT))
{
    $ScriptParts = $INSTALLERSCRIPT.Split(' ');
    if (!(Test-Path($ScriptParts[0]))) {
        write-host -ForegroundColor "red" "Defined INSTALLERSCRIPT not found"
        exit
    }

    if ($INSTALLERSCRIPT.Contains(".nsi"))
    {
        if (!(Test-Path("$Env:CODE_HOME\nsis"))) {
            write-hpst -ForegroundColor "red" "The NSIS package must be installed to run this script"
            write-host "Re-run the code-package installer and add the NSIS package"
            exit
        }
    }
}

#
# Get commit messages since last version
#
# The previous version tag in the form 'vX.X.X' must exist in svn/projectroot/tags in
# order to successfully obtain the latest commit messages.  If it does not exist, the
# most current tag will be used
#
if ($COMMITS -eq "") {
    write-host "Writing svn commits to $Env:TEMP\commits.txt"
    $svn = New-Object -TypeName Svn
    $COMMITS = $svn.getComments($SVNPROTOCOL, $SVNSERVER, $SVNREPO, $PROJECTNAME, $HISTORYLINELEN);
    [File]::WriteAllText("$Env:TEMP\commits.txt", $COMMITS); # write to file cant pass it on the cmd line
}

#
# Check to ensure we got commits since last version.  If not, prompt user whether or
# not to proceed, since technically the first time this script is used, we don't know
# how to retrieve the latest commits
#
if ($COMMITS -eq "" -or $COMMITS -eq $null) {
    write-host "Commits since the last version or the version tag could not be found"
    $Proceed = read-host -prompt "Proceed anyway? Y[N]"
    if ($Proceed.ToUpper() -eq "N") {
        write-host -ForegroundColor "red" "User cancelled process, exiting"
        exit
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
if ($CURRENTVERSION -eq "") 
{
    if (Test-Path("node_modules"))
    {
        if (Test-Path("node_modules\semver"))
        {
            #
            # Using semver to get next version #
            #
            if (Test-Path("${Env:CODE_HOME}\nodejs\node.exe"))
            {
                if (Test-Path("package.json"))
                {
                    write-host "Using semver to obtain next version number"
                    #
                    # use package.json properties to retrieve current version
                    #
                    $CURRENTVERSION = & $Env:CODE_HOME\nodejs\node -e "console.log(require('./package.json').version);"
                    #
                    # use semver to retrieve next version
                    # Analyze the commits to determine major, minor, patch release
                    #
                    $rlc = New-Object -TypeName CommitAnalyzer
                    $RELEASELEVEL = $rlc.get($COMMITS)
                    #
                    # Get next version
                    #
                    $VERSION = & $Env:CODE_HOME\nodejs\node -e "console.log(require('semver').inc('$CURRENTVERSION', '$RELEASELEVEL'));"
                } 
                else {
                    write-host -ForegroundColor "red" "package.json not found!"
                    exit
                }
            } 
            else {
                write-host -ForegroundColor "red" "Node not found (have you installed Code Package?)"
                exit
            }
        } 
        else {
            write-host -ForegroundColor "red" "Semver not found.  Run 'npm install --save-dev semver'"
            exit
        }
    } 
    #elseif ((Test-Path("AssemblyInfo.cs")) -or (Test-Path("Properties\AssemblyInfo.cs")))
    #{
        #
        # TODO - Parse AssemblyInfo.cs for current version 
        #
    #}
    else 
    {
        $rlh = New-Object -TypeName HistoryFile
        $CURRENTVERSION = $rlh.getVersion($HISTORYFILE, $VERSIONTEXT)
        if (!$CURRENTVERSION.Contains(".")) {
            #
            # Legacy pj versioning
            #
            write-host "Using legacy PJ versioning"
            write-host "The current version is $CURRENTVERSION"
            $VERSION = [System.Int32]::Parse($CURRENTVERSION) + 1
        }
        else {
            #
            # Semantic versioning non-npm project
            #
            write-host "Using non-npm project semantic versioning"
            write-host -ForegroundColor "darkyellow" "Semver not found, run 'npm install -g semver' to automate" `
                                        "semantic versioning of non-NPM projects"
            write-host "The current version is $CURRENTVERSION"
            write-host "You must manually input the new version"
            $VERSION = read-host -prompt "Enter the version #, or C to cancel"
            if ($VERSION.ToUpper() -eq "C") {
                write-host -ForegroundColor "red" "User cancelled process, exiting"
                exit
            }
        }
    }
}

if ($CURRENTVERSION -eq "") {
    write-host -ForegroundColor "red" "Could not determine current version, exiting"
    exit
}

#
# Set branch if empty (not currently used 4/22/2019)
#
if ($BRANCH -eq "") {
    $BRANCH = "trunk"
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
    switch ($Day) 
    {
        "1" { $Day = "1st"; break }
        "2" { $Day = "2nd"; break }
        "3" { $Day = "3rd"; break }
        default { $Day = "${Day}th"; break }
    }
    $TDATE = "$Month $Day, $Year"
}

#
# Output some calculated info to console
#
write-host "Current Branch      : $BRANCH"
write-host "Current Version     : $CURRENTVERSION"
write-host "Next Version        : $VERSION"
write-host "Date                : $TDATE"

#
# Prepare $HISTORYFILE header
#
if ($CURRENTVERSION -ne $VERSION)
{
    write-host "Preparing history file"
    #
    # If history file doesnt exist, create one with the project name as a title
    #
    $HistoryPath = Split-Path "$HISTORYFILE"
    if (!(Test-Path($HistoryPath))) {
        New-Item -ItemType "directory" -Path "$HistoryPath" | Out-Null
    }
    if (!(Test-Path($HISTORYFILE))) {
        New-Item -ItemType "file" -Path "$HISTORYFILE" -Value "$PROJECTNAME`r`n`r`n" | Out-Null
    }
    if (!(Test-Path($HISTORYFILE))) {
        write-host -ForegroundColor "red" "Could not create history file, exiting"
        exit;
    }
    #
    # Touch history file with the latest version info, either update existing, or create 
    # a new one if it doesnt exist
    #
    # Add lines 'version', 'date', then the header content
    #                         
    Add-Content -NoNewline -Path $HISTORYFILE -Value "`r`n"                        #
    Add-Content -NoNewline -Path $HISTORYFILE -Value "$VERSIONTEXT $VERSION`r`n"   # Version x.y.z
    Add-Content -NoNewline -Path $HISTORYFILE -Value "$TDATE`r`n"                  # May 9, 2019
    if (Test-Path($HISTORYHDRFILE)) {
        $HISTORYHDRFILE = Get-Content $HISTORYHDRFILE -Raw 
        Add-Content -NoNewline -Path $HISTORYFILE -Value $HISTORYHDRFILE
    }
    else {   
        write-host -ForegroundColor "darkyellow" " History header template not found"
        Add-Content -NoNewline -Path $HISTORYFILE -Value "`r`n"  
    }                                                      
    Add-Content -NoNewline -Path $HISTORYFILE -Value "`r`n"
    #
    # Format the commit messages before adding to the hostory file
    #
    $COMMITS = $COMMITS.Replace("`n`n", "`r`n`r`n")
    #
    # Replace commit tags with full text (non-scoped)
    #
    # Commit tags should be at the start of the commit message.
    #
    # Examples of commit tags:
    #
    #     feat: add internet explorer support
    #
    $COMMITS = $COMMITS.Replace("build: ", "Build System`r`n`r`n    ")
    $COMMITS = $COMMITS.Replace("chore: ", "Chore`r`n`r`n    ")
    $COMMITS = $COMMITS.Replace("docs: ", "Documentation`r`n`r`n    ")
    $COMMITS = $COMMITS.Replace("feat: ", "Feature`r`n`r`n    ")
    $COMMITS = $COMMITS.Replace("featmin: ", "Feature`r`n`r`n    ")
    $COMMITS = $COMMITS.Replace("fix: ", "Bug Fix`r`n`r`n    ")
    $COMMITS = $COMMITS.Replace("perf: ", "Performance Enhancement`r`n`r`n    ")
    $COMMITS = $COMMITS.Replace("refactor: ", "Code Refactoring`r`n`r`n    ")
    #
    # Replace commit tags with full text (scoped)
    #
    # A tag can be scoped, for example:
    #
    #     fix(footpedal): pressing multiple buttons at same time breaks audio player
    #
    $COMMITS = $COMMITS.Replace("build(", "Build System(")
    $COMMITS = $COMMITS.Replace("chore(", "Chore(")
    $COMMITS = $COMMITS.Replace("docs(", "Documentation(")
    $COMMITS = $COMMITS.Replace("feat(", "Feature(")
    $COMMITS = $COMMITS.Replace("featmin(", "Feature(")
    $COMMITS = $COMMITS.Replace("fix(", "Bug Fix(")
    $COMMITS = $COMMITS.Replace("perf(", "Performance Enhancement(")
    $COMMITS = $COMMITS.Replace("refactor(", "Code Refactoring(")
    #
    # Take any parenthesized scopes, remove the prenthesis and line break the message
    # that follows
    #
    [Match] $match = [Regex]::Match($COMMITS, "[(][a-zA-Z]*[)]\s*[:][ ]");
    while ($match.Success) {
        $NewText = $match.Value.Replace("(", "")
        $NewText = $NewText.Replace(")", "")
        $NewText = $NewText.Replace(": ", "")
        $COMMITS = $COMMITS.Replace($match.Value, ":  $NewText`r`n`r`n    ")
        $match = $match.NextMatch()
    }
    #
    # Typically when writing the commit messages lowercase is used.  Capitalize the first 
    # letter following the commit message tag
    #
    [Match] $match = [Regex]::Match($COMMITS, "[\r\n]{2}\s*[a-z]");
    while ($match.Success) {
        if ($match.Value.Contains("`r`n`r`n")) { # ps regex is buggy on [\r\n]{2}
            $COMMITS = $COMMITS.Replace($match.Value, $match.Value.ToUpper())
        }
        $match = $match.NextMatch()
    }
    #
    # Typically when writing the commit messages periods arent used at the end.  Add one
    # if there isn't
    #
    [Match] $match = [Regex]::Match($COMMITS, "[a-z][^.]\s*$");
    while ($match.Success) {
        $COMMITS = $COMMITS.Replace($match.Value, "${match.Value}.`r`n")
        $match = $match.NextMatch()
    }
    #
    # Use two new lines after new section
    #
    if (!$COMMITS.EndsWith("`r`n`r`n")) {
        $COMMITS = $COMMITS + "`r`n";
    }
    #
    # Perform spell checking (currently the projectoxford has been taken down after the
    # Microsoft deal with the facial rec api)
    #
    #$COMMITS = CheckSpelling $COMMITS $false
    #
    # Write the formatted commits text to $HISTORYFILE
    # Formatted commits are also contained in the temp text file $Env:TEMP\history.txt
    # Replace all newline pairs with cr/nl pairs as SVN will have sent commit comments back
    # with newlines only
    #
    [System.Threading.Thread]::Sleep(500);
    Add-Content $HISTORYFILE $COMMITS
    #
    # Add to changelist for svn check in.  This would be the first file modified so just
    # set changelist equal to history file
    #
    Svn-Changelist-Add $HISTORYFILE
}
else {
    write-host -ForegroundColor "darkyellow" "Version match, not touching history file"
}
#
# Allow manual modifications to history file
#
if ($NOTEPADEDITS -eq "Y") {
    write-host "Edit history file"
    start-process -filepath "notepad" -args $HISTORYFILE -wait
}

#
# Run custom deploy script if specified
#
if ($DEPLOYSCRIPT.Length -gt 0)
{
    if ($SKIPDEPLOYPUSH -ne "Y")
    {
        # Run custom deploy script
        #
        write-host "Running custom deploy script"

        if ($TESTMODE -ne "Y") 
        {
            foreach ($Script in $DEPLOYSCRIPT) 
            {
                if ($Script.EndsWith(".xml")) {
                    Invoke-Expression -Command "$Env:CODE_HOME\ant\bin\ant.bat " `
                            "-logger org.apache.tools.ant.listener.AnsiColorLogger -f $Script"
                }
                elseif ($Script.EndsWith(".ps1")) {
                    Invoke-Expression -Command ".\$Script"
                }
                elseif ($Script.EndsWith(".bat")) {
                    Invoke-Expression -Command "cmd /c $Script"
                }
                else {
                    Invoke-Expression -Command "$Script"
                }
                Check-ExitCode
            }
        }
        else {
            write-host -ForegroundColor "magenta" "   Test mode, skipping deploy script run"
        }
    }
    else {
        write-host -ForegroundColor "darkyellow" "   Skipped running custom deploy script (user specified)"
    }
}

#
# Store location paths depending on publish types
#
$TargetNetLocation = ""
$NpmLocation = ""
$NugetLocation = ""

#
# PJ Installer Release
#
if ($INSTALLERRELEASE -eq "Y") 
{
    $InstallerBuilt = $false

    #
    # Build the installer
    #
    if (![string]::IsNullOrEmpty($INSTALLERSCRIPT) -and (Test-Path($INSTALLERSCRIPT)))
    {
        if ($INSTALLERSCRIPT.Contains(".nsi"))
        {
            # Create dist directory if it doesnt exist
            #
            if (!(Test-Path($PATHTODIST))) {
                write-host "Create dist directory"
                New-Item -Path "$PATHTODIST" -ItemType "directory" | Out-Null
            }
            #
            # replace version in nsi file
            #
            Replace-Version $INSTALLERSCRIPT "`"$CURRENTVERSION`"" "`"$VERSION`""
            #
            # Add to svn changelist for check-in
            #
            Svn-Changelist-Add $INSTALLERSCRIPT
            #
            # Allow manual modifications to $INSTALLERSCRIPT
            #
            if ($NOTEPADEDITS -eq "Y") {
                write-host "Edit installer file"
                start-process -filepath "notepad" -wait -args $INSTALLERSCRIPT
            }
            #
            # Run makensis to create installer
            #
            write-host "Building executable installer"
            Invoke-Expression -Command "$Env:CODE_HOME\nsis\makensis.exe $INSTALLERSCRIPT"
            Check-ExitCode
            $InstallerBuilt = $true
        }
        else {
            write-host -ForegroundColor "red" "Cannot build this installer type ($INSTALLERSCRIPT)"
        }
    }
    
    if ($InstallerBuilt -eq $true)
    {
        $TargetNetLocation = "\\192.168.68.120\d$\softwareimages\$PROJECTNAME\$VERSION"
        #
        # Check if this is an ExtJs build.  ExtJs build will be an installer build, but it will
        # contain both package.json and app.json that will need version updated.  A node_modules
        # directory will exist, so the current version was extracted by node and and next version  
        # was calculated by semver.
        #
        if ((Test-Path("app.json")) -and (Test-Path("package.json")))
        {
            #
            # Replace version in app.json
            #
            Replace-Version "app.json" "version`"[ ]*:[ ]*[`"]$CURRENTVERSION" "version`": `"$VERSION"
            #
            # Add to app.json svn changelist for check-in
            #
            Svn-Changelist-Add "app.json"
            #
            # Allow manual modifications to app.json
            #
            if ($NOTEPADEDITS -eq "Y") {
                write-host "Edit app.json file"
                start-process -filepath "notepad" -args "app.json" -wait
            }
            #
            # Replace version in package.json
            #
            Replace-Version "package.json" "version`"[ ]*:[ ]*[`"]$CURRENTVERSION" "version`": `"$VERSION"
            #
            # Add to package.json svn changelist for check-in
            #
            Svn-Changelist-Add "package.json"
            #
            # Allow manual modifications to package.json
            #
            if ($NOTEPADEDITS -eq "Y") {
                write-host "Edit package.json file"
                start-process -filepath "notepad" -args "package.json" -wait
            }
            #
            # Replace version in package-lock.json
            #
            if (Test-Path("package-lock.json")) 
            {
                Replace-Version "package-lock.json" "version`"[ ]*:[ ]*[`"]$CURRENTVERSION" "version`": `"$VERSION"
                #
                # Add to package.json svn changelist for check-in
                #
                Svn-Changelist-Add "package-lock.json"
            }
        }
        #
        # Check for legacy Deploy.xml script.  The scipt should at least be modified to NOT
        # send the notification email.
        #
        if ($SKIPDEPLOYPUSH -ne "Y")
        {
            # Copy dist dir installer and the history file to target location, and pdf docs to Sharepoint
            #
            if ($TESTMODE -ne "Y") 
            {
                #
                # SoftwareImages Upload
                #
                # Create directory on softwareimages network drive
                # TargetNetLocation is defined above as it is needed for email notification fn as well
                #
                if (!(Test-Path($TargetNetLocation))) {
                    write-host "Create directory $TargetNetLocation"
                    New-Item -Path "$TargetNetLocation" -ItemType "directory" | Out-Null
                    Check-ExitCode
                }
                #
                # Copy all files in 'dist' directory that start with $PROJECTNAME, and the history file
                #
                write-host "Deploying files to $TargetNetLocation"
                Copy-Item "$PATHTODIST\*","$HISTORYFILE" -Destination "$TargetNetLocation"
                Check-ExitCode
                #
                # Sharepoint Upload
                #
                $SharepointServer = 'pjainc.pjvista.com@SSL'
                $SharepointShare = "DavWWWRoot"
                $SharepointDirectory = "Shared Documents\Tech Support\Application Installation and Configuration"
                $SharepointPath = "\\$SharepointServer\$SharepointShare\$SharepointDirectory\$PROJECTNAME\$VERSION"
                #
                # Create directory on sharpoint share
                #
                New-Item -Path "$SharepointPath" -ItemType "directory" | Out-Null
                #
                # Copy all pdf files in 'dist' and 'doc' and 'documentation' directories
                #
                write-host "Deploying pdf documentation to Sharepoint"
                Copy-Item "$PATHTODIST\*.pdf","doc\*.pdf","documentation\*.pdf" -Destination "$SharepointPath"
                Check-ExitCode
            }
            else {
                write-host -ForegroundColor "magenta" "Test mode, skipping basic push to network drive"
            }
        }
        else {
            write-host -ForegroundColor "darkyellow" "Skipped installer push to network drive (user specified)"
        }
        #
        # Send release notification email
        #
        if ($NPMRELEASE -ne "Y" -and $NUGETRELEASE -ne "Y") {
            Send-Notification "$TargetNetLocation" "$NpmLocation" "$NugetLocation"
        }
    }
    else {
        write-host -ForegroundColor "darkyellow" "Installer was not built"
        write-host -ForegroundColor "darkyellow" "Check to ensure createinstall.xml or installer build script path is correct"
        write-host -ForegroundColor "red" "Installer was not built or deployed"
        Svn-Revert
        exit
    }
}

#
# NPM Release
#
if ($NPMRELEASE -eq "Y") 
{
    write-host "Releasing npm package"
    if (Test-Path("package.json"))
    {
        $PublishFailed = $false;
        #
        # replace current version with new version in package.json and package-lock.json
        #
        write-host "Retrieving current version in package.json"
        & npm version --no-git-tag-version $VERSION
        Check-ExitCode
        #
        # A few modules are shared, do scope replacement if this might be one of them
        #
        ((Get-Content -path "package.json" -Raw) -replace '@spmeesseman', '@perryjohnson') | Set-Content -NoNewline -Path "package.json"
        ((Get-Content -path "package.json" -Raw) -replace 'spmeesseman',"$NPMUSER") | Set-Content -NoNewline -Path "package.json"
        if (Test-Path("package-lock.json")) {
            ((Get-Content -path "package-lock.json" -Raw) -replace '@spmeesseman', '@perryjohnson') | Set-Content -NoNewline -Path "package-lock.json"
        }
        #
        # Publish to npm server
        #
        write-host "Publishing npm package to $NPMSERVER"
        if ($TESTMODE -ne "Y") 
        {
            & npm publish --access public --registry $NPMSERVER
            Check-ExitCode
        }
        else 
        {
            write-host -ForegroundColor "magenta" "   Test mode, performing publish dry run only"
            & npm publish --access public --registry $NPMSERVER --dry-run
            write-host -ForegroundColor "magenta" "   Test mode, dry run publish finished"
        }
        #
        # A few modules are shared, re-do scope replacement if this might be one of them
        #
        ((Get-Content -path "package.json" -Raw) -replace '@perryjohnson', '@spmeesseman') | Set-Content -NoNewline -Path "package.json"
        ((Get-Content -path "package.json" -Raw) -replace "$NPMUSER","spmeesseman") | Set-Content -NoNewline -Path "package.json"
        #
        # Add package.json version changes to changelist for check in to SVN
        #
        Svn-Changelist-Add "package.json"
        #
        # Add package-lock.json version changes to changelist for check in to SVN
        #
        if (Test-Path("package-lock.json")) 
        {
            ((Get-Content -path "package-lock.json" -Raw) -replace '@perryjohnson', '@spmeesseman') | Set-Content -NoNewline -Path "package-lock.json"
            #
            # Add package-lock.json version changes to changelist for check in to SVN
            #
            Svn-Changelist-Add "package-lock.json"
        }
        if (!$PublishFailed) {
            #
            # Release notification email
            #
            $NpmLocation = "$NPMSERVER/" + '@perryjohnson/' + "$PROJECTNAME"
            if ($NUGETRELEASE -ne "Y") {
                Send-Notification "$TargetNetLocation" "$NpmLocation" "$NugetLocation"
            }
        }
        else {
            Svn-Revert
            exit
        }
    }
    else {
        write-host -ForegroundColor "darkyellow" "Could not find package.json"
    }
}

#
# TODO - Nuget Release
#
if ($NUGETRELEASE -eq "Y") 
{
    write-host "Releasing nuget package"
    #
    # TODO
    #
    #
    # Send release notification email
    #
    $NugetLocation = "$NUGETSERVER/$PROJECTNAME"
    Send-Notification "$TargetNetLocation" "$NpmLocation" "$NugetLocation"
}

#
# Change dircetory to svn root that contains the .svn folder to isse SVN commands
#
if (![string]::IsNullOrEmpty($PATHTOMAINROOT)) {
    set-location $PATHTOMAINROOT
}

if (Test-Path(".svn"))
{
    #$SVNCHANGELIST = $SVNCHANGELIST.Trim()
    #
    # Check version changes in to SVN if there's any touched files
    #
    if ($SVNCHANGELIST -ne "") 
    {
        if ($TESTMODE -ne "Y") 
        {
            write-host "Committing touched files to version control"
            write-host "   $SVNCHANGELIST"
            #
            # Call svn commit
            #
            Invoke-Expression -Command "svn commit $SVNCHANGELIST -m `"chore(release): $VERSION [skip ci]`""
            Check-ExitCode
        }
        else 
        {
            if ($TESTMODESVNREVERT -eq "Y") {
                Svn-Revert
            }
            if ($TESTMODE -eq "Y") {
                write-host -ForegroundColor "magenta" "   Test mode, skipping touched file commit"  
            }
        }
    }

    #
    # Create version tag
    #
    # If this is a sub-project within a project, do not tag
    #
    if ($PATHTOMAINROOT -eq $PATHTOROOT -or [string]::IsNullOrEmpty($PATHTOMAINROOT))
    {
        write-host "Tagging version at $TagLocation"
        $TagLocation = "${SVNPROTOCOL}://$SVNSERVER/$SVNREPO/$PROJECTNAME/tags/v$VERSION"
        if ($TESTMODE -ne "Y") 
        {
            $TrunkLocation = "${SVNPROTOCOL}://$SVNSERVER/$SVNREPO/$PROJECTNAME/trunk"
            #
            # Call svn copy to create 'tag'
            #
            & svn copy "$TrunkLocation" "$TagLocation" -m "chore(release): tag version $VERSION [skip ci]"
            Check-ExitCode
        }
        else {
            write-host -ForegroundColor "magenta" "   Test mode, skipping create version tag"
        }
    }
    else {
        write-host -ForegroundColor "darkyellow" "   This is a sub-project, skipping version tag"
    }
}
else {
    write-host -ForegroundColor "red" "Could not find .svn folder, skipping commit and version tag"
}

if ($TESTMODE -eq "Y") {
    write-host "Tests completed"
    if ($TESTMODESVNREVERT -ne "Y") {
        write-host -ForegroundColor "magenta" "   You should manually revert any auto-touched files via SCM"
    }
}

write-host "Completed"
write-host -ForegroundColor "darkgreen" "Finished successfully"

exit
