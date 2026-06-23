module.exports = {
    truncate: (tbodyEl, maxRows = 50) => {
        if (!tbodyEl) return;
        while (tbodyEl.children.length > maxRows) {
            tbodyEl.removeChild(tbodyEl.firstElementChild);
        }
    }
};