"""
Collector Service — Misinfo Tracker
Pulls posts from RSS feeds (Reddit public RSS + news sources),
deduplicates, and writes to a shared JSONL store.
"""

import feedparser
import json
import os
import time
import hashlib
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv("../../.env")

RSS_FEEDS = {
    "reuters_world":     "https://feeds.reuters.com/reuters/worldNews",
    "bbc_world":         "http://feeds.bbci.co.uk/news/world/rss.xml",
    "aljazeera":         "https://www.aljazeera.com/xml/rss/all.xml",
    "reddit_worldnews":  "https://www.reddit.com/r/worldnews/.rss",
    "reddit_politics":   "https://www.reddit.com/r/politics/.rss",
    "reddit_conspiracy": "https://www.reddit.com/r/conspiracy/.rss",
    "reddit_news":       "https://www.reddit.com/r/news/.rss",
}

HEADERS = {
    "User-Agent": "misinfo-tracker/1.0 (research; muhammadasadk42@gmail.com)"
}

OUTPUT_FILE = os.getenv("OUTPUT_FILE", "../../data/raw_posts.jsonl")


def make_id(url: str, title: str) -> str:
    return hashlib.md5(f"{url}{title}".encode()).hexdigest()


def fetch_feed(name: str, url: str) -> list[dict]:
    print(f"  Fetching {name}...")
    try:
        feed = feedparser.parse(url, request_headers=HEADERS)
        posts = []
        for entry in feed.entries[:15]:
            post = {
                "id":           make_id(entry.get("link", ""), entry.get("title", "")),
                "source":       name,
                "title":        entry.get("title", "").strip(),
                "url":          entry.get("link", ""),
                "summary":      entry.get("summary", "")[:500].strip(),
                "published":    entry.get("published", datetime.now(timezone.utc).isoformat()),
                "collected_at": datetime.now(timezone.utc).isoformat(),
                "analyzed":     False,
            }
            if post["title"]:
                posts.append(post)
        print(f"    ✓ {len(posts)} posts")
        return posts
    except Exception as e:
        print(f"    ✗ {name} failed: {e}")
        return []


def load_existing_ids(filepath: str) -> set:
    seen = set()
    if not os.path.exists(filepath):
        return seen
    with open(filepath) as f:
        for line in f:
            try:
                seen.add(json.loads(line)["id"])
            except Exception:
                pass
    return seen


def save_posts(posts: list[dict], filepath: str, existing_ids: set) -> int:
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    new_count = 0
    with open(filepath, "a") as f:
        for post in posts:
            if post["id"] not in existing_ids:
                f.write(json.dumps(post) + "\n")
                existing_ids.add(post["id"])
                new_count += 1
    return new_count


def run_collection():
    print(f"\n{'='*50}")
    print(f"Collection run: {datetime.now(timezone.utc).isoformat()}")
    print(f"{'='*50}")

    existing_ids = load_existing_ids(OUTPUT_FILE)
    print(f"  Existing posts in store: {len(existing_ids)}\n")

    all_posts = []
    for name, url in RSS_FEEDS.items():
        posts = fetch_feed(name, url)
        all_posts.extend(posts)
        time.sleep(1)

    new = save_posts(all_posts, OUTPUT_FILE, existing_ids)
    print(f"\n✅ Done — {new} new posts saved ({len(all_posts)} fetched total)")
    return new


if __name__ == "__main__":
    run_collection()
