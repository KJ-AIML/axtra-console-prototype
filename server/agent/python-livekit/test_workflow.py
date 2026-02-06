from agents.workflow.build import build_workflow

parallel_workflow = build_workflow()

user_info_data = {
    "profile": {
        "name": "Sarah Thompson",
        "customer_id": "CUST-2847",
        "tier": "Gold Tier",
        "customer_since": "2019-03-15",
        "status": "Active"
    },
    "contact": {
        "phone": "+1 (555) 234-5678",
        "email": "sarah.thompson@email.com"
    },
    "subscription": {
        "plan": "Premium Plus",
        "billing_cycle": "Monthly",
        "price": 149.99,
        "currency": "USD",
        "renewal_date": "2025-03-15"
    },
    "stats": {
        "total_calls": 23,
        "csat_score": 4.2
    },
    "call_history": [
        {
            "date": "2024-01-28",
            "status": "Resolved",
            "category": "Billing Inquiry",
            "description": "Customer questioned charges on invoice. Provided breakdown and applied loyalty discount.",
            "duration": "12m 45s",
            "sentiment": "neutral"
        },
        {
            "date": "2024-01-15",
            "status": "Escalated",
            "category": "Technical Support",
            "description": "Internet connectivity issues. Tried troubleshooting but required technician visit.",
            "duration": "18m 22s",
            "sentiment": "negative"
        },
        {
            "date": "2024-01-02",
            "status": "Resolved",
            "category": "Service Upgrade",
            "description": "Customer upgraded to Premium Plus plan. Successfully processed upgrade.",
            "duration": "6m 10s",
            "sentiment": "positive"
        }
    ]
}

context_summary = ['Sarah Thompson, a customer, is contacting the agent for the second time within three months due to being overcharged. She is frustrated because she was billed $298.50 instead of the expected $149.99. Sarah has provided her name and account ID (CUST-2847) and expressed her dissatisfaction with having to deal with the same recurring issue.']

current_conversation_data = [
    {
        "turn_id": 7,
        "speaker": "Agent",
        "text": "จากปัญหาเบื้องต้นรบกวนขอ อีเมลของคุณลูกค้าได้ไหม ครับ เพื่อทางทีมงานจะตรวจสอบให้ในทันทีครับ"
    },
    {
        "turn_id": 8,
        "speaker": "Customer",
        "text": "sarah.thompson@email.com ค่ะ! และฉัน กำลัง รีบไป ประชุม ด้วย! คุณต้อง แก้ไข ให้เสร็จเดี๋ยวนี้!"
    }
]

state = parallel_workflow.invoke(
    {
        "user_info": user_info_data,
        "context_summary": context_summary,
        "conversation_data": current_conversation_data
    }
  )

print(state["llm_card_1_response"])
print("-"*50)
print(state["llm_card_2_response"])
print("-"*50)
print(state["llm_card_3_response"])
print("-"*50)
print(state["suggest_response"])
