import http.server, sys, functools
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        http.server.SimpleHTTPRequestHandler.end_headers(self)
    def log_message(self, *a): pass
if __name__ == "__main__":
    port, root = int(sys.argv[1]), sys.argv[2]
    http.server.HTTPServer(("127.0.0.1", port),
        functools.partial(H, directory=root)).serve_forever()
