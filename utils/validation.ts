// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password requirements
const MIN_PASSWORD_LENGTH = 8;

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const validateEmail = (email: string): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validatePassword = (password: string): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push({ 
      field: 'password', 
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long` 
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validatePasswordConfirmation = (
  password: string,
  confirmPassword: string
): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Please confirm your password' });
  } else if (password !== confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateName = (name: string): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!name) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (name.length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters long' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateSignupForm = (
  name: string,
  email: string,
  password: string,
  confirmPassword: string
): ValidationResult => {
  const errors: ValidationError[] = [];

  // Validate each field
  const nameValidation = validateName(name);
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);
  const confirmPasswordValidation = validatePasswordConfirmation(password, confirmPassword);

  // Combine all errors
  errors.push(
    ...nameValidation.errors,
    ...emailValidation.errors,
    ...passwordValidation.errors,
    ...confirmPasswordValidation.errors
  );

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateLoginForm = (
  email: string,
  password: string
): ValidationResult => {
  const errors: ValidationError[] = [];

  // Validate each field
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);

  // Combine all errors
  errors.push(
    ...emailValidation.errors,
    ...passwordValidation.errors
  );

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export function validateTourName(name: string): string | null {
  if (!name.trim()) {
    return 'Tour name is required';
  }
  
  if (name.length < 3) {
    return 'Tour name must be at least 3 characters';
  }
  
  if (name.length > 100) {
    return 'Tour name must be less than 100 characters';
  }
  
  return null;
}

export function validateDate(date: string): string | null {
  if (!date.trim()) return null;
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return 'Date must be in YYYY-MM-DD format';
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return 'Invalid date';
  }

  return null;
}

export function validateTime(time: string): string | null {
  if (!time.trim()) return null;
  
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    return 'Time must be in HH:MM format';
  }

  return null;
}

export function validateMaxParticipants(value: string): string | null {
  if (!value.trim()) return null;
  
  const num = parseInt(value);
  if (isNaN(num) || num < 1) {
    return 'Maximum participants must be at least 1';
  }

  return null;
}

export function validatePrice(value: string): string | null {
  if (!value.trim()) return null;
  
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) {
    return 'Price must be a positive number';
  }

  return null;
}
