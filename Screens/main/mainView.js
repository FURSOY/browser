// Bildirimleri yönetmek için yeni bir yapı
const MAX_NOTIFICATIONS = 3; // Aynı anda gösterilecek maksimum bildirim sayısı

function createNotificationElement(message, id) {
    const notificationEl = document.createElement('div');
    notificationEl.id = id;
    notificationEl.classList.add('notification-item');
    notificationEl.innerHTML = `
        <p class="notification-message">${message}</p>
        <button class="notification-close-btn">X</button>
    `;

    const closeBtn = notificationEl.querySelector('.notification-close-btn');
    closeBtn.onclick = () => {
        notificationEl.remove();
        // Eğer bu bildirim için bir timeout varsa onu da temizle
        const timeoutId = notificationEl.dataset.timeoutId;
        if (timeoutId) {
            clearTimeout(parseInt(timeoutId));
        }
    };
    return notificationEl;
}

window.bridge.onShowNotification((event, { message, autoHide }) => {
    const notificationsList = document.getElementById('notifications-list');
    if (!notificationsList) {
        console.error('Bildirim listesi için gerekli HTML elementi bulunamadı.');
        return;
    }

    // Maksimum bildirim sayısını aşmamak için en eskiyi kaldır
    while (notificationsList.children.length >= MAX_NOTIFICATIONS) {
        notificationsList.removeChild(notificationsList.firstElementChild);
    }

    const notificationId = `notification-${Date.now()}`;
    const notificationEl = createNotificationElement(message, notificationId);
    notificationsList.appendChild(notificationEl);

    // Otomatik gizleme etkinse bir timeout ayarla
    if (autoHide) {
        const timeout = setTimeout(() => {
            notificationEl.remove();
        }, 5000); // 5 saniye sonra kaybolsun
        notificationEl.dataset.timeoutId = timeout; // Timeout ID'yi elemente kaydet
    }
});

// İndirme ilerlemesi için
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

// Versiyon bilgisini göstermek için bu bölüm kaldırıldı, searchView'e taşındı.
// window.bridge.onSetVersion((event, version) => {
//     const versionEl = document.getElementById('version-info');
//     if (versionEl) {
//         versionEl.textContent = `Versiyon: ${version}`;
//     }
// });


// --- Address Bar Logic ---
const addressBar = document.getElementById('address-bar');

if (addressBar) {
    addressBar.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            let input = addressBar.value.trim();
            if (!input) return;

            let url;
            // Heuristic to decide if it's a URL or a search query
            const isUrl = input.includes('.') && !input.includes(' ');

            if (isUrl) {
                url = input;
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url;
                }
            } else {
                url = `https://www.google.com/search?q=${encodeURIComponent(input)}`;
            }

            window.bridge.navigateTo(url);
        }
    });
}

// --- Navigation Buttons Logic ---
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const reloadBtn = document.getElementById('reload-btn');
const homeBtn = document.getElementById('home-btn');

if (backBtn) {
    backBtn.addEventListener('click', () => {
        window.bridge.navBack();
    });
}

if (forwardBtn) {
    forwardBtn.addEventListener('click', () => {
        window.bridge.navForward();
    });
}

if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
        window.bridge.navReload();
    });
}

if (homeBtn) {
    homeBtn.addEventListener('click', () => {
        window.bridge.navHome();
    });
}

// --- Address Bar Sync Logic ---
window.bridge.onURLUpdate((event, url) => {
    if (addressBar) {
        addressBar.value = url;
    }
});