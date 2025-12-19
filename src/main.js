import L from 'leaflet';
import { createIcons, Sun, Cloud, CloudRain, CloudLightning, CloudSnow, Wind, Navigation, Droplet, ChevronDown, Crosshair } from 'lucide';
import { WindParticles } from './windParticles.js';

// Brand Colors
const TM_ORANGE = '#fa6533';
const TM_BLUE = '#00293d';

// Initialize state
let map;
let modal = document.getElementById('weather-modal');
let dragHandle = modal.querySelector('.modal-drag-handle');
let isDragging = false;
let currentPos = { x: 0, y: 0 };
let offset = { x: 0, y: 0 };
let isCollapsed = false;
let windOverlay;

const windCanvas = document.getElementById('wind-canvas');
if (windCanvas) {
    windOverlay = new WindParticles(windCanvas);
}

// Weather API Config
const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

// 1. Map Initialization
// 1. Map Initialization
function initMap(lat, lon) {
    if (map) {
        map.setView([lat, lon], 13);
        // Remove existing marker if any (simple implementation assumes one marker)
        map.eachLayer((layer) => {
            if (layer instanceof L.CircleMarker) {
                map.removeLayer(layer);
            }
        });
    } else {
        map = L.map('map', {
            zoomControl: false,
            attributionControl: false
        }).setView([lat, lon], 13);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(map);
    }

    // Marker for current location
    const marker = L.circleMarker([lat, lon], {
        radius: 8,
        fillColor: TM_ORANGE,
        color: '#fff',
        weight: 2,
        fillOpacity: 1,
        // Hack to make circle marker "draggable" by using a real marker with custom icon? 
        // Or actually, L.circleMarker isn't draggable by default. 
        // Let's use a standard Marker with a custom divIcon to look like a dot, or just a standard marker.
        // The user asked for "red dot", let's make it a draggable standard marker for better UX or stay with dot.
        // L.Marker is draggable. L.CircleMarker is not easily.
    });

    // Switch to L.Marker for drag support
    const redDotIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${TM_ORANGE}; width: 16px; height: 16px; border: 2px solid white; border-radius: 50%;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });

    const draggableMarker = L.marker([lat, lon], {
        icon: redDotIcon,
        draggable: true
    }).addTo(map);

    draggableMarker.on('dragend', function (event) {
        const marker = event.target;
        const position = marker.getLatLng();
        // Update global positions if needed (though reverseGeocode is called fresh)
        // Fetch weather for new location
        fetchWeather(position.lat, position.lng);
        map.panTo(position);
    });
}

// 2. Weather Data Fetching & Reverse Geocoding
async function reverseGeocode(lat, lon) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`);
        const data = await response.json();

        const city = data.address.city || data.address.town || data.address.village || data.address.suburb || "Onbekende Stad";
        const road = data.address.road || "Onbekende Straat";
        const countryCode = (data.address.country_code || "").toUpperCase();

        return {
            formatted: `${city} - ${road}`,
            countryCode: countryCode
        };
    } catch (error) {
        console.error("Reverse geocoding error:", error);
        return { formatted: "Locatie onbekend", countryCode: "" };
    }
}

async function fetchWeather(lat, lon) {
    try {
        const locationData = await reverseGeocode(lat, lon);
        const address = locationData.formatted;

        // Update Buienradar Link - Only for Belgium
        const radarFooter = document.getElementById('modal-footer');
        const radarLink = document.getElementById('radar-link');

        if (locationData.countryCode === 'BE') {
            if (radarFooter) radarFooter.style.display = 'block';
            if (radarLink) {
                radarLink.href = `https://www.buienradar.be/`;
            }
        } else {
            if (radarFooter) radarFooter.style.display = 'none';
        }

        // Try One Call 3.0 for hourly forecast (requires subscription usually)
        let response = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=nl&exclude=minutely,daily,alerts`);
        let data = await response.json();

        // If One Call 3.0 fails or returns unauthorized, fallback to 2.5 3-hourly forecast
        if (data.cod === "401" || data.cod === "404" || !data.hourly) {
            console.warn("OpenWeather One Call 3.0 not available, falling back to 2.5 3-hourly forecast.");
            response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=nl`);
            data = await response.json();
            if (data.cod !== "200") throw new Error(data.message);
            updateUI(data, false, address);
        } else {
            updateUI(data, true, address);
        }
    } catch (error) {
        console.error("Error fetching weather:", error);
        document.getElementById('location-name').textContent = "Fout bij laden";
    }
}

