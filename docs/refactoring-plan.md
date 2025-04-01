# Refactoring Plan for [code].tsx

## Current Issues
1. File is over 500 lines long, making it difficult to maintain
2. Multiple concerns mixed together (UI, payment handling, tour state management)
3. Complex state management with multiple useEffects
4. Duplicate code in payment handling logic
5. Large style object at the bottom of the file

## Simplified Refactoring Structure

### 1. Component Separation
Create only essential components that are truly reusable:
- `TourStatusBadge` - Used across all tour states
- `TourPaymentSection` - Handles all payment-related UI and logic

### 2. Custom Hooks
Extract complex business logic:
- `useTourPayment` - Handle payment sheet initialization and processing
  - This is the most complex piece of logic that's duplicated
  - Can be reused in other parts of the app if needed
- `useTourState` - Handle tour fetching and real-time updates
  - This will help reduce the main file size
  - Contains the complex useEffect logic for tour state management

### 3. Styles Organization
Move only shared styles to a separate file:
- `styles/tour.styles.ts` - Contains only the shared styles used across components

## Implementation Steps

1. **Phase 1: Extract Payment Logic**
   - Create `useTourPayment` hook
   - Move payment-related styles to shared styles
   - This is the most isolated piece that can be safely extracted

2. **Phase 2: Extract TourStatusBadge**
   - Create reusable status badge component
   - Move related styles
   - This is a simple UI component that's used consistently

3. **Phase 3: Extract Tour State Management**
   - Create `useTourState` hook
   - Move tour fetching and real-time update logic
   - This will significantly reduce the main file size

4. **Phase 4: Clean Up Main File**
   - Remove extracted code
   - Update imports
   - Main file should now be focused on rendering logic

## New File Structure
```
app/
  (tour)/
    [code].tsx
    components/
      TourStatusBadge.tsx
      TourPaymentSection.tsx
    hooks/
      useTourPayment.ts
      useTourState.ts
    styles/
      tour.styles.ts
```

## Expected Line Counts After Refactoring
- Main file (`[code].tsx`): ~250 lines
  - Component rendering logic: ~150 lines
  - Remaining styles: ~100 lines
- `useTourPayment.ts`: ~50 lines
- `useTourState.ts`: ~50 lines
- `TourStatusBadge.tsx`: ~30 lines
- `TourPaymentSection.tsx`: ~40 lines
- `tour.styles.ts`: ~100 lines

## Benefits
1. Maintains exact same functionality
2. Reduces main file size to under 300 lines
3. Creates reusable components only where it makes sense
4. Keeps related code together where it belongs
5. Simpler file structure
6. Each file has a single responsibility

## Risks and Mitigations
1. **Risk**: Breaking existing functionality
   - **Mitigation**: Extract only isolated pieces (payment logic first)
2. **Risk**: Over-engineering
   - **Mitigation**: Only extract what's truly reusable or duplicated
3. **Risk**: State management complexity
   - **Mitigation**: Keep state management in a single hook

## Next Steps
1. Extract payment logic to `useTourPayment` hook
2. Create `TourStatusBadge` component
3. Extract tour state management to `useTourState` hook
4. Move shared styles
5. Test thoroughly to ensure exact same functionality 