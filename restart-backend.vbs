Set objShell = CreateObject("WScript.Shell")

' Kill any existing Node.js processes
objShell.Run "taskkill /F /IM node.exe", 0, True

' Wait a moment for processes to close
WScript.Sleep 2000

' Change to backend directory
objShell.CurrentDirectory = "C:\Users\chase\My Drive\scripts\School Scripts\Interface-Project\backend"

' Start the server invisibly (no command window)
objShell.Run "node server.js", 0, False