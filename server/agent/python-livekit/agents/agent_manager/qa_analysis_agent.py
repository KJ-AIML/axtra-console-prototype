"""
QA Analysis Agent Manager
Initialize LLM models with structured output for QA analysis workflow
"""

import os
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model

from agents.schemas.qa_types import (
    CriteriaResult,
    QAReportOutput,
)

load_dotenv()

# Initialize model
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY environment variable required")

model = init_chat_model("google_genai:gemini-2.5-flash-lite", api_key=api_key)

# Create structured output models
# Each criteria evaluation uses this structured output
model_criteria_result = model.with_structured_output(CriteriaResult)

# Final aggregation uses this structured output
model_qa_report = model.with_structured_output(QAReportOutput)
