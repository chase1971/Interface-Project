import React, { useState, useEffect } from "react";
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

// Hooks
import { useCourseCalendars } from "../hooks/useCourseCalendars";
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
  
  // Course management
  const [selectedCourse, setSelectedCourse] = useState('CA 4201');
  const [originalAssignments, setOriginalAssignments] = useState([]);
  const [acceptedFutureAssignments, setAcceptedFutureAssignments] = useState([]);
  
  // Clear calendar state (non-modal state stays here)
  const [selectedSemester, setSelectedSemester] = useState('');
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
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
    clearCourseAssignmentsInRange
  } = useCourseCalendars();

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

  // Load calendar data for the selected course
  useEffect(() => {
    loadCourseCalendar(selectedCourse);
  }, [selectedCourse]);

  // Load class schedule data when in class calendar mode or course changes
  useEffect(() => {
    if (calendarMode === 'class') {
      loadClassSchedule();
      // Don't disable edit mode - allow editing class schedule items
      // Clear snapshot when switching courses
      setClassScheduleSnapshot(null);
    }
  }, [calendarMode, selectedCourse]);

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
  const loadCourseCalendar = async (courseId) => {
    setLoading(true);
    try {
      const courseData = getCourseCalendar(courseId);
      
      if (courseData) {
        const originals = courseData.originalAssignments || [];
        const accepted = courseData.acceptedFutureAssignments || [];
        const adjustments = courseData.manualAdjustments || {};
        
        setOriginalAssignments(originals);
        setAssignments(originals);
        setAcceptedFutureAssignments(accepted);
        setManualAdjustments(adjustments);
      } else if (courseId === 'CA 4201') {
        // Load from API for CA 4201 (default course)
        const response = await fetch('/api/calendar/data');
        const result = await response.json();
        if (result.success) {
          const originalData = JSON.parse(JSON.stringify(result.data));
          setOriginalAssignments(originalData);
          setAssignments(originalData);
          setAcceptedFutureAssignments([]);
          setManualAdjustments({});
          
          // Save to course calendars
          setCourseCalendar(courseId, {
            originalAssignments: originalData,
            acceptedFutureAssignments: [],
            manualAdjustments: {}
          });
        } else {
          console.error('Failed to fetch calendar data:', result.error);
        }
      } else if (courseId === 'CA 4105') {
        // Copy CA 4201 calendar to CA 4105 and shift from TR to MW
        const ca4201Data = getCourseCalendar('CA 4201');
        let sourceAssignments = [];
        
        if (ca4201Data && ca4201Data.originalAssignments) {
          sourceAssignments = ca4201Data.originalAssignments;
        } else {
          // Try to load from API if not in localStorage
          try {
            const response = await fetch('/api/calendar/data');
            const result = await response.json();
            if (result.success) {
              sourceAssignments = result.data;
            }
          } catch (error) {
            console.error('Failed to fetch CA 4201 data:', error);
          }
        }
        
        if (sourceAssignments.length > 0) {
          // Shift all dates from TR to MW schedule
          const shiftedAssignments = copyAndShiftTRtoMW(sourceAssignments);
          
          setOriginalAssignments(shiftedAssignments);
          setAssignments(shiftedAssignments);
          setAcceptedFutureAssignments([]);
          setManualAdjustments({});
          
          // Save to course calendars
          setCourseCalendar(courseId, {
            originalAssignments: shiftedAssignments,
            acceptedFutureAssignments: [],
            manualAdjustments: {}
          });
        } else {
          // No source calendar available
          setOriginalAssignments([]);
          setAssignments([]);
          setAcceptedFutureAssignments([]);
          setManualAdjustments({});
        }
      } else {
        // No calendar for this course
        setOriginalAssignments([]);
        setAssignments([]);
        setAcceptedFutureAssignments([]);
        setManualAdjustments({});
      }
    } catch (error) {
      console.error('Error loading course calendar:', error);
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
      
      alert(`Successfully imported ${parsedData.length} assignments for ${importingCourse}`);
    } catch (error) {
      console.error('Error importing calendar:', error);
      alert('Error importing calendar: ' + error.message);
    }
  };


  // Clear assignments in a date range
  const clearAssignmentsInRange = (startDate, endDate) => {
    const rangeStart = normalizeDate(startDate);
    const rangeEnd = endDate; // Already set to end of day
    
    // Filter original assignments
    const filteredOriginals = originalAssignments.filter(assignment => {
      const start = normalizeDate(parseDate(assignment.startDate));
      const due = normalizeDate(parseDate(assignment.dueDate));
      const startInRange = start && start >= rangeStart && start <= rangeEnd;
      const dueInRange = due && due >= rangeStart && due <= rangeEnd;
      return !startInRange && !dueInRange;
    });
    
    // Filter pending future assignments
    const filteredPending = offsetAssignments.filter(assignment => {
      const start = normalizeDate(parseDate(assignment.startDate));
      const due = normalizeDate(parseDate(assignment.dueDate));
      const startInRange = start && start >= rangeStart && start <= rangeEnd;
      const dueInRange = due && due >= rangeStart && due <= rangeEnd;
      return !startInRange && !dueInRange;
    });
    
    // Filter accepted future assignments - also clear these permanently
    const filteredAccepted = acceptedFutureAssignments.filter(assignment => {
      const start = normalizeDate(parseDate(assignment.startDate));
      const due = normalizeDate(parseDate(assignment.dueDate));
      const startInRange = start && start >= rangeStart && start <= rangeEnd;
      const dueInRange = due && due >= rangeStart && due <= rangeEnd;
      return !startInRange && !dueInRange;
    });
    
    // Update all state
    setOriginalAssignments(filteredOriginals);
    setOffsetAssignments(filteredPending);
    setAcceptedFutureAssignments(filteredAccepted);
    setAssignments(filteredOriginals);
    
    // Update course calendar in storage
    clearCourseAssignmentsInRange(selectedCourse, startDate, endDate, normalizeDate, parseDate);
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
      clearAssignmentsInRange(clearDateRange.start, clearDateRange.end);
      setShowClearCalendar(false);
      setShowClearConfirmation(false);
      setSelectedSemester('');
      setClearDateRange({ start: null, end: null, label: '' });
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
            <button className="clear-calendar-button" onClick={() => {
              setShowClearCalendar(true);
              setSelectedSemester('');
            }}>
              Clear Calendar
            </button>
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
          <button className="back-button" onClick={() => navigate('/')}>
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
          {((courseCalendars[selectedCourse] || selectedCourse === 'CA 4201') || calendarMode === 'class') && (
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

          {!courseCalendars[selectedCourse] && selectedCourse !== 'CA 4201' ? (
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
      />

      <ClearCalendarModal
        show={showClearCalendar}
        showConfirmation={showClearConfirmation}
        selectedSemester={selectedSemester}
        clearDateRange={clearDateRange}
        originalAssignments={originalAssignments}
        acceptedFutureAssignments={acceptedFutureAssignments}
        onClose={() => {
          setShowClearCalendar(false);
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

      <EditAssignmentModal
        show={showEditAssignmentModal}
        assignment={editingAssignment ? applyAdjustments(editingAssignment) : null}
        onClose={() => {
          setShowEditAssignmentModal(false);
          setEditingAssignment(null);
        }}
        onSave={handleSaveAssignmentEdit}
      />
    </div>
  );
}

export default Calendar;
