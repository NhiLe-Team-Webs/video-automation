"""Generate a flexible edit plan via Gemini LLM."""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List

import google.generativeai as genai
from dotenv import load_dotenv

TIMECODE_RE = re.compile(r"^(?P<start>\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(?P<end>\d{2}:\d{2}:\d{2},\d{3})$")
JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)

AVAILABLE_SFX: Dict[str, str] = {
    "applause.mp3": "assets/sfx/emotion/applause.mp3",
    "boing.mp3": "assets/sfx/cartoon/boing.mp3",
    "cartoon-slip.mp3": "assets/sfx/cartoon/cartoon-slip.mp3",
    "throw.mp3": "assets/sfx/cartoon/throw.mp3",
    "shock.mp3": "assets/sfx/emotion/shock.mp3",
    "disapointed.mp3": "assets/sfx/emotion/disapointed.mp3",
    "ding.mp3": "assets/sfx/emphasis/ding.mp3",
    "camera-click.mp3": "assets/sfx/tech/camera-click.mp3",
    "tech-notification.mp3": "assets/sfx/tech/notification.mp3",
    "bubble-pop.mp3": "assets/sfx/ui/bubble-pop.mp3",
    "keyboard-typing.mp3": "assets/sfx/ui/keyboard-typing.mp3",
    "mouse-click.mp3": "assets/sfx/ui/mouse-click.mp3",
    "ui-notification.mp3": "assets/sfx/ui/notification.mp3",
    "pop.mp3": "assets/sfx/ui/pop.mp3",
    "swipe.mp3": "assets/sfx/ui/swipe.mp3",
    "woosh.mp3": "assets/sfx/whoosh/woosh.mp3",
}
AVAILABLE_TRANSITION_ASSETS: Dict[str, str] = {}
TRANSITION_STYLES = ["flash-white", "dip-to-black", "spotlight-rise"]
CAPTION_STYLES = ["highlight-yellow", "center-pop", "lower-third"]
MAX_RECOMMENDED_ZOOMS = 6
MIN_ZOOM_GAP_SECONDS = 8.0
MAX_CAPTION_ACTIONS = 5


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


