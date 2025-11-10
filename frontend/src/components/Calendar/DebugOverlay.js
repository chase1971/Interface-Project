import React, { useState, useEffect, useRef } from 'react';
import './DebugOverlay.css';
import { getDebugMode, toggleDebugMode } from '../../utils/debug';

const DebugOverlay = () => {
  const [logs, setLogs] = useState([]);
  const [isMinimized, setIsMinimized] = useState(() => {
    // Check localStorage for minimized state
    const saved = localStorage.getItem('debugOverlayMinimized');
    return saved !== null ? saved === 'true' : false;
  });
  const [isVisible, setIsVisible] = useState(() => {
    // Check localStorage for visibility state
    const saved = localStorage.getItem('debugOverlayVisible');
    return saved !== null ? saved === 'true' : true;
  });
  const [debugEnabled, setDebugEnabled] = useState(() => getDebugMode());
  const [position, setPosition] = useState(() => {
    // Load position from localStorage
    const saved = localStorage.getItem('debugOverlayPosition');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return { x: 20, y: 20 };
      }
    }
    return { x: 20, y: 20 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState(() => {
    // Load size from localStorage
    const saved = localStorage.getItem('debugOverlaySize');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return { width: 500, height: 400 };
      }
    }
    return { width: 500, height: 400 };
  });
  const [isResizing, setIsResizing] = useState(false);
  const overlayRef = useRef(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    // Store original console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // Queue for log messages to avoid React render errors
    let logQueue = [];
    let timeoutId = null;

    const flushLogs = () => {
      if (logQueue.length > 0) {
        setLogs(prev => [...prev, ...logQueue]);
        logQueue = [];
      }
      timeoutId = null;
    };

    const addLog = (type, message) => {
      // Only add logs if debug mode is enabled
      if (!getDebugMode()) return;
      
      logQueue.push({
        type,
        message,
        timestamp: new Date().toLocaleTimeString()
      });
      
      // Flush logs asynchronously to avoid React render errors
      if (!timeoutId) {
        timeoutId = setTimeout(flushLogs, 0);
      }
    };

    // Override console.log
    console.log = (...args) => {
      originalLog.apply(console, args);
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      addLog('log', message);
    };

    // Override console.error
    console.error = (...args) => {
      originalError.apply(console, args);
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      addLog('error', message);
    };

    // Override console.warn
    console.warn = (...args) => {
      originalWarn.apply(console, args);
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      addLog('warn', message);
    };

    // Restore original methods on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // Save visibility state to localStorage
  useEffect(() => {
    localStorage.setItem('debugOverlayVisible', String(isVisible));
  }, [isVisible]);

  // Save minimized state to localStorage
  useEffect(() => {
    localStorage.setItem('debugOverlayMinimized', String(isMinimized));
  }, [isMinimized]);

  // Keyboard shortcut to toggle visibility (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem('debugOverlayPosition', JSON.stringify(position));
  }, [position]);

  // Save size to localStorage
  useEffect(() => {
    localStorage.setItem('debugOverlaySize', JSON.stringify(size));
  }, [size]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current && !isMinimized && isVisible) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isMinimized, isVisible]);

  const handleMouseDown = (e) => {
    if (e.target.classList.contains('debug-overlay-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    } else if (isResizing) {
      const newWidth = Math.max(300, e.clientX - position.x);
      const newHeight = Math.max(200, e.clientY - position.y);
      setSize({ width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing]);

  const handleResizeStart = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    setDragStart({
      x: e.clientX - size.width,
      y: e.clientY - size.height
    });
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const copyLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`
    ).join('\n');
    navigator.clipboard.writeText(logText);
    // Removed alert - logs are copied silently
    console.log('Logs copied to clipboard');
  };

  const handleToggleDebug = () => {
    const newState = toggleDebugMode();
    setDebugEnabled(newState);
    // Clear logs when disabling
    if (!newState) {
      setLogs([]);
    }
  };

  // If completely hidden, show a small restore button
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          zIndex: 99999,
          padding: '8px 12px',
          backgroundColor: '#0a5',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          pointerEvents: 'auto'
        }}
        title="Show Debug Logs (Ctrl+Shift+D)"
      >
        🔍 Debug
      </button>
    );
  }

  // When minimized, position at bottom of screen
  const minimizedStyle = isMinimized ? {
    left: '0',
    right: '0',
    top: 'auto',
    bottom: '0',
    width: '100%',
    height: 'auto',
    maxWidth: '100%',
    maxHeight: 'none',
    borderRadius: '8px 8px 0 0'
  } : {
    left: `${position.x}px`,
    top: `${position.y}px`,
    width: `${size.width}px`,
    height: `${size.height}px`,
    maxHeight: '90vh',
    maxWidth: '90vw'
  };

  return (
    <div
      ref={overlayRef}
      className={`debug-overlay ${isMinimized ? 'debug-overlay-minimized' : ''}`}
      style={{
        ...minimizedStyle,
        zIndex: 99999
      }}
    >
      <div 
        className="debug-overlay-header"
        onMouseDown={isMinimized ? undefined : handleMouseDown}
        style={{
          cursor: isMinimized ? 'pointer' : 'move',
          borderRadius: isMinimized ? '8px 8px 0 0' : undefined
        }}
      >
        <span>Debug Logs ({logs.length}) {debugEnabled ? '🟢' : '🔴'}</span>
        <div className="debug-overlay-controls">
          <button 
            onClick={handleToggleDebug} 
            title={debugEnabled ? "Disable debug mode" : "Enable debug mode"}
            style={{ 
              background: debugEnabled ? '#0a5' : '#555',
              fontWeight: 'bold'
            }}
          >
            {debugEnabled ? 'ON' : 'OFF'}
          </button>
          {!isMinimized && (
            <>
              <button onClick={copyLogs} title="Copy logs">📋</button>
              <button onClick={clearLogs} title="Clear logs">🗑️</button>
            </>
          )}
          <button 
            onClick={() => setIsMinimized(!isMinimized)} 
            title={isMinimized ? "Restore" : "Minimize to bottom"}
          >
            {isMinimized ? '⬆️' : '⬇️'}
          </button>
          <button 
            onClick={() => setIsVisible(false)} 
            title="Close"
            style={{ background: '#a00' }}
          >
            ✕
          </button>
        </div>
      </div>
      {!isMinimized && (
        <>
          <div className="debug-overlay-content">
            {logs.length === 0 ? (
              <div className="debug-overlay-empty">No logs yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={`debug-log debug-log-${log.type}`}>
                  <span className="debug-log-time">[{log.timestamp}]</span>
                  <span className="debug-log-message">{log.message}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
          <div 
            className="debug-overlay-resize-handle"
            onMouseDown={handleResizeStart}
          />
        </>
      )}
    </div>
  );
};

export default DebugOverlay;

