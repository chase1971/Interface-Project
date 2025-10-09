# D2L Interface Project

A full-stack web application that provides a modern React frontend interface for the D2L Macro automation scripts.

## 🚀 Features

- **Modern React Frontend**: Clean, futuristic UI matching the original Python GUI
- **Node.js Backend API**: Handles file uploads and Python script execution
- **D2L Integration**: Full integration with existing D2L Macro Python scripts
- **Real-time Status Updates**: Live feedback during processing
- **File Upload**: CSV file handling with validation
- **Class Selection**: Support for multiple D2L classes

## 📁 Project Structure

```
Interface Project/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.js      # Main control panel
│   │   │   ├── Home.css     # Home page styling
│   │   │   ├── D2LInterface.js  # D2L interface page
│   │   │   └── D2LInterface.css # D2L interface styling
│   │   └── App.js           # Main app with routing
│   └── package.json
├── backend/                 # Node.js backend API
│   ├── server.js            # Express server
│   ├── package.json         # Backend dependencies
│   └── uploads/             # CSV file uploads (auto-created)
├── D2L Macro/              # Original Python scripts
│   ├── D2L_Gui.py           # Main GUI script
│   ├── d2l_date_processing.py  # Date processing logic
│   └── logs/                # Processing logs
└── start-all.bat           # Start both servers
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- Python 3.x
- Chrome browser
- D2L Macro Python scripts (already included)

### Installation

1. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Python Dependencies** (if not already done)
   ```bash
   cd "D2L Macro"
   pip install selenium pandas webdriver-manager
   ```

### Running the Application

#### Option 1: Start Everything at Once
```bash
# Double-click start-all.bat
# OR run from command line:
start-all.bat
```

#### Option 2: Start Servers Separately

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### Access URLs
- **Frontend**: http://localhost:3015
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## 🎯 How to Use

1. **Start the Application**
   - Run `start-all.bat` or start both servers manually
   - Open http://localhost:3015 in your browser

2. **Navigate to D2L Interface**
   - Click "D2L Macro" button on the home page
   - You'll be taken to the D2L interface page

3. **Login to D2L**
   - Click "Login to D2L" button
   - This will open Chrome browser with D2L login
   - Log in manually to your D2L account

4. **Select Class**
   - Choose from available classes: FM4202, FM4103, CA4203, CA4201, CA4105
   - The system will navigate to the class date manager

5. **Upload CSV File**
   - Click "Browse" to select your CSV file
   - CSV should have columns: Name, Start Date, Start Time, Due Date, Due Time

6. **Process Assignments**
   - Click "Update Dates" to process the CSV
   - Monitor the status for real-time updates
   - View results when processing completes

## 📊 API Endpoints

### Backend API Routes

- `GET /api/health` - Health check
- `POST /api/d2l/login` - Initialize D2L login process
- `POST /api/d2l/upload` - Upload CSV file
- `POST /api/d2l/process` - Process CSV with D2L
- `GET /api/d2l/status/:processId` - Get process status
- `POST /api/d2l/clear` - Clear login session

## 🔧 Configuration

### Class URLs
The system supports these D2L classes:
- **FM4202**: Financial Mathematics
- **FM4103**: Financial Mathematics
- **CA4203**: Calculus
- **CA4201**: Calculus
- **CA4105**: Calculus

### CSV Format
Your CSV file should have these columns:
```
Name,Start Date,Start Time,Due Date,Due Time
Assignment 1,1/15/2025,11:59 PM,1/20/2025,11:59 PM
Assignment 2,1/22/2025,11:59 PM,1/27/2025,11:59 PM
```

## 🐛 Troubleshooting

### Common Issues

1. **Backend not starting**
   - Check if port 5000 is available
   - Ensure Node.js is installed
   - Run `npm install` in backend directory

2. **Frontend not connecting to backend**
   - Verify backend is running on port 5000
   - Check browser console for CORS errors
   - Ensure both servers are running

3. **Python script errors**
   - Check Python dependencies are installed
   - Verify Chrome/ChromeDriver is available
   - Check logs in `D2L Macro/logs/` directory

4. **File upload issues**
   - Ensure CSV file is valid format
   - Check file size (should be under 10MB)
   - Verify CSV has required columns

### Logs and Debugging

- **Backend logs**: Check terminal where backend is running
- **Python logs**: Check `D2L Macro/logs/d2l_date_processing.log`
- **Browser console**: Check for JavaScript errors
- **Network tab**: Monitor API calls in browser dev tools

## 🔄 Development

### Making Changes

1. **Frontend Changes**
   - Edit files in `frontend/src/`
   - React will auto-reload on changes
   - Test in browser at http://localhost:3015

2. **Backend Changes**
   - Edit `backend/server.js`
   - Restart backend server
   - Test API endpoints

3. **Python Script Changes**
   - Edit files in `D2L Macro/`
   - Changes take effect on next processing run

## 📝 Notes

- The system uses the existing Python D2L scripts
- Chrome browser is required for D2L automation
- CSV files are temporarily stored in `backend/uploads/`
- Login sessions are persisted using Chrome profiles
- All processing is logged for debugging

## 🆘 Support

If you encounter issues:
1. Check the logs in both frontend and backend terminals
2. Verify all dependencies are installed
3. Ensure Python D2L scripts work independently
4. Check browser console for errors
