#!/usr/bin/env python3
"""Refresh markets.json and pairs-{bybt,kucn,okx,bmex}.json from the ginarea API.

Fetches https://ginarea.org/api/exchanges/markets, writes the full payload to
markets.json (sorted by id, compact format), and emits one pairs-*.json per
supported exchange containing only USDT_FUTURES markets.

Run from any working directory:
    python3 scripts/update_pairs.py
"""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

API_URL = "https://ginarea.org/api/exchanges/markets"
REPO_ROOT = Path(__file__).resolve().parent.parent

EXCHANGES = {
    1: ("BYBT", "pairs-bybt.json"),
    2: ("KUCN", "pairs-kucn.json"),
    3: ("OKX", "pairs-okx.json"),
    4: ("BMEX", "pairs-bmex.json"),
}

DEFAULT_MIN_ORDER_SIZE = 0.1
DEFAULT_MIN_GRID_STEP = 0.0002


def fetch_markets() -> list[dict]:
    req = urllib.request.Request(API_URL, headers={"User-Agent": "ginarea-calculator-updater"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        if resp.status != 200:
            raise SystemExit(f"API returned HTTP {resp.status}")
        return json.load(resp)


def write_markets_json(markets: list[dict]) -> None:
    ordered = sorted(markets, key=lambda m: m["id"])
    path = REPO_ROOT / "markets.json"
    with path.open("w", encoding="utf-8") as f:
        json.dump(ordered, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")


def write_pairs_json(markets: list[dict]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for exchange_id, (code, filename) in EXCHANGES.items():
        pairs: dict[str, dict] = {}
        for m in markets:
            if m.get("exchangeId") != exchange_id:
                continue
            if m.get("accountType") != "USDT_FUTURES":
                continue
            min_order_size = m.get("minTradeQuantityPrimary") or DEFAULT_MIN_ORDER_SIZE
            price_increment = m.get("priceIncrement")
            min_grid_step = price_increment * 2 if price_increment else DEFAULT_MIN_GRID_STEP
            pairs[m["name"]] = {
                "exchange": code,
                "minOrderSize": min_order_size,
                "minGridStep": min_grid_step,
                "currentPrice": 0,
            }
        ordered = dict(sorted(pairs.items()))
        path = REPO_ROOT / filename
        with path.open("w", encoding="utf-8") as f:
            json.dump(ordered, f, ensure_ascii=False, indent=2)
            f.write("\n")
        counts[code] = len(ordered)
    return counts


def main() -> int:
    markets = fetch_markets()
    write_markets_json(markets)
    counts = write_pairs_json(markets)
    print(f"markets.json: {len(markets)} total")
    for code, n in counts.items():
        print(f"  {code}: {n} USDT_FUTURES pairs")
    return 0


if __name__ == "__main__":
    sys.exit(main())
