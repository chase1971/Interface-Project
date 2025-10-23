const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const router = express.Router();

// Route to restart both servers
router.post('/restart-servers', (req, res) => {
  try {
    // Get the project root directory (two levels up from this routes folder)
    const projectRoot = path.join(__dirname, '..', '..');
    const vbsScriptPath = path.join(projectRoot, 'start-invisible.vbs');
    
    console.log('Attempting to restart servers...');
    console.log('VBS Script Path:', vbsScriptPath);
    
    // Execute the VBS script
    exec(`cscript "${vbsScriptPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Error executing VBS script:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to restart servers',
          details: error.message
        });
      }
      
      // VBS scripts typically don't return JSON, so we handle the response as text
      console.log('VBS script executed successfully');
      console.log('stdout:', stdout);
      console.log('stderr:', stderr);
      
      res.json({
        success: true,
        message: 'Servers restart initiated successfully',
        details: stdout || 'VBS script executed without output'
      });
    });
    
  } catch (error) {
    console.error('Server restart error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Route to check server status
router.get('/status', (req, res) => {
  try {
    // Check if Node.js processes are running
    exec('tasklist /FI "IMAGENAME eq node.exe"', (error, stdout, stderr) => {
      if (error) {
        console.error('Error checking server status:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to check server status',
          details: error.message
        });
      }
      
      const nodeProcesses = stdout.includes('node.exe');
      
      res.json({
        success: true,
        serversRunning: nodeProcesses,
        message: nodeProcesses ? 'Servers are running' : 'No servers detected',
        processCount: (stdout.match(/node\.exe/g) || []).length
      });
    });
    
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;
