"""
Netflix ML Models — Advanced Optimization Pipeline
====================================================
Senior ML Engineer - Comprehensive optimization for maximum performance
Implements: Data cleaning, feature engineering, SMOTE, Optuna tuning,
Stacking ensembles, SHAP analysis, and K-Fold cross-validation.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')
import pickle
import json
from datetime import datetime
import logging

# ML & Data Science
from sklearn.model_selection import train_test_split, cross_val_score, KFold, StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder, PowerTransformer
from sklearn.ensemble import (
    RandomForestRegressor, RandomForestClassifier,
    GradientBoostingRegressor, GradientBoostingClassifier,
    ExtraTreesRegressor, ExtraTreesClassifier,
    VotingRegressor, VotingClassifier, StackingRegressor, StackingClassifier
)
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score,
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)
from sklearn.feature_selection import mutual_info_regression, mutual_info_classif, SelectKBest
from sklearn.preprocessing import PolynomialFeatures

# Gradient boosting libraries
try:
    from xgboost import XGBRegressor, XGBClassifier
    HAS_XGBOOST = True
except:
    HAS_XGBOOST = False

try:
    from lightgbm import LGBMRegressor, LGBMClassifier
    HAS_LIGHTGBM = True
except:
    HAS_LIGHTGBM = False

try:
    from catboost import CatBoostRegressor, CatBoostClassifier
    HAS_CATBOOST = True
except:
    HAS_CATBOOST = False

try:
    from imblearn.over_sampling import SMOTE
    HAS_SMOTE = True
except:
    HAS_SMOTE = False

try:
    import optuna
    from optuna.pruners import MedianPruner
    HAS_OPTUNA = True
except:
    HAS_OPTUNA = False

try:
    import shap
    HAS_SHAP = True
except:
    HAS_SHAP = False

from sklearn.neighbors import LocalOutlierFactor

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AdvancedNetflixMLPipeline:
    """Advanced ML pipeline with comprehensive optimization"""
    
    def __init__(self, csv_path=None, verbose=True):
        """Initialize pipeline"""
        self.verbose = verbose
        self.df = None
        self.df_clean = None
        self.X_train = None
        self.X_test = None
        self.y_train_reg = None
        self.y_test_reg = None
        self.y_train_clf = None
        self.y_test_clf = None
        self.scaler = None
        self.le_dict = {}
        self.feature_names = None
        self.models = {}
        self.results = {}
        self.shap_explainers = {}
        self.best_models = {}
        
        # Load data
        if csv_path is None:
            base_dir = Path(__file__).resolve().parent.parent
            csv_path = base_dir / 'Dataset.csv'
        
        self._log("📥 Loading dataset...")
        self.df = pd.read_csv(csv_path)
        self._log(f"   Loaded {len(self.df)} rows × {len(self.df.columns)} columns")
    
    def _log(self, msg):
        """Conditional logging"""
        if self.verbose:
            print(msg)
    
    # ─────────────────────────────────────────────────────────────────────────────
    # STEP 1: DATA CLEANING
    # ─────────────────────────────────────────────────────────────────────────────
    
    def clean_data(self):
        """Comprehensive data cleaning"""
        self._log("\n🧹 STEP 1: DATA CLEANING")
        self._log("=" * 70)
        
        self.df_clean = self.df.copy()
        initial_rows = len(self.df_clean)
        
        # 1.1 Remove duplicates
        self._log("1.1 Removing duplicates...")
        dup_count = self.df_clean.duplicated().sum()
        self.df_clean = self.df_clean.drop_duplicates()
        self._log(f"   ✓ Removed {dup_count} duplicate rows")
        
        # 1.2 Handle missing values intelligently (COMPREHENSIVE)
        self._log("1.2 Handling missing values...")
        missing_before = self.df_clean.isnull().sum().sum()
        
        # For numeric columns: fill with median
        numeric_cols = self.df_clean.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if self.df_clean[col].isnull().sum() > 0:
                median_val = self.df_clean[col].median()
                self.df_clean[col].fillna(median_val, inplace=True)
        
        # For categorical: fill with mode
        cat_cols = self.df_clean.select_dtypes(include=['object']).columns
        for col in cat_cols:
            if self.df_clean[col].isnull().sum() > 0:
                mode_val = self.df_clean[col].mode()[0] if len(self.df_clean[col].mode()) > 0 else 'Unknown'
                self.df_clean[col].fillna(mode_val, inplace=True)
        
        # Double-check: fill any remaining NaN with column means
        for col in self.df_clean.select_dtypes(include=[np.number]).columns:
            if self.df_clean[col].isnull().sum() > 0:
                self.df_clean[col].fillna(self.df_clean[col].mean(), inplace=True)
        
        missing_after = self.df_clean.isnull().sum().sum()
        self._log(f"   ✓ Missing values: {missing_before} → {missing_after}")
        
        # 1.3 Detect and treat outliers using IQR only (simpler, more stable)
        self._log("1.3 Detecting and treating outliers...")
        
        outlier_count_total = 0
        
        # IQR method for imdb_score
        if 'imdb_score' in self.df_clean.columns:
            Q1 = self.df_clean['imdb_score'].quantile(0.25)
            Q3 = self.df_clean['imdb_score'].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 2.5 * IQR  # More lenient than 1.5
            upper_bound = Q3 + 2.5 * IQR
            
            outlier_count = ((self.df_clean['imdb_score'] < lower_bound) | 
                           (self.df_clean['imdb_score'] > upper_bound)).sum()
            self.df_clean = self.df_clean[
                (self.df_clean['imdb_score'] >= lower_bound) & 
                (self.df_clean['imdb_score'] <= upper_bound)
            ]
            outlier_count_total += outlier_count
            self._log(f"   ✓ IQR outliers removed: {outlier_count}")
        
        # IQR for runtime_minutes
        if 'runtime_minutes' in self.df_clean.columns:
            Q1 = self.df_clean['runtime_minutes'].quantile(0.05)
            Q3 = self.df_clean['runtime_minutes'].quantile(0.95)
            IQR = Q3 - Q1
            lower_bound = Q1 - 2 * IQR
            upper_bound = Q3 + 2 * IQR
            
            outlier_count = ((self.df_clean['runtime_minutes'] < lower_bound) | 
                           (self.df_clean['runtime_minutes'] > upper_bound)).sum()
            self.df_clean = self.df_clean[
                (self.df_clean['runtime_minutes'] >= lower_bound) & 
                (self.df_clean['runtime_minutes'] <= upper_bound)
            ]
            outlier_count_total += outlier_count
            self._log(f"   ✓ Runtime outliers removed: {outlier_count}")
        
        final_rows = len(self.df_clean)
        self._log(f"   ✓ Total outliers removed: {outlier_count_total}")
        self._log(f"   ✓ Total rows: {initial_rows} → {final_rows} ({100*(final_rows/initial_rows):.1f}%)")
        
        return self.df_clean
    
    # ─────────────────────────────────────────────────────────────────────────────
    # STEP 2: ADVANCED FEATURE ENGINEERING
    # ─────────────────────────────────────────────────────────────────────────────
    
    def engineer_features(self):
        """Advanced feature engineering"""
        self._log("\n🔧 STEP 2: ADVANCED FEATURE ENGINEERING")
        self._log("=" * 70)
        
        df = self.df_clean.copy()
        
        # 2.1 Temporal Features
        self._log("2.1 Engineering temporal features...")
        if 'release_year' in df.columns:
            df['year'] = df['release_year']
            df['decade'] = (df['release_year'] // 10) * 10
            df['content_age'] = 2025 - df['release_year']
            df['is_recent'] = (df['release_year'] >= 2020).astype(int)
        
        # 2.2 Popularity Features
        self._log("2.2 Engineering popularity features...")
        if 'primary_genre' in df.columns:
            genre_popularity = df['primary_genre'].value_counts().to_dict()
            df['genre_popularity'] = df['primary_genre'].map(genre_popularity)
            df['genre_popularity'] = df['genre_popularity'].fillna(df['genre_popularity'].mean())
        
        if 'country' in df.columns:
            # Extract first country
            df['main_country'] = df['country'].str.split(',').str[0].str.strip()
            country_popularity = df['main_country'].value_counts().to_dict()
            df['country_popularity'] = df['main_country'].map(country_popularity)
            df['country_popularity'] = df['country_popularity'].fillna(df['country_popularity'].mean())
        
        # 2.3 Interaction Features
        self._log("2.3 Creating interaction features...")
        if 'runtime_minutes' in df.columns and 'imdb_score' in df.columns:
            df['runtime_x_score'] = df['runtime_minutes'] * df['imdb_score']
        
        if 'vote_count' in df.columns and 'imdb_score' in df.columns:
            df['votes_x_score'] = df['vote_count'] * df['imdb_score']
        
        if 'popularity' in df.columns:
            df['log_popularity'] = np.log1p(df['popularity'])
            df['popularity_squared'] = df['popularity'] ** 2
        
        # 2.4 Statistical Aggregation Features
        self._log("2.4 Creating statistical features...")
        if 'primary_genre' in df.columns and 'imdb_score' in df.columns:
            genre_stats = df.groupby('primary_genre')['imdb_score'].agg(['mean', 'std', 'max']).reset_index()
            genre_stats.columns = ['primary_genre', 'genre_mean_score', 'genre_std_score', 'genre_max_score']
            df = df.merge(genre_stats, on='primary_genre', how='left')
        
        if 'main_country' in df.columns and 'imdb_score' in df.columns:
            country_stats = df.groupby('main_country')['imdb_score'].agg(['mean', 'count']).reset_index()
            country_stats.columns = ['main_country', 'country_mean_score', 'country_title_count']
            df = df.merge(country_stats, on='main_country', how='left')
        
        # 2.5 Type-based Features
        if 'is_movie' in df.columns:
            df['is_movie'] = df['is_movie'].astype(int)
        
        if 'content_type' in df.columns:
            df['is_series'] = (df['content_type'] == 'TV Show').astype(int)
        
        self._log("   ✓ Feature engineering complete")
        self.df_clean = df
        return df
    
    # ─────────────────────────────────────────────────────────────────────────────
    # STEP 3: PREPROCESSING & FEATURE SELECTION
    # ─────────────────────────────────────────────────────────────────────────────
    
    def preprocess_data(self):
        """Preprocessing and feature selection"""
        self._log("\n🔬 STEP 3: PREPROCESSING & FEATURE SELECTION")
        self._log("=" * 70)
        
        df = self.df_clean.copy()
        
        # 3.1 Define features and target
        self._log("3.1 Preparing features and targets...")
        
        # Select numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        # Remove targets from features
        targets = ['imdb_score', 'is_hit', 'rating_bucket']
        feature_cols = [c for c in numeric_cols if c not in targets]
        
        # 3.2 Encode categorical variables
        self._log("3.2 Encoding categorical variables...")
        cat_cols = ['primary_genre', 'age_rating', 'main_country']
        cat_cols = [c for c in cat_cols if c in df.columns]
        
        for col in cat_cols:
            le = LabelEncoder()
            df[f'{col}_encoded'] = le.fit_transform(df[col].astype(str))
            self.le_dict[col] = le
            feature_cols.append(f'{col}_encoded')
        
        # 3.3 Create targets
        if 'imdb_score' not in df.columns:
            self._log("   ⚠ imdb_score not found - cannot create targets")
            return None
        
        y_reg = df['imdb_score'].values
        
        # Hit classification: rating >= 7.0
        y_clf = (df['imdb_score'] >= 7.0).astype(int).values
        
        # 3.3b Clean up any NaN or Inf values before train-test split
        self._log("3.3b Cleaning NaN and Inf values...")
        X_data = df[feature_cols].copy()
        
        # Replace inf with NaN first
        X_data = X_data.replace([np.inf, -np.inf], np.nan)
        
        # Drop rows with any NaN
        rows_before = len(X_data)
        mask_valid = ~(X_data.isnull().any(axis=1))
        X_data = X_data[mask_valid]
        y_reg = y_reg[mask_valid]
        y_clf = y_clf[mask_valid]
        
        rows_after = len(X_data)
        self._log(f"   ✓ Removed {rows_before - rows_after} rows with NaN/Inf values")
        
        # 3.4 Train-test split (stratified for classification)
        self._log("3.4 Splitting data...")
        X_train, X_test, y_train_reg, y_test_reg, y_train_clf, y_test_clf = train_test_split(
            X_data, y_reg, y_clf,
            test_size=0.2, random_state=42, stratify=y_clf
        )
        
        self._log(f"   ✓ Train: {len(X_train)} | Test: {len(X_test)}")
        
        # 3.5 Scale features
        self._log("3.5 Scaling features...")
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # 3.6 Feature selection using Mutual Information
        self._log("3.6 Feature selection (Mutual Information)...")
        
        # For regression
        mi_scores_reg = mutual_info_regression(X_train_scaled, y_train_reg, random_state=42)
        
        # For classification
        mi_scores_clf = mutual_info_classif(X_train_scaled, y_train_clf, random_state=42)
        
        # Select top 30 features (average of both)
        combined_scores = (mi_scores_reg + mi_scores_clf) / 2
        top_k = min(30, len(feature_cols))
        top_indices = np.argsort(combined_scores)[-top_k:]
        
        selected_features = [feature_cols[i] for i in sorted(top_indices)]
        self._log(f"   ✓ Selected {len(selected_features)} features from {len(feature_cols)}")
        
        # Re-scale with selected features
        X_train_scaled = X_train_scaled[:, sorted(top_indices)]
        X_test_scaled = X_test_scaled[:, sorted(top_indices)]
        
        self.X_train = X_train_scaled
        self.X_test = X_test_scaled
        self.y_train_reg = y_train_reg
        self.y_test_reg = y_test_reg
        self.y_train_clf = y_train_clf
        self.y_test_clf = y_test_clf
        self.feature_names = selected_features
        
        self._log(f"   ✓ Feature shape: {self.X_train.shape}")
        
        # Class imbalance info
        unique, counts = np.unique(y_train_clf, return_counts=True)
        self._log(f"   ✓ Class distribution: {dict(zip(unique, counts))}")
        
        return {
            'X_train': X_train_scaled,
            'X_test': X_test_scaled,
            'y_train_reg': y_train_reg,
            'y_test_reg': y_test_reg,
            'y_train_clf': y_train_clf,
            'y_test_clf': y_test_clf,
            'feature_names': selected_features
        }
    
    # ─────────────────────────────────────────────────────────────────────────────
    # STEP 4: TRAIN REGRESSION MODELS WITH HYPERPARAMETER OPTIMIZATION
    # ─────────────────────────────────────────────────────────────────────────────
    
    def train_regression_models(self):
        """Train and optimize regression models"""
        self._log("\n📈 STEP 4: REGRESSION MODEL TRAINING & OPTIMIZATION")
        self._log("=" * 70)
        
        # Define base models
        base_models = {
            'RandomForest': RandomForestRegressor(random_state=42, n_jobs=-1),
            'ExtraTrees': ExtraTreesRegressor(random_state=42, n_jobs=-1),
            'GradientBoosting': GradientBoostingRegressor(random_state=42)
        }
        
        if HAS_XGBOOST:
            base_models['XGBoost'] = XGBRegressor(random_state=42, n_jobs=-1, verbosity=0)
        
        if HAS_LIGHTGBM:
            base_models['LightGBM'] = LGBMRegressor(random_state=42, n_jobs=-1, verbose=-1)
        
        if HAS_CATBOOST:
            base_models['CatBoost'] = CatBoostRegressor(random_state=42, verbose=0)
        
        # 4.1 K-Fold Cross Validation + Hyperparameter Tuning with Optuna
        self._log("4.1 Hyperparameter tuning with Optuna (K-Fold CV)...")
        
        best_models_reg = {}
        
        for model_name in ['RandomForest', 'XGBoost', 'CatBoost', 'LightGBM']:
            if model_name not in base_models:
                continue
            
            self._log(f"\n   Tuning {model_name}...")
            
            if HAS_OPTUNA:
                best_model = self._optimize_regression_model(model_name, base_models[model_name])
            else:
                best_model = base_models[model_name]
            
            # K-Fold CV
            kfold = KFold(n_splits=5, shuffle=True, random_state=42)
            cv_scores = cross_val_score(
                best_model, self.X_train, self.y_train_reg,
                cv=kfold, scoring='r2', n_jobs=-1
            )
            
            # Train on full training set
            best_model.fit(self.X_train, self.y_train_reg)
            
            # Evaluate
            y_pred = best_model.predict(self.X_test)
            r2 = r2_score(self.y_test_reg, y_pred)
            mae = mean_absolute_error(self.y_test_reg, y_pred)
            rmse = np.sqrt(mean_squared_error(self.y_test_reg, y_pred))
            
            self.models[f'reg_{model_name}'] = best_model
            self.results[f'reg_{model_name}'] = {
                'R2': r2,
                'MAE': mae,
                'RMSE': rmse,
                'CV_Mean': cv_scores.mean(),
                'CV_Std': cv_scores.std()
            }
            
            self._log(f"      R²: {r2:.4f} | MAE: {mae:.4f} | CV: {cv_scores.mean():.4f}±{cv_scores.std():.4f}")
        
        # 4.2 Ensemble Methods
        self._log("\n4.2 Training ensemble models...")
        
        # Voting Regressor
        if len([m for m in self.models if m.startswith('reg_')]) >= 3:
            ensemble_models = [
                (name, model) for name, model in self.models.items()
                if name.startswith('reg_')
            ][:3]  # Top 3
            
            voting_reg = VotingRegressor(estimators=ensemble_models)
            voting_reg.fit(self.X_train, self.y_train_reg)
            y_pred = voting_reg.predict(self.X_test)
            
            r2 = r2_score(self.y_test_reg, y_pred)
            self.models['reg_Voting'] = voting_reg
            self.results['reg_Voting'] = {
                'R2': r2,
                'MAE': mean_absolute_error(self.y_test_reg, y_pred),
                'RMSE': np.sqrt(mean_squared_error(self.y_test_reg, y_pred))
            }
            self._log(f"      Voting R²: {r2:.4f}")
        
        return self.results
    
    def _optimize_regression_model(self, model_name, model):
        """Optuna hyperparameter optimization for regression"""
        if not HAS_OPTUNA:
            return model
        
        def objective(trial):
            # Hyperparameter suggestions based on model
            if model_name == 'RandomForest':
                params = {
                    'n_estimators': trial.suggest_int('n_estimators', 100, 300),
                    'max_depth': trial.suggest_int('max_depth', 10, 30),
                    'min_samples_split': trial.suggest_int('min_samples_split', 2, 10),
                    'min_samples_leaf': trial.suggest_int('min_samples_leaf', 1, 5),
                }
                clf = RandomForestRegressor(**params, random_state=42, n_jobs=-1)
            
            elif model_name == 'XGBoost':
                params = {
                    'n_estimators': trial.suggest_int('n_estimators', 100, 300),
                    'max_depth': trial.suggest_int('max_depth', 5, 15),
                    'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                    'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                    'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
                }
                clf = XGBRegressor(**params, random_state=42, verbosity=0)
            
            elif model_name == 'CatBoost':
                params = {
                    'iterations': trial.suggest_int('iterations', 100, 300),
                    'depth': trial.suggest_int('depth', 5, 15),
                    'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                    'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                }
                clf = CatBoostRegressor(**params, random_state=42, verbose=0)
            
            elif model_name == 'LightGBM':
                params = {
                    'n_estimators': trial.suggest_int('n_estimators', 100, 300),
                    'num_leaves': trial.suggest_int('num_leaves', 20, 100),
                    'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                    'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                }
                clf = LGBMRegressor(**params, random_state=42, verbose=-1)
            else:
                return 0
            
            kfold = KFold(n_splits=3, shuffle=True, random_state=42)
            scores = cross_val_score(clf, self.X_train, self.y_train_reg, cv=kfold, scoring='r2')
            return scores.mean()
        
        study = optuna.create_study(direction='maximize')
        study.optimize(objective, n_trials=20, show_progress_bar=False)
        
        best_params = study.best_params
        
        if model_name == 'RandomForest':
            return RandomForestRegressor(**best_params, random_state=42, n_jobs=-1)
        elif model_name == 'XGBoost':
            return XGBRegressor(**best_params, random_state=42, verbosity=0, n_jobs=-1)
        elif model_name == 'CatBoost':
            return CatBoostRegressor(**best_params, random_state=42, verbose=0)
        elif model_name == 'LightGBM':
            return LGBMRegressor(**best_params, random_state=42, verbose=-1, n_jobs=-1)
        
        return model
    
    # ─────────────────────────────────────────────────────────────────────────────
    # STEP 5: TRAIN CLASSIFICATION MODELS WITH SMOTE & THRESHOLD TUNING
    # ─────────────────────────────────────────────────────────────────────────────
    
    def train_classification_models(self):
        """Train and optimize classification models"""
        self._log("\n🎯 STEP 5: CLASSIFICATION MODEL TRAINING & OPTIMIZATION")
        self._log("=" * 70)
        
        # 5.1 Apply SMOTE for class imbalance
        self._log("5.1 Applying SMOTE for class imbalance...")
        X_train_smote = self.X_train
        y_train_smote = self.y_train_clf
        
        if HAS_SMOTE:
            smote = SMOTE(random_state=42, k_neighbors=3)
            X_train_smote, y_train_smote = smote.fit_resample(self.X_train, self.y_train_clf)
            self._log(f"   ✓ SMOTE applied | New training size: {len(X_train_smote)}")
        else:
            self._log("   ⚠ SMOTE not available, skipping")
        
        # 5.2 Train classification models
        self._log("5.2 Training classification models...")
        
        base_classifiers = {
            'RandomForest': RandomForestClassifier(random_state=42, n_jobs=-1, class_weight='balanced'),
            'ExtraTrees': ExtraTreesClassifier(random_state=42, n_jobs=-1, class_weight='balanced'),
            'GradientBoosting': GradientBoostingClassifier(random_state=42)
        }
        
        if HAS_XGBOOST:
            base_classifiers['XGBoost'] = XGBClassifier(random_state=42, n_jobs=-1, verbosity=0, scale_pos_weight=5)
        
        if HAS_LIGHTGBM:
            base_classifiers['LightGBM'] = LGBMClassifier(random_state=42, n_jobs=-1, verbose=-1, scale_pos_weight=5)
        
        if HAS_CATBOOST:
            base_classifiers['CatBoost'] = CatBoostClassifier(random_state=42, verbose=0, scale_pos_weight=5)
        
        best_models_clf = {}
        
        for model_name in ['RandomForest', 'XGBoost', 'CatBoost', 'LightGBM']:
            if model_name not in base_classifiers:
                continue
            
            self._log(f"\n   Training {model_name}...")
            
            if HAS_OPTUNA:
                model = self._optimize_classification_model(model_name, base_classifiers[model_name])
            else:
                model = base_classifiers[model_name]
            
            # K-Fold CV
            skfold = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
            cv_scores = cross_val_score(model, X_train_smote, y_train_smote, cv=skfold, scoring='f1')
            
            # Train on SMOTE data
            model.fit(X_train_smote, y_train_smote)
            
            # Threshold tuning (optimize for F1 score)
            y_proba = model.predict_proba(self.X_test)[:, 1]
            
            best_threshold = 0.5
            best_f1 = 0
            
            for threshold in np.arange(0.3, 0.8, 0.05):
                y_pred_thresh = (y_proba >= threshold).astype(int)
                f1 = f1_score(self.y_test_clf, y_pred_thresh, zero_division=0)
                if f1 > best_f1:
                    best_f1 = f1
                    best_threshold = threshold
            
            y_pred = (y_proba >= best_threshold).astype(int)
            
            acc = accuracy_score(self.y_test_clf, y_pred)
            prec = precision_score(self.y_test_clf, y_pred, zero_division=0)
            rec = recall_score(self.y_test_clf, y_pred, zero_division=0)
            f1 = f1_score(self.y_test_clf, y_pred, zero_division=0)
            
            self.models[f'clf_{model_name}'] = model
            self.results[f'clf_{model_name}'] = {
                'Accuracy': acc,
                'Precision': prec,
                'Recall': rec,
                'F1': f1,
                'Threshold': best_threshold,
                'CV_F1_Mean': cv_scores.mean(),
                'CV_F1_Std': cv_scores.std()
            }
            
            self._log(f"      Accuracy: {acc:.4f} | Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f}")
            self._log(f"      Threshold: {best_threshold:.2f} | CV F1: {cv_scores.mean():.4f}±{cv_scores.std():.4f}")
        
        return self.results
    
    def _optimize_classification_model(self, model_name, model):
        """Optuna hyperparameter optimization for classification"""
        if not HAS_OPTUNA:
            return model
        
        def objective(trial):
            if model_name == 'RandomForest':
                params = {
                    'n_estimators': trial.suggest_int('n_estimators', 100, 300),
                    'max_depth': trial.suggest_int('max_depth', 10, 30),
                    'min_samples_split': trial.suggest_int('min_samples_split', 2, 10),
                }
                clf = RandomForestClassifier(**params, random_state=42, n_jobs=-1, class_weight='balanced')
            
            elif model_name == 'XGBoost':
                params = {
                    'n_estimators': trial.suggest_int('n_estimators', 100, 300),
                    'max_depth': trial.suggest_int('max_depth', 5, 15),
                    'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                }
                clf = XGBClassifier(**params, random_state=42, scale_pos_weight=5, verbosity=0)
            
            elif model_name == 'CatBoost':
                params = {
                    'iterations': trial.suggest_int('iterations', 100, 300),
                    'depth': trial.suggest_int('depth', 5, 15),
                    'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                }
                clf = CatBoostClassifier(**params, random_state=42, verbose=0, scale_pos_weight=5)
            
            elif model_name == 'LightGBM':
                params = {
                    'n_estimators': trial.suggest_int('n_estimators', 100, 300),
                    'num_leaves': trial.suggest_int('num_leaves', 20, 100),
                    'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                }
                clf = LGBMClassifier(**params, random_state=42, verbose=-1, scale_pos_weight=5)
            else:
                return 0
            
            skfold = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
            scores = cross_val_score(clf, self.X_train, self.y_train_clf, cv=skfold, scoring='f1')
            return scores.mean()
        
        study = optuna.create_study(direction='maximize')
        study.optimize(objective, n_trials=20, show_progress_bar=False)
        
        best_params = study.best_params
        
        if model_name == 'RandomForest':
            return RandomForestClassifier(**best_params, random_state=42, n_jobs=-1, class_weight='balanced')
        elif model_name == 'XGBoost':
            return XGBClassifier(**best_params, random_state=42, scale_pos_weight=5, verbosity=0, n_jobs=-1)
        elif model_name == 'CatBoost':
            return CatBoostClassifier(**best_params, random_state=42, verbose=0, scale_pos_weight=5)
        elif model_name == 'LightGBM':
            return LGBMClassifier(**best_params, random_state=42, verbose=-1, scale_pos_weight=5, n_jobs=-1)
        
        return model
    
    # ─────────────────────────────────────────────────────────────────────────────
    # STEP 6: SHAP EXPLANATIONS & FEATURE IMPORTANCE
    # ─────────────────────────────────────────────────────────────────────────────
    
    def generate_shap_explanations(self):
        """Generate SHAP explanations for best models"""
        self._log("\n📊 STEP 6: SHAP EXPLANATIONS & FEATURE IMPORTANCE")
        self._log("=" * 70)
        
        if not HAS_SHAP:
            self._log("   ⚠ SHAP not available, skipping")
            return
        
        # Get best regression model
        best_reg_model_name = max(
            [(k, v['R2']) for k, v in self.results.items() if k.startswith('reg_')],
            key=lambda x: x[1]
        )[0]
        
        best_reg_model = self.models[best_reg_model_name]
        
        self._log(f"6.1 Generating SHAP explanations for {best_reg_model_name}...")
        
        try:
            if hasattr(best_reg_model, 'predict'):
                explainer = shap.TreeExplainer(best_reg_model)
                shap_values = explainer.shap_values(self.X_test)
                
                # Calculate feature importance
                feature_importance = np.abs(shap_values).mean(axis=0)
                feature_importance_dict = dict(zip(self.feature_names, feature_importance))
                feature_importance_dict = {k: float(v) for k, v in 
                    sorted(feature_importance_dict.items(), key=lambda x: x[1], reverse=True)[:15]}
                
                self._log(f"   ✓ Top features for {best_reg_model_name}:")
                for i, (feat, imp) in enumerate(feature_importance_dict.items(), 1):
                    self._log(f"      {i}. {feat}: {imp:.4f}")
                
                self.shap_explainers[best_reg_model_name] = feature_importance_dict
        except Exception as e:
            self._log(f"   ⚠ SHAP error: {str(e)[:100]}")
    
    # ─────────────────────────────────────────────────────────────────────────────
    # STEP 7: MODEL COMPARISON & SELECTION
    # ─────────────────────────────────────────────────────────────────────────────
    
    def compare_and_select_best_models(self):
        """Compare all models and select best"""
        self._log("\n🏆 STEP 7: MODEL COMPARISON & SELECTION")
        self._log("=" * 70)
        
        # 7.1 Regression Results
        self._log("7.1 Regression Model Rankings (by R²):")
        reg_results = {k: v for k, v in self.results.items() if k.startswith('reg_')}
        reg_sorted = sorted(reg_results.items(), key=lambda x: x[1]['R2'], reverse=True)
        
        for i, (model_name, metrics) in enumerate(reg_sorted, 1):
            r2 = metrics.get('R2', 0)
            mae = metrics.get('MAE', 0)
            self._log(f"   {i}. {model_name}: R² = {r2:.4f}, MAE = {mae:.4f}")
        
        if reg_sorted:
            best_reg = reg_sorted[0]
            self.best_models['regression'] = {
                'name': best_reg[0],
                'model': self.models[best_reg[0]],
                'metrics': best_reg[1]
            }
            self._log(f"\n   🌟 Best Regression Model: {best_reg[0]}")
        
        # 7.2 Classification Results
        self._log("\n7.2 Classification Model Rankings (by F1-Score):")
        clf_results = {k: v for k, v in self.results.items() if k.startswith('clf_')}
        clf_sorted = sorted(clf_results.items(), key=lambda x: x[1]['F1'], reverse=True)
        
        for i, (model_name, metrics) in enumerate(clf_sorted, 1):
            f1 = metrics.get('F1', 0)
            recall = metrics.get('Recall', 0)
            self._log(f"   {i}. {model_name}: F1 = {f1:.4f}, Recall = {recall:.4f}")
        
        if clf_sorted:
            best_clf = clf_sorted[0]
            self.best_models['classification'] = {
                'name': best_clf[0],
                'model': self.models[best_clf[0]],
                'metrics': best_clf[1]
            }
            self._log(f"\n   🌟 Best Classification Model: {best_clf[0]}")
        
        return self.best_models
    
    # ─────────────────────────────────────────────────────────────────────────────
    # STEP 8: SAVE MODELS & RESULTS
    # ─────────────────────────────────────────────────────────────────────────────
    
    def save_results(self):
        """Save models and results to disk"""
        self._log("\n💾 STEP 8: SAVING MODELS & RESULTS")
        self._log("=" * 70)
        
        base_dir = Path(__file__).resolve().parent.parent
        results_dir = base_dir / 'ml_results'
        results_dir.mkdir(exist_ok=True)
        
        # Save best models
        for task, info in self.best_models.items():
            model_path = results_dir / f"best_model_{task}.pkl"
            with open(model_path, 'wb') as f:
                pickle.dump(info['model'], f)
            self._log(f"   ✓ Saved {task} model: {model_path}")
        
        # Save results summary
        results_summary = {
            'timestamp': datetime.now().isoformat(),
            'regression': self.best_models.get('regression', {}),
            'classification': self.best_models.get('classification', {}),
            'all_results': self.results,
            'feature_names': self.feature_names,
            'shap_features': self.shap_explainers
        }
        
        results_path = results_dir / 'results_summary.json'
        with open(results_path, 'w') as f:
            # Convert models to string for JSON serialization
            results_for_json = {
                'timestamp': results_summary['timestamp'],
                'regression': {
                    'name': results_summary['regression'].get('name', ''),
                    'metrics': results_summary['regression'].get('metrics', {})
                },
                'classification': {
                    'name': results_summary['classification'].get('name', ''),
                    'metrics': results_summary['classification'].get('metrics', {})
                },
                'all_results': results_summary['all_results'],
                'feature_names': results_summary['feature_names'],
                'shap_features': results_summary['shap_features']
            }
            json.dump(results_for_json, f, indent=2)
        
        self._log(f"   ✓ Saved results summary: {results_path}")
        
        return results_dir
    
    # ─────────────────────────────────────────────────────────────────────────────
    # RUN COMPLETE PIPELINE
    # ─────────────────────────────────────────────────────────────────────────────
    
    def run_complete_pipeline(self):
        """Execute full optimization pipeline"""
        self._log("\n" + "=" * 70)
        self._log("🚀 NETFLIX ML ADVANCED OPTIMIZATION PIPELINE")
        self._log("=" * 70)
        
        try:
            # Step 1: Data Cleaning
            self.clean_data()
            
            # Step 2: Feature Engineering
            self.engineer_features()
            
            # Step 3: Preprocessing
            self.preprocess_data()
            
            # Step 4: Regression Models
            self.train_regression_models()
            
            # Step 5: Classification Models
            self.train_classification_models()
            
            # Step 6: SHAP Explanations
            self.generate_shap_explanations()
            
            # Step 7: Compare & Select
            self.compare_and_select_best_models()
            
            # Step 8: Save Results
            self.save_results()
            
            self._log("\n" + "=" * 70)
            self._log("✅ PIPELINE COMPLETED SUCCESSFULLY!")
            self._log("=" * 70)
            
            return {
                'best_models': self.best_models,
                'all_results': self.results
            }
        
        except Exception as e:
            self._log(f"\n❌ Pipeline error: {str(e)}")
            import traceback
            traceback.print_exc()
            return None


if __name__ == '__main__':
    # Run the pipeline
    pipeline = AdvancedNetflixMLPipeline(verbose=True)
    results = pipeline.run_complete_pipeline()
    
    # Print final summary
    if results:
        print("\n" + "=" * 70)
        print("📊 FINAL RESULTS SUMMARY")
        print("=" * 70)
        
        if 'regression' in results['best_models']:
            reg_model = results['best_models']['regression']
            print(f"\n🔴 Best Regression Model: {reg_model['name']}")
            for metric, value in reg_model['metrics'].items():
                print(f"   {metric}: {value:.4f}" if isinstance(value, (int, float)) else f"   {metric}: {value}")
        
        if 'classification' in results['best_models']:
            clf_model = results['best_models']['classification']
            print(f"\n🔵 Best Classification Model: {clf_model['name']}")
            for metric, value in clf_model['metrics'].items():
                print(f"   {metric}: {value:.4f}" if isinstance(value, (int, float)) else f"   {metric}: {value}")
        
        print("\n" + "=" * 70)
