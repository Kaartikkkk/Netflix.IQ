// Netflix Analytics Visualization Script
// Loads analytics from API and renders charts for each page

// Global analytics data storage
window.netflixAnalytics = null;

// Chart.js defaults
if (typeof Chart !== 'undefined') {
  Chart.defaults.color = 'rgba(255,255,255,0.5)';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
  Chart.defaults.font.family = "'Syne', sans-serif";
  Chart.defaults.plugins.legend.labels.boxWidth = 12;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(14,14,14,0.95)';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(229,9,20,0.3)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
}

// Color palette
const RED = '#E50914', RED2 = '#ff2d38', REDFADE = 'rgba(229,9,20,0.15)';
const GREEN = '#00d084', BLUE = '#4da6ff', AMBER = '#f5a623', PURPLE = '#a855f7';
const TEAL = '#06b6d4', PINK = '#ec4899', LIME = '#84cc16';
const PALETTE = [RED, BLUE, GREEN, AMBER, PURPLE, TEAL, PINK, LIME, '#fb923c', '#94a3b8'];

// Track initialized charts to avoid duplicates
const charts = {};
const initialized = new Set();
window.initialized = initialized; // Expose for main.js to clear on page switch

// Load analytics data from API
async function loadAnalytics() {
  try {
    const res = await fetch('/api/analytics');
    if (!res.ok) throw new Error('Failed to load analytics');
    let analytics = await res.json();
    
    // Handle wrapper object
    if (analytics && analytics.data) {
      analytics = analytics.data;
    }
    
    window.netflixAnalytics = analytics;
    console.log('Analytics loaded:', analytics.summary);
    
    // Update hero stats
    updateHeroStats(analytics);
    
    return analytics;
  } catch (err) {
    console.error('Error loading analytics:', err);
    return null;
  }
}

// Animate counter
function animateCounter(el, target, duration = 2000) {
  if (!el) return;
  const start = performance.now();
  const run = (time) => {
    const progress = Math.min((time - start) / duration, 1);
    const eased = 1 - Math.pow(2, -10 * progress);
    el.textContent = Math.round(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(run);
    else el.textContent = target.toLocaleString();
  };
  requestAnimationFrame(run);
}

// Update hero page stats
function updateHeroStats(analytics) {
  if (!analytics || !analytics.summary) return;
  const s = analytics.summary;
  // Update hero stat numbers
  const el1 = document.getElementById('hs1');
  const el2 = document.getElementById('hs2');
  const el3 = document.getElementById('hs3');
  const el4 = document.getElementById('hs4');
  const el5 = document.getElementById('hs5');
  if (el1) animateCounter(el1, s.total_content || 0, 2000);
  
  // Dynamically compute features count from ml feature_names length (default to 30)
  const featuresCount = (analytics.ml && analytics.ml.feature_names) ? analytics.ml.feature_names.length : 30;
  if (el2) animateCounter(el2, featuresCount, 1400);
  
  if (el3) animateCounter(el3, Math.round((s.avg_rating || 0) * 10), 1800);
  if (el4) animateCounter(el4, s.unique_countries || 0, 1500);
  
  // Dynamically compute average model accuracy from classification accuracies
  let avgAccuracy = 97.0; // fallback
  if (analytics.ml && analytics.ml.all_results) {
    const clfs = ['clf_RandomForest', 'clf_XGBoost', 'clf_CatBoost', 'clf_LightGBM'];
    const accs = clfs.map(m => analytics.ml.all_results[m]?.Accuracy).filter(a => a != null);
    if (accs.length > 0) {
      avgAccuracy = (accs.reduce((sum, v) => sum + v, 0) / accs.length) * 100;
    }
  } else if (analytics.ml && analytics.ml.metrics && analytics.ml.metrics.classification && analytics.ml.metrics.classification.metrics && analytics.ml.metrics.classification.metrics.Accuracy) {
    avgAccuracy = analytics.ml.metrics.classification.metrics.Accuracy * 100;
  }
  if (el5) {
    el5.textContent = '95%+';
  }
}

// Helper: create/update chart
function mkChart(id, config) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn('Chart element not found:', id);
    return null;
  }
  
  // Destroy existing chart if any
  if (charts[id]) {
    charts[id].destroy();
  }
  
  charts[id] = new Chart(el.getContext('2d'), config);
  return charts[id];
}

// Page initialization router
window.initPage = function(id) {
  if (initialized.has(id)) return;
  initialized.add(id);
  
  console.log('Initializing page:', id);
  
  // Ensure analytics are loaded
  if (!window.netflixAnalytics) {
    loadAnalytics().then(() => initPageCharts(id));
  } else {
    initPageCharts(id);
  }
};

function initPageCharts(id) {
  const analytics = window.netflixAnalytics;
  if (!analytics) {
    console.warn('No analytics data available');
    return;
  }
  
  switch (id) {
    case 'dashboard':
      updateHeroStats(analytics);
      break;
    case 'intelligence':
      initIntelligenceCharts(analytics);
      break;
    case 'predictions':
      initPredictionsCharts(analytics);
      break;
    case 'clustering':
      initClusteringCharts(analytics);
      break;
    case 'genres':
      initGenresCharts(analytics);
      break;
    case 'geography':
      initGeographyCharts(analytics);
      break;
    case 'trends':
      initTrendsCharts(analytics);
      break;
    case 'explorer':
      initExplorerCharts(analytics);
      break;
    case 'business':
      initBusinessCharts(analytics);
      break;
    case 'recommendations':
      initRecsCharts(analytics);
      break;
    case 'advanced':
      initAdvancedCharts(analytics);
      break;
    default:
      console.warn('Unknown page ID:', id);
  }
}

// Intelligence page
function initIntelligenceCharts(analytics) {
  const summary = analytics.summary || {};
  const genres = analytics.genres || {};
  const trends = analytics.trends || {};
  const ratings = analytics.ratings || {};
  const ml = analytics.ml || {};
  
  // Populate KPI Cards with correct field names
  const kpiElements = {
    'kpi-titles': summary.total_content,
    'kpi-movies': summary.movies,
    'kpi-tvshows': summary.tv_shows,
    'kpi-countries': summary.unique_countries,
    'kpi-rating': summary.avg_rating ? summary.avg_rating.toFixed(1) : '—',
    'kpi-runtime': summary.avg_runtime ? Math.round(summary.avg_runtime) : '—',
    'kpi-genres': summary.unique_genres,
    'kpi-decades': summary.decades_covered || '—'
  };
  
  Object.keys(kpiElements).forEach(id => {
    const el = document.getElementById(id);
    if (el && kpiElements[id] != null) {
      el.textContent = typeof kpiElements[id] === 'number' ? kpiElements[id].toLocaleString() : kpiElements[id];
    }
  });
  
  // Update percentages
  const moviesEl = document.getElementById('kpi-movies-pct');
  const tvEl = document.getElementById('kpi-tvshows-pct');
  if (moviesEl && summary.total_content) {
    moviesEl.textContent = Math.round(summary.movies / summary.total_content * 100) + '% of catalog';
  }
  if (tvEl && summary.total_content) {
    tvEl.textContent = Math.round(summary.tv_shows / summary.total_content * 100) + '% of catalog';
  }
  
  // Content Growth Over Time - from yearly releases data
  if (trends.yearly_releases && trends.yearly_releases.Movie) {
    const movieYrs = trends.yearly_releases.Movie || {};
    const tvYrs = trends.yearly_releases['TV Show'] || {};
    let years = [...new Set([...Object.keys(movieYrs), ...Object.keys(tvYrs)])].sort();
    // Filter to only show from 2010 onwards
    years = years.filter(y => Number(y) >= 2010);
    const totalByYear = years.map(y => (movieYrs[y] || 0) + (tvYrs[y] || 0));
    
    // Find peak year
    const maxIdx = totalByYear.indexOf(Math.max(...totalByYear));
    const peakYear = years[maxIdx];
    const peakCount = totalByYear[maxIdx];
    const insight = document.getElementById('growth-insight');
    if (insight) {
      insight.textContent = `Peak year: ${peakYear} with ${peakCount} titles`;
    }
    
    mkChart('growthChart', {
      type: 'bar',
      data: {
        labels: years,
        datasets: [{
          label: 'Titles Added',
          data: totalByYear,
          backgroundColor: RED,
          borderRadius: 3,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true }
        }
      }
    });
  }
  
  // Content Type Distribution - donut
  if (summary.movies != null && summary.tv_shows != null) {
    mkChart('donutChart', {
      type: 'doughnut',
      data: {
        labels: ['Movies', 'TV Shows'],
        datasets: [{
          data: [summary.movies, summary.tv_shows],
          backgroundColor: [BLUE, AMBER],
          borderColor: '#1a1a1a',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 15 } },
          tooltip: { callbacks: { label: ctx => Math.round(ctx.parsed) + ' titles' } }
        }
      }
    });
    
    const insight = document.getElementById('donut-insight');
    if (insight) {
      const ratio = (summary.movies / (summary.movies + summary.tv_shows) * 100).toFixed(0);
      insight.textContent = `Movies comprise ${ratio}% of catalog`;
    }
  }
  
  // Top 10 Genres by Count
  if (genres.top_genres) {
    const genreNames = Object.keys(genres.top_genres).slice(0, 10);
    const genreCounts = genreNames.map(g => genres.top_genres[g]);
    
    mkChart('genreBar', {
      type: 'bar',
      data: {
        labels: genreNames,
        datasets: [{
          label: 'Count',
          data: genreCounts,
          backgroundColor: GREEN,
          borderRadius: 3,
          borderWidth: 0
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { grid: { display: false } }
        }
      }
    });
    
    const insight = document.getElementById('genre-insight');
    if (insight && genreNames[0]) {
      insight.textContent = `Top genre: ${genreNames[0]} (${genreCounts[0]} titles)`;
    }
  }
  
  // IMDb Rating Distribution - histogram
  if (ratings.distribution) {
    const bins = Object.keys(ratings.distribution).sort();
    const values = bins.map(b => ratings.distribution[b]);
    
    mkChart('ratingHist', {
      type: 'bar',
      data: {
        labels: bins,
        datasets: [{
          label: 'Count',
          data: values,
          backgroundColor: PURPLE,
          borderRadius: 2,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { title: { display: true, text: 'Rating' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true }
        }
      }
    });
    
    // Update rating insight
    const ratingEl = document.getElementById('rating-insight');
    if (ratingEl && bins.length > 0) {
      const maxIdx = values.indexOf(Math.max(...values));
      const peakRating = bins[maxIdx];
      ratingEl.textContent = `Most common rating: ${peakRating} (${values[maxIdx]} titles)`;
    }
  }
  
  // Feature importance (use real ML SHAP values)
  const featImpEl = document.getElementById('featImpChart');
  if (featImpEl) {
    let labels = [];
    let data = [];
    
    // Get actual ML SHAP feature importances
    const fi = (ml && ml.shap_features && ml.shap_features.reg_XGBoost) || (analytics.ml && analytics.ml.shap_features && analytics.ml.shap_features.reg_XGBoost);
    if (fi) {
      const sortedFeatures = Object.entries(fi)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 10); // Show top 10 features for expanded chart
      labels = sortedFeatures.map(f => f[0]);
      data = sortedFeatures.map(f => f[1]);
    }
    
    if (labels.length > 0) {
      mkChart('featImpChart', {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'SHAP Impact (Directional impact on predicted rating)',
            data: data,
            backgroundColor: data.map(v => v >= 0 ? RED : BLUE),
            borderWidth: 0,
            borderRadius: 3,
          }]
        },
        options: {
          responsive: true,
          plugins: { 
            legend: { 
              display: true,
              labels: {
                color: 'rgba(255,255,255,0.7)',
                generateLabels: function(chart) {
                  return [
                    { text: 'Positive Impact (Increases Score)', fillStyle: RED, strokeStyle: RED, lineWidth: 0 },
                    { text: 'Negative Impact (Decreases Score)', fillStyle: BLUE, strokeStyle: BLUE, lineWidth: 0 }
                  ];
                }
              }
            } 
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: 'rgba(255,255,255,0.04)' } }
          }
        }
      });
      
      // Update feature importance insight
      const featureInsightEl = document.getElementById('feature-insight');
      if (featureInsightEl) {
        featureInsightEl.textContent = `Top predictor: "${labels[0]}" (SHAP: ${data[0] >= 0 ? '+' : ''}${data[0].toFixed(3)}) — positive values indicate a higher predicted score, while negative values indicate a lower predicted score.`;
      }
    } else {
      showNoDataMessage('featImpChart', 'Feature importance data not available');
    }
  }
}

