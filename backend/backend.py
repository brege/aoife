from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import os

app = Flask(__name__, static_folder="dist", static_url_path="")
CORS(app)


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
    headers = {"Client-ID": GAMESDB_KEY}
    try:
        if request.method == "POST":
            resp = requests.post(
                f"https://api.thegamesdb.net/{subpath}",
                json=request.json,
                headers=headers,
            )
        else:
            resp = requests.get(
                f"https://api.thegamesdb.net/{subpath}",
                params=dict(request.args),
                headers=headers,
            )
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Logging endpoint (optional telemetry)
@app.route("/api/log", methods=["POST"])
def log_event():
    return jsonify({"status": "ok"}), 200


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
