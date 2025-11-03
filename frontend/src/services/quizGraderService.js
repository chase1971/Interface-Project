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

export const processSelectedQuiz = async (drive, selectedClass, zipPath, addLog) => {
  try {
    addLog('📡 Sending selected quiz processing request to backend...');
    
    const response = await fetch(`${API_BASE_URL}/quiz/process-selected`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        drive,
        className: selectedClass,
        zipPath
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
    console.error('Process selected quiz service error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process selected quiz'
    };
  }
};

export const processCompletion = async (drive, selectedClass, dontOverride, addLog) => {
  try {
    addLog('📡 Sending completion processing request to backend...');
    
    const response = await fetch(`${API_BASE_URL}/quiz/process-completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        drive,
        className: selectedClass,
        dontOverride: dontOverride || false
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
    console.error('Process completion service error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process completion'
    };
  }
};

export const processSelectedCompletion = async (drive, selectedClass, zipPath, dontOverride, addLog) => {
  try {
    addLog('📡 Sending selected completion processing request to backend...');
    
    const response = await fetch(`${API_BASE_URL}/quiz/process-completion-selected`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        drive,
        className: selectedClass,
        zipPath,
        dontOverride: dontOverride || false
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
    console.error('Process selected completion service error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process selected completion'
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

export const openDownloads = async (addLog) => {
  try {
    addLog('📡 Sending open downloads request to backend...');
    
    // Use the existing open-folder endpoint with a special parameter
    const response = await fetch(`${API_BASE_URL}/quiz/open-folder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        drive: 'C',
        className: 'DOWNLOADS' // Special flag to open Downloads folder
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
    console.error('Open downloads service error:', error);
    return {
      success: false,
      error: error.message || 'Failed to open downloads folder'
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
