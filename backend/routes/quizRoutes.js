const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { exec } = require('child_process');

const router = express.Router();

// List available classes from Rosters etc folder
router.post('/list-classes', (req, res) => {
  try {
    const { drive } = req.body;
    const rostersPath = path.join(`${drive}:`, 'Users', 'chase', 'My Drive', 'Rosters etc');
    
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

// Process quizzes with specific ZIP file selection
router.post('/process-selected', (req, res) => {
  try {
    const { drive, className, zipPath } = req.body;

    if (!drive || !className || !zipPath) {
      return res.status(400).json({ 
        success: false, 
        error: 'Drive, class name, and ZIP path are required' 
      });
    }

    // Path to the process quiz CLI script - using absolute path
    const scriptPath = path.resolve(__dirname, '..', '..', '..', 'Quiz-extraction', 'process_quiz_cli.py');
    
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ 
        success: false, 
        error: `Grading processor script not found at ${scriptPath}` 
      });
    }

    // Execute Python script with the selected ZIP file
    const pythonProcess = spawn('python', [
      scriptPath,
      drive,
      className,
      zipPath
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
      
      // Parse logs line by line, but skip JSON lines
      text.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
          logs.push(trimmed);
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
        // Try to parse error from stderr (JSON response)
        let errorMessage = 'Process failed';
        try {
          const jsonError = JSON.parse(errorOutput.trim());
          if (jsonError.error) {
            errorMessage = jsonError.error;
          }
        } catch (e) {
          // If stderr isn't JSON, check if output contains JSON
          try {
            const jsonOutput = JSON.parse(output.trim());
            if (jsonOutput.error) {
              errorMessage = jsonOutput.error;
            }
          } catch (e2) {
            // Use default error message
          }
        }
        
        res.json({ 
          success: false, 
          error: errorMessage,
          logs: logs,
          output: output,
          errorOutput: errorOutput
        });
      }
    });

  } catch (error) {
    console.error('Process selected quiz error:', error);
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
    let responseSent = false;

    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Try to parse JSON from stdout (for multiple ZIP files case)
      try {
        const jsonData = JSON.parse(text.trim());
        if (jsonData.error === 'Multiple ZIP files found' && !responseSent) {
          responseSent = true;
          return res.json(jsonData);
        }
      } catch (e) {
        // Not JSON, parse as regular logs
        text.split('\n').forEach(line => {
          if (line.trim()) {
            logs.push(line.trim());
          }
        });
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (responseSent) {
        return; // Response already sent, don't send another one
      }
      
      if (code === 0) {
        res.json({ 
          success: true, 
          message: 'Quiz processing completed',
          logs: logs,
          output: output
        });
      } else {
        // Try to parse error from stderr (JSON response)
        let errorMessage = 'Process failed';
        try {
          const jsonError = JSON.parse(errorOutput.trim());
          if (jsonError.error) {
            errorMessage = jsonError.error;
          }
        } catch (e) {
          // If stderr isn't JSON, check if output contains JSON
          try {
            const jsonOutput = JSON.parse(output.trim());
            if (jsonOutput.error) {
              errorMessage = jsonOutput.error;
            }
          } catch (e2) {
            // Use default error message
          }
        }
        
        res.json({ 
          success: false, 
          error: errorMessage,
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

// Process completions with specific ZIP file selection
router.post('/process-completion-selected', (req, res) => {
  try {
    const { drive, className, zipPath, dontOverride } = req.body;

    if (!drive || !className || !zipPath) {
      return res.status(400).json({ 
        success: false, 
        error: 'Drive, class name, and ZIP path are required' 
      });
    }

    // Path to the process completion CLI script
    const scriptPath = path.resolve(__dirname, '..', '..', '..', 'Quiz-extraction', 'process_completion_cli.py');
    
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ 
        success: false, 
        error: `Completion processor script not found at ${scriptPath}` 
      });
    }

    // Execute Python script with the selected ZIP file
    const args = [scriptPath, drive, className, zipPath];
    if (dontOverride) {
      args.push('--dont-override');
    }
    const pythonProcess = spawn('python', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let output = '';
    let errorOutput = '';
    const logs = [];

    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Parse logs line by line, but skip JSON lines
      text.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
          logs.push(trimmed);
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
          message: 'Completion processing completed',
          logs: logs,
          output: output
        });
      } else {
        // Try to parse error from stderr (JSON response)
        let errorMessage = 'Process failed';
        try {
          const jsonError = JSON.parse(errorOutput.trim());
          if (jsonError.error) {
            errorMessage = jsonError.error;
          }
        } catch (e) {
          // If stderr isn't JSON, check if output contains JSON
          try {
            const jsonOutput = JSON.parse(output.trim());
            if (jsonOutput.error) {
              errorMessage = jsonOutput.error;
            }
          } catch (e2) {
            // Use default error message
          }
        }
        
        res.json({ 
          success: false, 
          error: errorMessage,
          logs: logs,
          output: output,
          errorOutput: errorOutput
        });
      }
    });

  } catch (error) {
    console.error('Process selected completion error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Process completions (extract ZIP, combine PDFs, auto-assign 10 points)
router.post('/process-completion', (req, res) => {
  try {
    const { drive, className, dontOverride } = req.body;

    if (!drive || !className) {
      return res.status(400).json({ 
        success: false, 
        error: 'Drive and class name are required' 
      });
    }

    // Path to the process completion CLI script
    const scriptPath = path.resolve(__dirname, '..', '..', '..', 'Quiz-extraction', 'process_completion_cli.py');
    
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ 
        success: false, 
        error: `Completion processor script not found at ${scriptPath}` 
      });
    }

    // Execute Python script
    const args = [scriptPath, drive, className];
    if (dontOverride) {
      args.push('--dont-override');
    }
    const pythonProcess = spawn('python', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let output = '';
    let errorOutput = '';
    const logs = [];
    let responseSent = false;

    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Try to parse JSON from stdout (for multiple ZIP files case)
      try {
        const jsonData = JSON.parse(text.trim());
        if (jsonData.error === 'Multiple ZIP files found' && !responseSent) {
          responseSent = true;
          return res.json(jsonData);
        }
      } catch (e) {
        // Not JSON, parse as regular logs
        text.split('\n').forEach(line => {
          if (line.trim()) {
            logs.push(line.trim());
          }
        });
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (responseSent) {
        return; // Response already sent, don't send another one
      }
      
      if (code === 0) {
        res.json({ 
          success: true, 
          message: 'Completion processing completed',
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
    console.error('Process completion error:', error);
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
      
      // Parse logs line by line, but skip JSON lines
      text.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
          logs.push(trimmed);
        }
      });
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        // Try to parse JSON response from stderr
        let parsedLogs = logs;
        try {
          const jsonResponse = JSON.parse(errorOutput.trim());
          if (jsonResponse.logs && Array.isArray(jsonResponse.logs)) {
            parsedLogs = jsonResponse.logs;
          }
        } catch (e) {
          // If stderr isn't JSON, use the parsed logs from stdout
        }
        
        res.json({ 
          success: true, 
          message: 'Grade extraction completed',
          logs: parsedLogs,
          output: output
        });
      } else {
        // Try to parse error from stderr (JSON response)
        let errorMessage = 'Something went wrong with the extraction.';
        try {
          const jsonError = JSON.parse(errorOutput.trim());
          if (jsonError.error) {
            errorMessage = jsonError.error;
          }
        } catch (e) {
          // If stderr isn't JSON, check if output contains JSON
          try {
            const jsonOutput = JSON.parse(output.trim());
            if (jsonOutput.error) {
              errorMessage = jsonOutput.error;
            }
          } catch (e2) {
            // Use default friendly message
          }
        }
        
        res.json({ 
          success: false, 
          error: errorMessage,
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

// Split combined PDF back into individual student PDFs
router.post('/split-pdf', (req, res) => {
  try {
    const { drive, className } = req.body;

    if (!drive || !className) {
      return res.status(400).json({ 
        success: false, 
        error: 'Drive and class name are required' 
      });
    }

    // Path to the split PDF CLI script - using absolute path
    const scriptPath = path.resolve(__dirname, '..', '..', '..', 'Quiz-extraction', 'split_pdf_cli.py');
    
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Split PDF script not found' 
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
      
      // Parse logs line by line, but skip JSON lines
      text.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
          logs.push(trimmed);
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
          message: 'PDF splitting completed',
          logs: logs,
          output: output
        });
      } else {
        // Try to parse error from stderr (JSON response)
        let errorMessage = 'Something ran into a problem with the split and zip.';
        try {
          const jsonError = JSON.parse(errorOutput.trim());
          if (jsonError.error) {
            errorMessage = jsonError.error;
          }
        } catch (e) {
          // If stderr isn't JSON, check if output contains JSON
          try {
            const jsonOutput = JSON.parse(output.trim());
            if (jsonOutput.error) {
              errorMessage = jsonOutput.error;
            }
          } catch (e2) {
            // Use default friendly message
          }
        }
        
        res.json({ 
          success: false, 
          error: errorMessage,
          logs: logs,
          output: output,
          errorOutput: errorOutput
        });
      }
    });

  } catch (error) {
    console.error('Split PDF error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Open grade processing folder
router.post('/open-folder', (req, res) => {
  try {
    const { drive, className } = req.body;

    if (!drive || !className) {
      return res.status(400).json({ 
        success: false, 
        error: 'Drive and class name are required' 
      });
    }

    // Special case: open Downloads folder
    if (className === 'DOWNLOADS') {
      const downloadsPath = path.join(process.env.USERPROFILE || 'C:\\Users\\chase', 'Downloads');
      
      if (!fs.existsSync(downloadsPath)) {
        return res.status(404).json({ 
          success: false, 
          error: `Downloads folder not found at ${downloadsPath}` 
        });
      }

      // Open Downloads folder using the system's default file manager
      const platform = process.platform;
      
      let command, args;
      if (platform === 'win32') {
        command = 'explorer';
        args = [downloadsPath];
      } else if (platform === 'darwin') {
        command = 'open';
        args = [downloadsPath];
      } else {
        command = 'xdg-open';
        args = [downloadsPath];
      }

      const openProcess = spawn(command, args, { 
        stdio: 'ignore',
        detached: true 
      });
      
      openProcess.unref(); // Allow the process to exit independently

      return res.json({ 
        success: true, 
        message: 'Downloads folder opened',
        path: downloadsPath
      });
    }

    // Build the grade processing folder path
    let processingFolderPath;
    if (drive === 'G') {
      // Try different possible paths for G drive
      const possiblePaths = [
        `${drive}:\\Users\\chase\\My Drive\\Rosters etc\\${className}\\grade processing`,
        `${drive}:\\chase\\My Drive\\Rosters etc\\${className}\\grade processing`,
        `${drive}:\\My Drive\\Rosters etc\\${className}\\grade processing`
      ];
      
      processingFolderPath = possiblePaths.find(folderPath => fs.existsSync(folderPath));
      if (!processingFolderPath) {
        processingFolderPath = possiblePaths[0]; // Use first path as fallback
      }
    } else {
      processingFolderPath = `${drive}:\\Users\\chase\\My Drive\\Rosters etc\\${className}\\grade processing`;
    }

    if (!fs.existsSync(processingFolderPath)) {
      // If grade processing folder doesn't exist, open the parent class folder instead
      const parentClassPath = processingFolderPath.replace('\\grade processing', '');
      
      if (fs.existsSync(parentClassPath)) {
        // Open the parent class folder
        const platform = process.platform;
        let command, args;
        if (platform === 'win32') {
          command = 'explorer';
          args = [parentClassPath];
        } else if (platform === 'darwin') {
          command = 'open';
          args = [parentClassPath];
        } else {
          command = 'xdg-open';
          args = [parentClassPath];
        }

        const openProcess = spawn(command, args, { 
          stdio: 'ignore',
          detached: true 
        });
        
        openProcess.unref(); // Allow the process to exit independently

        return res.json({ 
          success: true, 
          message: 'Class folder opened (no grade processing folder found)',
          logs: [`📂 Looking for grade processing folder at: ${processingFolderPath}`, `ℹ️ No grade processing folder found for ${className}`, `📁 Opening parent class folder instead: ${parentClassPath}`],
          path: parentClassPath
        });
      } else {
        return res.json({ 
          success: true, 
          message: 'No grade processing folder found',
          logs: [`📂 Looking for grade processing folder at: ${processingFolderPath}`, `ℹ️ No grade processing folder available for ${className}`, `❌ Parent class folder also not found`],
          path: processingFolderPath
        });
      }
    }

    // Open the folder using the system's default file manager
    const platform = process.platform;
    
    let command, args;
    if (platform === 'win32') {
      command = 'explorer';
      args = [processingFolderPath];
    } else if (platform === 'darwin') {
      command = 'open';
      args = [processingFolderPath];
    } else {
      command = 'xdg-open';
      args = [processingFolderPath];
    }

    const openProcess = spawn(command, args, { 
      stdio: 'ignore',
      detached: true 
    });
    
    openProcess.unref(); // Allow the process to exit independently

    res.json({ 
      success: true, 
      message: 'Grade processing folder opened',
      path: processingFolderPath
    });

  } catch (error) {
    console.error('Open folder error:', error);
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
      
      // Parse logs line by line, but skip JSON lines
      text.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
          logs.push(trimmed);
        }
      });
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      // Check if the output contains SUCCESS or ERROR markers
      const hasSuccess = output.includes('SUCCESS:');
      const hasError = output.includes('ERROR:');
      
      if (code === 0 && hasSuccess) {
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

// Open Downloads folder
router.post('/open-downloads', (req, res) => {
  try {
    const downloadsPath = path.join(process.env.USERPROFILE || 'C:\\Users\\chase', 'Downloads');
    console.log('Attempting to open Downloads folder at:', downloadsPath);
    console.log('USERPROFILE:', process.env.USERPROFILE);
    
    // Check if the path exists first
    if (!fs.existsSync(downloadsPath)) {
      console.log('Downloads folder does not exist at:', downloadsPath);
      return res.status(404).json({
        success: false,
        error: 'Downloads folder not found',
        path: downloadsPath,
        userProfile: process.env.USERPROFILE
      });
    }
    
    // Try multiple methods to open the Downloads folder
    const commands = [
      `explorer "${downloadsPath}"`,
      `start "" "${downloadsPath}"`,
      `cmd /c start "" "${downloadsPath}"`
    ];
    
    let commandIndex = 0;
    
    const tryNextCommand = () => {
      if (commandIndex >= commands.length) {
        return res.status(500).json({
          success: false,
          error: 'All methods failed to open Downloads folder',
          path: downloadsPath,
          attemptedCommands: commands
        });
      }
      
      const command = commands[commandIndex];
      console.log(`Trying command ${commandIndex + 1}/${commands.length}:`, command);
      
      exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
        if (error) {
          console.log(`Command ${commandIndex + 1} failed:`, error.message);
          commandIndex++;
          tryNextCommand();
        } else {
          console.log('Downloads folder opened successfully with command:', command);
          res.json({
            success: true,
            message: 'Downloads folder opened successfully',
            path: downloadsPath,
            method: command
          });
        }
      });
    };
    
    tryNextCommand();
    
  } catch (error) {
    console.error('Error in open-downloads:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;
