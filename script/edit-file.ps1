
param ( 
    $file,
    $editor,
    $seek,
    $async
)

$FirstEditFileDone = $false;


function Edit-File($editFile, $textEditor, $seekToEnd = $false, $async = $false)
{
    $nFile = $editFile;

    if (![string]::IsNullOrEmpty($nFile) -and (Test-Path($nFile)))
    {
        $script:VersionFilesEdited += $nFile

        if (!$skipEdit -and ![string]::IsNullOrEmpty($textEditor))
        {   #
            # Create scripting shell for process activation and sendkeys
            #
            $WSShell = New-Object -ComObject WScript.Shell
            #
            # Start Notepad process ro edit specified file
            #
            $TextEditorProcess = Start-Process -filepath $textEditor -args $nFile -PassThru
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
            if ($FirstEditFileDone -eq $false -or $textEditor.ToLower() -eq "notepad" -or $textEditor.ToLower() -eq "notepad.exe")
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

function CheckPsCmdSuccess($ExitOnError = $false)
{
    #
    # Check script error code, 0 is success
    #
    if ($? -ne $true) {
        if ($ExitOnError -eq $true) {
            exit 110
        }
    }
}

Edit-File $file $editor $seek $async
