import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Calendar.css";
import mavericksLogo from "../assets/mavericks-logo.png";

// Components
import CourseSidebar from "../components/Calendar/CourseSidebar";
import CalendarGrid from "../components/Calendar/CalendarGrid";
import ExpandedDateModal from "../components/Calendar/ExpandedDateModal";
import FuturePlanningModal from "../components/Calendar/FuturePlanningModal";
import ImportCalendarModal from "../components/Calendar/ImportCalendarModal";
import ClearCalendarModal from "../components/Calendar/ClearCalendarModal";
import EditAssignmentModal from "../components/Calendar/EditAssignmentModal";
import DebugOverlay from "../components/Calendar/DebugOverlay";

// Hooks
import { useCourseCalendars } from "../hooks/useCourseCalendars";
import { useDefaultCalendars } from "../hooks/useDefaultCalendars";
import { useDragAndDrop } from "../hooks/useDragAndDrop";
import { useEditMode } from "../hooks/useEditMode";
import { useAssignments } from "../hooks/useAssignments";
import { useModals } from "../hooks/useModals";
import { useFuturePlanning } from "../hooks/useFuturePlanning";

// Utils
import {
  parseDate,
  formatDate,
  getSemesterDateRange,
  normalizeDate,
  parseCsvFile,
  monthNames,
  copyAndShiftTRtoMW,
  getCourseSchedule
} from "../utils/calendarUtils";
import { cascadeMoveItems } from "../utils/classDayUtils";

// Config
import { COURSES } from '../config/courses';

