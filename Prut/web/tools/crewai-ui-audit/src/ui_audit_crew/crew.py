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


def build_crew(*, config_dir: pathlib.Path, out_dir: pathlib.Path, inputs: dict) -> Crew:
    agents_cfg = _load_yaml(config_dir / "agents.yaml")
    tasks_cfg = _load_yaml(config_dir / "tasks.yaml")

    llm = _build_llm()

    # Agents
    site_mapper = Agent(**agents_cfg["site_mapper"], llm=llm, verbose=True, allow_delegation=False)
    ui_qa = Agent(**agents_cfg["ui_qa"], llm=llm, verbose=True, allow_delegation=False)
    rtl_specialist = Agent(**agents_cfg["rtl_specialist"], llm=llm, verbose=True, allow_delegation=False)
    platform_engineer = Agent(**agents_cfg["platform_engineer"], llm=llm, verbose=True, allow_delegation=False)
    editor = Agent(**agents_cfg["editor"], llm=llm, verbose=True, allow_delegation=False)

    # Tasks (we write outputs to disk for easy consumption)
    t_map = Task(
        description=tasks_cfg["map_urls"]["description"],
        expected_output=tasks_cfg["map_urls"]["expected_output"],
        agent=site_mapper,
        output_file=str(out_dir / "mapped_urls.md"),
    )

    t_ui = Task(
        description=tasks_cfg["ui_audit"]["description"],
        expected_output=tasks_cfg["ui_audit"]["expected_output"],
        agent=ui_qa,
        context=[t_map],
        output_file=str(out_dir / "issue_list.md"),
    )

    t_rtl = Task(
        description=tasks_cfg["rtl_audit"]["description"],
        expected_output=tasks_cfg["rtl_audit"]["expected_output"],
        agent=rtl_specialist,
        context=[t_map],
        output_file=str(out_dir / "rtl_issues.md"),
    )

    t_big = Task(
        description=tasks_cfg["big_improvements"]["description"],
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

