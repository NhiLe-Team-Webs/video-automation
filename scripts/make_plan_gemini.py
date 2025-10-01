"""Generate a flexible edit plan via Gemini LLM."""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List

import google.generativeai as genai
from dotenv import load_dotenv

TIMECODE_RE = re.compile(r"^(?P<start>\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(?P<end>\d{2}:\d{2}:\d{2},\d{3})$")
JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)


@dataclass
class SrtEntry:
    index: int
    start: str
    end: str
    text: str

    @property
    def text_one_line(self) -> str:
        return " ".join(line.strip() for line in self.text.splitlines() if line.strip())


def seconds_from_timecode(value: str) -> float:
    hours, minutes, remainder = value.split(":")
    seconds, millis = remainder.split(",")
    return int(hours) * 3600 + int(minutes) * 60 + int(seconds) + int(millis) / 1000


def parse_srt(path: Path, *, max_entries: int | None = None) -> List[SrtEntry]:
    content = path.read_text(encoding="utf-8")
    blocks = re.split(r"\n\s*\n", content.strip())
    entries: List[SrtEntry] = []
    for block in blocks:
        lines = [line for line in block.splitlines() if line.strip()]
        if len(lines) < 2:
            continue
        try:
            idx = int(lines[0])
        except ValueError:
            idx = len(entries) + 1
        match = TIMECODE_RE.match(lines[1])
        if not match:
            continue
        text = "\n".join(lines[2:]) if len(lines) > 2 else ""
        entries.append(SrtEntry(index=idx, start=match.group("start"), end=match.group("end"), text=text))
        if max_entries and len(entries) >= max_entries:
            break
    return entries


def build_prompt(entries: Iterable[SrtEntry], *, extra_instructions: str | None = None) -> str:
    timeline_lines = []
    for entry in entries:
        snippet = entry.text_one_line
        timeline_lines.append(f"{entry.index}. [{entry.start} -> {entry.end}] {snippet}")
    transcript_section = "\n".join(timeline_lines)

    schema_hint = {
        "segments": [
            {"start": 0.0, "end": 6.4, "timeline_start": 0.0}
        ],
        "actions": [
            {
                "type": "zoom",
                "start": 2.1,
                "end": 4.3,
                "scale": 1.12,
                "source_start": 20.5,
                "source_end": 22.7,
            }
        ],
        "audio": {"filters": {"highpass_hz": 120.0, "lowpass_hz": None}},
        "meta": {"style": "motivational", "notes": ["trim long pauses"]},
    }

    instructions = (
        "You are an assistant video editor. Create a JSON plan that trims filler pauses, "
        "groups sentences into engaging segments, and suggests dynamic actions (zoom, transitions, sfx). "
        "Tailor the pacing so motivational peaks receive stronger emphasis."
    )
    if extra_instructions:
        instructions += f" Extra guidance from user: {extra_instructions.strip()}"

    prompt = (
        f"{instructions}\n\n"
        "Output strictly valid JSON using this schema (example values shown, update as needed):\n"
        f"{json.dumps(schema_hint, indent=2)}\n\n"
        "Rules:\n"
        "- `segments` holds chronological sections with `start`, `end`, `timeline_start`.\n"
        "- Trim or merge entries when pauses exceed ~0.7 seconds unless dramatic pause required.\n"
        "- `actions` may include `zoom`, `transition`, `sfx`, or `caption` items with precise timing in seconds.\n"
        "- Keep `timeline_start` contiguous (no gaps).\n"
        "- Suggest only assets that exist or use placeholders like `assets/transition_soft.mp4`.\n"
        "- If unsure about an action, omit it.\n"
        "- Use floats for all times.\n"
        "- All the sfx name: applause.mp3 camera-click.mp3 cartoon-slip.mp3 ding.mp3 notification.mp3 shocking.mp3 studio-audience-awwww-sound-fx.mp3 throw.mp3 woosh.mp3\n"
        "- Include optional `notes` inside `meta` for human editors.\n"
        "Respond with JSON only inside a single code block.\n\n"
        "Transcript segments (ordered):\n"
        f"{transcript_section}\n"
    )
    return prompt


def extract_plan_json(text: str) -> dict:
    candidates: List[str] = []
    for match in JSON_BLOCK_RE.finditer(text):
        candidates.append(match.group(1).strip())
    if not candidates:
        candidates.append(text.strip())

    last_error: Exception | None = None
    for candidate in candidates:
        for cleaned in (candidate, candidate.replace("\r", "")):
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError as exc:
                last_error = exc
                continue
    raise ValueError(f"Could not parse JSON from LLM response: {last_error}")


def configure_client(model_name: str | None = None) -> genai.GenerativeModel:
    root_dir = Path(__file__).resolve().parents[1]
    load_dotenv(root_dir / ".env")
    load_dotenv()  # load defaults if present

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY. Add it to .env or environment variables.")

    genai.configure(api_key=api_key)
    resolved_model = model_name or os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    return genai.GenerativeModel(resolved_model)


def dump_plan(plan: dict, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(plan, handle, indent=2)
        handle.write("\n")


def main(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate edit plan with Gemini")
    parser.add_argument("srt_path", type=Path, help="Input SRT transcript")
    parser.add_argument("output_plan", type=Path, help="Destination JSON plan file")
    parser.add_argument("--model", dest="model_name", help="Override Gemini model name")
    parser.add_argument(
        "--max-entries",
        type=int,
        default=160,
        help="Limit number of SRT entries sent to Gemini",
    )
    parser.add_argument(
        "--extra",
        dest="extra_instructions",
        help="Optional free-form instructions appended to the prompt",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the prompt without calling Gemini",
    )

    args = parser.parse_args(argv)

    if not args.srt_path.exists():
        parser.error(f"SRT file not found: {args.srt_path}")

    entries = parse_srt(args.srt_path, max_entries=args.max_entries)
    if not entries:
        parser.error("No valid entries found in SRT")

    prompt = build_prompt(entries, extra_instructions=args.extra_instructions)

    if args.dry_run:
        print(prompt)
        return 0

    try:
        model = configure_client(args.model_name)
    except Exception as exc:  # noqa: BLE001 - surface friendly message
        print(f"[ERROR] {exc}")
        return 1

    try:
        response = model.generate_content(prompt)
    except Exception as exc:  # noqa: BLE001 - Gemini client may raise many types
        print(f"[ERROR] Gemini request failed: {exc}")
        return 1

    raw_text = getattr(response, "text", None)
    if not raw_text:
        print("[ERROR] Empty response from Gemini")
        return 1

    try:
        plan = extract_plan_json(raw_text)
    except ValueError as exc:
        print(f"[ERROR] {exc}")
        print("--- Gemini response ---")
        print(raw_text)
        print("--- end response ---")
        return 1

    dump_plan(plan, args.output_plan)
    print(f"[PLAN] Saved Gemini plan to {args.output_plan}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
