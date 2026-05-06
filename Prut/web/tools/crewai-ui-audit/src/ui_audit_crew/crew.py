from __future__ import annotations

import os
import pathlib

import yaml
from crewai import Agent, Crew, LLM, Process, Task


def _load_yaml(path: pathlib.Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def _build_llm() -> LLM:
    """
    Prefer Mistral (stable availability), fall back to Groq.
    We explicitly set the provider-prefixed model so CrewAI doesn't fall back to OpenAI.
    """
    groq_key = os.getenv("GROQ_API_KEY")
    mistral_key = os.getenv("MISTRAL_API_KEY")

    if mistral_key:
        return LLM(model=os.getenv("CREWAI_MODEL", "mistral/mistral-large-latest"), api_key=mistral_key)
    if groq_key:
        # Groq models deprecate frequently; allow override via CREWAI_MODEL.
        return LLM(model=os.getenv("CREWAI_MODEL", "groq/llama-3.3-70b-versatile"), api_key=groq_key)

    raise RuntimeError("No GROQ_API_KEY or MISTRAL_API_KEY found in environment.")


def _truncate(text: str, max_chars: int = 12000) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + f"\n...[truncated, {len(text) - max_chars} chars omitted]"


def build_crew(*, config_dir: pathlib.Path, out_dir: pathlib.Path, inputs: dict) -> Crew:
    agents_cfg = _load_yaml(config_dir / "agents.yaml")
    tasks_cfg = _load_yaml(config_dir / "tasks.yaml")

    llm = _build_llm()

    base_url = inputs.get("base_url", "")
    sitemap_md = inputs.get("sitemap_urls_md", "").strip()
    pages_json = _truncate(inputs.get("pages_notes_json", "[]"))
    known_issue = inputs.get("known_issue", "")

    # Build data preamble injected into every audit task so agents see real page data.
    data_preamble = f"""
=== REAL AUDIT DATA — USE THIS, DO NOT INVENT URLS OR PAGES ===

Base URL: {base_url}

Crawled URLs (from actual sitemap):
{sitemap_md}

Page DOM extractions (title, headings, buttons, inputs, sticky elements, dir attributes, images missing alt, console errors):
{pages_json}

Known issue to verify: {known_issue}

IMPORTANT: Only report issues for the URLs listed above. Do NOT invent generic "example.com" pages.
If you find an issue, cite the exact URL (e.g. {base_url}/pricing) and the specific element
(e.g. the button text or heading) from the DOM data above.
=== END REAL AUDIT DATA ===

"""

    # Agents
    site_mapper = Agent(**agents_cfg["site_mapper"], llm=llm, verbose=True, allow_delegation=False)
    ui_qa = Agent(**agents_cfg["ui_qa"], llm=llm, verbose=True, allow_delegation=False)
    rtl_specialist = Agent(**agents_cfg["rtl_specialist"], llm=llm, verbose=True, allow_delegation=False)
    platform_engineer = Agent(**agents_cfg["platform_engineer"], llm=llm, verbose=True, allow_delegation=False)
    editor = Agent(**agents_cfg["editor"], llm=llm, verbose=True, allow_delegation=False)

    # Tasks (we write outputs to disk for easy consumption)
    t_map = Task(
        description=data_preamble + tasks_cfg["map_urls"]["description"],
        expected_output=tasks_cfg["map_urls"]["expected_output"],
        agent=site_mapper,
        output_file=str(out_dir / "mapped_urls.md"),
    )

    t_ui = Task(
        description=data_preamble + tasks_cfg["ui_audit"]["description"],
        expected_output=tasks_cfg["ui_audit"]["expected_output"],
        agent=ui_qa,
        context=[t_map],
        output_file=str(out_dir / "issue_list.md"),
    )

    t_rtl = Task(
        description=data_preamble + tasks_cfg["rtl_audit"]["description"],
        expected_output=tasks_cfg["rtl_audit"]["expected_output"],
        agent=rtl_specialist,
        context=[t_map],
        output_file=str(out_dir / "rtl_issues.md"),
    )

    t_big = Task(
        description=data_preamble + tasks_cfg["big_improvements"]["description"],
        expected_output=tasks_cfg["big_improvements"]["expected_output"],
        agent=platform_engineer,
        output_file=str(out_dir / "big_improvements.md"),
    )

    # Final report prompt for an implementation agent
    t_final = Task(
        description=tasks_cfg["final_report"]["description"],
        expected_output=tasks_cfg["final_report"]["expected_output"],
        agent=editor,
        context=[t_ui, t_rtl, t_big],
        output_file=str(out_dir / "prompt_for_fix_agent.md"),
    )

    return Crew(
        agents=[site_mapper, ui_qa, rtl_specialist, platform_engineer, editor],
        tasks=[t_map, t_ui, t_rtl, t_big, t_final],
        process=Process.sequential,
        verbose=True,
        # CrewAI memory currently defaults to OpenAI embeddings; disable to avoid OPENAI_API_KEY requirement.
        memory=False,
        cache=True,
    )

