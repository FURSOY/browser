// --- START OF FILE mainView.js ---

console.log("mainView.js yüklendi");

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

// --- Klavye Kısayolu: F12 ile DevTools ---
document.addEventListener('keydown', (event) => {
    if (event.key === 'F12') {
        event.preventDefault();
        console.log("F12 tuşuna basıldı, DevTools toggle ediliyor");
        window.bridge.toggleDevTools();
    }
});

// --- END OF FILE mainView.js ---