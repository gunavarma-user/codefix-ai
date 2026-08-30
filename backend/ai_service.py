"""
Gemini AI Service for CodeFix AI.

Handles:
- AI code analysis
- Beginner-friendly tutoring
- Gemini API communication
- JSON response parsing
- Temporary Gemini API failures/retries
"""

import os
import json
import re
import time
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional


# ============================================================
# CONFIGURATION
# ============================================================

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# Stable Gemini model suitable for high-volume text/code tasks.
GEMINI_MODEL = "gemini-2.5-flash"

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"


# Temporary Gemini errors that are safe to retry.
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}

# Number of attempts:
# 1 initial attempt + 2 retries = 3 total attempts.
MAX_RETRIES = 3

# Seconds between retries.
RETRY_DELAYS = [1, 3]


# ============================================================
# SYSTEM PROMPT — CODE ANALYSIS
# ============================================================

SYSTEM_ANALYSIS_PROMPT = """You are CodeFix AI, an expert programming tutor designed specifically for beginners and students.

Your goal is to analyze user-submitted code in Python, C, C++, Java, or JavaScript, detect any errors, explain them in simple, friendly, jargon-free English, and provide full corrected code.

CRITICAL INSTRUCTIONS:

1. Tone:
   Warm, encouraging, patient programming tutor.

2. Simplicity:
   Avoid confusing academic jargon.
   Explain concepts using real-world analogies or simple phrasing.

3. Line numbers:
   Accurately locate the line where the error or issue occurs.
   Line numbers are 1-indexed.
   If it is a whole-file or conceptual issue with unknown line, set line to null.

4. Corrected Code:
   Provide the COMPLETE, functional corrected version of the code.
   The corrected code must be properly formatted and ready to run.

5. If NO error is found:
   - set "hasError": false
   - set "errorType": "No Error"
   - set "errorMessage": "No syntax or runtime errors detected."
   - explain what the code does well
   - provide 2-3 clean code quality or optimization suggestions.

6. Never invent an error.
   If the code is valid, clearly say that it is valid.

7. Return ONLY valid JSON.
   Do not use Markdown code fences.
   Do not add explanations outside the JSON object.

You MUST reply ONLY with a single valid JSON object adhering strictly to this structure:

{
  "hasError": true,
  "errorType": "Syntax Error",
  "line": 5,
  "errorMessage": "Expected ':' after condition",
  "offendingCode": "if x > 10",
  "explanation": "Python requires a colon after an if condition to mark the start of the indented block.",
  "whyItHappened": "The if statement was written without the required colon at the end.",
  "howToFix": "Add ':' at the end of line 5: 'if x > 10:'.",
  "correctedCode": "# Full corrected code here...",
  "suggestions": [
    "Check the syntax of your if statements.",
    "Use consistent 4-space indentation."
  ]
}

Allowed errorType values:
"Syntax Error",
"Runtime Error",
"Logical Error",
"Warning",
"Code Quality Issue",
"Optimization Suggestion",
"No Error".
"""


# ============================================================
# JSON CLEANING
# ============================================================

def clean_json_response(raw_text: str) -> str:
    """
    Removes Markdown code fences and surrounding whitespace
    from Gemini's response.
    """

    text = raw_text.strip()

    # Remove ```json ... ```
    if text.startswith("```"):
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
# GEMINI REQUEST HELPER
# ============================================================

