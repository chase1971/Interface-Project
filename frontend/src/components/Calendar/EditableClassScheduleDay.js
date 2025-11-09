import React from 'react';

/**
 * Component for rendering an editable class schedule item.
 * This is used ONLY in edit contexts (like semester edit view).
 * It handles pickup/drop interactions.
 */
const EditableClassScheduleDay = ({ 
  classScheduleItem, 
  date, 
  isPickedUp,
  isFixed,
  onPickup,
  onDrop,
  onCancelPickup
}) => {
  const handleClick = (e) => {
    e.stopPropagation();
    
    if (isFixed) {
      // Fixed items can't be moved
      return;
    }
    
    if (isPickedUp) {
      // Cancel pickup if clicking the same item
      onCancelPickup();
    } else {
      // Pick up the item
      onPickup(date, classScheduleItem, e);
    }
  };

  const handleDayClick = (e) => {
    // If clicking on the day (not the text) and we have a picked up item, drop it
    if (!e.target.closest('.class-schedule-text') && !isPickedUp) {
      onDrop(date);
    }
  };

  return (
    <div 
      className="class-schedule-text"
      onClick={handleClick}
      style={{ 
        cursor: isFixed ? 'not-allowed' : (isPickedUp ? 'grabbing' : 'grab'),
        opacity: isPickedUp ? 0.3 : 1,
        userSelect: 'none'
      }}
    >
      {classScheduleItem.itemName}
    </div>
  );
};

export default EditableClassScheduleDay;

