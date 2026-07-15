import os
import sys
import socket
from werkzeug.formparser import MultiPartParser

MultiPartParser.buffer_size = 510 * 1024 * 1024  # 64 MB

os.environ["PGCLIENTENCODING"] = "utf-8"

sys.path.append(os.path.dirname(os.path.abspath(__file__)))


from MaxLuc.app import create_app
from MaxLuc.app.extensions import db

app = create_app()


from flask import request, jsonify
import logging

logging.basicConfig(level=logging.INFO)

socket.setdefaulttimeout(1800)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()

    app.run(debug=True,host='0.0.0.0', port=5000,
        use_reloader=False, threaded=True)