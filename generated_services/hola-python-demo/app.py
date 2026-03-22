from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/", methods=["GET"])
def hola():
    nombre = request.args.get("nombre", "Mundo")
    return jsonify({"message": f"Hola {nombre}"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
