"""
Lightweight HTTP wrapper around collector.py
Lets the backend trigger collection via POST /collect
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import json
from collector import run_collection


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # suppress default access logs

    def do_GET(self):
        if self.path == '/health':
            self._respond(200, {"status": "ok", "service": "collector"})
        else:
            self._respond(404, {"error": "not found"})

    def do_POST(self):
        if self.path == '/collect':
            # Run in background thread so HTTP response returns immediately
            thread = threading.Thread(target=run_collection, daemon=True)
            thread.start()
            self._respond(200, {"status": "collection started"})
        else:
            self._respond(404, {"error": "not found"})

    def _respond(self, code, body):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())


if __name__ == '__main__':
    print("Collector server running on :8001")
    run_collection()  # run once on startup
    HTTPServer(('0.0.0.0', 8001), Handler).serve_forever()
