"""
Gemini AI Service for Code Analysis and Beginner-Friendly Tutoring.
"""

import os
import json
import re
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional


GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# Use a currently available Gemini Flash model.
GEMINI_MODEL = "gemini-3.5-flash-lite"


SYSTEM_ANALYSIS_PROMPT = """
You are CodeFix AI, an expert programming tutor designed specifically for beginners and students.

Your job is to analyze user-submitted code in Python, C, C++, Java, or JavaScript.

You must:
1. Detect syntax errors, runtime errors, logical errors, warnings, code quality issues, or optimization opportunities.
2. Explain problems using simple beginner-friendly English.
3. Accurately identify the problematic line when possible.
4. Provide the complete corrected code.
5. Be encouraging and clear.
6. If there is no error, explain what the code does well and provide 2-3 improvement suggestions.

Allowed errorType values:
"Syntax Error"
"Runtime Error"
"Logical Error"
"Warning"
"Code Quality Issue"
"Optimization Suggestion"
"No Error"

Return ONLY valid JSON.

The JSON must have this structure:

{
  "hasError": true,
  "errorType": "Syntax Error",
  "line": 5,
  "errorMessage": "Expected ':' after condition",
  "offendingCode": "if x > 10",
  "explanation": "Python requires a colon after an if condition.",
  "whyItHappened": "The if statement is missing the required colon.",
  "howToFix": "Add ':' at the end of the if statement.",
  "correctedCode": "complete corrected code",
  "suggestions": [
    "Use consistent indentation.",
    "Check Python statement syntax."
  ]
}
"""


def clean_json_response(raw_text: str) -> str:
    """
    Remove markdown code fences if Gemini returns JSON inside ```json ... ```.
    """
    text = (raw_text or "").strip()

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


def _get_gemini_url() -> str:
    """
    Build Gemini API URL.
    """
    if not GEMINI_API_KEY:
        raise ValueError(
            "GEMINI_API_KEY is not configured in the environment."
        )

    return (
        "https://generativelanguage.googleapis.com/"
        f"v1beta/models/{GEMINI_MODEL}:generateContent"
        f"?key={GEMINI_API_KEY}"
    )


def _send_gemini_request(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Send a request to Gemini and return decoded JSON.
    """

    url = _get_gemini_url()

    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "User-Agent": "CodeFix-AI",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            body = response.read().decode("utf-8")
            return json.loads(body)

    except urllib.error.HTTPError as http_error:
        try:
            error_body = http_error.read().decode("utf-8")
        except Exception:
            error_body = ""

        raise RuntimeError(
            f"Gemini API HTTP {http_error.code}: {error_body}"
        )

    except urllib.error.URLError as url_error:
        raise RuntimeError(
            f"Unable to connect to Gemini API: {url_error}"
        )

    except TimeoutError:
        raise RuntimeError(
            "Gemini API request timed out. Please try again."
        )


def _extract_gemini_text(response_data: Dict[str, Any]) -> str:
    """
    Extract generated text from Gemini response.
    """

    candidates = response_data.get("candidates", [])

    if not candidates:
        feedback = response_data.get("promptFeedback")

        if feedback:
            raise RuntimeError(
                f"Gemini did not generate a response: {feedback}"
            )

        raise RuntimeError(
            "Gemini returned no candidates."
        )

    candidate = candidates[0]

    content = candidate.get("content", {})
    parts = content.get("parts", [])

    if not parts:
        finish_reason = candidate.get("finishReason", "unknown")

        raise RuntimeError(
            f"Gemini returned no response text. Finish reason: {finish_reason}"
        )

    text_parts = []

    for part in parts:
        text = part.get("text")

        if text:
            text_parts.append(text)

    if not text_parts:
        raise RuntimeError(
            "Gemini response did not contain text."
        )

    return "".join(text_parts)


def analyze_code_with_gemini(
    language: str,
    code: str,
    static_hints: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Analyze source code using Gemini.
    """

    language = str(language or "unknown")
    code = str(code or "")

    static_context = ""

    if static_hints and static_hints.get("has_syntax_error"):
        static_context = (
            "\nStatic parser information:\n"
            f"Potential syntax issue on line "
            f"{static_hints.get('line')}.\n"
            f"Message: {static_hints.get('message', '')}\n"
            f"Offending line: "
            f"{static_hints.get('offending_line', '')}\n"
        )

    user_prompt = (
        "Please analyze the following "
        + language.upper()
        + " code for errors, bugs, or improvements.\n\n"
        + "CODE:\n"
        + "```"
        + language
        + "\n"
        + code
        + "\n```\n"
        + static_context
        + "\nReturn only the required JSON object."
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": user_prompt
                    }
                ]
            }
        ],
        "systemInstruction": {
            "parts": [
                {
                    "text": SYSTEM_ANALYSIS_PROMPT
                }
            ]
        },
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2,
        },
    }

    try:
        response_data = _send_gemini_request(payload)

        raw_text = _extract_gemini_text(response_data)

        cleaned_text = clean_json_response(raw_text)

        try:
            parsed = json.loads(cleaned_text)

        except json.JSONDecodeError as json_error:
            raise ValueError(
                "Gemini returned invalid JSON: "
                + str(json_error)
                + "\nResponse: "
                + cleaned_text[:1000]
            )

        if not isinstance(parsed, dict):
            raise ValueError(
                "Gemini returned JSON, but it was not an object."
            )

        suggestions = parsed.get("suggestions", [])

        if not isinstance(suggestions, list):
            suggestions = []

        return {
            "hasError": bool(
                parsed.get("hasError", False)
            ),
            "errorType": str(
                parsed.get("errorType", "No Error")
            ),
            "line": parsed.get("line"),
            "errorMessage": str(
                parsed.get(
                    "errorMessage",
                    "Analysis complete."
                )
            ),
            "offendingCode": str(
                parsed.get(
                    "offendingCode",
                    ""
                )
            ),
            "explanation": str(
                parsed.get(
                    "explanation",
                    ""
                )
            ),
            "whyItHappened": str(
                parsed.get(
                    "whyItHappened",
                    ""
                )
            ),
            "howToFix": str(
                parsed.get(
                    "howToFix",
                    ""
                )
            ),
            "correctedCode": str(
                parsed.get(
                    "correctedCode",
                    code
                )
            ),
            "suggestions": [
                str(item)
                for item in suggestions
            ],
        }

    except RuntimeError:
        raise

    except ValueError:
        raise

    except Exception as error:
        raise RuntimeError(
            "Unexpected error while analyzing code: "
            + str(error)
        )


