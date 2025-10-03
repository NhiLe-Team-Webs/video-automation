import json
import math
import os
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from dotenv import load_dotenv

WORD_RE = re.compile(r"[\w']+", re.UNICODE)

HIGHLIGHT_ANIMATIONS = ["zoom", "fade", "slide", "typewriter"]
HIGHLIGHT_VARIANTS = ["blurred", "callout", "brand", "cutaway", "typewriter"]
HIGHLIGHT_POSITIONS = ["center", "bottom", "top"]
HIGHLIGHT_TYPES = ["noteBox", "typewriter", "sectionTitle"]


def cycle_choice(options: List[str], index: int) -> str:
    if not options:
        return ""
    return options[index % len(options)]


def collapse_text(text: str, max_length: int = 90) -> str:
    collapsed = " ".join(text.split())
    if len(collapsed) <= max_length:
        return collapsed
    truncated = collapsed[: max_length - 1].rstrip()
    last_space = truncated.rfind(" ")
    if last_space > 40:
        truncated = truncated[:last_space]
    return f"{truncated}…"


def ensure_list(value: Optional[Iterable]) -> List[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        return []
    if isinstance(value, Iterable):
        collected: List[str] = []
        for item in value:
            if isinstance(item, str):
                collected.append(item)
        return collected
    return []


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


def normalize_keyword_sets(rule: Dict) -> Dict[str, List]:
    match_type = (rule.get("match_type") or "contains").lower()
    keywords = rule.get("keywords")
    if isinstance(keywords, dict):
        keyword_dict = dict(keywords)
    elif keywords is None:
        keyword_dict = {}
    else:
        keyword_dict = {"any": ensure_list(keywords)}

    # Support alternate keys for exclusions to make authoring easier.
    for alias in ("exclude", "not", "none_of"):
        if alias in keyword_dict:
            keyword_dict.setdefault("none", [])
            keyword_dict["none"].extend(ensure_list(keyword_dict.pop(alias)))

    normalized: Dict[str, List] = {"any": [], "all": [], "none": []}
    if match_type == "regex":
        for key in ("any", "all", "none"):
            patterns: List[re.Pattern] = []
            for pattern in ensure_list(keyword_dict.get(key)):
                try:
                    patterns.append(re.compile(pattern, re.IGNORECASE | re.UNICODE))
                except re.error as exc:
                    print(f"[WARN] Skipping invalid regex '{pattern}': {exc}")
            normalized[key] = patterns
    else:
        for key in ("any", "all", "none"):
            normalized[key] = [normalize(term) for term in ensure_list(keyword_dict.get(key)) if term]
    return normalized


def normalize_action_rule(rule: Dict, defaults: Dict, *, rule_type: str) -> Dict:
    rule_copy = dict(rule)
    rule_copy.setdefault("name", rule_copy.get("asset") or f"{rule_type}_rule")
    rule_copy.setdefault("match_type", "contains")
    rule_copy.setdefault("scope", "entry")
    rule_copy["_match_type"] = (rule_copy.get("match_type") or "contains").lower()
    rule_copy["_keywords"] = normalize_keyword_sets(rule_copy)

    if rule_type == "sfx":
        rule_copy.setdefault("cooldown", defaults.get("sfx_cooldown", 8.0))
        rule_copy.setdefault("offset", 0.0)
        cooldown_key = rule_copy.get("cooldown_group") or rule_copy.get("asset") or rule_copy.get("name")
        rule_copy["_cooldown_key"] = cooldown_key
    elif rule_type == "zoom":
        rule_copy.setdefault("cooldown", defaults.get("zoom_cooldown", 6.0))
        rule_copy.setdefault("min_duration", 1.0)
        rule_copy.setdefault("scale", defaults.get("zoom_scale", 1.1))
        rule_copy["_cooldown_key"] = rule_copy.get("cooldown_group") or rule_copy.get("name") or str(id(rule_copy))
    elif rule_type == "transition":
        # Transitions use additional timing fields but still leverage keyword matching utilities.
        rule_copy.setdefault("offset", 0.0)
        rule_copy.setdefault("duration", defaults.get("transition_duration", 0.5))
        min_gap = None
        for key in ("min_gap_seconds", "min_gap", "gap_threshold"):
            if key in rule_copy and rule_copy[key] is not None:
                try:
                    min_gap = float(rule_copy[key])
                except (TypeError, ValueError):
                    min_gap = None
                break
        if min_gap is None:
            min_gap = defaults.get("transition_gap_threshold", 0.0)
        rule_copy["min_gap_seconds"] = min_gap

        max_gap = None
        for key in ("max_gap_seconds", "max_gap"):
            if key in rule_copy and rule_copy[key] is not None:
                try:
                    max_gap = float(rule_copy[key])
                except (TypeError, ValueError):
                    max_gap = None
                break
        rule_copy["max_gap_seconds"] = max_gap
        rule_copy.setdefault("scope", "either")

    return rule_copy


def load_mapping(mapping_path: Path) -> dict:
    with mapping_path.open("r", encoding="utf-8") as handle:
        mapping_raw = json.load(handle)

    filler_cfg = dict(mapping_raw.get("filler_detection", {}))
    filler_cfg.setdefault("phrases", mapping_raw.get("filler_phrases", []))
    filler_cfg.setdefault("ratio_threshold", mapping_raw.get("filler_ratio_threshold", 0.6))
    filler_cfg.setdefault("min_duration", mapping_raw.get("min_segment_duration", 1.0))
    filler_cfg["phrases"] = [normalize(phrase) for phrase in ensure_list(filler_cfg.get("phrases"))]

    segment_cfg = dict(mapping_raw.get("segmenting", {}))
    segment_cfg.setdefault("merge_gap_seconds", mapping_raw.get("merge_gap_seconds", 0.5))
    segment_cfg.setdefault("min_duration", filler_cfg.get("min_duration", 1.0))

    defaults_cfg = dict(mapping_raw.get("defaults", {}))
    defaults_cfg.setdefault("zoom_scale", mapping_raw.get("zoom_default_scale", 1.1))
    defaults_cfg.setdefault("sfx_cooldown", 8.0)
    defaults_cfg.setdefault("zoom_cooldown", 6.0)

    transition_cfg = mapping_raw.get("transitions")
    if transition_cfg is None:
        transition_cfg = {}
    transition_cfg = dict(transition_cfg)
    transition_default = dict(transition_cfg.get("default", mapping_raw.get("transition", {})))
    transition_default.setdefault("asset", transition_default.get("asset", ""))
    transition_default.setdefault("gap_threshold", transition_default.get("gap_threshold", 1.0))
    transition_default.setdefault("duration", transition_default.get("duration", 0.5))
    transition_default.setdefault("offset", transition_default.get("offset", 0.0))
    transition_cfg["default"] = transition_default
    defaults_cfg.setdefault("transition_duration", transition_default.get("duration", 0.5))
    defaults_cfg.setdefault("transition_gap_threshold", transition_default.get("gap_threshold", 1.0))

    transition_rules = transition_cfg.get("rules") or mapping_raw.get("transition_rules", [])
    transition_cfg["rules"] = [
        normalize_action_rule(rule, defaults_cfg, rule_type="transition") for rule in transition_rules
    ]

    actions_cfg = mapping_raw.get("actions", {})
    sfx_rules = actions_cfg.get("sfx") or mapping_raw.get("sfx_rules", [])
    zoom_rules = actions_cfg.get("zoom") or mapping_raw.get("zoom_rules", [])

    normalized_sfx = [
        normalize_action_rule(rule, defaults_cfg, rule_type="sfx")
        for rule in sfx_rules
        if isinstance(rule, dict)
    ]
    normalized_zoom = [
        normalize_action_rule(rule, defaults_cfg, rule_type="zoom")
        for rule in zoom_rules
        if isinstance(rule, dict)
    ]

    audio_cfg = dict(mapping_raw.get("audio", {}))
    if "filters" not in audio_cfg:
        filters = mapping_raw.get("noise_reduction", {})
        audio_cfg["filters"] = filters if isinstance(filters, dict) else {}

    return {
        "filler": filler_cfg,
        "segmenting": segment_cfg,
        "defaults": defaults_cfg,
        "transitions": transition_cfg,
        "actions": {"sfx": normalized_sfx, "zoom": normalized_zoom},
        "audio": audio_cfg,
        "raw": mapping_raw,
    }


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


def match_regex_sets(text: str, keyword_sets: Dict[str, List[re.Pattern]]) -> bool:
    any_patterns = keyword_sets.get("any", [])
    all_patterns = keyword_sets.get("all", [])
    none_patterns = keyword_sets.get("none", [])

    if not any_patterns and not all_patterns and not none_patterns:
        return True

    if any_patterns and not any(pattern.search(text) for pattern in any_patterns):
        return False
    if all_patterns and not all(pattern.search(text) for pattern in all_patterns):
        return False
    if none_patterns and any(pattern.search(text) for pattern in none_patterns):
        return False
    return True


def match_token_sets(tokens: List[str], keyword_sets: Dict[str, List[str]]) -> bool:
    any_terms = keyword_sets.get("any", [])
    all_terms = keyword_sets.get("all", [])
    none_terms = keyword_sets.get("none", [])

    if not any_terms and not all_terms and not none_terms:
        return True

    token_set = set(tokens)
    if any_terms and not any(term in token_set for term in any_terms):
        return False
    if all_terms and not all(term in token_set for term in all_terms):
        return False
    if none_terms and any(term in token_set for term in none_terms):
        return False
    return True


def match_text_sets(text: str, keyword_sets: Dict[str, List[str]], match_type: str) -> bool:
    any_terms = keyword_sets.get("any", [])
    all_terms = keyword_sets.get("all", [])
    none_terms = keyword_sets.get("none", [])

    if not any_terms and not all_terms and not none_terms:
        return True

    def predicate(term: str) -> bool:
        if match_type == "exact":
            return text == term
        if match_type == "startswith":
            return text.startswith(term)
        if match_type == "endswith":
            return text.endswith(term)
        return term in text

    if any_terms and not any(predicate(term) for term in any_terms):
        return False
    if all_terms and not all(predicate(term) for term in all_terms):
        return False
    if none_terms and any(predicate(term) for term in none_terms):
        return False
    return True


def rule_matches_context(rule: Dict, context: Dict) -> bool:
    match_type = rule.get("_match_type", "contains")
    keyword_sets = rule.get("_keywords", {})

    if match_type == "regex":
        return match_regex_sets(context.get("raw_text", "") or "", keyword_sets)
    if match_type == "token":
        return match_token_sets(context.get("tokens", []) or [], keyword_sets)
    return match_text_sets(context.get("normalized_text", "") or "", keyword_sets, match_type)


def combine_contexts(rule: Dict, contexts: List[Dict], scope: str) -> bool:
    if not contexts:
        return False
    if scope == "either":
        return any(rule_matches_context(rule, ctx) for ctx in contexts)
    if scope == "both":
        return all(rule_matches_context(rule, ctx) for ctx in contexts)
    return all(rule_matches_context(rule, ctx) for ctx in contexts)


def entry_context(entry: Dict) -> Dict:
    return {
        "normalized_text": entry.get("normalized_text", ""),
        "raw_text": entry.get("raw_text", ""),
        "tokens": entry.get("tokens", []) or [],
    }


def segment_context(segment: Dict) -> Dict:
    return segment.setdefault(
        "_context",
        {
            "normalized_text": " ".join(e.get("normalized_text", "") for e in segment.get("entries", [])) or "",
            "raw_text": " ".join(e.get("raw_text", "") for e in segment.get("entries", [])) or "",
            "tokens": [token for e in segment.get("entries", []) for token in e.get("tokens", [])],
        },
    )


def action_rule_matches(rule: Dict, entry_ctx: Dict, segment_ctx: Optional[Dict]) -> bool:
    scope = (rule.get("scope") or "entry").lower()
    contexts: List[Dict] = []

    if scope in {"entry", "both", "either"} and entry_ctx:
        contexts.append(entry_ctx)
    if scope in {"segment", "both", "either"} and segment_ctx:
        contexts.append(segment_ctx)

    if scope == "both" and len(contexts) < 2:
        return False
    if not contexts:
        return False

    normalized_scope = scope if scope in {"either", "both"} else "entry"
    return combine_contexts(rule, contexts, normalized_scope)


def transition_rule_matches(rule: Dict, prev_ctx: Optional[Dict], next_ctx: Optional[Dict], gap: float) -> bool:
    if gap < rule.get("min_gap_seconds", 0.0):
        return False
    max_gap = rule.get("max_gap_seconds")
    if max_gap is not None and gap > max_gap:
        return False

    scope = (rule.get("scope") or "either").lower()
    contexts: List[Dict] = []
    if scope in {"previous", "both", "either"} and prev_ctx:
        contexts.append(prev_ctx)
    if scope in {"next", "both", "either"} and next_ctx:
        contexts.append(next_ctx)

    if scope == "both" and len(contexts) < 2:
        return False
    if not contexts:
        contexts = [next_ctx] if next_ctx else []
    if not contexts:
        return False

    normalized_scope = scope if scope in {"either", "both"} else "entry"
    return combine_contexts(rule, contexts, normalized_scope)


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


def load_env_overrides() -> Dict[str, float]:
    root_dir = Path(__file__).resolve().parents[1]
    load_dotenv(root_dir / ".env")
    load_dotenv()

    min_pause_candidates = [
        os.getenv("TRANSITIONS_MIN_PAUSE_MS"),
        os.getenv("TRANSITION_MIN_PAUSE_MS"),
        os.getenv("MIN_PAUSE_MS"),
    ]

    min_pause_ms = next((value for value in min_pause_candidates if value), None)

    try:
        min_pause_ms_value = float(min_pause_ms) if min_pause_ms is not None else 700.0
    except (TypeError, ValueError):
        min_pause_ms_value = 700.0

    min_pause_seconds = max(0.0, min_pause_ms_value / 1000.0)

    default_transition = os.getenv("DEFAULT_TRANSITION_TYPE")

    return {
        "min_pause_seconds": min_pause_seconds,
        "default_transition_type": (default_transition or "fadeCamera").strip() or "fadeCamera",
    }


def guess_transition_type(
    rule: Dict, *, default_type: str, asset: Optional[str] = None
) -> Dict[str, object]:
    asset_lower = (asset or "").lower()
    requested_type = (rule.get("type") or default_type or "").strip()
    if requested_type:
        transition_type = requested_type
    else:
        transition_type = "fadeCamera"

    if transition_type == "fadeCamera" and "slide" in asset_lower:
        transition_type = "slideWhoosh"

    direction = rule.get("direction")
    if not direction:
        for candidate in ("left", "right", "up", "down"):
            if candidate in asset_lower:
                direction = candidate
                break

    plan: Dict[str, object] = {
        "type": transition_type,
    }

    if direction and transition_type == "slideWhoosh":
        plan["direction"] = direction

    sfx = rule.get("sfx")
    if not sfx:
        if transition_type == "slideWhoosh":
            sfx = "ui/whoosh.mp3"
        elif transition_type == "fadeCamera":
            sfx = "ui/camera.mp3"

    if sfx:
        plan["sfx"] = sfx

    return plan


def build_transition_plan(rule: Dict, default_duration: float, default_type: str) -> Dict:
    asset = rule.get("asset")
    transition_plan = guess_transition_type(rule, default_type=default_type, asset=asset)
    duration_value = rule.get("duration", default_duration)
    try:
        transition_plan["duration"] = round_ts(float(duration_value))
    except (TypeError, ValueError):
        transition_plan["duration"] = round_ts(default_duration)
    return transition_plan


def main(argv):
    if len(argv) < 4:
        print("Usage: python make_plan_from_srt.py <srt_file> <mapping.json> <output_plan.json>")
        sys.exit(1)

    srt_path = Path(argv[1])
    mapping_path = Path(argv[2])
    output_path = Path(argv[3])

    mapping = load_mapping(mapping_path)
    filler_cfg = mapping["filler"]
    segment_cfg = mapping["segmenting"]
    transitions_cfg = mapping["transitions"]
    env_overrides = load_env_overrides()
    transitions_cfg.setdefault("min_pause_seconds", env_overrides.get("min_pause_seconds", 0.7))
    sfx_rules = mapping["actions"].get("sfx", [])

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

        filler_ratio = compute_filler_ratio(tokens, normalized_text, filler_cfg.get("phrases", []))
        keep = (
            duration >= segment_cfg.get("min_duration", 0.0)
            and filler_ratio < filler_cfg.get("ratio_threshold", 1.0)
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
        entry["_context"] = entry_context(entry)
        entries.append(entry)

    segments = build_segments(entries, segment_cfg.get("merge_gap_seconds", 0.5))

    timeline_cursor = 0.0
    for segment in segments:
        segment_duration = max(0.0, segment["end"] - segment["start"])
        segment["timeline_start"] = timeline_cursor
        for entry in segment["entries"]:
            entry_offset = max(0.0, entry["start"] - segment["start"])
            entry["timeline_start"] = timeline_cursor + entry_offset
        segment_context(segment)
        timeline_cursor += segment_duration

    transition_default = transitions_cfg.get("default", {})
    transition_default.setdefault("type", env_overrides.get("default_transition_type", "fadeCamera"))
    transition_default.setdefault("sfx", None)
    transition_rules = transitions_cfg.get("rules", [])

    highlights: List[Dict] = []
    last_sfx_time = defaultdict(lambda: -math.inf)
    try:
        min_pause_seconds = float(transitions_cfg.get("min_pause_seconds", 0.7) or 0.0)
    except (TypeError, ValueError):
        min_pause_seconds = 0.7

    for index, segment in enumerate(segments):
        segment_start_timeline = segment["timeline_start"]
        segment_ctx = segment.get("_context")
        segment["id"] = segment.get("id") or f"segment-{index + 1:02d}"

        if index > 0:
            prev_segment = segments[index - 1]
            gap = max(0.0, segment["start"] - prev_segment["end"])
            prev_segment["gap_after"] = gap
            prev_ctx = prev_segment.get("_context")
            gap_threshold_value = transition_default.get("gap_threshold", 0.0)
            try:
                gap_threshold = float(gap_threshold_value or 0.0)
            except (TypeError, ValueError):
                gap_threshold = 0.0

            min_gap_for_transition = max(min_pause_seconds, gap_threshold)

            silence_after = gap >= min_pause_seconds
            prev_segment["silence_after"] = silence_after

            if silence_after and gap >= min_gap_for_transition:
                selected_rule = None

                for rule in transition_rules:
                    asset = rule.get("asset") or transition_default.get("asset")
                    if not asset and not rule.get("type") and not transition_default.get("type"):
                        continue
                    if transition_rule_matches(rule, prev_ctx, segment_ctx, gap):
                        selected_rule = {
                            "asset": asset,
                            "duration": rule.get("duration", transition_default.get("duration", 0.5)),
                            "offset": rule.get("offset", 0.0),
                            "type": rule.get("type") or transition_default.get("type"),
                            "sfx": rule.get("sfx") or transition_default.get("sfx"),
                            "direction": rule.get("direction"),
                        }
                        break

                if selected_rule is None:
                    default_asset = transition_default.get("asset")
                    if default_asset or transition_default.get("type"):
                        selected_rule = {
                            "asset": default_asset,
                            "duration": transition_default.get("duration", 0.5),
                            "offset": transition_default.get("offset", 0.0),
                            "type": transition_default.get("type"),
                            "sfx": transition_default.get("sfx"),
                            "direction": transition_default.get("direction"),
                        }

                if selected_rule:
                    transition_plan = build_transition_plan(
                        selected_rule,
                        float(selected_rule.get("duration", transition_default.get("duration", 0.5))),
                        selected_rule.get("type") or transition_default.get("type") or "fadeCamera",
                    )
                    if selected_rule.get("sfx") and "sfx" not in transition_plan:
                        transition_plan["sfx"] = selected_rule["sfx"]
                    prev_segment["transition_out"] = transition_plan
                    segment["transition_in"] = transition_plan
                else:
                    prev_segment.pop("transition_out", None)
                    segment.pop("transition_in", None)
            else:
                prev_segment.pop("transition_out", None)
                segment.pop("transition_in", None)

        for entry in segment["entries"]:
            if not entry["keep"]:
                continue
            entry_start_timeline = entry.get("timeline_start", segment_start_timeline)
            entry_ctx = entry.get("_context")

            for rule in sfx_rules:
                if not rule.get("asset"):
                    continue
                if not action_rule_matches(rule, entry_ctx, segment_ctx):
                    continue
                candidate_time = entry_start_timeline + float(rule.get("offset", 0.0))
                cooldown_key = rule.get("_cooldown_key") or rule.get("asset")
                if candidate_time - last_sfx_time[cooldown_key] >= float(
                    rule.get("cooldown", 0.0)
                ):
                    highlight_index = len(highlights)
                    highlight_duration = round_ts(min(max(entry["duration"], 1.6), 4.0))
                    highlight_text = collapse_text(entry.get("raw_text") or "")
                    if not highlight_text:
                        highlight_text = "Highlight"
                    sfx_asset = (rule.get("asset") or "").strip()
                    sfx_name = None
                    if sfx_asset:
                        normalized_asset = sfx_asset.replace("\\", "/")
                        if normalized_asset.startswith("assets/"):
                            normalized_asset = normalized_asset[7:]
                        if normalized_asset.startswith("sfx/"):
                            normalized_asset = normalized_asset[4:]
                        sfx_name = normalized_asset or None
                    start_time = max(0.0, candidate_time)
                    highlight_type = cycle_choice(HIGHLIGHT_TYPES, highlight_index)
                    highlight = {
                        "id": f"highlight-{highlight_index + 1:02d}",
                        "type": highlight_type,
                        "text": highlight_text,
                        "start": round_ts(start_time),
                        "duration": highlight_duration,
                        "position": cycle_choice(HIGHLIGHT_POSITIONS, highlight_index),
                        "animation": cycle_choice(HIGHLIGHT_ANIMATIONS, highlight_index),
                        "variant": cycle_choice(HIGHLIGHT_VARIANTS, highlight_index),
                    }
                    if sfx_name:
                        if not sfx_name.lower().startswith("assets/"):
                            if sfx_name.lower().startswith("sfx/"):
                                sfx_name = f"assets/{sfx_name}"
                            else:
                                sfx_name = f"assets/sfx/{sfx_name}"
                        highlight["sfx"] = sfx_name
                    if rule.get("volume") is not None:
                        try:
                            volume = float(rule.get("volume"))
                            if 0 <= volume <= 1:
                                highlight["volume"] = volume
                        except (TypeError, ValueError):
                            pass
                    highlights.append(highlight)
                    last_sfx_time[cooldown_key] = candidate_time
                    break

    if segments:
        segments[-1].setdefault("silence_after", False)
        segments[-1].setdefault("gap_after", 0.0)

    exported_segments = []
    for index, segment in enumerate(segments):
        segment_plan = {
            "id": segment.get("id") or f"segment-{index + 1:02d}",
            "sourceStart": round_ts(segment["start"]),
            "duration": round_ts(segment["end"] - segment["start"]),
            "transitionIn": segment.get("transition_in"),
            "transitionOut": segment.get("transition_out"),
        }

        segment_plan["kind"] = segment.get("kind") or "normal"

        label_text = ""
        for entry in segment.get("entries", []):
            candidate = collapse_text(entry.get("raw_text") or "", max_length=60)
            if candidate:
                label_text = candidate
                break
        if label_text:
            segment_plan["label"] = label_text

        if "silence_after" in segment:
            segment_plan["silenceAfter"] = bool(segment["silence_after"])
        if segment.get("gap_after") is not None:
            segment_plan.setdefault("metadata", {})
            segment_plan["metadata"]["gapAfterSeconds"] = round_ts(segment.get("gap_after", 0.0))

        exported_segments.append(segment_plan)

    for segment in exported_segments:
        if segment.get("transitionIn") is None:
            segment.pop("transitionIn", None)
        if segment.get("transitionOut") is None:
            segment.pop("transitionOut", None)

    highlights.sort(key=lambda item: item.get("start", 0.0))

    plan = {
        "segments": exported_segments,
        "highlights": highlights,
        "meta": {
            "source_srt": str(srt_path),
            "entries_total": len(entries),
            "segments_kept": len(exported_segments),
            "timeline_duration": round_ts(timeline_cursor),
            "highlights_total": len(highlights),
            "min_pause_seconds": round_ts(min_pause_seconds),
        },
    }

    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(plan, handle, indent=2)
        handle.write("\n")

    print(f"[PLAN] Saved plan -> {output_path}")


if __name__ == "__main__":
    main(sys.argv)
