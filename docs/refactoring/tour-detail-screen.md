# Tour Detail Screen Refactoring Plan

## Current Issues
1. The `[tourId].tsx` file is over 600 lines long
2. Contains repeated UI patterns and styles
3. Business logic mixed with presentation
4. Similar components and styles exist across the codebase

## Proposed Component Structure

### 1. Shared Components
Create reusable components in `components/tour/`:

- `StatusBadge.tsx`: For displaying tour status (reusable across tour screens)
  - Already similar implementations in multiple files
  - Used in tour list, tour detail, and participant views
  - Should handle all status colors and text

- `TourMetrics.tsx`: For displaying tour statistics
  - Used in both active and completed states
  - Can handle different metric types (guests, duration, earnings, etc.)

- `TourHeader.tsx`: For the common header pattern
  - Back button
  - Title
  - Common styling

### 2. Tour Status Screens
Split the tour status views into separate components (already partially done):

- `GuideTourPendingView.tsx`
- `GuideTourActiveView.tsx`
- `GuideTourCompletedView.tsx`

### 3. Custom Hooks
Extract business logic into custom hooks:

- `useTourDuration.ts`: Handle duration calculations and updates
- `useTourStatistics.ts`: Handle fetching and managing tour statistics
- `useTourActions.ts`: Handle tour status updates and actions

## Implementation Steps

1. Create Shared Components
   - Extract `StatusBadge` component first as it's used most frequently
   - Create `TourMetrics` component for statistics display
   - Move common styles to theme configuration

2. Extract Business Logic
   - Move duration calculation logic to `useTourDuration` hook
   - Move statistics fetching to `useTourStatistics` hook
   - Move tour actions to `useTourActions` hook

3. Refactor Main Component
   - Keep main component focused on composition and routing
   - Use new shared components and hooks
   - Remove duplicate styles

4. Update Style Organization
   - Move common styles to theme configuration
   - Keep component-specific styles local
   - Use style composition for variants

## Benefits

1. Improved Maintainability
   - Smaller, focused components
   - Clear separation of concerns
   - Reusable patterns

2. Better Performance
   - Optimized re-renders
   - Shared components can be memoized
   - Cleaner prop drilling

3. Easier Testing
   - Isolated business logic
   - Smaller test surface area
   - Clear component boundaries

## Migration Strategy

1. Create new components without removing old code
2. Gradually migrate functionality to new components
3. Update existing usages one at a time
4. Remove old code once migration is complete
5. Add tests for new components and hooks

## File Structure

```
components/
  tour/
    StatusBadge.tsx
    TourMetrics.tsx
    TourHeader.tsx
    guide/
      GuideTourPendingView.tsx
      GuideTourActiveView.tsx
      GuideTourCompletedView.tsx
hooks/
  tour/
    useTourDuration.ts
    useTourStatistics.ts
    useTourActions.ts
```

## Next Steps

1. Start with `StatusBadge` component as it's the most commonly duplicated
2. Extract duration logic to custom hook
3. Create `TourMetrics` component
4. Gradually refactor main component to use new structure 