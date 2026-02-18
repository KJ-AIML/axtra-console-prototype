from typing import Literal, TypedDict, Optional, List

from pydantic import BaseModel


class State(TypedDict):
    user_info: dict
    context_summary: list
    conversation_data: list
    llm_card_1_response: str
    llm_card_2_response: str
    llm_card_3_response: str
    llm_promotion_response: dict  # NEW: Promotion analysis
    suggest_response: str
    available_promotions: list  # NEW: Promotions passed from metadata
    coaching_context: dict  # NEW: Context about who needs coaching


class SuggestionCard(BaseModel):
    title: str
    detail: str
    action: str
    status: Literal["danger", "warning", "success", "info"]


class SuggestionResponse(BaseModel):
    summary: str
    suggestion: str


class PromotionSuggestion(BaseModel):
    """Model for promotion suggestion from LLM"""
    should_suggest: bool
    promo_id: Optional[str] = None
    promo_name: Optional[str] = None
    promo_name_th: Optional[str] = None
    suggestion_reason: str = ""
    suggested_script: str = ""
    suggested_script_th: str = ""
    urgency: Literal["low", "medium", "high"] = "low"


class SummaryResponse(BaseModel):
    summary: str
