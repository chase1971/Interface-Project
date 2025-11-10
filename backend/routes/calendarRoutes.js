const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// =======================================================
// 📅 GET CALENDAR DATA — reads CSV file and parses it
// =======================================================
router.get('/data', (req, res) => {
  try {
    // Path to the CSV file (relative to workspace root)
    const csvPath = path.join(__dirname, '..', '..', '..', 'Calendar', 'Calendar dates.csv');
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Calendar CSV file not found' 
      });
    }

    // Read and parse CSV
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return res.json({ success: true, data: [] });
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quoted fields (like "Quiz 1 and 2 (1.1,1.3-1.8)")
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Add last value

      if (values.length >= headers.length) {
        const item = {
          itemName: values[0] || '',
          startDate: values[1] || null,
          startTime: values[2] || null,
          dueDate: values[3] || null,
          dueTime: values[4] || null
        };
        data.push(item);
      }
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error reading calendar CSV:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to read calendar data: ' + error.message 
    });
  }
});

// =======================================================
// 📅 GET CLASS SCHEDULE DATA — reads class schedule CSV file
// =======================================================
router.get('/class-schedule', (req, res) => {
  try {
    // Hardcoded path for class schedule CSV
    const csvPath = 'C:\\Users\\chase\\Documents\\School Scrips\\Calendar\\M1314_4105_Fall2025_Schedule_Clean.csv';
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ 
        success: false, 
        error: 'Class schedule CSV file not found' 
      });
    }

    // Read and parse CSV
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return res.json({ success: true, data: [] });
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quoted fields
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Add last value

      if (values.length >= 2) {
        const dateStr = values[0] || '';
        const description = values[1] || '';
        
        // Parse date in format "DD-MMM-YY" (e.g., "25-Aug-25")
        let parsedDate = null;
        if (dateStr) {
          try {
            // Convert "25-Aug-25" to proper date
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const monthAbbr = parts[1];
              let year = parseInt(parts[2], 10);
              
              // Convert 2-digit year to 4-digit (assuming 20xx)
              if (year < 100) {
                year = 2000 + year;
              }
              
              // Map month abbreviations to month numbers (0-indexed)
              const monthMap = {
                'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
              };
              
              const month = monthMap[monthAbbr];
              if (month !== undefined && !isNaN(day) && !isNaN(year)) {
                parsedDate = new Date(year, month, day);
                
                // Validate date
                if (isNaN(parsedDate.getTime())) {
                  parsedDate = null;
                }
              }
            }
          } catch (e) {
            console.error('Error parsing date:', dateStr, e);
          }
        }
        
        if (parsedDate && description) {
          data.push({
            date: parsedDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
            description: description
          });
        }
      }
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error reading class schedule CSV:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to read class schedule data: ' + error.message 
    });
  }
});

// =======================================================
// 💾 SAVE CALENDAR CSV FILES — saves assignment and class schedule CSV files
// =======================================================
router.post('/save-csv', (req, res) => {
  try {
    const { filename, content, type } = req.body; // type: 'assignment' or 'class'
    
    if (!filename || !content || !type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: filename, content, and type' 
      });
    }

    // Path to the public/Calendar folder in the frontend
    // This assumes the backend is in Interface-Project/backend and frontend is in Interface-Project/frontend
    const calendarDir = path.join(__dirname, '..', '..', 'frontend', 'public', 'Calendar');
    
    // Ensure the directory exists
    if (!fs.existsSync(calendarDir)) {
      fs.mkdirSync(calendarDir, { recursive: true });
    }

    // Sanitize filename (remove any path traversal attempts)
    const safeFilename = path.basename(filename);
    
    // Full path to the CSV file
    const filePath = path.join(calendarDir, safeFilename);

    // Write the file
    fs.writeFileSync(filePath, content, 'utf-8');

    console.log(`✅ Saved ${type} CSV file: ${safeFilename}`);

    res.json({ 
      success: true, 
      message: `CSV file saved successfully: ${safeFilename}`,
      path: filePath
    });
  } catch (error) {
    console.error('Error saving CSV file:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save CSV file: ' + error.message 
    });
  }
});

module.exports = router;

