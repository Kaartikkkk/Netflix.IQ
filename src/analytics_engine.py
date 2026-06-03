"""
Netflix Analytics Engine
Advanced analytics and insights generation for Netflix content data
Works with unified Dataset.csv
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json

class NetflixAnalytics:
    """Advanced analytics for Netflix content using Dataset.csv"""
    
    def __init__(self, df=None, csv_path=None):
        """Initialize with a DataFrame or path to Dataset.csv"""
        if df is not None:
            self.df = df.copy()
        elif csv_path:
            self.df = pd.read_csv(csv_path)
        else:
            # Default path
            base_dir = Path(__file__).resolve().parent.parent
            self.df = pd.read_csv(base_dir / 'Dataset.csv')
        
        self.insights = {}
        self._prepare_data()
    
    def _prepare_data(self):
        """Prepare data for analysis"""
        # Fill missing values
        self.df['primary_genre'] = self.df['primary_genre'].fillna('Unknown')
        self.df['country'] = self.df['country'].fillna('Unknown')
        self.df['age_rating'] = self.df['age_rating'].fillna('Unknown')
        
        # Parse dates
        self.df['date_added'] = pd.to_datetime(self.df['date_added'], errors='coerce')
        self.df['year_added'] = self.df['date_added'].dt.year
        
        # Create rating categories
        self.df['rating_category'] = pd.cut(
            self.df['imdb_score'].fillna(0),
            bins=[0, 4, 6, 7, 8, 10],
            labels=['Poor (0-4)', 'Below Avg (4-6)', 'Average (6-7)', 'Good (7-8)', 'Excellent (8+)']
        )
        
    def generate_summary_statistics(self):
        """Generate comprehensive summary statistics"""
        # Count content types
        movies = len(self.df[self.df['is_movie'] == True])
        tv_shows = len(self.df[self.df['is_movie'] == False])
        # Get average rating (excluding nulls)
        valid_ratings = self.df[self.df['has_imdb_score'] == True]['imdb_score']
        avg_rating = round(valid_ratings.mean(), 2) if len(valid_ratings) > 0 else 0
        # Count unique values
        unique_genres = self.df['primary_genre'].nunique()
        unique_countries = len(set(','.join(self.df['country'].dropna().astype(str)).split(',')))
        # Calculate decades covered
        if 'decade' in self.df.columns:
            decades_covered = self.df['decade'].nunique()
        else:
            min_year = int(self.df['release_year'].min()) if not self.df['release_year'].isna().all() else 2000
            max_year = int(self.df['release_year'].max()) if not self.df['release_year'].isna().all() else 2025
            decades_covered = (max_year // 10) - (min_year // 10) + 1
        # Get best model accuracy from ML metrics if available
        best_model_accuracy = None
        # Ensure ML models are run before calculating best_model_accuracy
        if 'ml' not in self.insights or 'metrics' not in self.insights['ml']:
            print("Running ML models to populate ml_metrics...")
            self.run_ml_models()

        # Debugging: Log ml_metrics and accs
        ml_metrics = self.insights.get('ml', {}).get('metrics', {})
        print("ml_metrics:", ml_metrics)
        accs = [
            ml_metrics.get('hit_classifier', {}).get('Accuracy', 0),
            ml_metrics.get('rating_bucket_best', {}).get('Accuracy', 0)
        ]
        print("accs:", accs)
        best_model_accuracy = max(accs) if accs else None

        # Debugging: Log ml_metrics and accs
        print("ml_metrics:", ml_metrics)
        print("accs:", accs)

        stats = {
            'total_content': len(self.df),
            'movies': movies,
            'tv_shows': tv_shows,
            'avg_rating': avg_rating,
            'unique_genres': unique_genres,
            'unique_countries': min(unique_countries, 200),  # Cap at reasonable number
            'decades_covered': decades_covered,
            'date_range': {
                'earliest': int(self.df['release_year'].min()) if not self.df['release_year'].isna().all() else 2000,
                'latest': int(self.df['release_year'].max()) if not self.df['release_year'].isna().all() else 2025
            },
            'avg_runtime': round(self.df['runtime_minutes'].mean(), 1) if 'runtime_minutes' in self.df.columns else 0,
            'best_model_accuracy': round(best_model_accuracy * 100, 1) if best_model_accuracy is not None else None
        }
        self.insights['summary'] = stats
        return stats
    
    def analyze_content_trends(self):
        """Analyze content release trends over time"""
        trends = {}
        
        # Create content type label
        self.df['type'] = self.df['is_movie'].apply(lambda x: 'Movie' if x else 'TV Show')
        
        # Content by year
        yearly = self.df.groupby(['release_year', 'type']).size().unstack(fill_value=0)
        trends['yearly_releases'] = {col: yearly[col].to_dict() for col in yearly.columns}
        
        # Content by decade
        if 'decade' in self.df.columns:
            decade_dist = self.df.groupby(['decade', 'type']).size().unstack(fill_value=0)
            trends['decade_distribution'] = {col: decade_dist[col].to_dict() for col in decade_dist.columns}
        
        # Recent content (last 5 years)
        current_year = 2025
        recent_content = self.df[self.df['release_year'] >= current_year - 5]
        trends['recent_content_count'] = len(recent_content)
        
        valid_recent_ratings = recent_content[recent_content['has_imdb_score'] == True]['imdb_score']
        trends['recent_avg_rating'] = round(valid_recent_ratings.mean(), 2) if len(valid_recent_ratings) > 0 else 0
        
        self.insights['trends'] = trends
        return trends
    
    def analyze_genres(self):
        """Comprehensive genre analysis with all metrics"""
        genre_stats = {}
        
        # 1. TOP GENRES BY COUNT
        top_genres = self.df['primary_genre'].value_counts().head(15)
        genre_stats['top_genres'] = top_genres.to_dict()
        
        # 2. GENRE PERFORMANCE METRICS
        genre_perf = self.df.groupby('primary_genre').agg({
            'imdb_score': ['mean', 'median', 'std'],
            'vote_count': ['sum', 'mean'],
            'popularity': ['mean', 'max'],
            'runtime_minutes': ['mean', 'median'],
            'title': 'count'
        }).dropna()
        
        genre_perf.columns = ['_'.join(col) for col in genre_perf.columns]
        genre_perf = genre_perf.sort_values('imdb_score_mean', ascending=False)
        
        genre_stats['top_performing_genres'] = {
            'imdb_score_mean': {k: round(float(v), 2) for k, v in genre_perf['imdb_score_mean'].head(10).to_dict().items()},
            'imdb_score_median': {k: round(float(v), 2) for k, v in genre_perf['imdb_score_median'].head(10).to_dict().items()},
            'vote_count_sum': {k: int(v) for k, v in genre_perf['vote_count_sum'].head(10).to_dict().items()},
            'popularity_mean': {k: round(float(v), 2) for k, v in genre_perf['popularity_mean'].head(10).to_dict().items()},
            'runtime_minutes_mean': {k: round(float(v), 1) for k, v in genre_perf['runtime_minutes_mean'].head(10).to_dict().items()},
            'title_count': {k: int(v) for k, v in genre_perf['title_count'].head(10).to_dict().items()}
        }
        
        # 3. GENRE BY CONTENT TYPE
        genre_by_type = pd.crosstab(self.df['primary_genre'], self.df['type'])
        genre_stats['genre_by_type'] = {col: genre_by_type[col].head(10).to_dict() for col in genre_by_type.columns}
        
        # 4. GENRE GROWTH BY YEAR
        genre_yearly = self.df[self.df['year_added'].notna()].groupby(['year_added', 'primary_genre']).size().unstack(fill_value=0)
        genre_yearly = genre_yearly[[col for col in genre_yearly.columns if col in top_genres.index]]
        genre_growth = {
            str(int(year)): {genre: int(count) for genre, count in row.items()} 
            for year, row in genre_yearly.iterrows()
        }
        genre_stats['yearly_growth'] = genre_growth
        
        # 5. RATING DISTRIBUTION BY GENRE (for box plot)
        genre_ratings = {}
        for genre in top_genres.head(8).index:
            ratings = self.df[self.df['primary_genre'] == genre]['imdb_score'].dropna()
            if len(ratings) > 0:
                genre_ratings[genre] = {
                    'mean': round(float(ratings.mean()), 2),
                    'median': round(float(ratings.median()), 2),
                    'min': round(float(ratings.min()), 2),
                    'max': round(float(ratings.max()), 2),
                    'q1': round(float(ratings.quantile(0.25)), 2),
                    'q3': round(float(ratings.quantile(0.75)), 2),
                    'count': int(len(ratings))
                }
        genre_stats['rating_distribution'] = genre_ratings
        
        # 6. RUNTIME DISTRIBUTION BY GENRE
        genre_runtime = {}
        for genre in top_genres.head(8).index:
            runtimes = self.df[self.df['primary_genre'] == genre]['runtime_minutes'].dropna()
            if len(runtimes) > 0:
                genre_runtime[genre] = {
                    'mean': round(float(runtimes.mean()), 1),
                    'median': round(float(runtimes.median()), 1),
                    'min': round(float(runtimes.min()), 1),
                    'max': round(float(runtimes.max()), 1),
                    'q1': round(float(runtimes.quantile(0.25)), 1),
                    'q3': round(float(runtimes.quantile(0.75)), 1),
                    'count': int(len(runtimes))
                }
        genre_stats['runtime_distribution'] = genre_runtime
        
        # 7. COUNTRY × GENRE HEATMAP
        country_genre = pd.crosstab(
            self.df['primary_country'], 
            self.df['primary_genre']
        )
        # Get top countries and genres
        top_countries = self.df['primary_country'].value_counts().head(10).index
        top_genres_list = self.df['primary_genre'].value_counts().head(8).index
        
        country_genre_filtered = country_genre.loc[top_countries, top_genres_list]
        country_genre_matrix = {
            country: {genre: int(count) for genre, count in row.items()} 
            for country, row in country_genre_filtered.iterrows()
        }
        genre_stats['country_genre_matrix'] = country_genre_matrix
        
        self.insights['genres'] = genre_stats
        return genre_stats
    
    def analyze_countries(self):
        """Geographic content analysis"""
        country_stats = {}
        
        # Top producing countries
        top_countries = self.df['primary_country'].value_counts().head(20)
        country_stats['top_countries'] = top_countries.to_dict()
        
        # Country content quality
        country_quality = self.df.groupby('primary_country').agg({
            'imdb_score': 'mean',
            'title': 'count'
        }).rename(columns={'title': 'content_count'})
        
        country_quality = country_quality[country_quality['content_count'] >= 10]
        country_quality = country_quality.sort_values('imdb_score', ascending=False).head(15)
        country_stats['highest_rated_countries'] = {
            'imdb_score': country_quality['imdb_score'].to_dict(),
            'content_count': country_quality['content_count'].to_dict()
        }
        
        self.insights['countries'] = country_stats
        return country_stats
    
    def analyze_ratings_distribution(self):
        """Analyze rating patterns"""
        rating_stats = {}
        
        # Rating distribution
        rating_dist = self.df['rating_category'].value_counts()
        rating_stats['distribution'] = rating_dist.to_dict()
        
        # Ratings by type
        ratings_by_type = self.df.groupby('type')['imdb_score'].agg(['mean', 'median', 'std'])
        rating_stats['by_content_type'] = {
            'mean': ratings_by_type['mean'].to_dict(),
            'median': ratings_by_type['median'].to_dict(),
            'std': ratings_by_type['std'].to_dict()
        }
        
        # Highly rated content
        valid_rated = self.df[self.df['has_imdb_score'] == True]
        highly_rated = valid_rated[valid_rated['imdb_score'] >= 8.0][
            ['title', 'content_type', 'release_year', 'imdb_score', 'primary_genre']
        ].sort_values('imdb_score', ascending=False).head(20)
        
        rating_stats['top_rated_content'] = highly_rated.to_dict('records')
        
        # Rating trends by decade
        if 'decade' in self.df.columns:
            rating_trends = self.df.groupby('decade')['imdb_score'].mean()
            rating_stats['rating_by_decade'] = rating_trends.to_dict()
        
        self.insights['ratings'] = rating_stats
        return rating_stats
    
    def analyze_runtime(self):
        """Analyze runtime patterns"""
        runtime_stats = {}
        
        valid_runtime = self.df[self.df['has_runtime'] == True]
        
        # Runtime distribution by category
        runtime_dist = self.df['runtime_category'].value_counts()
        runtime_stats['distribution'] = runtime_dist.to_dict()
        
        # Average runtime by genre
        runtime_by_genre = valid_runtime.groupby('primary_genre')['runtime_minutes'].mean()
        runtime_stats['by_genre'] = runtime_by_genre.head(10).to_dict()
        
        # Average runtime by decade
        if 'decade' in valid_runtime.columns:
            runtime_by_decade = valid_runtime.groupby('decade')['runtime_minutes'].mean()
            runtime_stats['by_decade'] = runtime_by_decade.to_dict()
        
        self.insights['runtime'] = runtime_stats
        return runtime_stats
    
    def analyze_clustering(self):
        """Perform K-means clustering analysis on content"""
        try:
            from sklearn.cluster import KMeans
            from sklearn.preprocessing import StandardScaler
            from sklearn.decomposition import PCA
            import warnings
            warnings.filterwarnings('ignore')
            
            print("   Running K-means clustering...")
            
            # Prepare features for clustering
            cluster_features = self.df[[
                'imdb_score', 'popularity', 'runtime_minutes', 
                'vote_count', 'year_added', 'credits_count'
            ]].fillna(0)
            
            # Fill missing years
            cluster_features['year_added'] = cluster_features['year_added'].fillna(2020)
            
            # Scale features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(cluster_features)
            
            # Find optimal K using elbow method
            inertias = []
            silhouette_scores = []
            K_range = range(2, 8)
            
            for k in K_range:
                kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
                kmeans.fit(X_scaled)
                inertias.append(kmeans.inertia_)
                
                from sklearn.metrics import silhouette_score
                score = silhouette_score(X_scaled, kmeans.labels_)
                silhouette_scores.append(score)
            
            # Use K with best silhouette score
            best_k = K_range[silhouette_scores.index(max(silhouette_scores))]
            kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(X_scaled)
            self.df['cluster'] = cluster_labels
            
            # Analyze cluster characteristics
            cluster_analysis = {}
            cluster_names = {}
            
            for cluster_id in range(best_k):
                cluster_data = self.df[self.df['cluster'] == cluster_id]
                avg_rating = float(cluster_data['imdb_score'].mean())
                avg_popularity = float(cluster_data['popularity'].mean())
                avg_runtime = float(cluster_data['runtime_minutes'].mean())
                avg_year = float(cluster_data['year_added'].mean())
                size_pct = len(cluster_data) / len(self.df) * 100
                
                cluster_info = {
                    'size': len(cluster_data),
                    'size_pct': round(size_pct, 1),
                    'avg_rating': avg_rating,
                    'avg_popularity': avg_popularity,
                    'avg_runtime': avg_runtime,
                    'avg_votes': float(cluster_data['vote_count'].mean()),
                    'avg_year': avg_year,
                    'top_genres': cluster_data['primary_genre'].value_counts().head(3).index.tolist(),
                    'content_types': cluster_data['type'].value_counts().to_dict()
                }
                cluster_analysis[f'Cluster {cluster_id}'] = cluster_info
                
                # Generate meaningful cluster names based on characteristics
                if avg_rating >= 7.5 and avg_popularity >= 75:
                    name = "Premium Hits"
                    description = "High-rated acclaimed content"
                elif avg_rating >= 7.5 and avg_popularity < 50:
                    name = "Hidden Gems"
                    description = "Quality content, less mainstream"
                elif avg_rating < 6.5 and avg_popularity >= 75:
                    name = "Popular Blockbusters"
                    description = "High viewership, lower ratings"
                elif avg_rating >= 6.5 and avg_popularity >= 50:
                    name = "Mainstream Content"
                    description = "Balanced popular & rated"
                elif size_pct > 15:
                    name = "Core Collection"
                    description = "Large majority of catalog"
                elif avg_runtime < 60:
                    name = "Quick Watch"
                    description = "Shorter duration content"
                elif avg_year > 2020:
                    name = "Recent Releases"
                    description = "Latest additions"
                else:
                    name = "Specialty Content"
                    top_genre = cluster_info['top_genres'][0] if cluster_info['top_genres'] else 'Various'
                    description = f"Niche {top_genre} content"
                
                cluster_names[f'Cluster {cluster_id}'] = {
                    'name': name,
                    'description': description,
                    'size_pct': size_pct,
                    'avg_rating': avg_rating,
                    'avg_popularity': avg_popularity
                }
            
            # Calculate feature correlations
            correlations = cluster_features.corr().fillna(0).round(4).values.tolist()
            feature_names = ['Rating', 'Popularity', 'Runtime', 'Votes', 'Year', 'Credits']
            
            # PCA for visualization
            pca = PCA(n_components=2)
            pca_transformed = pca.fit_transform(X_scaled)
            
            pca_data = {
                'x': pca_transformed[:, 0].tolist(),
                'y': pca_transformed[:, 1].tolist(),
                'clusters': cluster_labels.tolist(),
                'variance_explained': float(pca.explained_variance_ratio_.sum())
            }
            
            # Silhouette coefficients for each sample
            from sklearn.metrics import silhouette_samples
            silhouette_vals = silhouette_samples(X_scaled, cluster_labels)
            
            silhouette_data = {
                'values': silhouette_vals.tolist(),
                'clusters': cluster_labels.tolist(),
                'avg': float(silhouette_vals.mean())
            }
            
            # Hierarchical clustering linkage for dendrogram
            from scipy.cluster.hierarchy import linkage
            print("   Computing hierarchical clustering...")
            # Use smaller sample to avoid memory issues
            dendro_sample_size = min(200, len(X_scaled))
            linkage_matrix = linkage(X_scaled[:dendro_sample_size], method='ward')  # Use smaller subset for memory efficiency
            
            # Convert linkage matrix to list
            dendro_data = {
                'linkage': linkage_matrix.tolist(),
                'labels': [f'S{i}' for i in range(dendro_sample_size + 1)]
            }
            
            clustering_insights = {
                'optimal_k': int(best_k),
                'silhouette_scores': {str(k): round(float(s), 3) for k, s in zip(K_range, silhouette_scores)},
                'inertia_values': {str(k): round(float(i), 1) for k, i in zip(K_range, inertias)},
                'cluster_analysis': cluster_analysis,
                'cluster_names': cluster_names,
                'feature_correlations': correlations,
                'feature_names': feature_names,
                'pca_data': pca_data,
                'silhouette_data': silhouette_data,
                'dendro_data': dendro_data,
                'cluster_profiles': {
                    f'Cluster {i}': {
                        'rating': round(float(self.df[self.df['cluster'] == i]['imdb_score'].mean()), 2),
                        'popularity': round(float(self.df[self.df['cluster'] == i]['popularity'].mean()), 2),
                        'engagement': round(float(self.df[self.df['cluster'] == i]['vote_count'].mean() / 1000), 2),
                        'size_pct': round(len(self.df[self.df['cluster'] == i]) / len(self.df) * 100, 1)
                    }
                    for i in range(best_k)
                }
            }
            
            self.insights['clustering'] = clustering_insights
            print(f"   ✓ Clustering complete (K={best_k} clusters)")
            return clustering_insights
            
        except Exception as e:
            print(f"   ⚠ Clustering failed: {e}")
            self.insights['clustering'] = {'error': str(e)}
            return {}
    
    def _clean_for_json(self, obj):
        """Recursively convert numpy/pandas types and NaN to JSON-safe values"""
        if isinstance(obj, dict):
            return {k: self._clean_for_json(v) for k, v in obj.items()}
        elif isinstance(obj, (list, tuple)):
            return [self._clean_for_json(i) for i in obj]
        elif isinstance(obj, (np.integer, np.int64, np.int32)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64, np.float32)):
            if np.isnan(obj) or np.isinf(obj):
                return None
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return [self._clean_for_json(i) for i in obj.tolist()]
        elif pd.isna(obj):
            return None
        elif isinstance(obj, float):
            if np.isnan(obj) or np.isinf(obj):
                return None
            return obj
        else:
            return obj

    def generate_all_insights(self):
        """Generate all analytics insights"""
        print("📊 Generating analytics insights...")
        
        # Initialize derived columns early
        self.df['type'] = self.df['is_movie'].apply(lambda x: 'Movie' if x else 'TV Show')
        self.df['primary_country'] = self.df['country'].str.split(',').str[0].str.strip()
        
        # Run ML models first to populate ml_metrics
        self.run_ml_models()
        print("   ✓ ML models trained")

        # Generate summary statistics after ML metrics are available
        self.generate_summary_statistics()
        print("   ✓ Summary statistics")
        
        self.analyze_content_trends()
        print("   ✓ Content trends")
        
        self.analyze_genres()
        print("   ✓ Genre analysis")
        
        self.analyze_countries()
        print("   ✓ Country analysis")
        
        self.analyze_ratings_distribution()
        print("   ✓ Rating distribution")
        
        self.analyze_runtime()
        print("   ✓ Runtime analysis")
        
        self.analyze_clustering()
        print("   ✓ Clustering analysis")
        
        # Clean all data for JSON serialization
        self.insights = self._clean_for_json(self.insights)
        
        print("✅ Analytics generation complete!")
        return self.insights
    
    def run_ml_models(self):
        """Run optimized ML models and add predictions to insights"""
        try:
            import pickle
            from pathlib import Path
            
            # Try to load optimized models first
            results_dir = Path(__file__).resolve().parent.parent / 'ml_results'
            
            if results_dir.exists() and (results_dir / 'results_summary.json').exists():
                # Load optimized models
                print("   📊 Loading optimized ML models...")
                with open(results_dir / 'results_summary.json', 'r') as f:
                    results = json.load(f)
                
                self.insights['ml'] = {
                    'source': 'optimized_models',
                    'metrics': {
                        'regression': results.get('regression', {}),
                        'classification': results.get('classification', {})
                    },
                    'shap_features': results.get('shap_features', {}),
                }
            else:
                # Fallback to baseline models
                print("   📊 Loading baseline ML models...")
                from ml_models import NetflixMLModels
                
                ml = NetflixMLModels(df=self.df)
                ml_results = ml.run_all_models()
                
                self.insights['ml'] = {
                    'source': 'baseline_models',
                    'metrics': ml_results['metrics'],
                    'predictions': ml_results['predictions'],
                    'feature_importance': ml_results['feature_importance'],
                    'model_comparison': ml_results['model_comparison'],
                    'sample_hit_probability': ml_results['sample_hit_probability']
                }
        except Exception as e:
            print(f"   ⚠ ML models failed: {e}")
            self.insights['ml'] = {
                'error': str(e),
                'metrics': {},
                'predictions': {},
                'feature_importance': {}
            }
    
    def save_insights(self, output_path):
        """Save insights to JSON file"""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Use the class method to clean data
        clean_insights = self._clean_for_json(self.insights)
        
        with open(output_path, 'w') as f:
            json.dump(clean_insights, f, indent=2, default=str)
        
        print(f"💾 Insights saved to {output_path}")
        return output_path
