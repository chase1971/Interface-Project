const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const router = express.Router();

// Configure multer for CSV uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
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

// Login to D2L
router.post('/login', (req, res) => {
  try {
    const { classUrl } = req.body;
    
    // Launch Chrome directly with shared browser data (exactly like makeup exam macro)
    const { exec } = require('child_process');
    const userDataDir = path.join(__dirname, '..', '..', '..', 'Make-Up-Exam-Macro', 'browser_data');
    
    // Start Chrome with persistent profile AND debugging enabled - browser stays open
    exec(`start "" /max chrome --user-data-dir="${userDataDir}" --remote-debugging-port=9223 --window-position=100,100 --window-size=1920,1080 "${classUrl}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Browser launch error:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to launch browser: ' + error.message 
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
router.post('/select-class', (req, res) => {
  try {
    const { classUrl } = req.body;
    
    // Open the class URL in the existing Chrome browser (like makeup exam macro)
    const { exec } = require('child_process');
    exec(`start "" "${classUrl}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Class navigation error:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to navigate to class: ' + error.message 
        });
      }
      res.json({ 
        success: true, 
        message: 'Class opened in browser - Ready for CSV processing',
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

// Upload CSV file
router.post('/upload', upload.single('csvFile'), (req, res) => {
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
router.post('/process', (req, res) => {
  try {
    const { csvFilePath, classUrl } = req.body;

    if (!csvFilePath || !fs.existsSync(csvFilePath)) {
      return res.status(400).json({ 
        success: false, 
        error: 'CSV file not found at: ' + csvFilePath
      });
    }

    // Use the dedicated CLI script
    const cliScript = path.join(__dirname, '..', '..', '..', 'D2L-Macro', 'd2l_playwright_processor.py');
    
    if (!fs.existsSync(cliScript)) {
      return res.status(404).json({ 
        success: false, 
        error: 'D2L CLI script not found at: ' + cliScript
      });
    }

    console.log('Starting D2L date processing...');
    console.log('CSV File:', csvFilePath);
    console.log('Class URL:', classUrl);

    // Execute the CLI script with new command structure
    const pythonProcess = spawn('python', [cliScript, 'process', classUrl, csvFilePath], {
      cwd: path.join(__dirname, '..', '..', 'D2L-Macro'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log('Python stdout:', text);
    });

    pythonProcess.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      console.log('Python stderr:', text);
    });

    pythonProcess.on('close', (code) => {
      console.log('Python process exited with code:', code);
      
      if (code === 0) {
        try {
          // Extract JSON from output (last line that's valid JSON)
          const lines = output.split('\n').filter(l => l.trim());
          let jsonResult = null;
          
          for (let i = lines.length - 1; i >= 0; i--) {
            try {
              jsonResult = JSON.parse(lines[i]);
              break;
            } catch (e) {
              continue;
            }
          }
          
          if (jsonResult) {
            res.json(jsonResult);
          } else {
            res.json({ 
              success: false, 
              error: 'No valid JSON result found',
              output: output,
              errorOutput: errorOutput
            });
          }
        } catch (e) {
          res.json({ 
            success: false, 
            error: 'Failed to parse result: ' + e.message,
            output: output,
            errorOutput: errorOutput
          });
        }
      } else {
        res.json({ 
          success: false, 
          error: 'Process failed with exit code ' + code,
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

// Open file browser to specified directory
router.post('/browse', (req, res) => {
  try {
    const { directory } = req.body;
    const targetDirectory = directory || path.join(__dirname, '..', '..', 'D2L-Macro');
    
    // Open Windows Explorer to the specified directory
    const { exec } = require('child_process');
    exec(`start "" "${targetDirectory}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Explorer open error:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to open directory: ' + error.message 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'File browser opened to specified directory',
        directory: targetDirectory
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

// Clear login session
router.post('/clear', (req, res) => {
  try {
    // Clear Chrome profile data from shared directory
    const userDataDir = path.join(__dirname, '..', '..', '..', 'Make-Up-Exam-Macro', 'browser_data');
    
    if (fs.existsSync(userDataDir)) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
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

module.exports = router;
