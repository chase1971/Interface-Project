Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get the current directory where the script is located
strScriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)

' Kill all Node.js processes
WshShell.Run "taskkill /F /IM node.exe", 0, True

' Wait for processes to stop
WScript.Sleep 2000

' Start backend invisibly (using full path)
WshShell.CurrentDirectory = strScriptPath & "\backend"
WshShell.Run "node server-new.js", 0, False

' Wait for backend to initialize
WScript.Sleep 3000

' Start frontend invisibly (using full path)
WshShell.CurrentDirectory = strScriptPath & "\frontend"
WshShell.Run "cmd /c npm start", 0, False

' Frontend will automatically open browser when ready
