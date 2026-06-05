
import json
import math
import os
from pathlib import Path
from flask import Flask, send_from_directory, jsonify, request

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent

# Frontend folder
FRONTEND_DIR = BASE_DIR / 'Frontend'
if not FRONTEND_DIR.exists():
    FRONTEND_DIR = BASE_DIR / 'frontend'
if not FRONTEND_DIR.exists():
    raise RuntimeError("Could not find Frontend/ folder")

TEMPLATES_DIR = FRONTEND_DIR / 'templates'
CSS_DIR = FRONTEND_DIR / 'css'
JS_DIR = FRONTEND_DIR / 'js'
DATA_DIR = FRONTEND_DIR / 'data'
PROCESSED_DIR = DATA_DIR / 'processed'

print(f"📁 Base folder     : {BASE_DIR}")
print(f"📁 Frontend folder : {FRONTEND_DIR}")

# ─── Load Pre-computed Data (lightweight, no pandas/numpy) ────────────────────
analytics_data = None
dataset_index = None
ml_results = None


def load_all_data():
    """Load all pre-computed JSON data into memory. No heavy libraries needed."""
    global analytics_data, dataset_index, ml_results

    # 1. Analytics insights
    analytics_path = PROCESSED_DIR / 'analytics_insights.json'
    if analytics_path.exists():
        with open(analytics_path, 'r', encoding='utf-8') as f:
            analytics_data = json.load(f)
        print(f"✅ Analytics loaded ({analytics_path.stat().st_size // 1024} KB)")
    else:
        print("⚠️  analytics_insights.json not found")

    # 2. Dataset index (for search & browse API)
    index_path = PROCESSED_DIR / 'dataset_index.json'
    if index_path.exists():
        with open(index_path, 'r', encoding='utf-8') as f:
            dataset_index = json.load(f)
        print(f"✅ Dataset index loaded ({len(dataset_index)} records)")
    else:
        print("⚠️  dataset_index.json not found")

    # 3. ML results summary
    results_path = BASE_DIR / 'ml_results' / 'results_summary.json'
    if results_path.exists():
        with open(results_path, 'r', encoding='utf-8') as f:
            ml_results = json.load(f)
        print("✅ ML results loaded")
    else:
        print("⚠️  results_summary.json not found")


# ─── Flask app ────────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder=None)

# ─── Static File Routes ──────────────────────────────────────────────────────

@app.route('/')
def index():
    """Serve the main dashboard"""
    return send_from_directory(str(TEMPLATES_DIR), 'dashboard.html')


@app.route('/templates/<path:filename>')
def serve_template(filename):
    """Serve template files"""
    return send_from_directory(str(TEMPLATES_DIR), filename)


@app.route('/css/<path:filename>')
def serve_css(filename):
    """Serve CSS files"""
    return send_from_directory(str(CSS_DIR), filename)


@app.route('/js/<path:filename>')
def serve_js(filename):
    """Serve JS files"""
    return send_from_directory(str(JS_DIR), filename)


@app.route('/data/<path:filepath>')
def serve_data(filepath):
    """Serve data files"""
    return send_from_directory(str(DATA_DIR), filepath)


# ─── API Endpoints ────────────────────────────────────────────────────────────

@app.route('/api/health')
def api_health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'NetflixIQ Analytics Platform',
        'data_loaded': analytics_data is not None,
        'dataset_records': len(dataset_index) if dataset_index else 0
    })


@app.route('/api/analytics')
def api_analytics():
    """Return all analytics data from pre-computed JSON"""
    if analytics_data is None:
        return jsonify({'status': 'error', 'message': 'Analytics data not available'}), 500

    return jsonify({
        'status': 'success',
        'data': analytics_data
    })


@app.route('/api/summary')
def api_summary():
    """Return summary statistics"""
    if analytics_data and 'summary' in analytics_data:
        return jsonify({'status': 'success', 'data': analytics_data['summary']})
    return jsonify({'status': 'error', 'message': 'Summary not available'}), 500


