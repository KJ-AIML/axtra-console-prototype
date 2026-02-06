import os
from datetime import datetime
from pyexpat import model

from dotenv import load_dotenv
from google.genai import types
from livekit import agents
from livekit.agents import Agent, AgentSession, RunContext
from livekit.agents.llm import function_tool
from livekit.plugins import deepgram, google, openai, silero

from prompts import CALLER_INSTRUCTIONS

# Load environment variables
load_dotenv(".env")

class Assistant(Agent):
    """Basic voice assistant"""

    def __init__(self):
        super().__init__(
            instructions=CALLER_INSTRUCTIONS
        )

    @function_tool
    async def get_current_date_and_time(self, context: RunContext) -> str:
        """Get the current date and time."""
        current_datetime = datetime.now().strftime("%B %d, %Y at %I:%M %p")
        return f"The current date and time is {current_datetime}"

async def entrypoint(ctx: agents.JobContext):
    """Entry point for the agent."""

    # Configure the voice pipeline with the essentials
    # session = AgentSession(
    #     stt=deepgram.STT(model="nova-2", language="th"),
    #     llm=openai.LLM(model=os.getenv("LLM_CHOICE", "gpt-4o-mini")),
    #     tts =openai.TTS(voice="alloy"),
    #     vad=silero.VAD.load(),
    # )

    models = google.realtime.RealtimeModel(
        api_key=os.getenv("GOOGLE_API_KEY"),
        model="gemini-2.5-flash-native-audio-preview-12-2025",
        voice="Zephyr",
        temperature=0.6,
        thinking_config=types.ThinkingConfig(
            include_thoughts=False,
        ),
        enable_affective_dialog=True,
    )

    session = AgentSession(
        llm=models,
    )
    @session.on("user_input_transcribed")
    def on_transcript(transcript):
        # transcript.transcript คือข้อความ
        # transcript.is_final บอกว่าจบประโยคหรือยัง
        if not transcript.is_final:
            print(f"กำลังพูด: {transcript.transcript}") 
        else:
            print(f"จบประโยค (Final): {transcript.transcript}")

    @session.on("user_speech_committed")
    def on_user_speech_committed(msg):
        # msg.content คือข้อความสุดท้ายที่ User พูดใน Turn นั้น
        print(f"\n[User Log]: {msg.content}\n")

    # Start the session
    await session.start(
        room=ctx.room,
        agent=Assistant()
    )

if __name__ == "__main__":
    # Run the agent
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
