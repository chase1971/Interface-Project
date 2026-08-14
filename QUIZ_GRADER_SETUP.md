# Quiz Grader Integration - Setup & Testing Guide

## ✅ What's Been Built

### Backend (Express API)
**Location:** `Interface-Project/backend/server.js`

**New Endpoints:**
1. `POST /api/quiz/list-classes` - Lists available classes from Rosters etc folder
2. `POST /api/quiz/process` - Processes Canvas ZIP, combines PDFs, prepares for grading
3. `POST /api/quiz/extract-grades` - Extracts grades from graded PDF using OCR
4. `POST /api/quiz/split-pdf` - Splits combined PDF back into individual student PDFs

### Frontend (React)
**Location:** `Interface-Project/frontend/src/pages/QuizGrader.js`

**Features:**
- Drive selection (C: or G:)
- Class dropdown with day/time schedules
- "Process Quizzes" button (auto-finds Canvas ZIP in Downloads)
- "Extract Grades" button (runs OCR on graded PDF)
- "Split PDF" button (splits combined PDF back to individual PDFs)
- Activity log for real-time feedback
- "Back to Home" and "Clear All" utility buttons

**Service Layer:** `Interface-Project/frontend/src/services/quizGraderService.js`
- Handles all API communication
- Provides logging callbacks for real-time updates

### Python Backend Scripts
**Location:** `Quiz-extraction/`

1. **`process_quiz_cli.py`** (NEW)
   - CLI wrapper for grading_processor.py
   - Accepts: `<drive_letter> <class_name>`
   - Auto-finds Canvas ZIP in Downloads
   - Shows file picker if 0 or multiple ZIPs found

2. **`extract_grades_cli.py`** (UPDATED)
   - Now accepts: `<drive_letter> <class_name>`
   - Constructs path to combined PDF automatically
   - Runs OCR and updates Import File.csv
   - Flags low-confidence grades with "VERIFY" in Column G

3. **`split_pdf_cli.py`** (NEW)
   - CLI wrapper for splitting combined PDF back into individual student PDFs
   - Accepts: `<drive_letter> <class_name>`
   - Uses existing `run_reverse_process` function from grading_processor.py

4. **`grading_processor.py`** (EXISTING)
   - Main processing logic
   - Called by process_quiz_cli.py

---

## 🚀 How to Run & Test

### Step 1: Start the Backend Server

Open a **new** PowerShell terminal and run:

```powershell
cd "C:\Users\chase\My Drive\scripts\School Scripts\Interface-Project\backend"
npm start
```

You should see:
```
D2L Backend API running on port 3005
Health check: http://localhost:3005/api/health
```

### Step 2: The React Frontend is Already Running

The React app is currently running (you should see it at http://localhost:3000).

If not, run:
```powershell
cd "C:\Users\chase\My Drive\scripts\School Scripts\Interface-Project\frontend"
npm start
```

### Step 3: Test the Quiz Grader

1. Open your browser to http://localhost:3000
2. Click the **"Quiz Grader"** button on the home page
3. Select **Drive** (C: or G:)
4. Select a **Class** from the dropdown
5. Click **"Process Quizzes"**
   - The system will automatically search for Canvas ZIP files in Downloads
   - If 1 found → uses it automatically
   - If 0 or multiple → shows file picker dialog
6. After processing completes, grade the combined PDF manually
7. Click **"Extract Grades"**
   - OCR extracts grades from the PDF
   - Updates Import File.csv
   - Opens grades-only PDF for review

---

## 🧪 Manual CLI Testing (Without React)

You can test the Python scripts directly:

### Test Process Quizzes:
```powershell
cd "C:\Users\chase\My Drive\scripts\School Scripts\Quiz-extraction"
python process_quiz_cli.py C "CA 4201"
```

### Test Extract Grades:
```powershell
cd "C:\Users\chase\My Drive\scripts\School Scripts\Quiz-extraction"
python extract_grades_cli.py C "CA 4201"
```

---

## 📋 Workflow Summary

### Step 1: Process Quizzes
1. User selects Drive + Class
2. Click "Process Quizzes"
3. Backend calls `process_quiz_cli.py <drive> <class>`
4. Python script:
   - Searches Downloads for Canvas ZIP
   - Extracts submissions
   - Combines PDFs
   - Adds watermarks
   - Sorts alphabetically
   - Creates `1combinedpdf.pdf`
   - Updates Import File.csv (adds column, blank grades)
   - Opens combined PDF for manual grading

### Step 2: Extract Grades
1. User grades the PDF manually
2. Click "Extract Grades"
3. Backend calls `extract_grades_cli.py <drive> <class>`
4. Python script:
   - Locates `1combinedpdf.pdf`
   - Runs OCR on first page of each student
   - Extracts handwritten red grades
   - Updates Import File.csv with grades
   - Flags low-confidence grades with "VERIFY" in Column G
   - Opens `1combinedpdf_GRADES_ONLY.pdf` for review

### Step 3: Split PDF (NEW)
1. After grading is complete, click "Split PDF"
2. Backend calls `split_pdf_cli.py <drive> <class>`
3. Python script:
   - Locates `1combinedpdf.pdf`
   - Extracts student names from PDF watermarks
   - Matches names to original student folders
   - Splits PDF into individual student pages
   - Replaces original PDFs in student folders
   - Restores individual graded PDFs to their original locations

---

## 🔧 Troubleshooting

### Backend not responding?
- Check if port 3005 is already in use
- Look for startup errors in the backend terminal
- Verify `Interface-Project/backend/server.js` has no syntax errors

### React can't connect to backend?
- Ensure backend is running on port 3005
- Check browser console for CORS errors
- Verify `REACT_APP_API_URL` is not set (defaults to http://localhost:3005)

### Python scripts not found?
- Backend looks for scripts at: `../../Quiz-extraction/<script_name>.py`
- Verify the relative path is correct from `Interface-Project/backend/`

### File picker not showing?
- Ensure `tkinter` is installed with Python
- Try running the CLI script directly to debug

---

## 📁 File Structure

```
Interface-Project/
├── backend/
│   ├── server.js          ← API endpoints for quiz grader
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Home.js                 ← Added Quiz Grader button
    │   │   ├── QuizGrader.js           ← New Quiz Grader UI
    │   │   └── QuizGrader.css
    │   └── services/
    │       └── quizGraderService.js    ← API communication layer
    └── package.json

Quiz-extraction/
├── process_quiz_cli.py         ← NEW: CLI wrapper for processing
├── extract_grades_cli.py       ← UPDATED: Now takes drive + class
├── grading_processor.py        ← Existing: Main processing logic
├── extract_grades_simple.py    ← Existing: OCR extraction
├── ocr_utils.py                ← Existing: OCR utilities
└── grade_parser.py             ← Existing: Grade parsing logic
```

---

## ✨ Summary

**The full stack is now integrated!**

- ✅ React frontend with beautiful Quiz Grader UI
- ✅ Express backend with 3 new API endpoints
- ✅ Python CLI scripts that handle all the processing
- ✅ Real-time logging in the React UI
- ✅ Automatic ZIP file detection
- ✅ OCR grade extraction with confidence flags

**Next Steps:** Test it out and let me know if you encounter any issues!

