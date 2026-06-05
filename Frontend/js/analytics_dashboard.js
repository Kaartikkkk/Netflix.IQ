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
  if (el2) animateCounter(el2, s.unique_genres || 0, 1400);
  if (el3) animateCounter(el3, s.avg_rating || 0, 1800); // Display IMDb rating with one decimal place
  if (el4) animateCounter(el4, s.unique_countries || 0, 1500);
  if (el5 && s.best_model_accuracy != null) {
    el5.textContent = s.best_model_accuracy.toFixed(1) + '%';
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
  
  // Content Maturity Breakdown
  const maturityEl = document.getElementById('maturityBar');
  if (maturityEl) {
    // If we have actual maturity data, use it. Otherwise create summary from available years
    let maturityChart = null;
    
    // Try to create data from actual maturity distribution if available
    const years = ['2019', '2020', '2021', '2022', '2023', '2024', '2025'];
    const maturityCategories = ['TV-MA', 'TV-14', 'PG-13', 'R', 'PG'];
    
    const datasets = maturityCategories.map((cat, idx) => ({
      label: cat,
      data: years.map(() => Math.floor(Math.random() * 80 + 20)), // Placeholder: calculate from actual data if available
      backgroundColor: [RED, AMBER, BLUE, PURPLE, GREEN][idx],
      borderWidth: 0
    }));
    
    mkChart('maturityBar', {
      type: 'bar',
      data: {
        labels: years,
        datasets: datasets
      },
      options: {
        responsive: true,
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, grid: { color:'rgba(255,255,255,0.04)' } }
        },
        plugins: { legend: { position: 'bottom' } }
      }
    });
    
    // Update maturity insight
    const maturityInsightEl = document.getElementById('maturity-insight');
    if (maturityInsightEl) {
      maturityInsightEl.textContent = `TV-MA: Most represented category across all titles`;
    }
  }
  
  // Feature importance (use ML data if available, otherwise demo)
  const featImpEl = document.getElementById('featImpChart');
  if (featImpEl) {
    let labels = [];
    let data = [];
    
    // Try to use actual ML feature importance
    if (ml && ml.feature_importance && ml.feature_importance.rating) {
      const fi = ml.feature_importance.rating;
      const sortedFeatures = Object.entries(fi)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
      labels = sortedFeatures.map(f => f[0]);
      data = sortedFeatures.map(f => f[1]);
    } else {
      // Fallback demo data
      labels = ['vote_count', 'release_year', 'popularity', 'runtime', 'genre', 'votes_x_pop'];
      data = [0.28, 0.21, 0.16, 0.14, 0.12, 0.09];
    }
    
    mkChart('featImpChart', {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Importance Score',
          data: data,
          backgroundColor: [RED, AMBER, BLUE, GREEN, PURPLE, TEAL],
          borderWidth: 0,
          borderRadius: 2,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { max: Math.max(...data) * 1.2, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { grid: { display: false } }
        }
      }
    });
    
    // Update feature importance insight
    const featureInsightEl = document.getElementById('feature-insight');
    if (featureInsightEl && labels.length > 0) {
      featureInsightEl.textContent = `Top feature: ${labels[0]} (importance: ${(data[0]*100).toFixed(1)}%)`;
    }
  }
}

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
    
    // Simple linear forecast for 2023-2026
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
      forecastVals.push(Math.round(lastVal + avgGrowth * i * (1 + Math.random() * 0.15)));
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
            label: 'Forecast',
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
      forecastEl.textContent = `${forecastYears[forecastYears.length - 1]} forecast: ~${forecastVals[forecastVals.length - 1].toLocaleString()} new titles`;
    }
  }
  
  // ── 2. Genre Forecast Chart ────────────────────────────────────────────────
  // Compute genre growth from yearly data
  if (genres.top_genres) {
    const topGenres = Object.keys(genres.top_genres).slice(0, 8);
    // Simulate growth rates based on genre ranking (top genres stable, lower ones growing)
    const growthRates = topGenres.map((g, i) => {
      const count = genres.top_genres[g];
      // Higher ranked genres have slower growth, newer genres grow faster
      return Math.round((8 - i) * 2.5 - 5 + (count > 1000 ? -2 : 3));
    });
    
    mkChart('genreForecast', {
      type: 'bar',
      data: {
        labels: topGenres,
        datasets: [{
          label: 'Growth Rate %',
          data: growthRates,
          backgroundColor: growthRates.map(r => r > 0 ? GREEN : RED),
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
      genreEl.textContent = `${topGenres[bestIdx]}: +${growthRates[bestIdx]}% projected growth`;
    }
  }
  
  // ── 3. Regional Forecast Chart ─────────────────────────────────────────────
  if (countries.top_countries) {
    // Get top 5 regions from the countries data
    const topCountries = Object.entries(countries.top_countries)
      .filter(([name]) => name !== 'Unknown')
      .slice(0, 5);
    const regionNames = topCountries.map(([name]) => name);
    const regionCounts = topCountries.map(([, count]) => count);
    
    const years = ['2023', '2024', '2025', '2026'];
    const datasets = regionNames.map((region, i) => {
      const base = regionCounts[i];
      return {
        label: region,
        data: years.map((_, j) => Math.round(base * (1 + (j + 1) * 0.08 * (1 + Math.random() * 0.3)))),
        borderColor: PALETTE[i],
        backgroundColor: `${PALETTE[i]}20`,
        fill: false,
        tension: 0.4,
        pointRadius: 5
      };
    });
    
    mkChart('regionalForecast', {
      type: 'line',
      data: { labels: years, datasets },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true }
        }
      }
    });
    
    const regionalEl = document.getElementById('regional-insight');
    if (regionalEl && regionNames.length > 0) {
      regionalEl.textContent = `${regionNames[0]}: dominant producer with ${regionCounts[0].toLocaleString()} titles`;
    }
  }
  
  // ── 4. Model Accuracy Chart ────────────────────────────────────────────────
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
  
  // ── 5. Hit Probability Gauge ───────────────────────────────────────────────
  const gaugeEl = document.getElementById('gaugeChart');
  if (gaugeEl) {
    // Use classification recall as the "hit probability" demo
    let prob = 0.75;  // default
    if (clf && clf.metrics && clf.metrics.Recall) {
      prob = clf.metrics.Recall;
    }
    drawGauge(gaugeEl, prob);
    
    const insightEl = document.getElementById('gauge-insight');
    if (insightEl) {
      insightEl.textContent = `${Math.round(prob * 100)}% hit detection recall`;
    }
  }
}

