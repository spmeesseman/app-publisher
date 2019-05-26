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
# ------------------------------------------------------------------------------------------
# ------------------------------------------------------------------------------------------
# Script configuration
# Modify the below variables per project
# ------------------------------------------------------------------------------------------
# ------------------------------------------------------------------------------------------
$APPPUBLISHERVERSION = "1.0.0",
#
# The build command(s) to run once versions have been updated in version files (i.e. package.json,
# history.txt, assemblyinfo.cs, etc)
#
$BUILDCOMMAND = @(),
#
# Name of the project.  This must macth throughout the build files and the SVN project name
#
$PROJECTNAME = "",
#
# The location of this changelog file, can be a relative or full path.
#
$CHANGELOGFILE = "CHANGELOG.md",
#
# The deploy command(s) to run once internal deployment has been completed
#
$DEPLOYCOMMAND = @(),
#
#
#
$EMAILNOTIFICATION = "Y",
#
# The git repo urls
#
$GITREPO = "",
$GITHOMEPAGE = "",
$GITBUGS = "",
#
#
#
$GITHUBRELEASE = "N",
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
# Set to Y if a custom specified build command builds the installer
#
$INSTALLERSKIPBUILD = "N",
#
# Use the contents of the PATHTODIST directory for the release files, dont build an
# installer.
#
$INSTALLEREXDIST = "N",
#
# Interactive (prompts for version after extracting what we think should be the next 
# version)
#
$INTERACTIVE = "N",
#
#
#
$TEXTEDITOR = "notepad++",
#
#
#
$NPMREGISTRY = "https://registry.npmjs.org",
#
# To build the npm release, set this flag to "Y"
#
$NPMRELEASE = "N",
#
# The scope of the npm package, empty if none
#
$NPMSCOPE = "",
#
# To build the nuget release, set this flag to "Y"
#
$NUGETRELEASE = "N",
#
#
#
$NUGETREGISTRY = "https://nuget.development.pjats.com/nuget",
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
# The build command(s) to after the internal builds have been completed
#
$POSTBUILDCOMMAND = @(),
#
#
#
$REPO = "",
$REPOTYPE = "svn",
$REPOBRANCH = "trunk",
$BUGS = "",
$HOMEPAGE = "",
#
# Set by internal application
#
$RUN = 1,
$SKIPCOMMIT = "N",
#
# Skip uploading installer to network release folder (primarily used for releasing
# from hom office where two datacenters cannot be reached at the same time, in this
# case the installer files are manually copied)
#
$SKIPDEPLOYPUSH = "Y",
#
# The svn urls
#
$SVNREPO = "",
$SVNHOMEPAGE = "",
$SVNBUGS = "",
#
# Whether or not to tag the new version in SVN.  Default is Yes.
#
$VCTAG = "Y",
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
$TESTMODEVCREVERT = "Y",
$TESTEMAILRECIP = "smeesseman@pjats.com",
#
# The text tag to use in the history file for preceding the version number.  It should 
# be one of the following:
#
#     1. Version
#     2. Build
#     3. Release
#
$VERSIONTEXT = "Version",
#
# Whether or not to write stdout to log file.  Default is Yes
#
$WRITELOG = "N"
#
# ------------------------------------------------------------------------------------------
# ------------------------------------------------------------------------------------------
# End script configuration
# ------------------------------------------------------------------------------------------
# ------------------------------------------------------------------------------------------
)

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
#     Svn
#     HistoryFile
#     AnalyzeCommits
#

class Svn
{
    [array]getCommits($Repo, $Branch)
    {
        $comments = @()

        #
        # Get tags
        #
        Log-Message "Retrieving most recent tag"
        $xml = svn log --xml "$Repo/tags" --verbose --limit 50
        $path = $null

        #
        # Parse log response
        #
        Log-Message("Parsing response from SVN");
        try {
            $path = (([Xml] ($xml)).Log.LogEntry.Paths.Path |
            Where-Object { $_.action -eq 'A' -and $_.kind -eq 'dir' -and $_.InnerText -like '*tags/v[1-9]*'} |
            Select-Object -Property @(
                @{N='date'; E={$_.ParentNode.ParentNode.Date}},
                @{N='path'; E={$_.InnerText}} )|
            Sort-Object Date -Descending | Select-Object -First 1).path
        }
        catch {
            Log-Message "Response could not be parsed, invalid module, no commits found, or no version tag exists" "red"
            return $comments
        }

        $rev = (([Xml]($xml)).Log.LogEntry | Where-Object { $_.revision -ne ''} | Select-Object -First 1).revision

        Log-Message "   Found version tag:"
        Log-Message "      Rev     : $rev"
        Log-Message "      Path    : $path"

        #
        # Retrieve commits since last version tag
        #
        Log-Message "Retrieving commits since last version"
        $xml = svn log --xml "$Repo/$Branch" --verbose --limit 50 -r ${rev}:HEAD

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

        #
        # Sort comments array if not formatted text for history file
        #
        $comments = $comments | Sort -Unique
        
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
            if($null -ne $msg -and $msg -ne "")
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
            exit 101;
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
            exit 101;
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
                Log-Message "   Last section could not be found (1), exit" "red"
                exit 101
            }

