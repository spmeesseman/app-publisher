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
$COMMITS = @(),
$VERSION = "",
$STAGE = "",
$DATE = "",
$OPTIONS
)

#**************************************************************#

#####  #       #    #####  #####  #####  ##### 
#      #      # #   #      #      #      #     
#      #     #####  #####  #####  ####   ##### 
#      #     #   #      #      #  #          # 
#####  ####  #   #  #####  #####  #####  ##### 

#**************************************************************#

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

    if (![string]::IsNullOrEmpty($msg.Trim()) -and !$noTag) {
        write-host -NoNewline "ap "
    }

    if ($color) 
    {
        $msgTag = ""
        switch ($color) 
        {
            "red" { $msgTag = "[ERROR] "; break; }
            "darkyellow" { $msgTag = "[WARNING] "; break; }
            "darkgreen" { $msgTag = "[SUCCESS] "; break; }
            "magenta" { $msgTag = "[NOTICE] "; break; }
            default: { break; }
        }
        if ($msgTag -ne "") {
            write-host -NoNewline -ForegroundColor $color $msgTag
            write-host $msg
        }
        else {
            write-host -ForegroundColor $color $msg
        }
    }
    else {
        write-host $msg
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
    if ([string]::IsNullOrEmpty($options.emailServer)) {
        Log-Message "   Notification could not be sent, invalid email server specified" "red"
        return
    }
    if ([string]::IsNullOrEmpty($options.emailRecip) -and [string]::IsNullOrEmpty($options.testEmailRecip)) {
        Log-Message "   Notification could not be sent, invalid recipient address specified" "red"
        return
    }
    if ([string]::IsNullOrEmpty($options.$emailSender)) {
        Log-Message "   Notification could not be sent, invalid sender address specified" "red"
        return
    }

    # encoding="plain" (from ant)   ps cmd: -Encoding ASCII
    $EmailBody = ""
    if (![string]::IsNullOrEmpty($options.historyFile)) 
    {
        Log-Message "   Converting history text to html"
        $EmailBody = $ClsHistoryFile.getHistory($projectName, $version, 1, $options.versionText, $false, $options.historyFile, $null, $targetloc, $npmloc, $nugetloc);
    }
    elseif (![string]::IsNullOrEmpty($options.changelogFile)) 
    {
        # TODO -  extract only latest version release notes
        Log-Message "   Converting changelog markdown to html"
        #
        # Use marked module for conversion
        #
        $EmailBody = & app-publisher-marked -f $options.changelogFile
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

        if ($TESTMODE -ne "Y") 
        {
            if (![string]::IsNullOrEmpty($options.emailRecip) -and $options.emailRecip.Contains("@") -and $options.emailRecip.Contains(".")) 
            {
                Send-MailMessage -SmtpServer $options.emailServer -BodyAsHtml -From $options.emailSender -To $options.emailRecip -Subject $Subject -Body $EmailBody
            }
            else {
                if (![string]::IsNullOrEmpty($options.testEmailRecip) -and $options.testEmailRecip.Contains("@") -and $options.testEmailRecip.Contains(".")) 
                {
                    Log-Message "   Notification could not be sent to email recip, sending to test recip" "darkyellow"
                    Send-MailMessage -SmtpServer $options.emailServer -BodyAsHtml -From $options.emailSender -To $options.testEmailRecip -Subject $Subject -Body $EmailBody
                    Check-PsCmdSuccess
                }
                else {
                    Log-Message "   Notification could not be sent, invalid email address specified" "red"
                }
            }
        }
        else {
            if (![string]::IsNullOrEmpty($options.testEmailRecip) -and $options.testEmailRecip.Contains("@") -and $options.testEmailRecip.Contains(".")) 
            {
                Send-MailMessage -SmtpServer $options.emailServer -BodyAsHtml -From $options.emailSender -To $options.testEmailRecip -Subject $Subject -Body $EmailBody
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

function Vc-IsVersioned($ObjectPath)
{
    $IsVersioned = $false

    if ($PATHPREROOT -ne "" -and $PATHPREROOT -ne $null) {
        $VcFile = Join-Path -Path "$PATHPREROOT" -ChildPath "$ObjectPath"
    }

    if (![string]::IsNullOrEmpty($PATHTOMAINROOT)) {
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
    if (![string]::IsNullOrEmpty($PATHTOMAINROOT)) { 
        set-location $PATHPREROOT
    }

    return $IsVersioned
}

function Vc-Revert()
{
    if (![string]::IsNullOrEmpty($VCCHANGELIST)) 
    {
        Log-Message "Removing new files / reverting touched files under version control"
        Log-Message "Stored Commit List: $VCCHANGELIST"
        Log-Message "Stored Add List   : $VCCHANGELISTADD"
        Log-Message "Stored Remove List: $VCCHANGELISTRMV"

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
                    continue;
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
    }
}

function Check-ExitCode($ExitOnError = $false)
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
            Vc-Revert
            exit $ECode
        }
    }
}

function Check-PsCmdSuccess($ExitOnError = $false)
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
            Vc-Revert
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
    #
    # Replace version in assemblyinfo file
    #
    Replace-Version $AssemblyInfoLocation "AssemblyVersion[ ]*[(][ ]*[`"]$CURRENTVERSION" "AssemblyVersion(`"$SEMVERSION"
    Replace-Version $AssemblyInfoLocation "AssemblyFileVersion[ ]*[(][ ]*[`"]$CURRENTVERSION" "AssemblyFileVersion(`"$SEMVERSION"
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
        
        #if (Vc-IsVersioned($File)) {
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

#***************************************************************************#

#####  #####  #####  ###  ##### #####     #####  #   #  #####  #####  #   #
#      #      #   #   #   #   #   #       #      ##  #    #    #   #   # #
#####  #      ####    #   #####   #       ####   # # #    #    ####     #
    #  #      #  #    #   #       #       #      #  ##    #    #  #     #
#####  #####  #   #  ###  #       #       #####  #   #    #    #   #    #

#***************************************************************************#

$CURRENTVERSION = ""
$TDATE = ""
$REPOSCOMMITED = @()
$VERSION = $options.version

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
# Set location to root
#
set-location -Path $PATHTOROOT
$CWD = Get-Location

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
# Start logging
#
Log-Message "----------------------------------------------------------------" "darkblue" $true
Log-Message " App Publisher PowerShell Release" "darkblue" $true
Log-Message "   Version   : $APPPUBLISHERVERSION" "cyan" $true
Log-Message "   Author    : Scott Meesseman" "cyan" $true
Log-Message "   Directory : $CWD" "cyan" $true
Log-Message "----------------------------------------------------------------" "darkblue" $true

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
    Log-Message "Repository must be specified on cmd line or in package.json" "red"
    exit 1
}
elseif ([string]::IsNullOrEmpty($_RepoType)) {
    Log-Message "Repository type must be specified on cmd line or in package.json" "red"
    exit 1
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
# Convert any Y/N vars to upper case and check validity
#
if (![string]::IsNullOrEmpty($TESTMODE)) {
    $TESTMODE = $TESTMODE.ToUpper()
    if ($TESTMODE -ne "Y" -and $TESTMODE -ne "N") {
        Log-Message "Invalid value specified for testMode, accepted values are y/n/Y/N" "red"
        exit 1
    }
}
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
# Write project specific properties
#
Log-Message "Project specific script configuration:"
Log-Message "   Project          : $PROJECTNAME"
Log-Message "   Build cmd        : $BUILDCOMMAND"
Log-Message "   Bugs Page        : $BUGS"
Log-Message "   Changelog file   : $CHANGELOGFILE"
Log-Message "   Deploy cmd       : $DEPLOYCOMMAND"
Log-Message "   Dist release     : $DISTRELEASE"
Log-Message "   Github release   : $GITHUBRELEASE"
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
Log-Message "   Skip deploy/push : $SKIPDEPLOYPUSH"
Log-Message "   Tag version      : $VCTAG"
Log-Message "   Tag prefix       : $VCTAGPREFIX"
Log-Message "   Text editor      : $TEXTEDITOR"
Log-Message "   Test mode        : $TESTMODE"
Log-Message "   Test email       : $options.testEmailRecip"
Log-Message "   Text editor      : $TEXTEDITOR"
Log-Message "   Version text     : $VERSIONTEXT"

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

if ($DISTRELEASE -eq "Y" -and [string]::IsNullOrEmpty($PATHTODIST)) {
    Log-Message "pathToDist must be specified for dist release" "red"
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
if ($VERSIONFILES -is [system.string] -and ![string]::IsNullOrEmpty($VERSIONFILES))
{
    $VERSIONFILES = @($VERSIONFILES); #convert to array
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
    elseif ((Test-Path("AssemblyInfo.cs")) -or (Test-Path("Properties\AssemblyInfo.cs")))
    {
        #
        # TODO - Parse AssemblyInfo.cs for current version 
        #
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
    else {
        Log-Message "The current version cannot be determined" "red"
        Log-Message "Provided the current version in publishrc or on the command line" "red"
        exit 130
    }
}

if ($CURRENTVERSION -eq "") {
    Log-Message "Could not determine current version, correct issue and re-run publish" "red"
    exit 131
}

if ($INTERACTIVE -eq "Y") 
{
    Log-Message "Enter the new version"
    $NewVersion = read-host -prompt "Enter the version #, or C to cancel [$VERSION]"
    if ($NewVersion.ToUpper() -eq "C") {
        Log-Message "User cancelled process, exiting" "red"
        exit 155
    }
    if (![string]::IsNullOrEmpty($NewVersion)) {
        $VERSION = $NewVersion
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
    if ($CURRENTVERSION -ne $VERSION -and ($RUN -eq 1 -or $TESTMODE -eq "Y"))
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
        Vc-Revert
        Log-Message "Could not create changelog file, exiting" "red"
        exit 141
    }

    if ($CURRENTVERSION -ne $VERSION -and ($RUN -eq 1 -or $TESTMODE -eq "Y"))
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
    $DistIsVersioned = Vc-IsVersioned($PATHTODIST)
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
    Log-Message "Releasing npm package"
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
        if ($TESTMODE -ne "Y") 
        {
            & npm publish --access public --registry $NPMREGISTRY
            Check-ExitCode
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
            Vc-Revert
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
    Log-Message "Releasing nuget package"
    Log-Message "Nuget release not yet supported" "darkyellow"
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
# TODO - Github Release
#
if ($GITHUBRELEASE -eq "Y") 
{
    Log-Message "Releasing dist to GitHub"
    Log-Message "Github release not yet supported" "darkyellow"
    #
    # Build if specified
    #
    #Run-Scripts "build" $BUILDCOMMAND $true
    #
    # TODO
    #
    #$GithubLocation = ??? "https://github.com/username/projectname/releases/-/releases/version" ???
}

#
# Network Release
#
if ($DISTRELEASE -eq "Y") 
{
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
        if ($TESTMODE -ne "Y") 
        {
            Log-Message "Processing distribution to specified location:"
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
            Log-Message "Test mode, skipping basic push to network drive" "magenta"
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
if ($SKIPDEPLOYPUSH -ne "Y")
{
    Run-Scripts "deploy" $DEPLOYCOMMAND $false $false
}
else {
    Log-Message "Skipped running custom deploy script (user specified)" "magenta"
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
                if ($TESTMODE -ne "Y") 
                {
                    #
                    # Call svn copy to create 'tag'
                    #
                    & svn copy "$_Repo" "$TagLocation" -m "$TagMessage"
                    Check-ExitCode
                }
                else {
                    Log-Message "Test mode, skipping create version tag" "magenta"
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
                    Invoke-Expression -Command "git push origin master:master"
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
                    Invoke-Expression -Command "git push origin master:master"
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
                    Log-Message "Test mode, skipping touched file GIT commit" "magenta"
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
                if ($TESTMODE -ne "Y") 
                {
                    #
                    # Call git tag to create 'tag', then push to remote with push --tags
                    #
                    & git tag -a $TagLocation -m "$TagMessage"
                    Check-ExitCode
                    & git push --tags
                    Check-ExitCode
                }
                else {
                    Log-Message "Test mode, skipping create version tag" "magenta"
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

if ($TESTMODE -eq "Y") {
    Log-Message "Tests completed"
    if ($TESTMODEVCREVERT -ne "Y") {
        Log-Message "   You should manually revert any auto-touched files via SCM" "magenta"
    }
}

Log-Message "Completed"
Log-Message "Finished successfully" "darkgreen"

exit