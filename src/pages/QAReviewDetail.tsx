/**
 * QA Review Detail Page
 * Review a specific call with audio player, AI results, and human scoring
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Clock, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { useQAStore, useRecordingsStore, showSuccess, showError } from '../stores';
import { cn } from '../utils/classnames';
import Button from '../components/ui/Button';
import { apiClient } from '../lib/api-client';
import AIQAResult from '../components/qa/AIQAResult';
import HumanQAForm from '../components/qa/HumanQAForm';
import QAScoreComparison from '../components/qa/QAScoreComparison';
import TimestampedComments from '../components/qa/TimestampedComments';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const QAReviewDetail: React.FC = () => {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  
  // QA Store
  const {
    selectedQAData,
    isLoadingQA,
    qaError,
    criteria,
    humanScores,
    humanComments,
    generalFeedback,
    timestampedComments,
    fetchQAData,
    setHumanScore,
    setHumanComment,
    setGeneralFeedback,
    addTimestampedComment,
    removeTimestampedComment,
    submitReview,
    resetForm,
  } = useQAStore();

  // Recordings store for audio
  const { selectedRecording, fetchRecordingDetail } = useRecordingsStore();

  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Fetch audio blob with auth
  const fetchAudio = useCallback(async (recordingId: string) => {
    setIsLoadingAudio(true);
    try {
      const response = await apiClient.get(`/recordings/${recordingId}/audio?channel=operator`, {
        responseType: 'blob'
      });
      const blob = response as unknown as Blob;
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (error: any) {
      // Silently handle 404 (audio not available) - don't show error toast
      if (error?.status === 404) {
        console.log('Audio not available for this recording');
      } else {
        console.error('Failed to load audio:', error);
        showError('Failed to load audio recording');
      }
    } finally {
      setIsLoadingAudio(false);
    }
  }, []);

  // Fetch data on mount
  useEffect(() => {
    if (callId) {
      fetchQAData(callId);
      fetchRecordingDetail(callId);
      fetchAudio(callId);
    }
    
    return () => {
      resetForm();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [callId, fetchQAData, fetchRecordingDetail, resetForm, fetchAudio]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [selectedRecording?.operator_track_url]);

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleSubmit = async (status: 'draft' | 'submitted') => {
    if (!callId) return;
    
    setIsSubmitting(true);
    const success = await submitReview(callId, status);
    setIsSubmitting(false);
    
    if (success) {
      showSuccess(status === 'submitted' ? 'Review submitted successfully' : 'Draft saved');
      if (status === 'submitted') {
        navigate('/qa-scoring');
      }
    } else {
      showError('Failed to submit review');
    }
  };

  if (isLoadingQA) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-gray-500">Loading QA data...</p>
        </div>
      </div>
    );
  }

  if (qaError || !selectedQAData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Failed to load QA data</h3>
          <p className="text-gray-500 mb-4">{qaError || 'Unknown error'}</p>
          <button
            onClick={() => callId && fetchQAData(callId)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { ai_qa, human_qa, comparison } = selectedQAData;
  const isSubmitted = human_qa?.status === 'submitted';

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/qa-scoring')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">QA Review</h1>
            <p className="text-gray-500">
              {selectedRecording?.scenario_title || 'Call Review'}
            </p>
          </div>
        </div>
        
        {isSubmitted && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Review Submitted</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Audio & AI Results */}
        <div className="space-y-6">
          {/* Audio Player */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Call Recording
            </h3>
            
            {isLoadingAudio ? (
              <div className="text-center py-8 text-gray-400">
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                <p>Loading audio...</p>
              </div>
            ) : audioUrl ? (
              <>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  className="hidden"
                />
                
                {/* Controls */}
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between mt-1 text-sm text-gray-500">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <FileText className="w-8 h-8 mx-auto mb-2" />
                <p>Audio not available</p>
              </div>
            )}

            {/* Timestamped Comments */}
            <TimestampedComments
              comments={timestampedComments}
              currentTime={currentTime}
              duration={duration}
              onAddComment={addTimestampedComment}
              onRemoveComment={removeTimestampedComment}
              onSeekTo={(time) => {
                if (audioRef.current) {
                  audioRef.current.currentTime = time;
                  setCurrentTime(time);
                }
              }}
              readOnly={isSubmitted}
            />
          </div>

          {/* AI QA Results */}
          {ai_qa && <AIQAResult aiQA={ai_qa} />}
        </div>

        {/* Right Column - Human Scoring & Comparison */}
        <div className="space-y-6">
          {/* Score Comparison (if human review exists) */}
          {comparison && (
            <QAScoreComparison
              aiOverall={comparison.ai_overall}
              humanOverall={comparison.human_overall}
              difference={comparison.difference}
              variance={comparison.variance}
            />
          )}

          {/* Human QA Form */}
          <HumanQAForm
            criteria={criteria}
            aiScores={ai_qa?.criteria_scores || []}
            humanScores={humanScores}
            humanComments={humanComments}
            generalFeedback={generalFeedback}
            onScoreChange={setHumanScore}
            onCommentChange={setHumanComment}
            onGeneralFeedbackChange={setGeneralFeedback}
            onSubmit={handleSubmit}
            onReset={resetForm}
            isSubmitting={isSubmitting}
            existingReview={human_qa ? {
              overall_score: human_qa.overall_score,
              status: human_qa.status
            } : null}
          />
        </div>
      </div>
    </div>
  );
};

export default QAReviewDetail;
