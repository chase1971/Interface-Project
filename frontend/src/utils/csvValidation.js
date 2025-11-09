// CSV validation utilities

/**
 * Validates assignment CSV format
 * @param {string} csvContent - The CSV content to validate
 * @returns {Object} - { valid: boolean, error?: string, header?: string }
 */
export const validateAssignmentCsv = (csvContent) => {
  if (!csvContent || !csvContent.trim()) {
    return { valid: false, error: 'Assignment CSV is empty' };
  }

  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 1) {
    return { valid: false, error: 'Assignment CSV has no content' };
  }

  const header = lines[0].trim();
  
  if (!header.includes('Item Name') || !header.includes('Start Date')) {
    return {
      valid: false,
      error: 'Assignment CSV has incorrect format',
      expected: 'Item Name, Start Date, Start Time, Due Date, Due Time',
      got: header
    };
  }

  return { valid: true, header };
};

/**
 * Validates class schedule CSV format
 * @param {string} csvContent - The CSV content to validate
 * @returns {Object} - { valid: boolean, error?: string, header?: string }
 */
export const validateClassScheduleCsv = (csvContent) => {
  if (!csvContent || !csvContent.trim()) {
    return { valid: false, error: 'Class Schedule CSV is empty' };
  }

  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 1) {
    return { valid: false, error: 'Class Schedule CSV has no content' };
  }

  const header = lines[0].trim();
  
  if (!header.includes('Date') || !header.includes('Description')) {
    return {
      valid: false,
      error: 'Class Schedule CSV has incorrect format',
      expected: 'Date, Description',
      got: header
    };
  }

  return { valid: true, header };
};

/**
 * Validates that parsed assignment data contains actual assignments (not class schedule items)
 * @param {Array} assignments - Parsed assignment array
 * @returns {Object} - { valid: boolean, error?: string }
 */
export const validateAssignmentData = (assignments) => {
  if (!assignments || assignments.length === 0) {
    return { valid: false, error: 'No assignments found' };
  }

  const firstAssignment = assignments[0];
  
  // Check if first item looks like a class schedule item (e.g., "Introduction, 1.1")
  if (firstAssignment.itemName && firstAssignment.itemName.includes('Introduction')) {
    return {
      valid: false,
      error: 'Assignment CSV contains class schedule data',
      expected: 'First Assignment',
      got: firstAssignment.itemName
    };
  }

  return { valid: true };
};

/**
 * Validates that parsed class schedule data contains actual class schedule items (not assignments)
 * @param {Array} classScheduleItems - Parsed class schedule array
 * @returns {Object} - { valid: boolean, error?: string }
 */
export const validateClassScheduleData = (classScheduleItems) => {
  if (!classScheduleItems || classScheduleItems.length === 0) {
    return { valid: false, error: 'No class schedule items found' };
  }

  const firstItem = classScheduleItems[0];
  
  // Check if first item looks like an assignment (e.g., "First Assignment")
  if (firstItem.description && firstItem.description.includes('First Assignment')) {
    return {
      valid: false,
      error: 'Class Schedule CSV contains assignment data',
      expected: 'Introduction, 1.1',
      got: firstItem.description
    };
  }

  return { valid: true };
};

/**
 * Validates both CSV files and their parsed data
 * @param {string} assignmentCsv - Assignment CSV content
 * @param {string} classScheduleCsv - Class Schedule CSV content
 * @param {Array} assignments - Parsed assignments
 * @param {Array} classScheduleItems - Parsed class schedule items
 * @returns {Object} - { valid: boolean, errors?: Array<string> }
 */
export const validateCsvFiles = (assignmentCsv, classScheduleCsv, assignments, classScheduleItems) => {
  const errors = [];

  // Validate assignment CSV format
  const assignmentValidation = validateAssignmentCsv(assignmentCsv);
  if (!assignmentValidation.valid) {
    errors.push(`Assignment CSV: ${assignmentValidation.error}`);
    if (assignmentValidation.expected) {
      errors.push(`  Expected: ${assignmentValidation.expected}`);
      errors.push(`  Got: ${assignmentValidation.got}`);
    }
  }

  // Validate class schedule CSV format
  const classScheduleValidation = validateClassScheduleCsv(classScheduleCsv);
  if (!classScheduleValidation.valid) {
    errors.push(`Class Schedule CSV: ${classScheduleValidation.error}`);
    if (classScheduleValidation.expected) {
      errors.push(`  Expected: ${classScheduleValidation.expected}`);
      errors.push(`  Got: ${classScheduleValidation.got}`);
    }
  }

  // Validate assignment data content
  const assignmentDataValidation = validateAssignmentData(assignments);
  if (!assignmentDataValidation.valid) {
    errors.push(`Assignment Data: ${assignmentDataValidation.error}`);
    if (assignmentDataValidation.expected) {
      errors.push(`  Expected: ${assignmentDataValidation.expected}`);
      errors.push(`  Got: ${assignmentDataValidation.got}`);
    }
  }

  // Validate class schedule data content
  const classScheduleDataValidation = validateClassScheduleData(classScheduleItems);
  if (!classScheduleDataValidation.valid) {
    errors.push(`Class Schedule Data: ${classScheduleDataValidation.error}`);
    if (classScheduleDataValidation.expected) {
      errors.push(`  Expected: ${classScheduleDataValidation.expected}`);
      errors.push(`  Got: ${classScheduleDataValidation.got}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
};

