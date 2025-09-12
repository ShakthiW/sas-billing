import { useState, useEffect, useMemo, useCallback } from 'react';
import { Task, ColumnKey, SubTask } from '@/app/types';

interface SearchResult {
    job: Task;
    matchedFields: string[];
    matchedContent: string[];
}

interface UseUniversalSearchProps {
    jobs: Task[];
    onFilterChange?: (filteredJobs: Task[]) => void;
}

const statusLabels: Record<ColumnKey, string> = {
    todo: 'To Do',
    inProgress: 'In Progress',
    finished: 'Finished',
    delivered: 'Delivered',
};

// Debounce hook
const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

export const useUniversalSearch = ({ jobs, onFilterChange }: UseUniversalSearchProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchHistory, setSearchHistory] = useState<string[]>([]);

    // Debounce search query to reduce API calls and re-renders
    const debouncedSearchQuery = useDebounce(searchQuery, 150);

    // Track if we're waiting for debounced search
    const isSearching = searchQuery.trim().length > 0;
    const isLoading = searchQuery !== debouncedSearchQuery && isSearching;

    // Enhanced search function with better performance
    const searchResults = useMemo(() => {
        if (!debouncedSearchQuery.trim()) {
            return [];
        }

        const query = debouncedSearchQuery.toLowerCase();
        const results: SearchResult[] = [];

        // Use a more efficient search algorithm
        for (const job of jobs) {
            const matchedFields: string[] = [];
            const matchedContent: string[] = [];
            let relevanceScore = 0;

            // Search vehicle number (title) - highest priority
            if (job.title?.toLowerCase().includes(query)) {
                matchedFields.push('Vehicle Number');
                matchedContent.push(job.title);
                relevanceScore += 10;
            }

            // Search customer name - high priority
            if (job.customerName?.toLowerCase().includes(query)) {
                matchedFields.push('Customer Name');
                matchedContent.push(job.customerName);
                relevanceScore += 8;
            }

            // Search customer phone - high priority
            if (job.customerPhone?.toLowerCase().includes(query)) {
                matchedFields.push('Customer Phone');
                matchedContent.push(job.customerPhone);
                relevanceScore += 7;
            }

            // Search damage remarks - medium priority
            if ((job as any).damageRemarks?.toLowerCase().includes(query)) {
                matchedFields.push('Damage/Remarks');
                matchedContent.push((job as any).damageRemarks);
                relevanceScore += 5;
            }

            // Search subtasks - medium priority
            if (job.subTasks) {
                for (const subTask of job.subTasks) {
                    if (subTask.taskType === 'service' && subTask.serviceType?.toLowerCase().includes(query)) {
                        matchedFields.push('Service');
                        matchedContent.push(subTask.serviceType);
                        relevanceScore += 6;
                    }
                    if (subTask.taskType === 'parts') {
                        if (subTask.partsType?.toLowerCase().includes(query)) {
                            matchedFields.push('Parts');
                            matchedContent.push(subTask.partsType);
                            relevanceScore += 6;
                        }
                        if (subTask.partsBrand?.toLowerCase().includes(query)) {
                            matchedFields.push('Parts Brand');
                            matchedContent.push(subTask.partsBrand);
                            relevanceScore += 4;
                        }
                    }
                }
            }

            // Search status - lower priority
            const statusLabel = statusLabels[job.column as ColumnKey];
            if (statusLabel?.toLowerCase().includes(query)) {
                matchedFields.push('Status');
                matchedContent.push(statusLabel);
                relevanceScore += 3;
            }

            // If we found matches, add to results with relevance score
            if (matchedFields.length > 0) {
                results.push({
                    job: { ...job, relevanceScore } as Task & { relevanceScore: number },
                    matchedFields: [...new Set(matchedFields)],
                    matchedContent: [...new Set(matchedContent)],
                });
            }
        }

        // Sort by relevance score (highest first)
        return results.sort((a, b) => {
            const scoreA = (a.job as any).relevanceScore || 0;
            const scoreB = (b.job as any).relevanceScore || 0;
            return scoreB - scoreA;
        });
    }, [jobs, debouncedSearchQuery]);

    // Filter jobs based on search and notify parent
    const notifyFilterChange = useCallback(() => {
        if (onFilterChange) {
            const filteredJobs = debouncedSearchQuery.trim()
                ? searchResults.map((result: SearchResult) => result.job)
                : jobs;
            onFilterChange(filteredJobs);
        }
    }, [onFilterChange, debouncedSearchQuery, searchResults, jobs]);

    useEffect(() => {
        notifyFilterChange();
    }, [notifyFilterChange]);

    // Add to search history
    const addToHistory = useCallback((query: string) => {
        if (query.trim()) {
            setSearchHistory(prev => {
                if (!prev.includes(query)) {
                    return [query, ...prev.slice(0, 4)]; // Keep last 5 searches
                }
                return prev;
            });
        }
    }, []);

    // Clear search with history
    const clearSearch = useCallback(() => {
        if (searchQuery.trim()) {
            addToHistory(searchQuery);
        }
        setSearchQuery('');
    }, [searchQuery, addToHistory]);

    // Quick search presets
    const quickSearches = [
        { label: 'To Do Jobs', query: 'todo' },
        { label: 'In Progress', query: 'inProgress' },
        { label: 'Finished Jobs', query: 'finished' },
        { label: 'Oil Change', query: 'Oil Change' },
        { label: 'Tire Services', query: 'Tires' },
        { label: 'Brake Service', query: 'Brake' },
        { label: 'Battery', query: 'Battery' },
    ];

    return {
        searchQuery,
        setSearchQuery,
        searchResults,
        searchHistory,
        clearSearch,
        quickSearches,
        addToHistory,
        resultCount: searchResults.length,
        hasResults: searchResults.length > 0,
        isSearching: debouncedSearchQuery.trim().length > 0,
        isLoading,
    };
};

export default useUniversalSearch;
