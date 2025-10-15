// File Extractor Service
// Handles API calls to the backend for file extraction functionality

const API_BASE_URL = 'http://localhost:5000/api';

export const processFiles = async (drive, selectedClass, addLog) => {
  try {
    addLog('📡 Sending request to backend...');
    
    const response = await fetch(`${API_BASE_URL}/file-extractor/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        drive,
        className: selectedClass
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Log any messages from the backend
    if (result.logs) {
      result.logs.forEach(message => addLog(message));
    }
    
    // If there's an error in the result, log it
    if (!result.success && result.error) {
      addLog(`❌ Backend Error: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error('File extractor service error:', error);
    addLog(`❌ Network Error: ${error.message}`);
    return {
      success: false,
      error: error.message || 'Failed to process files'
    };
  }
};

export const clearAllData = async (drive, selectedClass, addLog) => {
  try {
    addLog('📡 Sending clear request to backend...');
    
    const response = await fetch(`${API_BASE_URL}/file-extractor/clear-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        drive,
        className: selectedClass
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Log any messages from the backend
    if (result.logs) {
      result.logs.forEach(message => addLog(message));
    }
    
    // If there's an error in the result, log it
    if (!result.success && result.error) {
      addLog(`❌ Backend Error: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error('Clear data service error:', error);
    return {
      success: false,
      error: error.message || 'Failed to clear data'
    };
  }
};
