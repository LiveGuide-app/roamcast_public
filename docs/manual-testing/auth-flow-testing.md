# Authentication Flow Manual Testing Guide

## Overview
This document outlines the manual testing scenarios for the Roamcast authentication flow, including login, signup, and password reset flows. Each scenario should be tested on both iOS and Android platforms.

## Test Environment Setup
- Clean install of the app
- Clear cache and storage if testing on existing install
- Ensure good network connectivity
- Have test account credentials ready

## 1. Landing Page Navigation
### UI Elements
- [x] Verify "Log in to your account" link is visible at the bottom
- [o] Verify status bar is visible and readable
  - iOS: White text on primary color background - corrected only after rebuuild
  - Android: White text on primary color background - Working

### Navigation
- [x] Tap "Log in to your account" -> Should navigate to login screen
- [x] Verify back navigation works from login screen

## 2. Login Form Validation

### Empty Fields Validation
- [x] Tap "Sign In" with empty email and password
  - Expected: Both fields should show error messages
- [x] Tap "Sign In" with only email filled
  - Expected: Password field should show error message
- [x] Tap "Sign In" with only password filled
  - Expected: Email field should show error message

### Email Validation
- [x] Enter invalid email formats:
  - `test` -> Should show format error
  - `test@` -> Should show format error
  - `test@test` -> Should show format error
  - `test@test.` -> Should show format error
  - `@test.com` -> Should show format error
- [ ] Enter valid email format:
  - `test@test.com` -> Should not show format error

### Password Validation
- [x] Enter short password (if minimum length requirement exists)
  - Expected: Should show minimum length error
- [x] Enter valid password length
  - Expected: Should not show length error

### Error Message Behavior
- [x] Verify error messages are clearly visible
- [x] Verify error messages clear when typing in the respective field
- [x] Verify error styling (red border, error text) is applied correctly

## 3. Login Scenarios

### Successful Login
- [ ] Enter valid credentials
  - Verify loading spinner appears
  - Verify successful navigation to tours page
  - Verify session persistence (app remembers login)

### Failed Login Attempts
- [ ] Wrong password for existing email
  - Expected: Clear error message about invalid credentials
  - Verify can try again immediately
- [ ] Non-existent email
  - Expected: Same error message (don't reveal if email exists)
  - Verify can try again immediately
- [ ] Multiple rapid login attempts
  - Verify no unexpected behavior or crashes

### Network Scenarios
- [ ] Login with no internet connection
  - Expected: Clear error message about network
- [ ] Login when internet connection is slow
  - Verify loading state handles slow response
  - Verify no timeout issues
- [ ] Login when internet drops during request
  - Expected: Clear error message about network failure

## 4. Navigation Flow

### Sign Up Flow
- [ ] Tap "Don't have an account? Sign up"
  - Verify navigation to sign up screen
  - Verify can go back to login screen
  - Verify form state is reset when returning

### Password Recovery Flow
- [ ] Tap "Forgot password?"
  - Verify navigation to password recovery screen
  - Verify can go back to login screen
  - Verify form state is reset when returning

### Post-Login Navigation
- [ ] After successful login:
  - Verify cannot go back to login screen
  - Verify app state is correct (tours page loads properly)

## 5. Sign Up Flow Testing

### Sign Up Form Validation
- [ ] Verify all required fields:
  - Email
  - Password
  - Confirm Password
  - Full Name (if required)
- [ ] Test empty field validation for all fields
- [ ] Test password matching validation
- [ ] Test password strength requirements
- [ ] Test email format validation

### Sign Up Process
- [ ] Successful sign up with valid data
  - Verify confirmation email is sent
  - Verify redirect to appropriate screen
  - Verify user can login with new credentials
- [ ] Sign up with existing email
  - Verify appropriate error message
  - Verify user data is not exposed
- [ ] Sign up with invalid data
  - Verify validation messages
  - Verify form state preservation

### Sign Up Edge Cases
- [ ] Network issues during sign up
- [ ] Multiple rapid sign up attempts
- [ ] Navigation during sign up process
- [ ] Form state after failed attempts

## 6. Password Reset Flow Testing

### Reset Request
- [ ] Initiate password reset
  - Verify email input validation
  - Verify confirmation message
  - Verify email delivery
- [ ] Request for non-existent email
  - Verify same behavior as existing email
  - Verify no user data exposure
- [ ] Multiple reset requests
  - Verify rate limiting if applicable
  - Verify previous links invalidation

### Reset Link Validation
- [ ] Valid reset link
  - Verify proper navigation
  - Verify token validation
  - Verify expiration handling
- [ ] Expired reset link
  - Verify clear error message
  - Verify user guidance
- [ ] Invalid/tampered reset link
  - Verify security measures
  - Verify error handling

### New Password Setup
- [ ] Password requirements validation
  - Minimum length
  - Character requirements
  - Password strength indicators
- [ ] Password confirmation matching
- [ ] Success flow
  - Verify confirmation message
  - Verify automatic login if applicable
  - Verify old password invalidation
- [ ] Error handling
  - Network errors
  - Validation errors
  - Server errors

### Edge Cases
- [ ] Multiple password resets in succession
- [ ] Reset attempt from different device
- [ ] Reset during active session
- [ ] Network interruption during reset
- [ ] Browser/app navigation during reset

## 7. Security Testing

### Rate Limiting
- [ ] Login attempts
- [ ] Password reset requests
- [ ] Sign up attempts
- [ ] Verification email requests

### Session Management
- [ ] Token refresh mechanism
- [ ] Session timeout handling
- [ ] Concurrent login handling
- [ ] Device-specific session handling

### Data Protection
- [ ] Password hashing verification
- [ ] Sensitive data exposure check
- [ ] Error message information leakage
- [ ] Network request security

## Test Results Documentation

For each failed test:
1. Document the exact steps to reproduce
2. Note the expected vs actual behavior
3. Include relevant device/OS information
4. Take screenshots if applicable
5. Note any error messages

## Notes
- Document any unclear error messages
- Note any inconsistencies between platforms
- Document any performance issues
- Note any UI/UX concerns
- Document any security concerns
- Note any rate limiting issues
- Document email delivery reliability
- Track any session management issues 