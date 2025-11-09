import React from 'react';

/**
 * Component for rendering a class schedule item in a calendar day.
 * Shows picked-up state when item is being moved.
 */
const ClassScheduleDay = ({ 
  classScheduleItem, 
  date,
  pickedUp = false
}) => {
  return (
    <div
      className={`class-schedule-chip${pickedUp ? ' picked' : ''}`}
      title="Click a day to pick up / drop class schedule"
    >
      {classScheduleItem.itemName || classScheduleItem.description}
    </div>
  );
};

export default ClassScheduleDay;

