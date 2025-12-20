from flask import Flask, request, jsonify, send_from_directory, redirect
from flask_cors import CORS
from flask_limiter import Limiter
import fcntl
from typing import IO
import ipaddress
import json
import os
import random
import tempfile
import time
from urllib.parse import urlparse
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
DATA_DIRECTORY_PATH = os.path.join(PROJECT_ROOT, "data")

app = Flask(__name__, static_folder=DIST_PATH, static_url_path="")
CORS(app)

SHARE_STORE_PATH = os.path.join(DATA_DIRECTORY_PATH, "share.json")
SHARE_STORE_LOCK_PATH = os.path.join(DATA_DIRECTORY_PATH, "share.lock")
SLUG_WORDS_PATH = os.path.join(DATA_DIRECTORY_PATH, "slugs.json")
RATE_LIMIT_EXEMPT_ADDRESSES_PATH = os.path.join(DATA_DIRECTORY_PATH, "whitelist.txt")


def load_share_store() -> dict:
    if not os.path.exists(SHARE_STORE_PATH):
        return {}
    with open(SHARE_STORE_PATH, "r", encoding="utf-8") as handle:
        data = json.load(handle)
        if not isinstance(data, dict):
            raise ValueError("Share store file is invalid")
        return data


def load_slug_words() -> list[str]:
    if not os.path.exists(SLUG_WORDS_PATH):
        raise FileNotFoundError(f"Slug word list is missing: {SLUG_WORDS_PATH}")

    with open(SLUG_WORDS_PATH, "r", encoding="utf-8") as handle:
        words = json.load(handle)
        if not isinstance(words, list) or not all(isinstance(w, str) for w in words):
            raise ValueError("Slug word list is invalid")
        if len(words) < 8:
            raise ValueError("Slug word list is too short")
        return words


def persist_share_store(store: dict) -> None:
    if not os.path.isdir(DATA_DIRECTORY_PATH):
        raise FileNotFoundError(f"Missing data directory at {DATA_DIRECTORY_PATH}")
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=DATA_DIRECTORY_PATH,
        prefix="share-",
        suffix=".tmp",
        delete=False,
    ) as handle:
        json.dump(store, handle)
        temporary_path = handle.name
    os.replace(temporary_path, SHARE_STORE_PATH)


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


def acquire_share_store_lock(exclusive: bool) -> IO[str]:
    if not os.path.isdir(DATA_DIRECTORY_PATH):
        raise FileNotFoundError(f"Missing data directory at {DATA_DIRECTORY_PATH}")
    lock_handle = open(SHARE_STORE_LOCK_PATH, "a", encoding="utf-8")
    lock_type = fcntl.LOCK_EX if exclusive else fcntl.LOCK_SH
    fcntl.flock(lock_handle.fileno(), lock_type)
    return lock_handle


def get_rate_limit_exempt_addresses() -> set[str]:
    if not os.path.exists(RATE_LIMIT_EXEMPT_ADDRESSES_PATH):
        return set()
    with open(RATE_LIMIT_EXEMPT_ADDRESSES_PATH, "r", encoding="utf-8") as handle:
        addresses: set[str] = set()
        for line in handle:
            address = line.strip()
            if not address:
                raise ValueError("Rate limit address list contains a blank line")
            ipaddress.ip_address(address)
            addresses.add(address)
        return addresses


def get_client_address() -> str | None:
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip() or None
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip() or None
    return request.remote_addr


def get_rate_limit_address() -> str:
    address = get_client_address()
    if not address:
        raise ValueError("Client address is required for rate limiting")
    return address


def is_rate_limit_exempt() -> bool:
    exempt_addresses = get_rate_limit_exempt_addresses()
    if not exempt_addresses:
        return False
    return get_rate_limit_address() in exempt_addresses


def resolve_rate_limit_key() -> str:
    return get_rate_limit_address()


def get_user_agent() -> str | None:
    user_agent = request.headers.get("User-Agent")
    if user_agent:
        return user_agent.strip() or None
    return None


