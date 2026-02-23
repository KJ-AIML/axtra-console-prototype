/**
 * Recording Filters Component
 * Filter and sort controls for recordings list
 */

import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/classnames';
import type { RecordingFilters as RecordingFiltersType } from '../../lib/api-types';

interface RecordingFiltersProps {
  filters: RecordingFiltersType;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onFilterChange: (filters: Partial<RecordingFiltersType>) => void;
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onClearFilters: () => void;
}

const difficultyOptions = [
  { value: '', label: 'All Difficulties' },
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
];

const sortOptions = [
  { value: 'started_at', label: 'Date' },
  { value: 'final_score', label: 'Score' },
  { value: 'duration_seconds', label: 'Duration' },
  { value: 'total_turns', label: 'Turns' },
];

export const RecordingFilters: React.FC<RecordingFiltersProps> = ({
  filters,
  sortBy,
  sortOrder,
  onFilterChange,
  onSortChange,
  onClearFilters,
}) => {
  const [searchQuery, setSearchQuery] = useState(filters.search || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => {
      onFilterChange({ search: searchQuery || undefined });
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, onFilterChange]);

  const hasActiveFilters =
    filters.difficulty ||
    filters.min_score !== undefined ||
    filters.max_score !== undefined ||
    filters.date_from ||
    filters.date_to ||
    filters.search;

  return (
    <div className="space-y-4">
      {/* Search and Main Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search scenarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              'placeholder:text-gray-400'
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Difficulty Dropdown */}
        <div className="relative">
          <select
            value={filters.difficulty || ''}
            onChange={(e) => onFilterChange({ difficulty: e.target.value || undefined })}
            className={cn(
              'appearance-none w-full sm:w-40 pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              'cursor-pointer'
            )}
          >
            {difficultyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value, sortOrder)}
            className={cn(
              'appearance-none w-full sm:w-36 pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
              'cursor-pointer'
            )}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Sort by {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Sort Order Toggle */}
        <button
          onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
          className={cn(
            'px-3 py-2 bg-white border border-gray-200 rounded-lg',
            'hover:bg-gray-50 transition-colors',
            'flex items-center justify-center'
          )}
          title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        >
          <span className={cn(
            'text-sm font-medium',
            sortOrder === 'asc' ? 'rotate-0' : 'rotate-180'
          )}>
            {sortOrder === 'asc' ? '↑' : '↓'}
          </span>
        </button>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            'px-3 py-2 bg-white border rounded-lg flex items-center justify-center gap-2',
            showAdvanced || hasActiveFilters
              ? 'border-indigo-300 text-indigo-600 bg-indigo-50'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline text-sm font-medium">Filters</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-indigo-600 rounded-full" />
          )}
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearchQuery('');
              onClearFilters();
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">From Date</label>
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => onFilterChange({ date_from: e.target.value || undefined })}
                className={cn(
                  'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                )}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">To Date</label>
              <input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => onFilterChange({ date_to: e.target.value || undefined })}
                className={cn(
                  'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                )}
              />
            </div>

            {/* Score Range */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Min Score</label>
              <input
                type="number"
                min={0}
                max={100}
                placeholder="0"
                value={filters.min_score ?? ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined;
                  onFilterChange({ min_score: value });
                }}
                className={cn(
                  'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                )}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Max Score</label>
              <input
                type="number"
                min={0}
                max={100}
                placeholder="100"
                value={filters.max_score ?? ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined;
                  onFilterChange({ max_score: value });
                }}
                className={cn(
                  'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                )}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
