import { getApiBaseUrl } from '../config';

/**
 * List available classes from the Rosters etc folder
 */
export const listClasses = async (drive) => {
  try {
    const API_BASE_URL = await getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/api/quiz/list-classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ drive }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('List classes error:', error);
    return {
      success: false,
      error: error.message || 'Failed to list classes',
    };
  }
};

/**
 * Process quizzes (extract Canvas ZIP, combine PDFs, prepare for grading)
 */
export const processQuizzes = async (drive, className, onLog) => {
  try {
    const API_BASE_URL = await getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/api/quiz/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ drive, className }),
    });

    const data = await response.json();
    
    // If logs are provided, call the onLog callback for each log line
    if (data.logs && onLog) {
      data.logs.forEach(log => onLog(log));
    }
    
    return data;
  } catch (error) {
    console.error('Process quizzes error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process quizzes',
    };
  }
};

/**
 * Extract grades from graded PDF using OCR
 */
export const extractGrades = async (drive, className, onLog) => {
  try {
    const API_BASE_URL = await getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/api/quiz/extract-grades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ drive, className }),
    });

    const data = await response.json();
    
    // If logs are provided, call the onLog callback for each log line
    if (data.logs && onLog) {
      data.logs.forEach(log => onLog(log));
    }
    
    return data;
  } catch (error) {
    console.error('Extract grades error:', error);
    return {
      success: false,
      error: error.message || 'Failed to extract grades',
    };
  }
};

/**
 * Clear all processing data (delete grade processing folder and ZIP file)
 */
export const clearAllData = async (drive, className, onLog) => {
  try {
    const API_BASE_URL = await getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/api/quiz/clear-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ drive, className }),
    });

    const data = await response.json();
    
    // If logs are provided, call the onLog callback for each log line
    if (data.logs && onLog) {
      data.logs.forEach(log => onLog(log));
    }
    
    return data;
  } catch (error) {
    console.error('Clear data error:', error);
    return {
      success: false,
      error: error.message || 'Failed to clear data',
    };
  }
};

