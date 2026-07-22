import json
import logging
import requests
import feedparser
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/release-notes")
def get_release_notes():
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        res = requests.get(FEED_URL, headers=headers, timeout=10)
        res.raise_for_status()
        
        feed = feedparser.parse(res.content)
        entries = []
        
        for idx, entry in enumerate(feed.entries):
            # Extract content or summary
            content_html = ""
            if "content" in entry and len(entry.content) > 0:
                content_html = entry.content[0].value
            elif "summary" in entry:
                content_html = entry.summary
            
            entries.append({
                "id": entry.get("id", f"entry-{idx}"),
                "title": entry.get("title", "Untitled Update"),
                "link": entry.get("link", "https://cloud.google.com/bigquery/docs/release-notes"),
                "updated": entry.get("updated", ""),
                "content_html": content_html
            })
            
        return jsonify({
            "status": "success",
            "count": len(entries),
            "feed_title": feed.feed.get("title", "BigQuery Release Notes"),
            "entries": entries
        })
    except Exception as e:
        logging.exception("Error fetching BigQuery release notes")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