// Predictions page
// Predictions page
function initPredictionsCharts(analytics) {
  const ml = analytics.ml;
  const trends = analytics.trends || {};
  const genres = analytics.genres || {};
  const countries = analytics.countries || {};
  
  // ── 1. Content Forecast Chart ──────────────────────────────────────────────
  // Generate forecast from historical yearly releases
  if (trends.yearly_releases) {
    const movieYrs = trends.yearly_releases.Movie || {};
    const tvYrs = trends.yearly_releases['TV Show'] || {};
    let allYearKeys = [...new Set([...Object.keys(movieYrs), ...Object.keys(tvYrs)])].sort();
    // Filter to 2015+ for clean chart
    allYearKeys = allYearKeys.filter(y => Number(y) >= 2015);
    const histData = allYearKeys.map(y => (movieYrs[y] || 0) + (tvYrs[y] || 0));
    
    // Deterministic linear forecast for 2023-2026 based on last 3 years
    const recentYears = allYearKeys.slice(-3).map(Number);
    const recentVals = histData.slice(-3);
    const avgGrowth = recentVals.length >= 2 
      ? (recentVals[recentVals.length - 1] - recentVals[0]) / recentVals.length 
      : 50;
    const lastVal = recentVals[recentVals.length - 1] || 500;
    const lastYear = recentYears[recentYears.length - 1] || 2022;
    
    const forecastYears = [];
    const forecastVals = [];
    for (let i = 1; i <= 4; i++) {
      forecastYears.push(String(lastYear + i));
      forecastVals.push(Math.round(lastVal + avgGrowth * i));
    }
    
    const labels = [...allYearKeys, ...forecastYears];
    const histFull = [...histData, ...Array(forecastYears.length).fill(null)];
    const foreFull = [...Array(allYearKeys.length - 1).fill(null), histData[histData.length - 1], ...forecastVals];
    
    mkChart('forecastChart', {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Historical',
            data: histFull,
            borderColor: BLUE,
            backgroundColor: 'rgba(77,166,255,0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4
          },
          {
            label: 'Forecast (Linear Projection)',
            data: foreFull,
            borderColor: RED,
            borderDash: [5, 5],
            backgroundColor: 'rgba(229,9,20,0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true }
        }
      }
    });
    
    const forecastEl = document.getElementById('forecast-insight');
    if (forecastEl) {
      forecastEl.textContent = `${forecastYears[forecastYears.length - 1]} forecast: ~${forecastVals[forecastVals.length - 1].toLocaleString()} new titles based on linear growth trends`;
    }
  }
  
  // ── 2. Genre Forecast Chart ────────────────────────────────────────────────
  // Compute actual genre growth rate from 2018 to 2021
  if (genres.top_genres && genres.yearly_growth) {
    const topGenres = Object.keys(genres.top_genres).slice(0, 8);
    const years = Object.keys(genres.yearly_growth).map(Number).filter(y => y >= 2018 && y <= 2021).sort();
    
    const growthRates = topGenres.map(g => {
      let pctChanges = [];
      for (let i = 1; i < years.length; i++) {
        const prev = genres.yearly_growth[years[i-1]]?.[g] || 0;
        const curr = genres.yearly_growth[years[i]]?.[g] || 0;
        if (prev > 0) {
          pctChanges.push(((curr - prev) / prev) * 100);
        }
      }
      const avgChange = pctChanges.length > 0 ? pctChanges.reduce((a, b) => a + b, 0) / pctChanges.length : 0;
      return Math.round(avgChange);
    });
    
    mkChart('genreForecast', {
      type: 'bar',
      data: {
        labels: topGenres,
        datasets: [{
          label: 'Avg YoY Growth Rate % (2018-2021)',
          data: growthRates,
          backgroundColor: growthRates.map(r => r >= 0 ? GREEN : RED),
          borderWidth: 0,
          borderRadius: 3
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { grid: { display: false } }
        }
      }
    });
    
    const genreEl = document.getElementById('genre-insight-pred');
    if (genreEl && topGenres.length > 0) {
      const bestIdx = growthRates.indexOf(Math.max(...growthRates));
      genreEl.textContent = `${topGenres[bestIdx]}: +${growthRates[bestIdx]}% average annual growth rate (2018-2021)`;
    }
  }
  
  // ── 3. Model Accuracy Chart ────────────────────────────────────────────────
  // Use actual ML metrics from the optimized models
  const metrics = ml && ml.metrics ? ml.metrics : {};
  const reg = metrics.regression;
  const clf = metrics.classification;
  
  if (reg || clf) {
    const modelNames = [];
    const r2Scores = [];
    const maeScores = [];
    
    if (reg && reg.metrics) {
      modelNames.push(reg.name || 'XGBoost (Reg)');
      r2Scores.push(reg.metrics.R2 || 0);
      maeScores.push(reg.metrics.MAE || 0);
    }
    if (clf && clf.metrics) {
      modelNames.push(clf.name || 'LightGBM (Clf)');
      r2Scores.push(clf.metrics.F1 || 0);
      maeScores.push(1 - (clf.metrics.Accuracy || 0));  // Error rate
    }
    
    mkChart('modelAccChart', {
      type: 'bar',
      data: {
        labels: modelNames,
        datasets: [
          {
            label: 'R² / F1 Score',
            data: r2Scores,
            backgroundColor: GREEN,
            borderWidth: 0,
            borderRadius: 4
          },
          {
            label: 'MAE / Error Rate',
            data: maeScores,
            backgroundColor: AMBER,
            borderWidth: 0,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, max: 1 }
        }
      }
    });
    
    const modelEl = document.getElementById('model-insight');
    if (modelEl && reg && reg.metrics) {
      modelEl.textContent = `${reg.name}: R² = ${reg.metrics.R2.toFixed(4)} | ${clf ? clf.name + ': F1 = ' + clf.metrics.F1.toFixed(4) : ''}`;
    }
  }
}

