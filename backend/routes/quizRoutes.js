const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const router = express.Router();

// List available classes from Rosters etc folder
router.post('/list-classes', (req, res) => {
  try {
    const { drive } = req.body;
    const rostersPath = path.join(`${drive}:\\`, 'Users', 'chase', 'My Drive', 'Rosters etc');
    
    if (!fs.existsSync(rostersPath)) {
      return res.status(404).json({ 
        success: false, 
        error: `Rosters etc folder not found at ${rostersPath}` 
      });
    }

    // Read all subdirectories
    const folders = fs.readdirSync(rostersPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    // Filter folders that end with class codes (e.g., "FM 4103")
    const classPattern = /[A-Z]{2}\s\d{4}$/;
    const classes = folders
      .filter(folder => classPattern.test(folder))
      .map(folder => {
        // Extract the class code from the end
        const match = folder.match(/([A-Z]{2}\s\d{4})$/);
        return {
          code: match ? match[1] : folder,
          fullPath: folder
        };
      });

    res.json({ 
      success: true, 
      classes: classes,
      message: `Found ${classes.length} classes` 
    });

  } catch (error) {
    console.error('List classes error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Process quizzes (extract ZIP, combine PDFs, prepare for grading)
router.post('/process', (req, res) => {
  try {
    const { drive, className } = req.body;

    if (!drive || !className) {
      return res.status(400).json({ 
        success: false, 
        error: 'Drive and class name are required' 
      });
    }

    // Path to the process quiz CLI script - using absolute path
    console.log('DEBUG: __dirname =', __dirname);
    console.log('DEBUG: path.resolve(__dirname) =', path.resolve(__dirname));
    const scriptPath = path.resolve(__dirname, '..', '..', '..', 'Quiz-extraction', 'process_quiz_cli.py');
    
    console.log('Looking for script at:', scriptPath);
    console.log('Script exists:', fs.existsSync(scriptPath));
    
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ 
        success: false, 
        error: `Grading processor script not found at ${scriptPath}` 
      });
    }

    // Execute Python script
    const pythonProcess = spawn('python', [
      scriptPath,
      drive,
      className
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let output = '';
    let errorOutput = '';
    const logs = [];

    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Parse logs line by line
      text.split('\n').forEach(line => {
        if (line.trim()) {
          logs.push(line.trim());
        }
      });
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        res.json({ 
          success: true, 
          message: 'Quiz processing completed',
          logs: logs,
          output: output
        });
      } else {
        res.json({ 
          success: false, 
          error: 'Process failed',
          logs: logs,
          output: output,
          errorOutput: errorOutput
        });
      }
    });

  } catch (error) {
    console.error('Process quizzes error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Extract grades from graded PDF
router.post('/extract-grades', (req, res) => {
  try {
    const { drive, className } = req.body;

    if (!drive || !className) {
      return res.status(400).json({ 
        success: false, 
        error: 'Drive and class name are required' 
      });
    }

    // Path to the extract grades CLI script - using absolute path
    const scriptPath = path.resolve(__dirname, '..', '..', '..', 'Quiz-extraction', 'extract_grades_cli.py');
    
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Extract grades script not found' 
      });
    }

    // Execute Python script
    const pythonProcess = spawn('python', [
      scriptPath,
      drive,
      className
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let output = '';
    let errorOutput = '';
    const logs = [];

    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Parse logs line by line
      text.split('\n').forEach(line => {
        if (line.trim()) {
          logs.push(line.trim());
        }
      });
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        res.json({ 
          success: true, 
          message: 'Grade extraction completed',
          logs: logs,
          output: output
        });
      } else {
        res.json({ 
          success: false, 
          error: 'Extraction failed',
          logs: logs,
          output: output,
          errorOutput: errorOutput
        });
      }
    });

  } catch (error) {
    console.error('Extract grades error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Clear all processing data (delete grade processing folder and ZIP file)
router.post('/clear-data', (req, res) => {
  try {
    const { drive, className } = req.body;

    if (!drive || !className) {
      return res.status(400).json({ 
        success: false, 
        error: 'Drive and class name are required' 
      });
    }

    // Path to the cleanup CLI script - using absolute path
    const scriptPath = path.resolve(__dirname, '..', '..', '..', 'Quiz-extraction', 'cleanup_data_cli.py');
    
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cleanup script not found' 
      });
    }

    // Execute Python script
    const pythonProcess = spawn('python', [
      scriptPath,
      drive,
      className
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let output = '';
    let errorOutput = '';
    const logs = [];

    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Parse logs line by line
      text.split('\n').forEach(line => {
        if (line.trim()) {
          logs.push(line.trim());
        }
      });
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        res.json({ 
          success: true, 
          message: 'Data cleanup completed',
          logs: logs,
          output: output
        });
      } else {
        res.json({ 
          success: false, 
          error: 'Cleanup failed',
          logs: logs,
          output: output,
          errorOutput: errorOutput
        });
      }
    });

  } catch (error) {
    console.error('Clear data error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
