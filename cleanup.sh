#!/bin/bash

echo "🧹 Cleaning up unnecessary files for GitHub..."

# Remove Python cache and build artifacts
rm -rf __pycache__ .pyc .eggs/ build/ dist/ *.egg-info/
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type f -name ".DS_Store" -delete 2>/dev/null || true

# Remove virtual environments (they'll be recreated with pip)
rm -rf .venv venv 2>/dev/null || true

# Remove CatBoost training artifacts
rm -rf catboost_info/
echo "✓ Deleted: catboost_info/"

# Remove intermediate data processing folders (keep Output which has refined dataset)
rm -rf Master_dataset_Netflix/Step1_Organization/
rm -rf Master_dataset_Netflix/Step2_Loading/
rm -rf Master_dataset_Netflix/Step3_Inspection/
rm -rf Master_dataset_Netflix/Step4_MergeKeys/
rm -rf Master_dataset_Netflix/Step5_Cleaned/
rm -rf Master_dataset_Netflix/Step8_Merged/
echo "✓ Deleted: Master_dataset_Netflix/Step* directories"

# Remove one-off scripts (keep them in git history, but not needed in production)
rm -rf Master_dataset_Netflix/Scripts/
echo "✓ Deleted: Master_dataset_Netflix/Scripts/"

# Remove empty data folder
rm -rf data/
echo "✓ Deleted: empty data/ directory"

# Remove test file if it's just a simple test
# rm -f test_ml.py  # Keep this for now

# Remove DS_Store files
rm -f Master_dataset_Netflix/.DS_Store
echo "✓ Deleted: .DS_Store files"

echo "✅ Cleanup complete!"