limiter = Limiter(
    key_func=resolve_rate_limit_key,
    app=app,
    default_limits=[],
)


@limiter.request_filter
def rate_limit_exempt_request() -> bool:
    return is_rate_limit_exempt()


@app.after_request
def set_csp_header(response):
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://api.themoviedb.org https://musicbrainz.org https://thegamesdb.net https://api.thegamesdb.net https://coverartarchive.org https://itunes.apple.com https://openlibrary.org https://www.googleapis.com https://archive.org https://*.archive.org; font-src 'self' data:"
    )
    return response


TMDB_KEY = os.getenv("VITE_TMDB_API_KEY")
GAMESDB_KEY = os.getenv("VITE_GAMESDB_PUBLIC_KEY")
UPSTREAM_TIMEOUT_SECONDS = 10
MAX_SHARE_PAYLOAD_BYTES = 200_000
MAX_SHARE_ITEMS = 24
MAX_ALTERNATE_COVERS = 32
RATE_LIMIT_UPSTREAM = "120 per minute"
RATE_LIMIT_SHARE_CREATE = "20 per minute"
RATE_LIMIT_SHARE_READ = "240 per hour"
RATE_LIMIT_LOG_EVENT = "60 per minute"


def is_allowed_cover_url(value: str) -> bool:
    if value.startswith("data:") or value.startswith("blob:"):
        return False

    if value.startswith("/api/gamesdb/images/"):
        return True
    if value.startswith("/api/coverart/image"):
        return True

    parsed = urlparse(value)
    if parsed.scheme != "https":
        return False

    host = parsed.netloc
    if host == "image.tmdb.org":
        return True
    if host == "covers.openlibrary.org":
        return True
    if host == "coverartarchive.org":
        return True
    if host.endswith(".mzstatic.com") or host == "mzstatic.com":
        return True
    if host in (
        "images-na.ssl-images-amazon.com",
        "m.media-amazon.com",
        "images.amazon.com",
        "i.gr-assets.com",
        "images.gr-assets.com",
    ):
        return True

    return False


