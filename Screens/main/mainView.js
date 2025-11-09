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