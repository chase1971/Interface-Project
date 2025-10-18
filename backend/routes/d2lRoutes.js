const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');

const router = express.Router();

// =======================================================
// 📦 Multer setup (same as before)
// =======================================================
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

// =======================================================
// 🧠 LOGIN ROUTE — Chrome + Python (fixed)
// =======================================================
router.post('/login', (req, res) => {
  try {
    const userDataDir = path.join('C:', 'Users', 'chase', 'Documents', 'Shared-Browser-Data');
    const d2lUrl = "https://d2l.lonestar.edu/";
    const pythonScript = path.join(__dirname, '..', '..', '..', 'D2L-Macro', 'd2l_playwright_processor.py');

    console.log('🚀 Launching Chrome for D2L login...');
    exec(
      `start "" /max chrome --user-data-dir="${userDataDir}" --remote-debugging-port=9223 --window-position=100,100 --window-size=1920,1080 "${d2lUrl}"`,
      (error, stdout, stderr) => {
        if (error) {
          console.error('Browser launch error:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to launch Chrome: ' + error.message
          });
        }

        // ✅ Immediately tell frontend Chrome is open
        console.log('✅ Chrome launched successfully. Returning response.');
        res.json({
          success: true,
          message: 'Chrome launched — please log in manually to D2L.'
        });

        // 🐍 Run Python script silently in background
        console.log('🐍 Starting D2L Python automation agent...');
        const python = spawn('python', [pythonScript, 'login'], {
          cwd: path.join(__dirname, '..', '..', '..', 'D2L-Macro'),
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });

        python.stdout.on('data', data => console.log('[PYTHON STDOUT]', data.toString()));
        python.stderr.on('data', data => console.error('[PYTHON STDERR]', data.toString()));
        python.on('close', code => console.log(`🐍 Python process exited with code ${code}`));
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =======================================================
// 🧩 Everything else below unchanged
// =======================================================

// Select class using same persistent session
router.post('/select-class', (req, res) => {
  try {
    const { classCode } = req.body;
    if (!classCode) return res.status(400).json({ success: false, error: 'Missing classCode' });

    const pythonScript = path.join(__dirname, '..', '..', '..', 'D2L-Macro', 'd2l_playwright_processor.py');
    const python = spawn('python', [pythonScript, 'open-course', classCode]);

    python.stdout.on('data', data => console.log(data.toString()));
    python.stderr.on('data', data => console.error(data.toString()));

    python.on('close', code => {
      if (code === 0) {
        res.json({ success: true, message: `Opened ${classCode} in persistent browser` });
      } else {
        res.status(500).json({ success: false, error: `Course open failed with code ${code}` });
      }
    });
  } catch (error) {
    console.error('Class selection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload CSV
router.post('/upload', upload.single('csvFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No CSV file provided' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    res.json({ success: true, filePath, fileName, message: 'CSV file uploaded successfully' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process CSV with D2L Playwright automation
router.post('/process', (req, res) => {
  try {
    const { csvFilePath, classUrl } = req.body;

    if (!csvFilePath || !fs.existsSync(csvFilePath)) {
      return res.status(400).json({ success: false, error: 'CSV file not found at: ' + csvFilePath });
    }

    const cliScript = path.join(__dirname, '..', '..', '..', 'D2L-Macro', 'd2l_playwright_processor.py');
    if (!fs.existsSync(cliScript)) {
      return res.status(404).json({ success: false, error: 'D2L CLI script not found at: ' + cliScript });
    }

    console.log('Starting D2L date processing...');
    const pythonProcess = spawn('python', [cliScript, 'process', classUrl, csvFilePath], {
      cwd: path.join(__dirname, '..', '..', 'D2L-Macro'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', data => {
      const text = data.toString();
      output += text;
      console.log('Python stdout:', text);
    });

    pythonProcess.stderr.on('data', data => {
      const text = data.toString();
      errorOutput += text;
      console.error('Python stderr:', text);
    });

    pythonProcess.on('close', code => {
      console.log('Python process exited with code:', code);
      if (code === 0) {
        const lines = output.split('\n').filter(l => l.trim());
        let jsonResult = null;
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            jsonResult = JSON.parse(lines[i]);
            break;
          } catch (_) {}
        }
        if (jsonResult) {
          res.json(jsonResult);
        } else {
          res.json({ success: false, error: 'No valid JSON result found', output, errorOutput });
        }
      } else {
        res.json({ success: false, error: 'Process failed with exit code ' + code, output, errorOutput });
      }
    });
  } catch (error) {
    console.error('Process error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// 🧹 CLEAR LOGIN SESSION (Frontend Reset Only)
// ========================================
router.post('/clear', (req, res) => {
  try {
    // ✅ Don't delete browser data — just reset frontend state
    console.log('🔄 Clear login request received — resetting frontend state only.');
    res.json({
      success: true,
      message: 'Frontend login state reset — browser session preserved.'
    });
  } catch (error) {
    console.error('Clear error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
