module.exports = {
    play: () => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;
        const strike = (freq, sTime, vol) => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, sTime);
            gain.gain.setValueAtTime(vol, sTime); gain.gain.exponentialRampToValueAtTime(0.001, sTime + 0.3);
            osc.connect(gain); gain.connect(ctx.destination); osc.start(sTime); osc.stop(sTime + 0.3);
        };
        strike(2800, now, 0.4); strike(3400, now + 0.06, 0.35); strike(4000, now + 0.12, 0.3);
    }
};