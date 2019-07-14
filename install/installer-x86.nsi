
;*********************************************************************
;*                                                                   *
;*   Define                                                          *
;*                                                                   * 
;*********************************************************************

; Define application name
!define APPLICATION_NAME     "App-Publisher"

; Define build level
!define BUILD_LEVEL          "1.7.1"

; Define install file name
!define INSTALL_FILE_NAME    "${APPLICATION_NAME}_32bit.exe"

; Define uninstall file name
!define UNINSTALL_FILE_NAME  "${APPLICATION_NAME}_uninst.exe"

; Define MUI_ABORTWARNING so that a warning message is displayed
; if you attempt to cancel an install
!define MUI_ABORTWARNING

; Define MUI_HEADERPAGE to display a custom bitmap
!define MUI_ICON "..\res\app-publisher.ico"
!define MUI_HEADERIMAGE 
!define MUI_HEADERIMAGE_BITMAP "pja24bit.bmp"

; Set context to 'All Users'
!define ALL_USERS

;*********************************************************************
;*                                                                   *
;*   Include                                                         *
;*                                                                   * 
;*********************************************************************

!include "MUI.nsh"
!include "nsDialogs.nsh"
!include "common.nsh"

;*********************************************************************
;*                                                                   *
;*   Variables                                                       *
;*                                                                   * 
;*********************************************************************

Var IsUpdateMode

;*********************************************************************
;*                                                                   *
;*   Instructions                                                    *
;*                                                                   * 
;*********************************************************************

; This value is displayed in the lower left of each dialog window
BrandingText " "

; Force CRC checking
CRCCheck force

; This appears in the title bar
Name "${APPLICATION_NAME} ${BUILD_LEVEL}"

; The output file name
OutFile "dist\${INSTALL_FILE_NAME}"

; Show details of install
ShowInstDetails show

; Show details of uninstall
ShowUninstDetails show

; Specify the pages to display when performing an Install
!define MUI_PAGE_CUSTOMFUNCTION_PRE dirPre
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

; Specify the pages to display when performing an Uninstall
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Specify the language
!insertmacro MUI_LANGUAGE "English"


;*********************************************************************
;*                                                                   *
;*   Section Definition                                              *
;*                                                                   *
;*      Install                                                      *
;*                                                                   *
;*********************************************************************

Section "Install"

    ;SetRegView 64
    SetOutPath "$INSTDIR"
    
    ; Include packaged files
    File /r ..\script\*.*

    Push "$INSTDIR"
    Call AddToPath

    Push "APP_PUBLISHER_HOME"
    Push "$INSTDIR"
    Call WriteEnvVar

    ;
    ; ADD REGISTRY KEYS - ADD/REMOVE PROGRAMS
    ;
    ;${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
    ;IntFmt $0 "0x%08X" $0
    ${If} $IsUpdateMode != YES
        Strcpy $0 "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPLICATION_NAME}"
        WriteRegStr   HKLM "$0" "DisplayIcon" "powershell.exe"               
        WriteRegStr   HKLM "$0" "DisplayName" "App Publisher"         
        WriteRegStr   HKLM "$0" "DisplayVersion" "${BUILD_LEVEL}"
        WriteRegDWORD HKLM "$0" "EstimatedSize" 56
        WriteRegStr   HKLM "$0" "InstallLocation" "$INSTDIR"
        WriteRegDWORD HKLM "$0" "NoModify" 1
        WriteRegDWORD HKLM "$0" "NoRepair" 1
        WriteRegStr   HKLM "$0" "Publisher" "Perry Johnson & Associates"
        WriteRegStr   HKLM "$0" "UninstallString" "$INSTDIR\${UNINSTALL_FILE_NAME}"
        WriteRegStr   HKLM "$0" "QuietUninstallString" "$\"$INSTDIR\${UNINSTALL_FILE_NAME}$\" /S"
    ${EndIf}

    ; Set context to 'All Users'
    SetShellVarContext "all"

    ;
    ; CREATE UNINSTALLER
    ;
    WriteUninstaller "$INSTDIR\${UNINSTALL_FILE_NAME}"

SectionEnd


;*********************************************************************
;*                                                                   *
;*   Section Definition                                              *
;*                                                                   * 
;*      Uninstall                                                    * 
;*                                                                   * 
;*********************************************************************

Section "Uninstall"

    ; Set context to 'All Users'
    SetShellVarContext "all"

    Push "$INSTDIR"
    Call un.RemoveFromPath

    Push "APP_PUBLISHER_HOME"
    Call un.DeleteEnvVar

    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPLICATION_NAME}"

    RMDir /r "$INSTDIR"

SectionEnd


;*********************************************************************
;*                                                                   * 
;*      .onInit                                                      * 
;*                                                                   * 
;*********************************************************************

Function .onInit

    ; Specify default directory
    StrCpy $INSTDIR "$PROGRAMFILES\Perry Johnson & Associates\GEMS2\FootPedal"

    ReadRegStr $R0 HKLM \
    "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPLICATION_NAME}" \
    "InstallLocation"

    StrCmp $R0 "" done

    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
        "${APPLICATION_NAME} is already installed.$\n$\nClick `OK` to \
         to update, or `Cancel` to quit." \
    IDOK update
        Abort
    update:
        StrCpy $IsUpdateMode YES ; Set flag that this is update mode
        ; Copy the current install location, install updates here
        StrCpy $INSTDIR "$R0"
    done:

FunctionEnd


;*********************************************************************
;*                                                                   * 
;*      dirPre                                                       * 
;*                                                                   * 
;*********************************************************************

Function dirPre
    ${If} $IsUpdateMode == YES ; skip install dir window if update mode
        Abort                  ; INSTDIR is set in .onInit
    ${EndIf}
FunctionEnd