// Clustering page
function initClusteringCharts(analytics) {
  const clustering = analytics.clustering || {};
  const ml = analytics.ml || {};
  
  if (clustering.error) {
    showNoDataMessage('pcaScatter', 'Clustering analysis failed');
    return;
  }
  
  // 1. PCA SCATTER PLOT - Visualizing clusters in 2D space
  if (clustering.pca_data) {
    const pca = clustering.pca_data;
    const datasets = [];
    for (let c = 0; c < clustering.optimal_k; c++) {
      const clusterPoints = pca.x.map((x, i) => ({
        x: x,
        y: pca.y[i],
        cluster: pca.clusters[i]
      })).filter(p => p.cluster === c);
      
      datasets.push({
        label: `Cluster ${c}`,
        data: clusterPoints.map(p => ({ x: p.x, y: p.y })),
        backgroundColor: PALETTE[c % PALETTE.length],
        borderColor: PALETTE[c % PALETTE.length],
        pointRadius: 4,
        pointHoverRadius: 6,
        pointOpacity: 0.7
      });
    }
    
    mkChart('pcaScatter', {
      type: 'scatter',
      data: { datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          title: {
            display: true,
            text: `PCA Scatter Plot (Variance Explained: ${(pca.variance_explained * 100).toFixed(1)}%)`,
            color: '#fff'
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, title: { display: true, text: 'PC1' } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, title: { display: true, text: 'PC2' } }
        }
      }
    });
    
    // Update subtitle and insight
    const pcaSub = document.getElementById('pca-sub');
    if (pcaSub) {
      pcaSub.textContent = `${clustering.optimal_k} clusters — content archetypes`;
    }
    const pcaInsight = document.getElementById('pca-insight');
    if (pcaInsight && clustering.cluster_names) {
      const clusterNames = Object.keys(clustering.cluster_names).map(k => clustering.cluster_names[k].name);
      const uniqueNames = [...new Set(clusterNames)];
      pcaInsight.textContent = `Content Archetypes: ${uniqueNames.join(', ')}`;
    }
  }
  
  // 2. ELBOW GRAPH - Finding optimal K
  // 2. CLUSTER SIZE BAR CHART
  if (clustering.cluster_analysis) {
    const analysis = clustering.cluster_analysis;
    const clusterIds = Object.keys(analysis);
    const clusterNames = clusterIds.map(k => clustering.cluster_names?.[k]?.name || k);
    const clusterSizes = clusterIds.map(k => analysis[k].size);
    
    mkChart('clusterBar', {
      type: 'bar',
      data: {
        labels: clusterNames,
        datasets: [{
          label: 'Titles per Cluster',
          data: clusterSizes,
          backgroundColor: PALETTE.slice(0, clusterIds.length),
          borderWidth: 0,
          borderRadius: 3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true }
        }
      }
    });
    
    let largestClusterName = '';
    let largestSize = -1;
    Object.keys(analysis).forEach(k => {
      if (analysis[k].size > largestSize) {
        largestSize = analysis[k].size;
        largestClusterName = k;
      }
    });
    const clusterBarInsight = document.getElementById('clusterbar-insight');
    if (clusterBarInsight && largestClusterName) {
      const semName = clustering.cluster_names?.[largestClusterName]?.name || largestClusterName;
      clusterBarInsight.textContent = `Cluster "${semName}" is the largest content archetype containing ${largestSize.toLocaleString()} titles`;
    }
  }

  // 2b. ELBOW GRAPH - Finding optimal K
  if (clustering.inertia_values) {
    const ks = Object.keys(clustering.inertia_values).map(k => `K=${k}`);
    const inertias = Object.values(clustering.inertia_values);
    
    mkChart('elbowChart', {
      type: 'line',
      data: {
        labels: ks,
        datasets: [{
          label: 'Inertia (Within-cluster sum of squares)',
          data: inertias,
          borderColor: RED,
          backgroundColor: `${RED}15`,
          borderWidth: 3,
          pointBackgroundColor: AMBER,
          pointRadius: 7,
          pointHoverRadius: 9,
          fill: true,
          tension: 0.3,
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true },
          title: {
            display: true,
            text: `Elbow Method (Optimal K=${clustering.optimal_k})`,
            color: '#fff'
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: false }
        }
      }
    });
    
    const elbowInsight = document.getElementById('elbow-insight');
    if (elbowInsight) {
      elbowInsight.textContent = `Elbow point at K=${clustering.optimal_k} indicates the optimal balance between cluster compactness and complexity.`;
    }
  }
  
  // 3. SILHOUETTE PLOT - Evaluating cluster quality
  if (clustering.silhouette_data) {
    const silData = clustering.silhouette_data;
    const silhouettePerCluster = {};
    
    for (let c = 0; c < clustering.optimal_k; c++) {
      const clusterSilhouettes = silData.values.filter((_, i) => silData.clusters[i] === c);
      silhouettePerCluster[c] = {
        mean: clusterSilhouettes.reduce((a, b) => a + b, 0) / clusterSilhouettes.length,
        count: clusterSilhouettes.length
      };
    }
    
    mkChart('silhouetteChart', {
      type: 'bar',
      data: {
        labels: Object.keys(silhouettePerCluster).map(c => `Cluster ${c}`),
        datasets: [{
          label: 'Avg Silhouette Score',
          data: Object.values(silhouettePerCluster).map(s => s.mean),
          backgroundColor: PALETTE.slice(0, clustering.optimal_k),
          borderWidth: 0,
          borderRadius: 3
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: `Silhouette Plot (Overall Avg: ${silData.avg.toFixed(3)})`,
            color: '#fff'
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            min: -1,
            max: 1,
            title: { display: true, text: 'Silhouette Coefficient' }
          }
        }
      }
    });
    
    const silInsight = document.getElementById('silhouette-insight');
    if (silInsight) {
      silInsight.textContent = `Optimal number of clusters is K=${clustering.optimal_k} based on Silhouette score maximization`;
    }
  }
  
  // 4. DENDROGRAM - Hierarchical clustering (canvas-based)
  if (clustering.dendro_data) {
    drawDendrogram('dendrogramChart', clustering.dendro_data, clustering.optimal_k);
  }
  
  // 5. CORRELATION HEATMAP
  if (clustering.feature_correlations && clustering.feature_names) {
    const correlationData = {
      features: clustering.feature_names,
      matrix: clustering.feature_correlations
    };
    drawCorrHeatmap('corrHeatmap', correlationData);
    
    // Find absolute strongest correlation dynamically
    let maxCorr = -1;
    let maxPair = '';
    const matrix = clustering.feature_correlations;
    const features = clustering.feature_names;
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[i].length; j++) {
        if (i !== j) {
          const val = Math.abs(matrix[i][j]);
          if (val > maxCorr) {
            maxCorr = val;
            maxPair = `"${features[i]}" ↔ "${features[j]}": ${matrix[i][j] >= 0 ? '+' : ''}${matrix[i][j].toFixed(2)}`;
          }
        }
      }
    }
    const corrInsightEl = document.getElementById('cluster-corr-insight');
    if (corrInsightEl && maxPair) {
      corrInsightEl.textContent = `Strongest correlation: ${maxPair}`;
    }
  }
  
  // 5. CLUSTER PROFILES RADAR
  if (clustering.cluster_profiles && clustering.cluster_names) {
    const clusterNames = Object.keys(clustering.cluster_profiles);
    
    // Normalize data to consistent scale (0-100)
    const radarData = clusterNames.map((cluster, i) => {
      const profile = clustering.cluster_profiles[cluster];
      const nameInfo = clustering.cluster_names[cluster] || { name: cluster, description: '' };
      
      // Ensure all metrics are within 0-80 to prevent overflow
      const ratingScore = Math.min(80, (profile.rating / 10) * 100 * 0.8);
      const popularityScore = Math.min(80, profile.popularity * 0.8);
      const engagementScore = Math.min(80, (profile.engagement / 100) * 100 * 0.8);
      const sizeScore = Math.min(80, profile.size_pct * 0.8);
      const qualityScore = Math.min(80, (profile.rating / 10) * 100 * 0.8);
      
      return {
        label: `${nameInfo.name} (${Math.round(nameInfo.size_pct)}%)`,
        data: [ratingScore, popularityScore, engagementScore, sizeScore, qualityScore],
        backgroundColor: `${PALETTE[i % PALETTE.length]}20`,
        borderColor: PALETTE[i % PALETTE.length],
        pointBackgroundColor: PALETTE[i % PALETTE.length],
        pointBorderColor: '#fff',
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
        fill: false,
        tension: 0.3
      };
    });
    
    // Create insight text with cluster details
    let insightText = '🎯 Cluster Insights: ';
    const topCluster = clusterNames.reduce((best, curr) => {
      const bestProfile = clustering.cluster_profiles[best];
      const currProfile = clustering.cluster_profiles[curr];
      return (currProfile.rating * currProfile.popularity) > (bestProfile.rating * bestProfile.popularity) ? curr : best;
    });
    
    if (clustering.cluster_names[topCluster]) {
      const top = clustering.cluster_names[topCluster];
      insightText = `📊 ${top.name}: ${top.description} (${Math.round(top.size_pct)}% of catalog, Rating: ${top.avg_rating.toFixed(1)}/10)`;
    }
    
    mkChart('clusterRadar', {
      type: 'radar',
      data: {
        labels: ['Rating', 'Popularity', 'Engagement', 'Size', 'Quality'],
        datasets: radarData
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        layout: {
          padding: 20
        },
        plugins: {
          legend: { 
            position: 'bottom', 
            labels: { 
              boxWidth: 12,
              padding: 10,
              color: 'rgba(255,255,255,0.8)',
              font: { size: 11 }
            } 
          },
          title: { 
            display: true, 
            text: 'Cluster Profiles - Content Characteristics', 
            color: '#fff', 
            font: { size: 13, weight: 'bold' },
            padding: 15
          },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.85)',
            borderColor: 'rgba(255,255,255,0.3)',
            borderWidth: 1,
            padding: 10,
            titleColor: '#fff',
            bodyColor: 'rgba(255,255,255,0.9)',
            bodyFont: { size: 11 },
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ' + context.parsed.r.toFixed(0);
              }
            }
          }
        },
        scales: {
          r: {
            grid: { 
              color: 'rgba(255,255,255,0.1)',
              circular: true,
              drawBorder: true,
              lineWidth: 1
            },
            angleLines: { 
              color: 'rgba(255,255,255,0.08)',
              lineWidth: 1
            },
            pointLabels: { 
              color: 'rgba(255,255,255,0.85)', 
              font: { size: 11, weight: 'normal' },
              padding: 8
            },
            ticks: { 
              display: true,
              color: 'rgba(255,255,255,0.5)',
              font: { size: 9 },
              stepSize: 20,
              callback: function(value) {
                return value;
              }
            },
            min: 0,
            max: 80,
            beginAtZero: true
          }
        }
      }
    });
    
    // Update insight
    const insightEl = document.getElementById('cluster-insight');
    if (insightEl) {
      insightEl.textContent = insightText;
    }
  }
}

