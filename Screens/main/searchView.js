// Bridge kontrolü ekle
if (window.bridge) {
    // Versiyon bilgisi
    window.bridge.onSetVersion((event, version) => {
        const versionEl = document.getElementById('version-info');
        if (versionEl) {
            versionEl.textContent = `Versiyon: ${version}`;
            console.log(`searchView.js received version: ${version}`); // Konsola yazdırarak teyit et
        }
    });

    // İndirme ilerlemesi ve yeniden başlatma butonu yönetimi
    const downloadStatusArea = document.getElementById('download-status-area');
    const progressBar = document.getElementById('download-progress-bar');
    const progressText = document.getElementById('download-progress-text');
    const restartButton = document.getElementById('restart-button');

    // İlerleme güncellemesi
    window.bridge.onUpdateProgress((event, percent) => {
        if (!downloadStatusArea || !progressBar || !progressText || !restartButton) {
            console.error('İlerleme çubuğu veya yeniden başlatma butonu için gerekli HTML elementleri bulunamadı.');
            return;
        }

        if (percent > 0 && percent < 100) {
            downloadStatusArea.classList.add('active');
            progressBar.style.width = percent + '%';
            progressText.textContent = `${percent.toFixed(1)}% İndiriliyor`;
            progressBar.style.display = 'block'; // İlerleme çubuğunu göster
            progressText.style.display = 'block'; // Metni göster
            restartButton.style.display = 'none'; // Butonu gizle
        } else {
            // İndirme %0 veya %100 olduğunda (butonu göstermek için bekliyor)
            downloadStatusArea.classList.remove('active'); // Alanı gizle
            progressBar.style.width = '0%';
            progressText.textContent = '';
            progressBar.style.display = 'none';
            progressText.style.display = 'none';
            restartButton.style.display = 'none';
        }
    });

    // Güncelleme hazır olduğunda yeniden başlatma butonunu göster
    window.bridge.onUpdateReadyToInstall(() => {
        if (downloadStatusArea && progressBar && progressText && restartButton) {
            downloadStatusArea.classList.add('active'); // Alanı aktif yap
            progressBar.style.display = 'none'; // İlerleme çubuğunu gizle
            progressText.style.display = 'none'; // İlerleme metnini gizle
            restartButton.style.display = 'block'; // Yeniden başlat butonunu göster
            console.log('Update ready, showing restart button.');
        }
    });

    // Yeniden başlat butonuna tıklama olayı
    if (restartButton) {
        restartButton.addEventListener('click', () => {
            console.log('Yeniden başlat butonuna tıklandı.');
            window.bridge.restartApp(); // Main sürecine yeniden başlatma mesajı gönder
        });
    }

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