/**
 * Recordings Library Page
 * Browse, filter, and manage call recordings
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Library, Loader2, AlertCircle, Trash2, X } from 'lucide-react';
import { useRecordingsStore } from '../stores';
import { RecordingCard } from '../components/recordings/RecordingCard';
import { RecordingFilters } from '../components/recordings/RecordingFilters';
import Button from '../components/ui/Button';
import { cn } from '../utils/classnames';

const Recordings: React.FC = () => {
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  
  const {
    recordings = [],
    totalCount = 0,
    currentPage = 1,
    pageSize = 20,
    filters = {},
    sortBy = 'started_at',
    sortOrder = 'desc',
    isLoading = false,
    isDeleting = null,
    error = null,
    fetchRecordings,
    deleteRecording,
    setFilters,
    setSort,
    clearFilters,
    clearError,
  } = useRecordingsStore();

  // Load recordings on mount
  useEffect(() => {
    fetchRecordings(1);
  }, []);

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  // Handle recording click
  const handleRecordingClick = (recordingId: string) => {
    navigate(`/recordings/${recordingId}`);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!showDeleteModal) return;
    
    const success = await deleteRecording(showDeleteModal);
    if (success) {
      setShowDeleteModal(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Library className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Recordings Library</h1>
        </div>
        <p className="text-gray-600">
          Review your past training sessions and track your progress over time.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-rose-700">{error}</p>
          </div>
          <button
            onClick={clearError}
            className="text-rose-400 hover:text-rose-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6">
        <RecordingFilters
          filters={filters}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onFilterChange={setFilters}
          onSortChange={setSort}
          onClearFilters={clearFilters}
        />
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Showing <span className="font-medium">{totalCount > 0 ? startItem : 0}</span>
          {' '}-{' '}
          <span className="font-medium">{endItem}</span> of{' '}
          <span className="font-medium">{totalCount}</span> recordings
        </p>
      </div>

      {/* Recordings Grid */}
      {isLoading ? (
        <div className="space-y-4">
          {/* Skeleton Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-4 w-16 bg-gray-200 rounded"></div>
                  <div className="h-4 w-2 bg-gray-200 rounded"></div>
                  <div className="h-4 w-20 bg-gray-200 rounded"></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  <div className="h-8 w-12 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
          {/* Skeleton Pagination */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <div className="h-9 w-20 bg-gray-200 rounded-lg"></div>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 w-10 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-9 w-20 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      ) : !recordings || recordings.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Library className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {Object.keys(filters).some(k => !!filters[k as keyof typeof filters]) 
              ? 'No recordings match your filters'
              : 'No recordings yet'}
          </h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            {Object.keys(filters).some(k => !!filters[k as keyof typeof filters])
              ? 'Try adjusting your filters or clear them to see all recordings.'
              : 'Complete your first training simulation to see recordings here.'}
          </p>
          {Object.keys(filters).some(k => !!filters[k as keyof typeof filters]) && (
            <Button variant="secondary" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {recordings.map((recording) => (
              <RecordingCard
                key={recording.id}
                recording={recording}
                onClick={() => handleRecordingClick(recording.id)}
                onDelete={() => setShowDeleteModal(recording.id)}
                isDeleting={isDeleting === recording.id}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => fetchRecordings(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                className={cn(
                  'px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium',
                  'hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show window around current page
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => fetchRecordings(pageNum)}
                      disabled={isLoading}
                      className={cn(
                        'w-10 h-10 rounded-lg text-sm font-medium',
                        currentPage === pageNum
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => fetchRecordings(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
                className={cn(
                  'px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium',
                  'hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-100 rounded-full">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Recording</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this recording? This action cannot be undone and all associated data (transcripts, coaching, summary) will be permanently removed.
            </p>
            
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(null)}
                disabled={!!isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={!!isDeleting}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recordings;
