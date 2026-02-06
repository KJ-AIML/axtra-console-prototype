from typing import Literal, TypedDict

from pydantic import BaseModel


class State(TypedDict):
    user_info: dict
    context_summary: list
    conversation_data: list
    llm_card_1_response: str
    llm_card_2_response: str
    llm_card_3_response: str
    suggest_response: str

class SuggestionCard(BaseModel):
    title: str
    detail: str
    action: str
    status: Literal["danger", "warning", "success", "info"]

class SuggestionResponse(BaseModel):
    summary: str
    suggestion: str
