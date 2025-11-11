// Bridge kontrolü ekle
if (window.bridge) {
    // Versiyon bilgisi
    window.bridge.onSetVersion((event, version) => {
        const versionEl = document.getElementById('version-info');
        if (versionEl) {
            versionEl.textContent = `Versiyon: ${version}`;
        }
    });

    // İndirme ilerlemesi
    window.bridge.onUpdateProgress((event, percent) => {
        const progressContainer = document.getElementById('download-progress-container');
        const progressBar = document.getElementById('download-progress-bar');
        const progressText = document.getElementById('download-progress-text');

        if (!progressContainer || !progressBar || !progressText) {
            console.error('İlerleme çubuğu için gerekli HTML elementleri bulunamadı.');
            return;
        }

        if (percent > 0 && percent < 100) {
            progressContainer.classList.add('active');
            progressBar.style.width = percent + '%';
            progressText.textContent = `${percent.toFixed(1)}% İndiriliyor`;
        } else {
            progressContainer.classList.remove('active');
            progressBar.style.width = '0%';
            progressText.textContent = '';
        }
    });

    // Search form
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');

    if (searchForm && searchInput) {
        searchForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const query = searchInput.value.trim();
            if (query) {
                const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                window.bridge.navigateTo(googleUrl);
            }
        });
    }
} else {
    console.error('window.bridge bulunamadı! searchPreload.js yüklenmemiş olabilir.');
}