// ============================================
// BRITISH ENGLISH LEARNING APP
// Location-Aware Vocabulary with Weather Context
// ============================================

'use strict';

// ============================================
// 0. CONFIGURATION
// ============================================

const API_CONFIG = {
    geocoding: 'https://nominatim.openstreetmap.org/reverse',
    weather: 'https://api.open-meteo.com/v1/forecast'
};

// DOM Elements
const dateDisplayEl = document.getElementById('dateDisplay');
const locationTextEl = document.getElementById('locationText');
const temperatureEl = document.getElementById('temperature');
const weatherIconEl = document.getElementById('weatherIcon');
const wordEl = document.getElementById('word');
const translationEl = document.getElementById('translation');

// Tab Elements
const tabs = document.querySelectorAll('.tab');
const todayView = document.getElementById('todayView');
const yearView = document.getElementById('yearView');
const yearGrid = document.getElementById('yearGrid');

// ============================================
// 1. DYNAMIC BACKGROUND & TEXT COLOR
// ============================================

// Helper: HSL to Hex
function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

// Helper: Get Theme for a specific date
// Helper: Get Theme for a specific date
function getThemeForDate(date) {
    // Seed from date
    const dateSeed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

    // Extended Pastel Palette (Cool Tones + Complementary)
    // Matches the vibe of: #B7D3F2, #AFAFDC, #8A84E2 (Cool Blues/Purples)
    const palette = [
        '#B7D3F2', '#AFAFDC', '#8A84E2', '#84AFE6', '#79BEEE', // Original 5
        '#C7CEEA', // Lavender
        '#B5EAD7', // Mint
        '#E2F0CB', // Pale Lime
        '#FFDAC1', // Peach
        '#FFB7B2', // Soft Coral
        '#FF9AA2', // Light Pink
        '#97C1A9', // Sage Green
        '#80CED7', // Aqua
        '#6EF9F5', // Bright Cyan
        '#A0E7E5', // Ice Blue
        '#B4F8C8', // Light Mint
        '#FBE7C6', // Cream
        '#FFAEBC', // Rose
        '#D4F0F0', // Pale Cyan
        '#8FCACA', // Muted Teal
        '#CCE2CB', // Moss Green
        '#F6EAC2', // Pale Yellow
        '#FFC8A2', // Orange Sherbet
        '#E0BBE4', // Mauve
        '#957DAD'  // Dusty Purple
    ];

    // Pick color based on date
    const colorIndex = dateSeed % palette.length;
    const bgColor = palette[colorIndex];

    // Always Black Text for these pastel colors
    const textColor = '#000000';

    return { bgColor, textColor };
}

function updateBackgroundColor() {
    const theme = getThemeForDate(currentDate);

    // Apply to CSS variables
    document.documentElement.style.setProperty('--bg-color', theme.bgColor);
    document.documentElement.style.setProperty('--text-color', theme.textColor);
    document.documentElement.style.setProperty('--text-secondary', theme.textColor + 'CC'); // 80% opacity
}

// ============================================
// 2. VOCABULARY DATA
// ============================================

let vocabularyData = [];

async function loadVocabulary() {
    try {
        const response = await fetch(`vocabulary.json?v=${Date.now()}`);
        const data = await response.json();

        // Flatten ALL categories into one big list ("Total Surprise" Mode)
        vocabularyData = [];

        const extractWords = (obj) => {
            Object.values(obj).forEach(value => {
                if (Array.isArray(value)) {
                    vocabularyData.push(...value);
                } else if (typeof value === 'object' && value !== null) {
                    extractWords(value);
                }
            });
        };

        extractWords(data);
        console.log(`✅ Vocabulary loaded: ${vocabularyData.length} words found.`);
    } catch (error) {
        console.error('❌ Vocabulary loading failed:', error);
        throw error;
    }
}

