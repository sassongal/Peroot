#!/usr/bin/env python3
import json
import sqlite3
import sys
from pathlib import Path


def resolve_path(path_str, base_dir):
    path = Path(path_str)
    return path if path.is_absolute() else base_dir / path


def main():
    base_dir = Path(__file__).resolve().parent
    db_path = resolve_path(sys.argv[1], base_dir) if len(sys.argv) > 1 else base_dir / "prompts.sqlite"
    json_path = resolve_path(sys.argv[2], base_dir) if len(sys.argv) > 2 else base_dir / "prompts.he.json"
    schema_path = resolve_path(sys.argv[3], base_dir) if len(sys.argv) > 3 else base_dir / "prompts_index.sql"

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.executescript(schema_path.read_text(encoding="utf-8"))
    cur.execute("DELETE FROM prompts")

    data = json.loads(Path(json_path).read_text(encoding="utf-8"))
    for item in data:
        cur.execute(
            "INSERT INTO prompts (id, title_he, category, use_case, prompt_he, variables_json, output_format, quality_checks_json, source_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                item["id"],
                item["title_he"],
                item["category"],
                item["use_case"],
                item["prompt_he"],
                json.dumps(item["variables"], ensure_ascii=False),
                item["output_format"],
                json.dumps(item["quality_checks"], ensure_ascii=False),
                json.dumps(item["source"], ensure_ascii=False),
            ),
        )

    conn.commit()
    conn.close()


if __name__ == "__main__":
    main()
