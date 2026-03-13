"""
Netflix Analytics Engine
Advanced analytics and insights generation for Netflix content data
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json

class NetflixAnalytics:
    """Advanced analytics for Netflix content"""
    
    def __init__(self, data_path='data/merged/netflix_unified_catalog.csv'):
        self.df = pd.read_csv(data_path)
        self.insights = {}
        
    def generate_summary_statistics(self):
        """Generate comprehensive summary statistics"""
        stats = {
            'total_content': len(self.df),
            'movies': len(self.df[self.df['type'] == 'Movie']),
            'tv_shows': len(self.df[self.df['type'] == 'TV Show']),
            'avg_rating': round(self.df['vote_average'].mean(), 2),
            'total_budget': self.df[self.df['type'] == 'Movie']['budget'].sum(),
            'total_revenue': self.df[self.df['type'] == 'Movie']['revenue'].sum(),
            'unique_genres': self.df['primary_genre'].nunique(),
            'unique_countries': self.df['primary_country'].nunique(),
            'date_range': {
                'earliest': int(self.df['release_year'].min()),
                'latest': int(self.df['release_year'].max())
            }
        }
        
        self.insights['summary'] = stats
        return stats
    
    def analyze_content_trends(self):
        """Analyze content release trends over time"""
        trends = {}
        
        # Content by year
        yearly = self.df.groupby(['release_year', 'type']).size().unstack(fill_value=0)
        trends['yearly_releases'] = yearly.to_dict()
        
        # Content by decade
        decade_dist = self.df.groupby(['decade', 'type']).size().unstack(fill_value=0)
        trends['decade_distribution'] = decade_dist.to_dict()
        
        # Recent content (last 5 years)
        recent_content = self.df[self.df['release_year'] >= 2020]
        trends['recent_content_count'] = len(recent_content)
        trends['recent_avg_rating'] = round(recent_content['vote_average'].mean(), 2)
        
        self.insights['trends'] = trends
        return trends
    
    def analyze_genres(self):
        """Comprehensive genre analysis"""
        genre_stats = {}
        
        # Top genres by count
        top_genres = self.df['primary_genre'].value_counts().head(15)
        genre_stats['top_genres'] = top_genres.to_dict()
        
        # Genre performance
        genre_perf = self.df.groupby('primary_genre').agg({
            'vote_average': 'mean',
            'vote_count': 'sum',
            'popularity': 'mean',
            'success_score': 'mean'
        }).sort_values('success_score', ascending=False).head(10)
        
        genre_stats['top_performing_genres'] = genre_perf.to_dict()
        
        # Genre by content type
        genre_by_type = pd.crosstab(self.df['primary_genre'], self.df['type'])
        genre_stats['genre_by_type'] = genre_by_type.head(10).to_dict()
        
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
            'vote_average': 'mean',
            'title': 'count',
            'success_score': 'mean'
        }).rename(columns={'title': 'content_count'})
        
        country_quality = country_quality[country_quality['content_count'] >= 10]
        country_quality = country_quality.sort_values('vote_average', ascending=False).head(15)
        country_stats['highest_rated_countries'] = country_quality.to_dict()
        
        self.insights['countries'] = country_stats
        return country_stats
    
    def analyze_ratings_distribution(self):
        """Analyze rating patterns"""
        rating_stats = {}
        
        # Rating distribution
        rating_dist = self.df['rating_category'].value_counts()
        rating_stats['distribution'] = rating_dist.to_dict()
        
        # Ratings by type
        ratings_by_type = self.df.groupby('type')['vote_average'].agg(['mean', 'median', 'std'])
        rating_stats['by_content_type'] = ratings_by_type.to_dict()
        
        # Highly rated content
        highly_rated = self.df[self.df['vote_average'] >= 8.0][
            ['title', 'type', 'release_year', 'vote_average', 'primary_genre']
        ].sort_values('vote_average', ascending=False).head(20)
        
        rating_stats['top_rated_content'] = highly_rated.to_dict('records')
        
        # Rating trends over time
        rating_trends = self.df.groupby('decade')['vote_average'].mean()
        rating_stats['rating_by_decade'] = rating_trends.to_dict()
        
        self.insights['ratings'] = rating_stats
        return rating_stats
    
    def analyze_financial_performance(self):
        """Analyze financial metrics (movies only)"""
        movies = self.df[self.df['type'] == 'Movie'].copy()
        financial_stats = {}
        
        # Overall metrics
        financial_stats['total_budget'] = int(movies['budget'].sum())
        financial_stats['total_revenue'] = int(movies['revenue'].sum())
        financial_stats['avg_roi'] = round(movies['roi'].mean(), 2)
        
        # Top performers by revenue
        top_revenue = movies.nlargest(20, 'revenue')[
            ['title', 'release_year', 'budget', 'revenue', 'roi']
        ]
        financial_stats['top_revenue'] = top_revenue.to_dict('records')
        
        # Best ROI
        movies_with_budget = movies[movies['budget'] > 0]
        best_roi = movies_with_budget.nlargest(20, 'roi')[
            ['title', 'release_year', 'budget', 'revenue', 'roi']
        ]
        financial_stats['best_roi'] = best_roi.to_dict('records')
        
        # Budget categories performance
        budget_perf = movies.groupby('budget_category').agg({
            'revenue': 'mean',
            'roi': 'mean',
            'vote_average': 'mean'
        }).round(2)
        financial_stats['performance_by_budget'] = budget_perf.to_dict()
        
        self.insights['financial'] = financial_stats
        return financial_stats
    
    def analyze_cast_and_crew(self):
        """Analyze cast and director patterns"""
        crew_stats = {}
        
        # Content with known directors
        known_directors = self.df[self.df['director'] != 'Unknown']
        
        # Top directors by content count
        director_counts = known_directors['director'].value_counts().head(20)
        crew_stats['most_prolific_directors'] = director_counts.to_dict()
        
        # Average cast size
        crew_stats['avg_cast_size'] = round(self.df['cast_count'].mean(), 1)
        
        # Content with large casts
        large_casts = self.df.nlargest(10, 'cast_count')[
            ['title', 'type', 'cast_count', 'release_year']
        ]
        crew_stats['largest_casts'] = large_casts.to_dict('records')
        
        self.insights['cast_crew'] = crew_stats
        return crew_stats
    
    def analyze_content_characteristics(self):
        """Analyze content characteristics"""
        char_stats = {}
        
        # Genre diversity
        char_stats['avg_genres_per_content'] = round(self.df['genre_count'].mean(), 2)
        
        # Multi-genre content
        multi_genre = self.df[self.df['genre_count'] > 1]
        char_stats['multi_genre_percentage'] = round(len(multi_genre) / len(self.df) * 100, 2)
        
        # Content age distribution
        age_dist = pd.cut(self.df['content_age'], 
                         bins=[0, 5, 10, 20, 50, 100],
                         labels=['0-5 years', '5-10 years', '10-20 years', '20-50 years', '50+ years'])
        char_stats['age_distribution'] = age_dist.value_counts().to_dict()
        
        # Popularity distribution
        char_stats['high_popularity_percentage'] = round(
            len(self.df[self.df['is_popular'] == 1]) / len(self.df) * 100, 2
        )
        
        self.insights['characteristics'] = char_stats
        return char_stats
    
    def get_recommendations(self, criteria='success_score', top_n=50):
        """Get top content recommendations based on criteria"""
        recommendations = self.df.nlargest(top_n, criteria)[
            ['title', 'type', 'release_year', 'primary_genre', 
             'vote_average', 'popularity', 'success_score']
        ]
        return recommendations
    
    def generate_full_report(self):
        """Generate complete analytics report"""
        print("🔍 Generating comprehensive Netflix analytics report...")
        print("=" * 80)
        
        # Run all analyses
        summary = self.generate_summary_statistics()
        trends = self.analyze_content_trends()
        genres = self.analyze_genres()
        countries = self.analyze_countries()
        ratings = self.analyze_ratings_distribution()
        financial = self.analyze_financial_performance()
        crew = self.analyze_cast_and_crew()
        characteristics = self.analyze_content_characteristics()
        
        print("\n✅ Analysis Complete!")
        print("\nKey Insights:")
        print(f"  📺 Total Content: {summary['total_content']:,}")
        print(f"  🎬 Movies: {summary['movies']:,}")
        print(f"  📺 TV Shows: {summary['tv_shows']:,}")
        print(f"  ⭐ Average Rating: {summary['avg_rating']}")
        print(f"  🌍 Countries Represented: {summary['unique_countries']}")
        print(f"  🎭 Unique Genres: {summary['unique_genres']}")
        
        return self.insights
    
    def save_insights(self, output_path='data/processed/analytics_insights.json'):
        """Save insights to JSON file"""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(self.insights, f, indent=2, default=str)
        
        print(f"\n💾 Insights saved to: {output_path}")


if __name__ == "__main__":
    # Run analytics
    analytics = NetflixAnalytics()
    insights = analytics.generate_full_report()
    analytics.save_insights()
    
    # Show top recommendations
    print("\n🎯 Top 10 Recommended Content (by Success Score):")
    recommendations = analytics.get_recommendations(top_n=10)
    print(recommendations.to_string(index=False))
