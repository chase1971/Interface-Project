# File Extractor Setup Guide

## Overview
The **File Extractor** automates Canvas assignment processing:
- Extracts Canvas ZIP files
- Combines multiple PDFs per student
- Identifies unreadable submissions (images, non-PDFs)
- Adds watermarks with student names
- Sorts alphabetically by last name
- Updates Import File.csv with grades (10 points for submitted, "unreadable", or 0)

---

## Files Created

### Backend
- `File-extraction/file_extraction_cli.py` - CLI wrapper for React integration
- `Interface-Project/backend/server.js` - Added `/api/file-extractor/process` endpoint

### Frontend
- `Interface-Project/frontend/src/pages/FileExtractor.js` - React component
- `Interface-Project/frontend/src/pages/FileExtractor.css` - Styling (orange theme)
- `Interface-Project/frontend/src/services/fileExtractorService.js` - API calls
- `Interface-Project/frontend/src/App.js` - Added `/file-extractor` route
- `Interface-Project/frontend/src/pages/Home.js` - Added "File Extractor" button
- `Interface-Project/frontend/src/pages/Home.css` - Added orange color variant

---

## How It Works

### Workflow
1. **Select Drive**: C: or G: depending on computer
2. **Select Class**: Choose from dropdown (e.g., CA 4105)
3. **Click "Start Processing"**:
   - Auto-finds most recent ZIP in Downloads
   - Extracts to `grade processing/` folder in class folder
   - Processes each student's submission:
     - **PDFs**: Copied (or combined if multiple)
     - **Images/Other**: Marked as "unreadable", moved to `unreadable/` folder
     - **No submission**: Grade = 0
   - Creates `1combinedpdf.pdf` (sorted by last name, with watermarks)
   - Updates `Import File.csv` with grades
   - Opens both files for review

### File Structure
```
Rosters etc/
└── [Class Folder] (e.g., "TTH 930-1050 CA 4203")/
    ├── Import File.csv (updated with grades)
    └── grade processing/
        ├── [Extracted submission folders]
        ├── unreadable/ (non-PDF submissions)
        └── PDFs/
            ├── 1combinedpdf.pdf (sorted by last name)
            └── [Individual student PDFs]
```

---

## Testing the CLI (Optional)

You can test the Python script directly from the terminal:

```powershell
# Navigate to File-extraction folder
cd "C:\Users\chase\My Drive\scripts\School Scripts\File-extraction"

# Run the CLI script
python file_extraction_cli.py C "CA 4201"

# Arguments:
# - C or G (drive letter)
# - CA 4201 (class name - must match folder suffix)
```

---

## Differences from Quiz Grader

| Feature | Quiz Grader | File Extractor |
|---------|-------------|----------------|
| **Purpose** | Grade handwritten quizzes with OCR | Process general assignments |
| **OCR** | Yes (Google Vision API) | No |
| **Grading** | Extracts handwritten grades | Assigns 10 points for submission |
| **Unreadable Files** | N/A | Identifies non-PDFs |
| **Multiple PDFs** | N/A | Automatically combines |
| **Workflow** | 2-step (Process → Extract Grades) | 1-step (Process only) |

---

## Troubleshooting

### Backend Not Running
```powershell
cd "C:\Users\chase\My Drive\scripts\School Scripts\Interface-Project\backend"
node server.js
```
Should see: `D2L Backend API running on port 5000`

### Frontend Not Running
```powershell
cd "C:\Users\chase\My Drive\scripts\School Scripts\Interface-Project\frontend"
npm start
```
Should open browser to `http://localhost:3000`

### No ZIP Files Found
- Check `C:\Users\chase\Downloads` for `.zip` files
- Script uses most recent ZIP if multiple are found

### Import File Not Found
- Ensure class folder has `Import File.csv`
- Class folder name must end with selected class (e.g., `TTH 930-1050 CA 4203`)

### Python Script Errors
- Ensure `grading_processor.py` is in `File-extraction/` folder
- Check Python dependencies:
  ```powershell
  pip install pandas pypdf reportlab
  ```

---

## Next Steps

1. **Start the backend** (if not running):
   ```powershell
   cd "C:\Users\chase\My Drive\scripts\School Scripts\Interface-Project\backend"
   node server.js
   ```

2. **Start the frontend** (if not running):
   ```powershell
   cd "C:\Users\chase\My Drive\scripts\School Scripts\Interface-Project\frontend"
   npm start
   ```

3. **Test the File Extractor**:
   - Click the orange "File Extractor" button on the home page
   - Select drive and class
   - Click "Start Processing"
   - Review activity log for progress

---

## Color Themes

Each automation script has its own color:
- **D2L Macro**: Blue
- **Makeup Exam**: Green
- **Quiz Grader**: Purple
- **File Extractor**: Orange 🟠

---

## Future Enhancements

Possible additions:
- **Delete Processing Data** button (like Quiz Grader)
- **Manual ZIP selection** if auto-detection fails
- **Open Processing Folder** button
- **Summary stats** (submitted, unreadable, no submission counts)

Ready to test! 🚀

