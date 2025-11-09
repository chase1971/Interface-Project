// Script to force clear and reload the TTH default calendar
// Run this in the browser console

(function forceReloadTTHCalendar() {
  try {
    console.log('🔍 Checking current TTH calendar in localStorage...');
    
    // Get the default calendars from localStorage
    const defaultCalendarsStr = localStorage.getItem('defaultCalendars');
    if (!defaultCalendarsStr) {
      console.log('No default calendars found in localStorage');
      return;
    }

    const defaultCalendars = JSON.parse(defaultCalendarsStr);
    
    // Find the TTH calendar
    const tthCalendar = defaultCalendars.find(cal => cal.id === 'default-college-algebra-tth-fall');
    
    if (tthCalendar) {
      console.log('📅 Current TTH calendar class schedule items:', tthCalendar.classSchedule.length);
      console.log('Last 4 items:', tthCalendar.classSchedule.slice(-4).map(item => ({
        date: item.date,
        description: item.description
      })));
      
      // Check for old date formats
      const hasOldFormat = tthCalendar.classSchedule.some(item => {
        const date = item.date || '';
        return /^\d{1,2}-[A-Za-z]{3}-\d{2}$/.test(date);
      });
      
      if (hasOldFormat) {
        console.log('⚠️ Found old date format in calendar');
      }
    } else {
      console.log('TTH calendar not found in localStorage');
    }
    
    // Remove the TTH calendar to force reload
    console.log('🗑️ Removing TTH calendar from localStorage...');
    const filtered = defaultCalendars.filter(cal => cal.id !== 'default-college-algebra-tth-fall');
    localStorage.setItem('defaultCalendars', JSON.stringify(filtered));
    
    // Also remove the initialization flag to force reload
    localStorage.removeItem('defaultCalendarsInitialized');
    
    console.log('✅ TTH calendar removed from localStorage');
    console.log('🔄 Please refresh the page to reload the calendar from the updated CSV file');
    console.log('📋 The calendar should now have these last 4 entries:');
    console.log('   - 11/24/2025 → Quiz');
    console.log('   - 11/26/2025 → Thanksgiving');
    console.log('   - 12/1/2025 → Test (Ch. 4-5 Review)');
    console.log('   - 12/8/2025 → Final Exam (9:00-10:50)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();

