from flask import Flask, request, jsonify
from collections import Counter
import re

app = Flask(__name__)

request_stats = {
    "analyze_calls": 0,
    "compare_calls": 0
}

STOPWORDS = {
    "el", "la", "los", "las", "un", "una", "unos", "unas",
    "de", "del", "al", "y", "o", "u", "a", "en", "con",
    "por", "para", "que", "se", "su", "sus", "es", "son",
    "como", "más", "mas", "menos", "lo", "le", "les"
}


def normalize_text(text):
    return re.sub(r"\s+", " ", text.strip())


def tokenize(text):
    return re.findall(r"[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]+", text.lower())


def top_words(tokens, n=10):
    filtered = [word for word in tokens if word not in STOPWORDS and len(word) > 1]
    counts = Counter(filtered)
    return [{"word": word, "count": count} for word, count in counts.most_common(n)]


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "service": "analizador-texto-pro",
        "status": "running",
        "endpoints": [
            "GET /",
            "GET /health",
            "POST /analyze",
            "POST /compare",
            "GET /stats"
        ]
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "analizador-texto-pro"
    })


@app.route("/analyze", methods=["POST"])
def analyze():
    request_stats["analyze_calls"] += 1

    data = request.get_json(silent=True) or {}
    text = data.get("text", "")
    include_top = data.get("include_top_words", True)

    if not isinstance(text, str) or not text.strip():
        return jsonify({
            "error": "Debes enviar un campo 'text' no vacío."
        }), 400

    clean_text = normalize_text(text)
    tokens = tokenize(clean_text)

    sentences = [s for s in re.split(r"[.!?]+", clean_text) if s.strip()]
    paragraphs = [p for p in text.split("\n") if p.strip()]

    char_count = len(clean_text)
    char_count_no_spaces = len(clean_text.replace(" ", ""))
    word_count = len(tokens)
    sentence_count = len(sentences)
    paragraph_count = len(paragraphs)
    avg_word_length = round(sum(len(t) for t in tokens) / word_count, 2) if word_count else 0
    estimated_reading_time_minutes = round(word_count / 200, 2)

    response = {
        "summary": {
            "characters": char_count,
            "characters_without_spaces": char_count_no_spaces,
            "words": word_count,
            "sentences": sentence_count,
            "paragraphs": paragraph_count,
            "average_word_length": avg_word_length,
            "estimated_reading_time_minutes": estimated_reading_time_minutes
        }
    }

    if include_top:
        response["top_words"] = top_words(tokens, 10)

    return jsonify(response)


@app.route("/compare", methods=["POST"])
def compare():
    request_stats["compare_calls"] += 1

    data = request.get_json(silent=True) or {}
    text1 = data.get("text1", "")
    text2 = data.get("text2", "")

    if not isinstance(text1, str) or not text1.strip():
        return jsonify({"error": "Debes enviar 'text1' no vacío."}), 400

    if not isinstance(text2, str) or not text2.strip():
        return jsonify({"error": "Debes enviar 'text2' no vacío."}), 400

    tokens1 = set(tokenize(text1))
    tokens2 = set(tokenize(text2))

    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)

    similarity = round((len(intersection) / len(union)) * 100, 2) if union else 0

    return jsonify({
        "comparison": {
            "similarity_percent": similarity,
            "unique_words_text1": len(tokens1),
            "unique_words_text2": len(tokens2),
            "common_words_count": len(intersection),
            "common_words_sample": sorted(list(intersection))[:15]
        }
    })


@app.route("/stats", methods=["GET"])
def stats():
    return jsonify({
        "usage_stats": request_stats
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)