@app.route('/api/genres')
def api_genres():
    """Return genre analytics"""
    if analytics_data and 'genres' in analytics_data:
        return jsonify({'status': 'success', 'data': analytics_data['genres']})
    return jsonify({'status': 'error', 'message': 'Genre data not available'}), 500


@app.route('/api/countries')
def api_countries():
    """Return country analytics"""
    if analytics_data and 'countries' in analytics_data:
        return jsonify({'status': 'success', 'data': analytics_data['countries']})
    return jsonify({'status': 'error', 'message': 'Country data not available'}), 500


@app.route('/api/trends')
def api_trends():
    """Return trend analytics"""
    if analytics_data and 'trends' in analytics_data:
        return jsonify({'status': 'success', 'data': analytics_data['trends']})
    return jsonify({'status': 'error', 'message': 'Trend data not available'}), 500


@app.route('/api/ratings')
def api_ratings():
    """Return rating analytics"""
    if analytics_data and 'ratings' in analytics_data:
        return jsonify({'status': 'success', 'data': analytics_data['ratings']})
    return jsonify({'status': 'error', 'message': 'Rating data not available'}), 500


@app.route('/api/search')
def api_search():
    """Search content by title using pre-loaded JSON index (no pandas needed)"""
    query = request.args.get('q', '').lower()
    limit = int(request.args.get('limit', 20))

    if not query:
        return jsonify({'status': 'error', 'message': 'Query required'}), 400

    if dataset_index is None:
        return jsonify({'status': 'error', 'message': 'Dataset not loaded'}), 500

    # Search in title field (key: 't')
    results = []
    for row in dataset_index:
        title = str(row.get('t', ''))
        if query in title.lower():
            results.append({
                'title': title,
                'content_type': row.get('ct', ''),
                'release_year': row.get('y', ''),
                'primary_genre': row.get('g', ''),
                'imdb_score': row.get('r', ''),
                'country': row.get('c', ''),
                'runtime_minutes': row.get('rt', '')
            })
            if len(results) >= limit:
                break

    return jsonify({
        'status': 'success',
        'query': query,
        'count': len(results),
        'results': results
    })


@app.route('/api/dataset')
def api_dataset():
    """Return the dataset (paginated) from pre-loaded JSON index"""
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))

    if dataset_index is None:
        return jsonify({'status': 'error', 'message': 'Dataset not loaded'}), 500

    total_records = len(dataset_index)
    total_pages = math.ceil(total_records / per_page)

    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page

    # Expand short keys back to full names for API consumers
    results = []
    for row in dataset_index[start_idx:end_idx]:
        results.append({
            'title': row.get('t', ''),
            'content_type': row.get('ct', ''),
            'release_year': row.get('y', ''),
            'primary_genre': row.get('g', ''),
            'imdb_score': row.get('r', ''),
            'country': row.get('c', ''),
            'runtime_minutes': row.get('rt', '')
        })

    return jsonify({
        'status': 'success',
        'page': page,
        'per_page': per_page,
        'total_pages': total_pages,
        'total_records': total_records,
        'data': results
    })


@app.route('/api/predictions')
def api_predictions():
    """Get ML model performance from pre-computed results"""
    if ml_results is None:
        return jsonify({'status': 'error', 'message': 'ML results not available'}), 404

    return jsonify({
        'status': 'success',
        'data': ml_results,
        'models': {
            'regression': ml_results.get('regression', {}),
            'classification': ml_results.get('classification', {}),
        },
        'feature_importance': ml_results.get('shap_features', {})
    })


# ─── Error Handlers ───────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({
        'status': 'error',
        'message': '404 Not Found: The requested URL was not found on the server.'
    }), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({
        'status': 'error',
        'message': 'Internal server error'
    }), 500


# ─── Main ─────────────────────────────────────────────────────────────────────

# Load all pre-computed data on startup (for gunicorn)
load_all_data()

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 NetflixIQ Analytics Platform")
    print("=" * 60)
    print("📍 Dashboard: http://localhost:8080/")
    print("📍 API Health: http://localhost:8080/api/health")
    print("📍 Analytics: http://localhost:8080/api/analytics")
    print("=" * 60)

    app.run(host='0.0.0.0', port=8080, debug=False)