            $iIndex2 = $szContents.IndexOf("`n", $iIndex2 + 1)
            #
            # Make sure the newline was found
            #
            if ($iIndex2 -eq -1)
            {
                Log-Message "   Last section could not be found (2), exit" "red"
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
            Log-Message "   Last section could not be found, exit" "red"
            exit 101
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
                    #Log-Message($iIndex1);
                    #Log-Message($iIndex2);
                    #Log-Message($szContents.Substring($iIndex1, $iIndex2 - $iIndex1));
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
            Log-Message("   Found version $curversion")
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
$ClsSvn = New-Object -TypeName Svn


#************************************************************************#

#####  #   #  #   #  #####  #####  ###  #####  #   #  #####
#      #   #  ##  #  #        #     #   #   #  ##  #  #    
####   #   #  # # #  #        #     #   #   #  # # #  #####
#      #   #  #  ##  #        #     #   #   #  #  ##      #
#      #####  #   #  #####    #    ###  #####  #   #  #####

#************************************************************************#

function Log-Message($msg, $color)
{
    if ($color) {
        write-host -ForegroundColor $color $msg
    }
    else {
        write-host $msg
    }

    if ($WRITELOG -eq "Y") 
    {
         # Get current date time
        $CurrentDateTime = Get-Date -format "yyyy\/MM\/dd HH:mm:ss";
        # Construct complete message
        $FormattedMessage = "$CurrentDateTime $msg";
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
    # encoding="plain" (from ant)   ps cmd: -Encoding ASCII
    $EMAILBODY = $ClsHistoryFile.getHistory($PROJECTNAME, $VERSION, 1, $VERSIONTEXT, $false, $HISTORYFILE, $null, $targetloc, $npmloc, $nugetloc);
    Log-Message "Sending release notification email"
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

function Vc-Revert()
{
    if (![string]::IsNullOrEmpty($VCCHANGELIST)) 
    {
        Log-Message "Removing new files / reverting touched files under version control"
        Log-Message "Stored Commit List: $VCCHANGELIST"
        Log-Message "Stored Add List   : $VCCHANGELISTADD"
        Log-Message "Stored Remove List: $VCCHANGELISTADD"

        $VcRevertList = ""
        $VcRevertListParts = $VCCHANGELISTRMV.Trim().Split(' ')

        for ($i = 0; $i -lt $VcRevertListParts.Length; $i++)
        {
            if (Test-Path($VcRevertListParts[$i].Replace("`"", ""))) 
            {
                Log-Message "Deleting unversioned $($VcRevertListParts[$i]) from fs"
                Remove-Item -path $VcRevertListParts[$i].Replace("`"", "") -Recurse | Out-Null
            }
        }

        $VcRevertList = ""
        $VcRevertListParts = $VCCHANGELISTADD.Trim().Split(' ')

        for ($i = 0; $i -lt $VcRevertListParts.Length; $i++)
        {
            if (Test-Path($VcRevertListParts[$i].Replace("`"", ""))) 
            {
                Log-Message "Deleting unversioned $($VcRevertListParts[$i]) from fs"
                Remove-Item -path $VcRevertListParts[$i].Replace("`"", "") -Recurse | Out-Null
            }
        }

        $VcRevertList = ""
        $VcRevertListParts = $VCCHANGELIST.Trim().Split(' ')

        if ($REPOTYPE -eq "svn")
        {
            for ($i = 0; $i -lt $VcRevertListParts.Length; $i++)
            {
                if ($VcRevertListParts[$i] -eq "") {
                    continue;
                }
                if (Test-Path($VcRevertListParts[$i].Replace("`"", "")))
                {
                    & svn info --no-newline --show-item kind $VcRevertListParts[$i]
                    if ($LASTEXITCODE -eq 0) 
                    {
                        Log-Message " - Adding versioned $($VcRevertListParts[$i]) to revert list"
                        $VcRevertList = "$VcRevertList $($VcRevertListParts[$i])"
                    }
                    elseif (Test-Path($VcRevertListParts[$i].Replace("`"", ""))) # delete unversioned file 
                    {
                        Log-Message " - Deleting unversioned $($VcRevertListParts[$i]) from fs"
                        Remove-Item -path $VcRevertListParts[$i].Replace("`"", "") -Recurse | Out-Null
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
        elseif ($REPOTYPE -eq "git") 
        {
            for ($i = 0; $i -lt $VcRevertListParts.Length; $i++)
            {
                if ($VcRevertListParts[$i] -eq "") {
                    continue;
                }
                if (Test-Path($VcRevertListParts[$i].Replace("`"", "")))
                {
                    & git ls-files --error-unmatch $VcRevertListParts[$i]
                    if ($LASTEXITCODE -eq 0) {
                        Log-Message " - Adding versioned $($VcRevertListParts[$i]) to revert list"
                        $VcRevertList = "$VcRevertList $($VcRevertListParts[$i])"
                    }
                    else { # delete unversioned file
                        Log-Message "Deleting unversioned $($VcRevertListParts[$i]) from fs"
                        Remove-Item -path $VcRevertListParts[$i].Replace("`"", "") -Recurse | Out-Null
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
            # if (![string]::IsNullOrEmpty($VCCHANGELIST)) 
            # {
            #     Log-Message "Versioned List:  $VCCHANGELIST"
            #     #Invoke-Expression -Command "git stash push --keep-index --include-untracked -- $VCCHANGELIST"
            #     Invoke-Expression -Command "git stash push --include-untracked"
            #     Check-ExitCode
            #     Invoke-Expression -Command " git stash drop"
            #     Check-ExitCode
            # }
            # else {
            #     Log-Message "0 versioned files to revert"
            # }
        }
    }
}

function Check-ExitCode($ExitOnError = $false)
{
    #
    # Check script error code, 0 is success
    #
    if ($?) {
        Log-Message "Success" "darkgreen"
    }
    else {
        Log-Message "Failure" "red"
        if ($ExitOnError -eq $true) {
            Vc-Revert
            exit
        }
    }
}

function Check-ExitCodeNative($ExitOnError = $false)
{
    #
    # Check script error code, 0 is success
    #
    if ($LASTEXITCODE -eq 0) {
        Log-Message "Success" "darkgreen"
    }
    else {
        Log-Message "Failure" "red"
        if ($ExitOnError -eq $true) {
            Vc-Revert
            exit
        }
    }
}

function Replace-Version($File, $Old, $New)
{
    Log-Message "Write new version $VERSION to $File"
    ((Get-Content -path $File -Raw) -replace "$Old", "$New") | Set-Content -NoNewline -Path $File
    Check-ExitCode
}

function Run-Scripts($ScriptType, $Scripts, $ExitOnError, $RunInTestMode = $false)
{
    if ($Scripts.Length -gt 0 -and !$script:BuildCmdsRun.Contains($ScriptType))
    {
        # Run custom script
        #
        Log-Message "Running custom $ScriptType script(s)"

        if ($TESTMODE -ne "Y" -or $RunInTestMode) 
        {
            foreach ($Script in $Scripts) 
            {
                Invoke-Expression -Command "$Script"
                Check-ExitCode $ExitOnError
            }
        }
        else {
            Log-Message "   Test mode, skipping script run" "magenta"
        }

        $script:BuildCmdsRun += $ScriptType
    }
}


function Prepare-ExtJsBuild()
{
    #
    # Replace version in app.json
    #
    Replace-Version "app.json" "version`"[ ]*:[ ]*[`"]$CURRENTVERSION" "version`": `"$VERSION"
    #
    # Add to app.json vc changelist for check-in
    #
    Vc-Changelist-Add "app.json"
    #
    # Allow manual modifications to app.json
    #
    Edit-File "app.json"
    #
    # Replace version in package.json - technically sencha cmd desnt need this updated, but
    # we still keep in sync with app.json
    #
    Replace-Version "package.json" "version`"[ ]*:[ ]*[`"]$CURRENTVERSION" "version`": `"$VERSION"
    #
    # Add to package.json vc changelist for check-in
    #
    Vc-Changelist-Add "package.json"
    #
    # Allow manual modifications to package.json
    #
    Edit-File "package.json"
    #
    # Replace version in package-lock.json
    #
    if (Test-Path("package-lock.json")) 
    {
        Replace-Version "package-lock.json" "version`"[ ]*:[ ]*[`"]$CURRENTVERSION" "version`": `"$VERSION"
        #
        # Add to package.json vc changelist for check-in
        #
        Vc-Changelist-Add "package-lock.json"
    }
}


function Prepare-DotNetBuild($AssemblyInfoLocation)
{
    $TMPVERSION = $VERSION.ToString()
    $TMPCURRENTVERSION = $CURRENTVERSION.ToString()
    #
    # Manipulate version if necessary
    #
    if (!$TMPVERSION.Contains("."))
    {
        #
        # TODO - translate block version to a real maj.min.patch version
        #
        Log-Message "Could not replace version in assemblyinfo.cs, change manually" "red"
    }
    #
    # TODO - Replace version in app.json
    #
    #Replace-Version $AssemblyInfoLocation "version`"[ ]*:[ ]*[`"]$TMPCURRENTVERSION" "version`": `"$TMPVERSION"
    #
    # Add to app.json vc changelist for check-in
    #
    Vc-Changelist-Add $AssemblyInfoLocation
    #
    # Allow manual modifications to assembly file
    #
    Edit-File $AssemblyInfoLocation
}

$DefaultRepo = ""
$DefaultRepoType = ""
$DefaultHomePage = ""
$DefaultBugs = ""
$DefaultName = ""

function Prepare-PackageJson()
{
    #
    # Replace current version with new version in package.json and package-lock.json
    # 5/25/19 - Use regext text replacement after npm version command, sencha packages will contain 
    # two version tags, on for the main package.json field, and one in the sencha object definition, we 
    # want to replace them both
    #
    Log-Message "Setting new version $VERSION in package.json"
    & npm version --no-git-tag-version --allow-same-version $VERSION
    Check-ExitCodeNative
    Replace-Version "package.json" "version`"[ ]*:[ ]*[`"]$CURRENTVERSION" "version`": `"$VERSION"
    #
    # Save original values
    #
    Log-Message "Saving repository in package.json"
    $script:DefaultRepo = & app-publisher-json -f package.json repository.url
    Check-ExitCodeNative
    Log-Message "Repository: $DefaultRepo"
    Log-Message "Saving repository type in package.json"
    $script:DefaultRepoType = & app-publisher-json -f package.json repository.type
    Check-ExitCodeNative
    Log-Message "Repository Type: $DefaultRepoType"
    Log-Message "Saving homepage in package.json"
    $script:DefaultHomePage = & app-publisher-json -f package.json homepage
    Check-ExitCodeNative
    Log-Message "Homepage: $DefaultHomePage"
    Log-Message "Saving bugs page in package.json"
    $script:DefaultBugs = & app-publisher-json -f package.json bugs.url
    Check-ExitCodeNative
    Log-Message "Bugs page: $DefaultBugs"
    Log-Message "Saving package name in package.json"
    $script:DefaultName = & app-publisher-json -f package.json name
    Check-ExitCodeNative
    Log-Message "Package name: $DefaultName"
    #
    # Set repo
    #
    if ($REPOTYPE -eq "svn")
    {
        Log-Message "Setting repository in package.json: $REPO/$REPOBRANCH"
        & app-publisher-json -I -4 -f package.json -e "this.repository.url='$REPO/$REPOBRANCH'"
    }
    else {
        Log-Message "Setting repository in package.json: $REPO"
        & app-publisher-json -I -4 -f package.json -e "this.repository.url='$REPO'"
    }
    Check-ExitCodeNative
    #
    # Set repo type
    #
    Log-Message "Setting repository type in package.json: $REPOTYPE"
    & app-publisher-json -I -4 -f package.json -e "this.repository.type='$REPOTYPE'"
    Check-ExitCodeNative
    #
    # Set bugs
    #
    Log-Message "Setting bugs page in package.json: $BUGS"
    & app-publisher-json -I -4 -f package.json -e "this.bugs.url='$BUGS'"
    Check-ExitCodeNative
    #
    # Set homepage 
    #
    Log-Message "Setting homepage in package.json: $HOMEPAGE"
    & app-publisher-json -I -4 -f package.json -e "this.homepage='$HOMEPAGE'"
    Check-ExitCodeNative
    #
    # Scope/name - package.json
    #
    if (![string]::IsNullOrEmpty($NPMSCOPE))
    {
        Log-Message "Setting package name in package.json: $NPMSCOPE/$PROJECTNAME"
        & app-publisher-json -I -4 -f package.json -e "this.name='$NPMSCOPE/$PROJECTNAME'"
        Check-ExitCodeNative
        #
        # Scope - package-lock.json
        #
        if (Test-Path("package-lock.json")) 
        {
            Log-Message "Setting package name in package-lock.json: $NPMSCOPE/$PROJECTNAME"
            & app-publisher-json -I -4 -f package-lock.json -e "this.name='$NPMSCOPE/$PROJECTNAME'"
            Check-ExitCodeNative
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
    Vc-Changelist-Add "package.json"
    Edit-File "package.json"
    if (Test-Path("package-lock.json")) 
    {
        # The json utility will output line feed only, replace with windows stle crlf
        #
        #Log-Message "Set windows line feeds in package-lock.json"
        #((Get-Content -path "package-lock.json" -Raw) -replace "`n", "`r`n") | Set-Content -NoNewline -Path "package-lock.json"
        #Check-ExitCode
        Vc-Changelist-Add "package-lock.json"
        Edit-File "package-lock.json"
    }
}


function Restore-PackageJson()
{
    #
    # Set repo
    #
    Log-Message "Re-setting default repository in package.json: $DefaultRepo"
    & app-publisher-json -I -4 -f package.json -e "this.repository.url='$DefaultRepo'"
    Check-ExitCodeNative
    #
    # Set repo type
    #
    Log-Message "Re-setting default repository type in package.json: $DefaultRepoType"
    & app-publisher-json -I -4 -f package.json -e "this.repository.type='$DefaultRepoType'"
    Check-ExitCodeNative
    #
    # Set bugs
    #
    Log-Message "Re-setting default bugs page in package.json: $DefaultBugs"
    & app-publisher-json -I -4 -f package.json -e "this.bugs.url='$DefaultBugs'"
    Check-ExitCodeNative
    #
    # Set homepage 
    #
    Log-Message "Re-setting default homepage in package.json: $DefaultHomePage"
    & app-publisher-json -I -4 -f package.json -e "this.homepage='$DefaultHomePage'"
    Check-ExitCodeNative
    #
    # Scope/name - package.json
    #
    if (![string]::IsNullOrEmpty($NPMSCOPE))
    {
        Log-Message "Re-setting default package name in package.json: $DefaultName"
        & app-publisher-json -I -4 -f package.json -e "this.name='$DefaultName'"
        Check-ExitCodeNative
        #
        # Scope - package-lock.json
        #
        if (Test-Path("package-lock.json")) 
        {
            Log-Message "Re-scoping default package name in package-lock.json: $DefaultName"
            & app-publisher-json -I -4 -f package-lock.json -e "this.name='$DefaultName'"
            Check-ExitCodeNative
            #
            # The json utility will output line feed only, replace with windows stle crlf
            #
            #Log-Message "Set windows line feeds in package-lock.json"
            #((Get-Content -path "package-lock.json" -Raw) -replace "`n", "`r`n") | Set-Content -NoNewline -Path "package-lock.json"
            #Check-ExitCode
        }
    }
    #
    # The json utility will output line feed only, replace with windows stle crlf
    #
    #Log-Message "Set windows line feeds in package.json"
    #((Get-Content -path "package.json" -Raw) -replace "`n", "`r`n") | Set-Content -NoNewline -Path "package.json"
    #Check-ExitCode
}

$FirstEditFileDone = $false

function Edit-File($File, $SeekToEnd = $false)
{
    if (![string]::IsNullOrEmpty($File) -and (Test-Path($File)) -and !$VersionFilesEdited.Contains($File))
    {
        $script:VersionFilesEdited += $File

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
            #if ($CodeProcess -ne $null) {
            #    $Tmp = $WSShell.AppActivate($CodeProcess.Id) # Set to variable to avoid cmdlet stdout
            #}
            if ($FirstEditFileDone -eq $false) # -and $INTERACTIVE -eq "Y")
            {
                $CodeProcess = Get-Process "Code" | Where-Object {$_.mainWindowTitle}
                if ($CodeProcess -ne $null) {
                    $Tmp = $WSShell.AppActivate($CodeProcess.Id)
                    $Tmp = $WSShell.AppActivate($TextEditorProcess.Id)
                    $WSShell.sendkeys("{END}");
                }
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
            Wait-Process -Id $TextEditorProcess.Id
        }
    }
}


#***************************************************************************#

#####  #####  #####  ###  ##### #####     #####  #   #  #####  #####  #   #
#      #      #   #   #   #   #   #       #      ##  #    #    #   #   # #
#####  #      ####    #   #####   #       ####   # # #    #    ####     #
    #  #      #  #    #   #       #       #      #  ##    #    #  #     #
#####  #####  #   #  ###  #       #       #####  #   #    #    #   #    #

#***************************************************************************#

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
# to 3 times if installerRelease, npmRelease, and nugetRelease command line
# params are all set to "Y"
#
$BuildCmdsRun = @()
$VersionFilesEdited = @()

#
# Set location to root
#
set-location -Path $PATHTOROOT
$CWD = Get-Location
Log-Message "----------------------------------------------------------------" "darkblue"
Log-Message " App Publisher" "darkblue"
Log-Message "   Version   : $APPPUBLISHERVERSION" "cyan"
Log-Message "   Author    : Scott Meesseman" "cyan"
Log-Message "   Directory : $CWD" "cyan"
Log-Message "----------------------------------------------------------------" "darkblue"

#
# Write project specific properties
#
Log-Message "Project specific script configuration:"
Log-Message "   Project          : $PROJECTNAME"
Log-Message "   Path to root     : $PATHTOROOT"
Log-Message "   Path to main root: $PATHTOMAINROOT"
Log-Message "   Path pre root    : $PATHPREROOT"
Log-Message "   VC Repo          : $REPO"
Log-Message "   VC Branch        : $REPOBRANCH"
Log-Message "   SVN tag          : $VCTAG"
Log-Message "   Bugs Page        : $BUGS"
Log-Message "   Home Page        : $HOMEPAGE"
Log-Message "   History file     : $HISTORYFILE"
Log-Message "   History file line: $HISTORYLINELEN"
Log-Message "   History hdr file : $HISTORYHDRFILE"
Log-Message "   Version text     : $VERSIONTEXT"
Log-Message "   Is Install releas: $INSTALLERRELEASE"
Log-Message "   Installer script : $INSTALLERSCRIPT"
Log-Message "   Is NPM release   : $NPMRELEASE"
Log-Message "   NPM registry     : $NPMREGISTRY"
Log-Message "   NPM scope        : $NPMSCOPE"
Log-Message "   Is Nuget release : $NUGETRELEASE"
Log-Message "   Build cmd        : $BUILDCOMMAND"
Log-Message "   Post Build cmd   : $POSTBUILDCOMMAND"
Log-Message "   Deploy cmd       : $DEPLOYCOMMAND"
Log-Message "   Skip deploy/push : $SKIPDEPLOYPUSH"
Log-Message "   Text editor      : $TEXTEDITOR"
Log-Message "   Is interactive   : $INTERACTIVE"
Log-Message "   Is test mode     : $TESTMODE"
Log-Message "   Test email       : $TESTEMAILRECIP"

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
# Must have code-package installed to run this script
#
if (!(Test-Path($Env:CODE_HOME))) {
    Log-Message "Code Package must be installed to run this script" "red"
    Log-Message "Install Code Package from softwareimages\code-package\x.x.x" "red"
    exit 1
}

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
            Log-Message "Text editor not found" "red"
            exit 1
        }
    }
}

#
# Convert any Y/N vars to upper case and check validity
#
if (![string]::IsNullOrEmpty($TESTMODE)) {
    $TESTMODE = $TESTMODE.ToUpper()
    if ($TESTMODE -ne "Y" -and $TESTMODE -ne "N") {
        Log-Message "Invalid value specified for testMode, accepted values are y/n/Y/N" "red"
        exit 1
    }
}
if (![string]::IsNullOrEmpty($INSTALLERRELEASE)) {
    $INSTALLERRELEASE = $INSTALLERRELEASE.ToUpper()
    if ($INSTALLERRELEASE -ne "Y" -and $INSTALLERRELEASE -ne "N") {
        Log-Message "Invalid value specified for installerRelease, accepted values are y/n/Y/N" "red"
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
}
if (![string]::IsNullOrEmpty($SKIPDEPLOYPUSH)) {
    $SKIPDEPLOYPUSH = $SKIPDEPLOYPUSH.ToUpper()
    if ($SKIPDEPLOYPUSH -ne "Y" -and $SKIPDEPLOYPUSH -ne "N") {
        Log-Message "Invalid value specified for skipDeployPush, accepted values are y/n/Y/N" "red"
        exit 1
    }
}
if (![string]::IsNullOrEmpty($TESTMODEVCREVERT)) {
    $TESTMODEVCREVERT = $TESTMODEVCREVERT.ToUpper()
    if ($TESTMODEVCREVERT -ne "Y" -and $TESTMODEVCREVERT -ne "N") {
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
# Check valid params
#
if (![string]::IsNullOrEmpty($PATHTOMAINROOT) -and [string]::IsNullOrEmpty($PATHPREROOT)) {
    Log-Message "pathPreRoot must be specified with pathToMainRoot" "red"
    exit 1
}

if (![string]::IsNullOrEmpty($PATHPREROOT) -and [string]::IsNullOrEmpty($PATHTOMAINROOT)) {
    Log-Message "pathToMainRoot must be specified with pathPreRoot" "red"
    exit 1
}

if ($INSTALLERRELEASE -eq "Y" -and [string]::IsNullOrEmpty($PATHTODIST)) {
    Log-Message "pathToDist must be specified for installer build" "red"
    exit 1
}

#
# Check installer script
#
if ($INSTALLERRELEASE -eq "Y" -and $INSTALLEREXDIST -ne "Y") 
{
    if ([string]::IsNullOrEmpty($INSTALLERSCRIPT)) {
        Log-Message "installerScript must be specified for installer build" "red"
        exit 1
    }
    $ScriptParts = $INSTALLERSCRIPT.Split(' ');
    if (!(Test-Path($ScriptParts[0]))) {
        Log-Message "Defined INSTALLERSCRIPT not found" "red"
        exit 1
    }
    if ($INSTALLERSCRIPT.Contains(".nsi"))
    {
        if (!(Test-Path("$Env:CODE_HOME\nsis"))) {
            Log-Message "The NSIS package must be installed to run this script" "red"
            Log-Message "Re-run the code-package installer and add the NSIS package" "red"
            exit 1
        }
    }
}

#
# Set up repo and other pacjkage.json properties
#
if ($REPOTYPE -eq "svn" -or [string]::IsNullOrEmpty($REPOTYPE))
{
    $REPOTYPE = "svn"
    if ([string]::IsNullOrEmpty($REPO))
    {
        if (![string]::IsNullOrEmpty($SVNREPO)) {
            $REPO = $SVNREPO
        }
        else {
            $REPO = "https://svn.development.pjats.com/repos/pja/" + $PROJECTNAME + "/$REPOBRANCH"
        }
    }
    if ([string]::IsNullOrEmpty($BUGS))
    {
        if (![string]::IsNullOrEmpty($SVNBUGS)) {
            $BUGS = $SVNBUGS
        }
        else {
            $BUGS = "https://projects.development.pjats.com/" + $PROJECTNAME + "/ticket/1"
        }
    }
    if ([string]::IsNullOrEmpty($HOMEPAGE))
    {
        if (![string]::IsNullOrEmpty($SVNHOMEPAGE)) {
            $HOMEPAGE = $SVNHOMEPAGE
        }
        else {
            $HOMEPAGE = "https://projects.development.pjats.com/" + $PROJECTNAME
        }
    }
    if ([string]::IsNullOrEmpty($REPOBRANCH)) {
        $REPOBRANCH = "trunk"
    }
    #
    $SVNREPO = $REPO
    $SVNHOMEPAGE= $HOMEPAGE
    $SVNBUGS = $BUGS
    #
    if ($REPOBRANCH -ne "trunk" -and !$REPOBRANCH.StartsWith("branches")) {
        Log-Message "Invalid repository configuration - no branch specified" "red"
        exit 1
    }

}
elseif ($REPOTYPE -eq "git")
{
    if ([string]::IsNullOrEmpty($REPO))
    {
        if (![string]::IsNullOrEmpty($GITREPO)) {
            $REPO = $GITREPO
        }
        else {
            $REPO = "https://github.com/spmeesseman/" + $PROJECTNAME + ".git"
        }
    }
    if ([string]::IsNullOrEmpty($BUGS))
    {
        if (![string]::IsNullOrEmpty($GITBUGS)) {
            $BUGS = $GITBUGS
        }
        else {
            $BUGS = "https://github.com/spmeesseman/" + $PROJECTNAME + "/issues"
        }
    }
    if ([string]::IsNullOrEmpty($HOMEPAGE))
    {
        if (![string]::IsNullOrEmpty($GITHOMEPAGE)) {
            $HOMEPAGE = $GITHOMEPAGE
        }
        else {
            $HOMEPAGE = "https://github.com/spmeesseman/" + $PROJECTNAME
        }
    }
    $GITREPO = $REPO
    $GITHOMEPAGE= $HOMEPAGE
    $GITBUGS = $BUGS
}
else 
{
    Log-Message "Invalid repository configuration" "red"
    exit 1
}

#
# Convert commands to arrays, if string
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
    Log-Message "Retrieve current version and calculate next version number"

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
                    Log-Message "Using semver to obtain next version number"
                    #
                    # use package.json properties to retrieve current version
                    #
                    $CURRENTVERSION = & $Env:CODE_HOME\nodejs\node -e "console.log(require('./package.json').version);"
                    #
                    # use semver to retrieve next version
                    # Analyze the commits to determine major, minor, patch release
                    #
                    $RELEASELEVEL = $ClsCommitAnalyzer.get($COMMITS)
                    #
                    # Get next version
                    #
                    if ($RUN -eq 1 -or $TESTMODE -eq "Y") {
                        $VERSION = & $Env:CODE_HOME\nodejs\node -e "console.log(require('semver').inc('$CURRENTVERSION', '$RELEASELEVEL'));"
                    }
                    else {
                        $VERSION = $CURRENTVERSION
                    }
                } 
                else {
                    Log-Message "package.json not found!" "red"
                    exit
                }
            } 
            else {
                Log-Message "Node not found (have you installed Code Package?)" "red"
                exit
            }
        } 
        else {
            Log-Message "Semver not found.  Run 'npm install --save-dev semver'" "red"
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
        $CURRENTVERSION = $ClsHistoryFile.getVersion($HISTORYFILE, $VERSIONTEXT)
        if (!$CURRENTVERSION.Contains(".")) {
            #
            # Legacy pj versioning
            #
            Log-Message "Using legacy PJ versioning"
            if ($RUN -eq 1 -or $TESTMODE -eq "Y") {
                $VERSION = [System.Int32]::Parse($CURRENTVERSION) + 1
            }
            else {
                $VERSION = $CURRENTVERSION
            }
        }
        else {
            #
            # Semantic versioning non-npm project
            #
            Log-Message "Using non-npm project semantic versioning"
            Log-Message "Semver not found, run 'npm install -g semver' to automate semantic versioning of non-NPM projects" "darkyellow"
        }
    }
}

if ($CURRENTVERSION -eq "") {
    Log-Message "Could not determine current version, correct issue and re-run publish" "red"
    exit
}

Log-Message "The current version is $CURRENTVERSION"

if (![string]::IsNullOrEmpty($VERSION)) 
{
    Log-Message "The suggested new version is $VERSION"
}
else {
    Log-Message "New version could not be determined, you must manually input the new version"
    $INTERACTIVE = "Y"
    if ($RUN -gt 1) {
        Log-Message "Could not pass through version number in multiple run, exiting" "red"
        exit 102
    }
}

if ($INTERACTIVE -eq "Y" -and $RUN -eq 1) 
{
    Log-Message "Enter the new version"
    $NewVersion = read-host -prompt "Enter the version #, or C to cancel [$VERSION]"
    if ($NewVersion.ToUpper() -eq "C") {
        Log-Message "User cancelled process, exiting" "red"
        exit 0
    }
    if (![string]::IsNullOrEmpty($NewVersion)) {
        $VERSION = $NewVersion
    }
}

if ([string]::IsNullOrEmpty($VERSION)) {
    Log-Message "Invalid next version, exiting" "red"
    exit 103
}

#
# Certain tasks only need to be done once if there are multiple publish runs configured to run.
# If running in test mode, changes in each run are reverted, so treat every run like the 1st
#
# These tasks include:
#
#     1. Get commit comments since last version tag
#     2. Populate and edit history text file
#     3. Populate and edit changelog markdown file
#
if ($RUN -eq 1 -or $TESTMODE -eq "Y")
{
    #
    # Get commit messages since last version
    #
    # The previous version tag in the form 'vX.X.X' must exist in svn/projectroot/tags in
    # order to successfully obtain the latest commit messages.  If it does not exist, the
    # most current tag will be used
    #
    if ($REPOTYPE -eq "svn") {
        Log-Message "Getting SVN commits made since prior release"
        $COMMITS = $ClsSvn.getCommits($REPO, $REPOBRANCH)
    }
    elseif ($REPOTYPE -eq "git") {
        Log-Message "Git commit retrieval not supported as of yet" "darkyellow"
    }

    #
    # Check to ensure we got commits since last version.  If not, prompt user whether or
    # not to proceed, since technically the first time this script is used, we don't know
    # how to retrieve the latest commits
    #
    if ($COMMITS -eq $null -or $COMMITS.Length -eq 0) {
        Log-Message "Commits since the last version or the version tag could not be found"
        $Proceed = read-host -prompt "Proceed anyway? Y[N]"
        if ($Proceed.ToUpper() -ne "Y") {
            Log-Message "User cancelled process, exiting" "red"
            exit 0
        }
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
    Log-Message "Current Branch      : $BRANCH"
    Log-Message "Current Version     : $CURRENTVERSION"
    Log-Message "Next Version        : $VERSION"
    Log-Message "Date                : $TDATE"

    #
    # Process $HISTORYFILE
    #
    if ($CURRENTVERSION -ne $VERSION -and ![string]::IsNullOrEmpty($HISTORYFILE))
    {
        $TmpCommits = $ClsHistoryFile.createSectionFromCommits($COMMITS, $HISTORYLINELEN)

        Log-Message "Preparing history file"
        #
        # If history file doesnt exist, create one with the project name as a title
        #
        $HistoryPath = Split-Path "$HISTORYFILE"
        if ($HistoryPath -ne "" -and !(Test-Path($HistoryPath))) 
        {
            New-Item -ItemType "directory" -Path "$HistoryPath" | Out-Null
            #
            # Add to changelist for svn check in.  This would be the first file modified so just
            # set changelist equal to history file
            #
            Vc-Changelist-AddNew "$HistoryPath"
            Vc-Changelist-AddRemove "$HistoryPath"
            Vc-Changelist-Add "$HistoryPath"
        }
        if (!(Test-Path($HISTORYFILE))) 
        {
            New-Item -ItemType "file" -Path "$HISTORYFILE" -Value "$PROJECTNAME`r`n`r`n" | Out-Null
            #
            # Add to changelist for svn check in.  This would be the first file modified so just
            # set changelist equal to history file
            #
            Vc-Changelist-AddRemove "$HistoryPath"
            Vc-Changelist-AddNew $HISTORYFILE
            Vc-Changelist-Add $HISTORYFILE
        }
        if (!(Test-Path($HISTORYFILE))) 
        {
            Log-Message "Could not create history file, exiting" "red"
            exit 107;
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
        #
        # Add to changelist for svn check in.  This would be the first file modified so just
        # set changelist equal to history file
        #
        Vc-Changelist-Add $HISTORYFILE
    }
    else {
        Log-Message "Version match, not touching history file" "darkyellow"
    }
    #
    # Allow manual modifications to history file
    #
    if (![string]::IsNullOrEmpty($HISTORYFILE)) 
    {
        Edit-File $HISTORYFILE $true
        #
        # Add to changelist for vc check in.  This would be the first file modified so just
        # set changelist equal to history file
        #
        Vc-Changelist-Add $HISTORYFILE
    }

    #
    # Process $CHANGELOGFILE
    #
    if ($CURRENTVERSION -ne $VERSION -and ![string]::IsNullOrEmpty($CHANGELOGFILE))
    {
        $NewChangelog = $false
        $TmpCommits = ""
        $LastSection = ""
        $Sectionless = @()
        $ChangeLogTitle = "# $PROJECTNAME Change Log".ToUpper()

        Log-Message "Preparing changelog file"
        #
        # If changelog markdown file doesnt exist, create one with the project name as a title
        #
        $ChangeLogPath = Split-Path "$CHANGELOGFILE"
        if ($ChangeLogPath -ne "" -and !(Test-Path($ChangeLogPath))) 
        {
            New-Item -ItemType "directory" -Path "$ChangeLogPath" | Out-Null
            Vc-Changelist-AddNew "$ChangeLogPath"
            Vc-Changelist-AddRemove "$ChangeLogPath"
            Vc-Changelist-Add "$ChangeLogPath"
        }
        if (!(Test-Path($CHANGELOGFILE))) 
        {
            New-Item -ItemType "file" -Path "$CHANGELOGFILE" -Value "$ChangeLogTitle`r`n`r`n" | Out-Null
            Vc-Changelist-AddRemove $CHANGELOGFILE
            Vc-Changelist-AddNew $CHANGELOGFILE
            Vc-Changelist-Add $CHANGELOGFILE
            $NewChangelog = $true
        }
        if (!(Test-Path($CHANGELOGFILE))) 
        {
            Vc-Revert
            Log-Message "Could not create changelog file, exiting" "red"
            exit 108
        }
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
        $ChangeLogContents = "$ChangeLogTitle`r`n`r`n$TmpCommits`r`n`r`n$ChangeLogContents`r`n"
        Set-Content $CHANGELOGFILE $ChangeLogContents
        #
        # Add to changelist for svn check in.  This would be the first file modified so just
        # set changelist equal to history file
        #
        Vc-Changelist-Add $CHANGELOGFILE
    }
    else {
        Log-Message "Version match, not touching changelog file" "darkyellow"
    }
    #
    # Allow manual modifications to changelog file
    #
    if (![string]::IsNullOrEmpty($CHANGELOGFILE)) {
        Edit-File $CHANGELOGFILE
        #
        # Add to changelist for svn check in.  This would be the first file modified so just
        # set changelist equal to history file
        #
        Vc-Changelist-Add $CHANGELOGFILE
    }
}

#
# Store location paths depending on publish typess
#
$TargetNetLocation = ""
$NpmLocation = ""
$NugetLocation = ""

#
# PJ Installer Release
#
if ($INSTALLERRELEASE -eq "Y") 
{
    $DistDirCreated = $false
    $InstallerBuilt = $false
    #
    # Create dist directory if it doesnt exist
    #
    if (!(Test-Path($PATHTODIST))) {
        Log-Message "Create dist directory"
        New-Item -Path "$PATHTODIST" -ItemType "directory" | Out-Null
        Vc-Changelist-AddRemove "$PATHTODIST"
    }
    #
    # Copy history file to dist directory
    #
    $DistHistoryFileExists = $true
    if (!(Test-Path("$PATHTODIST\$HISTORYFILE"))) 
    {
        $HistoryFileName = [Path]::GetFileName($HISTORYFILE);
        Vc-Changelist-AddRemove "$PATHTODIST\$HistoryFileName"
    }
    Copy-Item -Path "$HISTORYFILE" -PassThru -Force -Destination "$PATHTODIST" | Out-Null
    #Vc-Changelist-Add "$PATHTODIST\$HISTORYFILE"
    #
    # If dist dir is under version control, add it to the changelist
    #
    $TestPathVc = $PATHTODIST;
    if ($PATHPREROOT -ne "" -and $PATHPREROOT -ne $null) {
        $TestPathVc = Join-Path -Path "$PATHPREROOT" -ChildPath "$TestPathVc"
    }
    #
    # Change dircetory to svn root that contains the .svn folder to isse SVN commands
    #
    if (!$DistDirCreated)
    {
        if (![string]::IsNullOrEmpty($PATHTOMAINROOT)) {
            set-location $PATHTOMAINROOT
        }
        if ($REPOTYPE -eq "svn") {
            & svn info "$TestPathVc"
        }
        else {
            & git ls-files --error-unmatch "$TestPathVc"
        }
        if ($LASTEXITCODE -eq 0) {
            Vc-Changelist-Add "$PATHTODIST"
            Vc-Changelist-AddMulti "$PATHTODIST"
        }
        #
        # Change directory back to project root
        # PATHTOPREROOT will be defined if PATHTOMAINROOT is
        #
        if (![string]::IsNullOrEmpty($PATHTOMAINROOT)) { 
            set-location $PATHPREROOT
        }
    }
    #
    # Check if this is an ExtJs build.  ExtJs build will be an installer build, but it will
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
    elseif ((Test-Path("package.json"))) {
        Prepare-PackageJson
    }
    #
    # If this is a .NET build, update assemblyinfo file
    #
    if ((Test-Path("assemblyinfo.cs"))) {
        Prepare-DotNetBuild "assemblyinfo.cs"
    }
    elseif ((Test-Path("properties\assemblyinfo.cs"))) {
        Prepare-DotNetBuild "properties\assemblyinfo.cs"
    }
    elseif ((Test-Path("src\assemblyinfo.cs"))) {
        Prepare-DotNetBuild "src\assemblyinfo.cs"
    }
    elseif ((Test-Path("src\properties\assemblyinfo.cs"))) {
        Prepare-DotNetBuild "src\properties\assemblyinfo.cs"
    }
    #
    # Version bump installer script
    #
    if ($INSTALLEREXDIST -ne "Y")
    {
        if ($INSTALLERSCRIPT.Contains(".nsi"))
        {
            #
            # replace version in nsi file
            #
            Replace-Version $INSTALLERSCRIPT "`"$CURRENTVERSION`"" "`"$VERSION`""
            #
            # Add to vc changelist for check-in
            #
            Vc-Changelist-Add $INSTALLERSCRIPT
            #
            # Allow manual modifications to $INSTALLERSCRIPT
            #
            Edit-File $INSTALLERSCRIPT
        }
    }
    #
    # Run custom build scipts if specified
    #
    Run-Scripts "build" $BUILDCOMMAND $true $true
    #
    # Build the installer
    #
    if ($INSTALLEREXDIST -ne "Y")
    {
        if ($INSTALLERSCRIPT.Contains(".nsi"))
        {
            #
            # Run makensis to create installer
            #
            Log-Message "Building executable installer"
            Invoke-Expression -Command "$Env:CODE_HOME\nsis\makensis.exe $INSTALLERSCRIPT"
            Check-ExitCode
            $InstallerBuilt = $true
        }
        else {
            Log-Message "Cannot build this installer type ($INSTALLERSCRIPT)" "red"
        }
    }
    #
    # If this is an npm managed project, but not ExtJs, then restore package.json to original
    # state, minus the version number
    #
    if ((Test-Path("package.json")) -and !(Test-Path("app.json"))) {
        Restore-PackageJson
    }
    #
    # If the installer was successfully built, proceed, otherwise display error and exit
    #
    if ($InstallerBuilt -eq $true -or $INSTALLERSKIPBUILD -eq "Y" -or $INSTALLEREXDIST -eq "Y")
    {
        $TargetNetLocation = "\\192.168.68.120\d$\softwareimages\$PROJECTNAME\$VERSION"
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
                    Log-Message "Create directory $TargetNetLocation"
                    New-Item -Path "$TargetNetLocation" -ItemType "directory" | Out-Null
                    Check-ExitCode
                }
                #
                # Copy all files in 'dist' directory that start with $PROJECTNAME, and the history file
                #
                Log-Message "Deploying files to $TargetNetLocation"
                Copy-Item "$PATHTODIST\*","$HISTORYFILE" -Destination "$TargetNetLocation" | Out-Null
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
                Log-Message "Deploying pdf documentation to Sharepoint"
                Copy-Item "$PATHTODIST\*.pdf","doc\*.pdf","documentation\*.pdf" -Destination "$SharepointPath" | Out-Null
                Check-ExitCode
            }
            else {
                Log-Message "Test mode, skipping basic push to network drive" "magenta"
            }
        }
        else {
            Log-Message "Skipped installer push to network drive (user specified)" "magenta"
        }
    }
    else {
        Log-Message "Installer was not built" "darkyellow"
        Log-Message "Check to ensure createinstall.xml or installer build script path is correct" "darkyellow"
        Log-Message "Installer was not built or deployed" "red"
        Vc-Revert
        exit 115
    }
}

#
# NPM Release
#
if ($NPMRELEASE -eq "Y") 
{
    Log-Message "Releasing npm package"
    if (Test-Path("package.json"))
    {
        $PublishFailed = $false;
        #
        #
        #
        Prepare-PackageJson
        #
        # Build if specified
        #
        Run-Scripts "build" $BUILDCOMMAND $true $true
        #
        # Publish to npm server
        #
        Log-Message "Publishing npm package to $NPMREGISTRY"
        if ($TESTMODE -ne "Y") 
        {
            & npm publish --access public --registry $NPMREGISTRY
            Check-ExitCodeNative
        }
        else 
        {
            Log-Message "   Test mode, performing publish dry run only" "magenta"
            & npm publish --access public --registry $NPMREGISTRY --dry-run
            Log-Message "   Test mode, dry run publish finished" "magenta"
        }
        #
        #
        #
        Restore-PackageJson
        #
        #
        #
        if (!$PublishFailed) 
        {
            if (![string]::IsNullOrEmpty($NPMSCOPE)) { # VERDACCIO NPM server type URL
                $NpmLocation = "$NPMREGISTRY/-/web/detail/$NPMSCOPE/$PROJECTNAME"
            }
            else {
                $NpmLocation = "$NPMREGISTRY/-/web/detail/$PROJECTNAME"
            }
        }
        else {
            Vc-Revert
            exit 116
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
    Log-Message "Releasing nuget package"
    #
    # Build if specified
    #
    #Run-Scripts "build" $BUILDCOMMAND $true
    #
    # TODO
    #
    #$NugetLocation = "$NUGETREGISTRY/$PROJECTNAME"
}

#
# TODO - Nuget Release / .NET
#
if ($GITHUBRELEASE -eq "Y") 
{
    Log-Message "Releasing dist to GitHub"
    #
    # Build if specified
    #
    #Run-Scripts "build" $BUILDCOMMAND $true
    #
    # TODO
    #
    #$NugetLocation = "$NUGETREGISTRY/$PROJECTNAME"
}

#
# Run post build scripts if specified
#
Run-Scripts "postBuild" $POSTBUILDCOMMAND $true $true

#
# Run custom deploy script if specified
#
if ($SKIPDEPLOYPUSH -ne "Y")
{
    Run-Scripts "deploy" $DEPLOYCOMMAND $false $false
}
else {
    Log-Message "   Skipped running custom deploy script (user specified)" "magenta"
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
if (![string]::IsNullOrEmpty($PATHTOMAINROOT)) {
    set-location $PATHTOMAINROOT
}

if ($REPOTYPE -eq "svn")
{
    if (Test-Path(".svn"))
    {
        #$VCCHANGELIST = $VCCHANGELIST.Trim()
        #
        # Check version changes in to SVN if there's any touched files
        #
        if ($VCCHANGELIST -ne "") 
        {
            if ($TESTMODE -ne "Y") 
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
                        Check-ExitCode
                    }
                    Log-Message "Committing touched files to SVN version control"
                    Log-Message "   $VCCHANGELIST"
                    #
                    # SVN commit
                    #
                    Invoke-Expression -Command "svn commit $VCCHANGELIST -m `"chore(release): $VERSION [skip ci]`""
                    Check-ExitCode
                }
                elseif (![string]::IsNullOrEmpty($VCCHANGELISTMLT)) 
                {
                    Log-Message "Committing touched multi-publish files to SVN version control"
                    Log-Message "   $VCCHANGELISTMLT"
                    #
                    # SVN commit
                    #
                    Invoke-Expression -Command "svn commit $VCCHANGELISTMLT -m `"chore(release-mlt): $VERSION [skip ci]`""
                    Check-ExitCode
                }
                else {
                    Log-Message "Skipping touched file SVN commit, user specified" "darkyellow"
                }
            }
            else 
            {
                if ($TESTMODEVCREVERT -eq "Y") {
                    Vc-Revert
                }
                if ($TESTMODE -eq "Y") {
                    Log-Message "   Test mode, skipping touched file SVN commit" "magenta"
                }
            }
        }

        #
        # Create version tag
        #
        # If this is a sub-project within a project, do not tag
        #
        if ($VCTAG -eq "Y")
        {
            $TagLocation = "$REPO/tags/v$VERSION"
            Log-Message "Tagging SVN version at $TagLocation"
            if ($TESTMODE -ne "Y") 
            {
                #
                # Call svn copy to create 'tag'
                #
                & svn copy "$REPO/$REPOBRANCH" "$TagLocation" -m "chore(release): tag version $VERSION [skip ci]"
                Check-ExitCodeNative
            }
            else {
                Log-Message "   Test mode, skipping create version tag" "magenta"
            }
        }
        else {
            Log-Message "   Skipping version tag, user specified" "darkyellow"
        }
    }
    else {
        Log-Message "Could not find .svn folder, skipping commit and version tag" "red"
    }
}

#
# GIT
#
elseif ($REPOTYPE -eq "git")
{
    if (Test-Path(".git"))
    {
        #$VCCHANGELIST = $VCCHANGELIST.Trim()
        #
        # Check version changes in to SVN if there's any touched files
        #
        if ($VCCHANGELIST -ne "") 
        {
            if ($TESTMODE -ne "Y") 
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
                        Check-ExitCode
                    }
                    #
                    # GIT commit and GIT push
                    #
                    Log-Message "Committing touched files to GIT version control"
                    Log-Message "   $VCCHANGELIST"
                    Invoke-Expression -Command "git commit --quiet -m `"chore(release): $VERSION [skip ci]`" -- $VCCHANGELIST"
                    Check-ExitCode
                    Invoke-Expression -Command "git push origin ${REPOBRANCH}:${REPOBRANCH}"
                    Check-ExitCode
                }
                elseif (![string]::IsNullOrEmpty($VCCHANGELISTMLT)) 
                {
                    Log-Message "Committing touched multi-publish files to SVN version control"
                    Log-Message "   $VCCHANGELISTMLT"
                    #
                    # GIT commit
                    #
                    Invoke-Expression -Command "git commit --quiet -m `"chore(release-mlt): $VERSION [skip ci]`" -- $VCCHANGELISTMLT"
                    Check-ExitCode
                    Invoke-Expression -Command "git push origin ${REPOBRANCH}:${REPOBRANCH}"
                    Check-ExitCode
                }
                else {
                    Log-Message "Skipping touched file GIT commit, user specified" "darkyellow"
                }
            }
            else 
            {
                if ($TESTMODEVCREVERT -eq "Y") {
                    Vc-Revert
                }
                if ($TESTMODE -eq "Y") {
                    Log-Message "   Test mode, skipping touched file GIT commit" "magenta"
                }
            }
        }

        #
        # Create version tag
        #
        # If this is a sub-project within a project, do not tag
        #
        if ($VCTAG -eq "Y")
        {
            Log-Message "Tagging GIT version"
            if ($TESTMODE -ne "Y") 
            {
                #
                # Call git copy to create 'tag'
                #
                & git tag -a "v$VERSION" -m "chore(release): tag version $VERSION [skip ci]"
                Check-ExitCodeNative
            }
            else {
                Log-Message "   Test mode, skipping create version tag" "magenta"
            }
        }
        else {
            Log-Message "   Skipping version tag, user specified" "darkyellow"
        }
    }
    else {
        Log-Message "Could not find .git folder, skipping commit and version tag" "red"
    }
}

if ($TESTMODE -eq "Y") {
    Log-Message "Tests completed"
    if ($TESTMODEVCREVERT -ne "Y") {
        Log-Message "   You should manually revert any auto-touched files via SCM" "magenta"
    }
}

Log-Message "Completed"
Log-Message "Finished successfully" "darkgreen"

exit