function selectWord() {
    if (!vocabularyData || vocabularyData.length === 0) {
        console.warn('⚠️ Vocabulary data not loaded yet');
        return;
    }

    // Deterministic selection based on date (One word per day)
    const dateSeed = currentDate.getFullYear() * 10000 + (currentDate.getMonth() + 1) * 100 + currentDate.getDate();

    // Use the seed to pick an index from the ENTIRE list
    const pseudoRandom = (dateSeed * 9301 + 49297) % 233280;
    const index = pseudoRandom % vocabularyData.length;

    currentWord = vocabularyData[index];

    if (!currentWord) {
        console.error('❌ Failed to select word');
        return;
    }

    wordEl.textContent = currentWord.word || 'Loading...';
    translationEl.textContent = currentWord.korean || currentWord.definition || '로딩 중...';

    // Log selected word context
    console.log(`📖 Selected: ${currentWord.word} (Temp: ${currentWeather.temperature}°C, Code: ${currentWeather.weatherCode})`);
}

// ============================================
// 3. WEATHER DATA
// ============================================

let currentWeather = {
    temperature: 0,
    temperatureMin: 0,
    temperatureMax: 0,
    weatherCode: 0,
    windSpeed: 0,
    pm25: 0
};
// Store the actual API-fetched weather for today
let realTodayWeather = null;

let currentWord = null;
let isPlaying = false;
let currentUtterance = null;
let currentDate = new Date();

async function getWeatherData() {
    try {
        const position = await getCurrentPosition();
        const { latitude, longitude } = position.coords;

        await getLocationName(latitude, longitude); // Updates locationTextEl internally

        const weatherData = await fetchWeatherData(latitude, longitude);

        // Parse API data into our format
        const parsedWeather = parseWeatherData(weatherData);

        // Save as "Real Today Weather"
        realTodayWeather = { ...parsedWeather };

        // Initial update
        updateAppForDate(currentDate);

        console.log('✅ Weather data loaded');
    } catch (error) {
        console.error('❌ Weather data failed:', error);
        setDefaultWeather();
    }
}

function parseWeatherData(data) {
    return {
        temperature: Math.round(data.current.temperature_2m),
        temperatureMin: Math.round(data.daily.temperature_2m_min[0]),
        temperatureMax: Math.round(data.daily.temperature_2m_max[0]),
        weatherCode: data.current.weather_code,
        windSpeed: data.current.wind_speed_10m,
        pm25: Math.random() * 100 // Mock PM2.5 as API doesn't provide it freely
    };
}

// ---------------------------------------------------------
// NEW: Historical Weather Generator (Mock based on Season)
// ---------------------------------------------------------
function generateHistoricalWeather(date) {
    const month = date.getMonth(); // 0-11

    // Seoul Monthly Temp Averages (Approx)
    // Jan: -2, Feb: 0, Mar: 6, Apr: 13, May: 18, Jun: 22
    // Jul: 25, Aug: 26, Sep: 21, Oct: 14, Nov: 7, Dec: 0
    const montlyTemps = [-2, 0, 6, 13, 18, 22, 25, 26, 21, 14, 7, 0];
    const baseTemp = montlyTemps[month];

    // Random variation (-3 to +3)
    const variance = Math.floor(Math.random() * 7) - 3;
    const temp = baseTemp + variance;

    // Weather Codes based on Season
    // Winter (Dec-Feb): Clear(0), Cloud(3), Snow(71)
    // Spring (Mar-May): Clear(0), Cloud(3), Rain(61)
    // Summer (Jun-Aug): Rain(61), Heavy Rain(63), Cloud(3)
    // Fall (Sep-Nov): Clear(0), Cloud(3)

    let codes = [0, 1, 2, 3]; // Default mainly clear/cloudy

    if (month === 11 || month === 0 || month === 1) {
        // Winter
        codes = [0, 1, 3, 71, 73, 0, 0]; // Higher chance of clear/snow
    } else if (month >= 5 && month <= 7) {
        // Summer
        codes = [0, 3, 61, 63, 80, 51]; // Rain common
    }

    const randomCode = codes[Math.floor(Math.random() * codes.length)];

    return {
        temperature: temp,
        temperatureMin: temp - 5,
        temperatureMax: temp + 5,
        weatherCode: randomCode,
        windSpeed: Math.floor(Math.random() * 10),
        pm25: Math.floor(Math.random() * 50)
    };
}

