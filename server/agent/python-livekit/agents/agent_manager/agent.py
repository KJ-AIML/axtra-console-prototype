import os

from dotenv import load_dotenv
from langchain.chat_models import init_chat_model

from ..schemas.types import SuggestionCard, SuggestionResponse, SummaryResponse, PromotionSuggestion  # noqa: E402

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
model = init_chat_model("google_genai:gemini-2.5-flash-lite", api_key=api_key)

model_card_output = model.with_structured_output(SuggestionCard)

model_suggest_response = model.with_structured_output(SuggestionResponse)

model_summary = model.with_structured_output(SummaryResponse)

model_promotion_analyzer = model.with_structured_output(PromotionSuggestion)
