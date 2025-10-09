const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Store active processes
const activeProcesses = new Map();

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'D2L Backend API is running' });
});

// Login to D2L
app.post('/api/d2l/login', (req, res) => {
  try {
    const { classUrl } = req.body;
    
    // Use the system's default browser to open D2L (like the original Python GUI)
    const { exec } = require('child_process');
    
    // Open Chrome browser with D2L login URL (new window, positioned on second screen)
    exec(`start "" /max chrome "${classUrl}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Browser open error:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to open browser: ' + error.message 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Browser opened - Please log in manually' 
      });
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Select Class
app.post('/api/d2l/select-class', (req, res) => {
  try {
    const { classUrl } = req.body;
    
    // Use the system's default browser to open the class URL
    const { exec } = require('child_process');
    
    // Open Chrome browser with class URL (new window, positioned on second screen)
    exec(`start "" /max chrome "${classUrl}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Browser open error:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to open browser: ' + error.message 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Navigated to class - Ready for CSV processing',
        classUrl: classUrl
      });
    });

  } catch (error) {
    console.error('Class selection error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Open file browser to D2L Macro directory
app.get('/api/d2l/browse', (req, res) => {
  try {
    const d2lMacroPath = path.join(__dirname, '..', '..', 'D2L Macro');
    
    // Open Windows Explorer to the D2L Macro directory (handle spaces properly)
    const { exec } = require('child_process');
    exec(`start "" "${d2lMacroPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Explorer open error:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to open directory: ' + error.message 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'File browser opened to D2L Macro directory',
        directory: d2lMacroPath
      });
    });

  } catch (error) {
    console.error('Browse error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Upload CSV file
app.post('/api/d2l/upload', upload.single('csvFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No CSV file provided' 
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    res.json({ 
      success: true, 
      filePath: filePath,
      fileName: fileName,
      message: 'CSV file uploaded successfully' 
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Process CSV with D2L
app.post('/api/d2l/process', (req, res) => {
  try {
    const { csvFilePath, classUrl, processId } = req.body;

    if (!csvFilePath || !fs.existsSync(csvFilePath)) {
      return res.status(400).json({ 
        success: false, 
        error: 'CSV file not found' 
      });
    }

    // Use the d2l_date_processing.py script
    const pythonScript = path.join(__dirname, '..', '..', 'D2L Macro', 'd2l_date_processing.py');
    
    if (!fs.existsSync(pythonScript)) {
      return res.status(404).json({ 
        success: false, 
        error: 'D2L processing script not found' 
      });
    }

    // Create a Python script to process the CSV
    const processScript = `
import sys
import os
sys.path.append('${path.join(__dirname, '..', '..', 'D2L Macro')}')

from d2l_date_processing import D2LDateProcessor
import json

def main():
    try:
        processor = D2LDateProcessor()
        
        # Setup driver
        if not processor.setup_driver():
            print(json.dumps({"success": False, "error": "Failed to setup driver"}))
            return
        
        # Navigate to class URL
        processor.driver.get("${classUrl}")
        
        # Process CSV file
        processed, errors = processor.process_csv_file("${csvFilePath}")
        
        result = {
            "success": True,
            "processed": processed,
            "errors": errors,
            "message": f"Processed {processed} assignments with {errors} errors"
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
    finally:
        if hasattr(processor, 'driver') and processor.driver:
            processor.driver.quit()

if __name__ == "__main__":
    main()
`;

    // Write the process script to a temporary file
    const tempScriptPath = path.join(__dirname, 'temp_process.py');
    fs.writeFileSync(tempScriptPath, processScript);

    // Execute the Python script
    const pythonProcess = spawn('python', [tempScriptPath], {
      cwd: path.join(__dirname, '..', '..', 'D2L Macro'),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      // Clean up temp file
      try {
        fs.unlinkSync(tempScriptPath);
      } catch (e) {
        console.error('Error cleaning up temp file:', e);
      }

      if (code === 0) {
        try {
          const result = JSON.parse(output);
          res.json(result);
        } catch (e) {
          res.json({ 
            success: false, 
            error: 'Failed to parse result',
            output: output,
            errorOutput: errorOutput
          });
        }
      } else {
        res.json({ 
          success: false, 
          error: 'Process failed',
          output: output,
          errorOutput: errorOutput
        });
      }
    });

  } catch (error) {
    console.error('Process error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get process status
app.get('/api/d2l/status/:processId', (req, res) => {
  const processId = req.params.processId;
  const processInfo = activeProcesses.get(processId);

  if (!processInfo) {
    return res.status(404).json({ 
      success: false, 
      error: 'Process not found' 
    });
  }

  res.json({
    success: true,
    processId: processId,
    status: processInfo.status,
    output: processInfo.output || '',
    error: processInfo.error || ''
  });
});

// Clear login session
app.post('/api/d2l/clear', (req, res) => {
  try {
    // Kill all active processes
    for (const [processId, processInfo] of activeProcesses) {
      if (processInfo.process && !processInfo.process.killed) {
        processInfo.process.kill();
      }
    }
    activeProcesses.clear();

    // Clear Chrome profile data
    const tempDir = require('os').tmpdir();
    const profileDir = path.join(tempDir, 'd2l_chrome_profile');
    
    if (fs.existsSync(profileDir)) {
      fs.rmSync(profileDir, { recursive: true, force: true });
    }

    res.json({ 
      success: true, 
      message: 'Login session cleared' 
    });

  } catch (error) {
    console.error('Clear error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        error: 'File too large' 
      });
    }
  }
  
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`D2L Backend API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