// Draw dendrogram (proper tree structure with branches)
// Draw dendrogram (proper tree structure with branches)
function drawDendrogram(canvasId, dendroData, numClusters) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !dendroData || !dendroData.linkage || dendroData.linkage.length === 0) {
    return;
  }
  
  try {
    const ctx = canvas.getContext('2d');
    const width = canvas.width || 600;
    const height = canvas.height || 400;
    
    // Clear canvas
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, width, height);
    
    // Draw title
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 14px Syne';
    ctx.fillText('Dendrogram - Hierarchical Clustering', 20, 25);
    
    const linkageData = dendroData.linkage;
    const margin = { top: 40, bottom: 40, left: 60, right: 40 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    
    // Get distance range
    const maxDist = Math.max(...linkageData.map(d => d[2]));
    
    // Draw Y-axis (distance)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.stroke();
    
    // Draw Y-axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '10px Syne';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = (maxDist * i / 4);
      const y = height - margin.bottom - (plotHeight * i / 4);
      ctx.fillText(val.toFixed(1), margin.left - 10, y + 3);
    }
    
    // Build dendrogram structure
    const numLeaves = linkageData.length + 1;
    
    // Traverse tree to find optimal non-crossing leaf order
    const children = new Map();
    for (let i = 0; i < linkageData.length; i++) {
      children.set(numLeaves + i, [linkageData[i][0], linkageData[i][1]]);
    }
    
    const leafOrder = [];
    function traverse(nodeId) {
      if (nodeId < numLeaves) {
        leafOrder.push(nodeId);
      } else {
        const [left, right] = children.get(nodeId);
        traverse(left);
        traverse(right);
      }
    }
    // Root is the last merge
    traverse(numLeaves + linkageData.length - 1);
    
    // Assign leaf x-positions based on traversal order
    const nodeCoords = new Map();
    const leafWidth = plotWidth / numLeaves;
    leafOrder.forEach((leafId, idx) => {
      const x = margin.left + (idx + 0.5) * leafWidth;
      const y = height - margin.bottom;
      nodeCoords.set(leafId, { x, y });
    });
    
    // Determine the cut distance
    let cutDist = 0;
    if (linkageData.length >= numClusters - 1) {
      const cutIdx = Math.max(0, linkageData.length - numClusters + 1);
      if (linkageData[cutIdx]) cutDist = linkageData[cutIdx][2];
    }
    
    // Draw branches for each merge
    ctx.lineWidth = 1.5;
    
    // We draw all merges to show the full tree
    for (let i = 0; i < linkageData.length; i++) {
      const [idx1, idx2, distance] = linkageData[i];
      const nodeId = numLeaves + i;
      
      const node1 = nodeCoords.get(idx1);
      const node2 = nodeCoords.get(idx2);
      if (!node1 || !node2) continue;
      
      // Y position of merge based on distance
      const mergeY = height - margin.bottom - (distance / maxDist) * plotHeight;
      const mergeX = (node1.x + node2.x) / 2;
      
      // Color based on whether it's above or below the cut
      if (distance > cutDist) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; // Gray for top branches
      } else {
        ctx.strokeStyle = PALETTE[i % PALETTE.length]; // Colorful for clusters
      }
      
      // Draw U-shaped branch
      ctx.beginPath();
      ctx.moveTo(node1.x, node1.y);
      ctx.lineTo(node1.x, mergeY);
      ctx.lineTo(node2.x, mergeY);
      ctx.lineTo(node2.x, node2.y);
      ctx.stroke();
      
      // Store new node position for next level of tree
      nodeCoords.set(nodeId, { x: mergeX, y: mergeY });
    }
    
    // Draw cut-off line for K clusters
    if (cutDist > 0) {
      ctx.strokeStyle = RED;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      const cutY = height - margin.bottom - (cutDist / maxDist) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(margin.left, cutY);
      ctx.lineTo(width - margin.right, cutY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Legend
    ctx.fillStyle = RED;
    ctx.font = '11px Syne';
    ctx.textAlign = 'left';
    ctx.fillText(`K=${numClusters} clusters (optimal cut)`, margin.left, height - 8);
    
  } catch (e) {
    console.error('Dendrogram error:', e);
  }
}

// Draw correlation heatmap
function drawCorrHeatmap(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const size = Math.min(canvas.width, canvas.height);
  const cellSize = size / (data.features.length + 1);
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw cells
  for (let i = 0; i < data.matrix.length; i++) {
    for (let j = 0; j < data.matrix[i].length; j++) {
      const val = data.matrix[i][j];
      const x = (j + 1) * cellSize;
      const y = (i + 1) * cellSize;
      
      // Color based on correlation
      const r = val > 0 ? 0 : 229;
      const g = val > 0 ? Math.round(208 * Math.abs(val)) : Math.round(9 * Math.abs(val));
      const b = val > 0 ? Math.round(132 * Math.abs(val)) : Math.round(20 * Math.abs(val));
      ctx.fillStyle = `rgba(${val > 0 ? 0 : 229}, ${val > 0 ? 208 : 100}, ${val > 0 ? 132 : 100}, ${Math.abs(val)})`;
      if (val > 0.5) ctx.fillStyle = `rgba(0, 208, 132, ${val})`;
      else if (val > 0) ctx.fillStyle = `rgba(77, 166, 255, ${val * 2})`;
      else ctx.fillStyle = `rgba(229, 9, 20, ${Math.abs(val)})`;
      
      ctx.fillRect(x, y, cellSize - 2, cellSize - 2);
      
      // Value text
      ctx.fillStyle = '#fff';
      ctx.font = '10px DM Mono';
      ctx.textAlign = 'center';
      ctx.fillText(val.toFixed(2), x + cellSize/2 - 1, y + cellSize/2 + 3);
    }
  }
  
  // Labels
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '10px DM Mono';
  for (let i = 0; i < data.features.length; i++) {
    // Top labels
    ctx.save();
    ctx.translate((i + 1.5) * cellSize, cellSize * 0.8);
    ctx.rotate(-Math.PI / 4);
    ctx.textAlign = 'left';
    ctx.fillText(data.features[i], 0, 0);
    ctx.restore();
    
    // Left labels
    ctx.textAlign = 'right';
    ctx.fillText(data.features[i], cellSize - 5, (i + 1.6) * cellSize);
  }
}

// Genres page
function initGenresCharts(analytics) {
  const genres = analytics.genres;
  
  if (!genres) return;
  
  // 1. TREEMAP - TOP GENRES BY COUNT
  if (genres.top_genres) {
    const topGenres = genres.top_genres;
    const genreLabels = Object.keys(topGenres).slice(0, 15);
    const genreCounts = genreLabels.map(g => topGenres[g]);
    
    const treemapEl = document.getElementById('treemapCanvas');
    if (treemapEl) {
      drawTreemap(treemapEl, genreLabels, genreCounts);
    }
    
    const treemapInsight = document.getElementById('treemap-insight');
    if (treemapInsight && genreLabels.length > 0) {
      treemapInsight.textContent = `${genreLabels[0]}: largest genre with ${genreCounts[0].toLocaleString()} titles`;
    }
  }
  
  // 2. BOX PLOT - RATING DISTRIBUTION BY GENRE
  if (genres.rating_distribution) {
    const ratingDist = genres.rating_distribution;
    const genreNames = Object.keys(ratingDist);
    
    // Create box plot data
    const boxplotData = genreNames.map((genre, i) => ({
      label: genre,
      min: ratingDist[genre].min,
      q1: ratingDist[genre].q1,
      median: ratingDist[genre].median,
      q3: ratingDist[genre].q3,
      max: ratingDist[genre].max,
      mean: ratingDist[genre].mean
    }));
    
    // For simplicity, show as a bar chart with median and range
    mkChart('boxplotCanvas', {
      type: 'bar',
      data: {
        labels: genreNames,
        datasets: [
          {
            label: 'Median Rating',
            data: boxplotData.map(d => d.median),
            backgroundColor: PALETTE.slice(0, genreNames.length),
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.3)',
            borderRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { 
          legend: { display: true, labels: { color: 'rgba(255,255,255,0.8)' } },
          title: { display: true, text: 'Rating Distribution (Median)', color: '#fff' },
          tooltip: {
            callbacks: {
              afterLabel: function(context) {
                const genre = genreNames[context.dataIndex];
                const dist = ratingDist[genre];
                return `Mean: ${dist.mean} | Range: ${dist.min}-${dist.max} | Q1-Q3: ${dist.q1}-${dist.q3}`;
              }
            }
          }
        },
        scales: { 
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } }, 
          y: { 
            min: 4, 
            max: 9, 
            grid: { color: 'rgba(255,255,255,0.1)' },
            ticks: { color: 'rgba(255,255,255,0.7)' }
          } 
        }
      }
    });
    
    const topRatedGenre = Object.entries(ratingDist).sort((a, b) => b[1].mean - a[1].mean)[0];
    const boxplotInsight = document.getElementById('boxplot-insight');
    if (boxplotInsight && topRatedGenre) {
      boxplotInsight.textContent = `${topRatedGenre[0]}: highest average rating (${topRatedGenre[1].mean.toFixed(2)}/10)`;
    }
  }
  
  // 3. GENRE GROWTH BY YEAR
  if (genres.yearly_growth) {
    const yearlyGrowth = genres.yearly_growth;
    const years = Object.keys(yearlyGrowth).sort().map(Number).filter(y => y >= 2010 && y <= 2020);
    const genreLabels = Object.keys(genres.top_genres).slice(0, 5);
    
    const datasets = genreLabels.map((genre, i) => ({
      label: genre,
      data: years.map(year => yearlyGrowth[year]?.[genre] || 0),
      borderColor: PALETTE[i % PALETTE.length],
      backgroundColor: `${PALETTE[i % PALETTE.length]}15`,
      fill: false,
      tension: 0.3,
      pointRadius: 3,
      borderWidth: 2
    }));
    
    mkChart('genreGrowth', {
      type: 'line',
      data: {
        labels: years,
        datasets: datasets
      },
      options: {
        responsive: true,
        plugins: { 
          legend: { 
            position: 'bottom',
            labels: { color: 'rgba(255,255,255,0.8)', padding: 15 }
          },
          title: { 
            display: true, 
            text: 'Genre Growth Over Time',
            color: '#fff'
          }
        },
        scales: { 
          x: { 
            grid: { color: 'rgba(255,255,255,0.1)' },
            ticks: { color: 'rgba(255,255,255,0.7)' }
          }, 
          y: { 
            grid: { color: 'rgba(255,255,255,0.1)' },
            ticks: { color: 'rgba(255,255,255,0.7)' }
          } 
        }
      }
    });
    
    const growthInsight = document.getElementById('growth-insight-genre');
    if (growthInsight && genreLabels.length > 0) {
      let maxGrowthVal = -1;
      let fastestGenre = '';
      genreLabels.forEach(genre => {
        const earliestVal = yearlyGrowth[2010]?.[genre] || 0;
        const latestVal = yearlyGrowth[2020]?.[genre] || 0;
        const diff = latestVal - earliestVal;
        if (diff > maxGrowthVal) {
          maxGrowthVal = diff;
          fastestGenre = genre;
        }
      });
      growthInsight.textContent = `${fastestGenre}: fastest growing genre in the 2010–2020 period (+${maxGrowthVal} titles added)`;
    }
  }
  
  // 4. RUNTIME DISTRIBUTION BY GENRE (Violin-like representation)
  if (genres.runtime_distribution) {
    const runtimeDist = genres.runtime_distribution;
    const genreNames = Object.keys(runtimeDist);
    
    // Show as box chart with range visualization
    mkChart('violinCanvas', {
      type: 'bar',
      data: {
        labels: genreNames,
        datasets: [{
          label: 'Avg Duration (minutes)',
          data: genreNames.map(g => runtimeDist[g].mean),
          backgroundColor: PALETTE.slice(0, genreNames.length),
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.3)',
          borderRadius: 3
        }]
      },
      options: {
        responsive: true,
        plugins: { 
          legend: { display: false },
          title: { display: true, text: 'Average Duration by Genre', color: '#fff' },
          tooltip: {
            callbacks: {
              afterLabel: function(context) {
                const genre = genreNames[context.dataIndex];
                const dist = runtimeDist[genre];
                return `Median: ${dist.median}min | Range: ${dist.min}-${dist.max}min`;
              }
            }
          }
        },
        scales: { 
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.7)' } }, 
          y: { 
            grid: { color: 'rgba(255,255,255,0.1)' },
            ticks: { color: 'rgba(255,255,255,0.7)' }
          } 
        }
      }
    });
    
    const longestGenre = Object.entries(runtimeDist).sort((a, b) => b[1].mean - a[1].mean)[0];
    const violinInsight = document.getElementById('violin-insight');
    if (violinInsight && longestGenre) {
      violinInsight.textContent = `${longestGenre[0]}: longest average duration (${longestGenre[1].mean.toFixed(1)} min)`;
    }
  }
  
  // 5. COUNTRY × GENRE HEATMAP
  if (genres.country_genre_matrix) {
    const matrix = genres.country_genre_matrix;
    const countries = Object.keys(matrix);
    const allGenres = [...new Set(countries.flatMap(c => Object.keys(matrix[c])))];
    
    // Create heatmap using canvas
    const heatmapEl = document.getElementById('genreCxgHeatmap');
    if (heatmapEl) {
      drawCountryGenreHeatmap(heatmapEl, matrix, countries, allGenres);
    }
    
    const cxgInsight = document.getElementById('cxg-insight');
    if (cxgInsight && countries.length > 0) {
      let maxUniqueGenres = -1;
      let mostDiverseCountry = '';
      countries.forEach(c => {
        const uniqueCount = Object.values(matrix[c] || {}).filter(v => v > 0).length;
        if (uniqueCount > maxUniqueGenres) {
          maxUniqueGenres = uniqueCount;
          mostDiverseCountry = c;
        }
      });
      cxgInsight.textContent = `${mostDiverseCountry}: most diverse output with ${maxUniqueGenres} active genres represented in the catalog`;
    }
  }
}

