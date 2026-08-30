"""
Gemini AI Service for Code Analysis and Beginner-Friendly Tutoring.
"""

import os
import json
import re
from typing import Dict, Any, List, Optional
import urllib.request
import urllib.error


GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# Use a currently supported Gemini model.
GEMINI_MODEL = "gemini-2.5-flash"


SYSTEM_ANALYSIS_PROMPT = """
You are CodeFix AI, an expert programming tutor designed specifically for
beginners and students.

Your job is to analyze user-submitted code in Python, C, C++, Java, or
JavaScript.

You must:
1. Detect syntax errors, runtime errors, logical errors, warnings, and code
   quality issues.
2. Explain the problem using simple beginner-friendly English.
3. Identify the correct line number when possible. Line numbers start at 1.
4. Provide the COMPLETE corrected code.
5. Explain why the error happened.
6. Explain exactly how to fix it.
7. Provide useful suggestions.

If there is no error:
- hasError must be false.
- errorType must be "No Error".
- errorMessage must be "No syntax or runtime errors detected."
- Explain what the code does well.
- Provide 2-3 code quality or optimization suggestions.

Be warm, encouraging, and patient.

Do not use unnecessary technical jargon.

You MUST return ONLY ONE valid JSON object.

Use exactly this structure:

{
  "hasError": true,
  "errorType": "Syntax Error",
  "line": 5,
  "errorMessage": "Expected ':' after condition",
  "offendingCode": "if x > 10",
  "explanation": "Python requires a colon after an if condition.",
  "whyItHappened": "The if statement was written without the required colon.",
  "howToFix": "Add ':' at the end of the if statement.",
  "correctedCode": "# Complete corrected code",
  "suggestions": [
    "Use consistent indentation.",
    "Check the syntax of conditional statements."
  ]
}

Allowed errorType values:
- "Syntax Error"
- "Runtime Error"
- "Logical Error"
- "Warning"
- "Code Quality Issue"
- "Optimization Suggestion"
- "No Error"
"""


def clean_json_response(raw_text: str) -> str:
    """
    Removes Markdown code fences from an AI response.
    """

    text = raw_text.strip()

    if text.startswith("```"):
        text = re.sub(
            r"^```(?:json)?\s*",
            "",
            text,
            flags=re.IGNORECASE,
        )

        text = re.sub(
            r"\s*```$",
            "",
            text,
        )

    return text.strip()


def analyze_code_with_gemini(
    language: str,
    code: str,
    static_hints: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Sends code to Gemini and returns structured analysis.
    """

    api_key = os.environ.get("GEMINI_API_KEY", "")

    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not configured in the environment."
        )

    static_context = ""

    if static_hints and static_hints.get("has_syntax_error"):
        static_context = (
            "\nStatic parser hint: "
            f"Potential syntax issue on line "
            f"{static_hints.get('line')}: "
            f"{static_hints.get('message')}. "
            f"Offending code: "
            f"{static_hints.get('offending_line')}"
        )

    user_prompt = f"""
Please analyze the following {language.upper()} code.

Code:

```{language}
{code}
