# NetflixIQ – Netflix Analytics & ML Prediction Platform

[![Python 3.14](https://img.shields.io/badge/Python-3.14-blue.svg)](https://www.python.org/downloads/)
[![Flask](https://img.shields.io/badge/Flask-3.1.3-green.svg)](https://flask.palletsprojects.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

NetflixIQ is a comprehensive analytics and machine learning platform for Netflix content prediction. It consolidates Netflix title data, provides interactive dashboards, and uses advanced ML models to predict content ratings and hit probability.

## 🎯 Key Features

- **Advanced ML Models**: XGBoost regression (R²=0.9664) and LightGBM classification (F1=0.9640)
- **Interactive Dashboard**: Real-time analytics with genre, country, and trend analysis
- **ML Predictions**: 
  - Rating prediction for Netflix content
  - Hit probability classification with 97.1% recall
- **RESTful API**: `/api/predictions`, `/api/analytics`, `/api/health`, `/api/dataset`
- **Production-Ready**: Optimized models with SHAP feature importance analysis
- **Feature Engineering**: 30 engineered features with mutual information selection

## 📊 Performance Metrics

| Model | Metric | Value | Improvement |
|-------|--------|-------|-------------|
| XGBoost Regression | R² Score | 0.9664 | 4.9x over baseline |
| LightGBM Classification | F1 Score | 0.9640 | 2.14x over baseline |
| LightGBM Classification | Recall | 97.1% | 2.66x over baseline |

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- pip or conda

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/Netflix.IQ.git
cd Netflix.IQ
```

2. **Create virtual environment:**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

### Running the Application

**Start the Flask server:**
```bash
python3 app.py
```

Server runs on: `http://localhost:8080`

**Access the dashboard:**
```
http://localhost:8080/
```

**Test the API:**
```bash
# Health check
curl http://localhost:8080/api/health

# Get ML predictions
curl http://localhost:8080/api/predictions | jq .

# Get analytics
curl http://localhost:8080/api/analytics | jq .
```

## 📁 Project Structure

```
Netflix.IQ/
├── app.py                              # Flask application
├── ml_usage_examples.py               # Model usage utilities
├── requirements.txt                   # Core & ML dependencies
│
├── src/
│   ├── analytics_engine.py           # Analytics pipeline
│   ├── ml_models.py                  # Baseline ML models
│   ├── ml_models_advanced.py         # Advanced optimized models (800+ lines)
│   ├── data_pipeline.py              # Data processing
│   └── __init__.py
│
├── Frontend/
│   ├── templates/                    # HTML templates
│   ├── css/                          # Styling
│   ├── js/                           # JavaScript
│   └── data/processed/               # Analytics insights (JSON)
│
├── ml_results/                       # Trained models
│   ├── best_model_regression.pkl     # XGBoost (1.1 MB)
│   ├── best_model_classification.pkl # LightGBM (579 KB)
│   └── results_summary.json          # Metrics & metadata
│
├── Master_dataset_Netflix/
│   ├── Output/                       # Final refined dataset
│   │   └── netflix_master_dataset_refined.csv
│   └── Data/
│       └── Raw/                      # Raw source files
│
├── notebooks/                        # Exploratory Jupyter notebooks
├── Dataset.csv                       # Main unified dataset
├── README.md                         # This file
└── PROJECT_REPORT.md                 # Comprehensive project report
```

## 🤖 ML Models

### Regression Model (XGBoost)
**Task**: Predict IMDb rating for Netflix content

- **R² Score**: 0.9664
- **MAE**: 0.1206
- **Trained on**: 1,083 samples with 30 engineered features
- **Cross-validation**: 5-Fold, 0.9595 ± 0.0061

### Classification Model (LightGBM)
**Task**: Predict if content will be a "hit" (high engagement)

- **F1 Score**: 0.9640
- **Recall**: 97.1% (detects 97% of hits)
- **Accuracy**: 98.15%
- **Threshold**: 0.75 (optimized via Bayesian search)
- **Cross-validation**: 5-Fold, 0.9774 ± 0.0073

## 📊 Top Features (SHAP Analysis)

1. **combined_score** (0.7687) - Dominant feature
2. **runtime_x_score** (0.2615) - Runtime-rating interaction
3. **runtime_minutes** (0.1432)
4. **user_rating** (0.1043)
5. **tmdb_score** (0.0606)

## 🔧 API Endpoints

### Health Check
```bash
GET /api/health
```
Response:
```json
{
  "status": "healthy",
  "service": "NetflixIQ Analytics Platform",
  "data_loaded": true
}
```

### ML Predictions
```bash
GET /api/predictions
```
Returns best models' performance metrics and SHAP feature importances.

### Analytics
```bash
GET /api/analytics
```
Returns comprehensive analytics including trends, genres, countries, clustering.

### Dataset
```bash
GET /api/dataset?page=1&per_page=50
```
Returns raw paginated dataset JSON.

### Download Dataset
```bash
GET /api/dataset/download
```
Downloads the `Dataset.csv` file.

### Search
```bash
GET /api/search?q=<query>&limit=20
```
Search for content by title.

## 📚 Documentation

- **[PROJECT_REPORT.md](PROJECT_REPORT.md)** – Comprehensive project report covering data analytics, optimizations, deployment, and quick start guide.
- **[ml_usage_examples.py](ml_usage_examples.py)** – Code examples for using models

## 🛠️ Technology Stack

**Backend:**
- Flask 3.1.3
- Gunicorn 26.0.0
- Python 3.14

**ML & Data:**
- XGBoost 3.2.0 (regression)
- LightGBM 4.6.0 (classification)
- CatBoost 1.2.10
- Scikit-learn 1.9.0
- Pandas 3.0.3
- NumPy 2.4.6

**Optimization:**
- Optuna 2.0+ (Bayesian hyperparameter tuning)
- SMOTE (class imbalance handling)
- SHAP (feature importance)

**Frontend:**
- HTML5/CSS3
- JavaScript (vanilla)

## 🔄 Data Pipeline

```
Raw Data → Data Cleaning → Feature Engineering → Preprocessing → Model Training
   ↓            ↓                  ↓                   ↓               ↓
 11,231       5,349            32 features        30 selected      XGBoost
 records      samples          engineered          features         LightGBM
```

**Data Cleaning:**
- Removed 8 outliers via IQR method
- Intelligent missing value imputation
- Duplicate detection & removal

**Feature Engineering:**
- Temporal features (year, decade, content_age)
- Popularity features (genre_popularity, country_popularity)
- Interaction features (runtime×score, votes×score)
- Statistical aggregation (genre_mean_score, country_mean_score)

## 🚀 Deployment

### Production with Gunicorn
```bash
gunicorn -w 4 -b 0.0.0.0:8080 app:app
```

### Docker (optional)
```bash
docker build -t netflix-iq .
docker run -p 8080:8080 netflix-iq
```

## 📈 Performance Improvements

Optimized models vs baseline:
- **Regression R²**: 0.197 → 0.9664 (4.9x improvement)
- **Classification F1**: 0.450 → 0.9640 (2.14x improvement)
- **Classification Recall**: 36.5% → 97.1% (2.66x improvement)

## 🤝 Contributing

Contributions welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License – see [LICENSE](LICENSE) file for details.

## 👤 Author

**Kartik** – Senior ML Engineer

## 🙏 Acknowledgments

- Netflix for providing the dataset
- Optuna team for hyperparameter optimization framework
- SHAP for feature importance analysis
- Open source ML community

---

**Status**: ✅ Production Ready  
**Last Updated**: June 4, 2026  
**Version**: 1.0.0
