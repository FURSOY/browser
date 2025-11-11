// --- START OF FILE mainView.js ---

const MAX_NOTIFICATIONS = 3; // Aynı anda gösterilecek maksimum bildirim sayısı

function createNotificationElement(message, id) {
    const notificationEl = document.createElement('div');
    notificationEl.id = id;
    notificationEl.classList.add('notification-item');
    // Kapatma butonu class'ı main.css ile uyumlu olmalı
    notificationEl.innerHTML = `
        <p class="notification-message">${message}</p>
        <button class="notification-close-btn">X</button>
    `;

    const closeBtn = notificationEl.querySelector('.notification-close-btn');
    closeBtn.onclick = () => {
        // Animasyon için fade-out class'ı ekleyip sonra kaldır
        notificationEl.classList.add('fade-out');
        setTimeout(() => {
            if (notificationEl.parentNode) {
                notificationEl.remove();
            }
        }, 300); // Animasyon süresi (0.3s) kadar beklet

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
        // En eski bildirim elementini al ve animasyonla kaldır
        const oldestNotification = notificationsList.firstElementChild;
        if (oldestNotification) {
            oldestNotification.classList.add('fade-out');
            setTimeout(() => {
                if (oldestNotification.parentNode) {
                    oldestNotification.remove();
                }
            }, 300); // Animasyon süresi kadar beklet
        }
    }

    const notificationId = `notification-${Date.now()}`;
    const notificationEl = createNotificationElement(message, notificationId);
    notificationsList.appendChild(notificationEl);

    // Otomatik gizleme etkinse bir timeout ayarla
    if (autoHide) {
        const timeout = setTimeout(() => {
            // Otomatik kapanmada da animasyon kullan
            notificationEl.classList.add('fade-out');
            setTimeout(() => {
                if (notificationEl.parentNode) {
                    notificationEl.remove();
                }
            }, 300); // Animasyon süresi kadar beklet
        }, 5000); // 5 saniye sonra kaybolsun
        notificationEl.dataset.timeoutId = timeout; // Timeout ID'yi elemente kaydet
    }
});


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

// --- Progress Bar Logic (manager.html içinde yok, bu yüzden bu kısım etkisiz) ---
// Not: search.html içindeki ilerleme çubuğu için searchView.js kullanılacak.
// manager.html'e bir ilerleme çubuğu eklemek isterseniz burayı kullanabilirsiniz.
window.bridge.onUpdateProgress((event, percent) => {
    // Eğer manager.html'de bir ilerleme çubuğu elementi varsa, burada güncellenir.
    // Şimdilik manager.html'de böyle bir element olmadığı için bu kısım pasif kalacak.
    console.log(`Manager received progress: ${percent}%`);
});

// --- Version Info Logic (manager.html içinde yok, bu yüzden bu kısım etkisiz) ---
// Not: search.html içindeki versiyon bilgisi için searchView.js kullanılacak.
window.bridge.onSetVersion((event, version) => {
    // Eğer manager.html'de bir versiyon bilgisi elementi varsa, burada güncellenir.
    console.log(`Manager received version: ${version}`);
});

// --- END OF FILE mainView.js ---