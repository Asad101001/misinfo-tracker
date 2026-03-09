"""
Lightweight HTTP wrapper around analyzer.py
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import json
from analyzer import run_analysis


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path == '/health':
            self._respond(200, {"status": "ok", "service": "analyzer"})
        else:
            self._respond(404, {"error": "not found"})

    def do_POST(self):
        if self.path == '/analyze':
            thread = threading.Thread(target=run_analysis, kwargs={"limit": 10}, daemon=True)
            thread.start()
            self._respond(200, {"status": "analysis started"})
        else:
            self._respond(404, {"error": "not found"})

    def _respond(self, code, body):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())


if __name__ == '__main__':
    print("Analyzer server running on :8002")
    run_analysis(limit=10)  # run once on startup
    HTTPServer(('0.0.0.0', 8002), Handler).serve_forever()