function updateAppForDate(date) {
    // 1. Determine Weather
    const isToday = isSameDay(date, new Date());

    if (isToday && realTodayWeather) {
        currentWeather = { ...realTodayWeather };
        console.log(`📅 Date is TODAY. Using Real Weather: ${currentWeather.temperature}°C`);
    } else {
        // Generate mock history
        currentWeather = generateHistoricalWeather(date);
        console.log(`📅 Date is PAST/FUTURE. Generated Weather: ${currentWeather.temperature}°C`);
    }

    // 2. Select Word (Context-based)
    selectWord();

    // 3. Update UI
    updateWeatherUI();
    updateDateDisplay();
    updateBackgroundColor();
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            maximumAge: 300000
        });
    });
}

async function getLocationName(lat, lon) {
    try {
        // Only fetch if not already set or simple default
        if (locationTextEl.textContent !== 'Location...') return;

        const url = `${API_CONFIG.geocoding}?lat=${lat}&lon=${lon}&format=json&accept-language=en`;
        const response = await fetch(url);
        const data = await response.json();

        const city = data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.county ||
            'Seoul';

        // We'll just stick to "Seoul, Korea" as requested mostly, 
        // but let's allow dynamic if valid logic exists. 
        // For now adhering to existing behavior usually.
        locationTextEl.textContent = 'Seoul, Korea';
        return 'Seoul, Korea';
    } catch (error) {
        console.error('Location name fetch failed:', error);
        locationTextEl.textContent = 'Seoul, Korea';
        return 'Seoul, Korea';
    }
}

async function fetchWeatherData(lat, lon) {
    const url = `${API_CONFIG.weather}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather API failed');
    return await response.json();
}

function setDefaultWeather() {
    const defaultData = {
        temperature: 20, temperatureMin: 15, temperatureMax: 25,
        weatherCode: 0, windSpeed: 10, pm25: 30
    };
    realTodayWeather = defaultData;
    currentWeather = defaultData;

    locationTextEl.textContent = 'Seoul, Korea';
    updateAppForDate(currentDate);
}

function updateWeatherUI() {
    const { temperature, weatherCode } = currentWeather;
    temperatureEl.textContent = `${temperature}°`;
    updateWeatherIcon(weatherCode);
}

function updateDateDisplay() {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');

    dateDisplayEl.textContent = `${year}.${month}.${day}`;
}

function updateWeatherIcon(code) {
    if (!weatherIconEl) return;

    weatherIconEl.innerHTML = '';
    let iconPath = '';

    // Feather Icons SVGs
    const icons = {
        sun: `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`,
        cloud: `<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>`,
        cloudRain: `<line x1="16" y1="13" x2="16" y2="21"></line><line x1="8" y1="13" x2="8" y2="21"></line><line x1="12" y1="15" x2="12" y2="23"></line><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path>`,
        cloudSnow: `<path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"></path><line x1="8" y1="16" x2="8.01" y2="16"></line><line x1="8" y1="20" x2="8.01" y2="20"></line><line x1="12" y1="18" x2="12.01" y2="18"></line><line x1="12" y1="22" x2="12.01" y2="22"></line><line x1="16" y1="16" x2="16.01" y2="16"></line><line x1="16" y1="20" x2="16.01" y2="20"></line>`,
        cloudLightning: `<path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"></path><polyline points="13 11 9 17 15 17 11 23"></polyline>`,
        cloudDrizzle: `<line x1="8" y1="19" x2="8" y2="21"></line><line x1="8" y1="13" x2="8" y2="15"></line><line x1="16" y1="19" x2="16" y2="21"></line><line x1="16" y1="13" x2="16" y2="15"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="12" y1="15" x2="12" y2="17"></line><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path>`
    };

    // WMO Weather Code Mapping to Feather Icons
    // 0: Clear sky
    // 1, 2, 3: Mainly clear, partly cloudy, and overcast
    // 45, 48: Fog
    // 51, 53, 55: Drizzle
    // 56, 57: Freezing Drizzle
    // 61, 63, 65: Rain
    // 66, 67: Freezing Rain
    // 71, 73, 75: Snow fall
    // 77: Snow grains
    // 80, 81, 82: Rain showers
    // 85, 86: Snow showers
    // 95, 96, 99: Thunderstorm

    if (code === 0 || code === 1) {
        iconPath = icons.sun;
    } else if (code <= 3 || code === 45 || code === 48) {
        iconPath = icons.cloud;
    } else if (code >= 51 && code <= 57) {
        iconPath = icons.cloudDrizzle;
    } else if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
        iconPath = icons.cloudRain;
    } else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
        iconPath = icons.cloudSnow;
    } else if (code >= 95) {
        iconPath = icons.cloudLightning;
    } else {
        iconPath = icons.sun; // Default
    }

    weatherIconEl.innerHTML = iconPath;
}

