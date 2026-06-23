// src/view/uiTimer.js
let timerId = null;
let startTime = 0;

module.exports = {
    start: (timerEl, recoveredTime) => {
        if (timerId) clearInterval(timerId);
        startTime = recoveredTime ? recoveredTime : Date.now();
        timerId = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const min = String(Math.floor(elapsed / 60)).padStart(2, '0');
            const sec = String(elapsed % 60).padStart(2, '0');
            if (timerEl) timerEl.innerText = `${min}:${sec}`;
        }, 1000);
    },
    stop: (timerEl, isReset = false) => {
        if (timerId) { 
            clearInterval(timerId); 
            timerId = null; 
        }
        if (isReset && timerEl) {
            timerEl.innerText = '00:00';
        }
    }
};