"""
CodeFix AI - Safe Static Code Analyzer
Safely analyzes code using Python's built-in AST parser without executing any code.
"""

import ast
import sys
import json
from typing import Dict, Any, Optional

def analyze_python_ast(code: str) -> Dict[str, Any]:
    """
    Safely inspects Python code using Python's standard `ast` module.
    Returns syntax error details if any exist, or AST insights.
    NEVER uses eval() or exec().
    """
    if not code or not code.strip():
        return {
            "has_syntax_error": False,
            "error_type": "No Error",
            "message": "Empty code",
            "line": None,
            "column": None,
            "offending_line": ""
        }

    try:
        parsed_tree = ast.parse(code)
        
        # AST analysis checks for list index out of bounds and common issues
        list_sizes = {}
        for stmt in parsed_tree.body:
            # Track list assignments: e.g. numbers = [10, 20, 30]
            if isinstance(stmt, ast.Assign):
                for target in stmt.targets:
                    if isinstance(target, ast.Name) and isinstance(stmt.value, ast.List):
                        list_sizes[target.id] = len(stmt.value.elts)

        # Check for subscript index out of range on known literal lists
        for node in ast.walk(parsed_tree):
            if isinstance(node, ast.Subscript) and isinstance(node.value, ast.Name):
                var_name = node.value.id
                if var_name in list_sizes:
                    idx_val = None
                    # Python 3.9+ ast.Constant vs older ast.Index(ast.Num)
                    if isinstance(node.slice, ast.Constant) and isinstance(node.slice.value, int):
                        idx_val = node.slice.value
                    elif hasattr(node.slice, 'value') and isinstance(node.slice.value, ast.Constant) and isinstance(node.slice.value.value, int):
                        idx_val = node.slice.value.value
                    
                    list_len = list_sizes[var_name]
                    if idx_val is not None and (idx_val >= list_len or idx_val < -list_len):
                        lines = code.splitlines()
                        err_line = getattr(node, 'lineno', 1)
                        offending = lines[err_line - 1] if 1 <= err_line <= len(lines) else ""
                        return {
                            "has_syntax_error": True,
                            "error_type": "Index Error",
                            "message": f"IndexError: list index out of range on list '{var_name}' (size: {list_len}, requested index: {idx_val})",
                            "friendly_message": f"List '{var_name}' has {list_len} elements (valid indices 0 to {list_len - 1}). Accessing index {idx_val} is out of bounds.",
                            "line": err_line,
                            "column": getattr(node, 'col_offset', 0),
                            "offending_line": offending
                        }

        warnings = []
        for node in ast.walk(parsed_tree):
            if isinstance(node, ast.ExceptHandler) and node.type is None:
                warnings.append({
                    "line": getattr(node, 'lineno', None),
                    "warning": "Bare 'except:' clause catches all exceptions including SystemExit and KeyboardInterrupt. Prefer catching specific exceptions."
                })
        
        return {
            "has_syntax_error": False,
            "error_type": "No Error",
            "message": "Valid Python syntax",
            "line": None,
            "column": None,
            "offending_line": "",
            "warnings": warnings
        }
    except SyntaxError as err:
        lines = code.splitlines()
        offending_line = ""
        if err.lineno is not None and 1 <= err.lineno <= len(lines):
            offending_line = lines[err.lineno - 1]

        # Generate a beginner-friendly explanation for common syntax mistakes
        friendly_msg = err.msg
        if "expected ':'" in str(err.msg).lower():
            friendly_msg = "Expected a colon ':' at the end of the header statement (like if, for, while, def, class)."
        elif "unexpected EOF while parsing" in str(err.msg).lower() or "unclosed" in str(err.msg).lower():
            friendly_msg = "Parentheses, bracket, quote, or block was left unclosed."
        elif "invalid syntax" in str(err.msg).lower():
            friendly_msg = f"Invalid Python syntax near: '{offending_line.strip()}'"

        return {
            "has_syntax_error": True,
            "error_type": "Syntax Error",
            "message": str(err.msg),
            "friendly_message": friendly_msg,
            "line": err.lineno,
            "column": err.offset,
            "offending_line": offending_line
        }
    except Exception as general_err:
        return {
            "has_syntax_error": True,
            "error_type": "Syntax Error",
            "message": str(general_err),
            "line": None,
            "column": None,
            "offending_line": ""
        }

def perform_static_check(language: str, code: str) -> Dict[str, Any]:
    """
    Dispatcher for safe static checking by language.
    """
    lang = language.lower().strip()
    if lang == 'python':
        return analyze_python_ast(code)
    
    # Simple brace/parentheses balancing check for C / C++ / Java / JavaScript
    lines = code.splitlines()
    open_brackets = {'(': ')', '{': '}', '[': ']'}
    stack = []
    
    for line_idx, line in enumerate(lines, start=1):
        # Skip simple single line comments
        stripped = line.strip()
        if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
            continue
        for char in line:
            if char in open_brackets:
                stack.append((char, line_idx))
            elif char in open_brackets.values():
                if not stack:
                    return {
                        "has_syntax_error": True,
                        "error_type": "Syntax Error",
                        "message": f"Unexpected closing bracket '{char}'",
                        "line": line_idx,
                        "offending_line": line
                    }
                top_char, _ = stack.pop()
                if open_brackets[top_char] != char:
                    return {
                        "has_syntax_error": True,
                        "error_type": "Syntax Error",
                        "message": f"Mismatched bracket: expected '{open_brackets[top_char]}' but found '{char}'",
                        "line": line_idx,
                        "offending_line": line
                    }
                    
    if stack:
        unclosed_char, unclosed_line = stack[-1]
        return {
            "has_syntax_error": True,
            "error_type": "Syntax Error",
            "message": f"Unclosed '{unclosed_char}' starting on line {unclosed_line}",
            "line": unclosed_line,
            "offending_line": lines[unclosed_line - 1] if unclosed_line <= len(lines) else ""
        }

    return {
        "has_syntax_error": False,
        "error_type": "No Error",
        "message": "No obvious bracket mismatch",
        "line": None,
        "offending_line": ""
    }

if __name__ == '__main__':
    # CLI mode for Node / Subprocess integration
    if len(sys.argv) > 1:
        lang_arg = sys.argv[1]
        raw_code = sys.stdin.read() if len(sys.argv) == 2 else sys.argv[2]
        res = perform_static_check(lang_arg, raw_code)
        print(json.dumps(res))
