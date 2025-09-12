import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, X, User, Phone, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Task, ColumnKey } from '@/app/types';

interface SearchResult {
    job: Task;
    matchedFields: string[];
    matchedContent: string[];
}

interface UniversalSearchProps {
    jobs: Task[];
    onJobSelect?: (job: Task) => void;
    onFilterChange?: (filteredJobs: Task[]) => void;
}

const UniversalSearch: React.FC<UniversalSearchProps> = ({
    jobs,
    onJobSelect,
    onFilterChange
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);

    // Status labels for display - wrapped in useMemo to prevent re-creation on every render
    const statusLabels = useMemo(() => ({
        todo: 'To Do',
        inProgress: 'In Progress',
        finished: 'Finished',
        delivered: 'Delivered',
    } as Record<ColumnKey, string>), []);

    // Keyboard shortcut to focus search (Ctrl+K or Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                inputRef?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [inputRef]);

    // Enhanced search function using useMemo to prevent unnecessary re-computations
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) {
            return [];
        }

        const query = searchQuery.toLowerCase();
        const results: SearchResult[] = [];

        jobs.forEach((job) => {
            const matchedFields: string[] = [];
            const matchedContent: string[] = [];

            // Search vehicle number (title)
            if (job.title?.toLowerCase().includes(query)) {
                matchedFields.push('Vehicle Number');
                matchedContent.push(job.title);
            }

            // Search customer name
            if (job.customerName?.toLowerCase().includes(query)) {
                matchedFields.push('Customer Name');
                matchedContent.push(job.customerName);
            }

            // Search customer phone
            if (job.customerPhone?.toLowerCase().includes(query)) {
                matchedFields.push('Customer Phone');
                matchedContent.push(job.customerPhone);
            }

            // Search damage remarks
            if ((job as any).damageRemarks?.toLowerCase().includes(query)) {
                matchedFields.push('Damage/Remarks');
                matchedContent.push((job as any).damageRemarks);
            }

            // Search subtasks
            if (job.subTasks) {
                job.subTasks.forEach((subTask: any) => {
                    if (subTask.taskType === 'service' && subTask.serviceType?.toLowerCase().includes(query)) {
                        matchedFields.push('Service');
                        matchedContent.push(subTask.serviceType);
                    }
                    if (subTask.taskType === 'parts') {
                        if (subTask.partsType?.toLowerCase().includes(query)) {
                            matchedFields.push('Parts');
                            matchedContent.push(subTask.partsType);
                        }
                        if (subTask.partsBrand?.toLowerCase().includes(query)) {
                            matchedFields.push('Parts Brand');
                            matchedContent.push(subTask.partsBrand);
                        }
                    }
                });
            }

            // Search status
            const statusLabel = statusLabels[job.column as ColumnKey];
            if (statusLabel?.toLowerCase().includes(query)) {
                matchedFields.push('Status');
                matchedContent.push(statusLabel);
            }

            // If we found matches, add to results
            if (matchedFields.length > 0) {
                results.push({
                    job,
                    matchedFields: [...new Set(matchedFields)],
                    matchedContent: [...new Set(matchedContent)],
                });
            }
        });

        return results;
    }, [searchQuery, jobs, statusLabels]);

    // Effect to notify parent of filtered jobs (separate from search computation)
    const notifyFilterChange = useCallback(() => {
        if (onFilterChange) {
            if (!searchQuery.trim()) {
                onFilterChange(jobs);
            } else {
                const filteredJobs = searchResults.map(result => result.job);
                onFilterChange(filteredJobs);
            }
        }
    }, [onFilterChange, searchQuery, searchResults, jobs]);

    useEffect(() => {
        notifyFilterChange();
    }, [notifyFilterChange]);

    const handleJobSelect = useCallback((job: Task) => {
        if (onJobSelect) {
            onJobSelect(job);
        }
    }, [onJobSelect]);

    const getStatusColor = useCallback((status: string) => {
        switch (status) {
            case 'todo': return 'bg-gray-100 text-gray-800';
            case 'inProgress': return 'bg-blue-100 text-blue-800';
            case 'finished': return 'bg-green-100 text-green-800';
            case 'delivered': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }, []);

    const highlightMatch = useCallback((text: string, query: string) => {
        if (!query.trim()) return text;

        const regex = new RegExp(`(${query})`, 'gi');
        const parts = text.split(regex);

        return parts.map((part, index) =>
            regex.test(part) ? (
                <span key={index} className="bg-yellow-200 font-semibold">
                    {part}
                </span>
            ) : part
        );
    }, []);

    const clearSearch = useCallback(() => {
        setSearchQuery('');
    }, []);

    const isSearching = searchQuery.trim().length > 0;
    const hasResults = searchResults.length > 0;

    return (
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    ref={setInputRef}
                    type="text"
                    placeholder="Search jobs, customers, services, parts... (Ctrl+K)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 w-full"
                />
                {searchQuery && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSearch}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Search Results Dropdown */}
            {isSearching && hasResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-2">
                            <div className="text-sm text-gray-600 mb-2 px-2 flex items-center gap-2">
                                <TrendingUp className="h-3 w-3" />
                                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                            </div>
                            {searchResults.map((result, index) => (
                                <div
                                    key={result.job.id}
                                    className="p-3 hover:bg-gray-50 cursor-pointer rounded-lg border-b last:border-b-0"
                                    onClick={() => handleJobSelect(result.job)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-gray-900">
                                                    {highlightMatch(result.job.title || '', searchQuery)}
                                                </span>
                                                <Badge className={getStatusColor(result.job.column)}>
                                                    {statusLabels[result.job.column as ColumnKey]}
                                                </Badge>
                                            </div>

                                            {result.job.customerName && (
                                                <div className="text-sm text-gray-600 mb-1">
                                                    <User className="inline w-3 h-3 mr-1" />
                                                    {highlightMatch(result.job.customerName, searchQuery)}
                                                </div>
                                            )}

                                            {result.job.customerPhone && (
                                                <div className="text-sm text-gray-600 mb-1">
                                                    <Phone className="inline w-3 h-3 mr-1" />
                                                    {highlightMatch(result.job.customerPhone, searchQuery)}
                                                </div>
                                            )}

                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {result.matchedFields.map((field) => (
                                                    <Badge key={field} variant="outline" className="text-xs">
                                                        {field}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="text-xs text-gray-500 ml-4">
                                            <div>{result.job.subTasksCompleted}/{result.job.totalSubTasks} tasks</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}

            {/* No Results Message */}
            {isSearching && !hasResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-50 p-4 text-center">
                    <div className="text-gray-500">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No jobs found matching "{searchQuery}"</p>
                        <p className="text-sm mt-1">Try searching for vehicle numbers, customer names, or services</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UniversalSearch;