def validate_and_canonicalize_share_payload(payload: str) -> str:
    payload_bytes = payload.encode("utf-8")
    if len(payload_bytes) > MAX_SHARE_PAYLOAD_BYTES:
        raise ValueError("Share payload is too large")

    data = json.loads(payload)
    if not isinstance(data, dict):
        raise ValueError("Share payload must be a JSON object")

    grid_items = data.get("gridItems")
    if not isinstance(grid_items, list):
        raise ValueError("Share payload gridItems must be a list")
    if len(grid_items) > MAX_SHARE_ITEMS:
        raise ValueError("Share payload has too many items")

    columns = data.get("columns")
    min_rows = data.get("minRows")
    layout_dimension = data.get("layoutDimension")

    if not isinstance(columns, int) or columns < 1 or columns > 8:
        raise ValueError("Share payload columns is invalid")
    if not isinstance(min_rows, int) or min_rows < 1 or min_rows > 12:
        raise ValueError("Share payload minRows is invalid")
    if layout_dimension not in ("width", "height"):
        raise ValueError("Share payload layoutDimension is invalid")

    canonical_items: list[dict] = []

    for item in grid_items:
        if not isinstance(item, dict):
            raise ValueError("Share payload gridItems entries must be objects")

        media_type = item.get("type")
        if media_type == "custom":
            raise ValueError("Custom uploads cannot be shared")
        if not isinstance(media_type, str) or not media_type:
            raise ValueError("Share payload item type is invalid")

        media_id = item.get("id")
        if not isinstance(media_id, (str, int)):
            raise ValueError("Share payload item id is invalid")

        title = item.get("title")
        if not isinstance(title, str) or not title.strip():
            raise ValueError("Share payload item title is invalid")

        cover_url = item.get("coverUrl")
        if cover_url is not None:
            if not isinstance(cover_url, str) or not is_allowed_cover_url(cover_url):
                raise ValueError("Share payload item coverUrl is not allowed")

        cover_thumbnail_url = item.get("coverThumbnailUrl")
        if cover_thumbnail_url is not None:
            if not isinstance(cover_thumbnail_url, str) or not is_allowed_cover_url(
                cover_thumbnail_url
            ):
                raise ValueError("Share payload item coverThumbnailUrl is not allowed")

        alternate_cover_urls = item.get("alternateCoverUrls")
        if alternate_cover_urls is not None:
            if not isinstance(alternate_cover_urls, list):
                raise ValueError("Share payload item alternateCoverUrls is invalid")
            if len(alternate_cover_urls) > MAX_ALTERNATE_COVERS:
                raise ValueError("Share payload item alternateCoverUrls is too large")
            for url in alternate_cover_urls:
                if not isinstance(url, str) or not is_allowed_cover_url(url):
                    raise ValueError(
                        "Share payload item alternateCoverUrls contains a disallowed URL"
                    )

        year = item.get("year")
        if year is not None and not isinstance(year, int):
            raise ValueError("Share payload item year is invalid")

        subtitle = item.get("subtitle")
        if subtitle is not None and not isinstance(subtitle, str):
            raise ValueError("Share payload item subtitle is invalid")

        caption = item.get("caption")
        if caption is not None and not isinstance(caption, str):
            raise ValueError("Share payload item caption is invalid")

        source = item.get("source")
        if source is not None and not isinstance(source, str):
            raise ValueError("Share payload item source is invalid")

        aspect_ratio = item.get("aspectRatio")
        if aspect_ratio is not None and not isinstance(aspect_ratio, (int, float)):
            raise ValueError("Share payload item aspectRatio is invalid")

        canonical_items.append(
            {
                "id": media_id,
                "type": media_type,
                "title": title,
                "subtitle": subtitle,
                "caption": caption,
                "year": year,
                "coverUrl": cover_url,
                "coverThumbnailUrl": cover_thumbnail_url,
                "source": source,
                "aspectRatio": aspect_ratio,
            }
        )

    canonical_payload = {
        "gridItems": canonical_items,
        "columns": columns,
        "minRows": min_rows,
        "layoutDimension": layout_dimension,
    }

    return json.dumps(canonical_payload, separators=(",", ":"))


