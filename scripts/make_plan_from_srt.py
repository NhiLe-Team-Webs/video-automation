import json
import math
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

WORD_RE = re.compile(r"[\w']+", re.UNICODE)


def normalize(text: str) -> str:
    """Lowercase and strip accents so keyword matching is more tolerant."""
    lowered = text.lower()
    decomposed = unicodedata.normalize("NFD", lowered)
    without_accents = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    return unicodedata.normalize("NFC", without_accents)


def hms_to_seconds(timestamp: str) -> float:
    hours, minutes, remainder = timestamp.split(":")
    seconds, millis = remainder.split(",")
    return int(hours) * 3600 + int(minutes) * 60 + int(seconds) + int(millis) / 1000.0


def load_mapping(mapping_path: Path) -> dict:
    with mapping_path.open("r", encoding="utf-8") as handle:
        mapping = json.load(handle)
    mapping.setdefault("filler_phrases", [])
    mapping.setdefault("filler_ratio_threshold", 0.6)
    mapping.setdefault("min_segment_duration", 1.0)
    mapping.setdefault("merge_gap_seconds", 0.5)
    mapping.setdefault("sfx_rules", [])
    mapping.setdefault("zoom_rules", [])
    mapping.setdefault("zoom_default_scale", 1.1)
    mapping.setdefault("transition", {})
    mapping.setdefault("noise_reduction", {})

    mapping["filler_phrases"] = [normalize(phrase) for phrase in mapping["filler_phrases"]]
    for rule in mapping["sfx_rules"]:
        rule.setdefault("keywords", [])
        rule["keywords"] = [normalize(keyword) for keyword in rule["keywords"]]
        rule.setdefault("cooldown", 8.0)
        rule.setdefault("offset", 0.0)
    for rule in mapping["zoom_rules"]:
        rule.setdefault("keywords", [])
        rule["keywords"] = [normalize(keyword) for keyword in rule["keywords"]]
        rule.setdefault("scale", mapping["zoom_default_scale"])
        rule.setdefault("min_duration", 1.0)
        rule.setdefault("cooldown", 6.0)

    transition_cfg = mapping["transition"]
    transition_cfg.setdefault("asset", "")
    transition_cfg.setdefault("gap_threshold", 1.0)
    transition_cfg.setdefault("duration", 0.5)

    return mapping


def compute_filler_ratio(tokens, text, filler_phrases) -> float:
    if not tokens:
        return 1.0

    total = len(tokens)
    filler_hits = 0

    token_counts = defaultdict(int)
    for token in tokens:
        token_counts[token] += 1

    for phrase in filler_phrases:
        if " " in phrase:
            if phrase in text:
                filler_hits += len(phrase.split())
        else:
            filler_hits += token_counts.get(phrase, 0)

    return min(1.0, filler_hits / total) if total else 1.0


def parse_srt_blocks(raw_srt: str):
    blocks = re.split(r"\n\s*\n", raw_srt.strip(), flags=re.M)
    for block in blocks:
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if len(lines) < 2:
            continue
        times = lines[1]
        text_lines = lines[2:]
        if not text_lines:
            continue
        try:
            start_raw, end_raw = [part.strip() for part in times.split("-->")]
        except ValueError:
            continue
        yield start_raw, end_raw, " ".join(text_lines)


def build_segments(entries, merge_gap):
    segments = []
    current = None
    for entry in entries:
        if not entry["keep"]:
            continue
        if current is None:
            current = {
                "start": entry["start"],
                "end": entry["end"],
                "entries": [entry],
            }
            continue
        gap = max(0.0, entry["start"] - current["end"])
        if gap <= merge_gap:
            current["end"] = max(current["end"], entry["end"])
            current["entries"].append(entry)
        else:
            segments.append(current)
            current = {
                "start": entry["start"],
                "end": entry["end"],
                "entries": [entry],
            }
    if current:
        segments.append(current)
    return segments


def round_ts(value: float) -> float:
    return round(float(value), 3)


