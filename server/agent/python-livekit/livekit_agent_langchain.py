"""
AXTRA Copilot Agent with Parallel Supervisor
Main voice agent with real-time coaching analysis
"""

import os
import asyncio
import json
import time
from datetime import datetime
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv
from google.genai import types
from livekit import agents
from livekit.agents import Agent, AgentSession, RunContext
from livekit.agents.llm import function_tool
from livekit.plugins import google

# Import existing workflow
from agents.workflow.build import build_workflow
from agents.schemas.types import SuggestionCard, SuggestionResponse

load_dotenv(".env")

# ============================================================
# DEBUG LOGGER
# ============================================================

DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"

def debug_log(category: str, message: str, data: Any = None):
    """Print debug logs when DEBUG_MODE is enabled"""
    if not DEBUG_MODE:
        return
    
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    prefix = f"[{timestamp}] [DEBUG:{category}]"
    
    if data is not None:
        print(f"{prefix} {message}")
        if isinstance(data, (dict, list)):
            print(json.dumps(data, ensure_ascii=False, indent=2))
        else:
            print(f"  → {data}")
    else:
        print(f"{prefix} {message}")

def log_trigger_calculation(turn_count: int, buffer_size: int, chars_since: int, 
                           time_since: float, triggers: List[str]):
    """Log trigger calculation details"""
    if not DEBUG_MODE:
        return
    
    print(f"\n{'='*60}")
    print(f"[TRIGGER CALCULATION] Turn {turn_count}")
    print(f"{'='*60}")
    print(f"  Buffer Size:      {buffer_size} turns")
    print(f"  Chars Since Last: {chars_since} chars")
    print(f"  Time Since Last:  {time_since:.1f}s")
    print(f"  Triggers Fired:   {', '.join(triggers) if triggers else 'None'}")
    print(f"{'='*60}\n")

# ============================================================
# CONVERSATION MANAGER (Rolling Window + Trigger Logic)
# ============================================================

