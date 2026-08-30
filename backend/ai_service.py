"""
Gemini AI Service for CodeFix AI.

Handles:
- AI code analysis
- Beginner-friendly explanations
- AI tutor chat
- Gemini API errors
- Gemini temporary 503 errors
"""

import json
import os
import re
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional


# ============================================================
# CONFIGURATION
# ============================================================

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# Use a currently supported Gemini Flash model.
GEMINI_MODEL = os.environ.get(
    "GEMINI_MODEL",
    "gemini-2.5-flash"
)

GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/"
    "v1beta/models/{model}:generateContent?key={key}"
)


# ============================================================
# SYSTEM PROMPT FOR CODE ANALYSIS
# ============================================================

SYSTEM_ANALYSIS_PROMPT = """
You are CodeFix AI, an expert programming tutor designed specifically
for beginners and students.

Your job is to analyze user-submitted code written in:
- Python
- C
- C++
- Java
- JavaScript

You must:
1. Detect syntax errors.
2. Detect likely runtime errors.
3. Detect logical errors.
4. Detect code quality issues.
5. Explain problems using simple beginner-friendly English.
6. Give the exact line number when possible.
7. Provide complete corrected code.
8. Give useful suggestions for improvement.

IMPORTANT STYLE RULES:

- Be warm, encouraging, and patient.
- Avoid unnecessary academic jargon.
- Explain concepts simply.
- Use small examples when helpful.
- Never blame the student.
- Always make the correction understandable.

LINE NUMBERS:

Line numbers start at 1.

If an error is clearly associated with a particular line,
return that line number.

If there is no specific line, return null.

CORRECTED CODE:

Always provide the COMPLETE corrected program.

If the code already works, return the original code as correctedCode.

NO ERROR:

If no significant error exists:

hasError = false

errorType = "No Error"

errorMessage = "No syntax or runtime errors detected."

Still provide 2-3 useful suggestions.

You MUST return ONLY valid JSON.

Do not use Markdown.
Do not wrap the JSON in ```json fences.

The JSON must have exactly this general structure:

{
  "hasError": true,
  "errorType": "Syntax Error",
  "line": 2,
  "errorMessage": "Expected ':' after the function definition.",
  "offendingCode": "def hello()",
  "explanation": "Python function definitions need a colon at the end.",
  "whyItHappened": "The colon was missing after the closing parenthesis.",
  "howToFix": "Add ':' after def hello().",
  "correctedCode": "def hello():\\n    print('hello')",
  "suggestions": [
    "Remember to use ':' after Python function definitions.",
    "Use consistent indentation."
  ]
}

Allowed errorType values:

"Syntax Error"
"Runtime Error"
"Logical Error"
"Warning"
"Code Quality Issue"
"Optimization Suggestion"
"No Error"
"""


# ============================================================
# JSON CLEANING
# ============================================================

def clean_json_response(raw_text: str) -> str:
    """
    Removes Markdown code fences if Gemini accidentally returns them.
    """

    text = (raw_text or "").strip()

    # Remove ```json ... ```
    text = re.sub(
        r"^```(?:json)?\s*",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"\s*```$",
        "",
        text
    )

    return text.strip()


# ============================================================
# GEMINI REQUEST
# ============================================================

