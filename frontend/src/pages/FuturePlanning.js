import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseCalendars } from '../hooks/useCourseCalendars';
import { useFixedHolidays } from '../hooks/useFixedHolidays';
import { useCalendarOffset } from '../hooks/useCalendarOffset';
import { useToast } from '../hooks/useToast';
import { getSemesterDateRange, copyAndShiftTRtoMW, getCourseSchedule } from '../utils/calendarUtils';
import { cascadeMoveItems, findNextClassDay } from '../utils/classDayUtils';
import { createHolidayDateSet } from '../utils/holidayUtils';
import { COURSES, getCoursesWithCalendars as getCoursesWithCalendarsUtil } from '../config/courses';
import SemesterSelection from '../components/FuturePlanning/SemesterSelection';
import ClassPicker from '../components/FuturePlanning/ClassPicker';
import PlanningCalendar from '../components/FuturePlanning/PlanningCalendar';
import Toast from '../components/common/Toast';
import './FuturePlanning.css';
import mavericksLogo from '../assets/mavericks-logo.png';

function FuturePlanning() {
  const navigate = useNavigate();
  const { courseCalendars, getCourseCalendar } = useCourseCalendars();
  
  // Use courses from config
  const courses = COURSES;

  // State
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [pickedUpClass, setPickedUpClass] = useState(null);
  const [futureStartDate, setFutureStartDate] = useState(null);
  const [calendarMode, setCalendarMode] = useState('class'); // Default to class calendar
  const [editMode, setEditMode] = useState(false); // Edit mode for moving items
  const [pickedUpItem, setPickedUpItem] = useState(null); // Item being moved (for edit mode)
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  
  // Custom hooks
  const fixedHolidays = useFixedHolidays(selectedSemester);
  const { offsetCalendarItems, calculateOffset, clearOffset, setOffsetCalendarItems } = useCalendarOffset(courses, fixedHolidays);
  const { toast, showError, hideToast } = useToast();

  // Get future semesters
  const getFutureSemesters = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const semesters = [];
    
    // Determine next semester based on current date
    if (currentMonth >= 0 && currentMonth <= 4) {
      // Spring - next is Summer 1
      semesters.push({ key: `Summer1-${currentYear}`, label: `Summer 1 ${currentYear}`, year: currentYear, type: 'Summer1' });
      semesters.push({ key: `Summer2-${currentYear}`, label: `Summer 2 ${currentYear}`, year: currentYear, type: 'Summer2' });
      semesters.push({ key: `Fall-${currentYear}`, label: `Fall ${currentYear}`, year: currentYear, type: 'Fall' });
      semesters.push({ key: `Spring-${currentYear + 1}`, label: `Spring ${currentYear + 1}`, year: currentYear + 1, type: 'Spring' });
    } else if (currentMonth >= 5 && currentMonth <= 6) {
      // Summer - next is Fall
      semesters.push({ key: `Fall-${currentYear}`, label: `Fall ${currentYear}`, year: currentYear, type: 'Fall' });
      semesters.push({ key: `Spring-${currentYear + 1}`, label: `Spring ${currentYear + 1}`, year: currentYear + 1, type: 'Spring' });
      semesters.push({ key: `Summer1-${currentYear + 1}`, label: `Summer 1 ${currentYear + 1}`, year: currentYear + 1, type: 'Summer1' });
    } else {
      // Fall - next is Spring
      semesters.push({ key: `Spring-${currentYear + 1}`, label: `Spring ${currentYear + 1}`, year: currentYear + 1, type: 'Spring' });
      semesters.push({ key: `Summer1-${currentYear + 1}`, label: `Summer 1 ${currentYear + 1}`, year: currentYear + 1, type: 'Summer1' });
      semesters.push({ key: `Summer2-${currentYear + 1}`, label: `Summer 2 ${currentYear + 1}`, year: currentYear + 1, type: 'Summer2' });
      semesters.push({ key: `Fall-${currentYear + 1}`, label: `Fall ${currentYear + 1}`, year: currentYear + 1, type: 'Fall' });
    }
    
    return semesters;
  };

  const futureSemesters = getFutureSemesters();

  // Navigate to semester start month when semester is selected
  useEffect(() => {
    if (selectedSemester) {
      const semesterRange = getSemesterDateRange(selectedSemester.key);
      if (semesterRange && semesterRange.start) {
        setCurrentDate(new Date(semesterRange.start.getFullYear(), semesterRange.start.getMonth(), 1));
      }
    }
  }, [selectedSemester]);

  // Get courses with calendars (using utility from config)
  const getCoursesWithCalendars = () => {
    return getCoursesWithCalendarsUtil(courses, courseCalendars);
  };

  // Handle class pick up
  const handleClassPickUp = (courseId) => {
    setPickedUpClass(courseId);
  };

  // Handle class drop on calendar day
  const handleClassDrop = (date) => {
    if (!pickedUpClass || !selectedSemester) return;
    
    // Set the future start date
    setFutureStartDate(date);
    
    // Calculate offset calendar
    calculateOffsetCalendar(pickedUpClass, date);
    
    // Clear picked up class
    setPickedUpClass(null);
  };

  // Handle item pickup for edit mode
  const handleItemPickup = (date, item) => {
    if (!editMode || !item || item.isFixedHoliday) return;
    
    const dateStr = date.toISOString().split('T')[0];
    setPickedUpItem({ ...item, sourceDate: dateStr });
  };

  // Handle item drop for edit mode (with cascading)
  const handleItemDrop = (targetDate) => {
    if (!editMode || !pickedUpItem || !futureStartDate) return;
    
    const targetDateStr = targetDate.toISOString().split('T')[0];
    const sourceDateStr = pickedUpItem.sourceDate;
    
    // Don't do anything if dropping on the same date
    if (targetDateStr === sourceDateStr) {
      setPickedUpItem(null);
      return;
    }
    
    // Get the course schedule for cascading
    const courseId = pickedUpClass || 'CA 4201'; // Fallback if no picked up class
    const courseSchedule = getCourseSchedule(courseId, courses);
    
    if (!courseSchedule) {
      showError('Could not determine course schedule for cascading.');
      setPickedUpItem(null);
      return;
    }
    
    // Get holiday dates for skipping
    const holidayDates = createHolidayDateSet(fixedHolidays);
    
    // Cascade move the items
    const updatedItems = cascadeMoveItems(
      offsetCalendarItems,
      sourceDateStr,
      targetDateStr,
      courseSchedule,
      holidayDates
    );
    
    setOffsetCalendarItems(updatedItems);
    setPickedUpItem(null);
  };

  // Handle undo/clear changes
  const handleUndo = () => {
    clearOffset();
    setFutureStartDate(null);
    setPickedUpClass(null);
    setPickedUpItem(null);
    setEditMode(false);
  };

  // Calculate offset calendar using both assignment and class schedule data
  const calculateOffsetCalendar = (courseId, startDate) => {
    let courseData = getCourseCalendar(courseId);
    
    // If CA 4105 doesn't have data, try to load it from CA 4201
    if (!courseData && courseId === 'CA 4105') {
      const ca4201Data = getCourseCalendar('CA 4201');
      if (ca4201Data && ca4201Data.originalAssignments) {
        const shiftedAssignments = copyAndShiftTRtoMW(ca4201Data.originalAssignments);
        courseData = {
          originalAssignments: shiftedAssignments,
          acceptedFutureAssignments: [],
          manualAdjustments: {}
        };
      } else {
        // Try to fetch from API
        fetch('/api/calendar/data')
          .then(res => res.json())
          .then(result => {
            if (result.success && result.data.length > 0) {
              const shiftedAssignments = copyAndShiftTRtoMW(result.data);
              courseData = {
                originalAssignments: shiftedAssignments,
                acceptedFutureAssignments: [],
                manualAdjustments: {}
              };
              // Continue with the calculation
              continueCalculation(courseData, courseId, startDate);
            } else {
              showError('No calendar data found for this course. Please import a calendar first.');
            }
          })
          .catch(error => {
            console.error('Error fetching calendar data:', error);
            showError('No calendar data found for this course. Please import a calendar first.');
          });
        return;
      }
    }
    
    if (!courseData || !courseData.originalAssignments || courseData.originalAssignments.length === 0) {
      showError('No calendar data found for this course. Please import a calendar first.');
      return;
    }

    continueCalculation(courseData, courseId, startDate);
  };

  // Continue calculation with course data
  const continueCalculation = (courseData, courseId, startDate) => {
    // Get assignment calendar data
    const originalAssignments = courseData.originalAssignments || [];
    
    // Get class schedule data (need to fetch it)
    fetch('/api/calendar/class-schedule')
      .then(res => res.json())
      .then(result => {
        if (!result.success) {
          console.error('Failed to fetch class schedule:', result.error);
          // Continue with just assignment data
          calculateOffsetForCalendarWrapper(originalAssignments, [], startDate, courseId);
          return;
        }

        const classSchedule = result.data || [];
        calculateOffsetForCalendarWrapper(originalAssignments, classSchedule, startDate, courseId);
      })
      .catch(error => {
        console.error('Error fetching class schedule:', error);
        // Continue with just assignment data
        calculateOffsetForCalendarWrapper(originalAssignments, [], startDate, courseId);
      });
  };

  // Calculate offset for combined calendar (assignments + class schedule)
  // Wrapper function that uses the calendarOffsetService
  const calculateOffsetForCalendarWrapper = async (assignments, classSchedule, startDate, courseId) => {
    try {
      await calculateOffset({
        assignments,
        classSchedule,
        futureStartDate: startDate,
        courseId
      });
      
      // Navigate calendar to start date
      setCurrentDate(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
    } catch (error) {
      showError(error.message || 'An error occurred while calculating the calendar offset.');
    }
  };

  // Get items for a date (combined - assignments and class schedule, including fixed holidays)
  const getItemsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Combine offset items with fixed holidays
    const allItems = [...offsetCalendarItems, ...fixedHolidays];
    
    return allItems.filter(item => {
      if (item.type === 'assignment') {
        // Check if assignment is on this date (start or due)
        if (item.startDate === dateStr || item.dueDate === dateStr) {
          return true;
        }
      } else if (item.type === 'classSchedule') {
        // Check if class schedule item is on this date
        if (item.date === dateStr) {
          return true;
        }
      }
      return false;
    });
  };

  // Calendar navigation handlers
  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToggleMode = () => {
    setCalendarMode(calendarMode === 'assignment' ? 'class' : 'assignment');
  };

  return (
    <div className="future-planning-container">
      <header className="future-planning-header">
        <img src={mavericksLogo} alt="Mavericks Logo" className="future-planning-logo" />
        <h1 className="future-planning-title">Future Planning</h1>
        <button className="back-button" onClick={() => navigate('/calendar')}>
          ← Back to Calendar
        </button>
      </header>

      <main className="future-planning-main">
        {/* Semester Selection */}
        {!selectedSemester && (
          <SemesterSelection
            futureSemesters={futureSemesters}
            onSelectSemester={setSelectedSemester}
          />
        )}

        {/* Class Selection and Calendar */}
        {selectedSemester && (
          <div className="planning-interface">
            {/* Class Picker */}
            <ClassPicker
              coursesWithCalendars={getCoursesWithCalendars()}
              pickedUpClass={pickedUpClass}
              hasOffsetItems={offsetCalendarItems.length > 0}
              onClassPickUp={handleClassPickUp}
              onUndo={handleUndo}
              editMode={editMode}
              onToggleEditMode={() => setEditMode(!editMode)}
            />

            {/* Calendar */}
            <PlanningCalendar
              currentDate={currentDate}
              onPreviousMonth={handlePreviousMonth}
              onNextMonth={handleNextMonth}
              calendarMode={calendarMode}
              onToggleMode={handleToggleMode}
              futureStartDate={futureStartDate}
              pickedUpClass={pickedUpClass}
              onClassDrop={handleClassDrop}
              getItemsForDate={getItemsForDate}
            />
          </div>
        )}
      </main>
      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onClose={hideToast}
        duration={toast.duration}
      />
    </div>
  );
}

export default FuturePlanning;

