import re
from pathlib import Path

import anthropic

SKILL_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "cover_letter.md"
COVER_LETTER_SKILL_PATH = Path(
    "/Users/ivanr/Developer/cover-letter-maker/.claude/skills/cover-letter-generator/SKILL.md"
)
MAX_ITERATIONS = 10


def _load_system_prompt() -> str:
    """Load the cover_letter.md wrapper and inject the full skill content."""
    wrapper = SKILL_PROMPT_PATH.read_text(encoding="utf-8")
    skill = COVER_LETTER_SKILL_PATH.read_text(encoding="utf-8")
    # Insert the skill content after the introductory line and before the LaTeX section
    return wrapper.replace(
        "The full cover letter skill is injected below. Follow all of its guidance.",
        f"The full cover letter skill is injected below. Follow all of its guidance.\n\n{skill}",
    )


def _extract_latex(text: str) -> str:
    """Strip accidental markdown/commentary and return only the LaTeX document."""
    text = re.sub(r"```(?:latex|tex)?\s*", "", text)
    text = text.replace("```", "").strip()

    # Extract the LaTeX block — ignore any research notes or commentary before/after it
    match = re.search(r"(\\documentclass.*?\\end\{document\})", text, re.DOTALL)
    if match:
        return match.group(1).strip()

    return text


def _collect_text(content: list) -> str:
    """Collect all TextBlock text from a content list."""
    return "".join(block.text for block in content if hasattr(block, "text"))


def generate_latex(
    cv_text: str,
    job_description: str,
    company_name: str,
    template_content: str,
) -> str:
    """
    Call Claude with web_search enabled and return the generated LaTeX string.

    web_search_20250305 is a server-side tool: Anthropic executes searches and
    includes both ServerToolUseBlock and WebSearchToolResultBlock in the same
    assistant response content. We loop until stop_reason == "end_turn".
    """
    client = anthropic.Anthropic()
    system_prompt = _load_system_prompt()

    messages = [
        {
            "role": "user",
            "content": (
                f"## Company\n{company_name}\n\n"
                f"## Job Description\n{job_description}\n\n"
                f"## Candidate CV\n{cv_text}\n\n"
                f"## LaTeX Template\n"
                f"Use this template for structure and formatting only — "
                f"headers, fonts, spacing, and layout commands. "
                f"Rewrite ALL body text entirely from scratch.\n\n"
                f"{template_content}\n\n"
                f"## Instructions\n"
                f"1. Use web_search to research {company_name}: mission, values, "
                f"recent launches, culture, and anything relevant to this role.\n"
                f"2. Identify the candidate's top 2–3 strengths that match the JD "
                f"and any gaps to address.\n"
                f"3. Choose the most compelling opening hook from the system prompt "
                f"strategies (company knowledge, problem-solver, achievement, or industry insight). "
                f"Do NOT open with 'I am writing to apply' or start the letter with 'I'.\n"
                f"4. Apply the body paragraph formulas: "
                f"[Their Need] + [Your Experience] + [Specific Result].\n"
                f"5. Verify the quality checklist before outputting.\n"
                f"6. Return ONLY the complete, compilable LaTeX — no markdown, no explanation."
            ),
        }
    ]

    for _ in range(MAX_ITERATIONS):
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=4096,
            system=system_prompt,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=messages,
        )

        if response.stop_reason == "end_turn":
            latex = _collect_text(response.content)
            return _extract_latex(latex)

        # stop_reason == "tool_use": response.content contains both
        # ServerToolUseBlock and WebSearchToolResultBlock (server-side tool).
        # Pass the full content back as the assistant turn, then continue.
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": "Please continue."})

    raise RuntimeError("Claude did not finish within the allowed iterations.")
