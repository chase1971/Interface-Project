const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'File Extractor route is working' });
});

// List available classes from Rosters etc folder
router.post('/list-classes', (req, res) => {
  try {
    const { drive } = req.body;
    console.log('File Extractor list-classes called with drive:', drive);
    
    const rostersPath = path.join(`${drive}:\\`, 'Users', 'chase', 'My Drive', 'Rosters etc');
    console.log('Looking for rosters at:', rostersPath);
    
    if (!fs.existsSync(rostersPath)) {
      console.log('Rosters path does not exist:', rostersPath);
      return res.status(404).json({ 
        success: false, 
        error: `Rosters etc folder not found at ${rostersPath}` 
      });
    }

    console.log('Rosters path exists, reading directories...');
    
    // Read all subdirectories
    const folders = fs.readdirSync(rostersPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log('Found folders:', folders);

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

    console.log('Filtered classes:', classes);

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

// Process file extraction (extract ZIP, combine PDFs, prepare for grading)
router.post('/process', (req, res) => {
  try {
    const { drive, className } = req.body;

    if (!drive || !className) {
      return res.status(400).json({ 
        success: false, 
        error: 'Drive and class name are required' 
      });
    }

    // Path to the file extraction CLI script
    const scriptPath = path.resolve(__dirname, '..', '..', '..', 'File-extraction', 'file_extraction_cli.py');
    
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ 
        success: false, 
        error: `File extraction script not found at ${scriptPath}` 
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
          message: 'File extraction completed',
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
    console.error('Process file extraction error:', error);
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

    // Path to the cleanup CLI script
    const scriptPath = path.resolve(__dirname, '..', '..', '..', 'File-extraction', 'cleanup_data_cli.py');
    
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
