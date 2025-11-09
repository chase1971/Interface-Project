// Script to update the TTH default calendar in localStorage with corrected dates
// Run this in the browser console after the app is loaded

(function updateTTHCalendar() {
  try {
    // Get the default calendars from localStorage
    const defaultCalendarsStr = localStorage.getItem('defaultCalendars');
    if (!defaultCalendarsStr) {
      console.log('No default calendars found in localStorage');
      return;
    }

    const defaultCalendars = JSON.parse(defaultCalendarsStr);
    
    // Find the TTH calendar
    const tthCalendar = defaultCalendars.find(cal => cal.id === 'default-college-algebra-tth-fall');
    
    if (!tthCalendar) {
      console.log('TTH calendar not found in localStorage');
      return;
    }

    console.log('Found TTH calendar, updating dates...');
    
    // Update the last 4 class schedule items with corrected dates
    // Dates need to be in ISO format (YYYY-MM-DD)
    const dateUpdates = {
      '2025-11-24': 'Quiz',           // was 24-Nov-25
      '2025-11-26': 'Thanksgiving',   // was 26-Nov-25
      '2025-12-01': 'Test (Ch. 4-5 Review)', // was 1-Dec-25
      '2025-12-08': 'Final Exam (9:00-10:50)' // was 8-Dec-25
    };

    let updated = false;
    tthCalendar.classSchedule = tthCalendar.classSchedule.map(item => {
      // Check if this item matches one of the descriptions we need to update
      const description = item.description || '';
      
      // Find matching update by description
      const matchingDate = Object.keys(dateUpdates).find(date => {
        const expectedDesc = dateUpdates[date];
        return description === expectedDesc || 
               (description.includes('Quiz') && expectedDesc === 'Quiz' && item.date && !item.date.includes('2025-11-24')) ||
               (description.includes('Thanksgiving') && expectedDesc === 'Thanksgiving') ||
               (description.includes('Test') && description.includes('Ch. 4-5') && expectedDesc.includes('Test')) ||
               (description.includes('Final Exam') && expectedDesc.includes('Final Exam'));
      });

      if (matchingDate) {
        const oldDate = item.date;
        item.date = matchingDate;
        console.log(`Updated: "${description}" from ${oldDate} to ${matchingDate}`);
        updated = true;
      }
      
      return item;
    });

    if (updated) {
      // Save back to localStorage
      localStorage.setItem('defaultCalendars', JSON.stringify(defaultCalendars));
      console.log('✅ TTH calendar updated successfully in localStorage!');
      console.log('You may need to refresh the page or re-import the calendar to see changes.');
    } else {
      console.log('⚠️ No matching items found to update. The calendar may already be correct or the format is different.');
      console.log('Current class schedule items:', tthCalendar.classSchedule.slice(-4));
    }
  } catch (error) {
    console.error('Error updating TTH calendar:', error);
  }
})();

