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

// Load Import File CSV for a class
router.post('/load-import-file', (req, res) => {
  try {
    const { drive, className } = req.body;

    if (!drive || !className) {
      return res.status(400).json({ 
        success: false, 
        error: 'Drive and class name are required' 
      });
    }

    // Build path to Import File CSV for the class
    // Pattern: {drive}:\Users\chase\My Drive\Rosters etc\{className}\Import File.csv
    // On Windows, need to properly handle the path
    const csvPath = `${drive}:\\Users\\chase\\My Drive\\Rosters etc\\${className}\\Import File.csv`;
    
    console.log('🔍 LOAD-IMPORT-FILE: Looking for CSV at:', csvPath);
    console.log('🔍 LOAD-IMPORT-FILE: File exists?', fs.existsSync(csvPath));
    
    if (!fs.existsSync(csvPath)) {
      console.log('❌ LOAD-IMPORT-FILE: CSV file not found at:', csvPath);
      return res.status(404).json({ 
        success: false, 
        error: `Import File.csv not found for class ${className}` 
      });
    }
    
    console.log('✅ LOAD-IMPORT-FILE: CSV file found, reading contents...');

    // Read CSV content
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'CSV file must have at least a header row and data rows' 
      });
    }

    // Parse CSV data - Import File format: header row, then data rows
    const headerRow = lines[0].split(',').map(x => x.trim());
    const studentData = lines.slice(1)
      .filter(line => line.trim() && line.split(',').some(value => value.trim())) // Filter out empty lines
      .map(line => {
        const values = line.split(',').map(x => x.trim());
        const student = {};
        headerRow.forEach((header, index) => {
          student[header] = values[index] || '';
        });
        return student;
      })
      .filter(student => {
        // Extract student names - look for "First Name" and "Last Name" columns
        const firstName = student['First Name'] || student['first name'] || '';
        const lastName = student['Last Name'] || student['last name'] || '';
        return firstName || lastName;
      })
      .map(student => {
        // Combine first and last name for display with capitalization
        const firstName = student['First Name'] || student['first name'] || '';
        const lastName = student['Last Name'] || student['last name'] || '';
        // Capitalize each word in the name
        const capitalize = (str) => {
          if (!str) return '';
          return str.toLowerCase().split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
        };
        const fullName = `${capitalize(firstName)} ${capitalize(lastName)}`.trim();
        return {
          ...student,
          fullName: fullName || 'Unknown Student'
        };
      });

    res.json({ 
      success: true, 
      students: studentData
    });

  } catch (error) {
    console.error('Import file load error:', error);
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
    console.log('🚀 START-AUTOMATION: Request body:', req.body);
    
    if (!req.file) {
      console.log('❌ START-AUTOMATION: No exam file provided');
      return res.status(400).json({ 
        success: false, 
        error: 'No exam file provided' 
      });
    }

    const examFilePath = req.file.path;
    const examName = req.body.examName || '';
    const className = req.body.className || '';
    const selectedStudents = req.body.selectedStudents ? JSON.parse(req.body.selectedStudents) : [];
    const startDate = req.body.startDate || '';
    const endDate = req.body.endDate || '';
    const examHours = req.body.examHours || '0';
    const examMinutes = req.body.examMinutes || '0';
    const specifyType = req.body.specifyType || 'none';
    const customSpecifyText = req.body.customSpecifyText || '';
    const termCode = req.body.termCode || '';
    
    console.log('📋 Exam Name:', examName);
    console.log('📋 Class Name:', className);
    console.log('📋 Selected Students:', selectedStudents);
    console.log('📋 Selected Students Count:', Array.isArray(selectedStudents) ? selectedStudents.length : 'NOT AN ARRAY');
    console.log('📋 Dates:', startDate, 'to', endDate);
    console.log('📋 Duration:', examHours, 'hours', examMinutes, 'minutes');
    console.log('📋 Specify Type:', specifyType);
    
    // Validate that students are selected
    if (!Array.isArray(selectedStudents) || selectedStudents.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No students selected. Please select at least one student.'
      });
    }
    
    // Load students from Import File for the selected class
    let studentsData = [];
    if (className) {
      try {
        const drive = 'C'; // Always use C drive
        const csvPath = `${drive}:\\Users\\chase\\My Drive\\Rosters etc\\${className}\\Import File.csv`;
        
        if (fs.existsSync(csvPath)) {
          const csvContent = fs.readFileSync(csvPath, 'utf8');
          const lines = csvContent.split('\n').filter(line => line.trim());
          
          if (lines.length >= 2) {
            const headerRow = lines[0].split(',').map(x => x.trim());
            studentsData = lines.slice(1)
              .filter(line => line.trim() && line.split(',').some(value => value.trim()))
              .map(line => {
                const values = line.split(',').map(x => x.trim());
                const student = {};
                headerRow.forEach((header, index) => {
                  student[header] = values[index] || '';
                });
                // Combine first and last name for fullName
                const firstName = student['First Name'] || student['first name'] || '';
                const lastName = student['Last Name'] || student['last name'] || '';
                const capitalize = (str) => {
                  if (!str) return '';
                  return str.toLowerCase().split(' ').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ');
                };
                student.fullName = `${capitalize(firstName)} ${capitalize(lastName)}`.trim();
                return student;
              })
              .filter(student => {
                const firstName = student['First Name'] || student['first name'] || '';
                const lastName = student['Last Name'] || student['last name'] || '';
                return firstName || lastName;
              });
          }
        }
      } catch (error) {
        console.error('Error loading students from Import File:', error);
      }
    }
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
    
    // Validate dates and term code are provided
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required.'
      });
    }
    
    if (!termCode || termCode.length !== 4) {
      return res.status(400).json({
        success: false,
        error: 'Term code is required and must be 4 digits (e.g., 1258).'
      });
    }
    
    // Prepare data to pass to Python script
    const automationData = {
      examFilePath: examFilePath,
      examName: examName,
      className: className,
      selectedStudents: selectedStudents,  // Array of indices
      students: studentsData,  // All students from Import File (for name lookup)
      startDate: startDate,
      endDate: endDate,
      examHours: parseInt(examHours),
      examMinutes: parseInt(examMinutes),
      specifyType: specifyType,
      customSpecifyText: customSpecifyText,
      termCode: termCode
    };
    
    console.log('📦 Automation Data Prepared:');
    console.log('  - Exam File:', examFilePath);
    console.log('  - Exam Name:', examName);
    console.log('  - Class:', className);
    console.log('  - Selected Student Indices:', selectedStudents);
    console.log('  - Total Students Available:', studentsData.length);
    console.log('  - Term Code:', termCode);
    console.log('  - Start Date:', startDate);
    console.log('  - End Date:', endDate);
    console.log('  - Duration:', examHours, 'h', examMinutes, 'm');
    
    console.log('🐍 SPAWNING PYTHON PROCESS...');
    console.log('🐍 PYTHON COMMAND: python', automationScriptPath, macroDir, JSON.stringify(automationData));
    console.log('🐍 WORKING DIRECTORY:', path.join(__dirname, '..', '..', '..', 'Make-Up-Exam-Macro'));
    
    const pythonProcess = spawn('python', [automationScriptPath, macroDir, JSON.stringify(automationData)], {
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
      // Also log all stderr messages that might contain important info
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim() && (line.includes('📋') || line.includes('❌') || line.includes('✅') || line.includes('⚠️') || line.includes('🐍'))) {
          console.log('🔍 PYTHON LOG:', line.trim());
        }
      });
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
