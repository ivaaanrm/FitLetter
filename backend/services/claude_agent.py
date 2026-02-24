import re
from pathlib import Path

import anthropic

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "cover_letter.md"
SKILL_PATH = Path(__file__).parent.parent.parent / ".claude" / "skills" / "cover-letter-generator" / "SKILL.md"


def _load_system_prompt(has_template: bool) -> str:
    """Load the base prompt. Only inject the full skill when no template is provided."""
    prompt = PROMPT_PATH.read_text(encoding="utf-8")
    if not has_template and SKILL_PATH.exists():
        prompt += f"\n\n## Skill Reference\n\n{SKILL_PATH.read_text(encoding='utf-8')}"
    return prompt


def _extract_latex(text: str) -> str:
    text = re.sub(r"```(?:latex|tex)?\s*", "", text)
    text = text.replace("```", "").strip()
    match = re.search(r"(\\documentclass.*?\\end\{document\})", text, re.DOTALL)
    return match.group(1).strip() if match else text


def generate_latex(
    cv_text: str,
    job_description: str,
    company_name: str,
    template_content: str | None,
    *,
    api_key: str,
) -> str:
    client = anthropic.Anthropic(api_key=api_key)
    system_prompt = _load_system_prompt(has_template=bool(template_content))

    if template_content:
        template_section = f"## Template (preserve formatting, minimal text changes)\n\n{template_content}"
    else:
        template_section = (
            "No template — create a clean LaTeX cover letter from scratch."
        )

    user_message = (
        f"Company: {company_name}\n\n"
        f"## Job Description\n{job_description}\n\n"
        f"## CV\n{cv_text}\n\n"
        f"{template_section}"
    )

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    latex = "".join(b.text for b in response.content if hasattr(b, "text"))
    return _extract_latex(latex)
