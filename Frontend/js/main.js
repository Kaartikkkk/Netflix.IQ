
// ── PAGE SWITCHING ──
window.showPage = function showPage(id) {
	// Hide all page containers and remove active class from their .page children
	[
		'hero-include',
		'intelligence-include',
		'predictions-include',
		'clustering-include',
		'genres-include',
		'geography-include',
		'trends-include',
		'explorer-include',
		'business-include',
		'advanced-include'
	].forEach(containerId => {
		const el = document.getElementById(containerId);
		if (el) {
			el.style.display = 'none';
			// Remove active class from .page section inside
			const pageSection = el.querySelector('.page');
			if (pageSection) pageSection.classList.remove('active');
		}
	});
	// Remove active class from all nav tabs
	document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
	// Show the selected page container and add active class to its .page section
	const pageMap = {
		dashboard: 'hero-include',
		intelligence: 'intelligence-include',
		predictions: 'predictions-include',
		clustering: 'clustering-include',
		genres: 'genres-include',
		geography: 'geography-include',
		trends: 'trends-include',
		explorer: 'explorer-include',
		business: 'business-include',
		advanced: 'advanced-include'
	};
	const showId = pageMap[id];
	if (showId) {
		const el = document.getElementById(showId);
		if (el) {
			el.style.display = 'block';
			// Add active class to .page section inside
			const pageSection = el.querySelector('.page');
			if (pageSection) pageSection.classList.add('active');
		}
	}
	// Set active class on the selected nav tab
	const tab = document.querySelector(`[data-page="${id}"]`);
	if (tab) tab.classList.add('active');
	window.scrollTo(0, 0);
	// Always allow re-initialization: clear the initialized set for this page
	if (window.initialized && typeof window.initialized.delete === 'function') {
		window.initialized.delete(id);
	}
	// Initialize charts for this page (analytics_dashboard.js provides window.initPage)
	setTimeout(() => { if (typeof window.initPage === 'function') window.initPage(id); }, 100);
}

// Wait for all templates to load, then activate navigation
window.addEventListener('DOMContentLoaded', () => {
	// Always load nav.html first for immediate nav bar rendering
	fetch('/templates/nav.html')
		.then(r => r.text())
		.then(html => {
			document.getElementById('nav-include').innerHTML = html;
		})
		.catch(err => {
			console.error('Failed to load nav.html', err);
		});

	// Wait a bit for fetch-includes to finish
	setTimeout(() => {
		// Default to dashboard/hero page
		showPage('dashboard');
		// Attach click handlers to nav-tabs (delegated)
		document.body.addEventListener('click', function(e) {
			const tab = e.target.closest('.nav-tab[data-page]');
			if (tab) {
				const page = tab.getAttribute('data-page');
				showPage(page);
			}
		});
	}, 300);
});
