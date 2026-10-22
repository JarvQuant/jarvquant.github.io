"""Build the Daily Chart Challenge rounds: play/days/000.json ... play/days/364.json.

Each day has 5 rounds of real NAS100 history. A round shows CTX bars, the player
calls long or short, then REV more bars play out. Only cuts where the next REV
bars move clearly (at least MIN_ATR times the recent average range) are used, so
every round has a readable answer, and every day mixes long and short answers.

Usage: python tools/build_daily.py [path to 1m_data.parquet]
The default path is the 1-minute file that ships with the desktop app.
"""
import json
import random
import sys
from pathlib import Path

import numpy as np
import pandas as pd

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "F:/JarvQuant/data/parquet/1m_data.parquet")
OUT = Path(__file__).resolve().parents[1] / "play" / "days"
DAYS, ROUNDS = 365, 5
CTX, REV = 45, 15
MIN_ATR = 2.0
TICK = 10  # NAS100 quotes in 0.1 steps; prices are stored as integer ticks
TFS = {"5m": "5min", "15m": "15min", "1h": "1h"}
DAY_TFS = ["5m", "5m", "15m", "15m", "1h"]
MAX_GAP = pd.Timedelta(hours=2)  # the daily 1h break is fine, weekends and holidays are not


def bars(df, rule):
    o = df.resample(rule, label="left", closed="left").agg(
        {"Open": "first", "High": "max", "Low": "min", "Close": "last"}).dropna()
    return o


def main():
    rng = random.Random(20261022)
    m1 = pd.read_parquet(SRC)[["Open", "High", "Low", "Close"]]
    frames = {}
    for tf, rule in TFS.items():
        b = bars(m1, rule)
        t = b.index.to_numpy()
        gap = np.diff(t) > MAX_GAP.to_timedelta64()
        frames[tf] = (b, np.concatenate([[False], gap]))  # gap[i]: break between bar i-1 and i
    used = set()

    def pick(tf, want_long):
        b, gap = frames[tf]
        o, h, l, c = (b[k].to_numpy() for k in ("Open", "High", "Low", "Close"))
        gaps = np.cumsum(gap)
        for _ in range(20000):
            i = rng.randrange(CTX, len(b) - REV)  # i = first hidden bar
            if gaps[i + REV - 1] != gaps[i - CTX]:
                continue
            day = b.index[i].date()
            if (tf, day) in used:
                continue
            atr = float(np.mean(h[i - 14:i] - l[i - 14:i]))
            move = c[i + REV - 1] - c[i - 1]
            if atr <= 0 or abs(move) < MIN_ATR * atr or (move > 0) != want_long:
                continue
            used.add((tf, day))
            seg = np.rint(np.column_stack([o, h, l, c])[i - CTX:i + REV] * TICK).astype(int)
            base = int(seg[0, 0])
            return {
                "s": "NAS100", "tf": tf, "d": b.index[i].strftime("%Y-%m-%d %H:%M"),
                "n": CTX, "p": 1, "b": base, "k": (seg - base).ravel().tolist(),
            }
        raise RuntimeError(f"no round found for {tf}")

    OUT.mkdir(parents=True, exist_ok=True)
    for day in range(DAYS):
        longs = [True] * rng.choice([2, 3]) + [False] * ROUNDS
        longs = longs[:ROUNDS]
        rng.shuffle(longs)
        tfs = DAY_TFS[:]
        rng.shuffle(tfs)
        rounds = [pick(tf, up) for tf, up in zip(tfs, longs)]
        (OUT / f"{day:03d}.json").write_text(json.dumps({"r": rounds}, separators=(",", ":")), encoding="utf-8")
    size = sum(f.stat().st_size for f in OUT.glob("*.json"))
    print(f"wrote {DAYS} days to {OUT} ({size // 1024} KB)")


if __name__ == "__main__":
    main()
