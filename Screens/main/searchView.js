// Versiyon bilgisi şimdi search.html'de gösterilecek
window.bridge.onSetVersion((event, version) => {
    const versionEl = document.getElementById('version-info');
    if (versionEl) {
        versionEl.textContent = `Versiyon: ${version}`;
    }
});

const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');

searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        window.bridge.navigateTo(googleUrl);
    }
});