class ConversationManager:
    """
    Manage conversation turns with intelligent trigger logic:
    - First analysis after 3 turns
    - Subsequent analysis every 3 turns
    - OR when 300+ chars accumulated
    - OR when 30+ seconds passed
    """
    
    def __init__(self):
        self.turns: List[Dict] = []           # All turns (User + Agent)
        self.buffer_since_analysis: List[Dict] = []  # Turns since last analysis
        self.summaries: List[str] = []        # Summary history for context
        
        # Trigger configuration
        self.turns_for_first_analysis = 3      # First analysis after 3 turns
        self.turns_between_analysis = 3        # Then every 3 turns
        self.chars_threshold = 300             # Or 300 chars accumulated
        self.time_threshold = 30               # Or 30 seconds
        
        # State tracking
        self.turn_count = 0
        self.last_analysis_time = time.time()
        self.chars_since_analysis = 0
        self.analysis_done = False
        self.user_info: Dict = {}
    
    def add_turn(self, speaker: str, text: str) -> Dict:
        """
        Add a turn and check if analysis should trigger
        Returns: Dict with should_analyze flag and data if true
        """
        
        turn = {
            "turn_id": self.turn_count + 1,
            "speaker": speaker,
            "text": text,
            "timestamp": datetime.now().isoformat()
        }
        
        self.turns.append(turn)
        self.buffer_since_analysis.append(turn)
        self.turn_count += 1
        self.chars_since_analysis += len(text)
        
        print(f"[ConvManager] Turn {self.turn_count} added ({speaker}): {text[:50]}...")
        print(f"[ConvManager] Buffer size: {len(self.buffer_since_analysis)} turns, "
              f"{self.chars_since_analysis} chars")
        
        # Check triggers
        return self._check_triggers()
    
    def _check_triggers(self) -> Dict:
        """Determine if analysis should run based on various triggers"""
        
        # Calculate current state
        time_since_last = time.time() - self.last_analysis_time
        triggers = []
        
        # TRIGGER 1: First analysis (after initial turns)
        if not self.analysis_done and len(self.turns) >= self.turns_for_first_analysis:
            triggers.append(f"first_analysis({len(self.turns)} turns)")
        
        # TRIGGER 2: Periodic (every N turns after first)
        elif self.analysis_done and len(self.buffer_since_analysis) >= self.turns_between_analysis:
            triggers.append(f"periodic({len(self.buffer_since_analysis)} new turns)")
        
        # TRIGGER 3: Character threshold
        if self.chars_since_analysis >= self.chars_threshold:
            triggers.append(f"chars({self.chars_since_analysis} chars)")
        
        # TRIGGER 4: Time threshold
        if time_since_last >= self.time_threshold and len(self.buffer_since_analysis) > 0:
            triggers.append(f"time({time_since_last:.0f}s)")
        
        # Log trigger calculation
        log_trigger_calculation(
            self.turn_count,
            len(self.buffer_since_analysis),
            self.chars_since_analysis,
            time_since_last,
            triggers
        )
        
        # TRIGGER 1: First analysis
        if not self.analysis_done and len(self.turns) >= self.turns_for_first_analysis:
            print(f"[ConvManager] 🔥 TRIGGER: First analysis ({len(self.turns)} turns)")
            return {
                "should_analyze": True,
                "type": "first_analysis",
                "reason": f"Initial {self.turns_for_first_analysis} turns complete",
                "data": self._prepare_data()
            }
        
        # TRIGGER 2: Periodic
        if self.analysis_done and len(self.buffer_since_analysis) >= self.turns_between_analysis:
            print(f"[ConvManager] 🔥 TRIGGER: Periodic analysis ({len(self.buffer_since_analysis)} new turns)")
            return {
                "should_analyze": True,
                "type": "periodic",
                "reason": f"{self.turns_between_analysis} new turns accumulated",
                "data": self._prepare_data()
            }
        
        # TRIGGER 3: Content accumulation (lots of text in current buffer)
        if self.chars_since_analysis >= self.chars_threshold:
            print(f"[ConvManager] 🔥 TRIGGER: Content threshold ({self.chars_since_analysis} chars)")
            return {
                "should_analyze": True,
                "type": "content_threshold",
                "reason": f"{self.chars_since_analysis} chars accumulated",
                "data": self._prepare_data()
            }
        
        # TRIGGER 4: Time-based (silence for too long with pending content)
        time_since_last = time.time() - self.last_analysis_time
        if time_since_last >= self.time_threshold and len(self.buffer_since_analysis) > 0:
            print(f"[ConvManager] 🔥 TRIGGER: Time threshold ({time_since_last:.0f}s)")
            return {
                "should_analyze": True,
                "type": "time_threshold",
                "reason": f"{time_since_last:.0f} seconds since last analysis",
                "data": self._prepare_data()
            }
        
        return {"should_analyze": False}
    
    def _prepare_data(self) -> Dict:
        """Prepare data for workflow input"""
        
        # Recent turns (last 6 = up to 3 user + 3 agent exchanges)
        recent_turns = self.buffer_since_analysis[-6:] if len(self.buffer_since_analysis) > 6 else self.buffer_since_analysis
        
        # Count speakers for debugging
        customer_turns = sum(1 for t in recent_turns if t.get("speaker") == "Customer")
        agent_turns = sum(1 for t in recent_turns if t.get("speaker") == "Agent")
        
        print(f"\n[ConvManager] Preparing workflow data:")
        print(f"  Total turns in buffer: {len(self.buffer_since_analysis)}")
        print(f"  Recent turns (last 6): {len(recent_turns)}")
        print(f"    - Customer: {customer_turns}")
        print(f"    - Agent: {agent_turns}")
        print(f"  Context summaries: {len(self.summaries)}")
        
        return {
            "user_info": self.user_info,
            "context_summary": self.summaries.copy(),
            "conversation_data": recent_turns,
            "total_turns": self.turn_count
        }
    
    def on_analysis_complete(self, result: Dict):
        """Called after analysis is done - reset buffers and create summary"""
        
        self.analysis_done = True
        self.buffer_since_analysis = []  # Reset buffer
        self.chars_since_analysis = 0
        self.last_analysis_time = time.time()
        
        # Create summary for next round's context
        try:
            card1 = result.get("llm_card_1_response", {})
            card3 = result.get("llm_card_3_response", {})
            summary = f"Turn {self.turn_count}: {card1.get('title', 'No emotion')} - {card3.get('action', 'No action')}"
            self.summaries.append(summary)
            print(f"[ConvManager] Summary created: {summary[:80]}...")
        except Exception as e:
            print(f"[ConvManager] Error creating summary: {e}")


