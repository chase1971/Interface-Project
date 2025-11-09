import React, { useState } from 'react';
import { parseDate, monthNames } from '../../utils/calendarUtils';
import DraggableAssignment from './DraggableAssignment';

const ExpandedDateModal = ({ 
  expandedDate, 
  expandedPosition, 
  assignments, 
  onClose,
  isEditMode,
  draggedAssignment,
  onAssignmentDragStart,
  onAssignmentDrop,
  onAssignmentClick
}) => {
  const [isDraggingFromModal, setIsDraggingFromModal] = useState(false);

  if (!expandedDate) return null;

  // Calculate position, adjusting if it would go off-screen
  let top = expandedPosition.top;
  let left = expandedPosition.left;
  const boxWidth = 350;
  const boxHeight = 400;
  
  // Adjust if it would go off the right edge
  if (left + boxWidth > window.innerWidth) {
    left = window.innerWidth - boxWidth - 10;
  }
  // Adjust if it would go off the bottom edge
  if (top + boxHeight > window.innerHeight) {
    top = window.innerHeight - boxHeight - 10;
  }
  // Adjust if it would go off the left edge
  if (left < 10) {
    left = 10;
  }
  // Adjust if it would go off the top edge
  if (top < 10) {
    top = 10;
  }

  const handleDragStart = (e, assignment, position, dateContext) => {
    setIsDraggingFromModal(true);
    if (onAssignmentDragStart) {
      onAssignmentDragStart(e, assignment, position, dateContext);
    }
  };
  
  const handleDragStartWithContext = (e, assignment, position, dateContext) => {
    // Pass through the date context to the parent
    handleDragStart(e, assignment, position, dateContext);
  };

  const handleDragEnd = (e) => {
    if (isDraggingFromModal && onAssignmentDrop && draggedAssignment) {
      // Close modal when dragging starts
      onClose();
    }
    setIsDraggingFromModal(false);
  };
  
  const handleAssignmentClick = (e, assignment, isStartDate, isDueDate) => {
    // In edit mode, clicking an assignment in the modal should pick it up
    if (isEditMode && onAssignmentDragStart) {
      e.preventDefault();
      e.stopPropagation();
      // Determine which date type is being dragged
      const dateType = isStartDate ? 'start' : (isDueDate ? 'due' : null);
      // Pick up the assignment - use current mouse position
      const clickPosition = { x: e.clientX, y: e.clientY };
      onAssignmentDragStart(e, assignment, clickPosition, { dateType });
      // Immediately trigger a mousemove to ensure ghost image appears and follows cursor
      // This ensures the ghost image appears right away, even before mouse moves
      setTimeout(() => {
        const moveEvent = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX: e.clientX,
          clientY: e.clientY
        });
        document.dispatchEvent(moveEvent);
      }, 0);
    }
  };

  return (
    <div 
      className="expanded-modal-overlay" 
      onClick={onClose}
      style={{ pointerEvents: 'auto' }}
    >
      <div 
        className="expanded-day-box" 
        style={{ top: top, left: left, width: boxWidth, maxHeight: boxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="expanded-header">
          <h3 className="expanded-date-title">
            {monthNames[expandedDate.getMonth()]} {expandedDate.getDate()}, {expandedDate.getFullYear()}
          </h3>
          <button 
            className="close-expanded-modal" 
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="expanded-assignments" style={{ 
          gap: assignments.length > 4 ? '3px' : assignments.length > 3 ? '5px' : '8px',
          padding: assignments.length > 4 ? '6px' : '8px'
        }}>
          {assignments.map((assignment, idx) => {
            const isDueDate = assignment.dueDate && 
              parseDate(assignment.dueDate)?.toDateString() === expandedDate.toDateString();
            const isStartDate = assignment.startDate && 
              parseDate(assignment.startDate)?.toDateString() === expandedDate.toDateString();
            
            const draggedAss = draggedAssignment && typeof draggedAssignment === 'object' && draggedAssignment.assignment 
              ? draggedAssignment.assignment 
              : draggedAssignment;
            const isBeingDragged = draggedAss && 
              draggedAss.itemName === assignment.itemName &&
              draggedAss.startDate === assignment.startDate &&
              draggedAss.dueDate === assignment.dueDate;
            
            return (
              <div key={idx} style={{ 
                marginBottom: assignments.length > 4 ? '2px' : assignments.length > 3 ? '3px' : '6px'
              }}>
                {isEditMode ? (
                  <div
                    className="expanded-assignment-item clickable"
                    onClick={(e) => handleAssignmentClick(e, assignment, isStartDate, isDueDate)}
                    style={{
                      cursor: 'pointer'
                    }}
                  >
                    <DraggableAssignment
                      assignment={assignment}
                      date={expandedDate}
                      isEditMode={isEditMode}
                      onDragStart={handleDragStartWithContext}
                      onDragEnd={handleDragEnd}
                      onClick={onAssignmentClick}
                      isBeingDragged={isBeingDragged}
                    />
                  </div>
                ) : (
                  <div 
                    className={`expanded-assignment-item ${isEditMode && onAssignmentClick ? 'clickable' : ''} ${assignment.classScheduleType === 'quiz' ? 'class-schedule-quiz' : ''} ${assignment.classScheduleType === 'test' ? 'class-schedule-test' : ''} ${assignment.classScheduleType === 'exam' ? 'class-schedule-exam' : ''} ${assignment.classScheduleType === 'holiday' ? 'class-schedule-holiday' : ''}`}
                    onContextMenu={isEditMode && onAssignmentClick ? (e) => {
                      e.preventDefault();
                      onAssignmentClick(assignment);
                    } : undefined}
                    style={{
                      cursor: isEditMode && onAssignmentClick ? 'pointer' : 'default',
                      padding: assignments.length > 4 ? '3px 5px' : assignments.length > 3 ? '4px 6px' : '6px 8px'
                    }}
                  >
                    <div className="expanded-assignment-name" style={{
                      fontSize: assignments.length > 4 ? '0.7rem' : assignments.length > 3 ? '0.75rem' : '0.9rem',
                      lineHeight: assignments.length > 4 ? '1.1' : '1.2'
                    }}>{assignment.itemName}</div>
                    {isStartDate && assignment.startTime && (
                      <div className="expanded-assignment-time" style={{
                        fontSize: assignments.length > 4 ? '0.6rem' : '0.65rem'
                      }}>Start: {assignment.startTime}</div>
                    )}
                    {isDueDate && assignment.dueTime && (
                      <div className="expanded-assignment-time due-time" style={{
                        fontSize: assignments.length > 4 ? '0.6rem' : '0.65rem'
                      }}>Due: {assignment.dueTime}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ExpandedDateModal;
