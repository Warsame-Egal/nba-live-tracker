"""
Recover truncated or markdown-wrapped JSON from Groq API responses.
"""

import json
import logging

logger = logging.getLogger(__name__)


def recover_truncated_json(content: str) -> dict | list | None:
    """
    Attempt to recover a truncated JSON string from Groq.
    Strips markdown code fences, tries direct parse, then tries closing open brackets.
    Returns parsed dict or list, or None if recovery fails.
    """
    if not content or not content.strip():
        return None

    # Strip markdown fences
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0].strip()
    elif "```" in content:
        content = content.split("```")[1].split("```")[0].strip()

    # Try direct parse
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # Try closing open strings and brackets
    try:
        fixed = _fix_truncated(content)
        return json.loads(fixed)
    except (json.JSONDecodeError, ValueError):
        pass

    logger.debug("JSON recovery failed after all attempts")
    return None


def _fix_truncated(content: str) -> str:
    """Close open strings and brackets in truncated JSON."""
    in_string = False
    escape_next = False
    result = []

    for char in content:
        if escape_next:
            result.append(char)
            escape_next = False
            continue
        if char == "\\":
            result.append(char)
            escape_next = True
            continue
        if char == '"':
            in_string = not in_string
        result.append(char)

    if in_string:
        result.append('"')

    fixed = "".join(result).rstrip().rstrip(",")
    open_brackets = fixed.count("[") - fixed.count("]")
    open_braces = fixed.count("{") - fixed.count("}")

    if open_brackets > 0:
        fixed += "]" * open_brackets
    if open_braces > 0:
        fixed += "}" * open_braces

    return fixed
