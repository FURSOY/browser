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

// --- Download Manager Logic ---
const downloadsBtn = document.getElementById('downloads-btn');
const downloadsPopup = document.getElementById('downloads-popup');
const downloadsList = document.getElementById('downloads-list');
const downloadsClear = document.getElementById('downloads-clear');

if (downloadsBtn && downloadsPopup) {
    // Toggle Popup
    downloadsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = downloadsPopup.classList.toggle('active');
        window.bridge.setDownloadsMenuState(isActive);
    });

    // Close on Click Outside
    document.addEventListener('click', (e) => {
        if (!downloadsPopup.contains(e.target) && !downloadsBtn.contains(e.target)) {
            if (downloadsPopup.classList.contains('active')) {
                downloadsPopup.classList.remove('active');
                window.bridge.setDownloadsMenuState(false);
            }
        }
    });

    // Clear List
    if (downloadsClear) {
        downloadsClear.addEventListener('click', () => {
            downloadsList.innerHTML = '';
        });
    }
}

// Helper to create item HTML
function createDownloadItemHTML(id, filename, progress = 0, status = 'Başlıyor...', speed = '-- MB/s', isCompleted = false) {
    const item = document.createElement('div');
    item.className = 'download-item';
    item.id = `download-${id}`;

    let metaContent = `
        <span class="status">${status}</span>
        <span class="speed">${speed}</span>
    `;

    let progressContent = `<div class="download-progress-bar"><div class="progress" style="width: ${progress}%; ${isCompleted ? 'background-color: #2ba060;' : ''}"></div></div>`;

    if (isCompleted) {
        progressContent = ''; // Remove progress bar on complete
        metaContent = `<a href="#" class="open-file-link" data-id="${id}">Dosyayı Aç</a>`;
    }

    item.innerHTML = `
        <div class="download-icon">⬇</div>
        <div class="download-info">
            <div class="download-name" title="${filename}">${filename}</div>
            ${progressContent}
            <div class="download-meta">
                ${metaContent}
            </div>
        </div>
    `;

    // Attach click listener for open file
    const link = item.querySelector('.open-file-link');
    if (link) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            window.bridge.openDownload(id);
        });
    }

    return item;
}

// IPC: Set Saved Downloads
if (window.bridge.onSetDownloads) {
    window.bridge.onSetDownloads((event, downloads) => {
        if (!downloadsList) return;
        downloadsList.innerHTML = '';
        downloads.forEach(d => {
            const isCompleted = d.status === 'completed';
            const statusText = isCompleted ? 'Tamamlandı' : 'Başarısız/Yarım';
            const item = createDownloadItemHTML(d.id, d.filename, 100, statusText, '', isCompleted);
            downloadsList.appendChild(item);
        });
    });
}

// IPC: Download Started
if (window.bridge.onDownloadStarted) {
    window.bridge.onDownloadStarted((event, { id, filename }) => {
        if (!downloadsPopup || !downloadsList) return;

        // Auto-open popup
        downloadsPopup.classList.add('active');
        window.bridge.setDownloadsMenuState(true);

        const item = createDownloadItemHTML(id, filename);
        downloadsList.prepend(item);
    });
}

// IPC: Download Progress
if (window.bridge.onDownloadProgress) {
    window.bridge.onDownloadProgress((event, { id, progress, speed, downloaded, total }) => {
        const item = document.getElementById(`download-${id}`);
        if (!item) return;

        const progressBar = item.querySelector('.progress');
        const statusSpan = item.querySelector('.status');
        const speedSpan = item.querySelector('.speed');

        if (progressBar) progressBar.style.width = `${progress}%`;

        // Format bytes
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        };

        if (statusSpan) statusSpan.textContent = `${formatBytes(downloaded)} / ${formatBytes(total)}`;
        if (speedSpan) speedSpan.textContent = speed;
    });
}

// IPC: Download Completed
if (window.bridge.onDownloadCompleted) {
    window.bridge.onDownloadCompleted((event, { id, filename }) => {
        const item = document.getElementById(`download-${id}`);
        if (!item) return;

        // Re-render item as completed
        const newItem = createDownloadItemHTML(id, filename, 100, 'Tamamlandı', '', true);
        downloadsList.replaceChild(newItem, item);
    });
}

// IPC: Download Progress
if (window.bridge.onDownloadProgress) {
    window.bridge.onDownloadProgress((event, { id, progress, speed, downloaded, total }) => {
        const item = document.getElementById(`download-${id}`);
        if (!item) return;

        const progressBar = item.querySelector('.progress');
        const statusSpan = item.querySelector('.status');
        const speedSpan = item.querySelector('.speed');

        if (progressBar) progressBar.style.width = `${progress}%`;

        // Format bytes
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        };

        if (statusSpan) statusSpan.textContent = `${formatBytes(downloaded)} / ${formatBytes(total)}`;
        if (speedSpan) speedSpan.textContent = speed; // Pre-formatted or format here
    });
}

// IPC: Download Completed
if (window.bridge.onDownloadCompleted) {
    window.bridge.onDownloadCompleted((event, { id, filename }) => {
        const item = document.getElementById(`download-${id}`);
        if (!item) return;

        const progressBar = item.querySelector('.progress');
        const statusSpan = item.querySelector('.status');

        if (progressBar) {
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = '#2ba060'; // Green
        }
        if (statusSpan) statusSpan.textContent = 'Tamamlandı';
    });
}