def main(argv):
    if len(argv) < 4:
        print("Usage: python make_plan_from_srt.py <srt_file> <mapping.json> <output_plan.json>")
        sys.exit(1)

    srt_path = Path(argv[1])
    mapping_path = Path(argv[2])
    output_path = Path(argv[3])

    mapping = load_mapping(mapping_path)

    if not srt_path.exists():
        raise FileNotFoundError(f"SRT file not found: {srt_path}")

    raw_srt = srt_path.read_text(encoding="utf-8")

    entries = []
    for start_raw, end_raw, raw_text in parse_srt_blocks(raw_srt):
        normalized_text = normalize(raw_text)
        tokens = WORD_RE.findall(normalized_text)
        start = hms_to_seconds(start_raw)
        end = hms_to_seconds(end_raw)
        duration = max(0.0, end - start)

        filler_ratio = compute_filler_ratio(tokens, normalized_text, mapping["filler_phrases"])
        keep = (
            duration >= mapping["min_segment_duration"]
            and filler_ratio < mapping["filler_ratio_threshold"]
        )

        entry = {
            "start": start,
            "end": end,
            "duration": duration,
            "raw_text": raw_text,
            "normalized_text": normalized_text,
            "tokens": tokens,
            "filler_ratio": filler_ratio,
            "keep": keep,
        }
        entries.append(entry)

    segments = build_segments(entries, mapping["merge_gap_seconds"])

    timeline_cursor = 0.0
    for segment in segments:
        segment_duration = max(0.0, segment["end"] - segment["start"])
        segment["timeline_start"] = timeline_cursor
        for entry in segment["entries"]:
            entry_offset = max(0.0, entry["start"] - segment["start"])
            entry["timeline_start"] = timeline_cursor + entry_offset
        timeline_cursor += segment_duration

    transition_cfg = mapping["transition"]
    sfx_rules = mapping["sfx_rules"]
    zoom_rules = mapping["zoom_rules"]

    actions = []
    last_sfx_time = defaultdict(lambda: -math.inf)
    last_zoom_time = defaultdict(lambda: -math.inf)

    for index, segment in enumerate(segments):
        segment_start_timeline = segment["timeline_start"]

        if index > 0 and transition_cfg.get("asset"):
            gap = segment["start"] - segments[index - 1]["end"]
            if gap >= transition_cfg.get("gap_threshold", 0.0):
                actions.append(
                    {
                        "type": "transition",
                        "time": round_ts(segment_start_timeline),
                        "asset": transition_cfg["asset"],
                        "duration": round_ts(transition_cfg.get("duration", 0.5)),
                    }
                )

        for entry in segment["entries"]:
            if not entry["keep"]:
                continue
            entry_start_timeline = entry.get("timeline_start", segment_start_timeline)
            entry_end_timeline = entry_start_timeline + entry["duration"]
            normalized_text = entry["normalized_text"]

            for rule in sfx_rules:
                if not rule.get("asset"):
                    continue
                if any(keyword and keyword in normalized_text for keyword in rule["keywords"]):
                    candidate_time = entry_start_timeline + rule.get("offset", 0.0)
                    if candidate_time - last_sfx_time[rule["asset"]] >= rule.get("cooldown", 0.0):
                        actions.append(
                            {
                                "type": "sfx",
                                "time": round_ts(candidate_time),
                                "asset": rule["asset"],
                                "source_time": round_ts(entry["start"]),
                            }
                        )
                        last_sfx_time[rule["asset"]] = candidate_time
                        break

            for rule in zoom_rules:
                if entry["duration"] < rule.get("min_duration", 0.0):
                    continue
                if not rule["keywords"]:
                    continue
                if any(keyword and keyword in normalized_text for keyword in rule["keywords"]):
                    if entry_start_timeline - last_zoom_time[rule["scale"]] < rule.get("cooldown", 0.0):
                        continue
                    actions.append(
                        {
                            "type": "zoom",
                            "start": round_ts(entry_start_timeline),
                            "end": round_ts(entry_end_timeline),
                            "scale": float(rule.get("scale", mapping["zoom_default_scale"])),
                            "source_start": round_ts(entry["start"]),
                            "source_end": round_ts(entry["end"]),
                        }
                    )
                    last_zoom_time[rule["scale"]] = entry_start_timeline
                    break

    exported_segments = [
        {
            "start": round_ts(segment["start"]),
            "end": round_ts(segment["end"]),
            "timeline_start": round_ts(segment["timeline_start"]),
        }
        for segment in segments
    ]

    plan = {
        "segments": exported_segments,
        "actions": actions,
        "audio": {
            "filters": {
                key: value
                for key, value in mapping.get("noise_reduction", {}).items()
                if value is not None
            }
        },
        "meta": {
            "source_srt": str(srt_path),
            "entries_total": len(entries),
            "segments_kept": len(exported_segments),
            "timeline_duration": round_ts(timeline_cursor),
        },
    }

    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(plan, handle, indent=2)
        handle.write("\n")

    print(f"[PLAN] Saved plan -> {output_path}")


if __name__ == "__main__":
    main(sys.argv)
