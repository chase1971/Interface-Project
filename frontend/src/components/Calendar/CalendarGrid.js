import React, { useState, useEffect, useRef } from 'react';
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
  classSchedule = [],
  pickedUpScheduleItem,
  scheduleItemDragPosition,
  onScheduleItemPickup,
  onScheduleItemDrop
}) => {
  const [dragOverDate, setDragOverDate] = useState(null);
  // Store initial schedule drag position so it's accessible in onClick handler
  const initialSchedulePosRef = useRef(null);
  // Track if we've already handled a drop to prevent duplicate handling
  const dropHandledRef = useRef(false);
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
    
    // Check if we have a picked up schedule item (for class calendar mode)
    const hasPickedUpSchedule = pickedUpScheduleItem && scheduleItemDragPosition;
    
    // Get initial position from picked up item (stored when item was picked up)
    const initialSchedulePos = pickedUpScheduleItem?.initialDragPosition || null;
    
    // Store in ref so it's accessible in onClick handler
    initialSchedulePosRef.current = initialSchedulePos;
    
    // Reset drop handled flag when item is cleared
    if (!pickedUpScheduleItem) {
      dropHandledRef.current = false;
    }
    
    if ((!hasDragged && !hasPickedUp && !hasPickedUpSchedule) || !isEditMode) {
      setDragOverDate(null);
      return;
    }

    const handleMouseMove = (e) => {
      // Update ghost position for assignments
      if (onAssignmentDragMove && (hasDragged || hasPickedUp)) {
        onAssignmentDragMove(e, null);
      }
      
      // Update schedule item drag position (handled by Calendar.js useEffect)
      // The position is already being tracked there
      
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
      // Handle assignment calendar mode drag-and-drop
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
      }
      
      // Handle class calendar mode drag-and-drop
      if (hasPickedUpSchedule && onScheduleItemDrop && scheduleItemDragPosition && initialSchedulePos && !dropHandledRef.current) {
        // Check if we have a start position to determine if user actually dragged
        // Use the initial position stored in pickedUpScheduleItem
        const currentPos = { x: e.clientX, y: e.clientY };
        
        // Only drop if user moved mouse significantly (actually dragged)
        // Lower threshold to make it more responsive
        const deltaX = Math.abs(currentPos.x - initialSchedulePos.x);
        const deltaY = Math.abs(currentPos.y - initialSchedulePos.y);
        const actuallyDragged = deltaX > 3 || deltaY > 3;
        
        console.log('Schedule drag check:', {
          initialPos: initialSchedulePos,
          currentPos: currentPos,
          deltaX,
          deltaY,
          actuallyDragged,
          hasPickedUpSchedule,
          hasOnDrop: !!onScheduleItemDrop,
          dropHandled: dropHandledRef.current
        });
        
        if (actuallyDragged) {
          // Mark that we're handling the drop to prevent duplicate handling
          dropHandledRef.current = true;
          // User dragged - drop on mouseup
          // Always try to find the calendar day under the mouse (more reliable than dragOverDate)
          let targetDate = null;
          
          // First try dragOverDate if available
          if (dragOverDate) {
            targetDate = dragOverDate;
          } else {
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
          
          // If still no target, try finding by traversing up from the target element
          if (!targetDate) {
            let element = e.target;
            let attempts = 0;
            while (element && attempts < 10) {
              if (element.classList && element.classList.contains('calendar-day') && !element.classList.contains('empty')) {
                const dayNumber = parseInt(element.querySelector('.day-number')?.textContent);
                if (dayNumber && !isNaN(dayNumber)) {
                  targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
                  break;
                }
              }
              element = element.parentElement;
              attempts++;
            }
          }
          
          if (targetDate) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Dropping schedule item on date:', targetDate);
            // Clear the picked up item immediately to prevent ghost from sticking
            // The drop handler will also clear it, but this ensures it's cleared even if handler fails
            onScheduleItemDrop(targetDate);
            // Reset drop handled flag after a short delay to allow for new drags
            setTimeout(() => {
              dropHandledRef.current = false;
            }, 100);
          } else {
            console.warn('Could not find target date for drop at', e.clientX, e.clientY);
            // If we can't find target, cancel the pickup
            if (onScheduleItemPickup) {
              onScheduleItemPickup(null, null, e);
            }
            // Reset drop handled flag
            dropHandledRef.current = false;
          }
        } else {
          // If not actually dragged, reset the flag
          dropHandledRef.current = false;
          // User just clicked (didn't drag) - cancel pickup if clicking outside
          // Don't clear here - let click-to-drop handle it
        }
      }
      
      // Clear drag over state
      setDragOverDate(null);
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
  }, [draggedAssignment, pickedUpAssignment, pickedUpScheduleItem, scheduleItemDragPosition, isEditMode, currentDate, onAssignmentDragMove, onAssignmentDrop, onScheduleItemDrop, dragStartPosition, dragPosition, calendarMode]);

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
    
    // Check if this date has a picked up schedule item (for visual feedback)
    const dateStr = date.toISOString().split('T')[0];
    const hasPickedUpItem = pickedUpScheduleItem && 
      pickedUpScheduleItem.sourceDate === dateStr &&
      classScheduleItem &&
      classScheduleItem.itemName === (pickedUpScheduleItem.itemName || pickedUpScheduleItem.description);

    days.push(
      <div
        key={day}
        className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isDragOver && isEditMode ? 'drag-over' : ''} ${hasPickedUpItem ? 'picked-up' : ''} ${scheduleType === 'quiz' ? 'class-schedule-day-quiz' : ''} ${scheduleType === 'test' ? 'class-schedule-day-test' : ''} ${scheduleType === 'exam' ? 'class-schedule-day-exam' : ''} ${scheduleType === 'holiday' ? 'class-schedule-day-holiday' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          
          // Don't handle clicks if we're in the middle of a drag operation
          // (mouseup will handle the drop)
          if (pickedUpScheduleItem && scheduleItemDragPosition && initialSchedulePosRef.current) {
            const currentPos = { x: e.clientX, y: e.clientY };
            const deltaX = Math.abs(currentPos.x - initialSchedulePosRef.current.x);
            const deltaY = Math.abs(currentPos.y - initialSchedulePosRef.current.y);
            const actuallyDragged = deltaX > 3 || deltaY > 3;
            
            // If user dragged, don't handle click - let mouseup handle it
            if (actuallyDragged) {
              return;
            }
          }
          
          // Handle class calendar mode clicks
          if (isEditMode && calendarMode === 'class') {
            const clickedElement = e.target;
            const isClickingAssignment = clickedElement.closest('.assignment-item');
            
            // If clicking on the assignment itself, let it handle the click (for picking up)
            if (isClickingAssignment) {
              return;
            }
            
            // If we have a picked up schedule item, drop it on this date (click-to-drop)
            // Only do this if we didn't just drag (check if it was a drag operation)
            if (pickedUpScheduleItem && onScheduleItemDrop) {
              // Check if this was a drag operation - if so, don't handle click (mouseup already handled it)
              if (scheduleItemDragPosition && initialSchedulePosRef.current) {
                const currentPos = { x: e.clientX, y: e.clientY };
                const deltaX = Math.abs(currentPos.x - initialSchedulePosRef.current.x);
                const deltaY = Math.abs(currentPos.y - initialSchedulePosRef.current.y);
                const actuallyDragged = deltaX > 3 || deltaY > 3;
                
                // If user dragged, don't handle click - mouseup already handled the drop
                if (actuallyDragged) {
                  return;
                }
              }
              
              e.preventDefault();
              e.stopPropagation();
              onScheduleItemDrop(date);
              return;
            }
            
            // If no item is picked up and this date has a schedule item, pick it up
            if (!pickedUpScheduleItem && classScheduleItem && onScheduleItemPickup) {
              e.preventDefault();
              e.stopPropagation();
              // Find the actual schedule item from the date assignments
              const scheduleItem = dateAssignments.find(item => item.isClassSchedule);
              if (scheduleItem) {
                // Find the actual item from classSchedule array by matching date and description
                const dateStr = date.toISOString().split('T')[0];
                const actualScheduleItem = classSchedule.find(item => 
                  item.date === dateStr && item.description === scheduleItem.itemName
                );
                if (actualScheduleItem) {
                  onScheduleItemPickup(date, actualScheduleItem, e);
                }
              }
              return;
            }
          }
          
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
        {/* Render assignments/class schedule items as draggable tiles */}
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
            
            // Determine if this item should be draggable
            // In edit mode, allow dragging if there's only one item (whether assignment or class schedule)
            const shouldBeDraggable = isEditMode && dateAssignments.length === 1;
            
            return (
              <DraggableAssignment
                key={`${assignment.itemName}-${assignment.startDate}-${assignment.dueDate}-${idx}`}
                assignment={assignment}
                date={date}
                isEditMode={shouldBeDraggable}
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
      {((draggedAssignment || pickedUpAssignment) && dragPosition && isEditMode && calendarMode === 'assignment') && (
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
      {/* Ghost preview when picked up schedule item (class calendar only) */}
      {/* Only show ghost if we have both the item AND a valid drag position */}
      {/* Double-check that item is actually picked up (not just state exists) */}
      {/* Use key to force unmount when item is cleared */}
      {(() => {
        const shouldShow = pickedUpScheduleItem && 
          scheduleItemDragPosition && 
          scheduleItemDragPosition.x !== undefined && 
          scheduleItemDragPosition.y !== undefined && 
          pickedUpScheduleItem.sourceDate && 
          isEditMode && 
          calendarMode === 'class';
        
        // Debug log to track ghost visibility
        if (shouldShow) {
          console.log('Ghost preview should show:', {
            hasItem: !!pickedUpScheduleItem,
            hasPosition: !!scheduleItemDragPosition,
            hasSourceDate: !!pickedUpScheduleItem?.sourceDate,
            isEditMode,
            calendarMode
          });
        }
        
        return shouldShow;
      })() && (
        <div
          key={`ghost-${pickedUpScheduleItem.sourceDate}-${pickedUpScheduleItem.description}`}
          className="drag-ghost"
          style={{
            position: 'fixed',
            left: scheduleItemDragPosition.x - 50,
            top: scheduleItemDragPosition.y - 20,
            pointerEvents: 'none',
            zIndex: 10000,
            opacity: 0.7,
            transform: 'scale(1.1)',
            transition: 'none',
            display: pickedUpScheduleItem && pickedUpScheduleItem.sourceDate ? 'block' : 'none'
          }}
        >
          <div className="assignment-item has-start-date">
            <div className="assignment-name">{pickedUpScheduleItem.itemName || pickedUpScheduleItem.description}</div>
          </div>
        </div>
      )}
    </>
  );
};

export default CalendarGrid;
