Set objShell = CreateObject("WScript.Shell")

' Kill any existing Node.js processes
objShell.Run "taskkill /F /IM node.exe", 0, True

' Wait a moment for processes to close
WScript.Sleep 2000

' Change to the frontend directory and start the server
strCommand = "cd /d ""C:\Users\chase\Documents\School Scrips\Interface-Project\frontend"" && npm start"

' Start the server in a new command window
objShell.Run "cmd /k """ & strCommand & """", 1, False

' Display success message
WScript.Echo "Frontend server restarting..."