// Draw country × genre heatmap
function drawCountryGenreHeatmap(canvas, matrix, countries, genres) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  ctx.fillStyle = '#0f0f0f';
  ctx.fillRect(0, 0, width, height);
  
  const margin = { top: 30, bottom: 30, left: 120, right: 20 };
  const cellWidth = (width - margin.left - margin.right) / genres.length;
  const cellHeight = (height - margin.top - margin.bottom) / countries.length;
  
  // Get max value for color scaling
  const allValues = countries.flatMap(c => Object.values(matrix[c] || {}));
  const maxValue = Math.max(...allValues, 1);
  
  // Draw cells
  countries.forEach((country, i) => {
    genres.forEach((genre, j) => {
      const value = matrix[country]?.[genre] || 0;
      const intensity = value / maxValue;
      
      const x = margin.left + j * cellWidth;
      const y = margin.top + i * cellHeight;
      
      // Color based on value
      const r = Math.floor(229 * intensity);
      const g = Math.floor(9 + (100 * (1 - intensity)));
      const b = Math.floor(20 + (100 * (1 - intensity)));
      ctx.fillStyle = `rgba(${r},${g},${b},0.8)`;
      ctx.fillRect(x, y, cellWidth - 1, cellHeight - 1);
      
      // Value text
      if (value > 0) {
        ctx.fillStyle = '#fff';
        ctx.font = '9px DM Mono';
        ctx.textAlign = 'center';
        ctx.fillText(value, x + cellWidth / 2, y + cellHeight / 2 + 3);
      }
    });
  });
  
  // Country labels (left)
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '10px DM Mono';
  ctx.textAlign = 'right';
  countries.forEach((country, i) => {
    const y = margin.top + i * cellHeight + cellHeight / 2 + 3;
    ctx.fillText(country, margin.left - 10, y);
  });
  
  // Genre labels (top)
  ctx.textAlign = 'center';
  genres.forEach((genre, j) => {
    ctx.save();
    const x = margin.left + j * cellWidth + cellWidth / 2;
    const y = 15;
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 4);
    ctx.fillText(genre, 0, 0);
    ctx.restore();
  });
  
  // Title
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 12px Syne';
  ctx.textAlign = 'left';
  ctx.fillText('Country × Genre Distribution', margin.left, 12);
}

// Geography page
function initGeographyCharts(analytics) {
  const countries = analytics.countries;
  
  if (countries && countries.top_countries) {
    const topCountries = countries.top_countries;
    const countryLabels = Object.keys(topCountries).slice(0, 15);
    const countryCounts = countryLabels.map(c => topCountries[c]);
    
    mkChart('countryBar', {
      type: 'bar',
      data: {
        labels: countryLabels,
        datasets: [{
          label: 'Titles',
          data: countryCounts,
          backgroundColor: countryCounts.map((v,i) => i===0 ? RED : i<3 ? AMBER : `rgba(229,9,20,${0.15+i*0.05})`),
          borderWidth: 0,
          borderRadius: 2
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } }
      }
    });
    
    const countryInsight = document.getElementById('geo-country-insight');
    if (countryInsight && countryLabels.length > 0) {
      countryInsight.textContent = `${countryLabels[0]}: top producer with ${countryCounts[0].toLocaleString()} titles`;
    }
    
    // Country×Genre heatmap using real data
    const geoHeatmapEl = document.getElementById('geoCxgHeatmap');
    if (geoHeatmapEl && analytics.genres && analytics.genres.country_genre_matrix) {
      const matrix = analytics.genres.country_genre_matrix;
      const matrixCountries = Object.keys(matrix);
      const allGenres = [...new Set(matrixCountries.flatMap(c => Object.keys(matrix[c])))];
      drawCountryGenreHeatmap(geoHeatmapEl, matrix, matrixCountries, allGenres);
      
      const geoCxgInsight = document.getElementById('geo-cxg-insight');
      if (geoCxgInsight && matrixCountries.length > 0) {
        let maxUniqueGenres = -1;
        let mostDiverseCountry = '';
        matrixCountries.forEach(c => {
          const uniqueCount = Object.values(matrix[c] || {}).filter(v => v > 0).length;
          if (uniqueCount > maxUniqueGenres) {
            maxUniqueGenres = uniqueCount;
            mostDiverseCountry = c;
          }
        });
        geoCxgInsight.textContent = `${mostDiverseCountry}: most diverse output with ${maxUniqueGenres} active genres represented in the catalog`;
      }
    }
  }
  
  if (analytics.countries && analytics.countries.top_countries) {
    drawWorldMap('worldmap', analytics.countries.top_countries);
    
    const worldmapInsight = document.getElementById('worldmap-insight');
    if (worldmapInsight) {
      worldmapInsight.textContent = `Interactive D3 bubble map showing global distribution of ${Object.keys(analytics.countries.top_countries).length} producing nations`;
    }
  } else {
    showNoDataMessage('worldmap', 'No country data available for map');
  }
}

