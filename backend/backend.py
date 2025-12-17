from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
import random
import time
from dotenv import load_dotenv
import requests

load_dotenv()

CURRENT_DIRECTORY = os.path.abspath(os.path.dirname(__file__))
PARENT_DIRECTORY = os.path.abspath(os.path.join(CURRENT_DIRECTORY, ".."))


def resolve_project_root() -> str:
    if os.path.exists(os.path.join(CURRENT_DIRECTORY, "dist")):
        return CURRENT_DIRECTORY
    if os.path.exists(os.path.join(PARENT_DIRECTORY, "dist")):
        return PARENT_DIRECTORY
    return CURRENT_DIRECTORY


PROJECT_ROOT = resolve_project_root()
DIST_PATH = os.path.join(PROJECT_ROOT, "dist")

app = Flask(__name__, static_folder=DIST_PATH, static_url_path="")
CORS(app)

SHARE_STORE_PATH = os.path.join(PROJECT_ROOT, "share_store.json")
SLUG_WORDS_PATHS = [
    os.path.join(PROJECT_ROOT, "slugs.json"),
    os.path.join(PROJECT_ROOT, "src", "lib", "slugs.json"),
]


def load_share_store() -> dict:
    if not os.path.exists(SHARE_STORE_PATH):
        return {}
    with open(SHARE_STORE_PATH, "r", encoding="utf-8") as handle:
        data = json.load(handle)
        if not isinstance(data, dict):
            raise ValueError("Share store file is invalid")
        return data


def load_slug_words() -> list[str]:
    slug_path = next((p for p in SLUG_WORDS_PATHS if os.path.exists(p)), None)
    if not slug_path:
        raise FileNotFoundError("Slug word list is missing")

    with open(slug_path, "r", encoding="utf-8") as handle:
        words = json.load(handle)
        if not isinstance(words, list) or not all(isinstance(w, str) for w in words):
            raise ValueError("Slug word list is invalid")
        if len(words) < 8:
            raise ValueError("Slug word list is too short")
        return words


def persist_share_store(store: dict) -> None:
    with open(SHARE_STORE_PATH, "w", encoding="utf-8") as handle:
        json.dump(store, handle)


_SLUG_WORDS: list[str] | None = None


def get_slug_words() -> list[str]:
    global _SLUG_WORDS
    if _SLUG_WORDS is None:
        _SLUG_WORDS = load_slug_words()
    return _SLUG_WORDS


def generate_slug(existing: set[str]) -> str:
    for _ in range(10):
        slug_words = get_slug_words()
        slug = "-".join(random.choice(slug_words) for _ in range(3))
        if slug not in existing:
            return slug
    raise RuntimeError("Unable to generate unique share slug")


SHARE_STORE = load_share_store()


@app.after_request
def set_csp_header(response):
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://api.themoviedb.org https://musicbrainz.org https://thegamesdb.net https://api.thegamesdb.net https://coverartarchive.org https://itunes.apple.com https://api.deezer.com https://openlibrary.org https://www.googleapis.com https://archive.org; font-src 'self' data:"
    )
    return response


TMDB_KEY = os.getenv("VITE_TMDB_API_KEY")
GAMESDB_KEY = os.getenv("VITE_GAMESDB_PUBLIC_KEY")


# Proxy TMDB requests
@app.route("/api/tmdb/<path:subpath>", methods=["GET"])
def proxy_tmdb(subpath):
    params = dict(request.args)
    params["api_key"] = TMDB_KEY
    try:
        resp = requests.get(f"https://api.themoviedb.org/{subpath}", params=params)
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Proxy GamesDB requests
@app.route("/api/gamesdb/<path:subpath>", methods=["GET", "POST"])
def proxy_gamesdb(subpath):
    try:
        if request.method == "POST":
            params = dict(request.args)
            params["apikey"] = GAMESDB_KEY
            resp = requests.post(
                f"https://api.thegamesdb.net/{subpath}",
                json=request.json,
                params=params,
            )
        else:
            params = dict(request.args)
            params["apikey"] = GAMESDB_KEY
            resp = requests.get(
                f"https://api.thegamesdb.net/{subpath}",
                params=params,
            )
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Proxy GamesDB CDN images
@app.route("/api/gamesdb/images/<path:subpath>", methods=["GET"])
def proxy_gamesdb_images(subpath):
    try:
        resp = requests.get(f"https://cdn.thegamesdb.net/images/large/{subpath}")
        return (
            resp.content,
            resp.status_code,
            {
                "Content-Type": resp.headers.get("Content-Type", "image/jpeg"),
            },
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Logging endpoint (optional telemetry)
@app.route("/api/log", methods=["POST"])
def log_event():
    return jsonify({"status": "ok"}), 200


@app.route("/api/share", methods=["POST"])
def create_share():
    body = request.get_json(silent=False)
    payload = body.get("payload") if isinstance(body, dict) else None
    if not isinstance(payload, str) or not payload.strip():
        return (
            jsonify({"error": "payload must be a non-empty string"}),
            400,
        )

    slug = generate_slug(set(SHARE_STORE.keys()))
    SHARE_STORE[slug] = {"payload": payload, "createdAt": int(time.time())}

    try:
        persist_share_store(SHARE_STORE)
    except Exception as exc:
        SHARE_STORE.pop(slug, None)
        return jsonify({"error": f"Failed to persist share: {exc}"}), 500

    return jsonify({"slug": slug, "id": slug})


@app.route("/api/share/<slug>", methods=["GET"])
def get_share(slug: str):
    record = SHARE_STORE.get(slug)
    if not record:
        return jsonify({"error": "Share not found"}), 404

    payload = record.get("payload")
    if not isinstance(payload, str):
        return jsonify({"error": "Share payload is invalid"}), 500

    return jsonify({"slug": slug, "payload": payload})


# Serve static files and SPA
@app.route("/")
def serve_root():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def serve_static(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
