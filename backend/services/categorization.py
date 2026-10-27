
import os

import httpx
from dotenv import load_dotenv

load_dotenv()

AI_URL = os.getenv(
    "MOCK_AI_URL",
    "http://127.0.0.1:8787/categorize",
)

VALID_CATEGORIES = {"Sales", "Support", "Billing", "Other"}


def categorize_enquiry(enquiry_id: str, message: str) -> tuple[str | None, str]:
    try:
        response = httpx.post(
            AI_URL,
            json={
                "enquiryId": enquiry_id,
                "message": message,
            },
            timeout=5.0,
        )

        if response.status_code != 200:
            return None, "Failed"

        data = response.json()
        category = data.get("category") if isinstance(data, dict) else None

        if category not in VALID_CATEGORIES:
            return None, "Failed"

        return category, "Completed"

    except (httpx.HTTPError, ValueError):
        return None, "Failed"
