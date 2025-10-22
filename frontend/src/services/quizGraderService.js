// Quiz Grader Service
// Handles API calls to the backend for quiz grading functionality

const API_BASE_URL = 'http://localhost:5000/api';

export const listClasses = async (drive) => {
  try {
    const response = await fetch(`${API_BASE_URL}/quiz/list-classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ drive })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('List classes service error:', error);
    return {
      success: false,
      error: error.message || 'Failed to list classes'
    };
  }
};

export const processQuizzes = async (drive, selectedClass, addLog) => {
  try {
    addLog('📡 Sending process request to backend...');
    
    const response = await fetch(`${API_BASE_URL}/quiz/process`, {
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
    
    return result;
  } catch (error) {
    console.error('Process quizzes service error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process quizzes'
    };
  }
};

export const extractGrades = async (drive, selectedClass, addLog) => {
  try {
    addLog('📡 Sending grade extraction request to backend...');
    
    const response = await fetch(`${API_BASE_URL}/quiz/extract-grades`, {
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
    
    return result;
  } catch (error) {
    console.error('Extract grades service error:', error);
    return {
      success: false,
      error: error.message || 'Failed to extract grades'
    };
  }
};

export const splitPdf = async (drive, selectedClass, addLog) => {
  try {
    addLog('📡 Sending split PDF request to backend...');
    
    const response = await fetch(`${API_BASE_URL}/quiz/split-pdf`, {
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
    
    return result;
  } catch (error) {
    console.error('Split PDF service error:', error);
    return {
      success: false,
      error: error.message || 'Failed to split PDF'
    };
  }
};

export const openFolder = async (drive, selectedClass, addLog) => {
  try {
    addLog('📡 Sending open folder request to backend...');
    
    const response = await fetch(`${API_BASE_URL}/quiz/open-folder`, {
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
    
    return result;
  } catch (error) {
    console.error('Open folder service error:', error);
    return {
      success: false,
      error: error.message || 'Failed to open folder'
    };
  }
};

export const clearAllData = async (drive, selectedClass, addLog) => {
  try {
    addLog('📡 Sending clear request to backend...');
    
    const response = await fetch(`${API_BASE_URL}/quiz/clear-data`, {
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
    
    return result;
  } catch (error) {
    console.error('Clear data service error:', error);
    return {
      success: false,
      error: error.message || 'Failed to clear data'
    };
  }
};
