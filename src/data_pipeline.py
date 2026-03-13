"""
Netflix Data Analysis Platform - Data Pipeline
Simplified pipeline using unified Dataset.csv
"""

import pandas as pd
import numpy as np
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

class NetflixDataPipeline:
    """Main data pipeline for Netflix analytics project using Dataset.csv"""
    
    def __init__(self, base_dir=None):
        self.base_dir = Path(base_dir) if base_dir else Path(__file__).resolve().parent.parent
        self.dataset_path = self.base_dir / 'Dataset.csv'
        self.df = None
        
    def load_data(self):
        """Load the unified Dataset.csv"""
        print("📥 Loading Netflix dataset...")
        
        if not self.dataset_path.exists():
            raise FileNotFoundError(f"Dataset.csv not found at {self.dataset_path}")
        
        self.df = pd.read_csv(self.dataset_path)
        print(f"   ✓ Loaded {len(self.df):,} records with {len(self.df.columns)} columns")
        return self.df
    
    def get_dataframe(self):
        """Return the loaded dataframe"""
        if self.df is None:
            self.load_data()
        return self.df
    
    def run(self):
        """Run the full pipeline"""
        print("=" * 80)
        print("🚀 NETFLIX DATA PIPELINE - STARTING")
        print("=" * 80)
        
        self.load_data()
        
        # Basic data cleaning
        if self.df is not None:
            # Fill missing values for key columns
            self.df['director'] = self.df['director'].fillna('Unknown')
            self.df['cast'] = self.df['cast'].fillna('Unknown')
            self.df['country'] = self.df['country'].fillna('Unknown')
            self.df['primary_genre'] = self.df['primary_genre'].fillna('Unknown')
            self.df['genres_combined'] = self.df['genres_combined'].fillna('Unknown')
            self.df['description'] = self.df['description'].fillna('')
            
            # Parse date_added
            self.df['date_added'] = pd.to_datetime(self.df['date_added'], errors='coerce')
            self.df['year_added'] = self.df['date_added'].dt.year
            self.df['month_added'] = self.df['date_added'].dt.month
            
            print(f"   ✓ Data cleaned successfully")
        
        print("=" * 80)
        print("✅ PIPELINE COMPLETE")
        print("=" * 80)
        
        return self.df
        
        # Categorize ratings
        df['rating_category'] = pd.cut(
            df['vote_average'],
            bins=[0, 5, 7, 8.5, 10],
            labels=['Poor', 'Average', 'Good', 'Excellent']
        )
        
        # Extract primary genre
        df['primary_genre'] = df['genres'].str.split(',').str[0].str.strip()
        
        # Count number of genres
        df['genre_count'] = df['genres'].str.split(',').str.len()
        
        # Extract primary country
        df['primary_country'] = df['country'].str.split(',').str[0].str.strip()
        
        # Count cast members
        df['cast_count'] = df['cast'].apply(lambda x: len(str(x).split(',')) if x != 'Unknown' else 0)
        
        print(f"   ✓ Cleaned {len(df):,} movie records")
        print(f"   ✓ Added {len(df.columns) - len(self.movies_df.columns)} derived features")
        
        return df
    
    def clean_tv_shows_dataset(self):
        """Clean and process TV shows dataset"""
        print("\n🧹 Cleaning TV shows dataset...")
        
        df = self.tv_shows_df.copy()
        
        # Handle missing values
        df['director'] = df['director'].fillna('Unknown')
        df['cast'] = df['cast'].fillna('Unknown')
        df['country'] = df['country'].fillna('Unknown')
        df['genres'] = df['genres'].fillna('Unknown')
        df['description'] = df['description'].fillna('')
        
        # Convert date_added to datetime
        df['date_added'] = pd.to_datetime(df['date_added'], errors='coerce')
        df['year_added'] = df['date_added'].dt.year
        df['month_added'] = df['date_added'].dt.month
        
        # Create decade column
        df['decade'] = (df['release_year'] // 10) * 10
        
        # Extract number of seasons
        df['num_seasons'] = df['duration'].str.extract('(\d+)').astype(float)
        
        # Categorize by seasons
        df['show_length'] = pd.cut(
            df['num_seasons'],
            bins=[0, 1, 3, 6, float('inf')],
            labels=['Limited Series', 'Short Series', 'Medium Series', 'Long Series']
        )
        
        # Categorize ratings
        df['rating_category'] = pd.cut(
            df['vote_average'],
            bins=[0, 5, 7, 8.5, 10],
            labels=['Poor', 'Average', 'Good', 'Excellent']
        )
        
        # Extract primary genre
        df['primary_genre'] = df['genres'].str.split(',').str[0].str.strip()
        
        # Count number of genres
        df['genre_count'] = df['genres'].str.split(',').str.len()
        
        # Extract primary country
        df['primary_country'] = df['country'].str.split(',').str[0].str.strip()
        
        # Count cast members
        df['cast_count'] = df['cast'].apply(lambda x: len(str(x).split(',')) if x != 'Unknown' else 0)
        
        # Add placeholder columns to match movie structure
        df['budget'] = 0
        df['revenue'] = 0
        df['roi'] = 0
        df['budget_category'] = 'N/A'
        
        print(f"   ✓ Cleaned {len(df):,} TV show records")
        print(f"   ✓ Added {len(df.columns) - len(self.tv_shows_df.columns)} derived features")
        
        return df
    
    def merge_content_catalog(self, movies_clean, tv_shows_clean):
        """Merge movies and TV shows into unified catalog"""
        print("\n🔗 Merging content catalogs...")
        
        # Ensure both have same columns
        common_cols = set(movies_clean.columns) & set(tv_shows_clean.columns)
        
        # Add missing columns to TV shows
        for col in movies_clean.columns:
            if col not in tv_shows_clean.columns:
                tv_shows_clean[col] = None
        
        # Concatenate
        unified_catalog = pd.concat([movies_clean, tv_shows_clean], ignore_index=True)
        
        # Add content age
        current_year = 2025
        unified_catalog['content_age'] = current_year - unified_catalog['release_year']
        
        print(f"   ✓ Unified catalog: {len(unified_catalog):,} total content pieces")
        print(f"      - Movies: {len(movies_clean):,}")
        print(f"      - TV Shows: {len(tv_shows_clean):,}")
        
        return unified_catalog
    
    def process_ratings(self):
        """Process and aggregate ratings data"""
        if self.ratings_df is None:
            print("\n⚠️  No ratings data available")
            return None
        
        print("\n📊 Processing ratings data...")
        
        # Aggregate ratings by movie
        ratings_agg = self.ratings_df.groupby('Movie_ID').agg({
            'Rating': ['mean', 'count', 'std'],
            'User_ID': 'nunique'
        }).reset_index()
        
        ratings_agg.columns = ['Movie_ID', 'avg_user_rating', 'rating_count', 
                               'rating_std', 'unique_users']
        
        # Merge with Netflix movie catalog
        ratings_with_titles = ratings_agg.merge(
            self.netflix_movies_df,
            on='Movie_ID',
            how='left'
        )
        
        print(f"   ✓ Processed ratings for {len(ratings_agg):,} movies")
        print(f"   ✓ Average rating: {ratings_agg['avg_user_rating'].mean():.2f}")
        
        return ratings_with_titles
    
    def create_analytics_features(self, df):
        """Create advanced analytics features"""
        print("\n🎯 Creating analytics features...")
        
        # Popularity score (normalized)
        df['popularity_score'] = (df['popularity'] - df['popularity'].min()) / \
                                (df['popularity'].max() - df['popularity'].min())
        
        # Success score (weighted combination of ratings and popularity)
        df['success_score'] = (
            0.4 * df['vote_average'] / 10 +
            0.3 * df['popularity_score'] +
            0.3 * (df['vote_count'] / df['vote_count'].max())
        )
        
        # Is recent (last 5 years)
        df['is_recent'] = (df['release_year'] >= 2020).astype(int)
        
        # Is highly rated
        df['is_highly_rated'] = (df['vote_average'] >= 7.5).astype(int)
        
        # Is popular
        df['is_popular'] = (df['popularity'] >= df['popularity'].quantile(0.75)).astype(int)
        
        print(f"   ✓ Created advanced analytics features")
        
        return df
    
    def save_processed_data(self, unified_catalog, ratings_processed):
        """Save all processed datasets"""
        print("\n💾 Saving processed data...")
        
        # Save unified catalog
        output_file = self.merged_dir / 'netflix_unified_catalog.csv'
        unified_catalog.to_csv(output_file, index=False)
        print(f"   ✓ Saved unified catalog: {output_file}")
        
        # Save ratings if available
        if ratings_processed is not None:
            ratings_file = self.processed_dir / 'ratings_aggregated.csv'
            ratings_processed.to_csv(ratings_file, index=False)
            print(f"   ✓ Saved processed ratings: {ratings_file}")
        
        # Save metadata
        metadata = {
            'total_content': len(unified_catalog),
            'movies': len(unified_catalog[unified_catalog['type'] == 'Movie']),
            'tv_shows': len(unified_catalog[unified_catalog['type'] == 'TV Show']),
            'date_range': f"{unified_catalog['release_year'].min()} - {unified_catalog['release_year'].max()}",
            'unique_genres': unified_catalog['primary_genre'].nunique(),
            'unique_countries': unified_catalog['primary_country'].nunique()
        }
        
        metadata_file = self.merged_dir / 'dataset_metadata.txt'
        with open(metadata_file, 'w') as f:
            for key, value in metadata.items():
                f.write(f"{key}: {value}\n")
        
        print(f"   ✓ Saved metadata: {metadata_file}")
        
        return unified_catalog
    
    def run_pipeline(self):
        """Execute complete data pipeline"""
        print("=" * 80)
        print("🚀 NETFLIX DATA PIPELINE - STARTING")
        print("=" * 80)
        
        # Load data
        self.load_raw_data()
        
        # Clean datasets
        movies_clean = self.clean_movies_dataset()
        tv_shows_clean = self.clean_tv_shows_dataset()
        
        # Merge catalogs
        unified_catalog = self.merge_content_catalog(movies_clean, tv_shows_clean)
        
        # Process ratings
        ratings_processed = self.process_ratings()
        
        # Create analytics features
        unified_catalog = self.create_analytics_features(unified_catalog)
        
        # Save everything
        final_dataset = self.save_processed_data(unified_catalog, ratings_processed)
        
        print("\n" + "=" * 80)
        print("✅ PIPELINE COMPLETE!")
        print("=" * 80)
        print(f"\nFinal Dataset Summary:")
        print(f"  Total Records: {len(final_dataset):,}")
        print(f"  Total Columns: {len(final_dataset.columns)}")
        print(f"  Memory Usage: {final_dataset.memory_usage(deep=True).sum() / 1024**2:.2f} MB")
        
        return final_dataset


if __name__ == "__main__":
    # Run the pipeline
    pipeline = NetflixDataPipeline()
    dataset = pipeline.run_pipeline()
    
    # Display sample
    print("\n📋 Sample of final dataset:")
    print(dataset[['title', 'type', 'release_year', 'primary_genre', 
                   'vote_average', 'success_score']].head(10))
