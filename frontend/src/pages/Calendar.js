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
  parseClassScheduleCsv,
  monthNames,
  copyAndShiftTRtoMW,
  getCourseSchedule,
  normalizeClassScheduleDate
} from "../utils/calendarUtils";
import { validateCsvFiles } from "../utils/csvValidation";
import { cascadeMoveItems } from "../utils/classDayUtils";
import { debugLog, debugError, debugWarn } from "../utils/debug";

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

  // Track if we just imported a calendar to prevent useEffect from clearing it
  const justImportedRef = useRef(false);

  // Save selected course and calendar mode to localStorage when they change
  useEffect(() => {
    if (selectedCourse) {
      localStorage.setItem('selectedCourse', selectedCourse);
    }
    localStorage.setItem('calendarMode', calendarMode);
  }, [selectedCourse, calendarMode]);

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
          debugError('Error parsing saved class schedule:', e);
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
        debugError('Failed to fetch class schedule:', result.error);
        setClassSchedule([]);
      }
    } catch (error) {
      debugError('Error loading class schedule:', error);
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

  // Handle class schedule item drop (with cascading)
  const handleScheduleItemDrop = (targetDate) => {
    debugLog('handleScheduleItemDrop called', { targetDate, pickedUpScheduleItem, isEditMode, calendarMode });
    
    if (!isEditMode || calendarMode !== 'class' || !pickedUpScheduleItem) {
      debugLog('Early return - conditions not met', { isEditMode, calendarMode, hasPickedUpItem: !!pickedUpScheduleItem });
      return;
    }
    
    // Format dates consistently - use YYYY-MM-DD format
    const targetDateObj = new Date(targetDate);
    const targetDateStr = targetDateObj.toISOString().split('T')[0];
    const sourceDateStr = pickedUpScheduleItem.sourceDate;
    
    debugLog('Drop attempt', { sourceDateStr, targetDateStr, targetDate });
    
    // Don't do anything if dropping on the same date
    if (targetDateStr === sourceDateStr) {
      debugLog('Dropping on same date - cancelling');
      setPickedUpScheduleItem(null);
      setScheduleItemDragPosition(null);
      return;
    }
    
    // Get course schedule for cascading
    const courseSchedule = getCourseSchedule(selectedCourse, COURSES);
    if (!courseSchedule) {
      debugError('Could not determine course schedule for cascading');
      setPickedUpScheduleItem(null);
      setScheduleItemDragPosition(null);
      return;
    }
    
    debugLog('Course schedule:', courseSchedule);
    
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
    
    debugLog('Holiday dates set:', Array.from(holidayDates));
    
    debugLog('Looking for item to move', { sourceDateStr, itemName: pickedUpScheduleItem.itemName, scheduleLength: updatedSchedule.length });
    debugLog('Current schedule items:', updatedSchedule.map(i => ({ date: i.date, description: i.description })));
    
    // Find the item being moved by matching date and description
    const itemToMove = updatedSchedule.find(item => 
      item.date === sourceDateStr && item.description === pickedUpScheduleItem.itemName
    );
    if (!itemToMove) {
      debugError('Could not find item to move', { sourceDateStr, itemName: pickedUpScheduleItem.itemName, availableItems: updatedSchedule.map(i => ({ date: i.date, description: i.description })) });
      setPickedUpScheduleItem(null);
      setScheduleItemDragPosition(null);
      return;
    }
    
    debugLog('Found item to move:', itemToMove);
    
    // Check if target date is empty (no item on target date)
    const targetDateItem = updatedSchedule.find(item => item.date === targetDateStr);
    const isTargetEmpty = !targetDateItem;
    
    debugLog('Target date status', { targetDateStr, isTargetEmpty, targetItem: targetDateItem });
    
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
      debugLog('Target is empty - simple move, no cascading');
      cascadedItems = scheduleItemsForCascade.map(item => {
        if (item.date === sourceDateStr && item.itemName === pickedUpScheduleItem.itemName) {
          return { ...item, date: targetDateStr };
        }
        return item;
      });
    } else {
      // Target has an item - replace it and cascade
      debugLog('Calling cascadeMoveItems (target occupied)', { 
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
    
    debugLog('Cascaded items result', cascadedItems);
    debugLog('Cascaded items count:', cascadedItems.length);
    
    if (!cascadedItems || cascadedItems.length === 0) {
      debugError('Cascade function returned no items!');
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
    
    debugLog('Cascaded map created with', cascadedMap.size, 'items');
    
    const newClassSchedule = updatedSchedule.map(item => {
      // Find the cascaded item that matches this description
      const key = item.description;
      const cascadedItem = cascadedMap.get(key);
      
      if (cascadedItem) {
        // Always update the date from cascaded item
        const newDate = cascadedItem.date;
        if (newDate !== item.date) {
          debugLog('Updating item date', { 
            oldDate: item.date, 
            newDate: newDate, 
            description: item.description 
          });
        }
        return { ...item, date: newDate };
      }
      // If not found in cascaded items, keep original
      debugWarn('Item not found in cascaded items, keeping original date', item.description);
      return item;
    });
    
    debugLog('New class schedule (first 5 items):', newClassSchedule.slice(0, 5));
    debugLog('Total items in new schedule:', newClassSchedule.length);
    
    // Force a state update with a new array reference
    setClassSchedule([...newClassSchedule]);
    
    // Don't save to localStorage here - wait for Save Changes button
    // Changes are saved when exiting edit mode via handleExitClassEditMode
    
    // Clear picked up item
    setPickedUpScheduleItem(null);
    setScheduleItemDragPosition(null);
    
    debugLog('Drop completed successfully - state updated');
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
      debugError('Error loading course calendar:', error);
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
      debugError('Error importing calendar:', error);
      alert('Error importing calendar: ' + error.message);
    }
  };

  // Validate default calendar and parameters
  const validateDefaultCalendarImport = (defaultCalendarId, courseId) => {
    if (!defaultCalendarId || !courseId) {
      debugError('❌ Missing parameters - cannot import');
      alert('Please select a default calendar.');
      return null;
    }

    const defaultCal = getDefaultCalendar(defaultCalendarId);
    debugLog('🔍 Looking up default calendar in localStorage...');
    debugLog('Default calendar found:', {
      exists: !!defaultCal,
      hasAssignments: !!defaultCal?.assignments,
      assignmentCount: defaultCal?.assignments?.length || 0,
      hasClassSchedule: !!defaultCal?.classSchedule,
      classScheduleCount: defaultCal?.classSchedule?.length || 0
    });
    
    if (!defaultCal || !defaultCal.assignments) {
      debugError('❌ Default calendar not found or has no assignments');
      alert('Default calendar not found or has no assignments.');
      return null;
    }

    return defaultCal;
  };

  // Copy data from default calendar
  const copyDefaultCalendarData = (defaultCal) => {
    debugLog('═══════════════════════════════════════════════════════════');
    debugLog('🟢 STEP 3: COPYING DATA FROM DEFAULT CALENDAR');
    debugLog('═══════════════════════════════════════════════════════════');
    
    const importedAssignments = JSON.parse(JSON.stringify(defaultCal.assignments));
    const importedClassSchedule = defaultCal.classSchedule 
      ? JSON.parse(JSON.stringify(defaultCal.classSchedule))
      : [];
    
    debugLog(`📋 Copied ${importedAssignments.length} assignments`);
    debugLog(`📅 Copied ${importedClassSchedule.length} class schedule items`);
    
    // Log first items for debugging
    if (importedAssignments.length > 0) {
      debugLog('📝 FIRST ASSIGNMENT:', importedAssignments[0].itemName);
    }
    if (importedClassSchedule.length > 0) {
      debugLog('📚 FIRST CLASS SCHEDULE ITEM:', importedClassSchedule[0].description);
    }

    return { importedAssignments, importedClassSchedule };
  };

  // Save imported calendar to localStorage
  const saveImportedCalendar = (courseId, assignments, classSchedule) => {
    debugLog('═══════════════════════════════════════════════════════════');
    debugLog('🟢 STEP 4: SAVING TO COURSE CALENDAR');
    debugLog('═══════════════════════════════════════════════════════════');
    
    // Save assignments to course calendars
    setCourseCalendar(courseId, {
      originalAssignments: assignments,
      acceptedFutureAssignments: [],
      manualAdjustments: {}
    });
    debugLog(`✅ Saved ${assignments.length} assignments to courseCalendars['${courseId}']`);

    // Normalize and save class schedule
    const normalizedClassSchedule = classSchedule.map(item => ({
      ...item,
      date: normalizeClassScheduleDate(item.date)
    }));
    
    const scheduleKey = `classSchedule_${courseId}`;
    localStorage.setItem(scheduleKey, JSON.stringify(normalizedClassSchedule));
    debugLog(`✅ Saved ${normalizedClassSchedule.length} class schedule items to localStorage['${scheduleKey}']`);

    return normalizedClassSchedule;
  };

  // Load imported calendar into component state if course matches
  const loadImportedCalendarIntoState = (courseId, assignments, normalizedClassSchedule) => {
    debugLog('═══════════════════════════════════════════════════════════');
    debugLog('🟢 STEP 5: LOADING INTO FRONTEND COMPONENT STATE');
    debugLog('═══════════════════════════════════════════════════════════');
    debugLog('Importing course:', courseId);
    debugLog('Selected course:', selectedCourse);
    debugLog('Courses match:', courseId === selectedCourse);
    
    if (courseId !== selectedCourse) {
      debugLog('⚠️ Courses do not match - data saved but not loaded into view');
      return;
    }

    debugLog('✅ Courses match - loading into component state immediately');
    
    // Set flag to prevent useEffect from clearing imported data
    justImportedRef.current = true;
    
    // Load into component state
    setOriginalAssignments(assignments);
    setAssignments(assignments);
    setAcceptedFutureAssignments([]);
    setManualAdjustments({});
    setClassSchedule(normalizedClassSchedule);
    
    debugLog(`✅ Loaded ${assignments.length} assignments and ${normalizedClassSchedule.length} class schedule items into state`);
  };

  // Handle importing from default calendar
  const handleImportDefaultCalendar = (defaultCalendarId) => {
    debugLog('═══════════════════════════════════════════════════════════');
    debugLog('🟢 STEP 2: handleImportDefaultCalendar CALLED');
    debugLog('═══════════════════════════════════════════════════════════');
    debugLog('Default calendar ID:', defaultCalendarId);
    debugLog('Importing into course:', importingCourse);
    debugLog('Timestamp:', new Date().toISOString());

    try {
      // Step 1: Validate
      const defaultCal = validateDefaultCalendarImport(defaultCalendarId, importingCourse);
      if (!defaultCal) return;

      // Step 2: Copy data
      const { importedAssignments, importedClassSchedule } = copyDefaultCalendarData(defaultCal);

      // Step 3: Save to localStorage
      const normalizedClassSchedule = saveImportedCalendar(
        importingCourse,
        importedAssignments,
        importedClassSchedule
      );

      // Step 4: Load into state if course matches
      loadImportedCalendarIntoState(importingCourse, importedAssignments, normalizedClassSchedule);

      // Step 5: Close modal
      setShowImportCalendar(false);
      setImportingCourse('');
      
      debugLog('═══════════════════════════════════════════════════════════');
      debugLog('🟢 STEP 8: IMPORT COMPLETE - MODAL CLOSING');
      debugLog('═══════════════════════════════════════════════════════════');
    } catch (error) {
      debugError('═══════════════════════════════════════════════════════════');
      debugError('❌ ERROR DURING IMPORT');
      debugError('═══════════════════════════════════════════════════════════');
      debugError('Error:', error.message);
      debugError('═══════════════════════════════════════════════════════════');
      alert('Error importing default calendar: ' + error.message);
    }
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
        debugLog('═══════════════════════════════════════════════════════════');
        debugLog('🟢 LOADING DEFAULT CALENDAR FROM CSV FILES');
        debugLog('═══════════════════════════════════════════════════════════');
        debugLog('Assignment CSV first 3 lines:');
        debugLog(assignmentCsv.split('\n').slice(0, 3).join('\n'));
        debugLog('Class Schedule CSV first 3 lines:');
        debugLog(classScheduleCsv.split('\n').slice(0, 3).join('\n'));
        
        // Parse CSV files
        const assignments = parseCsvFile(assignmentCsv);
        const classScheduleItems = parseClassScheduleCsv(classScheduleCsv);
        
        debugLog(`✅ Parsed ${assignments.length} assignments from Assignment CSV`);
        debugLog(`✅ Parsed ${classScheduleItems.length} class schedule items from Class Schedule CSV`);
        
        // Validate CSV files and parsed data
        const validation = validateCsvFiles(assignmentCsv, classScheduleCsv, assignments, classScheduleItems);
        if (!validation.valid) {
          debugError('❌ CSV VALIDATION FAILED:');
          validation.errors.forEach(error => debugError(`  ${error}`));
          throw new Error(validation.errors.join('; '));
        }
        
        debugLog('✅ All CSV files validated successfully');
        
        // Convert class schedule to the format expected by the app
        // Ensure dates are in ISO format (YYYY-MM-DD) for proper comparison
        const classSchedule = classScheduleItems.map(item => ({
          date: normalizeClassScheduleDate(item.date),
          description: item.description,
          type: 'classSchedule'
        }));

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
        debugError('❌ Failed to load CSV files for default calendar:', err);
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
              debugLog('✓ Initialized default calendar from API with', assignments.length, 'assignments');
            }
          })
          .catch(apiErr => {
            debugError('❌ Failed to load from API as fallback:', apiErr);
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
      debugError('Error reading class schedule from localStorage:', e);
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