# ============================================================
# SUPERVISOR PROCESS (LangGraph Workflow Runner)
# ============================================================

class SupervisorProcess:
    """
    Background process for running LangGraph workflow analysis
    and publishing results to frontend via LiveKit data channel
    """
    
    def __init__(self, room, workflow):
        self.room = room
        self.workflow = workflow
        self.queue = asyncio.Queue()
        self.running = False
        self.user_info: Dict = {}
        self.analysis_count = 0
    
    async def run(self):
        """Main loop - process analysis requests from queue"""
        self.running = True
        print("[Supervisor] Started and waiting for analysis requests...")
        
        while self.running:
            try:
                # Wait for analysis request (with timeout to allow checking running flag)
                request = await asyncio.wait_for(self.queue.get(), timeout=1.0)
                
                print(f"[Supervisor] Queue message received: {request['type']}")
                
                if request["type"] == "analyze":
                    print(f"[Supervisor] Processing analysis request...")
                    await self._handle_analysis(request["data"])
                elif request["type"] == "stop":
                    print("[Supervisor] Stop signal received")
                    break
                    
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                print(f"[Supervisor] Error in main loop: {e}")
    
    async def _handle_analysis(self, data: Dict):
        """Run workflow and publish results to frontend"""
        
        self.analysis_count += 1
        print(f"\n[Supervisor] 🔍 Analysis #{self.analysis_count} starting...")
        print(f"[Supervisor] Total turns: {data['total_turns']}, "
              f"Buffer size: {len(data['conversation_data'])}")
        
        # Build input for workflow
        workflow_input = {
            "user_info": data.get("user_info", {}),
            "context_summary": data.get("context_summary", []),
            "conversation_data": data.get("conversation_data", [])
        }
        
        # Log detailed workflow input
        debug_log("WORKFLOW_INPUT", f"Analysis #{self.analysis_count} Input:", workflow_input)
        
        # Print COMPLETE workflow input data (always visible for clarity)
        print(f"\n{'='*70}")
        print(f"[WORKFLOW INPUT - COMPLETE] Analysis #{self.analysis_count}")
        print(f"{'='*70}")
        
        # User Info Section
        print(f"\n📋 USER INFO:")
        print(f"{json.dumps(workflow_input['user_info'], indent=2, ensure_ascii=False)}")
        
        # Context Summary Section
        print(f"\n📚 CONTEXT SUMMARY ({len(workflow_input['context_summary'])} items):")
        if workflow_input['context_summary']:
            for i, summary in enumerate(workflow_input['context_summary'], 1):
                preview = summary[:100] + "..." if len(summary) > 100 else summary
                print(f"  {i}. {preview}")
        else:
            print("  (empty)")
        
        # Conversation Data Section
        print(f"\n💬 CONVERSATION DATA ({len(workflow_input['conversation_data'])} turns):")
        total_chars = 0
        for i, turn in enumerate(workflow_input['conversation_data'], 1):
            speaker = turn.get('speaker', 'Unknown')
            text = turn.get('text', '')
            total_chars += len(text)
            # Show full text but truncate if extremely long
            preview = text[:200] + "... (truncated)" if len(text) > 200 else text
            print(f"  {i}. [{speaker}]: {preview}")
        print(f"\n  Total characters: {total_chars}")
        
        print(f"\n{'='*70}")
        print(f"[WORKFLOW] Invoking LangGraph with above input...")
        print(f"{'='*70}\n")
        
        try:
            # Run workflow (blocking call, run in thread pool)
            start_time = time.time()
            result = await asyncio.to_thread(self.workflow.invoke, workflow_input)
            duration = time.time() - start_time
            
            print(f"[Supervisor] Workflow completed in {duration:.2f}s")
            
            # Log detailed workflow output
            debug_log("WORKFLOW_OUTPUT", f"Analysis #{self.analysis_count} Result:", result)
            
            # Extract results
            cards = [
                result.get("llm_card_1_response", {}),
                result.get("llm_card_2_response", {}),
                result.get("llm_card_3_response", {})
            ]
            
            # Extract and normalize script
            raw_script = result.get("suggest_response", {})
            script = {
                "summary": raw_script.get("summary", ""),
                "suggestion": raw_script.get("suggestion", raw_script.get("suggested_script", ""))
            }
            
            # Validate results
            if not all(cards):
                print("[Supervisor] ⚠️ Warning: Some cards are empty")
            
            print(f"[Supervisor] Cards generated: {len(cards)}")
            print(f"[Supervisor] Script generated: {bool(script['suggestion'])}")
            print(f"[Supervisor] Script preview: {script['suggestion'][:100]}...")
            
            # Send to frontend
            await self._publish_to_frontend(cards, script)
            
        except Exception as e:
            print(f"[Supervisor] ❌ Workflow error: {e}")
            import traceback
            traceback.print_exc()
    
    async def _publish_to_frontend(self, cards: List[Dict], script: Dict):
        """Publish coaching data to frontend via LiveKit data channel"""
        
        payload = {
            "type": "coaching_update",
            "timestamp": time.time(),
            "analysis_id": self.analysis_count,
            "cards": cards,
            "script": script,
            "metadata": {
                "source": "axtra_copilot",
                "version": "1.0",
                "model": "gemini-2.5-flash-lite"
            }
        }
        
        try:
            # Publish as reliable data (ensures delivery)
            await self.room.local_participant.publish_data(
                payload=json.dumps(payload, ensure_ascii=False).encode('utf-8'),
                reliable=True
            )
            print(f"[Supervisor] ✅ Data published to frontend (analysis #{self.analysis_count})")
            
            # Also print to console for debugging
            print(f"\n{'='*60}")
            print("AXTRA COPILOT UPDATE")
            print(f"{'='*60}")
            for i, card in enumerate(cards, 1):
                print(f"\nCard {i}: {card.get('title', 'N/A')}")
                print(f"  Status: {card.get('status', 'N/A')}")
                print(f"  Action: {card.get('action', 'N/A')[:60]}...")
            print(f"\nSuggested Script: {script.get('suggestion', 'N/A')[:80]}...")
            print(f"{'='*60}\n")
            
        except Exception as e:
            print(f"[Supervisor] ❌ Failed to publish data: {e}")
    
    def stop(self):
        """Signal supervisor to stop"""
        self.running = False
        self.queue.put_nowait({"type": "stop"})