// ============================================
// 4. AUDIO PLAYBACK
// ============================================

let voicesLoaded = false;

function preloadVoices() {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        voicesLoaded = true;
    } else {
        window.speechSynthesis.onvoiceschanged = () => {
            voicesLoaded = true;
            console.log('🔊 Voices loaded via event');
        };
    }
}

function getBestVoice() {
    const voices = window.speechSynthesis.getVoices();

    // If no voices yet, try to wait or just return null (will use default)
    if (voices.length === 0) return null;

    const priorities = [
        (v) => v.name === 'Daniel',
        (v) => v.name === 'Google US English Male',
        (v) => v.name.includes('Google US English Male'),
        (v) => v.name.includes('Microsoft David'),
        (v) => v.name.includes('Male') && v.lang === 'en-US',
        (v) => v.lang === 'en-US' && !v.name.includes('Google'),
        (v) => v.lang === 'en-US'
    ];

    for (const priority of priorities) {
        const voice = voices.find(priority);
        if (voice) return voice;
    }

    return voices.find(v => v.lang === 'en-US') || voices[0];
}

function playWord() {
    if (!currentWord) return;

    if (isPlaying && currentUtterance) {
        window.speechSynthesis.cancel();
        isPlaying = false;
        return;
    }

    const textToSpeak = currentWord.word;

    currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
    currentUtterance.lang = 'en-US';
    currentUtterance.rate = 0.9;

    const bestVoice = getBestVoice();
    if (bestVoice) {
        currentUtterance.voice = bestVoice;
    }

    currentUtterance.onend = () => {
        isPlaying = false;
    };

    window.speechSynthesis.speak(currentUtterance);
    isPlaying = true;
}

function playText(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;

    const bestVoice = getBestVoice();
    if (bestVoice) {
        utterance.voice = bestVoice;
    }

    window.speechSynthesis.speak(utterance);
}

// ============================================
// 5. TAB SWITCHING
// ============================================

let currentView = 'today';

function initializeTabs() {
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    currentView = tabName;

    tabs.forEach(t => {
        const isActive = t.dataset.tab === tabName;
        t.classList.toggle('active', isActive);
        t.querySelector('.tab-underline').classList.toggle('active', isActive);
    });

    if (tabName === 'today') {
        todayView.classList.remove('hidden');
        yearView.classList.add('hidden');
        document.body.style.backgroundColor = '';
        updateBackgroundColor();
    } else {
        todayView.classList.add('hidden');
        yearView.classList.remove('hidden');
        document.body.style.backgroundColor = '#FFFFFF';
        generate365Grid();
    }
}

