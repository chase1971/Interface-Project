import React, { useState, useEffect } from 'react';
import { parseDate, getDaysInMonth, dayNames } from '../../utils/calendarUtils';
import DraggableAssignment from './DraggableAssignment';
import ClassScheduleDay from './ClassScheduleDay';

const CalendarGrid = ({ 
  currentDate, 
  selectedDate, 
  getAssignmentsForDate, 
  onDayClick,
  isEditMode,
  draggedAssignment,
  pickedUpAssignment,
  dragPosition,
  dragStartPosition,
  onAssignmentDragStart,
  onAssignmentDragMove,
  onAssignmentDrop,
  onAssignmentClick,
  calendarMode = 'assignment',
  pickedUpScheduleItem,
  scheduleItemDragPosition,
  onScheduleItemPickup,
  onScheduleItemDrop
}) => {
  const [dragOverDate, setDragOverDate] = useState(null);
  const daysInMonth = getDaysInMonth(currentDate);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const firstDay = firstDayOfMonth.getDay();
  const days = [];
  const today = new Date();

  // Track mouse position over calendar days and update ghost position
  useEffect(() => {
    // Check if we have a dragged or picked up assignment (handle new object structure)
    const hasDragged = draggedAssignment && (
      (typeof draggedAssignment === 'object' && draggedAssignment.assignment) || 
      (typeof draggedAssignment !== 'object')
    );
    const hasPickedUp = pickedUpAssignment && (
      (typeof pickedUpAssignment === 'object' && pickedUpAssignment.assignment) || 
      (typeof pickedUpAssignment !== 'object')
    );
    
    if ((!hasDragged && !hasPickedUp) || !isEditMode) {
      setDragOverDate(null);
      return;
    }

    const handleMouseMove = (e) => {
      // Update ghost position
      if (onAssignmentDragMove) {
        onAssignmentDragMove(e, null);
      }
      
      // Find which calendar day the mouse is over
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const calendarDay = elements.find(el => el.classList.contains('calendar-day') && !el.classList.contains('empty'));
      
      if (calendarDay) {
        const dayNumber = parseInt(calendarDay.querySelector('.day-number')?.textContent);
        if (dayNumber && !isNaN(dayNumber)) {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
          setDragOverDate(date);
        } else {
          setDragOverDate(null);
        }
      } else {
        setDragOverDate(null);
      }
    };

    const handleMouseUp = (e) => {
      // Only drop on mouseup if user actually dragged (moved mouse significantly)
      // For click-to-pick-up, the drop will happen on the next click on a calendar day
      if (onAssignmentDrop && draggedAssignment && dragStartPosition && dragPosition) {
        const deltaX = Math.abs(dragPosition.x - dragStartPosition.x);
        const deltaY = Math.abs(dragPosition.y - dragStartPosition.y);
        const actuallyDragged = deltaX > 5 || deltaY > 5;
        
        if (actuallyDragged) {
          // User dragged - drop on mouseup
          let targetDate = dragOverDate;
          
          if (!targetDate) {
            // Try to find the calendar day under the mouse
            const elements = document.elementsFromPoint(e.clientX, e.clientY);
            const calendarDay = elements.find(el => el.classList.contains('calendar-day') && !el.classList.contains('empty'));
            
            if (calendarDay) {
              const dayNumber = parseInt(calendarDay.querySelector('.day-number')?.textContent);
              if (dayNumber && !isNaN(dayNumber)) {
                targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
              }
            }
          }
          
          if (targetDate) {
            e.preventDefault();
            e.stopPropagation();
            // Extract assignment from draggedAssignment
            const assignmentToDrop = (draggedAssignment && typeof draggedAssignment === 'object' && draggedAssignment.assignment)
              ? draggedAssignment.assignment
              : draggedAssignment;
            onAssignmentDrop(assignmentToDrop, targetDate);
          }
        }
        // If user just clicked (didn't drag), don't drop here - keep it picked up
        // Don't clear dragOverDate if we didn't drag - we want to keep the state
      } else {
        // No drag start/position info - just clear drag over state
        setDragOverDate(null);
      }
    };
    
    // Also handle click on calendar days when dragging
    const handleDayClick = (e, date) => {
      if (draggedAssignment && isEditMode && onAssignmentDrop) {
        e.preventDefault();
        e.stopPropagation();
        onAssignmentDrop(draggedAssignment, date);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedAssignment, isEditMode, currentDate, onAssignmentDragMove, onAssignmentDrop]);

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(
      <div key={`empty-${i}`} className="calendar-day empty"></div>
    );
  }

  // Add cells for each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const isToday = date.toDateString() === today.toDateString();
    const dateAssignments = getAssignmentsForDate(date);
    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
    const isDragOver = dragOverDate && dragOverDate.toDateString() === date.toDateString();
    
    // Check if we have class schedule items (for class calendar mode)
    const classScheduleItem = calendarMode === 'class' && dateAssignments.length > 0 && dateAssignments[0].isClassSchedule
      ? dateAssignments[0]
      : null;
    const scheduleType = classScheduleItem ? classScheduleItem.classScheduleType : null;

    days.push(
      <div
        key={day}
        className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isDragOver && isEditMode ? 'drag-over' : ''} ${scheduleType === 'quiz' ? 'class-schedule-day-quiz' : ''} ${scheduleType === 'test' ? 'class-schedule-day-test' : ''} ${scheduleType === 'exam' ? 'class-schedule-day-exam' : ''} ${scheduleType === 'holiday' ? 'class-schedule-day-holiday' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          
          // If assignment is picked up (clicked) or dragged, drop it on this date
          if (isEditMode && calendarMode === 'assignment' && (draggedAssignment || pickedUpAssignment) && onAssignmentDrop) {
            // Check if click is on the assignment itself (don't drop on same cell)
            const clickedElement = e.target;
            const isClickingAssignment = clickedElement.closest('.assignment-item');
            
            if (!isClickingAssignment) {
              // Clicking on the calendar day (not the assignment) - drop it
              e.preventDefault();
              e.stopPropagation();
              onAssignmentDrop(draggedAssignment || pickedUpAssignment, date);
              return;
            }
            // If clicking on assignment, don't drop - let the assignment handle it
            return;
          }
          
          // Otherwise, show expanded modal for multiple assignments (works in both edit and non-edit mode)
          if (dateAssignments.length >= 2) {
            // Check if click is on the assignment itself (don't open modal if clicking assignment)
            const clickedElement = e.target;
            const isClickingAssignment = clickedElement.closest('.assignment-item');
            
            if (!isClickingAssignment) {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
              const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
              onDayClick(date, {
                top: rect.top + scrollTop,
                left: rect.left + scrollLeft,
                width: rect.width,
                height: rect.height
              });
            }
          }
        }}
      >
        <div className="day-number">{day}</div>
        {calendarMode === 'class' && classScheduleItem ? (
          // Class calendar mode: use read-only component (main calendar is always read-only)
          <ClassScheduleDay
            classScheduleItem={classScheduleItem}
            date={date}
            onDayClick={onDayClick}
          />
        ) : (
          // Assignment calendar mode: use existing boxes
          <div 
            className="day-assignments" 
            data-count={dateAssignments.length}
            style={{
              minHeight: '20px'
            }}
          >
            {dateAssignments.slice(0, 1).map((assignment, idx) => {
              // Only mark as "being dragged" if actually dragged (not just picked up)
              // This prevents graying out when just clicking to pick up
              const draggedAss = draggedAssignment && typeof draggedAssignment === 'object' && draggedAssignment.assignment 
                ? draggedAssignment.assignment 
                : draggedAssignment;
              const isBeingDragged = draggedAss && 
                draggedAss.itemName === assignment.itemName &&
                draggedAss.startDate === assignment.startDate &&
                draggedAss.dueDate === assignment.dueDate;
              
              // Check if this assignment is picked up (but not dragged yet)
              const pickedAss = pickedUpAssignment && typeof pickedUpAssignment === 'object' && pickedUpAssignment.assignment 
                ? pickedUpAssignment.assignment 
                : pickedUpAssignment;
              const isPickedUp = pickedAss && !draggedAssignment &&
                pickedAss.itemName === assignment.itemName &&
                pickedAss.startDate === assignment.startDate &&
                pickedAss.dueDate === assignment.dueDate;
              
              return (
                <DraggableAssignment
                  key={`${assignment.itemName}-${assignment.startDate}-${assignment.dueDate}-${idx}`}
                  assignment={assignment}
                  date={date}
                  isEditMode={isEditMode && dateAssignments.length === 1 && !assignment.isClassSchedule}
                  onDragStart={onAssignmentDragStart}
                  onDragEnd={(e) => {
                    // The drop is handled by the global mouseup in the useEffect
                    // This just clears local state
                  }}
                  onClick={onAssignmentClick}
                  isBeingDragged={isBeingDragged}
                />
              );
            })}
            {dateAssignments.length > 1 && (
              <div className="assignment-more">+{dateAssignments.length - 1} more</div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="calendar-grid">
        <div className="calendar-weekdays">
          {dayNames.map(day => (
            <div key={day} className="weekday-header">{day}</div>
          ))}
        </div>
        <div className="calendar-days">
          {days}
        </div>
      </div>
      {/* Ghost preview when dragging or picked up (assignment calendar only) */}
      {((draggedAssignment || pickedUpAssignment) && dragPosition && isEditMode) && (
        <div
          className="drag-ghost"
          style={{
            position: 'fixed',
            left: dragPosition.x - 50,
            top: dragPosition.y - 20,
            pointerEvents: 'none',
            zIndex: 10000,
            opacity: 0.7,
            transform: 'scale(1.1)',
            transition: 'none'
          }}
        >
          {(() => {
            const source = draggedAssignment || pickedUpAssignment;
            const assignment = typeof source === 'object' && source.assignment 
              ? source.assignment 
              : source;
            return (
              <div className={`assignment-item ${assignment.dueDate ? 'has-due-date' : 'has-start-date'}`}>
                <div className="assignment-name">{assignment.itemName}</div>
              </div>
            );
          })()}
        </div>
      )}
    </>
  );
};

export default CalendarGrid;
