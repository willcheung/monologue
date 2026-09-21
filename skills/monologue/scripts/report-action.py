#!/usr/bin/env python3
"""Best-effort reporter for consequential agent actions. Uses only the Python standard library."""

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

CATEGORIES = (
    "communication", "calendar", "purchase", "reservation", "finance", "code",
    "file", "task", "account", "crm", "database", "deployment", "form", "other",
)


def keychain_api_key():
    """Read the optional Codex-specific macOS Keychain entry without printing it."""
    if sys.platform != "darwin":
        return None
    try:
        result = subprocess.run(
            ["security", "find-generic-password", "-a", "codex", "-s", "events.monologue.api-key", "-w"],
            check=True,
            capture_output=True,
            text=True,
            timeout=2,
        )
        return result.stdout.strip() or None
    except (FileNotFoundError, subprocess.SubprocessError):
        return None


def arguments():
    parser = argparse.ArgumentParser(description="Report an external action to Monologue")
    parser.add_argument("--agent", required=True, dest="agentName")
    parser.add_argument("--verb", required=True)
    parser.add_argument("--summary", required=True)
    parser.add_argument("--category", required=True, choices=CATEGORIES)
    parser.add_argument("--status", default="completed", choices=("completed", "failed", "pending"))
    parser.add_argument("--system", required=True)
    parser.add_argument("--agent-id", dest="agentId")
    parser.add_argument("--object-type", dest="objectType")
    parser.add_argument("--object-name", dest="objectName")
    parser.add_argument("--project")
    parser.add_argument("--external-id", dest="externalId")
    parser.add_argument("--value", type=float)
    parser.add_argument("--currency")
    parser.add_argument("--url")
    parser.add_argument("--occurred-at", dest="occurredAt")
    parser.add_argument("--metadata", help="JSON object with extra external action details")
    return parser.parse_args()


def main():
    args = arguments()
    base_url = os.environ.get("MONOLOGUE_URL", "https://www.monologue.events")
    api_key = os.environ.get("MONOLOGUE_API_KEY") or keychain_api_key()
    if not api_key:
        print("Monologue: skipped (MONOLOGUE_API_KEY is missing)", file=sys.stderr)
        return 0

    payload = {key: value for key, value in vars(args).items() if value is not None and key != "metadata"}
    payload["source"] = "self_reported"
    if args.metadata:
        try:
            metadata = json.loads(args.metadata)
            if not isinstance(metadata, dict):
                raise ValueError("metadata must be a JSON object")
            payload["metadata"] = metadata
        except (json.JSONDecodeError, ValueError) as error:
            print(f"Monologue: skipped ({error})", file=sys.stderr)
            return 0

    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/actions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=3) as response:
            result = json.load(response)
            print(f"Monologue: reported {result.get('id', 'action')}")
    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as error:
        print(f"Monologue: skipped ({error})", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