def _format_available(values: Iterable[str]) -> str:
    return ", ".join(values)


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
                "start": 1.5,
                "end": 4.2,
                "scale": 1.18,
            },
            {
                "type": "sfx",
                "asset": "assets/sfx/ding.mp3",
                "time": 4.2,
            },
            {
                "type": "caption",
                "text": "KEY IDEA: Stay consistent",
                "time": 4.2,
                "duration": 2.2,
                "style": "highlight-yellow",
            },
            {
                "type": "transition",
                "style": "flash-white",
                "time": 6.4,
                "duration": 0.45,
            },
        ],
        "audio": {"filters": {"highpass_hz": 120.0, "lowpass_hz": None}},
        "meta": {
            "style": "motivational",
            "notes": ["trim long pauses"],
        },
    }

    sfx_options = _format_available(AVAILABLE_SFX.values())
    sfx_names = _format_available(AVAILABLE_SFX.keys())
    transition_styles = _format_available(TRANSITION_STYLES)
    caption_styles = _format_available(CAPTION_STYLES)

    instructions = (
        "You are an assistant video editor. Create a JSON plan that trims filler pauses, "
        "groups sentences into engaging segments, and layers in tasteful zooms, highlight captions, sound effects, and transitions. "
        "Pick SFX from the library in assets/sfx to match the emotion (applause for big wins, woosh/swipe for movement, cartoon hits for humor). "
        "Use smooth zooms (1.1-1.22) on the most impactful statements, and reserve transitions for clear topic or energy shifts. "
        "Limit highlight captions to the strongest takeaways and keep the edit feeling cinematic, not hectic."
    )
    if extra_instructions:
        instructions += f" Extra guidance from user: {extra_instructions.strip()}"

    prompt = (
        f"{instructions}\n\n"
        "Output strictly valid JSON using this schema (example values shown, update as needed):\n"
        f"{json.dumps(schema_hint, indent=2)}\n\n"
        "Rules:\n"
        "- `segments` hold chronological sections with `start`, `end`, `timeline_start` (floats in seconds).\n"
        "- Trim or merge entries when pauses exceed ~0.7s unless the silence is dramatic.\n"
        f"- Keep the number of `zoom` actions <= {MAX_RECOMMENDED_ZOOMS} and space them >= {MIN_ZOOM_GAP_SECONDS}s apart. Use scale between 1.1 and 1.22.\n"
        "- Use `sfx` objects with `asset` + `time` (seconds). Assets must live under `assets/sfx/` in this project. Available assets: " + sfx_options + " (names: " + sfx_names + "). Match tone to category (e.g., `applause.mp3` for wins, `woosh.mp3` for motion, `bubble-pop.mp3` for playful emphasis).\n"
        "- Add highlight `caption` actions (with `text`, `time`, `duration`, optional `style`) for the biggest takeaways. Allowed styles: " + caption_styles + ". Keep captions short (2-4s) and no more than " + str(MAX_CAPTION_ACTIONS) + " total. Pair key captions with supportive SFX.\n"
        "- `transition` actions may specify an `asset` (video overlay) or a `style` from: " + transition_styles + ". Use them sparingly to bridge major section changes, ideally with complementary SFX.\n"
        "- Keep `timeline_start` contiguous (no gaps).\n"
        "- Use floats for all times/durations.\n"
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


def ensure_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def resolve_catalog(asset: str | None, catalog: Dict[str, str], prefix: str) -> str | None:
    if not asset:
        return None
    if asset in catalog:
        return catalog[asset]
    if asset.startswith("assets/"):
        return asset
    return f"{prefix}{asset}"


def normalize_plan(plan: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(plan, dict):
        raise ValueError("Plan must be a JSON object.")

    segments = plan.get("segments")
    if isinstance(segments, list):
        for segment in segments:
            if not isinstance(segment, dict):
                continue
            for key in ("start", "end", "timeline_start"):
                if key in segment:
                    segment[key] = ensure_float(segment.get(key))
        segments.sort(key=lambda seg: seg.get("timeline_start", seg.get("start", 0.0)))

    normalized_actions: List[Dict[str, Any]] = []
    zoom_count = 0
    last_zoom_time = -1e9
    caption_count = 0

    for raw_action in plan.get("actions", []):
        if not isinstance(raw_action, dict):
            continue
        action_type = (raw_action.get("type") or "").lower()
        if not action_type:
            continue
        action: Dict[str, Any] = dict(raw_action)
        action["type"] = action_type

        if action_type == "zoom":
            start_time = ensure_float(action.get("start", action.get("time")))
            end_time = ensure_float(action.get("end", start_time + 1.5))
            if end_time <= start_time:
                end_time = start_time + 1.2
            scale = ensure_float(action.get("scale", 1.14))
            scale = max(1.05, min(1.22, scale))
            if zoom_count >= MAX_RECOMMENDED_ZOOMS or start_time - last_zoom_time < MIN_ZOOM_GAP_SECONDS:
                continue
            last_zoom_time = start_time
            zoom_count += 1
            action.update({"start": start_time, "end": end_time, "scale": scale})
            action.pop("time", None)
            for key in ("source_start", "source_end"):
                if key in action:
                    action[key] = ensure_float(action.get(key))

        elif action_type == "sfx":
            asset = action.get("asset") or action.get("name")
            asset = resolve_catalog(asset, AVAILABLE_SFX, "assets/sfx/")
            time_value = ensure_float(action.get("time", action.get("start")))
            action = {"type": "sfx", "asset": asset, "time": time_value}

        elif action_type == "transition":
            asset = action.get("asset") or action.get("name")
            asset = resolve_catalog(asset, AVAILABLE_TRANSITION_ASSETS, "assets/transition/")
            style = (action.get("style") or "").lower()
            if style and style not in TRANSITION_STYLES:
                style = TRANSITION_STYLES[0]
            if not style and not asset:
                style = TRANSITION_STYLES[0]
            time_value = ensure_float(action.get("time", action.get("start")))
            duration = max(0.25, ensure_float(action.get("duration", action.get("length", 0.5))))
            duration = max(0.3, min(duration, 1.0))
            action = {
                "type": "transition",
                "time": time_value,
                "duration": duration,
                "asset": asset,
                "style": style or None,
            }

        elif action_type == "caption":
            if caption_count >= MAX_CAPTION_ACTIONS:
                continue
            text = (action.get("text") or action.get("title") or "").strip()
            if not text:
                continue
            time_value = ensure_float(action.get("time", action.get("start")))
            duration = ensure_float(action.get("duration"))
            if not duration and action.get("end") is not None:
                duration = ensure_float(action.get("end")) - time_value
            if duration <= 0:
                duration = 2.5
            duration = max(1.5, min(duration, 5.0))
            style = (action.get("style") or CAPTION_STYLES[0]).lower()
            if style not in CAPTION_STYLES:
                style = CAPTION_STYLES[0]
            position = action.get("position")
            action = {
                "type": "caption",
                "text": text,
                "time": time_value,
                "duration": duration,
                "style": style,
            }
            if position:
                action["position"] = position
            caption_count += 1

        else:
            normalized_actions.append(action)
            continue

        normalized_actions.append(action)

    plan["actions"] = normalized_actions
    meta = plan.setdefault("meta", {})
    meta.setdefault("max_zoom_actions", MAX_RECOMMENDED_ZOOMS)
    return plan


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
        plan = normalize_plan(plan)
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



