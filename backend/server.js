const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 5000;

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
    // Keep original filename without timestamp prefix
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Allow CSV files for D2L interface and PDF files for makeup exam interface
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv') ||
        file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and PDF files are allowed'), false);
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
    
    // Open Chrome browser with D2L login URL (new window, positioned on left secondary monitor)
    exec(`start "" /max chrome --window-position=-1920,0 --window-size=1920,1080 "${classUrl}"`, (error, stdout, stderr) => {
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
    
    // Open Chrome browser with class URL (new window, positioned on left secondary monitor)
    exec(`start "" /max chrome --window-position=-1920,0 --window-size=1920,1080 "${classUrl}"`, (error, stdout, stderr) => {
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

// Open file browser to specified directory
app.post('/api/d2l/browse', (req, res) => {
  try {
    const { directory } = req.body;
    const targetDirectory = directory || path.join(__dirname, '..', '..', 'D2L Macro');
    
    // Open Windows Explorer to the specified directory (handle spaces properly)
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

// ===== MAKEUP EXAM INTERFACE API ENDPOINTS =====

// Login to makeup exam system
app.post('/api/makeup/login', (req, res) => {
  try {
    const loginUrl = "https://my.lonestar.edu/psp/ihprd/?cmd=login";
    
    // Open Chrome browser with debugging port enabled
    const { exec } = require('child_process');
          const chromeCommand = `start "" /max chrome --remote-debugging-port=9222 --user-data-dir="%TEMP%\\chrome_debug" --window-position=-1920,0 --window-size=1920,1080 "${loginUrl}"`;
    
    exec(chromeCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('Browser open error:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to open browser: ' + error.message 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Browser opened with debugging - Please log in manually' 
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

// Open CSV file for editing
app.post('/api/makeup/open-csv', (req, res) => {
  try {
    const csvPath = path.join(__dirname, '..', '..', 'Make-Up-Exam-Macro', 'Students.csv');
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Students.csv file not found' 
      });
    }

    // Open CSV file with default application
    const { exec } = require('child_process');
    exec(`start "" "${csvPath}"`, (error, stdout, stderr) => {
      // Always return success for file opening, even if there are minor errors
      // The start command often returns non-zero exit codes but still opens the file
      res.json({ 
        success: true, 
        message: 'CSV file opened for editing' 
      });
    });

  } catch (error) {
    console.error('Open CSV error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Load CSV data
app.post('/api/makeup/load-csv', (req, res) => {
  try {
    const csvPath = path.join(__dirname, '..', '..', 'Make-Up-Exam-Macro', 'Students.csv');
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Students.csv file not found' 
      });
    }

    // Read and parse CSV
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 4) {
      return res.status(400).json({ 
        success: false, 
        error: 'CSV missing required rows' 
      });
    }

    // Parse header and data rows
    const headerRow = lines[0].split(',').map(x => x.trim());
    const dataRow = lines[1].split(',').map(x => x.trim());
    
    if (!headerRow.includes('Term') || !headerRow.includes('Exam')) {
      return res.status(400).json({ 
        success: false, 
        error: 'CSV missing Term or Exam headers' 
      });
    }

    const termIndex = headerRow.indexOf('Term');
    const examIndex = headerRow.indexOf('Exam');
    const term = dataRow[termIndex];
    const exam = dataRow[examIndex];

    // Parse student data
    const studentHeaders = lines[2].split(',').map(x => x.trim());
    const students = [];
    
    for (let i = 3; i < lines.length; i++) {
      const studentData = lines[i].split(',').map(x => x.trim());
      if (studentData.length >= studentHeaders.length && studentData[0] && studentData[1]) {
        const student = {};
        studentHeaders.forEach((header, index) => {
          student[header] = studentData[index] || '';
        });
        students.push(student);
      }
    }

    res.json({ 
      success: true, 
      students: students,
      term: term,
      exam: exam,
      message: `Loaded ${students.length} students from CSV` 
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
app.post('/api/makeup/start-automation', upload.single('examFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No exam file provided' 
      });
    }

    const examFilePath = req.file.path;
    const agentScriptPath = path.join(__dirname, '..', '..', 'Make-Up-Exam-Macro', 'agent.py');
    
    if (!fs.existsSync(agentScriptPath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Agent script not found' 
      });
    }

    // Use the external automation script
    const automationScriptPath = path.join(__dirname, 'automation_agent.py');
    const macroDir = path.join(__dirname, '..', '..', 'Make-Up-Exam-Macro');
    
    // Run the external Python automation script
    const pythonCommand = `python "${automationScriptPath}" "${macroDir}" "${examFilePath}"`;

    // Execute the Python script with UTF-8 encoding
    const pythonProcess = spawn('python', [automationScriptPath, macroDir, examFilePath], {
      cwd: path.join(__dirname, '..', '..', 'Make-Up-Exam-Macro'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
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
      // No temp file to clean up since we're using external script

      console.log('Python process exited with code:', code);
      console.log('Output:', output);
      console.log('Error output:', errorOutput);

      if (code === 0) {
        try {
          // Try to extract JSON from the output (look for the last JSON object)
          const lines = output.split('\n');
          let jsonLine = '';
          
          // Find the last line that looks like JSON
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.startsWith('{') && line.endsWith('}')) {
              jsonLine = line;
              break;
            }
          }
          
          if (jsonLine) {
            const result = JSON.parse(jsonLine);
            res.json(result);
          } else {
            // If no JSON found, assume success if no error output
            if (!errorOutput || errorOutput.trim() === '') {
              res.json({ 
                success: true, 
                message: 'Automation completed successfully',
                output: output
              });
            } else {
              res.json({ 
                success: false, 
                error: 'No JSON result found',
                output: output,
                errorOutput: errorOutput
              });
            }
          }
        } catch (e) {
          res.json({ 
            success: false, 
            error: 'Failed to parse result',
            output: output,
            errorOutput: errorOutput,
            parseError: e.message
          });
        }
      } else {
        res.json({ 
          success: false, 
          error: 'Automation process failed',
          output: output,
          errorOutput: errorOutput
        });
      }
    });

  } catch (error) {
    console.error('Automation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Clear makeup exam session
app.post('/api/makeup/clear', (req, res) => {
  try {
    // Kill any active processes
    for (const [processId, processInfo] of activeProcesses) {
      if (processInfo.process && !processInfo.process.killed) {
        processInfo.process.kill();
      }
    }
    activeProcesses.clear();

    res.json({ 
      success: true, 
      message: 'Makeup exam session cleared' 
    });

  } catch (error) {
    console.error('Clear error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
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

// ===== QUIZ GRADER API ENDPOINTS =====

// List available classes from Rosters etc folder
app.post('/api/quiz/list-classes', (req, res) => {
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
app.post('/api/quiz/process', (req, res) => {
  try {
    const { drive, className } = req.body;

    if (!drive || !className) {
      return res.status(400).json({ 
        success: false, 
        error: 'Drive and class name are required' 
      });
    }

    // Path to the process quiz CLI script
    const scriptPath = path.join(__dirname, '..', '..', 'Quiz-extraction', 'process_quiz_cli.py');
    
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Grading processor script not found' 
      });
    }

    // Execute Python script
    // The script will automatically:
    // - Search Downloads for Canvas ZIP
    // - Show file picker if 0 or multiple ZIPs found
    // - Extract, combine PDFs, update Import File
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
app.post('/api/quiz/extract-grades', (req, res) => {
  try {
    const { drive, className } = req.body;

    if (!drive || !className) {
      return res.status(400).json({ 
        success: false, 
        error: 'Drive and class name are required' 
      });
    }

    // Path to the extract grades CLI script
    const scriptPath = path.join(__dirname, '..', '..', 'Quiz-extraction', 'extract_grades_cli.py');
    
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
app.post('/api/quiz/clear-data', (req, res) => {
  try {
    const { drive, className } = req.body;

    if (!drive || !className) {
      return res.status(400).json({ 
        success: false, 
        error: 'Drive and class name are required' 
      });
    }

    // Path to the cleanup CLI script
    const scriptPath = path.join(__dirname, '..', '..', 'Quiz-extraction', 'cleanup_data_cli.py');
    
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

// ===========================
// FILE EXTRACTOR ENDPOINTS
// ===========================

// Process files - extract ZIP, combine PDFs, update Import File
app.post('/api/file-extractor/process', (req, res) => {
  try {
    const { drive, className } = req.body;

    if (!drive || !className) {
      return res.status(400).json({ 
        success: false, 
        error: 'Drive and class name are required' 
      });
    }

    // Path to the file extraction CLI script
    const scriptPath = path.join(__dirname, '..', '..', 'File-extraction', 'file_extraction_cli.py');
    
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'File extraction script not found' 
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
          error: 'Processing failed',
          logs: logs,
          output: output,
          errorOutput: errorOutput
        });
      }
    });

  } catch (error) {
    console.error('File extraction error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Clear all processing data (delete grade processing folder and ZIP file)
app.post('/api/file-extractor/clear-data', (req, res) => {
  try {
    const { drive, className } = req.body;

    if (!drive || !className) {
      return res.status(400).json({ 
        success: false, 
        error: 'Drive and class name are required' 
      });
    }

    // Path to the cleanup CLI script
    const scriptPath = path.join(__dirname, '..', '..', 'File-extraction', 'cleanup_data_cli.py');
    
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
