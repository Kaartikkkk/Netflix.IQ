import sys
sys.path.insert(0, './src')
from ml_models import NetflixMLModels
import pandas as pd

# Try to train ML models
try:
    print("Loading dataset...")
    df = pd.read_csv('Dataset.csv')
    print(f"Dataset shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    
    print("\nInitializing ML models...")
    ml = NetflixMLModels(df=df)
    print("✓ ML models initialized")
    
    print("\nRunning all models...")
    results = ml.run_all_models()
    print("✓ ML models trained successfully!")
    
    if 'error' in results:
        print(f"ERROR: {results['error']}")
    else:
        print(f"Results keys: {list(results.keys())}")
        if 'feature_importance' in results:
            fi = results['feature_importance']
            print(f"Feature importance keys: {list(fi.keys())}")
            if 'rating' in fi:
                print(f"Rating feature importance (first 3): {dict(list(fi['rating'].items())[:3])}")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
