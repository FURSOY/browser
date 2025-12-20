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
            // İndirme %0 veya %100 olduğunda (butonu göstermek için bekliyor veya gizleniyor)
            // Eğer percent 0 ise veya 100 ise (ama henüz update-ready-to-install gelmediyse)
            // indirme alanını pasif yap ve tüm indirme elemanlarını gizle.
            // update-ready-to-install geldiğinde buton görünecek.
            downloadStatusArea.classList.remove('active');
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

    // --- Profile Section Logic ---
    const profileBtn = document.getElementById('profile-btn');
    const accountPopup = document.getElementById('account-popup');
    const loginGoogleBtn = document.getElementById('login-google-btn');
    const manageAccountBtn = document.getElementById('manage-account-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userNameEl = document.getElementById('user-name');
    const userEmailEl = document.getElementById('user-email');

    if (profileBtn && accountPopup) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            accountPopup.classList.toggle('active');
            checkAccountStatus();
        });

        document.addEventListener('click', (e) => {
            if (!accountPopup.contains(e.target) && !profileBtn.contains(e.target)) {
                accountPopup.classList.remove('active');
            }
        });
    }

    if (loginGoogleBtn) {
        loginGoogleBtn.addEventListener('click', () => {
            window.bridge.loginGoogle();
            accountPopup.classList.remove('active');
        });
    }

    if (manageAccountBtn) {
        manageAccountBtn.addEventListener('click', () => {
            window.bridge.manageGoogle();
            accountPopup.classList.remove('active');
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.bridge.logoutGoogle();
            accountPopup.classList.remove('active');
            setTimeout(checkAccountStatus, 1000);
        });
    }

    async function checkAccountStatus() {
        if (!window.bridge.checkLoginStatus) return;

        const status = await window.bridge.checkLoginStatus();
        const defaultAvatar = "https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png";

        if (status.logged) {
            userNameEl.textContent = status.name || "Google Hesabı Bağlı";
            userEmailEl.textContent = status.email || "Oturum açık";
            loginGoogleBtn.style.display = 'none';
            logoutBtn.style.display = 'block';

            const avatarUrl = status.photo || defaultAvatar;
            document.getElementById('user-avatar').src = avatarUrl;
            document.getElementById('popup-avatar').src = avatarUrl;
        } else {
            userNameEl.textContent = "Oturum Açılmadı";
            userEmailEl.textContent = "Google hesabınızla giriş yapın";
            loginGoogleBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
            document.getElementById('user-avatar').src = defaultAvatar;
            document.getElementById('popup-avatar').src = defaultAvatar;
        }
    }

    // Initial check
    checkAccountStatus();

    // --- Favorites Logic ---
    const favoritesContainer = document.getElementById('favorites-container');

    async function renderFavorites() {
        if (!favoritesContainer || !window.bridge.getFavorites) return;

        const favorites = await window.bridge.getFavorites();
        favoritesContainer.innerHTML = '';

        favorites.forEach(fav => {
            const item = document.createElement('div');
            item.className = 'favorite-item';
            item.setAttribute('data-title', fav.title);

            const img = document.createElement('img');
            img.src = fav.icon || 'https://www.google.com/s2/favicons?sz=64&domain_url=' + fav.url;
            img.onerror = () => { img.src = '../../../assets/icon.ico'; };

            item.appendChild(img);
            item.onclick = () => window.bridge.navigateTo(fav.url);

            favoritesContainer.appendChild(item);
        });
    }

    if (window.bridge.onFavoritesUpdated) {
        window.bridge.onFavoritesUpdated(() => {
            renderFavorites();
        });
    }

    // Load initial favorites
    renderFavorites();
} else {
    console.error('window.bridge bulunamadı! searchPreload.js yüklenmemiş olabilir.');
}