// Debug utility for conditional logging
// Toggle debug mode: localStorage.setItem('debugMode', 'true'/'false')
// Or use the DebugOverlay toggle button

const isDebugMode = () => {
  // Check localStorage for debug mode setting
  const debugMode = localStorage.getItem('debugMode');
  // Default to 'true' in development, 'false' in production
  if (debugMode === null) {
    return process.env.NODE_ENV === 'development';
  }
  return debugMode === 'true';
};

// Enhanced console.log that respects debug mode
export const debugLog = (...args) => {
  if (isDebugMode()) {
    console.log(...args);
  }
};

// Enhanced console.error (always shows, but can be styled differently)
export const debugError = (...args) => {
  console.error(...args);
};

// Enhanced console.warn
export const debugWarn = (...args) => {
  if (isDebugMode()) {
    console.warn(...args);
  }
};

// Log with a specific category/tag
export const debugLogCategory = (category, ...args) => {
  if (isDebugMode()) {
    console.log(`[${category}]`, ...args);
  }
};

// Toggle debug mode
export const toggleDebugMode = () => {
  const current = isDebugMode();
  localStorage.setItem('debugMode', (!current).toString());
  return !current;
};

// Get current debug mode
export const getDebugMode = () => isDebugMode();

