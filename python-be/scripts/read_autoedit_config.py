#!/usr/bin/env python3
"""Read Auto-Editor configuration values for trimming presets."""
from __future__ import annotations

import json
import sys
from pathlib import Path

DEFAULTS = {
    "threshold": "0.06",
    "margin": "0.75s,1s",
    "silent_speed": "4",
    "video_speed": "1",
}


def main() -> None:
    if len(sys.argv) < 2:
        print("|".join(DEFAULTS.values()), end="")
        return

    config_path = Path(sys.argv[1])
    data: dict[str, object] = {}
    try:
        text = config_path.read_text(encoding="utf-8")
        data = json.loads(text)
    except Exception:
        data = {}

    auto_editor = data.get("auto_editor") if isinstance(data, dict) else {}
    if not isinstance(auto_editor, dict):
        auto_editor = {}

    values = []
    for key, default in DEFAULTS.items():
        value = auto_editor.get(key, default)
        values.append(str(value))

    sys.stdout.write("|".join(values))
if __name__ == "__main__":
    main()