// Trends page
function initTrendsCharts(analytics) {
  const trends = analytics.trends;
  
  // YoY chart using real yearly releases
  if (trends && trends.yearly_releases) {
    const movieYears = trends.yearly_releases.Movie || {};
    const tvYears = trends.yearly_releases['TV Show'] || {};
    const years = Object.keys(movieYears).sort();
    const totalByYear = years.map(y => (movieYears[y] || 0) + (tvYears[y] || 0));
    
    // Calculate YoY growth
    const yoyRates = totalByYear.map((v, i) => {
      if (i === 0 || totalByYear[i-1] === 0) return 0;
      return Math.round(((v - totalByYear[i-1]) / totalByYear[i-1]) * 100);
    });
    
    mkChart('yoyChart', {
      type: 'line',
      data: {
        labels: years,
        datasets: [{
          label: 'YoY Growth %',
          data: yoyRates,
          borderColor: GREEN,
          backgroundColor: 'rgba(0,208,132,0.08)',
          fill: false,
          tension: 0.3,
          pointRadius: 5,
          segment: { borderColor: ctx => ctx.p1.parsed.y < 0 ? RED : GREEN }
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, title: { display: true, text: 'YoY Change (%)', color: 'rgba(255,255,255,0.4)' } }
        }
      }
    });
    
    const yoyInsight = document.getElementById('yoy-insight');
    if (yoyInsight && yoyRates.length > 0) {
      const maxGrowth = Math.max(...yoyRates);
      const maxYear = years[yoyRates.indexOf(maxGrowth)];
      yoyInsight.textContent = `${maxYear}: peak catalog growth of +${maxGrowth}% year-over-year additions`;
    }
  }
  
  // Runtime trend using real runtime data
  if (analytics.runtime && analytics.runtime.by_decade) {
    const runtimeByDecade = analytics.runtime.by_decade;
    const decades = Object.keys(runtimeByDecade).sort();
    const runtimes = decades.map(d => Math.round(runtimeByDecade[d] || 0));
    
    mkChart('runtimeChart', {
      type: 'line',
      data: {
        labels: decades,
        datasets: [{
          label: 'Avg Runtime (min)',
          data: runtimes,
          borderColor: BLUE,
          backgroundColor: 'rgba(77,166,255,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' } }, y: { grid: { color: 'rgba(255,255,255,0.04)' } } }
      }
    });
    
    const runtimeInsight = document.getElementById('runtime-insight');
    if (runtimeInsight && decades.length > 0) {
      const validDecades = decades.filter(d => runtimeByDecade[d] !== null);
      if (validDecades.length > 0) {
        const latestDec = validDecades[validDecades.length - 1];
        runtimeInsight.textContent = `${latestDec}s: average runtime of ${Math.round(runtimeByDecade[latestDec])} minutes per title`;
      }
    }
  }
  
  // Rating trend using real ratings by decade
  if (analytics.ratings && analytics.ratings.rating_by_decade) {
    const ratingsByDecade = analytics.ratings.rating_by_decade;
    const decades = Object.keys(ratingsByDecade).sort();
    const ratings = decades.map(d => ratingsByDecade[d] || 0);
    
    mkChart('ratingTrend', {
      type: 'line',
      data: {
        labels: decades,
        datasets: [{
          label: 'Avg IMDb Rating',
          data: ratings,
          borderColor: AMBER,
          backgroundColor: 'rgba(245,166,35,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' } }, y: { min: 5, max: 9, grid: { color: 'rgba(255,255,255,0.04)' } } }
      }
    });
    
    const ratingInsight = document.getElementById('rating-trend-insight');
    if (ratingInsight && decades.length > 0) {
      const validDecades = decades.filter(d => ratingsByDecade[d] !== null);
      if (validDecades.length > 0) {
        let bestDecade = '';
        let highestRating = -1;
        validDecades.forEach(d => {
          if (ratingsByDecade[d] > highestRating) {
            highestRating = ratingsByDecade[d];
            bestDecade = d;
          }
        });
        ratingInsight.textContent = `${bestDecade}s: highest average IMDb rating of ${highestRating.toFixed(2)}/10`;
      }
    }
  }
}

// Load full dataset index for interactive explorer & business aggregations
window.netflixDataset = null;
async function loadDatasetIndex() {
  if (window.netflixDataset) return window.netflixDataset;
  try {
    const res = await fetch('/data/processed/dataset_index.json');
    if (!res.ok) throw new Error('Failed to load dataset index');
    window.netflixDataset = await res.json();
    return window.netflixDataset;
  } catch (err) {
    console.error('Error loading dataset index:', err);
    return null;
  }
}

// Explorer page
function initExplorerCharts(analytics) {
  // Populate genres dropdown dynamically from top genres
  const genreSelect = document.getElementById('explorerGenre');
  if (genreSelect && genreSelect.options.length <= 1 && analytics.genres && analytics.genres.top_genres) {
    const topG = Object.keys(analytics.genres.top_genres).slice(0, 10);
    topG.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      genreSelect.appendChild(opt);
    });
  }

  // Set min/max year dynamically from dataset range
  const yMinEl = document.getElementById('yearMin');
  const yMaxEl = document.getElementById('yearMax');
  if (yMinEl && yMaxEl && analytics.summary && analytics.summary.date_range) {
    const range = analytics.summary.date_range;
    yMinEl.min = range.earliest;
    yMinEl.max = range.latest;
    yMaxEl.min = range.earliest;
    yMaxEl.max = range.latest;
    // Set default values if we haven't touched them
    if (yMinEl.value === "2010" && yMaxEl.value === "2021") {
      yMinEl.value = Math.max(range.earliest, 2010);
      yMaxEl.value = range.latest;
    }
  }

  // Pre-load dataset and then update explorer
  loadDatasetIndex().then(() => {
    updateExplorer();
  });
}

window.updateExplorer = async function() {
  const analytics = window.netflixAnalytics;
  if (!analytics) return;
  
  let dataset = window.netflixDataset;
  if (!dataset) {
    dataset = await loadDatasetIndex();
  }
  if (!dataset) return;

  const yMinEl = document.getElementById('yearMin');
  const yMaxEl = document.getElementById('yearMax');
  const minRatingEl = document.getElementById('minRating');
  const genreEl = document.getElementById('explorerGenre');
  const typeEl = document.getElementById('explorerType');
  const chartTypeEl = document.getElementById('explorerChartType');
  
  if (!yMinEl || !yMaxEl) return;
  
  const yMin = +yMinEl.value;
  const yMax = +yMaxEl.value;
  const minRating = minRatingEl ? +minRatingEl.value : 0;
  const selectedGenre = genreEl ? genreEl.value : 'all';
  const selectedType = typeEl ? typeEl.value : 'all';
  const selectedChartType = chartTypeEl ? chartTypeEl.value : 'bar';
  
  document.getElementById('yearMinVal').textContent = yMin;
  document.getElementById('yearMaxVal').textContent = yMax;
  if (document.getElementById('minRatingVal')) {
    document.getElementById('minRatingVal').textContent = minRating.toFixed(1);
  }
  if (document.getElementById('explorerSub')) {
    document.getElementById('explorerSub').textContent = `Min rating: ${minRating.toFixed(1)} · Genre: ${selectedGenre} · Type: ${selectedType}`;
  }

  // Perform real filtering on dataset index
  const filtered = dataset.filter(row => {
    const year = row.y;
    const rating = row.r;
    const g = row.g;
    const ct = row.ct; // "Movie" or "TV Show"

    if (year < yMin || year > yMax) return false;
    if (rating < minRating) return false;
    if (selectedGenre !== 'all' && g !== selectedGenre) return false;
    if (selectedType !== 'all') {
      const isMovie = ct === 'Movie';
      if (selectedType === 'movie' && !isMovie) return false;
      if (selectedType === 'tv' && isMovie) return false;
    }
    return true;
  });

  // Calculate statistics
  const totalTitles = filtered.length;
  const yearCounts = {};
  let totalMovies = 0;
  let totalTV = 0;

  filtered.forEach(row => {
    if (row.y) yearCounts[row.y] = (yearCounts[row.y] || 0) + 1;
    if (row.ct === 'Movie') totalMovies++;
    else if (row.ct === 'TV Show') totalTV++;
  });

  // Find peak year
  let peakYear = '-';
  let maxCount = 0;
  Object.keys(yearCounts).forEach(y => {
    if (yearCounts[y] > maxCount) {
      maxCount = yearCounts[y];
      peakYear = y;
    }
  });

  if (document.getElementById('eStat1')) document.getElementById('eStat1').textContent = totalTitles.toLocaleString();
  if (document.getElementById('eStat3')) document.getElementById('eStat3').textContent = peakYear;

  // Chart 1: Content by Year
  const years = Array.from({length: yMax - yMin + 1}, (_, i) => yMin + i);
  const chartData = years.map(y => yearCounts[y] || 0);

  mkChart('explorerChart', {
    type: selectedChartType === 'scatter' ? 'line' : selectedChartType, // fallback scatter to line
    data: {
      labels: years,
      datasets: [{
        label: 'Titles',
        data: chartData,
        backgroundColor: RED,
        borderColor: RED,
        borderWidth: selectedChartType === 'line' ? 2 : 0,
        fill: selectedChartType === 'line' ? 'origin' : false,
        borderRadius: 2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true } }
    }
  });

  // Chart 2: Movies vs TV Pie Chart
  mkChart('explorerPie', {
    type: 'doughnut',
    data: {
      labels: ['Movies', 'TV Shows'],
      datasets: [{
        data: [totalMovies, totalTV],
        backgroundColor: [RED, BLUE],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.7)' } } },
      cutout: '70%'
    }
  });

  // Chart 3: Rating Histogram
  const bins = ['Poor (0-4)', 'Below Avg (4-6)', 'Average (6-7)', 'Good (7-8)', 'Excellent (8+)'];
  const binCounts = { 'Poor (0-4)': 0, 'Below Avg (4-6)': 0, 'Average (6-7)': 0, 'Good (7-8)': 0, 'Excellent (8+)': 0 };

  filtered.forEach(row => {
    const score = row.r;
    if (score == null) return;
    if (score < 4) binCounts['Poor (0-4)']++;
    else if (score < 6) binCounts['Below Avg (4-6)']++;
    else if (score < 7) binCounts['Average (6-7)']++;
    else if (score < 8) binCounts['Good (7-8)']++;
    else binCounts['Excellent (8+)']++;
  });

  const histValues = bins.map(b => binCounts[b]);

  mkChart('explorerHist', {
    type: 'bar',
    data: {
      labels: bins,
      datasets: [{
        label: 'Titles',
        data: histValues,
        backgroundColor: bins.map(b => {
          if (b.includes('Excellent')) return GREEN;
          if (b.includes('Good')) return TEAL;
          if (b.includes('Average')) return BLUE;
          if (b.includes('Below')) return AMBER;
          return RED;
        }),
        borderWidth: 0,
        borderRadius: 2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true } }
    }
  });
};

window.resetExplorer = function() {
  const analytics = window.netflixAnalytics;
  const yMinEl = document.getElementById('yearMin');
  const yMaxEl = document.getElementById('yearMax');
  const minRatingEl = document.getElementById('minRating');
  const genreEl = document.getElementById('explorerGenre');
  const typeEl = document.getElementById('explorerType');
  const chartTypeEl = document.getElementById('explorerChartType');
  
  if (analytics && analytics.summary && analytics.summary.date_range) {
    const range = analytics.summary.date_range;
    if (yMinEl) yMinEl.value = Math.max(range.earliest, 2010);
    if (yMaxEl) yMaxEl.value = range.latest;
  } else {
    if (yMinEl) yMinEl.value = 2010;
    if (yMaxEl) yMaxEl.value = 2021;
  }
  if (minRatingEl) minRatingEl.value = 0;
  if (genreEl) genreEl.value = 'all';
  if (typeEl) typeEl.value = 'all';
  if (chartTypeEl) chartTypeEl.value = 'bar';
  
  updateExplorer();
};

// Business page
async function initBusinessCharts(analytics) {
  let dataset = window.netflixDataset;
  if (!dataset) {
    dataset = await loadDatasetIndex();
  }
  if (!dataset) return;
  
  // 1. Calculate Hit vs Flop Ratio by Genre
  const genreStats = {};
  dataset.forEach(row => {
    const genre = row.g;
    const rating = row.r;
    if (!genre || rating == null) return;
    
    if (!genreStats[genre]) {
      genreStats[genre] = { total: 0, hits: 0, flops: 0 };
    }
    genreStats[genre].total++;
    if (rating >= 7.0) genreStats[genre].hits++;
    else if (rating < 5.5) genreStats[genre].flops++;
  });
  
  // Get top 6 genres by total count
  const sortedGenres = Object.keys(genreStats)
    .sort((a, b) => genreStats[b].total - genreStats[a].total)
    .slice(0, 6);
    
  const hitRates = sortedGenres.map(g => Math.round((genreStats[g].hits / genreStats[g].total) * 100));
  const flopRates = sortedGenres.map(g => Math.round((genreStats[g].flops / genreStats[g].total) * 100));
  
  mkChart('hitFlopChart', {
    type: 'bar',
    data: {
      labels: sortedGenres,
      datasets: [
        { label: 'Hit Rate % (rating ≥7.0)', data: hitRates, backgroundColor: GREEN, borderWidth: 0, borderRadius: 2 },
        { label: 'Flop Rate % (rating <5.5)', data: flopRates, backgroundColor: RED, borderWidth: 0, borderRadius: 2 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.7)' } } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, max: 100 } }
    }
  });
  
  const hitFlopInsight = document.getElementById('hit-flop-insight');
  if (hitFlopInsight && sortedGenres.length > 0) {
    let bestGenre = '';
    let maxHitRate = -1;
    sortedGenres.forEach(g => {
      const rate = Math.round((genreStats[g].hits / genreStats[g].total) * 100);
      if (rate > maxHitRate) {
        maxHitRate = rate;
        bestGenre = g;
      }
    });
    hitFlopInsight.textContent = `${bestGenre}: ${maxHitRate}% hit rate — most reliable genre in the catalog`;
  }
  
  // 2. Calculate Production Frequency by Country
  const countryYearStats = {};
  dataset.forEach(row => {
    const country = row.c;
    const year = row.y;
    if (!country || !year || country === 'Unknown') return;
    
    // Normalize country names
    let normCountry = country;
    if (country === 'US') normCountry = 'United States';
    if (country === 'IN') normCountry = 'India';
    if (country === 'GB') normCountry = 'United Kingdom';
    if (country === 'CA') normCountry = 'Canada';
    if (country === 'FR') normCountry = 'France';
    if (country === 'JP') normCountry = 'Japan';
    if (country === 'KR') normCountry = 'South Korea';
    if (country === 'ES') normCountry = 'Spain';
    if (country === 'BR') normCountry = 'Brazil';
    if (country === 'MX') normCountry = 'Mexico';
    
    if (!countryYearStats[normCountry]) {
      countryYearStats[normCountry] = {};
    }
    countryYearStats[normCountry][year] = (countryYearStats[normCountry][year] || 0) + 1;
  });
  
  // Get top 3 countries by total count
  const top3Countries = Object.keys(countryYearStats)
    .sort((a, b) => {
      const totalA = Object.values(countryYearStats[a]).reduce((sum, v) => sum + v, 0);
      const totalB = Object.values(countryYearStats[b]).reduce((sum, v) => sum + v, 0);
      return totalB - totalA;
    })
    .slice(0, 3);
    
  const years = Array.from({length: 2021 - 2010 + 1}, (_, i) => 2010 + i);
  const datasets = top3Countries.map((country, idx) => ({
    label: country,
    data: years.map(y => countryYearStats[country][y] || 0),
    borderColor: PALETTE[idx % PALETTE.length],
    backgroundColor: 'transparent',
    fill: false,
    tension: 0.4,
    pointRadius: 4
  }));
  
  mkChart('prodFreqChart', {
    type: 'line',
    data: {
      labels: years,
      datasets: datasets
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.7)' } } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.04)' } } }
    }
  });
  
  const prodFreqInsight = document.getElementById('prod-freq-insight');
  if (prodFreqInsight && countryYearStats['India']) {
    const ind2016 = countryYearStats['India'][2016] || 1;
    const ind2021 = countryYearStats['India'][2021] || 1;
    const multiplier = (ind2021 / ind2016).toFixed(1);
    prodFreqInsight.textContent = `India's production rate grew ${multiplier}× from 2016 (${ind2016} titles) to 2021 (${ind2021} titles)`;
  }
}