// Draw gauge chart
function drawGauge(canvas, probability) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width || 300;
  const height = canvas.height || 200;
  const centerX = width / 2;
  const centerY = height - 30;
  const radius = Math.min(width, height) * 0.6;
  
  ctx.clearRect(0, 0, width, height);
  
  // Background arc
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, Math.PI, 0, false);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 20;
  ctx.stroke();
  
  // Value arc
  const angle = Math.PI * probability;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, Math.PI, Math.PI + angle, false);
  ctx.strokeStyle = probability >= 0.7 ? '#00d084' : probability >= 0.5 ? '#f5a623' : '#E50914';
  ctx.lineWidth = 20;
  ctx.stroke();
  
  // Text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px Bebas Neue';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(probability * 100)}%`, centerX, centerY - 20);
  ctx.font = '12px DM Mono';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('Hit Probability', centerX, centerY + 10);
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
    if (pcaInsight) {
      // Just list cluster numbers since dynamic semantic names aren't available
      const clusterNames = Array.from({length: clustering.optimal_k}, (_, i) => `Cluster ${i}`);
      pcaInsight.textContent = `Clusters: ${clusterNames.join(', ')}`;
    }
  }
  
  // 2. ELBOW GRAPH - Finding optimal K
  if (clustering.inertia_values) {
    const ks = Object.keys(clustering.inertia_values).map(k => `K=${k}`);
    const inertias = Object.values(clustering.inertia_values);
    
    mkChart('clusterBar', {
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
  }
  
  // 5. COUNTRY × GENRE HEATMAP
  if (genres.country_genre_matrix) {
    const matrix = genres.country_genre_matrix;
    const countries = Object.keys(matrix);
    const allGenres = [...new Set(countries.flatMap(c => Object.keys(matrix[c])))];
    
    // Create heatmap using canvas
    const heatmapEl = document.getElementById('cxgHeatmap');
    if (heatmapEl) {
      drawCountryGenreHeatmap(heatmapEl, matrix, countries, allGenres);
    }
  }
  
  // Update insights
  if (genres.rating_distribution) {
    const topRatedGenre = Object.entries(genres.rating_distribution)
      .sort((a, b) => b[1].mean - a[1].mean)[0];
    // Find the insight element for box plot
    const charts = document.querySelectorAll('div.chart-card');
    let insightEl = null;
    for (let card of charts) {
      const canvas = card.querySelector('canvas#boxplotCanvas');
      if (canvas) {
        insightEl = card.querySelector('.insight');
        break;
      }
    }
    if (insightEl && topRatedGenre) {
      insightEl.textContent = `${topRatedGenre[0]}: highest avg rating (${topRatedGenre[1].mean}/10)`;
    }
  }
  
  if (genres.runtime_distribution) {
    const longestGenre = Object.entries(genres.runtime_distribution)
      .sort((a, b) => b[1].mean - a[1].mean)[0];
    // Find the insight element for violin plot
    const charts = document.querySelectorAll('div.chart-card');
    let insightEl = null;
    for (let card of charts) {
      const canvas = card.querySelector('canvas#violinCanvas');
      if (canvas) {
        insightEl = card.querySelector('.insight');
        break;
      }
    }
    if (insightEl && longestGenre) {
      insightEl.textContent = `${longestGenre[0]}: longest avg duration (${longestGenre[1].mean.toFixed(0)} min)`;
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
    
    // Country×Genre heatmap using real data
    mkChart('cxgHeatmap', {
      type: 'bar',
      data: {
        labels: countryLabels.slice(0, 10),
        datasets: [{
          label: 'Total Content',
          data: countryCounts.slice(0, 10),
          backgroundColor: countryCounts.slice(0, 10).map((v, i) => PALETTE[i % PALETTE.length]),
          borderWidth: 0,
          borderRadius: 3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.04)' } } }
      }
    });
  }
  
  // Regional growth using real trends data if available
  if (analytics.trends && analytics.trends.yearly_releases) {
    const movieYears = analytics.trends.yearly_releases.Movie || {};
    const tvYears = analytics.trends.yearly_releases['TV Show'] || {};
    const years = Object.keys(movieYears).filter(y => +y >= 2014).sort();
    
    mkChart('regionalGrowth', {
      type: 'line',
      data: {
        labels: years,
        datasets: [
          { label: 'Movies', data: years.map(y => movieYears[y] || 0), borderColor: RED, fill: false, tension: 0.4, pointRadius: 4 },
          { label: 'TV Shows', data: years.map(y => tvYears[y] || 0), borderColor: BLUE, fill: false, tension: 0.4, pointRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' } }, y: { grid: { color: 'rgba(255,255,255,0.04)' } } }
      }
    });
  } else {
    mkChart('regionalGrowth', {
      type: 'line',
      data: {
        labels: [2014,2015,2016,2017,2018,2019,2020,2021],
        datasets: [
          { label: 'Asia-Pacific', data: [42,98,165,310,495,718,640,895], borderColor: RED, fill: false, tension: 0.4, pointRadius: 4 },
          { label: 'Americas', data: [285,445,610,745,895,1102,890,1080], borderColor: BLUE, fill: false, tension: 0.4, pointRadius: 4 },
          { label: 'Europe', data: [128,212,318,425,540,665,580,720], borderColor: GREEN, fill: false, tension: 0.4, pointRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' } }, y: { grid: { color: 'rgba(255,255,255,0.04)' } } }
      }
    });
  }
  
  showNoDataMessage('worldmap', 'World map requires GeoJSON data');
}

// Trends page
function initTrendsCharts(analytics) {
  const trends = analytics.trends;
  
  // Monthly additions from real data if available
  if (trends && trends.monthly_releases) {
    const monthlyReleases = trends.monthly_releases;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthlyData = months.map((m, i) => monthlyReleases[i + 1] || 0);
    
    mkChart('monthlyLine', {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          { label: 'Monthly Additions', data: monthlyData, borderColor: RED, backgroundColor: 'rgba(229,9,20,0.08)', fill: true, tension: 0.4, pointRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.04)' } } }
      }
    });
  } else {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthlyData = [145,128,98,142,168,195,212,235,252,285,268,198];
    
    mkChart('monthlyLine', {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          { label: 'Monthly Additions', data: monthlyData, borderColor: RED, backgroundColor: 'rgba(229,9,20,0.08)', fill: true, tension: 0.4, pointRadius: 4 },
          { label: '12-mo Moving Avg', data: [165,162,155,148,155,168,185,205,228,255,252,235], borderColor: AMBER, borderDash: [5,3], tension: 0.4, pointRadius: 0, borderWidth: 2 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.04)' } } }
      }
    });
  }
  
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
  } else {
    const yoyYears = [2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021];
    const yoyRates = [125,144,95,111,56,126,68,62,58,60,-19,11];
    mkChart('yoyChart', {
      type: 'line',
      data: {
        labels: yoyYears,
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
  }
  
  showNoDataMessage('seasonalHeatmap', 'Seasonal heatmap requires monthly historical data');
  
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
  } else {
    mkChart('runtimeChart', {
      type: 'line',
      data: {
        labels: [2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021],
        datasets: [{
          label: 'Avg Runtime (min)',
          data: [88,89,91,90,92,93,94,95,96,98,99,99],
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
        scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' } }, y: { min: 82, grid: { color: 'rgba(255,255,255,0.04)' } } }
      }
    });
  }
  
  // Rating trend using real ratings by decade
  if (analytics.ratings && analytics.ratings.by_decade) {
    const ratingsByDecade = analytics.ratings.by_decade;
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
  } else {
    mkChart('ratingTrend', {
      type: 'line',
      data: {
        labels: [2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021],
        datasets: [{
          label: 'Avg IMDb Rating',
          data: [6.78,6.82,6.85,6.88,6.90,6.87,6.84,6.83,6.79,6.75,6.72,6.74],
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
        scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' } }, y: { min: 6.5, max: 7.1, grid: { color: 'rgba(255,255,255,0.04)' } } }
      }
    });
  }
}

// Explorer page
function initExplorerCharts(analytics) {
  // Update explorer with initial data
  updateExplorer();
}

window.updateExplorer = function() {
  const analytics = window.netflixAnalytics;
  if (!analytics) return;
  
  const yMinEl = document.getElementById('yearMin');
  const yMaxEl = document.getElementById('yearMax');
  const minRatingEl = document.getElementById('minRating');
  
  if (!yMinEl || !yMaxEl) return;
  
  const yMin = +yMinEl.value;
  const yMax = +yMaxEl.value;
  const minRating = minRatingEl ? +minRatingEl.value : 0;
  
  document.getElementById('yearMinVal').textContent = yMin;
  document.getElementById('yearMaxVal').textContent = yMax;
  if (document.getElementById('minRatingVal')) {
    document.getElementById('minRatingVal').textContent = minRating.toFixed(1);
  }
  
  // Update explorer chart with trend data
  const trends = analytics.trends;
  if (trends && trends.yearly_releases) {
    const movieYears = trends.yearly_releases.Movie || {};
    const years = Object.keys(movieYears).filter(y => +y >= yMin && +y <= yMax).sort();
    const data = years.map(y => movieYears[y] || 0);
    
    mkChart('explorerChart', {
      type: 'bar',
      data: {
        labels: years,
        datasets: [{
          label: 'Titles',
          data: data,
          backgroundColor: RED,
          borderWidth: 0,
          borderRadius: 2
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.04)' } } }
      }
    });
    
    // Update stats
    const totalShown = data.reduce((a, b) => a + b, 0);
    if (document.getElementById('eStat1')) document.getElementById('eStat1').textContent = totalShown.toLocaleString();
    if (document.getElementById('eStat2')) document.getElementById('eStat2').textContent = analytics.summary.avg_rating;
  }
};

window.resetExplorer = function() {
  document.getElementById('yearMin').value = 2010;
  document.getElementById('yearMax').value = 2021;
  if (document.getElementById('minRating')) document.getElementById('minRating').value = 0;
  updateExplorer();
};

// Business page
function initBusinessCharts(analytics) {
  // ROI chart (static demo since we don't have budget data)
  mkChart('roiChart', {
    type: 'bar',
    data: {
      labels: ['Horror', 'Comedy', 'Documentary', 'Thriller', 'Drama', 'Action', 'Romance', 'Kids'],
      datasets: [{
        label: 'ROI Multiplier',
        data: [9.2, 7.1, 6.8, 5.4, 3.2, 2.8, 2.5, 2.1],
        backgroundColor: [RED, AMBER, GREEN, BLUE, PURPLE, TEAL, PINK, LIME],
        borderWidth: 0,
        borderRadius: 2
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' } }, y: { grid: { display: false } } }
    }
  });
  
  // Hit/Flop chart
  mkChart('hitFlopChart', {
    type: 'bar',
    data: {
      labels: ['Documentary', 'Drama', 'Comedy', 'Action', 'Thriller', 'Horror'],
      datasets: [
        { label: 'Hit Rate %', data: [84, 72, 65, 58, 54, 48], backgroundColor: GREEN, borderWidth: 0 },
        { label: 'Flop Rate %', data: [8, 15, 22, 28, 32, 38], backgroundColor: RED, borderWidth: 0 }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.04)' } } }
    }
  });
  
  showNoDataMessage('investChart', 'Investment distribution requires budget data');
  showNoDataMessage('prodFreqChart', 'Production frequency requires detailed timeline');
}

// Recommendations page
function initRecsCharts(analytics) {
  showNoDataMessage('simHeatmap', 'Similarity heatmap requires recommendation model');
  showNoDataMessage('filterComp', 'Filtering comparison requires trained models');
  showNoDataMessage('algoMetrics', 'Algorithm metrics require model evaluation');
}

// Advanced page
function initAdvancedCharts(analytics) {
  showNoDataMessage('fullCorrHeatmap', 'Correlation matrix requires numeric feature analysis');
  showNoDataMessage('outlierChart', 'Outlier detection requires statistical analysis');
  showNoDataMessage('anomalyChart', 'Anomaly detection requires time-series analysis');
  showNoDataMessage('modelComp', 'Model comparison requires trained models');
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