function updateUI(data, isHourly, address) {
    const locName = document.getElementById('location-name');
    locName.textContent = address;

    const container = document.getElementById('forecast-container');
    container.innerHTML = '';

    // Update Wind Particles based on current weather
    if (windOverlay) {
        let currentItem;
        if (isHourly) {
            currentItem = data.hourly[0];
        } else {
            currentItem = data.list[0];
        }

        if (currentItem) {
            const speed = (isHourly ? currentItem.wind_speed : currentItem.wind.speed) * 3.6; // km/h
            const deg = (isHourly ? currentItem.wind_deg : currentItem.wind?.deg) ?? 0;
            windOverlay.updateWind(speed, deg);
        }
    }

    // Take next 4 hours or entries
    let forecast;
    if (isHourly) {
        forecast = data.hourly.slice(1, 5); // Next 4 hours
    } else {
        forecast = data.list.slice(0, 4); // Next 4 entries (3-hourly)
    }

    forecast.forEach(item => {
        const date = new Date(item.dt * 1000);
        const time = date.getHours() + ":00";
        const temp = Math.round(isHourly ? item.temp : item.main.temp);
        const windSpeed = Math.round((isHourly ? item.wind_speed : item.wind.speed) * 3.6); // km/h
        const windDeg = (isHourly ? item.wind_deg : item.wind?.deg) ?? 0;
        const iconCode = item.weather[0].icon;

        const block = document.createElement('div');
        block.className = 'flex-1 flex flex-col items-center p-2 md:p-4 rounded-xl md:rounded-2xl bg-white/40 min-w-[75px] md:min-w-[120px] text-tm-blue relative';

        const rainChance = item.pop !== undefined ? Math.round(item.pop * 100) : 0;
        const rainVolume = item.rain ? (item.rain['1h'] || item.rain['3h'] || 0) : 0;

        const weatherId = item.weather[0].id;
        const weatherDescription = item.weather[0].description;
        const isNight = iconCode.endsWith('n');

        block.innerHTML = `
            <div class="h-12 md:h-20 flex items-center justify-center p-2 mb-1">
                <i class="wi wi-owm-${isNight ? 'night-' : 'day-'}${weatherId} text-3xl md:text-5xl"></i>
            </div>
            <span class="text-[10px] md:text-xs font-bold opacity-60 mb-1 leading-none">${time}</span>
            <span class="text-[9px] md:text-xs font-medium text-tm-blue/80 mb-0.5 leading-none italic capitalize">${weatherDescription}</span>
            <span class="text-sm md:text-xl font-bold mb-1 leading-none">${temp}°</span>
            
            <div class="flex flex-col items-center gap-0.5 md:gap-1">
                <div class="flex items-center gap-1">
                    <i data-lucide="wind" class="w-2 h-2 md:w-3 md:h-3"></i>
                    <span class="text-[9px] md:text-xs font-bold">${windSpeed} km/h</span>
                </div>
                <div class="flex items-center gap-1 text-blue-500">
                    <i data-lucide="droplet" class="w-2 h-2 md:w-3 md:h-3"></i>
                    <span class="text-[9px] md:text-xs font-bold">${rainChance}%</span>
                    ${rainVolume > 0 ? `<span class="text-[8px] md:text-[10px] opacity-70 ml-0.5">${rainVolume.toFixed(1)}mm</span>` : ''}
                </div>
            </div>
        `;
        container.appendChild(block);
    });

    // Update Favicon
    if (data.list && data.list.length > 0) {
        const currentIcon = data.list[0].weather[0].icon;
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = `https://openweathermap.org/img/wn/${currentIcon}.png`;
    }
    createIcons({
        icons: { Sun, Cloud, CloudRain, CloudLightning, CloudSnow, Wind, Navigation, Droplet, ChevronDown, Crosshair }
    });
}