// ============================================
// 6. SWIPE NAVIGATION
// ============================================

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

function initializeSwipeGestures() {
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

        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) && touchDuration < 300) {
            if (deltaX > 0) {
                navigateToPreviousDay();
            } else {
                navigateToNextDay();
            }
        }
    });
}

function navigateToPreviousDay() {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    currentDate = newDate;
    updateAppForDate(currentDate);
}

function navigateToNextDay() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    nextDate.setHours(0, 0, 0, 0);

    if (nextDate <= today) {
        currentDate = nextDate;
        updateAppForDate(currentDate);
    }
}

// ============================================
// 7. 365 DAY GRID
// ============================================

function generate365Grid() {
    if (yearGrid.children.length > 0) return;

    const today = new Date();
    const startOf2026 = new Date(2026, 0, 1);

    for (let i = 0; i < 365; i++) {
        const date = new Date(startOf2026);
        date.setDate(date.getDate() + i);

        const dot = document.createElement('div');
        dot.className = 'day-dot';
        dot.dataset.date = date.toISOString().split('T')[0];

        // Seed from date for COLOR consistency
        const dateSeed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

        if (date <= today) {
            // Use EXACT same color as the Today view logic
            const theme = getThemeForDate(date);
            dot.style.backgroundColor = theme.bgColor;
        } else {
            dot.style.backgroundColor = 'rgba(255, 255, 255, 0.16)';
        }

        dot.addEventListener('click', () => {
            // Disable future selection
            if (date > today) return;

            currentDate = new Date(date);
            switchTab('today');
            updateAppForDate(currentDate);
        });

        yearGrid.appendChild(dot);
    }
}

// ============================================
// 8. INITIALIZATION
// ============================================

async function init() {
    try {
        await loadVocabulary();
        await getWeatherData(); // This now calls updateAppForDate(currentDate) internally once loaded

        preloadVoices(); // Force voice loading early
        initializeTabs();
        initializeSwipeGestures();
        initializeTextSpeech();

        // Refresh background every minute primarily for time-based changes (if any remain)
        // But for our deterministic date-based color, it mainly stays unless day changes.
        setInterval(updateBackgroundColor, 60000);
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        wordEl.textContent = 'Error';
        translationEl.textContent = '오류가 발생했습니다';
    }
}

function initializeTextSpeech() {
    wordEl.addEventListener('click', () => {
        playWord();
    });

    dateDisplayEl.addEventListener('click', () => {
        const dateText = formatDateToSpeech(currentDate);
        playText(dateText);
    });

    function formatDateToSpeech(date) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const monthName = months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear(); // 2026

        let dayOrdinal;
        if (day > 3 && day < 21) dayOrdinal = day + 'th';
        else {
            switch (day % 10) {
                case 1: dayOrdinal = day + "st"; break;
                case 2: dayOrdinal = day + "nd"; break;
                case 3: dayOrdinal = day + "rd"; break;
                default: dayOrdinal = day + "th"; break;
            }
        }

        // Year to Speech
        const yearStr = year.toString();
        const firstPart = parseInt(yearStr.substring(0, 2));
        const secondPart = parseInt(yearStr.substring(2));

        const numToText = {
            20: "twenty", 21: "twenty-one", 22: "twenty-two", 23: "twenty-three",
            24: "twenty-four", 25: "twenty-five", 26: "twenty-six"
        };

        const firstSpeech = numToText[firstPart] || firstPart;
        const secondSpeech = numToText[secondPart] || secondPart;

        return `${monthName} ${dayOrdinal}, ${firstSpeech} ${secondSpeech}`;
    }

    locationTextEl.addEventListener('click', () => {
        playText(locationTextEl.textContent);
    });

    temperatureEl.addEventListener('click', () => {
        const temp = temperatureEl.textContent.replace('°', ' degrees');
        playText(temp);
    });
}

init();
console.log('🚀 British English Learning App initialized');
