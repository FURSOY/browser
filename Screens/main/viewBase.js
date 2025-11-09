class ViewBase {
    bridge;

    constructor() {
        this.bridge = window.bridge;

        this.attachEvents();
    }

    get(el) {
        return document.querySelector(el);
    }
    getAll(els) {
        return document.querySelectorAll(els);
    }
}

module.exports = ViewBase;