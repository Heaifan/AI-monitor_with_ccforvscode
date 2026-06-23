// src/cost/legacyAdapter.js
module.exports = {
    bindLegacyMethods: (facade) => {
        let rate = 1.0;
        let price = 0.000001;
        facade.getRate = () => rate;
        facade.setRate = (val) => { rate = val || 1.0; };
        facade.getPrice = () => price;
        facade.setPrice = (val) => { price = val || 0; };

        facade.isOpen = () => false;
        facade.togglePanel = () => {};
        facade.closePanel = () => {};
        facade.toggleCurrency = () => {};
        facade.getHistoryCost = () => 0;

        facade.calculateCostString = (tokens) => {
            const cost = (tokens || 0) * price;
            return `¥${(cost * rate).toFixed(4)}`;
        };
    }
};
