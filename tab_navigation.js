// ============================================
// 9. TAB SWITCHING & NAVIGATION
// ============================================

let currentView = 'today';
let currentDate = new Date();
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

// Tab Switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        switchTab(tabName);
    });
});

function switchTab(tabName) {
    currentView = tabName;

    // Update tab UI
    tabs.forEach(t => {
        const isActive = t.dataset.tab === tabName;
        t.classList.toggle('active', isActive);
        t.querySelector('.tab-underline').classList.toggle('active', isActive);
    });

    // Update view visibility
    if (tabName === 'today') {
        todayView.classList.remove('hidden');
        yearView.classList.add('hidden');
    } else {
        todayView.classList.add('hidden');
        yearView.classList.remove('hidden');
        generate365Grid();
    }
}

// ============================================
// 10. SWIPE NAVIGATION (Today View)
// ============================================

todayView.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
});

todayView.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const touchDuration = Date.now() - touchStartTime;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Swipe detection (horizontal > 50px, duration < 300ms)
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) && touchDuration < 300) {
        if (deltaX > 0) {
            // Right swipe → Next day (only up to today)
            navigateToNextDay();
        } else {
            // Left swipe → Previous day
            navigateToPreviousDay();
        }
    }
    // Tap detection (movement < 10px, duration < 200ms)
    else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && touchDuration < 200) {
        // Check if tap is on word/translation
        const target = e.target;
        if (target.id === 'word' || target.id === 'translation') {
            playWord();
        }
    }
});

function navigateToPreviousDay() {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    currentDate = newDate;
    updateDateDisplay();
    // TODO: Load weather data for this date
}

function navigateToNextDay() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    nextDate.setHours(0, 0, 0, 0);

    // Only allow navigation up to today
    if (nextDate <= today) {
        currentDate = nextDate;
        updateDateDisplay();
        // TODO: Load weather data for this date
    }
}

function updateDateDisplay() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkDate = new Date(currentDate);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate.getTime() === today.getTime()) {
        tempRangeEl.textContent = `today ${currentWeather.temperatureMin}° ${currentWeather.temperatureMax}°`;
    } else {
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        tempRangeEl.textContent = `${month}/${day} ${currentWeather.temperatureMin}° ${currentWeather.temperatureMax}°`;
    }
}

// ============================================
// 11. 365 DAY GRID (1Y View)
// ============================================

function generate365Grid() {
    // Only generate once
    if (yearGrid.children.length > 0) return;

    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    // Generate 365 dots
    for (let i = 0; i < 365; i++) {
        const date = new Date(oneYearAgo);
        date.setDate(date.getDate() + i);

        const dot = document.createElement('div');
        dot.className = 'day-dot';
        dot.dataset.date = date.toISOString().split('T')[0];

        // TODO: Get weather color for this date
        const color = getRandomWeatherColor();
        dot.style.backgroundColor = color;

        // Click handler
        dot.addEventListener('click', () => {
            currentDate = new Date(date);
            switchTab('today');
            updateDateDisplay();
            // TODO: Load weather data for this date
        });

        yearGrid.appendChild(dot);
    }
}

function getRandomWeatherColor() {
    const colors = [
        '#FFD700', // Clear - Gold
        '#87CEEB', // Cloudy - Sky blue
        '#4682B4', // Rain - Blue
        '#B0E0E6', // Snow - Light blue
        '#708090'  // Other - Gray
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}
