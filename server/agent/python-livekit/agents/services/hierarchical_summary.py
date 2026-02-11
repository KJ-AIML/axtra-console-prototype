"""
Hierarchical Summarization Service
Handles long calls (>10 min) with section-based processing
"""

import os
from typing import List, Dict, Any
from dataclasses import dataclass

from agents.workflow.summary_build import get_call_summary_workflow
from agents.schemas.call_summary_types import CallSummaryOutput

DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"


@dataclass
class CallSection:
    """A section of a call (opening, middle, closing)"""
    name: str
    start_time: int  # seconds
    end_time: int
    transcripts: List[Dict]
    summary: Dict = None


class HierarchicalSummarizer:
    """
    Handle long calls with hierarchical summarization
    
    Strategy:
    - Short calls (< 10 min): Process directly
    - Medium calls (10-30 min): Divide into 3 sections (opening, middle, closing)
    - Long calls (30+ min): Time-based chunking → section summaries → final aggregation
    """
    
    def __init__(self):
        self.workflow = get_call_summary_workflow()
        self.short_threshold = 10 * 60  # 10 minutes
        self.medium_threshold = 30 * 60  # 30 minutes
        self.chunk_size = 10 * 60  # 10 minutes per chunk
    
    def summarize(self, call_data: Dict) -> CallSummaryOutput:
        """
        Main entry point - route to appropriate processing strategy
        
        Args:
            call_data: {
                'call_id': str,
                'duration_seconds': int,
                'total_turns': int,
                'customer_sentiment': str,
                'scenario_type': str,
                'transcripts': List[dict],
                'coaching_history': List[dict]
            }
        
        Returns:
            CallSummaryOutput with final aggregated summary
        """
        duration = call_data.get('duration_seconds', 0)
        
        if DEBUG_MODE:
            print(f"\n[HierarchicalSummary] Duration: {duration}s ({duration//60}min)")
        
        if duration <= self.short_threshold:
            # Short call: process directly
            if DEBUG_MODE:
                print("[HierarchicalSummary] Strategy: Direct processing (short call)")
            return self._process_short_call(call_data)
            
        elif duration <= self.medium_threshold:
            # Medium call: section-based processing
            if DEBUG_MODE:
                print("[HierarchicalSummary] Strategy: Section-based (medium call)")
            return self._process_medium_call(call_data)
            
        else:
            # Long call: hierarchical processing
            if DEBUG_MODE:
                print("[HierarchicalSummary] Strategy: Hierarchical (long call)")
            return self._process_long_call(call_data)
    
    def _process_short_call(self, call_data: Dict) -> CallSummaryOutput:
        """Process short call directly through workflow"""
        state = self._create_state(call_data)
        result = self.workflow.invoke(state)
        
        summary_dict = result.get("call_summary", {})
        return CallSummaryOutput(**summary_dict)
    
    def _process_medium_call(self, call_data: Dict) -> CallSummaryOutput:
        """
        Process medium call with section detection
        Divide into: Opening (30%), Middle (40%), Closing (30%)
        """
        transcripts = call_data['transcripts']
        duration = call_data['duration_seconds']
        
        if len(transcripts) < 6:
            # Not enough messages for sectioning, process directly
            return self._process_short_call(call_data)
        
        # Divide into 3 sections based on message count
        # Opening: first 30%, Middle: middle 40%, Closing: last 30%
        n = len(transcripts)
        opening_end = max(2, int(n * 0.3))
        closing_start = min(n - 2, int(n * 0.7))
        
        sections = [
            CallSection(
                name="opening",
                start_time=0,
                end_time=int(duration * 0.3),
                transcripts=transcripts[:opening_end]
            ),
            CallSection(
                name="middle",
                start_time=int(duration * 0.3),
                end_time=int(duration * 0.7),
                transcripts=transcripts[opening_end:closing_start]
            ),
            CallSection(
                name="closing",
                start_time=int(duration * 0.7),
                end_time=duration,
                transcripts=transcripts[closing_start:]
            ),
        ]
        
        if DEBUG_MODE:
            print(f"[HierarchicalSummary] Sections:")
            for s in sections:
                print(f"  - {s.name}: {len(s.transcripts)} messages ({s.start_time}s - {s.end_time}s)")
        
        # Summarize each section
        section_summaries = []
        for section in sections:
            section_data = {
                **call_data,
                'transcripts': section.transcripts,
                'duration_seconds': section.end_time - section.start_time,
            }
            state = self._create_state(section_data)
            result = self.workflow.invoke(state)
            section.summary = result.get("call_summary", {})
            section_summaries.append(section.summary)
        
        # Aggregate section summaries into final summary
        return self._aggregate_section_summaries(
            sections, 
            call_data,
            section_summaries
        )
    
    def _process_long_call(self, call_data: Dict) -> CallSummaryOutput:
        """
        Process long call with hierarchical summarization
        
        Strategy:
        1. Chunk by time (every 10 min)
        2. Summarize each chunk
        3. Group chunks into sections (opening, middle, closing)
        4. Summarize sections
        5. Final aggregation
        """
        transcripts = call_data['transcripts']
        duration = call_data['duration_seconds']
        
        # Step 1: Create time-based chunks
        chunks = self._create_time_chunks(transcripts, duration)
        
        if DEBUG_MODE:
            print(f"[HierarchicalSummary] Created {len(chunks)} chunks")
        
        # Step 2: Summarize each chunk
        chunk_summaries = []
        for i, chunk in enumerate(chunks):
            if DEBUG_MODE:
                print(f"[HierarchicalSummary] Processing chunk {i+1}/{len(chunks)}...")
            
            chunk_data = {
                **call_data,
                'transcripts': chunk['transcripts'],
                'duration_seconds': chunk['end_time'] - chunk['start_time'],
            }
            state = self._create_state(chunk_data)
            result = self.workflow.invoke(state)
            
            chunk_summaries.append({
                'start_time': chunk['start_time'],
                'end_time': chunk['end_time'],
                'summary': result.get("call_summary", {})
            })
        
        # Step 3: Group chunks into sections
        sections = self._chunks_to_sections(chunks, chunk_summaries, duration)
        
        # Step 4: Aggregate into final summary
        section_summaries = [s['summary'] for s in sections]
        return self._aggregate_section_summaries(
            sections,
            call_data,
            section_summaries
        )
    
    def _create_time_chunks(self, transcripts: List[Dict], duration: int) -> List[Dict]:
        """Divide transcripts into time-based chunks"""
        chunks = []
        current_chunk = []
        current_start = 0
        
        # Estimate time per transcript
        time_per_transcript = duration / len(transcripts) if transcripts else 60
        
        for i, transcript in enumerate(transcripts):
            estimated_time = int(i * time_per_transcript)
            
            # Start new chunk if exceeded chunk size
            if estimated_time - current_start >= self.chunk_size and current_chunk:
                chunks.append({
                    'start_time': current_start,
                    'end_time': estimated_time,
                    'transcripts': current_chunk.copy()
                })
                current_start = estimated_time
                current_chunk = []
            
            current_chunk.append(transcript)
        
        # Add final chunk
        if current_chunk:
            chunks.append({
                'start_time': current_start,
                'end_time': duration,
                'transcripts': current_chunk
            })
        
        return chunks
    
    def _chunks_to_sections(
        self, 
        chunks: List[Dict], 
        chunk_summaries: List[Dict],
        duration: int
    ) -> List[Dict]:
        """Group chunks into opening, middle, closing sections"""
        n = len(chunks)
        
        if n <= 3:
            # Each chunk becomes a section
            return [
                {
                    'name': 'opening' if i == 0 else 'closing' if i == n-1 else 'middle',
                    'start_time': cs['start_time'],
                    'end_time': cs['end_time'],
                    'summary': cs['summary']
                }
                for i, cs in enumerate(chunk_summaries)
            ]
        
        # Divide into 3 sections
        opening_end = max(1, n // 3)
        closing_start = min(n - 1, 2 * n // 3)
        
        sections = [
            {
                'name': 'opening',
                'start_time': 0,
                'end_time': chunk_summaries[opening_end-1]['end_time'],
                'summary': self._merge_summaries(chunk_summaries[:opening_end])
            },
            {
                'name': 'middle',
                'start_time': chunk_summaries[opening_end]['start_time'],
                'end_time': chunk_summaries[closing_start-1]['end_time'],
                'summary': self._merge_summaries(chunk_summaries[opening_end:closing_start])
            },
            {
                'name': 'closing',
                'start_time': chunk_summaries[closing_start]['start_time'],
                'end_time': duration,
                'summary': self._merge_summaries(chunk_summaries[closing_start:])
            },
        ]
        
        return sections
    
    def _merge_summaries(self, summaries: List[Dict]) -> Dict:
        """Merge multiple summaries into one (for section aggregation)"""
        if not summaries:
            return {}
        if len(summaries) == 1:
            return summaries[0]
        
        # Simple merge strategy - take the last summary as base
        # In production, you might want another LLM call here
        merged = summaries[-1].copy()
        
        # Merge key points from all summaries
        all_key_points = []
        for s in summaries:
            all_key_points.extend(s.get('key_points', []))
        
        # Deduplicate and keep top 5
        seen = set()
        unique_points = []
        for point in all_key_points:
            point_lower = point.lower()
            if point_lower not in seen:
                seen.add(point_lower)
                unique_points.append(point)
        
        merged['key_points'] = unique_points[:5]
        
        # Average the scores
        satisfaction_scores = [s.get('customer_satisfaction', 3) for s in summaries]
        coaching_scores = [s.get('coaching_effectiveness', 3) for s in summaries]
        
        merged['customer_satisfaction'] = round(sum(satisfaction_scores) / len(satisfaction_scores))
        merged['coaching_effectiveness'] = round(sum(coaching_scores) / len(coaching_scores))
        
        return merged
    
    def _aggregate_section_summaries(
        self,
        sections: List[Any],
        original_call_data: Dict,
        section_summaries: List[Dict]
    ) -> CallSummaryOutput:
        """
        Aggregate section summaries into final call summary
        
        For medium/long calls, we create a synthesized summary
        that captures the journey across sections
        """
        
        # Build a summary of summaries
        opening = next((s for s in section_summaries if isinstance(s, dict) and 'opening' in str(s).lower()), section_summaries[0] if section_summaries else {})
        closing = next((s for s in reversed(section_summaries) if isinstance(s, dict) and 'closing' in str(s).lower()), section_summaries[-1] if section_summaries else {})
        
        # Create journey summary
        initial_sentiment = opening.get('customer_satisfaction', 3) if isinstance(opening, dict) else 3
        final_sentiment = closing.get('customer_satisfaction', 3) if isinstance(closing, dict) else 3
        
        # Aggregate key points (from all sections, deduplicated)
        all_key_points = []
        for s in section_summaries:
            if isinstance(s, dict):
                all_key_points.extend(s.get('key_points', []))
        
        # Deduplicate
        seen = set()
        unique_key_points = []
        for point in all_key_points:
            point_lower = point.lower()
            if point_lower not in seen:
                seen.add(point_lower)
                unique_key_points.append(point)
        
        # Aggregate strengths and improvements
        all_strengths = []
        all_improvements = []
        for s in section_summaries:
            if isinstance(s, dict):
                all_strengths.extend(s.get('strengths', []))
                all_improvements.extend(s.get('improvements', []))
        
        # Determine overall resolution status
        # Priority: resolved > pending > escalated > unresolved
        statuses = []
        for s in section_summaries:
            if isinstance(s, dict):
                statuses.append(s.get('resolution_status', 'pending'))
        
        resolution_priority = {'resolved': 0, 'pending': 1, 'escalated': 2, 'unresolved': 3}
        final_status = min(statuses, key=lambda x: resolution_priority.get(x, 1)) if statuses else 'pending'
        
        # Build final summary
        final_summary = {
            'summary': self._create_journey_summary(
                sections, initial_sentiment, final_sentiment, final_status
            ),
            'key_points': unique_key_points[:5],
            'strengths': list(dict.fromkeys(all_strengths))[:3],  # Remove duplicates, keep order
            'improvements': list(dict.fromkeys(all_improvements))[:3],
            'customer_satisfaction': final_sentiment,
            'resolution_status': final_status,
            'coaching_effectiveness': round(
                sum(s.get('coaching_effectiveness', 3) for s in section_summaries if isinstance(s, dict)) / len(section_summaries)
            ) if section_summaries else 3,
        }
        
        return CallSummaryOutput(**final_summary)
    
    def _create_journey_summary(
        self,
        sections: List[Any],
        initial_sentiment: int,
        final_sentiment: int,
        resolution_status: str
    ) -> str:
        """Create a summary describing the call journey"""
        duration_desc = "short" if len(sections) <= 1 else "extended" if len(sections) >= 5 else "multi-part"
        
        sentiment_change = "improved" if final_sentiment > initial_sentiment else "declined" if final_sentiment < initial_sentiment else "remained stable"
        
        resolution_desc = {
            'resolved': 'was successfully resolved',
            'pending': 'remains pending with follow-up needed',
            'escalated': 'required escalation',
            'unresolved': 'could not be resolved during the call'
        }.get(resolution_status, 'was addressed')
        
        return (
            f"This {duration_desc} training call involved a customer interaction that {sentiment_change} "
            f"throughout the conversation. The issue {resolution_desc}. "
            f"The operator demonstrated varying performance across different phases of the call, "
            f"with coaching guidance available throughout the interaction."
        )
    
    def _create_state(self, call_data: Dict) -> Dict:
        """Create LangGraph state from call data"""
        return {
            "call_metadata": {
                "call_id": call_data.get('call_id', 'unknown'),
                "duration_seconds": call_data.get('duration_seconds', 0),
                "total_turns": call_data.get('total_turns', 0),
                "customer_sentiment": call_data.get('customer_sentiment', 'unknown'),
                "scenario_type": call_data.get('scenario_type', 'customer_service'),
            },
            "transcripts": call_data.get('transcripts', []),
                "coaching_history": call_data.get('coaching_history', []),
            "sentiment_analysis": {},
            "key_moments": {},
            "operator_performance": {},
            "call_summary": {},
        }


# Singleton instance
_hierarchical_summarizer = None


def get_hierarchical_summarizer() -> HierarchicalSummarizer:
    """Get or create singleton instance"""
    global _hierarchical_summarizer
    if _hierarchical_summarizer is None:
        _hierarchical_summarizer = HierarchicalSummarizer()
    return _hierarchical_summarizer


def summarize_call(call_data: Dict) -> CallSummaryOutput:
    """
    Convenience function for hierarchical summarization
    
    Args:
        call_data: Call data dictionary
    
    Returns:
        CallSummaryOutput with final summary
    """
    summarizer = get_hierarchical_summarizer()
    return summarizer.summarize(call_data)
