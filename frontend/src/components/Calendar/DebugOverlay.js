import React, { useState, useEffect, useRef } from 'react';
import './DebugOverlay.css';
import { getDebugMode, toggleDebugMode } from '../../utils/debug';

const DebugOverlay = () => {
  const [logs, setLogs] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [debugEnabled, setDebugEnabled] = useState(() => getDebugMode());
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 500, height: 400 });
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

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current && !isMinimized) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isMinimized]);

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
    alert('Logs copied to clipboard!');
  };

  const handleToggleDebug = () => {
    const newState = toggleDebugMode();
    setDebugEnabled(newState);
    // Clear logs when disabling
    if (!newState) {
      setLogs([]);
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={overlayRef}
      className="debug-overlay"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? 'auto' : `${size.width}px`,
        height: isMinimized ? 'auto' : `${size.height}px`
      }}
    >
      <div 
        className="debug-overlay-header"
        onMouseDown={handleMouseDown}
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
          <button onClick={copyLogs} title="Copy logs">📋</button>
          <button onClick={clearLogs} title="Clear logs">🗑️</button>
          <button onClick={() => setIsMinimized(!isMinimized)} title="Minimize">
            {isMinimized ? '⬆️' : '⬇️'}
          </button>
          <button onClick={() => setIsVisible(false)} title="Close">✕</button>
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

