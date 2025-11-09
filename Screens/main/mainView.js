let notificationTimeout;

function showNotification(message, time) {
    const container = document.getElementById('notification-container');
    const messageEl = document.getElementById('notification-message');
    const closeBtn = document.getElementById('notification-close-btn');

    if (!container || !messageEl || !closeBtn) {
        console.error('Bildirim için gerekli HTML elementleri bulunamadı.');
        return;
    }
    messageEl.textContent = message;
    container.removeAttribute('hidden');

    clearTimeout(notificationTimeout);

    if (time > 0) {
        notificationTimeout = setTimeout(() => {
            container.setAttribute('hidden', '');
        }, time);
    }

    closeBtn.onclick = () => {
        clearTimeout(notificationTimeout);
        container.setAttribute('hidden', '');
        messageEl.textContent = "";
    };
}

window.bridge.onShowNotification((event, message) => {
    showNotification(message);
});

// document.addEventListener('DOMContentLoaded', () => {
//     setTimeout(() => {
//         showNotification('Bu bir test bildirimidir!', 0);
//     }, 3000);
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