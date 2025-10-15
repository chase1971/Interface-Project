Set objShell = CreateObject("WScript.Shell")

' Kill any existing Node.js processes
objShell.Run "taskkill /F /IM node.exe", 0, True

' Wait a moment for processes to close
WScript.Sleep 2000

' Start backend server
strBackendCommand = "cd /d ""C:\Users\chase\Documents\School Scrips\Interface-Project\backend"" && node server.js"
objShell.Run "cmd /k """ & strBackendCommand & """", 1, False

' Wait a moment for backend to start
WScript.Sleep 3000

' Start frontend server
strFrontendCommand = "cd /d ""C:\Users\chase\Documents\School Scrips\Interface-Project\frontend"" && npm start"
objShell.Run "cmd /k """ & strFrontendCommand & """", 1, False
