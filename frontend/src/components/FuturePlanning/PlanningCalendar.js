import React from 'react';
import { monthNames, getDaysInMonth, dayNames } from '../../utils/calendarUtils';

/**
 * Component for rendering the planning calendar grid
 * @param {Object} props - Component props
 * @param {Date} props.currentDate - Current month being displayed
 * @param {Function} props.onPreviousMonth - Callback for previous month
 * @param {Function} props.onNextMonth - Callback for next month
 * @param {string} props.calendarMode - Current calendar mode ('class' or 'assignment')
 * @param {Function} props.onToggleMode - Callback to toggle calendar mode
 * @param {Date|null} props.futureStartDate - The selected start date
 * @param {string|null} props.pickedUpClass - ID of picked up class
 * @param {Function} props.onClassDrop - Callback when class is dropped on a date
 * @param {Function} props.getItemsForDate - Function to get items for a specific date
 * @param {boolean} props.editMode - Whether edit mode is enabled
 * @param {Object|null} props.pickedUpItem - Item being moved in edit mode
 * @param {Function} props.onItemPickup - Callback when an item is picked up for editing
 * @param {Function} props.onItemDrop - Callback when an item is dropped in edit mode
 */
const PlanningCalendar = ({
  currentDate,
  onPreviousMonth,
  onNextMonth,
  calendarMode,
  onToggleMode,
  futureStartDate,
  pickedUpClass,
  onClassDrop,
  getItemsForDate,
  editMode,
  pickedUpItem,
  onItemPickup,
  onItemDrop
}) => {
  const daysInMonth = getDaysInMonth(currentDate);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const firstDay = firstDayOfMonth.getDay();
  const days = [];

  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const items = getItemsForDate(date);
    const isStartDate = futureStartDate && date.toDateString() === futureStartDate.toDateString();
    const isDropTarget = pickedUpClass && !isStartDate;
    
    // Separate items by type
    const classScheduleItems = items.filter(item => item.type === 'classSchedule');
    const assignmentItems = items.filter(item => item.type === 'assignment');
    
    // Determine if this day should have a full-cell color (class schedule mode)
    const hasClassSchedule = classScheduleItems.length > 0;
    const scheduleType = hasClassSchedule ? classScheduleItems[0].classScheduleType : null;
    const scheduleTypeClass = scheduleType ? `class-schedule-day-${scheduleType}` : '';

    // Show class schedule in class mode, assignments in assignment mode
    const showClassSchedule = calendarMode === 'class' && hasClassSchedule;
    const showAssignments = calendarMode === 'assignment' && assignmentItems.length > 0;
    
    // Edit mode: check if this item is picked up or if this is a drop target
    const dateStr = date.toISOString().split('T')[0];
    const isPickedUpItem = editMode && pickedUpItem && pickedUpItem.sourceDate === dateStr;
    const isEditDropTarget = editMode && pickedUpItem && !isPickedUpItem && !classScheduleItems.some(item => item.isFixedHoliday);

    days.push(
      <div
        key={day}
        className={`calendar-day ${isStartDate ? 'start-date' : ''} ${isDropTarget ? 'drop-target' : ''} ${showClassSchedule ? scheduleTypeClass : ''} ${isPickedUpItem ? 'picked-up-item' : ''} ${isEditDropTarget ? 'edit-drop-target' : ''} ${editMode && hasClassSchedule && !classScheduleItems[0].isFixedHoliday ? 'editable-item' : ''}`}
        onClick={() => {
          if (editMode && hasClassSchedule && classScheduleItems.length > 0 && !classScheduleItems[0].isFixedHoliday) {
            // Edit mode: pick up or drop item
            if (pickedUpItem) {
              // Drop the item
              onItemDrop(date);
            } else {
              // Pick up the item
              onItemPickup(date, classScheduleItems[0]);
            }
          } else if (pickedUpClass && !editMode) {
            // Normal mode: drop class
            onClassDrop(date);
          }
        }}
      >
        <div className="day-number">{day}</div>
        {showClassSchedule ? (
          <div className="class-schedule-text">
            {classScheduleItems[0].itemName}
          </div>
        ) : showAssignments ? (
          <div className="day-content">
            {assignmentItems.map((a, idx) => (
              <div key={idx} className="assignment-item">{a.itemName}</div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="planning-calendar">
      <div className="calendar-controls">
        <button onClick={onPreviousMonth}>
          ← Previous
        </button>
        <h3>{monthNames[month]} {year}</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={onToggleMode}
            style={{
              padding: '8px 16px',
              background: calendarMode === 'class' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(0, 179, 255, 0.1)',
              border: `2px solid ${calendarMode === 'class' ? '#4caf50' : 'var(--accent-blue)'}`,
              borderRadius: '6px',
              color: calendarMode === 'class' ? '#4caf50' : 'var(--accent-blue)',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontFamily: '"Rajdhani", sans-serif',
              fontSize: '0.9rem'
            }}
          >
            {calendarMode === 'assignment' ? '📚 Class Calendar' : '📝 Assignment Calendar'}
          </button>
          <button onClick={onNextMonth}>
            Next →
          </button>
        </div>
      </div>
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
    </div>
  );
};

export default PlanningCalendar;

