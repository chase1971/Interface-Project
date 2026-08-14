const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, exec } = require('child_process');

const router = express.Router();

// Python executable - use 'python' and let shell resolve it
const PYTHON_CMD = 'python';

// Ensure UTF-8 encoding for Python processes (fixes emoji logging issues on Windows)
const PYTHON_ENV = {
  ...process.env,
  PYTHONIOENCODING: 'utf-8',
  PYTHONUTF8: '1'
};

// =======================================================
// 📦 Multer setup
// =======================================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) cb(null, true);
    else cb(new Error('Only CSV files are allowed'), false);
  },
});

// =======================================================
// 🧠 LOGIN — launches Chrome with persistent context
// =======================================================
router.post('/login', (req, res) => {
  try {
    const userDataDir = path.join('C:', 'Users', 'chase', 'Documents', 'Shared-Browser-Data');
    const d2lUrl = 'https://d2l.lonestar.edu/';
    const pythonScript = path.join('C:', 'Users', 'chase', 'Documents', 'Programs', 'School Scrips', 'D2L-Macro', 'd2l_playwright_processor.py');

    console.log('🚀 Launching Chrome for D2L login...');
    exec(
      `start "" /max chrome --user-data-dir="${userDataDir}" --remote-debugging-port=9223 --window-position=100,100 --window-size=1920,1080 "${d2lUrl}"`,
      (error) => {
        if (error) {
          console.error('Browser launch error:', error);
          return res.status(500).json({ success: false, error: 'Failed to launch Chrome: ' + error.message });
        }

        res.json({ success: true, message: 'Chrome launched — please log in manually to D2L.' });

        // 🐍 Launch Python agent silently
        try {
          // Quote the script path because of spaces in "School Scrips"
          const python = spawn(PYTHON_CMD, [`"${pythonScript}"`, 'login'], {
            cwd: path.join('C:', 'Users', 'chase', 'Documents', 'Programs', 'School Scrips', 'D2L-Macro'),
            stdio: ['pipe', 'pipe', 'pipe'],
            env: PYTHON_ENV,
            shell: true
          });

          python.on('error', (err) => {
            console.error('[PYTHON ERROR]', err);
          });

          python.stdout.on('data', (d) => console.log('[PYTHON STDOUT]', d.toString().trim()));
          python.stderr.on('data', (d) => console.error('[PYTHON STDERR]', d.toString().trim()));
          python.on('close', (c) => console.log(`🐍 Python exited with code ${c}`));
        } catch (spawnError) {
          console.error('Failed to spawn Python:', spawnError);
        }
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =======================================================
// 🏫 SELECT CLASS — fixed to ensure clean JSON output
// =======================================================
router.post('/select-class', (req, res) => {
  try {
    const { classCode } = req.body;
    if (!classCode) {
      return res.status(400).json({ success: false, error: 'Missing classCode' });
    }

    const pythonScript = path.join('C:', 'Users', 'chase', 'Documents', 'Programs', 'School Scrips', 'D2L-Macro', 'd2l_playwright_processor.py');
    
    // Verify the Python script exists before trying to spawn it
    if (!fs.existsSync(pythonScript)) {
      console.error(`❌ Python script not found at: ${pythonScript}`);
      return res.status(404).json({ 
        success: false, 
        error: `Python script not found at: ${pythonScript}` 
      });
    }

    console.log(`🔹 Opening course for: ${classCode}`);

    // 🔧 Fully detached process (prevents stdout from corrupting response)
    try {
      // Quote the script path because of spaces in "School Scrips"
      const python = spawn(PYTHON_CMD, [`"${pythonScript}"`, 'open-course', classCode], {
        cwd: path.join('C:', 'Users', 'chase', 'Documents', 'Programs', 'School Scrips', 'D2L-Macro'),
        detached: true,
        stdio: 'ignore', // <— Don't attach stdout/stderr to prevent crashes
        env: PYTHON_ENV,
        shell: true
      });

      // Handle process errors without crashing the server
      python.on('error', (error) => {
        console.error('❌ Python process error:', error);
        // Don't send response here - it may have already been sent
      });

      python.on('exit', (code, signal) => {
        if (code !== 0 && code !== null) {
          console.log(`🐍 Python process exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`);
        }
      });

      python.unref(); // <— let it run completely independent

      // Immediately send clean JSON (don't wait for Python to finish):
      return res.json({ success: true, message: `Opened ${classCode} in persistent browser` });
    } catch (spawnError) {
      console.error('Failed to spawn Python process:', spawnError);
      return res.status(500).json({ 
        success: false, 
        error: `Failed to start Python process: ${spawnError.message}` 
      });
    }
  } catch (error) {
    console.error('Class selection error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =======================================================
// 📁 UPLOAD CSV FILE
// =======================================================
router.post('/upload', upload.single('csvFile'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No CSV file provided' });
    const filePath = req.file.path;
    res.json({ success: true, filePath, message: 'CSV file uploaded successfully' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =======================================================
// ⚙️ PROCESS CSV WITH D2L PLAYWRIGHT AUTOMATION
// =======================================================
router.post('/process', (req, res) => {
  try {
    const { csvFilePath, classUrl } = req.body;
    if (!csvFilePath || !fs.existsSync(csvFilePath))
      return res.status(400).json({ success: false, error: 'CSV file not found: ' + csvFilePath });

    const cliScript = path.join('C:', 'Users', 'chase', 'Documents', 'Programs', 'School Scrips', 'D2L-Macro', 'd2l_playwright_processor.py');
    if (!fs.existsSync(cliScript))
      return res.status(404).json({ success: false, error: 'D2L CLI script not found: ' + cliScript });

    console.log('▶️ Starting D2L date processing...');
    console.log('   📄 CSV File:', csvFilePath);
    console.log('   🔗 Class URL:', classUrl);
    console.log('   🐍 Python Script:', cliScript);
    
    // Build the command with properly escaped arguments
    // Using a batch file approach to handle spaces and special characters
    const batchCommand = `@echo off
cd /d "${path.dirname(cliScript)}"
python "${path.basename(cliScript)}" process "${classUrl}" "${csvFilePath}"
echo.
echo Process completed. Press any key to close...
pause`;
    
    // Write the batch command to a temp file
    const tempBatch = path.join(path.dirname(cliScript), 'run_d2l_process.bat');
    fs.writeFileSync(tempBatch, batchCommand);
    
    // Launch the batch file in a visible window
    const launchCommand = `start "D2L Processing" cmd /k "${tempBatch}"`;
    
    console.log('   🚀 Launching visible console window...');
    
    exec(launchCommand, (error) => {
      if (error) {
        console.error('❌ Failed to start Python process:', error);
      } else {
        console.log('✅ Python process window opened');
      }
      // Clean up temp batch file after a delay
      setTimeout(() => {
        try {
          if (fs.existsSync(tempBatch)) {
            fs.unlinkSync(tempBatch);
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      }, 5000);
    });
    
    // Immediately respond to the frontend
    res.json({ 
      success: true, 
      message: 'Processing started in separate console window. Watch the console for progress.' 
    });
  } catch (error) {
    console.error('Process error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/process_schedule', (req, res) => {
  try {
    const { classCode } = req.body;
    if (!classCode) {
      return res.status(400).json({ success: false, error: 'Missing classCode' });
    }

    // For now we only support FM4203's fixed CSV path (formerly CA4105)
    const csvPath = 'C:\\Users\\chase\\My Drive\\Rosters etc\\MW 930-1050 CA 4105\\CA 4105 D2L Dates.csv';
    if (classCode !== 'FM4203') {
      return res.status(400).json({ success: false, error: 'CSV path configured only for FM4203 at the moment.' });
    }
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ success: false, error: 'CSV file not found at: ' + csvPath });
    }

    const classUrls = {
      FM4101: "https://d2l.lonestar.edu/d2l/lms/manageDates/date_manager.d2l?fromCMC=1&ou=1616943",
      CA4101: "https://d2l.lonestar.edu/d2l/lms/manageDates/date_manager.d2l?fromCMC=1&ou=1617029",
      FM4201: "https://d2l.lonestar.edu/d2l/lms/manageDates/date_manager.d2l?fromCMC=1&ou=1616946",
      FM4203: "https://d2l.lonestar.edu/d2l/lms/manageDates/date_manager.d2l?fromCMC=1&ou=1616948",
    };

    const classUrl = classUrls[classCode];
    if (!classUrl) {
      return res.status(400).json({ success: false, error: 'Unknown classCode: ' + classCode });
    }

    const cliScript = path.join(
      'C:\\', 'Users', 'chase', 'Documents', 'Programs', 'School Scrips', 'D2L-Macro', 'd2l_playwright_processor.py'
    );

    console.log('▶️ Starting D2L date processing for', classCode);
    // Quote the script path because of spaces in "School Scrips"
    const python = spawn(PYTHON_CMD, [`"${cliScript}"`, 'process', classUrl, csvPath], {
      cwd: path.dirname(cliScript),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: PYTHON_ENV,
      shell: true
    });

    let out = '', err = '';
    python.stdout.on('data', d => out += d.toString());
    python.stderr.on('data', d => err += d.toString());

    python.on('close', code => {
      if (code === 0) {
        // Try to parse a trailing JSON line if your Python emits one; otherwise send success
        try {
          const last = out.trim().split('\n').pop();
          const parsed = JSON.parse(last);
          return res.json(parsed);
        } catch {
          return res.json({ success: true, message: 'Processing complete', rawOutput: out });
        }
      } else {
        return res.status(500).json({ success: false, error: 'Process failed', output: out, errorOutput: err });
      }
    });
  } catch (error) {
    console.error('process_schedule error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =======================================================
// 🧹 CLEAR LOGIN SESSION
// =======================================================
router.post('/clear', (req, res) => {
  try {
    console.log('🔄 Clear login request received');
    res.json({ success: true, message: 'Frontend login state reset — browser session preserved.' });
  } catch (error) {
    console.error('Clear error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =======================================================
// 📂 OPEN CSV FILE (Opens File Explorer to browse for CSV)
// =======================================================
router.get('/open_csv', (req, res) => {
  try {
    // Open File Explorer to the likely folder location
    // User can then navigate to find their CSV file
    const folderPath = 'C:\\Users\\chase\\My Drive\\Rosters etc';
    
    // Check if folder exists, otherwise use fallback
    let targetPath = folderPath;
    if (!fs.existsSync(folderPath)) {
      targetPath = path.join(os.homedir(), 'Documents');
      console.log(`📂 Primary folder not found, using fallback: ${targetPath}`);
    }
    
    console.log(`📂 Opening File Explorer to: ${targetPath}`);
    
    // Open the folder in Windows Explorer
    // Use 'start' command which works better on Windows
    const command = process.platform === 'win32' 
      ? `start "" "${targetPath}"`
      : `explorer "${targetPath}"`;
    
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error('Failed to open file explorer:', err);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to open file explorer: ' + err.message 
        });
      }
      console.log('✅ File Explorer opened successfully');
      return res.json({ 
        success: true, 
        message: 'File Explorer opened. Please navigate to find your CSV file.' 
      });
    });
  } catch (error) {
    console.error('Open CSV error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// =======================================================
// 📂 OPEN CSV FILE / FOLDER (Restored)
// =======================================================
router.post('/browse', (req, res) => {
  try {
    const { directory } = req.body;
    if (!directory) return res.status(400).json({ success: false, error: 'Missing directory path' });

    console.log(`📂 Opening folder: ${directory}`);
    exec(`start "" "${directory}"`, (error) => {
      if (error) {
        console.error('Failed to open folder:', error);
        return res.status(500).json({ success: false, error: error.message });
      }
      res.json({ success: true, message: `Opened folder: ${directory}` });
    });
  } catch (error) {
    console.error('Browse error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
