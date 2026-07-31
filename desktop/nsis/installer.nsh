; MATCHON Manager NSIS customizations (electron-builder include)
; Code signing is handled by electron-builder when CSC_* env is present.
; Keep this file minimal — do not embed secrets.

!macro customInstall
  ; reserved for future install-time tasks
!macroend

!macro customUnInstall
  ; AppData (persist:matchon-manager) is retained unless deleteAppDataOnUninstall=true
!macroend
