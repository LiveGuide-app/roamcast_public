# Guide Profile Screen Refactoring Guide

This document outlines the step-by-step process for refactoring the Guide Profile screen to improve code organization, maintainability, and testability.

## Current Issues
- File is over 400 lines long (exceeding our 200-300 line guideline)
- Multiple responsibilities in a single component
- Complex state management spread throughout the component
- Tightly coupled functionality making testing difficult

## Refactoring Steps

### 1. Create New Directory Structure
```
app/(guide)/(tabs)/profile/
├── components/
│   ├── ProfileHeader.tsx
│   ├── PaymentSettings.tsx
│   ├── RecommendationsForm.tsx
│   ├── ProfileSettings.tsx
│   └── FAQ.tsx
├── hooks/
│   ├── useProfileImage.tsx
│   ├── useStripeIntegration.tsx
│   └── useProfileData.tsx
└── index.tsx
```

### 2. Extract Components

#### a. ProfileHeader Component
- Move avatar, name, and ratings display
- Extract image upload logic to `useProfileImage` hook
- Component will receive profile data as props

#### b. PaymentSettings Component
- Move Stripe integration UI and logic
- Extract Stripe functions to `useStripeIntegration` hook
- Handle loading states internally

#### c. RecommendationsForm Component
- Move recommendations form and related state
- Keep form logic self-contained

#### d. ProfileSettings Component
- Move password/email change UI
- Handle settings-related functionality

#### e. FAQ Component
- Move FAQ section (currently empty)
- Prepare for future FAQ content

### 3. Create Custom Hooks

#### a. useProfileData Hook
```typescript
// Responsibilities:
- Fetch user profile data
- Handle loading states
- Manage profile updates
- Handle errors
```

#### b. useProfileImage Hook
```typescript
// Responsibilities:
- Handle image picker
- Manage image upload
- Update profile image URL
- Handle upload states and errors
```

#### c. useStripeIntegration Hook
```typescript
// Responsibilities:
- Handle Stripe onboarding
- Manage dashboard access
- Track account status
- Handle Stripe-related errors
```

### 4. Refactor Main Profile Page
- Convert to a composition of components
- Move state management to hooks
- Keep only layout and composition logic

### 5. Testing Strategy
1. Create unit tests for each hook
2. Create component tests for each extracted component
3. Create integration test for the main profile page

### 6. Migration Plan
1. Create new directory structure
2. Extract hooks first (they contain core logic)
3. Create components one at a time
4. Update main profile page last
5. Add tests for each new piece
6. Remove old profile page code

## Notes
- Keep existing functionality exactly the same
- Maintain current styling and theme usage
- Preserve all error handling
- Keep current authentication integration

## Validation Steps
After refactoring, ensure:
1. All existing functionality works as before
2. No regression in user experience
3. All error states are properly handled
4. Performance remains the same or improves
5. Tests pass and provide good coverage 