# ============================================================
# MAIN VOICE AGENT
# ============================================================

class MainAgent(Agent):
    """
    Main voice agent that handles conversation
    and triggers supervisor analysis at appropriate times
    """
    
    def __init__(self, supervisor: SupervisorProcess, conv_manager: ConversationManager):
        # Load persona instructions from existing prompts
        instructions = self._load_persona_instructions()
        super().__init__(instructions=instructions)
        
        self.supervisor = supervisor
        self.conv_manager = conv_manager
    
    def _load_persona_instructions(self) -> str:
        """Load persona instructions from prompts.py"""
        try:
            from prompts import CALLER_INSTRUCTIONS
            return CALLER_INSTRUCTIONS
        except ImportError:
            print("[MainAgent] Warning: Could not load CALLER_INSTRUCTIONS, using default")
            return "You are a helpful customer service representative."
    
    async def on_user_turn_completed(self, turn_ctx, new_message):
        """
        Called when user finishes speaking
        This is where we track conversation and trigger analysis
        """
        
        text = new_message.text_content()
        print(f"\n[Turn Complete - User]: {text[:100]}...")
        
        # Add to conversation manager and check triggers
        trigger = self.conv_manager.add_turn("Customer", text)
        
        # If trigger fired, send to supervisor
        if trigger.get("should_analyze"):
            print(f"[MainAgent] Analysis triggered: {trigger['reason']}")
            await self.supervisor.queue.put({
                "type": "analyze",
                "data": trigger["data"]
            })
    
    async def on_agent_speech_committed(self, msg):
        """
        Called when agent (AI) finishes speaking
        Also track this for complete conversation history
        """
        
        try:
            text = msg.content if hasattr(msg, 'content') else str(msg)
            print(f"\n🤖 [Turn Complete - Agent]: {text[:100]}...")
            debug_log("AGENT", "on_agent_speech_committed", text)
            
            # Track agent turn (but don't trigger analysis on agent speech)
            self.conv_manager.add_turn("Agent", text)
        except Exception as e:
            print(f"[MainAgent] Error in on_agent_speech_committed: {e}")
            debug_log("AGENT", "Error", str(e))
    
    @function_tool
    async def get_current_date_and_time(self, context: RunContext) -> str:
        """Get the current date and time."""
        current_datetime = datetime.now().strftime("%B %d, %Y at %I:%M %p")
        return f"The current date and time is {current_datetime}"


