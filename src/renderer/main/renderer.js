// --- Tab Management Logic ---
const tabsList = document.getElementById('tabs-list');
const newTabBtn = document.getElementById('new-tab-btn');

let tabs = [];
let activeTabId = null;

// New Tab Button
if (newTabBtn) {
    newTabBtn.addEventListener('click', () => {
        window.bridge.newTab();
    });
}

function renderTabs() {
    if (!tabsList) return;
    tabsList.innerHTML = '';

    tabs.forEach(tab => {
        const tabEl = document.createElement('div');
        tabEl.className = `tab ${tab.id === activeTabId ? 'active' : ''}`;
        tabEl.dataset.id = tab.id;

        const titleEl = document.createElement('span');
        titleEl.className = 'tab-title';
        titleEl.textContent = tab.title || 'New Tab';

        const closeEl = document.createElement('div');
        closeEl.className = 'tab-close';
        closeEl.textContent = '✕';
        closeEl.onclick = (e) => {
            e.stopPropagation(); // Prevent switching when closing
            window.bridge.closeTab(tab.id);
        };

        tabEl.appendChild(titleEl);
        tabEl.appendChild(closeEl);

        tabEl.onclick = () => {
            window.bridge.switchTab(tab.id);
        };

        tabsList.appendChild(tabEl);
    });

    // Scroll to end (for new tabs)
    // requestAnimationFrame ensures DOM is updated
    requestAnimationFrame(() => {
        tabsList.scrollLeft = tabsList.scrollWidth;
    });
}

// IPC Events for Tabs
window.bridge.onTabCreated((event, { id, title }) => {
    tabs.push({ id, title });
    renderTabs();
});

window.bridge.onTabRemoved((event, id) => {
    tabs = tabs.filter(t => t.id !== id);
    renderTabs();
});

window.bridge.onTabUpdated((event, { id, title }) => {
    const tab = tabs.find(t => t.id === id);
    if (tab) {
        tab.title = title;
        renderTabs();
    }
});

window.bridge.onActiveTabChanged((event, id) => {
    activeTabId = id;
    renderTabs();
});


console.log("mainView.js yüklendi");

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
    // console.log(`Manager received progress: ${percent}%`);
});

// --- Version Info Logic ---
window.bridge.onSetVersion((event, version) => {
    console.log(`MainView received version: ${version}`);
});

console.log("mainView.js tamamen yüklendi ve çalışıyor");

// --- Window Controls Logic ---
const minBtn = document.getElementById('min-btn');
const maxBtn = document.getElementById('max-btn');
const closeBtn = document.getElementById('close-btn');

if (minBtn) {
    minBtn.addEventListener('click', () => {
        window.bridge.minimize();
    });
}

if (maxBtn) {
    maxBtn.addEventListener('click', () => {
        window.bridge.maximize();
    });
}

if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        window.bridge.close();
    });
}

// --- Window State Icons ---
const iconMaximize = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H6V6h12v12z"/></svg>`;
const iconRestore = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M4 8h1v11h11v1H4V8zm4-4h12v12H8V4zm2 2v8h8V6h-8z"/></svg>`;

if (window.bridge.onWindowMaximized) {
    window.bridge.onWindowMaximized(() => {
        if (maxBtn) maxBtn.innerHTML = iconRestore;
    });
}

if (window.bridge.onWindowRestored) {
    window.bridge.onWindowRestored(() => {
        if (maxBtn) maxBtn.innerHTML = iconMaximize;
    });
}

// --- Fullscreen Toggle Logic ---
if (window.bridge.onFullscreenToggle) {
    window.bridge.onFullscreenToggle((event, isFullscreen) => {
        const tabsContainer = document.getElementById('tabs-container');
        const browserControls = document.getElementById('browser-controls');
        const displayStyle = isFullscreen ? 'none' : 'flex';

        if (tabsContainer) tabsContainer.style.display = displayStyle;
        if (browserControls) browserControls.style.display = displayStyle;
    });
}

// --- Klavye Kısayolu: F12 ile DevTools ---
document.addEventListener('keydown', (event) => {
    if (event.key === 'F12') {
        event.preventDefault();
        console.log("F12 tuşuna basıldı, DevTools toggle ediliyor");
        window.bridge.toggleDevTools();
    }
});