function Calendar() {
  const navigate = useNavigate();
  
  // Calendar state
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Calendar mode: 'assignment' or 'class'
  const [calendarMode, setCalendarMode] = useState(() => {
    // Load last viewed mode from localStorage, default to 'assignment'
    const savedMode = localStorage.getItem('calendarMode');
    return savedMode || 'assignment';
  });
  
  // Class schedule data
  const [classSchedule, setClassSchedule] = useState([]);
  // Class schedule edit mode: track picked up item
  const [pickedUpScheduleItem, setPickedUpScheduleItem] = useState(null);
  const [scheduleItemDragPosition, setScheduleItemDragPosition] = useState(null);
  // Class schedule edit mode: track original schedule for undo
  const [classScheduleSnapshot, setClassScheduleSnapshot] = useState(null);
  
  // Course management - start with no course selected
  const [selectedCourse, setSelectedCourse] = useState(() => {
    // Check if there's a saved selected course in localStorage
    const saved = localStorage.getItem('selectedCourse');
    // Only use saved value if it exists, otherwise start with first course
    return saved || (COURSES.length > 0 ? COURSES[0].id : null);
  });
  const [originalAssignments, setOriginalAssignments] = useState([]);
  const [acceptedFutureAssignments, setAcceptedFutureAssignments] = useState([]);
  
  // Clear calendar state (non-modal state stays here)
  const [selectedSemester, setSelectedSemester] = useState('');
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [showClearCalendarMenu, setShowClearCalendarMenu] = useState(false);
  const [clearDateRange, setClearDateRange] = useState({ start: null, end: null, label: '' });
  
  // Import calendar state (non-modal state stays here)
  const [importingCourse, setImportingCourse] = useState('');
  const [importStartDate, setImportStartDate] = useState('');
  const [importCsvFile, setImportCsvFile] = useState(null);
  
  // Edit mode state (editingAssignment stays here as it's UI-specific)
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [manualAdjustments, setManualAdjustments] = useState({}); // { assignmentId: { startDate, dueDate, startTime, dueTime } }
  
  // Course calendars hook
  const {
    courseCalendars,
    getCourseCalendar,
    setCourseCalendar,
    updateAcceptedFutureAssignments,
    clearCourseAssignmentsInRange,
    deleteCourseCalendar
  } = useCourseCalendars();

  // Default calendars hook
  const {
    defaultCalendars,
    getDefaultCalendar,
    addDefaultCalendar,
    removeDefaultCalendar
  } = useDefaultCalendars();

  // Modal state hook
  const {
    expandedDate,
    expandedPosition,
    setExpandedDate,
    setExpandedPosition,
    closeExpandedModal,
    openExpandedModal,
    showFuturePlanning,
    setShowFuturePlanning,
    showImportCalendar,
    setShowImportCalendar,
    showClearCalendar,
    setShowClearCalendar,
    showEditAssignmentModal,
    setShowEditAssignmentModal,
    closeAllModals
  } = useModals();

  // Course list (from config)
  const courses = COURSES;

  // Future planning hook (must be before useAssignments since it provides offsetAssignments)
  const {
    futureStartDate,
    currentStartDate,
    futurePlanningCourse,
    offsetAssignments,
    hasPendingChanges,
    shiftForwardOneDay,
    setFutureStartDate,
    setCurrentStartDate,
    setFuturePlanningCourse,
    setOffsetAssignments,
    setHasPendingChanges,
    setShiftForwardOneDay,
    calculateFutureCalendar,
    acceptFutureAssignments,
    clearPendingFutureAssignments
  } = useFuturePlanning({
    courses,
    originalAssignments,
    assignments,
    showFuturePlanning,
    setCurrentDate
  });

  // Assignment operations hook
  const {
    getAssignmentId,
    applyAdjustments,
    getAssignmentsForDate
  } = useAssignments({
    manualAdjustments,
    originalAssignments,
    acceptedFutureAssignments,
    offsetAssignments,
    assignments,
    selectedCourse,
    courses,
    calendarMode,
    classSchedule
  });

  // Drag and drop hook
  const {
    draggedAssignment,
    dragPosition,
    dragStartPosition,
    pickedUpAssignment,
    handleAssignmentDragStart,
    handleAssignmentDragMove,
    handleAssignmentDragEnd,
    handleAssignmentDrop,
    hasActuallyDragged
  } = useDragAndDrop({
    originalAssignments,
    acceptedFutureAssignments,
    manualAdjustments,
    setManualAdjustments,
    applyAdjustments,
    getAssignmentId,
    expandedDate,
    setExpandedDate
  });

  // Edit mode hook
  const {
    isEditMode,
    editModeSnapshot,
    handleEnterEditMode,
    handleExitEditMode,
    handleUndo,
    hasChanges
  } = useEditMode({
    manualAdjustments,
    setManualAdjustments,
    getCourseCalendar,
    setCourseCalendar,
    selectedCourse,
    handleAssignmentDragEnd
  });

  // Update course calendar when accepted assignments change
  useEffect(() => {
    if (selectedCourse) {
      updateAcceptedFutureAssignments(selectedCourse, acceptedFutureAssignments);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceptedFutureAssignments, selectedCourse]);

  // Save selected course to localStorage when it changes
  useEffect(() => {
    if (selectedCourse) {
      localStorage.setItem('selectedCourse', selectedCourse);
    }
  }, [selectedCourse]);

  // Track if we just imported a calendar to prevent useEffect from clearing it
  const justImportedRef = useRef(false);

  // Load calendar data for the selected course
  useEffect(() => {
    if (selectedCourse && !justImportedRef.current) {
      loadCourseCalendar(selectedCourse);
    }
    // Reset the flag after a short delay to allow normal loading on course switch
    if (justImportedRef.current) {
      const timer = setTimeout(() => {
        justImportedRef.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedCourse]); // Only reload when selectedCourse changes
  // Note: We don't depend on courseCalendars to avoid infinite loops
  // The import function sets state directly, so we don't need to reload here

  // Load class schedule data when in class calendar mode or course changes
  useEffect(() => {
    if (!selectedCourse) {
      setClassSchedule([]);
      return;
    }
    
    // Only load class schedule if course has an imported calendar
    const courseData = getCourseCalendar(selectedCourse);
    if (calendarMode === 'class' && courseData && courseData.originalAssignments && courseData.originalAssignments.length > 0) {
      loadClassSchedule();
      // Don't disable edit mode - allow editing class schedule items
      // Clear snapshot when switching courses
      setClassScheduleSnapshot(null);
    } else {
      // No calendar imported - clear class schedule
      setClassSchedule([]);
    }
  }, [calendarMode, selectedCourse]); // Only depend on calendarMode and selectedCourse
  // Note: We check courseCalendars inside the effect using getCourseCalendar to avoid dependency issues

  // Handle mouse move for ghost image
  useEffect(() => {
    if (!pickedUpScheduleItem || calendarMode !== 'class' || !isEditMode) {
      setScheduleItemDragPosition(null);
      return;
    }

    const handleMouseMove = (e) => {
      setScheduleItemDragPosition({
        x: e.clientX,
        y: e.clientY
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [pickedUpScheduleItem, calendarMode, isEditMode]);

  // Save calendar mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('calendarMode', calendarMode);
  }, [calendarMode]);

  // Load class schedule data
  const loadClassSchedule = async () => {
    try {
      // Check if this calendar was explicitly cleared - if so, don't load anything
      const clearedFlag = localStorage.getItem(`calendarCleared_${selectedCourse}`);
      if (clearedFlag === 'true') {
        setClassSchedule([]);
        // Remove the flag after using it
        localStorage.removeItem(`calendarCleared_${selectedCourse}`);
        return;
      }
      
      // First check localStorage for saved modifications
      const scheduleKey = `classSchedule_${selectedCourse}`;
      const savedSchedule = localStorage.getItem(scheduleKey);
      
      if (savedSchedule) {
        try {
          const parsed = JSON.parse(savedSchedule);
          setClassSchedule(parsed);
          return;
        } catch (e) {
          console.error('Error parsing saved class schedule:', e);
        }
      }
      
      // Only load from API if the course has an imported calendar
      // If no calendar is imported, don't load class schedule
      const courseData = getCourseCalendar(selectedCourse);
      if (!courseData || !courseData.originalAssignments || courseData.originalAssignments.length === 0) {
        setClassSchedule([]);
        return;
      }
      
      // If no saved schedule, load from API
      const response = await fetch('/api/calendar/class-schedule');
      const result = await response.json();
      if (result.success) {
        setClassSchedule(result.data);
      } else {
        console.error('Failed to fetch class schedule:', result.error);
        setClassSchedule([]);
      }
    } catch (error) {
      console.error('Error loading class schedule:', error);
      setClassSchedule([]);
    }
  };

  // Handle entering edit mode for class calendar - take snapshot
  const handleEnterClassEditMode = () => {
    if (calendarMode === 'class') {
      // Take a snapshot of current class schedule when entering edit mode
      setClassScheduleSnapshot(JSON.parse(JSON.stringify(classSchedule)));
    }
    handleEnterEditMode();
  };

  // Handle exiting edit mode for class calendar - save changes
  const handleExitClassEditMode = () => {
    if (calendarMode === 'class') {
      // Save changes to localStorage
      const scheduleKey = `classSchedule_${selectedCourse}`;
      localStorage.setItem(scheduleKey, JSON.stringify(classSchedule));
      setClassScheduleSnapshot(null);
    }
    handleExitEditMode();
  };

  // Handle undo for class calendar
  const handleUndoClassChanges = () => {
    if (calendarMode === 'class' && classScheduleSnapshot) {
      setClassSchedule([...classScheduleSnapshot]);
      const scheduleKey = `classSchedule_${selectedCourse}`;
      localStorage.setItem(scheduleKey, JSON.stringify(classScheduleSnapshot));
    }
  };

  // Check if class schedule has changes
  const hasClassScheduleChanges = () => {
    if (calendarMode !== 'class' || !classScheduleSnapshot) return false;
    return JSON.stringify(classSchedule) !== JSON.stringify(classScheduleSnapshot);
  };

  // Handle class schedule item pickup
  const handleScheduleItemPickup = (date, scheduleItem, event) => {
    if (!isEditMode || calendarMode !== 'class') {
      if (date === null && scheduleItem === null) {
        // Cancel pickup
        setPickedUpScheduleItem(null);
        setScheduleItemDragPosition(null);
      }
      return;
    }
    
    if (!date || !scheduleItem) {
      setPickedUpScheduleItem(null);
      setScheduleItemDragPosition(null);
      return;
    }
    
    const dateStr = date.toISOString().split('T')[0];
    setPickedUpScheduleItem({ ...scheduleItem, sourceDate: dateStr });
    
    // Set initial drag position
    if (event) {
      setScheduleItemDragPosition({
        x: event.clientX,
        y: event.clientY
      });
    }
  };

  // Handle mouse move for ghost image
  useEffect(() => {
    if (!pickedUpScheduleItem || calendarMode !== 'class' || !isEditMode) {
      return;
    }

    const handleMouseMove = (e) => {
      setScheduleItemDragPosition({
        x: e.clientX,
        y: e.clientY
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [pickedUpScheduleItem, calendarMode, isEditMode]);

  // Handle class schedule item drop (with cascading)
  const handleScheduleItemDrop = (targetDate) => {
    console.log('handleScheduleItemDrop called', { targetDate, pickedUpScheduleItem, isEditMode, calendarMode });
    
    if (!isEditMode || calendarMode !== 'class' || !pickedUpScheduleItem) {
      console.log('Early return - conditions not met', { isEditMode, calendarMode, hasPickedUpItem: !!pickedUpScheduleItem });
      return;
    }
    
    // Format dates consistently - use YYYY-MM-DD format
    const targetDateObj = new Date(targetDate);
    const targetDateStr = targetDateObj.toISOString().split('T')[0];
    const sourceDateStr = pickedUpScheduleItem.sourceDate;
    
    console.log('Drop attempt', { sourceDateStr, targetDateStr, targetDate });
    
    // Don't do anything if dropping on the same date
    if (targetDateStr === sourceDateStr) {
      console.log('Dropping on same date - cancelling');
      setPickedUpScheduleItem(null);
      setScheduleItemDragPosition(null);
      return;
    }
    
    // Get course schedule for cascading
    const courseSchedule = getCourseSchedule(selectedCourse, COURSES);
    if (!courseSchedule) {
      console.error('Could not determine course schedule for cascading');
      setPickedUpScheduleItem(null);
      setScheduleItemDragPosition(null);
      return;
    }
    
    console.log('Course schedule:', courseSchedule);
    
    // Create a working copy of class schedule first
    const updatedSchedule = [...classSchedule]; // Use spread to ensure new array reference
    
    // Build holiday date set from class schedule items (holidays and final exams)
    const holidayDates = new Set();
    updatedSchedule.forEach(item => {
      const desc = item.description.toLowerCase();
      // Check if it's a holiday or final exam
      if (desc.includes('thanksgiving') || 
          desc.includes('labor day') || 
          desc.includes('holiday') ||
          desc.includes('christmas') ||
          desc.includes('new year') ||
          desc.includes('easter') ||
          desc.includes('memorial day') ||
          desc.includes('independence day') ||
          desc.includes('presidents day') ||
          desc.includes('martin luther king') ||
          desc.includes('mlk day') ||
          desc.includes('spring break') ||
          desc.includes('final exam') ||
          desc.includes('final')) {
        holidayDates.add(item.date);
        
        // Thanksgiving spans Nov 26-27, so add both dates
        if (desc.includes('thanksgiving')) {
          const [year, month, day] = item.date.split('-').map(Number);
          const thanksgivingDate = new Date(year, month - 1, day);
          // If Thanksgiving is on Nov 26 (Thursday), also add Nov 27 (Friday)
          if (month === 11 && day === 26) {
            holidayDates.add(`${year}-11-27`);
          }
        }
      }
    });
    
    console.log('Holiday dates set:', Array.from(holidayDates));
    
    console.log('Looking for item to move', { sourceDateStr, itemName: pickedUpScheduleItem.itemName, scheduleLength: updatedSchedule.length });
    console.log('Current schedule items:', updatedSchedule.map(i => ({ date: i.date, description: i.description })));
    
    // Find the item being moved by matching date and description
    const itemToMove = updatedSchedule.find(item => 
      item.date === sourceDateStr && item.description === pickedUpScheduleItem.itemName
    );
    if (!itemToMove) {
      console.error('Could not find item to move', { sourceDateStr, itemName: pickedUpScheduleItem.itemName, availableItems: updatedSchedule.map(i => ({ date: i.date, description: i.description })) });
      setPickedUpScheduleItem(null);
      setScheduleItemDragPosition(null);
      return;
    }
    
    console.log('Found item to move:', itemToMove);
    
    // Check if target date is empty (no item on target date)
    const targetDateItem = updatedSchedule.find(item => item.date === targetDateStr);
    const isTargetEmpty = !targetDateItem;
    
    console.log('Target date status', { targetDateStr, isTargetEmpty, targetItem: targetDateItem });
    
    // Convert to format expected by cascadeMoveItems
    const scheduleItemsForCascade = updatedSchedule.map(item => {
      // Detect item type
      const desc = item.description.toLowerCase();
      let itemType = 'regular';
      if (desc.includes('thanksgiving') || desc.includes('labor day') || desc.includes('holiday') || desc.includes('christmas') || desc.includes('new year') || desc.includes('easter') || desc.includes('memorial day') || desc.includes('independence day') || desc.includes('presidents day') || desc.includes('martin luther king') || desc.includes('mlk day')) {
        itemType = 'holiday';
      } else if (desc.includes('final exam') || desc.includes('final')) {
        itemType = 'exam';
      } else if (desc.includes('test')) {
        itemType = 'test';
      } else if (desc.includes('quiz')) {
        itemType = 'quiz';
      }
      
      return {
        type: 'classSchedule',
        date: item.date,
        itemName: item.description,
        description: item.description,
        classScheduleType: itemType,
        isClassSchedule: true,
        // Mark holidays and final exams as fixed so they can't be moved
        isFixedHoliday: itemType === 'holiday' || itemType === 'exam'
      };
    });
    
    let cascadedItems;
    
    if (isTargetEmpty) {
      // Target is empty - just move the item, no cascading
      console.log('Target is empty - simple move, no cascading');
      cascadedItems = scheduleItemsForCascade.map(item => {
        if (item.date === sourceDateStr && item.itemName === pickedUpScheduleItem.itemName) {
          return { ...item, date: targetDateStr };
        }
        return item;
      });
    } else {
      // Target has an item - replace it and cascade
      console.log('Calling cascadeMoveItems (target occupied)', { 
        itemsCount: scheduleItemsForCascade.length, 
        sourceDateStr, 
        targetDateStr, 
        courseSchedule 
      });
      
      cascadedItems = cascadeMoveItems(
        scheduleItemsForCascade,
        sourceDateStr,
        targetDateStr,
        courseSchedule,
        holidayDates
      );
    }
    
    console.log('Cascaded items result', cascadedItems);
    console.log('Cascaded items count:', cascadedItems.length);
    
    if (!cascadedItems || cascadedItems.length === 0) {
      console.error('Cascade function returned no items!');
      setPickedUpScheduleItem(null);
      setScheduleItemDragPosition(null);
      return;
    }
    
    // Update class schedule with new dates
    // Create a map of cascaded items by description for quick lookup
    const cascadedMap = new Map();
    cascadedItems.forEach(ci => {
      const key = ci.itemName || ci.description;
      if (key) {
        cascadedMap.set(key, ci);
      }
    });
    
    console.log('Cascaded map created with', cascadedMap.size, 'items');
    
    const newClassSchedule = updatedSchedule.map(item => {
      // Find the cascaded item that matches this description
      const key = item.description;
      const cascadedItem = cascadedMap.get(key);
      
      if (cascadedItem) {
        // Always update the date from cascaded item
        const newDate = cascadedItem.date;
        if (newDate !== item.date) {
          console.log('Updating item date', { 
            oldDate: item.date, 
            newDate: newDate, 
            description: item.description 
          });
        }
        return { ...item, date: newDate };
      }
      // If not found in cascaded items, keep original
      console.warn('Item not found in cascaded items, keeping original date', item.description);
      return item;
    });
    
    console.log('New class schedule (first 5 items):', newClassSchedule.slice(0, 5));
    console.log('Total items in new schedule:', newClassSchedule.length);
    
    // Force a state update with a new array reference
    setClassSchedule([...newClassSchedule]);
    
    // Don't save to localStorage here - wait for Save Changes button
    // Changes are saved when exiting edit mode via handleExitClassEditMode
    
    // Clear picked up item
    setPickedUpScheduleItem(null);
    setScheduleItemDragPosition(null);
    
    console.log('Drop completed successfully - state updated');
  };

  // Load calendar data for a specific course
  // ONLY loads from courseCalendars - NO hard-coded calendars, NO API calls
  const loadCourseCalendar = async (courseId) => {
    setLoading(true);
    try {
      // ONLY check courseCalendars - no other sources
      const courseData = getCourseCalendar(courseId);
      
      if (courseData && courseData.originalAssignments && courseData.originalAssignments.length > 0) {
        // Only load if calendar was explicitly imported
        const originals = courseData.originalAssignments || [];
        const accepted = courseData.acceptedFutureAssignments || [];
        const adjustments = courseData.manualAdjustments || {};
        
        setOriginalAssignments(originals);
        setAssignments(originals);
        setAcceptedFutureAssignments(accepted);
        setManualAdjustments(adjustments);
      } else {
        // NO calendar - clear everything
        setOriginalAssignments([]);
        setAssignments([]);
        setAcceptedFutureAssignments([]);
        setManualAdjustments({});
      }
    } catch (error) {
      console.error('Error loading course calendar:', error);
      // On error, clear everything
      setOriginalAssignments([]);
      setAssignments([]);
      setAcceptedFutureAssignments([]);
      setManualAdjustments({});
    } finally {
      setLoading(false);
    }
  };

  // Handle CSV file import
  const handleImportCalendar = async () => {
    if (!importCsvFile || !importStartDate || !importingCourse) {
      alert('Please provide both a CSV file and start date.');
      return;
    }

    try {
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(importCsvFile);
      });

      const parsedData = parseCsvFile(fileContent);
      
      if (parsedData.length === 0) {
        alert('No data found in CSV file.');
        return;
      }

      // Save to course calendars
      setCourseCalendar(importingCourse, {
        originalAssignments: parsedData,
        acceptedFutureAssignments: []
      });

      // If this is the currently selected course, load it
      if (importingCourse === selectedCourse) {
        setOriginalAssignments(parsedData);
        setAssignments(parsedData);
        setAcceptedFutureAssignments([]);
      }

      // Close modal and reset
      setShowImportCalendar(false);
      setImportingCourse('');
      setImportStartDate('');
      setImportCsvFile(null);
      
      // No alert - just close the modal
    } catch (error) {
      console.error('Error importing calendar:', error);
      alert('Error importing calendar: ' + error.message);
    }
  };

  // Handle importing from default calendar
  const handleImportDefaultCalendar = (defaultCalendarId) => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🟢 STEP 2: handleImportDefaultCalendar CALLED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Default calendar ID:', defaultCalendarId);
    console.log('Importing into course:', importingCourse);
    console.log('Timestamp:', new Date().toISOString());
    
    if (!defaultCalendarId || !importingCourse) {
      console.error('❌ Missing parameters - cannot import');
      alert('Please select a default calendar.');
      return;
    }

    try {
      console.log('🔍 Looking up default calendar in localStorage...');
      const defaultCal = getDefaultCalendar(defaultCalendarId);
      console.log('Default calendar found:', {
        exists: !!defaultCal,
        hasAssignments: !!defaultCal?.assignments,
        assignmentCount: defaultCal?.assignments?.length || 0,
        hasClassSchedule: !!defaultCal?.classSchedule,
        classScheduleCount: defaultCal?.classSchedule?.length || 0
      });
      
      if (!defaultCal || !defaultCal.assignments) {
        console.error('❌ Default calendar not found or has no assignments');
        alert('Default calendar not found or has no assignments.');
        return;
      }

      console.log('═══════════════════════════════════════════════════════════');
      console.log('🟢 STEP 3: COPYING DATA FROM DEFAULT CALENDAR');
      console.log('═══════════════════════════════════════════════════════════');
      
      // Copy assignments from default calendar
      const importedAssignments = JSON.parse(JSON.stringify(defaultCal.assignments));
      console.log(`📋 Copied ${importedAssignments.length} assignments`);
      
      // Copy class schedule from default calendar
      const importedClassSchedule = defaultCal.classSchedule 
        ? JSON.parse(JSON.stringify(defaultCal.classSchedule))
        : [];
      console.log(`📅 Copied ${importedClassSchedule.length} class schedule items`);
      
      // Show first items from each
      if (importedAssignments.length > 0) {
        console.log('📝 FIRST ASSIGNMENT (from Assignment Calendar CSV):');
        console.log(JSON.stringify(importedAssignments[0], null, 2));
        console.log('  - itemName:', importedAssignments[0].itemName);
        console.log('  - startDate:', importedAssignments[0].startDate, '→ parsed:', parseDate(importedAssignments[0].startDate));
        console.log('  - dueDate:', importedAssignments[0].dueDate, '→ parsed:', parseDate(importedAssignments[0].dueDate));
        console.log('  - startTime:', importedAssignments[0].startTime);
        console.log('  - dueTime:', importedAssignments[0].dueTime);
      }
      
      if (importedClassSchedule.length > 0) {
        console.log('📚 FIRST CLASS SCHEDULE ITEM (from Class Calendar CSV):');
        console.log(JSON.stringify(importedClassSchedule[0], null, 2));
        console.log('  - date:', importedClassSchedule[0].date);
        console.log('  - description:', importedClassSchedule[0].description);
        console.log('  - type:', importedClassSchedule[0].type);
      }

      console.log('═══════════════════════════════════════════════════════════');
      console.log('🟢 STEP 4: SAVING TO COURSE CALENDAR');
      console.log('═══════════════════════════════════════════════════════════');
      
      // Save to course calendars
      setCourseCalendar(importingCourse, {
        originalAssignments: importedAssignments,
        acceptedFutureAssignments: [],
        manualAdjustments: {}
      });
      console.log(`✅ Saved ${importedAssignments.length} assignments to courseCalendars['${importingCourse}']`);

      // Normalize class schedule dates to ISO format before saving
      const normalizedClassSchedule = importedClassSchedule.map(item => {
        let dateStr = item.date;
        // Ensure date is in ISO format (YYYY-MM-DD)
        if (dateStr && dateStr.includes('-') && dateStr.split('-').length === 3) {
          const parts = dateStr.split('-');
          // Check if it's MM-DD-YYYY (first part is month, 1-2 digits, last part is 4-digit year)
          if (parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
            // It's MM-DD-YYYY, convert to YYYY-MM-DD
            const [month, day, year] = parts;
            dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          // If it's already YYYY-MM-DD (first part is 4 digits), leave it as is
        }
        return {
          ...item,
          date: dateStr
        };
      });
      
      // Save class schedule to localStorage (ALWAYS save it, even if empty)
      const scheduleKey = `classSchedule_${importingCourse}`;
      localStorage.setItem(scheduleKey, JSON.stringify(normalizedClassSchedule));
      console.log(`✅ Saved ${normalizedClassSchedule.length} class schedule items to localStorage['${scheduleKey}']`);

      // If this is the currently selected course, load it immediately
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🟢 STEP 5: LOADING INTO FRONTEND COMPONENT STATE');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('Importing course:', importingCourse);
      console.log('Selected course:', selectedCourse);
      console.log('Courses match:', importingCourse === selectedCourse);
      
      if (importingCourse === selectedCourse) {
        console.log('✅ Courses match - loading into component state immediately');
        
        // Set flag to prevent useEffect from clearing our imported data
        justImportedRef.current = true;
        console.log('✅ Set justImportedRef flag to prevent useEffect from clearing data');
        
        // Use already normalized class schedule (dates already converted to ISO above)
        console.log(`✅ Using normalized class schedule with ${normalizedClassSchedule.length} items (dates in ISO format)`);
        
        console.log('🔄 Setting component state...');
        setOriginalAssignments(importedAssignments);
        console.log(`  ✅ setOriginalAssignments(${importedAssignments.length} items)`);
        
        setAssignments(importedAssignments);
        console.log(`  ✅ setAssignments(${importedAssignments.length} items)`);
        
        setAcceptedFutureAssignments([]);
        console.log(`  ✅ setAcceptedFutureAssignments([])`);
        
        setManualAdjustments({});
        console.log(`  ✅ setManualAdjustments({})`);
        
        setClassSchedule(normalizedClassSchedule);
        console.log(`  ✅ setClassSchedule(${normalizedClassSchedule.length} items)`);
        
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🟢 STEP 6: VERIFYING STATE AFTER SET');
        console.log('═══════════════════════════════════════════════════════════');
        
        // Check state after React has had time to update
        setTimeout(() => {
          console.log('📊 STATE VERIFICATION (after React update):');
          console.log('  originalAssignments.length:', originalAssignments?.length || 0);
          console.log('  assignments.length:', assignments?.length || 0);
          console.log('  classSchedule.length:', classSchedule?.length || 0);
          console.log('  acceptedFutureAssignments.length:', acceptedFutureAssignments?.length || 0);
          console.log('  manualAdjustments keys:', Object.keys(manualAdjustments || {}).length);
          console.log('  calendarMode:', calendarMode);
          console.log('  selectedCourse:', selectedCourse);
          
          // Check if data is actually there
          if (originalAssignments && originalAssignments.length > 0) {
            console.log('  ✅ originalAssignments has data');
            console.log('  First assignment in state:', JSON.stringify(originalAssignments[0], null, 2));
          } else {
            console.error('  ❌ originalAssignments is empty or missing!');
          }
          
          if (classSchedule && classSchedule.length > 0) {
            console.log('  ✅ classSchedule has data');
            console.log('  First class schedule item in state:', JSON.stringify(classSchedule[0], null, 2));
          } else {
            console.error('  ❌ classSchedule is empty or missing!');
          }
          
          // Test date parsing
          if (originalAssignments && originalAssignments.length > 0) {
            const testAssignment = originalAssignments[0];
            const parsedStart = parseDate(testAssignment.startDate);
            const parsedDue = parseDate(testAssignment.dueDate);
            console.log('  Date parsing test:');
            console.log(`    startDate: "${testAssignment.startDate}" → ${parsedStart ? parsedStart.toISOString() : 'NULL'}`);
            console.log(`    dueDate: "${testAssignment.dueDate}" → ${parsedDue ? parsedDue.toISOString() : 'NULL'}`);
            
            if (!parsedStart && !parsedDue) {
              console.error('  ❌ ERROR: Dates are not parsing correctly!');
            }
          }
          
          console.log('═══════════════════════════════════════════════════════════');
          console.log('🟢 STEP 7: CALENDAR SHOULD NOW BE DISPLAYING');
          console.log('═══════════════════════════════════════════════════════════');
          console.log('If calendar is blank, check:');
          console.log('  1. Are dates parsing correctly? (see above)');
          console.log('  2. Is calendarMode correct? (assignment vs class)');
          console.log('  3. Is getAssignmentsForDate finding matches?');
          console.log('  4. Is CalendarGrid receiving the data?');
          console.log('═══════════════════════════════════════════════════════════');
        }, 300);
      } else {
        console.log('⚠️ Courses do not match - data saved but not loaded into view');
        console.log('  User needs to select', importingCourse, 'to see the calendar');
      }

      // Close modal and reset
      setShowImportCalendar(false);
      setImportingCourse('');
      
      // No need to reload - we've already set all the state directly above
      // The useEffect hooks will handle any necessary updates
      
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🟢 STEP 8: IMPORT COMPLETE - MODAL CLOSING');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('Modal closed, import process finished');
      console.log('═══════════════════════════════════════════════════════════');
      
      // No alert - just close the modal
    } catch (error) {
      console.error('═══════════════════════════════════════════════════════════');
      console.error('❌ ERROR DURING IMPORT');
      console.error('═══════════════════════════════════════════════════════════');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
      console.error('Full error object:', error);
      console.error('═══════════════════════════════════════════════════════════');
      alert('Error importing default calendar: ' + error.message);
    }
  };

  // Parse class schedule CSV (Date,Description format)
  const parseClassScheduleCsv = (csvContent) => {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quoted fields
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      if (values.length >= 2) {
        // Parse date from format like "25-Aug-25" to ISO format "YYYY-MM-DD"
        const dateStr = values[0] || '';
        let formattedDate = dateStr;
        
        // Try to parse date in format "DD-MMM-YY" or "DD-MMM-YYYY"
        const dateMatch = dateStr.match(/(\d+)-([A-Za-z]+)-(\d+)/);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const monthName = dateMatch[2];
          const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
          
          const monthMap = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
            'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
            'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
          };
          
          const month = monthMap[monthName] || '01';
          // Convert to ISO format (YYYY-MM-DD) for consistent date comparison
          formattedDate = `${year}-${month}-${day}`;
        } else {
          // If already in MM-DD-YYYY format, convert to ISO
          if (dateStr.includes('-') && dateStr.split('-').length === 3) {
            const [month, day, year] = dateStr.split('-');
            formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        }

        const item = {
          date: formattedDate,
          description: values[1] || ''
        };
        data.push(item);
      }
    }

    return data;
  };

  // Initialize default calendar - load from CSV files
  useEffect(() => {
    // Check if default calendar already exists
    const existingDefault = getDefaultCalendar('default-college-algebra-mw-fall');
    if (existingDefault && existingDefault.assignments && existingDefault.assignments.length > 0 && 
        existingDefault.classSchedule && existingDefault.classSchedule.length > 0) {
      // Already exists with both assignments and class schedule - done
      return;
    }
    
    // If it exists but is incomplete, remove it and reload from CSV
    if (existingDefault) {
      removeDefaultCalendar('default-college-algebra-mw-fall');
      localStorage.removeItem('defaultCalendarsInitialized');
    }

    // Load both CSV files from public folder
    const publicUrl = process.env.PUBLIC_URL || '';
    const assignmentUrl = `${publicUrl}/Calendar/CA-MW-Fall-Assignment-Calendar.csv`;
    const classScheduleUrl = `${publicUrl}/Calendar/CA-MW-Fall-Class-Calendar.csv`;
    
    Promise.all([
      fetch(assignmentUrl).then(r => {
        if (!r.ok) throw new Error(`Failed to load assignment calendar: ${r.status}`);
        return r.text();
      }),
      fetch(classScheduleUrl).then(r => {
        if (!r.ok) throw new Error(`Failed to load class calendar: ${r.status}`);
        return r.text();
      })
    ])
      .then(([assignmentCsv, classScheduleCsv]) => {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🟢 LOADING DEFAULT CALENDAR FROM CSV FILES');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('Assignment CSV first 3 lines:');
        console.log(assignmentCsv.split('\n').slice(0, 3).join('\n'));
        console.log('Class Schedule CSV first 3 lines:');
        console.log(classScheduleCsv.split('\n').slice(0, 3).join('\n'));
        
        // Verify Assignment CSV has correct headers
        const assignmentHeader = assignmentCsv.split('\n')[0].trim();
        if (!assignmentHeader.includes('Item Name') || !assignmentHeader.includes('Start Date')) {
          console.error('❌ ERROR: Assignment CSV has wrong format!');
          console.error('Expected: Item Name, Start Date, Start Time, Due Date, Due Time');
          console.error('Got:', assignmentHeader);
          throw new Error('Assignment CSV has incorrect format');
        }
        
        // Verify Class Schedule CSV has correct headers
        const classScheduleHeader = classScheduleCsv.split('\n')[0].trim();
        if (!classScheduleHeader.includes('Date') || !classScheduleHeader.includes('Description')) {
          console.error('❌ ERROR: Class Schedule CSV has wrong format!');
          console.error('Expected: Date, Description');
          console.error('Got:', classScheduleHeader);
          throw new Error('Class Schedule CSV has incorrect format');
        }
        
        // Parse assignment calendar CSV (Item Name, Start Date, Start Time, Due Date, Due Time)
        const assignments = parseCsvFile(assignmentCsv);
        console.log(`✅ Parsed ${assignments.length} assignments from Assignment CSV`);
        if (assignments.length > 0) {
          console.log('First assignment:', assignments[0]);
          // Verify it's actually an assignment (should have itemName like "First Assignment")
          if (assignments[0].itemName && assignments[0].itemName.includes('Introduction')) {
            console.error('❌ ERROR: Assignment CSV contains class schedule data!');
            console.error('First item should be "First Assignment" but got:', assignments[0].itemName);
            console.error('Check that CA-MW-Fall-Assignment-Calendar.csv contains assignment data');
            throw new Error('Assignment CSV file contains class schedule data instead of assignments');
          }
          console.log('✅ Verified: Assignment CSV loaded correctly');
        }
        
        // Parse class schedule CSV (Date, Description)
        const classScheduleItems = parseClassScheduleCsv(classScheduleCsv);
        console.log(`✅ Parsed ${classScheduleItems.length} class schedule items from Class Schedule CSV`);
        if (classScheduleItems.length > 0) {
          console.log('First class schedule item:', classScheduleItems[0]);
          // Verify it's actually a class schedule item (should have description like "Introduction, 1.1")
          if (classScheduleItems[0].description && classScheduleItems[0].description.includes('First Assignment')) {
            console.error('❌ ERROR: Class Schedule CSV contains assignment data!');
            console.error('First item should be "Introduction, 1.1" but got:', classScheduleItems[0].description);
            console.error('Check that CA-MW-Fall-Class-Calendar.csv contains class schedule data');
            throw new Error('Class Schedule CSV file contains assignment data instead of class schedule');
          }
          console.log('✅ Verified: Class Schedule CSV loaded correctly');
        }
        
        // Convert class schedule to the format expected by the app
        // Ensure dates are in ISO format (YYYY-MM-DD) for proper comparison
        const classSchedule = classScheduleItems.map(item => {
          let dateStr = item.date;
          // parseClassScheduleCsv should already convert to ISO, but double-check
          // If date is in MM-DD-YYYY format (first part is 1-2 digits), convert to ISO (YYYY-MM-DD)
          if (dateStr && dateStr.includes('-') && dateStr.split('-').length === 3) {
            const parts = dateStr.split('-');
            // Check if it's MM-DD-YYYY (first part is month, 1-2 digits)
            if (parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
              // It's MM-DD-YYYY, convert to YYYY-MM-DD
              const [month, day, year] = parts;
              dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            // If it's already YYYY-MM-DD (first part is 4 digits), leave it as is
          }
          return {
            date: dateStr,
            description: item.description,
            type: 'classSchedule'
          };
        });

        addDefaultCalendar({
          id: 'default-college-algebra-mw-fall',
          name: 'Default College Algebra Monday, Wednesday Fall Semester',
          courseType: 'College Algebra',
          schedule: 'Monday, Wednesday',
          semester: 'Fall',
          assignments: assignments,
          classSchedule: classSchedule
        });

        localStorage.setItem('defaultCalendarsInitialized', 'true');
      })
      .catch(err => {
        console.error('❌ Failed to load CSV files for default calendar:', err);
        // Fallback: try loading from API
        fetch('/api/calendar/class-schedule')
          .then(response => response.json())
          .then(result => {
            if (result.success && result.data && result.data.length > 0) {
              // Convert class schedule items to assignment format
              const assignments = result.data.map(item => ({
                itemName: item.description,
                startDate: item.date,
                startTime: null,
                dueDate: item.date,
                dueTime: null
              }));

              addDefaultCalendar({
                id: 'default-college-algebra-mw-fall',
                name: 'Default College Algebra Monday, Wednesday Fall Semester',
                courseType: 'College Algebra',
                schedule: 'Monday, Wednesday',
                semester: 'Fall',
                assignments: assignments,
                classSchedule: result.data.map(item => ({
                  date: item.date,
                  description: item.description,
                  type: 'classSchedule'
                }))
              });

              localStorage.setItem('defaultCalendarsInitialized', 'true');
              console.log('✓ Initialized default calendar from API with', assignments.length, 'assignments');
            }
          })
          .catch(apiErr => {
            console.error('❌ Failed to load from API as fallback:', apiErr);
          });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // NOTE: Removed automatic calendar clearing - calendars should persist after import
  // Calendars will only be cleared when user explicitly uses the "Clear Calendar" feature


  // Clear calendar in a date range (both assignment calendar AND class schedule)
  const clearAssignmentsInRange = (startDate, endDate) => {
    let logMessages = [];
    logMessages.push(`🔴 CLEARING ENTIRE CALENDAR (Assignments + Class Schedule)`);
    logMessages.push(`Course: ${selectedCourse}`);
    logMessages.push(`Date Range: ${startDate?.toLocaleDateString()} to ${endDate?.toLocaleDateString()}`);
    
    if (!selectedCourse) {
      alert('ERROR: No course selected for clearing');
      return;
    }

    const rangeStart = normalizeDate(startDate);
    // Normalize endDate to end of day for proper comparison
    const rangeEnd = new Date(endDate);
    rangeEnd.setHours(23, 59, 59, 999);
    
    // Get current calendar data from localStorage directly to ensure we have the latest
    let allCalendars = {};
    try {
      allCalendars = JSON.parse(localStorage.getItem('courseCalendars') || '{}');
      logMessages.push(`📦 Calendars in localStorage: ${Object.keys(allCalendars).join(', ') || 'NONE'}`);
    } catch (e) {
      alert(`ERROR reading calendars: ${e.message}`);
      return;
    }

    const courseData = allCalendars[selectedCourse];
    if (!courseData) {
      alert(`No calendar data found for ${selectedCourse}`);
      return;
    }
    
    const originalCount = courseData.originalAssignments?.length || 0;
    const acceptedCount = courseData.acceptedFutureAssignments?.length || 0;
    logMessages.push(`📚 Found calendar: ${originalCount} original, ${acceptedCount} accepted assignments`);

    // Filter original assignments from the stored data
    const currentOriginals = courseData.originalAssignments || [];
    logMessages.push(`🔍 Filtering ${currentOriginals.length} original assignments`);
    logMessages.push(`📅 Range: ${rangeStart?.toLocaleDateString()} to ${rangeEnd?.toLocaleDateString()}`);
    logMessages.push(`📅 Range times: ${rangeStart?.toISOString()} to ${rangeEnd?.toISOString()}`);
    
    let removedCount = 0;
    let sampleAssignments = [];
    const filteredOriginals = currentOriginals.filter((assignment, index) => {
      const start = parseDate(assignment.startDate);
      const due = parseDate(assignment.dueDate);
      
      // Normalize assignment dates to midnight for comparison
      const startNormalized = start ? normalizeDate(start) : null;
      const dueNormalized = due ? normalizeDate(due) : null;
      
      // Log first 3 assignments for debugging
      if (index < 3) {
        sampleAssignments.push({
          name: assignment.itemName,
          startDate: assignment.startDate,
          dueDate: assignment.dueDate,
          parsedStart: startNormalized?.toISOString(),
          parsedDue: dueNormalized?.toISOString(),
          rangeStart: rangeStart?.toISOString(),
          rangeEnd: rangeEnd?.toISOString()
        });
      }
      
      // Compare dates properly - check if assignment overlaps with range
      // An assignment is in range if its start OR due date falls within the range
      const startInRange = startNormalized && startNormalized >= rangeStart && startNormalized <= rangeEnd;
      const dueInRange = dueNormalized && dueNormalized >= rangeStart && dueNormalized <= rangeEnd;
      // Also check if assignment spans the range (starts before and ends after)
      const spansRange = startNormalized && dueNormalized && startNormalized < rangeStart && dueNormalized > rangeEnd;
      const shouldRemove = startInRange || dueInRange || spansRange;
      
      if (shouldRemove) {
        removedCount++;
        logMessages.push(`  ❌ Removing: ${assignment.itemName} (${assignment.startDate} to ${assignment.dueDate})`);
      }
      return !shouldRemove;
    });
    
    if (sampleAssignments.length > 0) {
      logMessages.push(`📋 Sample assignments:`);
      sampleAssignments.forEach(sample => {
        logMessages.push(`  - ${sample.name}: start=${sample.startDate} (${sample.parsedStart}), due=${sample.dueDate} (${sample.parsedDue})`);
      });
    }
    
    logMessages.push(`✅ After filtering: ${filteredOriginals.length} remaining (removed ${removedCount})`);
    
    // Filter accepted future assignments from the stored data
    const currentAccepted = courseData.acceptedFutureAssignments || [];
    logMessages.push(`🔍 Filtering ${currentAccepted.length} accepted future assignments`);
    let removedAcceptedCount = 0;
    const filteredAccepted = currentAccepted.filter(assignment => {
      const start = parseDate(assignment.startDate);
      const due = parseDate(assignment.dueDate);
      const startNormalized = start ? normalizeDate(start) : null;
      const dueNormalized = due ? normalizeDate(due) : null;
      const startInRange = startNormalized && startNormalized >= rangeStart && startNormalized <= rangeEnd;
      const dueInRange = dueNormalized && dueNormalized >= rangeStart && dueNormalized <= rangeEnd;
      const spansRange = startNormalized && dueNormalized && startNormalized < rangeStart && dueNormalized > rangeEnd;
      const shouldRemove = startInRange || dueInRange || spansRange;
      if (shouldRemove) {
        removedAcceptedCount++;
        logMessages.push(`  ❌ Removing accepted: ${assignment.itemName} (${assignment.startDate} to ${assignment.dueDate})`);
      }
      return !shouldRemove;
    });
    logMessages.push(`✅ After filtering accepted: ${filteredAccepted.length} remaining (removed ${removedAcceptedCount})`);
    
    // Filter pending future assignments from component state
    const filteredPending = offsetAssignments.filter(assignment => {
      const start = normalizeDate(parseDate(assignment.startDate));
      const due = normalizeDate(parseDate(assignment.dueDate));
      const startInRange = start && start >= rangeStart && start <= rangeEnd;
      const dueInRange = due && due >= rangeStart && due <= rangeEnd;
      return !startInRange && !dueInRange;
    });
    
    // Also clear class schedule items in the date range
    // Get class schedule from localStorage directly (not component state, which might be stale)
    let currentClassSchedule = [];
    try {
      const scheduleKey = `classSchedule_${selectedCourse}`;
      const savedSchedule = localStorage.getItem(scheduleKey);
      if (savedSchedule) {
        currentClassSchedule = JSON.parse(savedSchedule);
      } else {
        // If not in localStorage, use component state
        currentClassSchedule = classSchedule;
      }
    } catch (e) {
      console.error('Error reading class schedule from localStorage:', e);
      currentClassSchedule = classSchedule;
    }
    
    const filteredClassSchedule = currentClassSchedule.filter(scheduleItem => {
      const itemDate = normalizeDate(parseDate(scheduleItem.date));
      return !itemDate || itemDate < rangeStart || itemDate > rangeEnd;
    });
    
    logMessages.push(`📅 Class schedule: ${currentClassSchedule.length} items, ${filteredClassSchedule.length} remaining after filter`);
    
    // Check if calendar is now empty (no assignments remaining)
    const totalRemaining = filteredOriginals.length + filteredAccepted.length;
    
    // ALWAYS delete the entire calendar when clearing - don't keep partial calendars
    // This ensures the course goes back to "no calendar" state and shows "Import Calendar" option
    logMessages.push(`🗑️ DELETING ENTIRE CALENDAR (Assignments + Class Schedule)`);
    logMessages.push(`   - Removed ${removedCount} assignments from assignment calendar`);
    logMessages.push(`   - Removed ${removedAcceptedCount} accepted future assignments`);
    logMessages.push(`   - Removed ${currentClassSchedule.length - filteredClassSchedule.length} class schedule items`);
    logMessages.push(`   - Course will now show "Import Calendar" option`);
    
    // Remove from the calendars object - DELETE ENTIRE CALENDAR
    delete allCalendars[selectedCourse];
    
    // Save to localStorage immediately and synchronously
    localStorage.setItem('courseCalendars', JSON.stringify(allCalendars));
    logMessages.push(`✓ Removed entire calendar for ${selectedCourse} from localStorage`);
    
    // Also clear class schedule from localStorage - DELETE IT COMPLETELY
    const scheduleKey = `classSchedule_${selectedCourse}`;
    localStorage.removeItem(scheduleKey);
    logMessages.push(`✓ Removed class schedule for ${selectedCourse} from localStorage`);
    
    // Set a flag to prevent reloading from API after page refresh
    localStorage.setItem(`calendarCleared_${selectedCourse}`, 'true');
    
    // Verify it's gone
    const verify = JSON.parse(localStorage.getItem('courseCalendars') || '{}');
    logMessages.push(`🔍 Verification: ${Object.keys(verify).length} calendars remaining: ${Object.keys(verify).join(', ') || 'NONE'}`);
    const verifySchedule = localStorage.getItem(scheduleKey);
    logMessages.push(`🔍 Class schedule verification: ${verifySchedule ? 'STILL EXISTS (ERROR!)' : 'REMOVED ✓'}`);
    
    // Show log
    alert(logMessages.join('\n'));
    
    // Also update the hook state
    deleteCourseCalendar(selectedCourse);
    
    // Clear all component state immediately
    setOriginalAssignments([]);
    setOffsetAssignments([]);
    setAcceptedFutureAssignments([]);
    setAssignments([]);
    setManualAdjustments({});
    setClassSchedule([]);
    // Note: We always delete the entire calendar when clearing, so there's no "else" branch
    // If you want to support partial clearing (keeping some assignments), that would go here
    // But for now, clearing always means "delete everything and show Import Calendar option"
  };

  // Handle semester selection for clearing
  const handleSemesterSelect = (semesterKey, range) => {
    setSelectedSemester(semesterKey);
    setClearDateRange(range);
    setShowClearConfirmation(true);
  };

  // Confirm and clear the selected semester
  const confirmClearSemester = () => {
    if (clearDateRange.start && clearDateRange.end) {
      // Save the date range before clearing state
      const startDate = clearDateRange.start;
      const endDate = clearDateRange.end;
      
      // Close all modals FIRST before clearing to prevent overlay blocking
      setShowClearCalendarMenu(false);
      setShowClearConfirmation(false);
      setSelectedSemester('');
      setClearDateRange({ start: null, end: null, label: '' });
      closeAllModals();
      
      // Small delay to ensure modals are closed, then clear and refresh
      setTimeout(() => {
        clearAssignmentsInRange(startDate, endDate);
        
        // Give time for localStorage to update, then refresh
        setTimeout(() => {
          window.location.reload();
        }, 200);
      }, 50);
    }
  };

  // Navigation handlers
  const goToPreviousMonth = () => {
    closeExpandedModal();
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    closeExpandedModal();
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    closeExpandedModal();
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const goToSemester = (semester, year) => {
    closeExpandedModal();
    let startDate;
    if (semester === 'Fall') {
      startDate = new Date(year, 7, 24); // August 24
    } else if (semester === 'Spring') {
      startDate = new Date(year, 0, 1); // January 1
    } else if (semester === 'Summer') {
      startDate = new Date(year, 5, 1); // June 1
    } else {
      return;
    }
    setCurrentDate(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
  };

  // Handle day click for expanded modal
  const handleDayClick = (date, position) => {
    openExpandedModal(date, position);
  };

  // Handle assignment click (edit time)
  const handleAssignmentClick = (assignment) => {
    // Clear any picked up assignment when opening edit modal
    if (pickedUpAssignment || draggedAssignment) {
      handleAssignmentDragEnd();
    }
    
    // Find the original assignment (before adjustments) to get the correct ID
    // We need to find it in the original arrays
    let originalAssignment = assignment;
    
    // Check if this assignment has adjustments - if so, find the original
    const allOriginals = [...originalAssignments, ...acceptedFutureAssignments, ...offsetAssignments];
    const found = allOriginals.find(a => {
      const adjusted = applyAdjustments(a);
      return adjusted.itemName === assignment.itemName &&
             adjusted.startDate === assignment.startDate &&
             adjusted.dueDate === assignment.dueDate;
    });
    
    if (found) {
      originalAssignment = found;
    }
    
    setEditingAssignment(originalAssignment);
    setShowEditAssignmentModal(true);
  };

  // Handle save assignment edit
  const handleSaveAssignmentEdit = (updatedAssignment) => {
    // Use the original assignment to get the correct ID
    const assignmentId = getAssignmentId(updatedAssignment);
    const newAdjustments = { ...manualAdjustments };
    
    if (!newAdjustments[assignmentId]) {
      newAdjustments[assignmentId] = {};
    }
    
    // Update dates and times
    if (updatedAssignment.startDate) {
      newAdjustments[assignmentId].startDate = updatedAssignment.startDate;
    }
    if (updatedAssignment.dueDate) {
      newAdjustments[assignmentId].dueDate = updatedAssignment.dueDate;
    }
    newAdjustments[assignmentId].startTime = updatedAssignment.startTime || null;
    newAdjustments[assignmentId].dueTime = updatedAssignment.dueTime || null;
    
    setManualAdjustments(newAdjustments);
    
    // Don't save to localStorage during edit mode - only save when exiting
    setShowEditAssignmentModal(false);
    setEditingAssignment(null);
  };

  if (loading) {
    return (
      <div className="calendar-container">
        <div className="calendar-loading">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <CourseSidebar
        courses={courses}
        selectedCourse={selectedCourse}
        courseCalendars={courseCalendars}
        onCourseSelect={setSelectedCourse}
        onImportClick={(courseId) => {
          setSelectedCourse(courseId);
          setImportingCourse(courseId);
          setShowImportCalendar(true);
        }}
        onSemesterClick={goToSemester}
      />

      <div className="calendar-main-wrapper">
        <header className="calendar-header">
          <div className="header-buttons-left">
            <button className="future-planning-button" onClick={() => {
              navigate('/future-planning');
            }}>
              Future Planning
            </button>
            <div style={{ position: 'relative' }}>
              <button className="clear-calendar-button" onClick={(e) => {
                e.stopPropagation();
                setShowClearCalendarMenu(!showClearCalendarMenu);
                setSelectedSemester('');
              }}>
                Clear Calendar
              </button>
              {showClearCalendarMenu && (
                <ClearCalendarModal
                  show={showClearCalendarMenu}
                  showConfirmation={showClearConfirmation}
                  selectedSemester={selectedSemester}
                  clearDateRange={clearDateRange}
                  originalAssignments={originalAssignments}
                  acceptedFutureAssignments={acceptedFutureAssignments}
                  selectedCourse={selectedCourse}
                  onClose={() => {
                    setShowClearCalendarMenu(false);
                    setSelectedSemester('');
                  }}
                  onSemesterSelect={handleSemesterSelect}
                  onConfirm={confirmClearSemester}
                  onCancel={() => {
                    setShowClearConfirmation(false);
                    setSelectedSemester('');
                    setClearDateRange({ start: null, end: null, label: '' });
                  }}
                />
              )}
            </div>
            <button 
              className="calendar-mode-toggle-button" 
              onClick={() => {
                setCalendarMode(calendarMode === 'assignment' ? 'class' : 'assignment');
              }}
              style={{
                background: calendarMode === 'class' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(0, 179, 255, 0.1)',
                borderColor: calendarMode === 'class' ? '#4caf50' : 'var(--accent-blue)',
                color: calendarMode === 'class' ? '#4caf50' : 'var(--accent-blue)'
              }}
            >
              {calendarMode === 'assignment' ? '📚 Class Calendar' : '📝 Assignment Calendar'}
            </button>
          </div>
          <img src={mavericksLogo} alt="Mavericks Logo" className="calendar-logo" />
          <h1 className="calendar-title">Academic Calendar</h1>
          <button 
            className="back-button" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Use window.location for hard navigation to ensure it works
              window.location.href = '/';
            }}
          >
            ← Back to Home
          </button>
        </header>

        {/* Pending Changes Banner */}
        {hasPendingChanges && offsetAssignments.length > 0 && (
          <div className="pending-changes-banner">
            <div className="pending-changes-content">
              <span className="pending-changes-text">
                You have pending future planning changes. Review the calendar and accept to make them permanent.
              </span>
              <div className="pending-changes-buttons">
                <button className="accept-changes-button" onClick={() => acceptFutureAssignments(setAcceptedFutureAssignments)}>
                  Accept Changes
                </button>
                <button className="discard-changes-button" onClick={clearPendingFutureAssignments}>
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="calendar-main">
          {/* ONLY show calendar if it was explicitly imported - NO class schedule mode without imported calendar */}
          {/* Check component state first for immediate UI updates, then fall back to courseCalendars */}
          {((originalAssignments && originalAssignments.length > 0) ||
            (courseCalendars[selectedCourse] && courseCalendars[selectedCourse].originalAssignments && courseCalendars[selectedCourse].originalAssignments.length > 0)) && (
            <>
              <div className="calendar-controls">
                <div className="controls-left">
                  <button className="nav-button" onClick={goToPreviousMonth}>← Previous</button>
                  <button className="nav-button today-button" onClick={goToToday}>Today</button>
                </div>
                <h2 className="month-year">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <div className="controls-right">
                  <button 
                    className={`nav-button ${isEditMode ? 'edit-mode-active' : ''}`}
                    onClick={() => {
                      if (isEditMode) {
                        if (calendarMode === 'class') {
                          handleExitClassEditMode();
                        } else {
                          handleExitEditMode();
                        }
                      } else {
                        if (calendarMode === 'class') {
                          handleEnterClassEditMode();
                        } else {
                          handleEnterEditMode();
                        }
                      }
                    }}
                    style={{
                      background: isEditMode ? 'rgba(255, 193, 7, 0.2)' : 'rgba(0, 179, 255, 0.1)',
                      borderColor: isEditMode ? '#ffc107' : 'var(--accent-blue)',
                      color: isEditMode ? '#ffc107' : 'var(--accent-blue)'
                    }}
                  >
                    {isEditMode ? '✓ Edit Mode' : 'Edit Calendar'}
                  </button>
                  {isEditMode && calendarMode === 'assignment' && (
                    <button 
                      className={`nav-button undo-button ${!hasChanges() ? 'disabled' : ''}`}
                      onClick={handleUndo}
                      disabled={!hasChanges()}
                      style={{
                        background: !hasChanges() ? 'rgba(100, 100, 100, 0.1)' : 'rgba(255, 152, 0, 0.2)',
                        borderColor: !hasChanges() ? 'var(--text-dim)' : '#ff9800',
                        color: !hasChanges() ? 'var(--text-dim)' : '#ff9800',
                        opacity: !hasChanges() ? 0.5 : 1,
                        cursor: !hasChanges() ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ↶ Undo Changes
                    </button>
                  )}
                  {isEditMode && calendarMode === 'class' && (
                    <>
                      <button 
                        className={`nav-button undo-button ${!hasClassScheduleChanges() ? 'disabled' : ''}`}
                        onClick={handleUndoClassChanges}
                        disabled={!hasClassScheduleChanges()}
                        style={{
                          background: !hasClassScheduleChanges() ? 'rgba(100, 100, 100, 0.1)' : 'rgba(255, 152, 0, 0.2)',
                          borderColor: !hasClassScheduleChanges() ? 'var(--text-dim)' : '#ff9800',
                          color: !hasClassScheduleChanges() ? 'var(--text-dim)' : '#ff9800',
                          opacity: !hasClassScheduleChanges() ? 0.5 : 1,
                          cursor: !hasClassScheduleChanges() ? 'not-allowed' : 'pointer',
                          marginRight: '10px'
                        }}
                      >
                        ↶ Undo Changes
                      </button>
                      <button 
                        className="nav-button save-button"
                        onClick={handleExitClassEditMode}
                        style={{
                          background: hasClassScheduleChanges() ? 'rgba(76, 175, 80, 0.2)' : 'rgba(100, 100, 100, 0.1)',
                          borderColor: hasClassScheduleChanges() ? '#4caf50' : 'var(--text-dim)',
                          color: hasClassScheduleChanges() ? '#4caf50' : 'var(--text-dim)',
                          opacity: hasClassScheduleChanges() ? 1 : 0.5,
                          cursor: hasClassScheduleChanges() ? 'pointer' : 'not-allowed'
                        }}
                      >
                        ✓ Save Changes
                      </button>
                    </>
                  )}
                  <button className="nav-button" onClick={goToNextMonth}>Next →</button>
                </div>
              </div>

              {isEditMode && !showEditAssignmentModal && (
                <div className="edit-mode-banner">
                  <span>
                    {calendarMode === 'assignment' 
                      ? 'Edit Mode: Drag assignments to move dates • Right-click assignments to edit times • Changes save when you exit edit mode'
                      : 'Edit Mode: Click a class schedule item to pick it up, then click another day to move it • Items will cascade forward automatically • Changes save automatically'
                    }
                  </span>
                </div>
              )}

              <CalendarGrid
                currentDate={currentDate}
                selectedDate={selectedDate}
                getAssignmentsForDate={getAssignmentsForDate}
                onDayClick={handleDayClick}
                isEditMode={isEditMode && !showEditAssignmentModal}
                draggedAssignment={draggedAssignment}
                pickedUpAssignment={pickedUpAssignment}
                dragPosition={dragPosition}
                dragStartPosition={dragStartPosition}
                onAssignmentDragStart={handleAssignmentDragStart}
                onAssignmentDragMove={handleAssignmentDragMove}
                onAssignmentDrop={handleAssignmentDrop}
                onAssignmentClick={handleAssignmentClick}
                calendarMode={calendarMode}
                // Class calendar edit mode is handled on separate page, not here
                pickedUpScheduleItem={null}
                scheduleItemDragPosition={null}
                onScheduleItemPickup={undefined}
                onScheduleItemDrop={undefined}
              />
            </>
          )}

          {/* Expanded Modal for dates with 2+ assignments */}
          {expandedDate && !showFuturePlanning && (
            <ExpandedDateModal
              expandedDate={expandedDate}
              expandedPosition={expandedPosition}
              assignments={getAssignmentsForDate(expandedDate)}
              onClose={closeExpandedModal}
              isEditMode={isEditMode}
              draggedAssignment={draggedAssignment}
              onAssignmentDragStart={handleAssignmentDragStart}
              onAssignmentDrop={handleAssignmentDrop}
              onAssignmentClick={handleAssignmentClick}
            />
          )}

          {!courseCalendars[selectedCourse] ? (
            <div className="no-calendar-message">
              <div className="no-calendar-content">
                <h2>No Calendar Available</h2>
                <p>This course does not have a calendar configured yet.</p>
                <button 
                  className="import-calendar-button"
                  onClick={() => {
                    setImportingCourse(selectedCourse);
                    setShowImportCalendar(true);
                  }}
                >
                  Import Calendar
                </button>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {/* Modals */}
      <FuturePlanningModal
        show={showFuturePlanning}
        courses={courses}
        futurePlanningCourse={futurePlanningCourse}
        currentStartDate={currentStartDate}
        futureStartDate={futureStartDate}
        originalAssignments={originalAssignments}
        courseCalendars={courseCalendars}
        shiftForwardOneDay={shiftForwardOneDay}
        setShiftForwardOneDay={setShiftForwardOneDay}
        onClose={() => {
          setShowFuturePlanning(false);
          setFuturePlanningCourse('');
          setCurrentStartDate('');
          setFutureStartDate('');
          setShiftForwardOneDay(false);
        }}
        onCourseChange={(courseId) => {
          setFuturePlanningCourse(courseId);
          setCurrentStartDate('');
          setFutureStartDate('');
          // Clear existing future assignments when selecting a new course
          setAcceptedFutureAssignments([]);
          setOffsetAssignments([]);
          setHasPendingChanges(false);
        }}
        onCurrentStartDateChange={(date) => {
          setCurrentStartDate(date);
        }}
        onFutureStartDateChange={setFutureStartDate}
        onCalculate={() => {
          // Clear existing future assignments before calculating new ones
          setAcceptedFutureAssignments([]);
          calculateFutureCalendar();
          setShowFuturePlanning(false);
        }}
      />

      <ImportCalendarModal
        show={showImportCalendar}
        importingCourse={importingCourse}
        importStartDate={importStartDate}
        importCsvFile={importCsvFile}
        onClose={() => {
          setShowImportCalendar(false);
          setImportingCourse('');
          setImportStartDate('');
          setImportCsvFile(null);
        }}
        onStartDateChange={setImportStartDate}
        onFileChange={setImportCsvFile}
        onImport={handleImportCalendar}
        onImportDefault={handleImportDefaultCalendar}
      />


      <EditAssignmentModal
        show={showEditAssignmentModal}
        assignment={editingAssignment ? applyAdjustments(editingAssignment) : null}
        onClose={() => {
          setShowEditAssignmentModal(false);
          setEditingAssignment(null);
        }}
        onSave={handleSaveAssignmentEdit}
      />

      <DebugOverlay />
    </div>
  );
}

export default Calendar;