# ============================================================
# ENTRYPOINT
# ============================================================

async def entrypoint(ctx: agents.JobContext):
    """
    Main entry point for AXTRA Copilot Agent
    Sets up parallel voice + analysis architecture
    """
    
    print("\n" + "="*70)
    print(" AXTRA COPILOT AGENT STARTING ")
    print("="*70)
    print(f"Room: {ctx.room.name}")
    
    # 1. Parse metadata from job (sent by frontend)
    metadata = {}
    if ctx.job.metadata:
        try:
            metadata = json.loads(ctx.job.metadata)
            print(f"\n[Metadata] Received:")
            for key, value in metadata.items():
                print(f"  {key}: {value}")
        except json.JSONDecodeError:
            print(f"[Metadata] Warning: Could not parse metadata: {ctx.job.metadata}")
    
    # 2. Initialize conversation manager
    conv_manager = ConversationManager()
    conv_manager.user_info = metadata.get("user_info", {})
    
    # 3. Build LangGraph workflow
    print("\n[Setup] Building LangGraph workflow...")
    try:
        workflow = build_workflow()
        print("[Setup] Workflow built successfully")
    except Exception as e:
        print(f"[Setup] ❌ Failed to build workflow: {e}")
        raise
    
    # 4. Initialize supervisor process
    supervisor = SupervisorProcess(ctx.room, workflow)
    supervisor.user_info = metadata.get("user_info", {})
    
    # 5. Setup Gemini Realtime voice model
    print("\n[Setup] Initializing Gemini Realtime...")
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found in environment")
    
    models = google.realtime.RealtimeModel(
        api_key=api_key,
        model="gemini-2.5-flash-native-audio-preview-12-2025",
        voice="Zephyr",
        temperature=0.6,
        thinking_config=types.ThinkingConfig(include_thoughts=False),
        enable_affective_dialog=True,
    )
    
    session = AgentSession(llm=models)
    
    # Track conversation turns manually since on_user_turn_completed isn't firing
    last_user_text = ""
    last_agent_text = ""
    
    @session.on("user_input_transcribed")
    def on_transcript(transcript):
        nonlocal last_user_text
        if not transcript.is_final:
            print(f"🎤 [Streaming User]: {transcript.transcript}")
            debug_log("USER", "Streaming", transcript.transcript)
        else:
            text = transcript.transcript.strip()
            if text and text != last_user_text:
                print(f"✅ [Final User]: {text}")
                debug_log("USER", "Final Transcript", text)
                last_user_text = text
                # Trigger turn tracking directly
                trigger = conv_manager.add_turn("Customer", text)
                if trigger.get("should_analyze"):
                    print(f"[MainAgent] Analysis triggered: {trigger['reason']}")
                    print(f"[MainAgent] Sending to supervisor queue...")
                    # Send to supervisor for analysis
                    asyncio.create_task(supervisor.queue.put({
                        "type": "analyze",
                        "data": trigger["data"]
                    }))
    
    # Track agent speech output - multiple methods for reliability
    agent_text_buffer = []
    
    @session.on("agent_output")
    def on_agent_output(output):
        """Capture agent text output"""
        nonlocal last_agent_text
        text = str(output).strip()
        if text and text != last_agent_text and len(text) > 5:
            print(f"🤖 [Agent Output]: {text[:100]}...")
            debug_log("AGENT", "Output", text)
            last_agent_text = text
            conv_manager.add_turn("Agent", text)
    
    @session.on("generation_canceled")
    def on_generation_canceled():
        print("🛑 [Agent] Generation canceled")
        debug_log("AGENT", "Generation canceled")
    
    # Alternative: Track via room events (participant tracks)
    @ctx.room.on("track_published")
    def on_track_published(publication, participant):
        if participant.identity == ctx.room.local_participant.identity:
            print(f"🎙️ [Agent] Track published: {publication.track_sid} ({publication.kind})")
            debug_log("AGENT", f"Track published: {publication.kind}")
    
    # Track participant metadata changes (speaking indicator)
    @ctx.room.on("participant_attributes_changed")
    def on_attrs_changed(changed_attrs, participant):
        if participant.identity == ctx.room.local_participant.identity:
            print(f"📊 [Agent] Attributes changed: {changed_attrs}")
            debug_log("AGENT", "Attributes changed", changed_attrs)
    
    # Track agent speech from conversation_item_added events
    @session.on("conversation_item_added")
    def on_conversation_item_added(event):
        item = event.item
        if item.role == "assistant":
            # Extract text content from the message
            content = item.content
            if isinstance(content, list) and len(content) > 0:
                text = content[0] if isinstance(content[0], str) else str(content[0])
            elif isinstance(content, str):
                text = content
            else:
                text = str(content)
            
            if text and len(text) > 5:
                print(f"\n🤖 [Agent Message]: {text[:150]}...")
                debug_log("AGENT", "Conversation Item Added", text)
                conv_manager.add_turn("Agent", text)
    
    # DEBUG: Log ALL session events to see what's available
    if DEBUG_MODE:
        original_emit = session.emit
        def debug_emit(event_name, *args, **kwargs):
            if event_name not in ["user_input_transcribed"]:  # Skip noisy events
                print(f"[DEBUG:SessionEvent] {event_name}")
                # Log conversation_item_added details
                if event_name == "conversation_item_added" and args:
                    try:
                        event = args[0]
                        item = event.item if hasattr(event, 'item') else None
                        if item and hasattr(item, 'role'):
                            role = item.role
                            content = item.content if hasattr(item, 'content') else None
                            debug_log("SESSION", f"conversation_item_added - Role: {role}", str(content)[:200] if content else None)
                    except Exception as e:
                        debug_log("SESSION", f"Error parsing conversation_item_added: {e}")
                else:
                    debug_log("SESSION", f"Event: {event_name}", str(args)[:200] if args else None)
            return original_emit(event_name, *args, **kwargs)
        session.emit = debug_emit
    
    # 6. Create main agent
    main_agent = MainAgent(supervisor, conv_manager)
    
    # Debug: Set up additional room event listeners
    @ctx.room.on("track_subscribed")
    def on_track_subscribed(track, publication, participant):
        print(f"[Room] Track subscribed: {track.kind} from {participant.identity}")
        if track.kind == "audio":
            print(f"[Room] Audio track from participant - should start hearing them")
    
    @ctx.room.on("participant_connected")
    def on_participant_connected(participant):
        print(f"[Room] Participant connected: {participant.identity}")
    
    # 7. Start both processes in parallel
    print("\n" + "="*70)
    print(" STARTING PARALLEL PROCESSES ")
    print("="*70)
    print("1. Voice Agent (Gemini Realtime)")
    print("2. Supervisor Process (LangGraph Analysis)")
    print("="*70 + "\n")
    
    try:
        await asyncio.gather(
            # Main voice session - handles WebRTC audio
            session.start(room=ctx.room, agent=main_agent),
            # Supervisor background process - handles analysis
            supervisor.run()
        )
    except Exception as e:
        print(f"\n[Error] Main loop error: {e}")
        supervisor.stop()
        raise
    finally:
        print("\n[Shutdown] Cleaning up...")
        supervisor.stop()


if __name__ == "__main__":
    print("\nStarting AXTRA Copilot Agent...")
    print("Usage: uv run python livekit_agent_langchain.py dev\n")
    
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