function getIconName(code) {
    const mapping = {
        '01': 'sun',
        '02': 'cloud',
        '03': 'cloud',
        '04': 'cloud',
        '09': 'cloud-rain',
        '10': 'cloud-rain',
        '11': 'cloud-lightning',
        '13': 'cloud-snow',
        '50': 'cloud'
    };
    const key = code.substring(0, 2);
    return mapping[key] || 'cloud';
}

// 3. Modal Dragging
dragHandle.addEventListener('mousedown', startDragging);
dragHandle.addEventListener('touchstart', startDragging, { passive: false });

// 4. Modal Collapse Toggle
const modalToggle = document.getElementById('modal-toggle');
const modalContent = document.getElementById('modal-content');
const toggleIcon = document.getElementById('toggle-icon');

modalToggle.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent drag start
    isCollapsed = !isCollapsed;

    if (isCollapsed) {
        modalContent.style.maxHeight = '0px';
        modalContent.style.opacity = '0';
        toggleIcon.style.transform = 'rotate(-180deg)';
    } else {
        modalContent.style.maxHeight = '500px';
        modalContent.style.opacity = '1';
        toggleIcon.style.transform = 'rotate(0deg)';
    }
});

// Convert initial centering classes to absolute pixels after load
function initPosition() {
    const rect = modal.getBoundingClientRect();
    modal.style.left = rect.left + 'px';
    modal.style.top = rect.top + 'px';
    modal.style.transform = 'none';
    modal.style.margin = '0';
    modal.classList.remove('left-1/2', '-translate-x-1/2');
}

// Run after a short delay to ensure layout is ready
setTimeout(initPosition, 200);

function startDragging(e) {
    isDragging = true;

    // Get client coordinates safely for both mouse and touch
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;

    if (clientX === undefined || clientY === undefined) return;

    const rect = modal.getBoundingClientRect();

    modal.style.left = rect.left + 'px';
    modal.style.top = rect.top + 'px';
    modal.style.transform = 'none';
    modal.style.margin = '0';
    modal.style.right = 'auto';
    modal.style.bottom = 'auto';

    offset.x = clientX - rect.left;
    offset.y = clientY - rect.top;

    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('mouseup', stopDragging);
    document.addEventListener('touchend', stopDragging);
}

function drag(e) {
    if (!isDragging) return;

    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;

    if (clientX === undefined || clientY === undefined) return;

    // Prevent scrolling when dragging on mobile
    if (e.cancelable) e.preventDefault();

    let x = clientX - offset.x;
    let y = clientY - offset.y;

    // Constrain to screen
    const rect = modal.getBoundingClientRect();
    x = Math.max(0, Math.min(window.innerWidth - rect.width, x));
    y = Math.max(0, Math.min(window.innerHeight - rect.height, y));

    modal.style.left = x + 'px';
    modal.style.top = y + 'px';
}

function stopDragging() {
    isDragging = false;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('mouseup', stopDragging);
    document.removeEventListener('touchend', stopDragging);
}

// 4. Geolocation Logic
function requestLocation() {
    const locName = document.getElementById('location-name');
    locName.textContent = "Geolocatie zoeken...";

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                initMap(latitude, longitude);
                fetchWeather(latitude, longitude);
            },
            (error) => {
                console.error("Geolocation error:", error);

                // Show specific feedback if possible, or just default
                let msg = "Locatie toegang geweigerd";
                if (error.code === error.PERMISSION_DENIED) {
                    msg = "Toegang geweigerd. Zet locatie aan.";
                } else if (error.code === error.TIMEOUT) {
                    msg = "Time-out locatiebepaling.";
                }
                alert(`${msg} Standaardlocatie wordt geladen.`);

                // Default to Kasterlee
                initMap(51.20095, 4.90426);
                fetchWeather(51.20095, 4.90426);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 60000
            }
        );
    } else {
        alert("Geolocatie wordt niet ondersteund door deze browser.");
        // Default to Kasterlee
        initMap(51.20095, 4.90426);
        fetchWeather(51.20095, 4.90426);
    }
}

// 5. Execution
document.getElementById('locate-btn')?.addEventListener('click', () => {
    requestLocation();
});

// Auto-start
requestLocation();
