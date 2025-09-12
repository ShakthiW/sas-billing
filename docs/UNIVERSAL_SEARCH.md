# Universal Search Feature - SAS Billing System

## Overview

The Universal Search feature provides a comprehensive search functionality for the dashboard that allows users to quickly find jobs across all columns of the Kanban board.

## Features

### 🔍 Search Capabilities

- **Vehicle Numbers**: Search by vehicle registration numbers
- **Customer Information**: Search by customer names and phone numbers
- **Service Details**: Search within service types (Oil Change, Brake Service, etc.)
- **Parts Information**: Search by parts types and brands
- **Damage Remarks**: Search within damage notes and remarks
- **Job Status**: Filter by job status (To Do, In Progress, Finished, Delivered)

### ⌨️ Keyboard Shortcuts

- **Ctrl+K** (Windows) or **Cmd+K** (Mac): Focus the search input

### 🎯 Smart Features

- **Real-time search**: Results update as you type
- **Highlighting**: Search terms are highlighted in results
- **Relevance scoring**: Results are sorted by relevance
- **Auto-filtering**: Kanban board automatically filters to show matching jobs
- **Job navigation**: Click on search results to highlight the job card

## How to Use

### Basic Search

1. Click on the search input field at the top of the dashboard
2. Type your search query (vehicle number, customer name, service type, etc.)
3. View instant results in the dropdown
4. Click on any result to highlight the corresponding job card
5. The Kanban board will automatically filter to show only matching jobs

### Keyboard Navigation

1. Press **Ctrl+K** (or **Cmd+K** on Mac) to quickly focus the search input
2. Type your search query
3. Use the mouse to click on results

### Search Examples

- `"ABC 1234"` - Find vehicle with registration ABC 1234
- `"John Smith"` - Find all jobs for customer John Smith
- `"Oil Change"` - Find all jobs with oil change services
- `"Tires"` - Find all jobs involving tire services
- `"In Progress"` - Filter jobs currently in progress
- `"Brake"` - Find all brake-related services

## Technical Implementation

### Components

- `UniversalSearch.tsx` - Main search component
- `KanbanBoard.tsx` - Updated to integrate search functionality
- `useUniversalSearch.ts` - Custom hook for search logic (available for future enhancements)

### Data Sources

The search function scans through:

- Job titles (vehicle numbers)
- Customer names and phone numbers
- Subtask service types
- Parts types and brands
- Damage remarks
- Job status information

### Performance Features

- Debounced search input to prevent excessive API calls
- Efficient search algorithm with relevance scoring
- Memoized search results to prevent unnecessary re-renders
- Optimized filtering to maintain Kanban board performance

## Search Algorithm

The search uses a weighted relevance scoring system:

1. **Vehicle Number**: Highest priority (10 points)
2. **Customer Name**: High priority (8 points)
3. **Customer Phone**: High priority (7 points)
4. **Service Types**: Medium priority (6 points)
5. **Parts Types**: Medium priority (6 points)
6. **Damage Remarks**: Medium priority (5 points)
7. **Parts Brands**: Lower priority (4 points)
8. **Job Status**: Lowest priority (3 points)

Results are automatically sorted by relevance score to show the most relevant matches first.

## Future Enhancements

Potential improvements that could be added:

- Advanced search dialog with category filters
- Search history functionality
- Saved search queries
- Export search results
- Search analytics and insights
- Voice search capabilities
- Fuzzy search for typo tolerance

## Troubleshooting

### Common Issues

1. **Search not working**: Ensure JavaScript is enabled and the page has fully loaded
2. **No results found**: Try broader search terms or check spelling
3. **Performance issues**: Clear the search field to reset the view

### Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Development Notes

The search feature is built with:

- React functional components with hooks
- TypeScript for type safety
- Optimized re-rendering with useCallback and useMemo
- Responsive design for mobile and desktop
- Accessible keyboard navigation

The implementation prioritizes:

- Performance and speed
- User experience
- Data accuracy
- Mobile responsiveness
- Accessibility standards
