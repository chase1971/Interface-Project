/**
 * File Extractor Service
 * Handles API calls for file extraction operations
 */

import { getApiBaseUrl } from '../config';

/**
 * Process files - extract ZIP, combine PDFs, update Import File
 */
export const processFiles = async (drive, className, onLog) => {
  try {
    const API_BASE_URL = await getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/api/file-extractor/process`, {
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
    console.error('Process files error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process files',
    };
  }
};

/**
 * Clear all processing data (delete grade processing folder and ZIP file)
 */
export const clearAllData = async (drive, className, onLog) => {
  try {
    const API_BASE_URL = await getApiBaseUrl();
    const response = await fetch(`${API_BASE_URL}/api/file-extractor/clear-data`, {
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

