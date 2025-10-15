const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const router = express.Router();

// Configure multer for exam file uploads
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
    // Allow PDF files for exam automation
    if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for exam automation'), false);
    }
  }
});

// Login to makeup exam system
router.post('/login', (req, res) => {
  try {
    // Launch Chrome with persistent profile for exam automation
    const { exec } = require('child_process');
    const userDataDir = path.join(__dirname, '..', '..', '..', '..', 'Shared-Browser-Data', 'Make-Up-Exam-Macro-browser_data');
    
    // Start Chrome with persistent profile AND debugging enabled - browser stays open
    exec(`start "" /max chrome --user-data-dir="${userDataDir}" --remote-debugging-port=9222 --window-position=100,100 --window-size=1920,1080 "https://my.lonestar.edu/psp/ihprd/EMPLOYEE/EMPL/c/LSC_TCR.LSC_TCRFORMS.GBL"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Browser launch error:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to launch browser: ' + error.message 
        });
      }
      res.json({ 
        success: true, 
        message: 'Browser opened - Please log in manually to Lonestar system' 
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

// Open CSV file
router.post('/open-csv', (req, res) => {
  try {
    const csvPath = "C:\\Users\\chase\\My Drive\\Rosters etc\\Email Templates, Assignment Dates\\Students.csv";
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Students.csv file not found' 
      });
    }

    // Open CSV file
    const { exec } = require('child_process');
    exec(`start "" "${csvPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('CSV open error:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to open CSV file: ' + error.message 
        });
      }
      res.json({ 
        success: true, 
        message: 'CSV file opened' 
      });
    });

  } catch (error) {
    console.error('CSV open error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Load CSV data
router.post('/load-csv', (req, res) => {
  try {
    const csvPath = "C:\\Users\\chase\\My Drive\\Rosters etc\\Email Templates, Assignment Dates\\Students.csv";
    
    console.log('🔍 LOAD-CSV: Looking for CSV at:', csvPath);
    console.log('🔍 LOAD-CSV: File exists?', fs.existsSync(csvPath));
    
    if (!fs.existsSync(csvPath)) {
      console.log('❌ LOAD-CSV: CSV file not found at:', csvPath);
      return res.status(404).json({ 
        success: false, 
        error: 'Students.csv file not found' 
      });
    }
    
    console.log('✅ LOAD-CSV: CSV file found, reading contents...');

    // Read CSV content
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 4) {
      return res.status(400).json({ 
        success: false, 
        error: 'CSV file must have at least 4 rows (header, term/exam, student headers, data)' 
      });
    }

    // Parse CSV data
    const headerRow = lines[0].split(',').map(x => x.trim());
    const dataRow = lines[1].split(',').map(x => x.trim());
    const studentHeaders = lines[2].split(',').map(x => x.trim());
    const studentData = lines.slice(3)
      .filter(line => line.trim() && line.split(',').some(value => value.trim())) // Filter out empty lines
      .map(line => {
        const values = line.split(',').map(x => x.trim());
        const student = {};
        studentHeaders.forEach((header, index) => {
          student[header] = values[index] || '';
        });
        return student;
      })
      .filter(student => student.Class && student.Name); // Filter out students without required fields

    res.json({ 
      success: true, 
      term: dataRow[headerRow.indexOf('Term')] || '',
      exam: dataRow[headerRow.indexOf('Exam')] || '',
      students: studentData
    });

  } catch (error) {
    console.error('CSV load error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Start automation process
router.post('/start-automation', upload.single('examFile'), (req, res) => {
  try {
    console.log('🚀 START-AUTOMATION: Route called!');
    console.log('🚀 START-AUTOMATION: Request file:', req.file);
    
    if (!req.file) {
      console.log('❌ START-AUTOMATION: No exam file provided');
      return res.status(400).json({ 
        success: false, 
        error: 'No exam file provided' 
      });
    }

    const examFilePath = req.file.path;
    const automationScriptPath = path.join(__dirname, '..', '..', '..', 'Make-Up-Exam-Macro', 'automation_agent.py');
    
    if (!fs.existsSync(automationScriptPath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Automation script not found at: ' + automationScriptPath
      });
    }

    console.log('🚀 Starting exam automation...');
    console.log('📁 Exam File:', examFilePath);
    console.log('🐍 Script:', automationScriptPath);
    console.log('🔍 Script exists?', require('fs').existsSync(automationScriptPath));

    // Execute the automation script with macro directory and exam file
    const macroDir = path.join(__dirname, '..', '..', '..', 'Make-Up-Exam-Macro');
    console.log('📂 Macro Directory:', macroDir);
    console.log('📂 Macro Dir exists?', require('fs').existsSync(macroDir));
    console.log('🐍 Running: python', automationScriptPath, macroDir, examFilePath);
    console.log('🐍 Working directory:', path.join(__dirname, '..', '..', '..', 'Make-Up-Exam-Macro'));
    
    console.log('🐍 SPAWNING PYTHON PROCESS...');
    console.log('🐍 PYTHON COMMAND: python', automationScriptPath, macroDir, examFilePath);
    console.log('🐍 WORKING DIRECTORY:', path.join(__dirname, '..', '..', '..', 'Make-Up-Exam-Macro'));
    
    const pythonProcess = spawn('python', [automationScriptPath, macroDir, examFilePath], {
      cwd: path.join(__dirname, '..', '..', '..', 'Make-Up-Exam-Macro'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    console.log('🐍 PYTHON PROCESS SPAWNED, PID:', pythonProcess.pid);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('🐍 PYTHON STDOUT:', data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log('🐍 PYTHON STDERR:', data.toString());
    });

    pythonProcess.on('error', (error) => {
      console.log('❌ PYTHON PROCESS ERROR:', error);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Automation process exited with code ${code}`);
      
      // Combine stdout and stderr for complete debug output
      const fullOutput = stdout + '\n' + stderr;
      
      if (code === 0) {
        res.json({ 
          success: true, 
          message: 'Exam automation completed successfully',
          output: fullOutput,
          debug: {
            stdout: stdout,
            stderr: stderr,
            exitCode: code
          }
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Automation failed',
          details: fullOutput,
          debug: {
            stdout: stdout,
            stderr: stderr,
            exitCode: code
          }
        });
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('Process error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to start automation: ' + error.message 
      });
    });

  } catch (error) {
    console.error('Automation start error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Clear makeup exam session
router.post('/clear', (req, res) => {
  try {
    // Clear any session data if needed
    res.json({ 
      success: true, 
      message: 'Makeup exam session cleared'
    });
  } catch (error) {
    console.error('Clear session error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