def generate_chat_reply(
    message: str,
    language: str,
    code: str,
    analysis: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, str]]] = None,
) -> str:
    """
    Generate a beginner-friendly follow-up chat response.
    """

    language = str(language or "unknown")
    code = str(code or "")
    message = str(message or "")

    system_instruction = (
        "You are CodeFix AI, a patient and friendly programming tutor "
        "for beginner students.\n\n"
        "The user is working with "
        + language.upper()
        + ".\n\n"
        "Explain programming concepts simply and clearly.\n"
        "Be encouraging and concise.\n"
        "If the user asks for a step-by-step explanation, explain it "
        "step by step.\n"
        "If the user asks for another solution, provide a clean "
        "alternative.\n"
        "Use Markdown when useful."
    )

    analysis_context = ""

    if analysis:
        analysis_context = (
            "\nCURRENT ANALYSIS:\n"
            "Error Type: "
            + str(analysis.get("errorType", ""))
            + "\n"
            "Error Message: "
            + str(analysis.get("errorMessage", ""))
            + "\n"
            "Error Line: "
            + str(analysis.get("line", ""))
            + "\n"
            "Explanation: "
            + str(analysis.get("explanation", ""))
            + "\n"
            "Why It Happened: "
            + str(analysis.get("whyItHappened", ""))
            + "\n"
            "How To Fix: "
            + str(analysis.get("howToFix", ""))
            + "\n"
            "Corrected Code:\n"
            + str(analysis.get("correctedCode", ""))
            + "\n"
        )

    history_context = ""

    if history:
        recent_history = history[-10:]

        history_lines = []

        for item in recent_history:
            role = str(item.get("role", "user"))
            content = str(item.get("content", ""))

            history_lines.append(
                role.upper() + ": " + content
            )

        history_context = (
            "\nRECENT CHAT HISTORY:\n"
            + "\n".join(history_lines)
            + "\n"
        )

    prompt = (
        "CURRENT CODE:\n"
        + "```"
        + language
        + "\n"
        + code
        + "\n```\n"
        + analysis_context
        + history_context
        + "\nUSER QUESTION:\n"
        + message
        + "\n\n"
        + "Please answer the user's question in a helpful, "
        + "beginner-friendly way."
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ],
        "systemInstruction": {
            "parts": [
                {
                    "text": system_instruction
                }
            ]
        },
        "generationConfig": {
            "temperature": 0.4,
        },
    }

    try:
        response_data = _send_gemini_request(payload)

        return _extract_gemini_text(response_data)

    except RuntimeError:
        raise

    except Exception as error:
        raise RuntimeError(
            "Unexpected error while generating chat reply: "
            + str(error)
        )
