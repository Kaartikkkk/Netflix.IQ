
import json
import os
import sys
from pathlib import Path
from flask import Flask, send_from_directory, jsonify, request, redirect

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent

# Add src directory to Python path for imports
SRC_DIR = BASE_DIR / 'src'
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

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
DATASET_PATH = BASE_DIR / 'Dataset.csv'

print(f"📁 Base folder     : {BASE_DIR}")
print(f"📁 Frontend folder : {FRONTEND_DIR}")
print(f"📁 Templates folder: {TEMPLATES_DIR}")
print(f"📁 Dataset path    : {DATASET_PATH}")

# ─── Load Analytics Data ──────────────────────────────────────────────────────
analytics_data = None

def load_analytics():
    """Load and generate analytics from Dataset.csv"""
    global analytics_data
    
    try:
        output_path = FRONTEND_DIR / 'data' / 'processed' / 'analytics_insights.json'
        
        # Fast path: load pre-processed data if it exists to avoid 30s+ timeouts on Render
        if output_path.exists():
            print("📊 Loading pre-processed analytics from JSON...")
            with open(output_path, 'r', encoding='utf-8') as f:
                analytics_data = json.load(f)
            print("✅ Analytics loaded instantly from JSON!")
            return analytics_data
            
        # Fallback: Generate it (slow)
        # pyrefly: ignore [missing-import]
        from analytics_engine import NetflixAnalytics
        
        if not DATASET_PATH.exists():
            print(f"⚠️  Dataset.csv not found at {DATASET_PATH}")
            return None
        
        print("📊 Loading analytics from Dataset.csv (this may take a while)...")
        analytics = NetflixAnalytics(csv_path=str(DATASET_PATH))
        analytics_data = analytics.generate_all_insights()
        
        # Save to JSON for frontend
        output_path.parent.mkdir(parents=True, exist_ok=True)
        analytics.save_insights(output_path)
        
        print("✅ Analytics generated and saved successfully!")
        return analytics_data
        
    except Exception as e:
        print(f"⚠️  Analytics loading failed: {e}")
        import traceback
        traceback.print_exc()
        return None

# ─── Flask app ────────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder=None)

# ─── Routes ───────────────────────────────────────────────────────────────────

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
        'data_loaded': analytics_data is not None
    })


@app.route('/api/analytics')
def api_analytics():
    """Return all analytics data"""
    if analytics_data is None:
        load_analytics()
    
    if analytics_data is None:
        return jsonify({
            'status': 'error',
            'message': 'Analytics data not available'
        }), 500
    
    return jsonify({
        'status': 'success',
        'data': analytics_data
    })


@app.route('/api/summary')
def api_summary():
    """Return summary statistics"""
    if analytics_data is None:
        load_analytics()
    
    if analytics_data and 'summary' in analytics_data:
        return jsonify({
            'status': 'success',
            'data': analytics_data['summary']
        })
    
    return jsonify({'status': 'error', 'message': 'Summary not available'}), 500


@app.route('/api/genres')
def api_genres():
    """Return genre analytics"""
    if analytics_data is None:
        load_analytics()
    
    if analytics_data and 'genres' in analytics_data:
        return jsonify({
            'status': 'success',
            'data': analytics_data['genres']
        })
    
    return jsonify({'status': 'error', 'message': 'Genre data not available'}), 500


@app.route('/api/countries')
def api_countries():
    """Return country analytics"""
    if analytics_data is None:
        load_analytics()
    
    if analytics_data and 'countries' in analytics_data:
        return jsonify({
            'status': 'success',
            'data': analytics_data['countries']
        })
    
    return jsonify({'status': 'error', 'message': 'Country data not available'}), 500


@app.route('/api/trends')
def api_trends():
    """Return trend analytics"""
    if analytics_data is None:
        load_analytics()
    
    if analytics_data and 'trends' in analytics_data:
        return jsonify({
            'status': 'success',
            'data': analytics_data['trends']
        })
    
    return jsonify({'status': 'error', 'message': 'Trend data not available'}), 500


@app.route('/api/ratings')
def api_ratings():
    """Return rating analytics"""
    if analytics_data is None:
        load_analytics()
    
    if analytics_data and 'ratings' in analytics_data:
        return jsonify({
            'status': 'success',
            'data': analytics_data['ratings']
        })
    
    return jsonify({'status': 'error', 'message': 'Rating data not available'}), 500


@app.route('/api/search')
def api_search():
    """Search content by title"""
    query = request.args.get('q', '').lower()
    limit = int(request.args.get('limit', 20))
    
    if not query:
        return jsonify({'status': 'error', 'message': 'Query required'}), 400
    
    try:
        import pandas as pd
        df = pd.read_csv(DATASET_PATH)
        
        # Search in title
        mask = df['title'].str.lower().str.contains(query, na=False)
        results = df[mask].head(limit)
        
        # Return relevant fields
        output = results[['title', 'content_type', 'release_year', 'primary_genre', 
                          'imdb_score', 'country', 'runtime_minutes']].to_dict('records')
        
        return jsonify({
            'status': 'success',
            'query': query,
            'count': len(output),
            'results': output
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/dataset')
def api_dataset():
    """Return the raw dataset (paginated)"""
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))
    
    try:
        import pandas as pd
        import math
        df = pd.read_csv(DATASET_PATH)
        # Handle NaN values for JSON serialization
        df = df.fillna('')
        
        # Pagination
        total_records = len(df)
        total_pages = math.ceil(total_records / per_page)
        
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        
        results = df.iloc[start_idx:end_idx].to_dict('records')
        
        return jsonify({
            'status': 'success',
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages,
            'total_records': total_records,
            'data': results
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/dataset/download')
def api_dataset_download():
    """Download the raw Dataset.csv file"""
    return send_from_directory(str(BASE_DIR), 'Dataset.csv', as_attachment=True)


@app.route('/api/predictions')
def api_predictions():
    """Get ML model performance and predictions using optimized models"""
    try:
        import json
        from pathlib import Path
        
        results_dir = BASE_DIR / 'ml_results'
        results_file = results_dir / 'results_summary.json'
        
        if not results_file.exists():
            return jsonify({
                'status': 'error', 
                'message': 'Optimized models not yet trained'
            }), 404
        
        with open(results_file, 'r') as f:
            results = json.load(f)
        
        return jsonify({
            'status': 'success',
            'data': results,
            'models': {
                'regression': results.get('regression', {}),
                'classification': results.get('classification', {}),
            },
            'feature_importance': results.get('shap_features', {})
        })
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


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

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 NetflixIQ Analytics Platform")
    print("=" * 60)
    
    # Load analytics on startup
    load_analytics()
    
    print("=" * 60)
    print("📍 Dashboard: http://localhost:8080/")
    print("📍 API Health: http://localhost:8080/api/health")
    print("📍 Analytics: http://localhost:8080/api/analytics")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=8080, debug=False)
