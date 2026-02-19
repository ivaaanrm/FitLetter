"""Test Claude agent (mocked — no real API calls)."""
from unittest.mock import MagicMock, patch
from services.claude_agent import generate_latex


def _mock_response(text: str, stop_reason: str = "end_turn"):
    block = MagicMock()
    block.text = text
    response = MagicMock()
    response.stop_reason = stop_reason
    response.content = [block]
    return response


def test_returns_latex_on_end_turn():
    with patch("services.claude_agent.anthropic.Anthropic") as MockClient:
        MockClient.return_value.messages.create.return_value = _mock_response(
            r"\documentclass{article}\begin{document}Hello\end{document}"
        )
        result = generate_latex("cv text", "job desc", "Acme", "template")
    assert r"\documentclass" in result


def test_strips_markdown_fences():
    with patch("services.claude_agent.anthropic.Anthropic") as MockClient:
        MockClient.return_value.messages.create.return_value = _mock_response(
            "```latex\n\\documentclass{article}\n```"
        )
        result = generate_latex("cv", "job", "Acme", "template")
    assert "```" not in result


def test_raises_after_max_iterations():
    tool_response = _mock_response("searching...", stop_reason="tool_use")
    tool_response.content = []  # no text blocks

    with patch("services.claude_agent.anthropic.Anthropic") as MockClient:
        MockClient.return_value.messages.create.return_value = tool_response
        try:
            generate_latex("cv", "job", "Acme", "template")
            assert False, "Should have raised"
        except RuntimeError as e:
            assert "iterations" in str(e)
