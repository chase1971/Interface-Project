Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get the current directory where the script is located
strScriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
strPowerShellScript = strScriptPath & "\start-servers-silent.ps1"

' Run PowerShell script invisibly
' -NoProfile = Don't load user profile (faster startup)
' -ExecutionPolicy Bypass = Allow script to run
' -WindowStyle Hidden = No window
' -File = Run the script file
WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & strPowerShellScript & """", 0, False

' Wait for everything to start (increased time for cleanup), then open browser
WScript.Sleep 20000
WshShell.Run "http://localhost:3000", 1, False

