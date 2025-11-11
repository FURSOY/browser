const MAX_NOTIFICATIONS = 3; // Aynı anda gösterilecek maksimum bildirim sayısı

console.log("mainView.js yüklendi");

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
        notificationEl.classList.add('fade-out');
        setTimeout(() => {
            if (notificationEl.parentNode) {
                notificationEl.remove();
            }
        }, 300);

        const timeoutId = notificationEl.dataset.timeoutId;
        if (timeoutId) {
            clearTimeout(parseInt(timeoutId));
        }
    };
    return notificationEl;
}

// Bildirim dinleyici
window.bridge.onShowNotification((event, { message, autoHide }) => {
    console.log("Bildirim alındı:", message, "autoHide:", autoHide);

    const notificationsList = document.getElementById('notifications-list');
    if (!notificationsList) {
        console.error('notifications-list elementi bulunamadı!');
        return;
    }

    console.log("Bildirim listesi bulundu, bildirim ekleniyor...");

    // Maksimum bildirim sayısını aşmamak için en eskiyi kaldır
    while (notificationsList.children.length >= MAX_NOTIFICATIONS) {
        const oldestNotification = notificationsList.firstElementChild;
        if (oldestNotification) {
            oldestNotification.classList.add('fade-out');
            setTimeout(() => {
                if (oldestNotification.parentNode) {
                    oldestNotification.remove();
                }
            }, 300);
        }
    }

    const notificationId = `notification-${Date.now()}`;
    const notificationEl = createNotificationElement(message, notificationId);
    notificationsList.appendChild(notificationEl);

    console.log("Bildirim eklendi:", notificationId);

    // Otomatik gizleme etkinse bir timeout ayarla
    if (autoHide) {
        const timeout = setTimeout(() => {
            notificationEl.classList.add('fade-out');
            setTimeout(() => {
                if (notificationEl.parentNode) {
                    notificationEl.remove();
                }
            }, 300);
        }, 5000); // 5 saniye sonra kaybolsun
        notificationEl.dataset.timeoutId = timeout;
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

// --- Progress Bar Logic ---
window.bridge.onUpdateProgress((event, percent) => {
    console.log(`Manager received progress: ${percent}%`);
});

// --- Version Info Logic ---
window.bridge.onSetVersion((event, version) => {
    console.log(`Manager received version: ${version}`);
});

console.log("mainView.js tamamen yüklendi ve çalışıyor");