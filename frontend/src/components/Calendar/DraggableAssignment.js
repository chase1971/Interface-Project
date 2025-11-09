import React, { useState, useEffect, useRef } from 'react';
import { parseDate } from '../../utils/calendarUtils';

const DraggableAssignment = ({
  assignment,
  date,
  isEditMode,
  onDragStart,
  onDragEnd,
  onClick,
  isBeingDragged
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const [mouseDownPos, setMouseDownPos] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const elementRef = useRef(null);
  const isPressedRef = useRef(false);
  const hasDraggedRef = useRef(false);

  const isDueDate = assignment.dueDate && 
    parseDate(assignment.dueDate)?.toDateString() === date.toDateString();
  const isStartDate = assignment.startDate && 
    parseDate(assignment.startDate)?.toDateString() === date.toDateString();
  
  // Build display text with name and time
  let displayText = assignment.itemName;
  if (isStartDate && assignment.startTime) {
    displayText += ` (${assignment.startTime})`;
  }
  if (isDueDate && assignment.dueTime) {
    displayText += ` (Due: ${assignment.dueTime})`;
  }

  const handleMouseDown = (e) => {
    // Class starts marker and class schedule items should not be draggable
    if (assignment.isClassStartsMarker || assignment.isClassSchedule) {
      return;
    }
    
    if (!isEditMode) return;
    
    // Don't pick up on right-click (button 2) - that's for context menu
    if (e.button === 2) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // Don't pick up if already being dragged (prevents double-pickup)
    // But allow clicking even if picked up (to cancel or re-pick)
    if (isBeingDragged) {
      e.stopPropagation();
      return;
    }
    
    setMouseDownPos({ x: e.clientX, y: e.clientY });
    setHasDragged(false);
    hasDraggedRef.current = false;
    
    const rect = elementRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsPressed(true);
    isPressedRef.current = true;
    
    // Start drag/pick-up immediately on mousedown
    // This allows both click-to-pick-up and drag-to-move
    setIsDragging(true);
    if (onDragStart) {
      // Determine which date type is being dragged based on which date this assignment is displayed on
      const dateType = isStartDate ? 'start' : (isDueDate ? 'due' : null);
      onDragStart(e, assignment, { x: e.clientX, y: e.clientY }, { dateType });
    }
  };
  
  const handleClick = (e) => {
    // Prevent click from bubbling to calendar day
    // This prevents immediate drop when clicking to pick up
    if (isEditMode) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleMouseMove = (e) => {
    if (isPressed && isEditMode) {
      // Continue dragging
    }
  };

  const handleMouseUp = (e) => {
    // Don't handle mouseup here - let the global handler do it
    // This prevents immediate drop on click
  };


  // Add global mouse event listeners
  useEffect(() => {
    if (isPressed && mouseDownPos) {
      const handleGlobalMouseMove = (e) => {
        // Check if mouse has moved at all
        const deltaX = Math.abs(e.clientX - mouseDownPos.x);
        const deltaY = Math.abs(e.clientY - mouseDownPos.y);
        
        // Mark as dragged if we've moved
        if (deltaX > 1 || deltaY > 1) {
          setHasDragged(true);
          hasDraggedRef.current = true;
          
          // Ensure we're dragging (should already be set from mousedown, but double-check)
          if (!isDragging) {
            setIsDragging(true);
            if (onDragStart) {
              // Determine which date type is being dragged
              const dateType = isStartDate ? 'start' : (isDueDate ? 'due' : null);
              onDragStart(e, assignment, { x: e.clientX, y: e.clientY }, { dateType });
            }
          }
        }
      };

      const handleGlobalMouseUp = (e) => {
        // If we actually dragged (moved the mouse), handle it as a drag end
        if (hasDraggedRef.current) {
          setIsPressed(false);
          isPressedRef.current = false;
          setIsDragging(false);
          
          if (onDragEnd) {
            onDragEnd(e);
          }
          
          // Reset drag state immediately to allow for next drag
          setHasDragged(false);
          hasDraggedRef.current = false;
          setMouseDownPos(null);
        } else {
          // Just clicked - keep it picked up, don't clear state
          // The drop will happen on the next click on a calendar day
          setIsPressed(false);
          isPressedRef.current = false;
          // Keep isDragging true so the ghost image stays visible
          // Don't call onDragEnd - we want to keep it picked up
          // Don't reset hasDragged or mouseDownPos - we need to track that we're picked up
        }
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isPressed, isEditMode, mouseDownPos, isDragging, onDragEnd, onDragStart, assignment]);

  const handleContextMenu = (e) => {
    // Right click to edit time - cancel any pending drag
    // Class schedule items cannot be edited
    if (isEditMode && onClick && !assignment.isClassSchedule && !assignment.isClassStartsMarker) {
      e.preventDefault();
      e.stopPropagation();
      
      // Reset drag state completely
      setIsPressed(false);
      isPressedRef.current = false;
      setIsDragging(false);
      setHasDragged(false);
      hasDraggedRef.current = false;
      setMouseDownPos(null);
      
      // Open edit modal
      onClick(assignment);
    }
  };

  return (
    <div
      ref={elementRef}
      className={`assignment-item ${isDueDate ? 'has-due-date' : ''} ${isStartDate ? 'has-start-date' : ''} ${isEditMode && !assignment.isClassStartsMarker && !assignment.isClassSchedule ? 'draggable' : ''} ${isDragging && isBeingDragged ? 'dragging' : ''} ${isBeingDragged ? 'being-dragged' : ''} ${assignment.isClassStartsMarker ? 'class-starts-marker' : ''} ${assignment.isClassSchedule ? 'class-schedule-item' : ''} ${assignment.classScheduleType === 'quiz' ? 'class-schedule-quiz' : ''} ${assignment.classScheduleType === 'test' ? 'class-schedule-test' : ''} ${assignment.classScheduleType === 'exam' ? 'class-schedule-exam' : ''} ${assignment.classScheduleType === 'holiday' ? 'class-schedule-holiday' : ''}`}
      title={displayText}
      onMouseDown={assignment.isClassStartsMarker || assignment.isClassSchedule ? undefined : handleMouseDown}
      onMouseMove={assignment.isClassStartsMarker || assignment.isClassSchedule ? undefined : handleMouseMove}
      onMouseUp={assignment.isClassStartsMarker || assignment.isClassSchedule ? undefined : handleMouseUp}
      onClick={assignment.isClassStartsMarker || assignment.isClassSchedule ? undefined : handleClick}
      onContextMenu={assignment.isClassStartsMarker || assignment.isClassSchedule ? undefined : handleContextMenu}
      style={{
        cursor: isEditMode && !assignment.isClassStartsMarker && !assignment.isClassSchedule ? 'grab' : 'default',
        userSelect: 'none',
        transform: (isDragging && isBeingDragged) ? 'scale(1.1) translateZ(0)' : (isPressed ? 'scale(1.05)' : 'scale(1)'),
        zIndex: (isDragging && isBeingDragged) ? 1000 : 'auto',
        position: (isDragging && isBeingDragged) ? 'relative' : 'static',
        transition: (isDragging && isBeingDragged) ? 'none' : 'transform 0.2s ease',
        opacity: isBeingDragged ? undefined : 1 // Don't gray out if just picked up
      }}
    >
      <div className="assignment-name">{assignment.itemName}</div>
      {(isStartDate && assignment.startTime) && (
        <div className="assignment-time">Start: {assignment.startTime}</div>
      )}
      {(isDueDate && assignment.dueTime) && (
        <div className="assignment-time due-time">Due: {assignment.dueTime}</div>
      )}
    </div>
  );
};

export default DraggableAssignment;
