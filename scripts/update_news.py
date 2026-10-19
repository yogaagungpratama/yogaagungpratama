#!/usr/bin/env python3
"""Fetch the latest Detik headlines (Indonesia + international) and write news.json.

Runs in GitHub Actions (see .github/workflows/update-news.yml) and can also be run locally:
    python scripts/update_news.py
Uses only the Python standard library.
"""
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from pathlib import Path

FEEDS = [
    ("INDONESIA", "https://news.detik.com/rss"),
    ("WORLD", "https://news.detik.com/internasional/rss"),
]
PER_FEED = 15
OUT = Path(__file__).resolve().parent.parent / "news.json"
UA = "Mozilla/5.0 (compatible; PortfolioNewsBot/1.0; +https://yogaagungpratama.github.io/yogaagungpratama)"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def clean(text):
    text = re.sub(r"<[^>]+>", " ", text or "")
    return re.sub(r"\s+", " ", unescape(text)).strip()


def parse(category, xml_bytes):
    root = ET.fromstring(xml_bytes)
    items = []
    for it in root.iter("item"):
        title = clean(it.findtext("title"))
        link = (it.findtext("guid") or it.findtext("link") or "").strip()
        if not title or not link.startswith("http"):
            continue
        image = ""
        enc = it.find("enclosure")
        if enc is not None and enc.get("url"):
            image = enc.get("url")
        else:
            m = re.search(r'<img[^>]+src="([^"]+)"', it.findtext("description") or "")
            if m:
                image = m.group(1)
        if image:
            image = image.replace("w=360", "w=640")
        try:
            date = parsedate_to_datetime(it.findtext("pubDate")).astimezone(timezone.utc).isoformat()
        except Exception:
            date = ""
        items.append({"title": title, "url": link, "image": image, "date": date,
                      "category": category, "source": "detik.com",
                      "summary": clean(it.findtext("description"))[:220]})
        if len(items) >= PER_FEED:
            break
    return items


def main():
    articles = []
    for category, url in FEEDS:
        try:
            articles += parse(category, fetch(url))
        except Exception as e:  # keep going if one feed fails
            print("feed failed:", url, e, file=sys.stderr)
    if len(articles) < 6:
        print("too few articles, keeping existing news.json", file=sys.stderr)
        return 1
    articles.sort(key=lambda a: a["date"], reverse=True)
    data = {"updated": datetime.now(timezone.utc).isoformat(), "source": "https://www.detik.com", "articles": articles}
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("wrote", len(articles), "articles to", OUT)
    return 0


if __name__ == "__main__":
    sys.exit(main())