# Proxy TMDB requests
@app.route("/api/tmdb/<path:subpath>", methods=["GET"])
@limiter.limit(RATE_LIMIT_UPSTREAM)
def proxy_tmdb(subpath):
    params = dict(request.args)
    params["api_key"] = TMDB_KEY
    try:
        resp = requests.get(
            f"https://api.themoviedb.org/{subpath}",
            params=params,
            timeout=UPSTREAM_TIMEOUT_SECONDS,
        )
        return jsonify(resp.json()), resp.status_code
    except requests.exceptions.Timeout:
        return jsonify({"error": "Upstream request timed out"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Proxy OpenLibrary requests
@app.route("/api/openlibrary/<path:subpath>", methods=["GET"])
@limiter.limit(RATE_LIMIT_UPSTREAM)
def proxy_openlibrary(subpath):
    try:
        resp = requests.get(
            f"https://openlibrary.org/{subpath}",
            params=dict(request.args),
            timeout=UPSTREAM_TIMEOUT_SECONDS,
        )
        return jsonify(resp.json()), resp.status_code
    except requests.exceptions.Timeout:
        return jsonify({"error": "Upstream request timed out"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Proxy GamesDB requests
@app.route("/api/gamesdb/<path:subpath>", methods=["GET", "POST"])
@limiter.limit(RATE_LIMIT_UPSTREAM)
def proxy_gamesdb(subpath):
    try:
        if request.method == "POST":
            params = dict(request.args)
            params["apikey"] = GAMESDB_KEY
            resp = requests.post(
                f"https://api.thegamesdb.net/{subpath}",
                json=request.json,
                params=params,
                timeout=UPSTREAM_TIMEOUT_SECONDS,
            )
        else:
            params = dict(request.args)
            params["apikey"] = GAMESDB_KEY
            resp = requests.get(
                f"https://api.thegamesdb.net/{subpath}",
                params=params,
                timeout=UPSTREAM_TIMEOUT_SECONDS,
            )
        return jsonify(resp.json()), resp.status_code
    except requests.exceptions.Timeout:
        return jsonify({"error": "Upstream request timed out"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Proxy GamesDB CDN images
@app.route("/api/gamesdb/images/<path:subpath>", methods=["GET"])
@limiter.limit(RATE_LIMIT_UPSTREAM)
def proxy_gamesdb_images(subpath):
    try:
        resp = requests.get(
            f"https://cdn.thegamesdb.net/images/large/{subpath}",
            timeout=UPSTREAM_TIMEOUT_SECONDS,
        )
        return (
            resp.content,
            resp.status_code,
            {
                "Content-Type": resp.headers.get("Content-Type", "image/jpeg"),
            },
        )
    except requests.exceptions.Timeout:
        return jsonify({"error": "Upstream request timed out"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/coverart/image", methods=["GET"])
@limiter.limit(RATE_LIMIT_UPSTREAM)
def proxy_coverart_image():
    cover_type = request.args.get("type")
    cover_id = request.args.get("id")
    size = request.args.get("size", "500")
    if cover_type != "release":
        return jsonify({"error": "Invalid cover type"}), 400
    if not cover_id:
        return jsonify({"error": "Missing cover id"}), 400
    if size not in ("250", "500"):
        size = "500"

    try:
        resp = requests.get(
            f"https://coverartarchive.org/release/{cover_id}/front-{size}",
            timeout=UPSTREAM_TIMEOUT_SECONDS,
            allow_redirects=False,
        )
        if 300 <= resp.status_code < 400 and resp.headers.get("Location"):
            return redirect(resp.headers.get("Location"), code=resp.status_code)
        return (
            resp.content,
            resp.status_code,
            {"Content-Type": resp.headers.get("Content-Type", "image/jpeg")},
        )
    except requests.exceptions.Timeout:
        return ("Not found", 404)
    except Exception:
        return ("Not found", 404)


# Logging endpoint (optional telemetry)
@app.route("/api/log", methods=["POST"])
@limiter.limit(RATE_LIMIT_LOG_EVENT)
def log_event():
    return jsonify({"status": "ok"}), 200


@app.route("/api/share", methods=["POST"])
@limiter.limit(RATE_LIMIT_SHARE_CREATE)
def create_share():
    body = request.get_json(silent=False)
    payload = body.get("payload") if isinstance(body, dict) else None
    title = body.get("title") if isinstance(body, dict) else None
    if not isinstance(payload, str) or not payload.strip():
        return (
            jsonify({"error": "payload must be a non-empty string"}),
            400,
        )
    if not isinstance(title, str) or not title.strip():
        return jsonify({"error": "title must be a non-empty string"}), 400

    try:
        canonical_payload = validate_and_canonicalize_share_payload(payload)
    except json.JSONDecodeError:
        return jsonify({"error": "payload must be valid JSON"}), 400
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    lock_handle = acquire_share_store_lock(exclusive=True)
    try:
        store = load_share_store()
        slug = generate_slug(set(store.keys()))
        store[slug] = {
            "payload": canonical_payload,
            "createdAt": int(time.time()),
            "title": title,
            "clientAddress": get_client_address(),
            "userAgent": get_user_agent(),
        }
        persist_share_store(store)
    finally:
        lock_handle.close()

    return jsonify({"slug": slug, "id": slug})


@app.route("/api/share/<slug>", methods=["GET"])
@limiter.limit(RATE_LIMIT_SHARE_READ)
def get_share(slug: str):
    lock_handle = acquire_share_store_lock(exclusive=False)
    try:
        store = load_share_store()
    finally:
        lock_handle.close()
    record = store.get(slug)
    if not record:
        return jsonify({"error": "Share not found"}), 404

    payload = record.get("payload")
    if not isinstance(payload, str):
        return jsonify({"error": "Share payload is invalid"}), 500

    title = record.get("title")
    if title is not None and not isinstance(title, str):
        return jsonify({"error": "Share title is invalid"}), 500

    return jsonify({"slug": slug, "payload": payload, "title": title})


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
