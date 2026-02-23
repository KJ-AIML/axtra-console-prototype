"""
Call Summary Agent Manager
Initialize LLM models with structured output for call summary workflow
"""

import os
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model

from agents.schemas.call_summary_types import (
    SentimentAnalysis,
    KeyMoments,
    OperatorPerformance,
    CallSummaryOutput,
)

load_dotenv()

# Initialize model
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY environment variable required")

model = init_chat_model("google_genai:gemini-2.5-flash-lite", api_key=api_key)

# Create structured output models
# Each node in the workflow uses a specific structured output

# Node 1: Sentiment Analysis
model_sentiment = model.with_structured_output(SentimentAnalysis)

# Node 2: Key Moments Extraction
model_key_moments = model.with_structured_output(KeyMoments)

# Node 3: Operator Performance Evaluation
model_performance = model.with_structured_output(OperatorPerformance)

# Final Aggregation: Complete Summary
model_summary = model.with_structured_output(CallSummaryOutput)