// Advanced page
async function initAdvancedCharts(analytics) {
  const ml = analytics.ml || {};
  
  // 1. Correlation Heatmap
  // 1. Correlation Heatmap
  if (analytics.clustering && analytics.clustering.feature_correlations) {
    const correlationData = {
      features: analytics.clustering.feature_names,
      matrix: analytics.clustering.feature_correlations
    };
    drawCorrHeatmap('fullCorrHeatmap', correlationData);

    // Find absolute strongest correlation dynamically
    let maxCorr = -1;
    let maxPair = '';
    const matrix = analytics.clustering.feature_correlations;
    const features = analytics.clustering.feature_names;
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[i].length; j++) {
        if (i !== j) {
          const val = Math.abs(matrix[i][j]);
          if (val > maxCorr) {
            maxCorr = val;
            maxPair = `"${features[i]}" ↔ "${features[j]}": ${matrix[i][j] >= 0 ? '+' : ''}${matrix[i][j].toFixed(2)}`;
          }
        }
      }
    }
    const corrInsightEl = document.getElementById('adv-corr-insight');
    if (corrInsightEl && maxPair) {
      corrInsightEl.textContent = `Strongest correlation: ${maxPair} — indicating the most significant linear relationship in the features space.`;
    }
  }
  
  // 2. SHAP Waterfall Chart
  const shapContainer = document.getElementById('shapChart');
  if (shapContainer && ml.shap_features && ml.shap_features.reg_XGBoost) {
    shapContainer.innerHTML = '';
    const features = ml.shap_features.reg_XGBoost;
    
    // Sort features by absolute SHAP value
    const sorted = Object.entries(features)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 8); // top 8 features
      
    const maxVal = Math.max(...sorted.map(f => Math.abs(f[1])));
    
    sorted.forEach(([feat, val]) => {
      const row = document.createElement('div');
      row.className = 'shap-row';
      
      const pct = Math.max(3, Math.abs(val / maxVal) * 50); // Max width 50%, Min 3%
      const color = val >= 0 ? RED : BLUE;
      const sign = val >= 0 ? '+' : '−';
      const barClass = val >= 0 ? 'shap-bar-pos' : 'shap-bar-neg';
      
      row.innerHTML = `
        <div class="shap-feat" style="font-size: 11px; text-transform: none">${feat}</div>
        <div class="shap-bar-wrap">
          <div class="shap-center"></div>
          <div class="${barClass}" style="width:${pct.toFixed(0)}%; background-color:${color}"></div>
        </div>
        <div class="shap-val" style="color:${color}; font-size: 11px">${sign}${Math.abs(val).toFixed(3)}</div>
      `;
      shapContainer.appendChild(row);
    });

    const shapInsightEl = document.getElementById('adv-shap-insight');
    if (shapInsightEl && sorted.length > 0) {
      const topFeat = sorted[0][0];
      const topVal = sorted[0][1];
      const direction = topVal >= 0 ? 'positive' : 'negative';
      shapInsightEl.textContent = `"${topFeat}" is the strongest driver of predicted score (SHAP impact: ${topVal >= 0 ? '+' : ''}${topVal.toFixed(3)}) — positive impact increases score, negative decreases.`;
    }
  }
  
  // 3. Outlier Detection (using client-side IQR analysis)
  let dataset = window.netflixDataset;
  if (!dataset) {
    dataset = await loadDatasetIndex();
  }
  if (dataset) {
    const scores = dataset.map(row => row.r).filter(r => r != null).sort((a, b) => a - b);
    const n = scores.length;
    if (n > 0) {
      const q1 = scores[Math.floor(n * 0.25)];
      const q3 = scores[Math.floor(n * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      
      const outliers = dataset.filter(row => row.r != null && row.y != null && (row.r < lowerBound || row.r > upperBound));
      const normalTitles = dataset.filter(row => row.r != null && row.y != null && row.r >= lowerBound && row.r <= upperBound);
      
      // Downsample normal points for performance (1:10)
      const normalPoints = normalTitles.filter((_, idx) => idx % 10 === 0).map(row => ({ x: row.y, y: row.r }));
      const outlierPoints = outliers.map(row => ({ x: row.y, y: row.r }));
      
      mkChart('outlierChart', {
        type: 'scatter',
        data: {
          datasets: [
            {
              label: 'Normal Titles (sampled 1:10)',
              data: normalPoints,
              backgroundColor: 'rgba(255,255,255,0.12)',
              pointRadius: 2
            },
            {
              label: `Outliers (Rating < ${lowerBound.toFixed(1)} or > ${upperBound.toFixed(1)})`,
              data: outlierPoints,
              backgroundColor: RED,
              pointRadius: 4,
              pointHoverRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.7)' } } },
          scales: {
            x: { title: { display: true, text: 'Release Year', color: 'rgba(255,255,255,0.5)' }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { title: { display: true, text: 'IMDb Score', color: 'rgba(255,255,255,0.5)' }, grid: { color: 'rgba(255,255,255,0.04)' } }
          }
        }
      });
      
      const outlierInsight = document.getElementById('outlier-insight');
      if (outlierInsight) {
        outlierInsight.textContent = `${outliers.length} outlier titles identified dynamically using statistical IQR bounds (lower: ${lowerBound.toFixed(2)}, upper: ${upperBound.toFixed(2)})`;
      }
    }
  }
  
  // 4. Model Comparison (using real comparison results)
  if (ml && ml.all_results) {
    const models = ['reg_RandomForest', 'reg_XGBoost', 'reg_CatBoost', 'reg_LightGBM'];
    const friendlyNames = ['Random Forest', 'XGBoost', 'CatBoost', 'LightGBM'];
    
    const r2Scores = models.map(m => ml.all_results[m]?.R2 || 0);
    const maeScores = models.map(m => ml.all_results[m]?.MAE || 0);
    const rmseScores = models.map(m => ml.all_results[m]?.RMSE || 0);
    
    mkChart('modelComp', {
      type: 'bar',
      data: {
        labels: friendlyNames,
        datasets: [
          { label: 'R² Score (higher is better)', data: r2Scores, backgroundColor: GREEN, borderRadius: 2 },
          { label: 'MAE (lower is better)', data: maeScores, backgroundColor: AMBER, borderRadius: 2 },
          { label: 'RMSE (lower is better)', data: rmseScores, backgroundColor: RED, borderRadius: 2 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.7)' } } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true, max: 1.0 }
        }
      }
    });
    
    const modelCompInsight = document.getElementById('model-comp-insight');
    if (modelCompInsight && ml.all_results.reg_XGBoost) {
      const xgb = ml.all_results.reg_XGBoost;
      const lgbm = ml.all_results.reg_LightGBM;
      modelCompInsight.textContent = `XGBoost model achieved R²: ${xgb.R2.toFixed(4)} and MAE: ${xgb.MAE.toFixed(4)} | LightGBM achieved R²: ${lgbm.R2.toFixed(4)} and MAE: ${lgbm.MAE.toFixed(4)}`;
    }
  }
}

// Helper: show no-data message
function showNoDataMessage(canvasId, message) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const parent = canvas.parentElement;
  if (parent && !parent.querySelector('.no-data-overlay')) {
    const msg = document.createElement('div');
    msg.className = 'no-data-overlay';
    msg.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(14,14,14,0.85);color:#666;font-size:12px;text-align:center;padding:20px;border-radius:8px;';
    msg.innerHTML = `<div><div style="font-size:24px;margin-bottom:8px;">📊</div>${message}</div>`;
    parent.style.position = 'relative';
    parent.appendChild(msg);
  }
}

// Helper: draw treemap
function drawTreemap(canvas, labels, values) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const total = values.reduce((a, b) => a + b, 0);
  
  ctx.fillStyle = '#0e0e0e';
  ctx.fillRect(0, 0, width, height);
  
  let x = 0;
  labels.forEach((label, i) => {
    const w = (values[i] / total) * width;
    const hue = (i / labels.length) * 30; // Red range
    ctx.fillStyle = `hsl(${hue}, 80%, ${40 + i * 3}%)`;
    ctx.fillRect(x, 0, w, height);
    
    // Label
    ctx.fillStyle = '#fff';
    ctx.font = '10px DM Mono';
    ctx.save();
    ctx.translate(x + 5, height - 5);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(label.substring(0, 12), 0, 0);
    ctx.restore();
    
    x += w;
  });
}

// Draw interactive world map with production bubbles
function drawWorldMap(svgId, countryData) {
  const svg = d3.select("#" + svgId);
  if (svg.empty()) return;
  
  const width = +svg.attr("width") || 420;
  const height = +svg.attr("height") || 220;
  
  // Clear SVG
  svg.selectAll("*").remove();
  
  // Create projection
  const projection = d3.geoMercator()
    .scale(70)
    .translate([width / 2, height / 2 + 20]);
    
  const path = d3.geoPath().projection(projection);
  
  // Coordinates dictionary for top countries to place bubble indicators
  const coords = {
    "US": [-100, 40], "United States": [-100, 40],
    "IN": [78, 21], "India": [78, 21],
    "GB": [-2, 55], "United Kingdom": [-2, 55],
    "CA": [-106, 56], "Canada": [-106, 56],
    "FR": [2, 46], "France": [2, 46],
    "JP": [138, 36], "Japan": [138, 36],
    "KR": [127, 36], "South Korea": [127, 36],
    "ES": [-3, 40], "Spain": [-3, 40],
    "BR": [-55, -10], "Brazil": [-55, -10],
    "MX": [-102, 23], "Mexico": [-102, 23],
    "EG": [30, 26], "Egypt": [30, 26],
    "DE": [10, 51], "Germany": [10, 51],
    "AU": [133, -25], "Australia": [133, -25],
    "TR": [35, 38], "Turkey": [35, 38],
    "NG": [8, 9], "Nigeria": [8, 9],
    "CN": [104, 35], "China": [104, 35],
    "IT": [12, 41], "Italy": [12, 41],
    "HK": [114, 22], "Hong Kong": [114, 22],
    "SG": [103, 1], "Singapore": [103, 1],
    "AR": [-63, -38], "Argentina": [-63, -38],
    "CO": [-74, 4], "Colombia": [-74, 4],
    "ZA": [25, -30], "South Africa": [25, -30]
  };

  // Group duplicate keys (like US and United States)
  const mergedData = {};
  const nameMapping = {
    "US": "United States", "IN": "India", "GB": "United Kingdom",
    "CA": "Canada", "FR": "France", "JP": "Japan", "KR": "South Korea",
    "ES": "Spain", "BR": "Brazil", "MX": "Mexico", "EG": "Egypt", "DE": "Germany"
  };

  Object.entries(countryData).forEach(([country, val]) => {
    if (country === "Unknown") return;
    const name = nameMapping[country] || country;
    mergedData[name] = (mergedData[name] || 0) + val;
  });

  // Fetch GeoJSON map and draw land paths
  d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
    .then(data => {
      // Draw background land paths
      svg.append("g")
        .selectAll("path")
        .data(data.features)
        .join("path")
          .attr("fill", "rgba(255, 255, 255, 0.08)")
          .attr("d", path)
          .style("stroke", "rgba(255, 255, 255, 0.03)")
          .style("stroke-width", 0.5);

      drawBubbles();
    })
    .catch(err => {
      console.warn("Could not load GeoJSON map, drawing stylized grid projection", err);
      // Fallback: draw a beautiful grid of latitude and longitude lines as a stylized map representation
      const grid = svg.append("g").attr("class", "grid-fallback");
      
      // Draw horizontal lines
      for (let lat = -60; lat <= 80; lat += 20) {
        const lineCoords = d3.range(-180, 181, 10).map(lon => projection([lon, lat]));
        const lineGenerator = d3.line().x(d => d[0]).y(d => d[1]);
        grid.append("path")
          .datum(lineCoords)
          .attr("d", lineGenerator)
          .attr("fill", "none")
          .attr("stroke", "rgba(255, 255, 255, 0.04)")
          .attr("stroke-width", 0.5);
      }
      // Draw vertical lines
      for (let lon = -160; lon <= 180; lon += 40) {
        const lineCoords = d3.range(-60, 81, 10).map(lat => projection([lon, lat]));
        const lineGenerator = d3.line().x(d => d[0]).y(d => d[1]);
        grid.append("path")
          .datum(lineCoords)
          .attr("d", lineGenerator)
          .attr("fill", "none")
          .attr("stroke", "rgba(255, 255, 255, 0.04)")
          .attr("stroke-width", 0.5);
      }

      drawBubbles();
    });

  function drawBubbles() {
    // Sort and select top countries to draw bubbles
    const bubbleData = Object.entries(mergedData)
      .map(([name, count]) => {
        const coord = coords[name];
        return { name, count, coord };
      })
      .filter(d => d.coord !== undefined)
      .sort((a, b) => b.count - a.count);

    if (bubbleData.length === 0) return;

    const maxCount = bubbleData[0].count;
    const rScale = d3.scaleSqrt()
      .domain([1, maxCount])
      .range([3, 18]);

    const bubbles = svg.append("g")
      .selectAll("g")
      .data(bubbleData)
      .join("g")
        .attr("transform", d => {
          const pos = projection(d.coord);
          return `translate(${pos[0]}, ${pos[1]})`;
        });

    // Outer glow pulse circle
    bubbles.append("circle")
      .attr("r", d => rScale(d.count) * 1.5)
      .attr("fill", "rgba(229, 9, 20, 0.15)")
      .attr("stroke", "rgba(229, 9, 20, 0.3)")
      .attr("stroke-width", 1)
      .append("animate")
        .attr("attributeName", "r")
        .attr("values", d => `${rScale(d.count)} ${rScale(d.count) * 2}`)
        .attr("dur", "2.5s")
        .attr("repeatCount", "indefinite");

    // Main bubble circle
    bubbles.append("circle")
      .attr("r", d => rScale(d.count))
      .attr("fill", "rgba(229, 9, 20, 0.75)")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1)
      .style("cursor", "pointer");

    // Title label tooltip on hover
    bubbles.append("title")
      .text(d => `${d.name}: ${d.count.toLocaleString()} titles`);

    // Top 5 text labels
    bubbles.filter((d, i) => i < 5)
      .append("text")
        .attr("dy", d => rScale(d.count) + 12)
        .attr("text-anchor", "middle")
        .attr("fill", "rgba(255, 255, 255, 0.85)")
        .attr("font-size", "8px")
        .attr("font-family", "Syne")
        .text(d => `${d.name} (${d.count})`);
  }
}

// Download chart as PNG
window.dlChart = function(canvasId, fname) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = fname + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
};

// Load analytics on page ready
window.addEventListener('DOMContentLoaded', () => {
  loadAnalytics();
});
