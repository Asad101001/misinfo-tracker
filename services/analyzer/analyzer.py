"""
Analyzer Service — Misinfo Tracker
Primary AI  : Groq (llama-3.3-70b-versatile) — 14,400 req/day free
Fallback AI : Mistral (mistral-small-latest) — ~1B tokens/month free
Fact Check  : Google Fact Check Tools API
"""

import json
import os
import requests
import time
from datetime import datetime, timezone
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv("../../.env")

# ── Clients — both OpenAI-compatible, zero extra SDK needed ──────────────────

groq = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url=os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
)
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

mistral = OpenAI(
    api_key=os.getenv("MISTRAL_API_KEY"),
    base_url=os.getenv("MISTRAL_BASE_URL", "https://api.mistral.ai/v1"),
)
MISTRAL_MODEL = os.getenv("MISTRAL_MODEL", "mistral-small-latest")

GOOGLE_FACTCHECK_KEY = os.getenv("GOOGLE_FACTCHECK_API_KEY")

INPUT_FILE  = "../../data/raw_posts.jsonl"
OUTPUT_FILE = "../../data/analyzed_posts.jsonl"


# ── AI Wrapper ────────────────────────────────────────────────────────────────

def ask_ai(prompt: str) -> str:
    """Groq primary, Mistral fallback. Both OpenAI-compatible."""
    try:
        response = groq.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=400,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"    ⚠ Groq failed ({e}) — falling back to Mistral")

    try:
        response = mistral.chat.completions.create(
            model=MISTRAL_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=400,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        raise RuntimeError(f"Both AI providers failed. Last error: {e}")


def clean_json(raw: str) -> str:
    return raw.replace("```json", "").replace("```", "").strip()


# ── Claim Extraction ──────────────────────────────────────────────────────────

def extract_claims(title: str, summary: str) -> list[str]:
    prompt = f"""You are a fact-checking assistant. Extract up to 3 specific, verifiable
factual claims from this news item. A claim must be a concrete statement checkable as
true or false — not an opinion, prediction, or vague assertion.

Return ONLY a JSON array of strings. If no verifiable claims exist, return [].

Headline: {title}
Summary: {summary}

Return format example: ["Claim one here", "Claim two here"]"""

    try:
        raw = ask_ai(prompt)
        claims = json.loads(clean_json(raw))
        return claims if isinstance(claims, list) else []
    except Exception as e:
        print(f"    ✗ Claim extraction error: {e}")
        return []


# ── Fact Checking ─────────────────────────────────────────────────────────────

def check_claim(claim: str) -> dict:
    if not GOOGLE_FACTCHECK_KEY or GOOGLE_FACTCHECK_KEY == "your_factcheck_key_here":
        return {}
    try:
        r = requests.get(
            "https://factchecktools.googleapis.com/v1alpha1/claims:search",
            params={"query": claim, "key": GOOGLE_FACTCHECK_KEY, "pageSize": 3},
            timeout=10,
        )
        data = r.json()
        claims = data.get("claims", [])
        if not claims:
            return {}
        review = claims[0].get("claimReview", [{}])[0]
        return {
            "publisher": review.get("publisher", {}).get("name", ""),
            "url":       review.get("url", ""),
            "verdict":   review.get("textualRating", ""),
        }
    except Exception as e:
        print(f"    ✗ Fact check API error: {e}")
        return {}


# ── Veracity Scoring ──────────────────────────────────────────────────────────

def score_veracity(claim: str, fact_check: dict) -> dict:
    fc_context = ""
    if fact_check and fact_check.get("verdict"):
        fc_context = (
            f'\nA fact-checker ({fact_check["publisher"]}) rated this: '
            f'"{fact_check["verdict"]}".'
        )

    prompt = f"""You are a misinformation analyst. Rate the veracity of this claim.{fc_context}

Claim: "{claim}"

Respond ONLY with a JSON object — no extra text, no markdown fences:
{{
  "rating": "TRUE" | "MOSTLY_TRUE" | "MIXED" | "MOSTLY_FALSE" | "FALSE" | "UNVERIFIABLE",
  "confidence": <float 0.0-1.0>,
  "explanation": "<one concise sentence>",
  "misinformation_risk": "LOW" | "MEDIUM" | "HIGH"
}}"""

    try:
        raw = ask_ai(prompt)
        result = json.loads(clean_json(raw))
        for key in ("rating", "confidence", "explanation", "misinformation_risk"):
            if key not in result:
                raise ValueError(f"Missing key: {key}")
        return result
    except Exception as e:
        print(f"    ✗ Veracity scoring error: {e}")
        return {
            "rating": "UNVERIFIABLE",
            "confidence": 0.0,
            "explanation": "Analysis could not be completed.",
            "misinformation_risk": "LOW",
        }


# ── Main Loop ─────────────────────────────────────────────────────────────────

def load_analyzed_ids(filepath: str) -> set:
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


def run_analysis(limit: int = 10):
    if not os.path.exists(INPUT_FILE):
        print("❌ No raw posts found. Run collector.py first.")
        return

    analyzed_ids = load_analyzed_ids(OUTPUT_FILE)

    unanalyzed = []
    with open(INPUT_FILE) as f:
        for line in f:
            try:
                post = json.loads(line)
                if post["id"] not in analyzed_ids:
                    unanalyzed.append(post)
            except Exception:
                pass

    print(f"\n{'='*50}")
    print(f"Analysis run: {datetime.now(timezone.utc).isoformat()}")
    print(f"  Queued: {len(unanalyzed)} | Processing: {min(limit, len(unanalyzed))}")
    print(f"{'='*50}\n")

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(OUTPUT_FILE, "a") as out:
        for i, post in enumerate(unanalyzed[:limit]):
            print(f"[{i+1}/{min(limit, len(unanalyzed))}] {post['title'][:70]}...")

            claims = extract_claims(post["title"], post.get("summary", ""))
            print(f"  → {len(claims)} claim(s) extracted")

            analyzed_claims = []
            for claim in claims:
                fact_check = check_claim(claim)
                veracity   = score_veracity(claim, fact_check)
                analyzed_claims.append({
                    "claim":      claim,
                    "fact_check": fact_check,
                    "veracity":   veracity,
                })
                time.sleep(0.3)

            risk_rank = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
            enriched = {
                **post,
                "analyzed":     True,
                "analyzed_at":  datetime.now(timezone.utc).isoformat(),
                "claims":       analyzed_claims,
                "highest_risk": max(
                    (c["veracity"].get("misinformation_risk", "LOW") for c in analyzed_claims),
                    key=lambda x: risk_rank.get(x, 0),
                    default="LOW",
                ) if analyzed_claims else "LOW",
            }

            out.write(json.dumps(enriched) + "\n")
            analyzed_ids.add(post["id"])
            print(f"  ✓ Saved | Risk: {enriched['highest_risk']}\n")
            time.sleep(0.5)

    print(f"✅ Analysis complete — {min(limit, len(unanalyzed))} posts processed")


if __name__ == "__main__":
    run_analysis(limit=10)