def _call_gemini(
    payload: Dict[str, Any],
    retries: int = 3
) -> Dict[str, Any]:
    """
    Send a request to Gemini.

    Retries temporary 503/429 errors because Gemini can occasionally
    become temporarily unavailable during high demand.
    """

    api_key = os.environ.get("GEMINI_API_KEY", "")

    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not configured in the environment."
        )

    model = os.environ.get(
        "GEMINI_MODEL",
        GEMINI_MODEL
    )

    url = GEMINI_API_URL.format(
        model=model,
        key=api_key
    )

    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "CodeFix-AI"
        },
        method="POST"
    )

    last_error = None

    for attempt in range(retries):
        try:
            with urllib.request.urlopen(
                request,
                timeout=60
            ) as response:

                response_body = response.read().decode("utf-8")

                return json.loads(response_body)

        except urllib.error.HTTPError as error:

            error_body = error.read().decode("utf-8", errors="replace")

            # Gemini may temporarily return 503 when the model is busy.
            if error.code in (429, 500, 502, 503, 504):

                last_error = RuntimeError(
                    f"Gemini API HTTP {error.code}: {error_body}"
                )

                if attempt < retries - 1:
                    # 2 sec, then 4 sec, then 8 sec
                    time.sleep(2 ** attempt)
                    continue

            raise RuntimeError(
                f"Gemini API HTTP {error.code}: {error_body}"
            )

        except urllib.error.URLError as error:

            last_error = RuntimeError(
                f"Unable to connect to Gemini API: {error}"
            )

            if attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue

            raise last_error

        except TimeoutError as error:

            last_error = RuntimeError(
                f"Gemini API request timed out: {error}"
            )

            if attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue

            raise last_error

    if last_error:
        raise last_error

    raise RuntimeError(
        "Gemini API request failed."
    )


# ============================================================
# EXTRACT GEMINI TEXT
# ============================================================

def _extract_gemini_text(response_data: Dict[str, Any]) -> str:
    """
    Safely extracts generated text from Gemini response.
    """

    candidates = response_data.get("candidates", [])

    if not candidates:
        raise ValueError(
            "Gemini returned no candidates."
        )

    candidate = candidates[0]

    content = candidate.get("content", {})

    parts = content.get("parts", [])

    if not parts:
        raise ValueError(
            "Gemini returned an empty response."
        )

    text = parts[0].get("text", "")

    if not text:
        raise ValueError(
            "Gemini returned empty text."
        )

    return text


# ============================================================
# NORMALIZE ANALYSIS
# ============================================================

def _normalize_analysis(
    parsed_json: Dict[str, Any],
    original_code: str
) -> Dict[str, Any]:
    """
    Ensures the frontend always receives the expected fields.
    """

    suggestions = parsed_json.get("suggestions", [])

    if not isinstance(suggestions, list):
        suggestions = []

    suggestions = [
        str(item)
        for item in suggestions
    ]

    line = parsed_json.get("line")

    if line is not None:
        try:
            line = int(line)
        except (TypeError, ValueError):
            line = None

    has_error = bool(
        parsed_json.get("hasError", False)
    )

    corrected_code = parsed_json.get(
        "correctedCode",
        original_code
    )

    if not isinstance(corrected_code, str):
        corrected_code = original_code

    return {
        "hasError": has_error,

        "errorType": str(
            parsed_json.get(
                "errorType",
                "No Error"
            )
        ),

        "line": line,

        "errorMessage": str(
            parsed_json.get(
                "errorMessage",
                "Analysis complete."
            )
        ),

        "offendingCode": str(
            parsed_json.get(
                "offendingCode",
                ""
            )
        ),

        "explanation": str(
            parsed_json.get(
                "explanation",
                ""
            )
        ),

        "whyItHappened": str(
            parsed_json.get(
                "whyItHappened",
                ""
            )
        ),

        "howToFix": str(
            parsed_json.get(
                "howToFix",
                ""
            )
        ),

        "correctedCode": corrected_code,

        "suggestions": suggestions
    }


# ============================================================
# CODE ANALYSIS
# ============================================================

def analyze_code_with_gemini(
    language: str,
    code: str,
    static_hints: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Sends code to Gemini and returns structured analysis.
    """

    api_key = os.environ.get(
        "GEMINI_API_KEY",
        ""
    )

    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not configured in the environment."
        )

    static_context = ""

    if (
        static_hints
        and static_hints.get("has_syntax_error")
    ):
        static_context = f"""
A static parser also detected a possible syntax issue.

Line:
{static_hints.get("line")}

Message:
{static_hints.get("message")}

Offending line:
{static_hints.get("offending_line")}
"""

    user_prompt = f"""
Analyze the following {language.upper()} code.

CODE:

```{language}
{code}
