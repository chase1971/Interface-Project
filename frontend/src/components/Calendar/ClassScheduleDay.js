import React from 'react';

/**
 * Pure component for rendering a class schedule item in a calendar day.
 * This component has NO edit mode logic - it's purely presentational.
 * Used by the main calendar for read-only display.
 */
const ClassScheduleDay = ({ 
  classScheduleItem, 
  date, 
  onDayClick 
}) => {
  const handleClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.closest('.calendar-day').getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    onDayClick(date, {
      top: rect.top + scrollTop,
      left: rect.left + scrollLeft,
      width: rect.width,
      height: rect.height
    });
  };

  return (
    <div 
      className="class-schedule-text"
      onClick={handleClick}
      style={{ 
        cursor: 'pointer'
      }}
    >
      {classScheduleItem.itemName}
    </div>
  );
};

export default ClassScheduleDay;

