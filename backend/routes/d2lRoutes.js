const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');

const router = express.Router();

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
    const pythonScript = path.join('C:', 'Users', 'chase', 'Documents', 'School Scrips', 'D2L-Macro', 'd2l_playwright_processor.py');

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
        const python = spawn('python', [pythonScript, 'login'], {
          cwd: path.join('C:', 'Users', 'chase', 'Documents', 'School Scrips', 'D2L-Macro'),
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        });

        python.stdout.on('data', (d) => console.log('[PYTHON STDOUT]', d.toString().trim()));
        python.stderr.on('data', (d) => console.error('[PYTHON STDERR]', d.toString().trim()));
        python.on('close', (c) => console.log(`🐍 Python exited with code ${c}`));
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

    const pythonScript = path.join('C:', 'Users', 'chase', 'Documents', 'School Scrips', 'D2L-Macro', 'd2l_playwright_processor.py');
    
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
      const python = spawn('python', [pythonScript, 'open-course', classCode], {
        cwd: path.join('C:', 'Users', 'chase', 'Documents', 'School Scrips', 'D2L-Macro'),
        detached: true,
        stdio: 'ignore', // <— Don't attach stdout/stderr to prevent crashes
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
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

    const cliScript = path.join('C:', 'Users', 'chase', 'Documents', 'School Scrips', 'D2L-Macro', 'd2l_playwright_processor.py');
    if (!fs.existsSync(cliScript))
      return res.status(404).json({ success: false, error: 'D2L CLI script not found: ' + cliScript });

    console.log('▶️ Starting D2L date processing...');
    const python = spawn('python', [cliScript, 'process', classUrl, csvFilePath], {
      cwd: path.join('C:', 'Users', 'chase', 'Documents', 'School Scrips', 'D2L-Macro'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => (output += data.toString()));
    python.stderr.on('data', (data) => (errorOutput += data.toString()));

    python.on('close', (code) => {
      console.log(`📄 Python process exited with code: ${code}`);
      if (code === 0) {
        try {
          const lastLine = output.trim().split('\n').pop();
          const parsed = JSON.parse(lastLine);
          res.json(parsed);
        } catch {
          res.json({ success: true, message: 'Processing complete', rawOutput: output });
        }
      } else {
        res.status(500).json({ success: false, error: 'Process failed', output, errorOutput });
      }
    });
  } catch (error) {
    console.error('Process error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/process_schedule', (req, res) => {
  try {
    const { classCode } = req.body;
    if (!classCode) {
      return res.status(400).json({ success: false, error: 'Missing classCode' });
    }

    // For now we only support CA4105's fixed CSV path
    const csvPath = 'C:\\Users\\chase\\My Drive\\Rosters etc\\MW 930-1050 CA 4105\\CA 4105 D2L Dates.csv';
    if (classCode !== 'CA4105') {
      return res.status(400).json({ success: false, error: 'CSV path configured only for CA4105 at the moment.' });
    }
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ success: false, error: 'CSV file not found at: ' + csvPath });
    }

    const classUrls = {
      FM4202: "https://d2l.lonestar.edu/d2l/lms/manageDates/date_manager.d2l?fromCMC=1&ou=1580392",
      FM4103: "https://d2l.lonestar.edu/d2l/lms/manageDates/date_manager.d2l?fromCMC=1&ou=1580390",
      CA4203: "https://d2l.lonestar.edu/d2l/lms/manageDates/date_manager.d2l?fromCMC=1&ou=1580436",
      CA4201: "https://d2l.lonestar.edu/d2l/lms/manageDates/date_manager.d2l?fromCMC=1&ou=1580434",
      CA4105: "https://d2l.lonestar.edu/d2l/lms/manageDates/date_manager.d2l?fromCMC=1&ou=1580431",
    };

    const classUrl = classUrls[classCode];
    if (!classUrl) {
      return res.status(400).json({ success: false, error: 'Unknown classCode: ' + classCode });
    }

    const cliScript = path.join(
      'C:\\', 'Users', 'chase', 'Documents', 'School Scrips', 'D2L-Macro', 'd2l_playwright_processor.py'
    );

    console.log('▶️ Starting D2L date processing for', classCode);
    const python = spawn('python', [cliScript, 'process', classUrl, csvPath], {
      cwd: path.dirname(cliScript),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
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
// 📂 OPEN CSV FILE
// =======================================================
router.get('/open_csv', (req, res) => {
  const csvPath = 'C:\\Users\\chase\\My Drive\\Rosters etc\\MW 930-1050 CA 4105\\CA 4105 D2L Dates.csv';
  exec(`start "" "${csvPath}"`, (err) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    return res.json({ success: true, message: 'CSV opened successfully.' });
  });
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