def _call_gemini(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sends a request to Gemini with retry handling.

    Retries temporary errors such as:
    429 Too Many Requests
    500 Internal Server Error
    502 Bad Gateway
    503 Service Unavailable
    504 Gateway Timeout
    """

    api_key = os.environ.get("GEMINI_API_KEY", "")

    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not configured in the environment."
        )

    url = (
        f"{GEMINI_API_BASE}/models/"
        f"{GEMINI_MODEL}:generateContent"
        f"?key={api_key}"
    )

    request_data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=request_data,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "CodeFix-AI/1.0"
        },
        method="POST"
    )

    last_error = None

    for attempt in range(MAX_RETRIES):

        try:
            with urllib.request.urlopen(req, timeout=45) as response:

                response_body = response.read().decode("utf-8")

                return json.loads(response_body)

        except urllib.error.HTTPError as http_err:

            status_code = http_err.code

            try:
                error_body = http_err.read().decode("utf-8")
            except Exception:
                error_body = ""

            last_error = http_err

            print(
                f"[Gemini] HTTP {status_code} "
                f"(attempt {attempt + 1}/{MAX_RETRIES})"
            )

            # Temporary Gemini problem.
            if status_code in RETRYABLE_STATUS_CODES:

                if attempt < MAX_RETRIES - 1:

                    delay = RETRY_DELAYS[
                        min(attempt, len(RETRY_DELAYS) - 1)
                    ]

                    print(
                        f"[Gemini] Temporary error. "
                        f"Retrying in {delay} second(s)..."
                    )

                    time.sleep(delay)
                    continue

                # All retries failed.
                raise RuntimeError(
                    f"Gemini API HTTP {status_code}: {error_body}"
                )

            # Permanent API error.
            raise RuntimeError(
                f"Gemini API HTTP {status_code}: {error_body}"
            )

        except urllib.error.URLError as url_err:

            last_error = url_err

            print(
                f"[Gemini] Network error "
                f"(attempt {attempt + 1}/{MAX_RETRIES}): {url_err}"
            )

            if attempt < MAX_RETRIES - 1:

                delay = RETRY_DELAYS[
                    min(attempt, len(RETRY_DELAYS) - 1)
                ]

                time.sleep(delay)
                continue

            raise RuntimeError(
                "Unable to connect to the Gemini API."
            )

        except json.JSONDecodeError as json_err:

            raise ValueError(
                f"Gemini returned invalid JSON: {str(json_err)}"
            )

        except Exception as err:

            last_error = err

            print(
                f"[Gemini] Unexpected error "
                f"(attempt {attempt + 1}/{MAX_RETRIES}): {err}"
            )

            if attempt < MAX_RETRIES - 1:

                delay = RETRY_DELAYS[
                    min(attempt, len(RETRY_DELAYS) - 1)
                ]

                time.sleep(delay)
                continue

            raise

    raise RuntimeError(
        f"Gemini request failed: {last_error}"
    )


# ============================================================
# EXTRACT GEMINI TEXT
# ============================================================

def _extract_gemini_text(response_data: Dict[str, Any]) -> str:
    """
    Extracts generated text from Gemini response.
    """

    candidates = response_data.get("candidates", [])

    if not candidates:
        raise ValueError(
            "No response was generated by Gemini."
        )

    content = candidates[0].get("content", {})

    parts = content.get("parts", [])

    if not parts:
        raise ValueError(
            "Gemini returned an empty response."
        )

    text_parts = []

    for part in parts:

        if isinstance(part, dict):

            text = part.get("text")

            if text:
                text_parts.append(text)

    if not text_parts:
        raise ValueError(
            "Gemini response did not contain text."
        )

    return "".join(text_parts).strip()


# ============================================================
# ANALYZE CODE
# ============================================================

def analyze_code_with_gemini(
    language: str,
    code: str,
    static_hints: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:

    """
    Sends code to Gemini for structured error analysis.
    """

    api_key = os.environ.get("GEMINI_API_KEY", "")

    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not configured in the environment."
        )

    # --------------------------------------------------------
    # Static analyzer context
    # --------------------------------------------------------

    static_context = ""

    if static_hints and static_hints.get("has_syntax_error"):

        static_context = (
            "\nStatic AST Parser Hint: "
            f"Detected potential syntax issue on line "
            f"{static_hints.get('line')}: "
            f"{static_hints.get('message')}. "
            f"Offending snippet: "
            f"'{static_hints.get('offending_line')}'"
        )

    # --------------------------------------------------------
    # User prompt
    # --------------------------------------------------------

    user_prompt = f"""Please analyze the following {language.upper()} code for errors, bugs, or improvements.

```{language}
{code}
