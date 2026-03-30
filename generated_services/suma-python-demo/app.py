from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route("/sumar", methods=["GET"])
def sumar():
    a = request.args.get("a", default=0, type=int)
    b = request.args.get("b", default=0, type=int)
    return jsonify({"a": a, "b": b, "resultado": a + b})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
