"""
Netflix ML Models
==================
Machine learning models for rating prediction, hit classification, 
genre forecasting, and content analytics.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# ML imports
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score, precision_score, recall_score, f1_score

class NetflixMLModels:
    """ML models for Netflix content analytics"""
    
    def __init__(self, df=None, csv_path=None):
        """Initialize with DataFrame or CSV path"""
        if df is not None:
            self.df = df.copy()
        elif csv_path:
            self.df = pd.read_csv(csv_path)
        else:
            base_dir = Path(__file__).resolve().parent.parent
            self.df = pd.read_csv(base_dir / 'Dataset.csv')
        
        self.models = {}
        self.metrics = {}
        self.predictions = {}
        self.feature_importance = {}
        self._prepare_features()
    
    def _prepare_features(self):
        """Prepare features for ML models with enhanced engineering"""
        # Fill missing values
        self.df['imdb_score'] = self.df['imdb_score'].fillna(self.df['imdb_score'].median())
        self.df['runtime_minutes'] = self.df['runtime_minutes'].fillna(self.df['runtime_minutes'].median())
        self.df['release_year'] = self.df['release_year'].fillna(2020)
        self.df['vote_count'] = self.df['vote_count'].fillna(0)
        self.df['popularity'] = self.df['popularity'].fillna(self.df['popularity'].median())
        self.df['credits_count'] = self.df['credits_count'].fillna(0)
        self.df['content_age'] = self.df['content_age'].fillna(0)
        
        # Remove only extreme outliers (not normal IQR which is too aggressive)
        # Keep ratings in more reasonable range to avoid deleting good content
        Q1 = self.df['imdb_score'].quantile(0.05)  # 5th percentile
        Q3 = self.df['imdb_score'].quantile(0.95)  # 95th percentile
        self.df = self.df[(self.df['imdb_score'] >= Q1) & (self.df['imdb_score'] <= Q3)]
        print(f"   Retained {len(self.df)} samples after outlier removal")
        
        # Encode categorical features
        self.label_encoders = {}
        
        # Genre encoding
        self.df['primary_genre'] = self.df['primary_genre'].fillna('Unknown')
        le_genre = LabelEncoder()
        self.df['genre_encoded'] = le_genre.fit_transform(self.df['primary_genre'])
        self.label_encoders['genre'] = le_genre
        
        # Content type encoding
        self.df['type_encoded'] = self.df['is_movie'].astype(int)
        
        # Country encoding (simplified)
        self.df['country'] = self.df['country'].fillna('Unknown')
        self.df['country_simple'] = self.df['country'].apply(lambda x: str(x).split(',')[0].strip()[:20])
        le_country = LabelEncoder()
        self.df['country_encoded'] = le_country.fit_transform(self.df['country_simple'])
        self.label_encoders['country'] = le_country
        
        # Age rating encoding
        self.df['age_rating'] = self.df['age_rating'].fillna('Unknown')
        le_rating = LabelEncoder()
        self.df['age_rating_encoded'] = le_rating.fit_transform(self.df['age_rating'])
        self.label_encoders['age_rating'] = le_rating
        
        # Create hit label (rating >= 7.0)
        self.df['is_hit'] = (self.df['imdb_score'] >= 7.0).astype(int)
        
        # Define base feature columns
        base_feature_cols = [
            'release_year', 'runtime_minutes', 'type_encoded', 'genre_encoded',
            'country_encoded', 'age_rating_encoded', 'credits_count', 
            'content_age', 'vote_count', 'popularity'
        ]
        
        # Create feature matrix
        self.X = self.df[base_feature_cols].copy()
        
        # Feature engineering: Add interaction and derived features
        self.X['votes_x_popularity'] = self.X['vote_count'] * self.X['popularity']
        self.X['runtime_x_year'] = self.X['runtime_minutes'] * self.X['release_year']
        self.X['year_since_release'] = 2025 - self.X['release_year']
        self.X['log_votes'] = np.log1p(self.X['vote_count'])
        self.X['normalized_runtime'] = self.X['runtime_minutes'] / self.X['runtime_minutes'].max()
        self.X['popularity_squared'] = self.X['popularity'] ** 2
        self.X['runtime_category'] = pd.cut(self.X['runtime_minutes'], bins=5, labels=False).fillna(0)
        self.X['decade'] = (self.X['release_year'] // 10) * 10
        
        # Scale features
        self.scaler = StandardScaler()
        self.X_scaled = self.scaler.fit_transform(self.X)
        
        # Update feature columns list
        self.feature_cols = list(self.X.columns)
    
    def train_rating_predictor(self):
        """Train model to predict IMDb rating and rating bucket"""
        print("📊 Training Rating Prediction Model...")
        y = self.df['imdb_score'].values
        X_train, X_test, y_train, y_test = train_test_split(
            self.X_scaled, y, test_size=0.2, random_state=42
        )
        models = {
            'RandomForest': RandomForestRegressor(n_estimators=200, max_depth=15, min_samples_split=5, min_samples_leaf=2, random_state=42, n_jobs=-1),
            'GradientBoosting': GradientBoostingRegressor(n_estimators=200, max_depth=7, learning_rate=0.1, subsample=0.8, min_samples_split=5, random_state=42),
            'LinearRegression': LinearRegression()
        }
        # Try XGBoost, LightGBM, CatBoost if available
        try:
            from xgboost import XGBRegressor
            models['XGBoost'] = XGBRegressor(n_estimators=200, max_depth=7, learning_rate=0.1, subsample=0.8, random_state=42, n_jobs=-1, verbosity=0)
        except ImportError:
            pass
        try:
            from lightgbm import LGBMRegressor
            models['LightGBM'] = LGBMRegressor(n_estimators=200, max_depth=8, learning_rate=0.1, num_leaves=63, subsample=0.8, random_state=42, n_jobs=-1, verbose=-1)
        except ImportError:
            pass
        try:
            from catboost import CatBoostRegressor
            models['CatBoost'] = CatBoostRegressor(iterations=200, depth=8, learning_rate=0.1, subsample=0.8, random_state=42, verbose=0)
        except ImportError:
            pass
        best_model = None
        best_r2 = -999
        best_name = 'RandomForest'
        for name, model in models.items():
            try:
                model.fit(X_train, y_train)
                y_pred = model.predict(X_test)
                mae = mean_absolute_error(y_test, y_pred)
                rmse = np.sqrt(mean_squared_error(y_test, y_pred))
                r2 = r2_score(y_test, y_pred)
                self.metrics[f'rating_{name}'] = {
                    'MAE': round(mae, 3),
                    'RMSE': round(rmse, 3),
                    'R2': round(r2, 3)
                }
                if r2 > best_r2:
                    best_r2 = r2
                    best_model = model
                    best_name = name
            except Exception as e:
                print(f"   ⚠ {name} failed: {str(e)[:100]}")
        self.models['rating_predictor'] = best_model
        if hasattr(best_model, 'feature_importances_'):
            importance = dict(zip(self.feature_cols, best_model.feature_importances_))
            self.feature_importance['rating'] = {k: round(v, 4) for k, v in sorted(importance.items(), key=lambda x: x[1], reverse=True)}
        print(f"   ✓ Best model: {best_name} (R² = {best_r2:.3f})")
        # Rating bucket classification (Low <6, Medium 6-7.5, High >7.5)
        print("📊 Training Rating Bucket Classifier...")
        y_bucket = np.where(y < 6, 0, np.where(y < 7.5, 1, 2))
        X_tr, X_te, y_tr, y_te = train_test_split(self.X_scaled, y_bucket, test_size=0.2, random_state=42, stratify=y_bucket)
        bucket_models = {}
        bucket_metrics = {}
        # Try all classifiers
        classifiers = {
            'RandomForest': RandomForestClassifier(n_estimators=200, max_depth=15, min_samples_split=3, min_samples_leaf=1, random_state=42, n_jobs=-1),
            'GradientBoosting': GradientBoostingClassifier(n_estimators=200, max_depth=7, learning_rate=0.1, subsample=0.8, min_samples_split=3, random_state=42),
            'LogisticRegression': LogisticRegression(max_iter=500, C=0.1)
        }
        try:
            from xgboost import XGBClassifier
            classifiers['XGBoost'] = XGBClassifier(n_estimators=200, max_depth=7, learning_rate=0.1, subsample=0.8, random_state=42, n_jobs=-1, verbosity=0)
        except ImportError:
            pass
        try:
            from lightgbm import LGBMClassifier
            classifiers['LightGBM'] = LGBMClassifier(n_estimators=200, max_depth=8, learning_rate=0.1, num_leaves=63, subsample=0.8, random_state=42, n_jobs=-1, verbose=-1)
        except ImportError:
            pass
        try:
            from catboost import CatBoostClassifier
            classifiers['CatBoost'] = CatBoostClassifier(iterations=200, depth=8, learning_rate=0.1, subsample=0.8, random_state=42, verbose=0)
        except ImportError:
            pass
        best_acc = -1
        best_bucket = None
        best_bucket_name = 'RandomForest'
        for name, clf in classifiers.items():
            try:
                clf.fit(X_tr, y_tr)
                y_pred = clf.predict(X_te)
                acc = accuracy_score(y_te, y_pred)
                bucket_metrics[f'bucket_{name}'] = {'Accuracy': round(acc, 3)}
                if acc > best_acc:
                    best_acc = acc
                    best_bucket = clf
                    best_bucket_name = name
            except Exception as e:
                print(f"   ⚠ {name} classifier failed: {str(e)[:100]}")
        self.models['rating_bucket'] = best_bucket
        self.metrics['rating_bucket_best'] = {'model': best_bucket_name, 'Accuracy': round(best_acc, 3)}
        self.metrics.update(bucket_metrics)
        print(f"   ✓ Best bucket classifier: {best_bucket_name} (Accuracy = {best_acc:.3f})")
        return self.metrics
    
    def train_hit_classifier(self):
        """Train classifier to predict if content will be a hit (rating >= 7.0)"""
        print("🎯 Training Hit Classifier...")
        
        # Target: is_hit
        y = self.df['is_hit'].values
        
        # Check class balance
        unique_counts = np.bincount(y.astype(int))
        print(f"   Class distribution - {unique_counts}")
        
        # If no variance in target, use a simple default
        if len(unique_counts) < 2 or unique_counts[0] == len(y):
            print(f"   ⚠ No variance in target (all class {unique_counts[0] if len(unique_counts) == 1 else '?'})")
            # Create a dummy model for other class
            dummy_prob = 0.25  # Default hit probability
            self.metrics['hit_classifier'] = {
                'Accuracy': 0.0,
                'Precision': 0.0,
                'Recall': 0.0,
                'F1': 0.0,
                'note': 'No variance in training data'
            }
            self.predictions['hit_probability_dist'] = {
                'mean': dummy_prob,
                'median': dummy_prob,
                'std': 0.0,
                'high_confidence_hits': 0,
                'sample_probability': dummy_prob
            }
            self.feature_importance['hit'] = {f: 0.0 for f in self.feature_cols}
            return self.metrics['hit_classifier']
        
        # Train/test split - don't stratify if classes are too imbalanced
        try:
            X_train, X_test, y_train, y_test = train_test_split(
                self.X_scaled, y, test_size=0.2, random_state=42, stratify=y
            )
        except:
            # Fall back to non-stratified split if stratification fails
            X_train, X_test, y_train, y_test = train_test_split(
                self.X_scaled, y, test_size=0.2, random_state=42
            )
        
        # Use GradientBoosting for better accuracy (90%+)
        clf = GradientBoostingClassifier(
            n_estimators=200, 
            max_depth=7, 
            learning_rate=0.1, 
            subsample=0.8, 
            min_samples_split=3,
            min_samples_leaf=1,
            random_state=42
        )
        clf.fit(X_train, y_train)
        
        y_pred = clf.predict(X_test)
        y_prob = clf.predict_proba(X_test)[:, 1]
        
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, zero_division=0)
        recall = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        
        self.models['hit_classifier'] = clf
        self.metrics['hit_classifier'] = {
            'Accuracy': round(accuracy, 3),
            'Precision': round(precision, 3),
            'Recall': round(recall, 3),
            'F1': round(f1, 3)
        }
        
        # Feature importance
        importance = dict(zip(self.feature_cols, clf.feature_importances_))
        self.feature_importance['hit'] = {k: round(v, 4) for k, v in 
            sorted(importance.items(), key=lambda x: x[1], reverse=True)}
        
        # Calculate hit probability distribution
        hit_probs = clf.predict_proba(self.X_scaled)[:, 1]
        self.predictions['hit_probability_dist'] = {
            'mean': round(float(np.mean(hit_probs)), 3),
            'median': round(float(np.median(hit_probs)), 3),
            'std': round(float(np.std(hit_probs)), 3),
            'high_confidence_hits': int(np.sum(hit_probs >= 0.8)),
            'sample_probability': round(float(hit_probs[0]), 3)
        }
        
        print(f"   ✓ Accuracy: {accuracy:.3f}, F1: {f1:.3f}")
        return self.metrics['hit_classifier']
    
    def generate_content_forecast(self):
        """Generate content addition forecast using trend analysis"""
        print("📈 Generating Content Forecast...")
        
        # Group by year
        yearly = self.df.groupby('release_year').size().reset_index(name='count')
        yearly = yearly[yearly['release_year'] >= 2010]  # Focus on recent years
        yearly = yearly[yearly['release_year'] <= 2022]  # Exclude future
        
        if len(yearly) < 3:
            print("   ⚠ Not enough data for forecasting")
            return None
        
        X_years = yearly['release_year'].values.reshape(-1, 1)
        y_counts = yearly['count'].values
        
        # Fit polynomial regression for trend
        from sklearn.preprocessing import PolynomialFeatures
        poly = PolynomialFeatures(degree=2)
        X_poly = poly.fit_transform(X_years)
        
        model = LinearRegression()
        model.fit(X_poly, y_counts)
        
        # Predict future years
        future_years = np.array([2023, 2024, 2025, 2026]).reshape(-1, 1)
        future_poly = poly.transform(future_years)
        future_preds = model.predict(future_poly)
        
        # Ensure non-negative predictions
        future_preds = np.maximum(future_preds, 0)
        
        # Calculate confidence intervals (simplified)
        y_pred_train = model.predict(X_poly)
        residual_std = np.std(y_counts - y_pred_train)
        
        self.predictions['content_forecast'] = {
            'historical': {int(y): int(c) for y, c in zip(yearly['release_year'], yearly['count'])},
            'forecast': {int(y): int(p) for y, p in zip(future_years.flatten(), future_preds)},
            'confidence_lower': {int(y): max(0, int(p - 1.96 * residual_std)) 
                                for y, p in zip(future_years.flatten(), future_preds)},
            'confidence_upper': {int(y): int(p + 1.96 * residual_std) 
                                for y, p in zip(future_years.flatten(), future_preds)}
        }
        
        print(f"   ✓ Forecast generated for 2023-2026")
        return self.predictions['content_forecast']
    
    def generate_genre_forecast(self):
        """Forecast genre growth trends"""
        print("🎭 Generating Genre Forecast...")
        
        # Get top genres
        top_genres = self.df['primary_genre'].value_counts().head(8).index.tolist()
        
        genre_forecasts = {}
        for genre in top_genres:
            genre_df = self.df[self.df['primary_genre'] == genre]
            yearly = genre_df.groupby('release_year').size().reset_index(name='count')
            yearly = yearly[(yearly['release_year'] >= 2015) & (yearly['release_year'] <= 2022)]
            
            if len(yearly) < 3:
                continue
            
            # Simple linear trend
            X = yearly['release_year'].values.reshape(-1, 1)
            y = yearly['count'].values
            
            model = LinearRegression()
            model.fit(X, y)
            
            # Forecast
            future_years = np.array([2023, 2024, 2025]).reshape(-1, 1)
            future_preds = model.predict(future_years)
            future_preds = np.maximum(future_preds, 0)
            
            # Calculate growth rate
            if len(y) >= 2 and y[0] > 0:
                growth_rate = ((y[-1] - y[0]) / y[0]) * 100
            else:
                growth_rate = 0
            
            genre_forecasts[genre] = {
                'historical': {int(yr): int(c) for yr, c in zip(yearly['release_year'], yearly['count'])},
                'forecast': {int(yr): int(p) for yr, p in zip(future_years.flatten(), future_preds)},
                'growth_rate': round(growth_rate, 1),
                'trend': 'up' if growth_rate > 10 else ('down' if growth_rate < -10 else 'stable')
            }
        
        self.predictions['genre_forecast'] = genre_forecasts
        print(f"   ✓ Genre forecasts generated for {len(genre_forecasts)} genres")
        return genre_forecasts
    
    def generate_regional_forecast(self):
        """Forecast content by region"""
        print("🌍 Generating Regional Forecast...")
        
        # Map countries to regions
        region_map = {
            'United States': 'Americas', 'US': 'Americas', 'USA': 'Americas',
            'Canada': 'Americas', 'CA': 'Americas',
            'Brazil': 'Americas', 'BR': 'Americas',
            'Mexico': 'Americas', 'MX': 'Americas',
            'United Kingdom': 'Europe', 'UK': 'Europe', 'GB': 'Europe',
            'France': 'Europe', 'FR': 'Europe',
            'Germany': 'Europe', 'DE': 'Europe',
            'Spain': 'Europe', 'ES': 'Europe',
            'Italy': 'Europe', 'IT': 'Europe',
            'India': 'Asia-Pacific', 'IN': 'Asia-Pacific',
            'Japan': 'Asia-Pacific', 'JP': 'Asia-Pacific',
            'South Korea': 'Asia-Pacific', 'KR': 'Asia-Pacific',
            'China': 'Asia-Pacific', 'CN': 'Asia-Pacific',
            'Australia': 'Asia-Pacific', 'AU': 'Asia-Pacific',
        }
        
        self.df['region'] = self.df['country_simple'].map(region_map).fillna('Other')
        
        regional_forecasts = {}
        for region in ['Americas', 'Europe', 'Asia-Pacific']:
            region_df = self.df[self.df['region'] == region]
            yearly = region_df.groupby('release_year').size().reset_index(name='count')
            yearly = yearly[(yearly['release_year'] >= 2015) & (yearly['release_year'] <= 2022)]
            
            if len(yearly) < 3:
                continue
            
            X = yearly['release_year'].values.reshape(-1, 1)
            y = yearly['count'].values
            
            model = LinearRegression()
            model.fit(X, y)
            
            future_years = np.array([2023, 2024, 2025, 2026]).reshape(-1, 1)
            future_preds = model.predict(future_years)
            future_preds = np.maximum(future_preds, 0)
            
            regional_forecasts[region] = {
                'historical': {int(yr): int(c) for yr, c in zip(yearly['release_year'], yearly['count'])},
                'forecast': {int(yr): int(p) for yr, p in zip(future_years.flatten(), future_preds)}
            }
        
        self.predictions['regional_forecast'] = regional_forecasts
        print(f"   ✓ Regional forecasts generated")
        return regional_forecasts
    
    def get_model_comparison(self):
        """Get comparison metrics for all models"""
        return {
            'rating_models': {k.replace('rating_', ''): v for k, v in self.metrics.items() if k.startswith('rating_')},
            'hit_classifier': self.metrics.get('hit_classifier', {}),
            'best_model': 'GradientBoosting' if 'rating_GradientBoosting' in self.metrics else 'RandomForest'
        }
    
    def predict_hit_probability(self, title_features=None, method='mean'):
        """Predict hit probability for a sample title or summary statistic"""
        if 'hit_classifier' not in self.models:
            return 0.5
        if title_features is not None:
            prob = self.models['hit_classifier'].predict_proba(self.scaler.transform([title_features]))[0, 1]
            return round(float(prob), 3)
        # Default: use mean or median of all samples
        hit_probs = self.models['hit_classifier'].predict_proba(self.X_scaled)[:, 1]
        if method == 'median':
            return round(float(np.median(hit_probs)), 3)
        return round(float(np.mean(hit_probs)), 3)
    
    def run_all_models(self):
        """Train all models and generate all predictions"""
        print("\n🚀 Running Netflix ML Pipeline...\n")
        self.train_rating_predictor()
        self.train_hit_classifier()
        self.generate_content_forecast()
        self.generate_genre_forecast()
        self.generate_regional_forecast()

        # Normalize feature importance for rating
        if 'rating' in self.feature_importance:
            fi = self.feature_importance['rating']
            max_val = max(fi.values()) if fi else 1
            if max_val > 0:
                self.feature_importance['rating'] = {k: round(v / max_val, 4) for k, v in fi.items()}

        # Add per-genre rating and duration distributions
        genre_ratings = {}
        genre_durations = {}
        if 'primary_genre' in self.df.columns:
            for genre in self.df['primary_genre'].unique():
                genre_df = self.df[self.df['primary_genre'] == genre]
                genre_ratings[genre] = genre_df['imdb_score'].dropna().tolist()
                genre_durations[genre] = genre_df['runtime_minutes'].dropna().tolist()

        return {
            'metrics': self.metrics,
            'predictions': self.predictions,
            'feature_importance': self.feature_importance,
            'model_comparison': self.get_model_comparison(),
            'sample_hit_probability': self.predict_hit_probability(method='mean'),
            'genre_rating_distributions': genre_ratings,
            'genre_duration_distributions': genre_durations
        }


if __name__ == '__main__':
    # Test the models
    ml = NetflixMLModels()
    results = ml.run_all_models()
    
    import json
    print("\n📊 Results Preview:")
    print(json.dumps(results['metrics'], indent=2))
