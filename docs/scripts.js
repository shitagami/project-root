// Service Workerの登録と通知の許可
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
        }).catch(error => {
            console.error('Service Worker registration failed:', error);
        });
    });
}

if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            console.log('Notification permission granted.');
        } else {
            console.log('Notification permission denied.');
        }
    });
}

// プッシュ通知を送信する関数
function sendNotification(title, options) {
    if (Notification.permission === 'granted') {
        navigator.serviceWorker.getRegistration().then(registration => {
            registration.showNotification(title, options);
        });
    }
}

// 通知の設定
function setupNotification(minutes) {
    setTimeout(() => {
        sendNotification('UV Index Notification', {
            body: '指定した時間が経過しました。',
            icon: 'images/notification-icon.png'
        });
    }, minutes * 60 * 1000); // 分をミリ秒に変換
}

// UVインデックスを取得
async function fetchUVIndex(lat, lon) {
    const apiKey = 'openuv-xs7rlwtd859l-io'; // OpenUVのAPIキー
    const response = await fetch(`https://api.openuv.io/api/v1/uv?lat=${lat}&lng=${lon}`, {
        headers: {
            'x-access-token': apiKey
        }
    });
    const data = await response.json();
    return data.result.uv;
}

// 一時間ごとのUVインデックスを取得
async function fetchHourlyUVIndex(lat, lon) {
    const apiKey = 'openuv-xs7rlwtd859l-io'; // OpenUVのAPIキー
    const response = await fetch(`https://api.openuv.io/api/v1/forecast?lat=${lat}&lng=${lon}`, {
        headers: {
            'x-access-token': apiKey
        }
    });
    const data = await response.json();
    return data.result;
}

// 天気情報を取得
async function fetchWeather(lat, lon) {
    const apiKey = '0de921ba7959383825693055f751c03e'; // OpenWeatherMapのAPIキー
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=ja&appid=${apiKey}`);
    const data = await response.json();
    return data;
}

// UVインデックスのカテゴリを判定
function getUVCategory(uvIndex) {
    if (uvIndex <= 2) {
        return { category: '弱い', imagePath: 'images/1.jpg' };
    } else if (uvIndex <= 5) {
        return { category: '中程度', imagePath: 'images/2.jpg' };
    } else if (uvIndex <= 7) {
        return { category: '強い', imagePath: 'images/3.jpg' };
    } else if (uvIndex <= 10) {
        return { category: '非常に強い', imagePath: 'images/4.jpg' };
    } else {
        return { category: '極端に強い', imagePath: 'images/5.jpg' };
    }
}

// 時間を最も近い時間に丸める
function roundTimeToNearestHour(date) {
    const rounded = new Date(date);
    rounded.setMinutes(rounded.getMinutes() + 30);
    rounded.setMinutes(0, 0, 0);
    return rounded;
}

// 現在地のデータを表示
function displayCurrentLocationData() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const uvData = await fetchUVIndex(lat, lon);
            const uvCategoryData = getUVCategory(uvData);
            document.getElementById('current-uv-index').innerHTML = `現在のUV指数: ${uvCategoryData.category}<br><img src="${uvCategoryData.imagePath}" alt="${uvCategoryData.category}" class="uv-icon">`;

            const hourlyData = await fetchHourlyUVIndex(lat, lon);
            displayHourlyUVIndex(hourlyData, 'hourly-uv-index');

            const weatherData = await fetchWeather(lat, lon);
            displayTodayWeather(weatherData, 'current-weather');
        }, showError);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// 一時間ごとのUVインデックスを表示
function displayHourlyUVIndex(hourlyData, elementId) {
    let hourlyUVIndexHTML = '<table><tr><th>Time</th><th>Category</th></tr>';
    hourlyData.forEach(hourData => {
        const time = roundTimeToNearestHour(new Date(hourData.uv_time)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const uvCategoryData = getUVCategory(hourData.uv);

        // カテゴリの横に画像を表示
        hourlyUVIndexHTML += 
            `<tr>
                <td>${time}</td>
                <td>
                    ${uvCategoryData.category}
                    <img src="${uvCategoryData.imagePath}" alt="${uvCategoryData.category}" class="uv-icon">
                </td>
            </tr>`;
    });
    hourlyUVIndexHTML += '</table>';
    document.getElementById(elementId).innerHTML = hourlyUVIndexHTML;
}

// 今日の天気情報を表示
function displayTodayWeather(weatherData, elementId) {
    const today = new Date().toISOString().split('T')[0];
    const todayWeather = weatherData.list.filter(entry => entry.dt_txt.startsWith(today));
    
    if (todayWeather.length === 0) {
        document.getElementById(elementId).textContent = "今日の天気データがありません。";
        return;
    }

    let tempSum = 0, tempMin = Infinity, tempMax = -Infinity, weatherCounts = {};
    todayWeather.forEach(entry => {
        const temp = entry.main.temp;
        tempSum += temp;
        if (temp < tempMin) tempMin = temp;
        if (temp > tempMax) tempMax = temp;
        const weatherDesc = entry.weather[0].main; // 天気のメイン情報を使用
        if (!weatherCounts[weatherDesc]) {
            weatherCounts[weatherDesc] = 0;
        }
        weatherCounts[weatherDesc]++;
    });

    const avgTemp = (tempSum / todayWeather.length).toFixed(1);
    const mostFrequentWeather = Object.keys(weatherCounts).reduce((a, b) => weatherCounts[a] > weatherCounts[b] ? a : b);

    // 天気のアイコンを選択
    let weatherIcon = '';
    if (mostFrequentWeather === 'Clear') {
        weatherIcon = 'images/path_to_sunny_image.jpg';
    } else if (mostFrequentWeather === 'Clouds') {
        weatherIcon = 'images/path_to_cloudy_image.jpg';
    } else if (mostFrequentWeather === 'Rain') {
        weatherIcon = 'images/path_to_rainy_image.jpg';
    }

    const weatherHTML = 
        `<p>天気: ${mostFrequentWeather}</p>
        <img src="${weatherIcon}" alt="${mostFrequentWeather}" class="weather-icon">
        <p>平均気温: ${avgTemp}°C</p>
        <p>最高気温: ${tempMax}°C</p>
        <p>最低気温: ${tempMin}°C</p>`;
    document.getElementById(elementId).innerHTML = weatherHTML;
}

// エラーハンドリング
function showError(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            alert("User denied the request for Geolocation.");
            break;
        case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable.");
            break;
        case error.TIMEOUT:
            alert("The request to get user location timed out.");
            break;
        case error.UNKNOWN_ERROR:
            alert("An unknown error occurred.");
            break;
    }
}

// 位置情報から緯度経度を取得
async function getLatLonFromLocation(location) {
    const apiKey = '5629ac98795f468cb8f8a5941b56f7bc'; // OpenCageのAPIキー
    const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(location)}&key=${apiKey}`);
    const data = await response.json();
    if (data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry;
        return { lat, lon: lng };
    } else {
        throw new Error('Location not found');
    }
}

// 特定の地域のデータを取得して表示
document.getElementById('location-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const location = document.getElementById('location-input').value;
    if (location) {
        try {
            const { lat, lon } = await getLatLonFromLocation(location);
            const uvData = await fetchUVIndex(lat, lon);
            const uvCategoryData = getUVCategory(uvData);
            document.getElementById('specific-uv-index').innerHTML = `${location}のUV指数: ${uvCategoryData.category}<br><img src="${uvCategoryData.imagePath}" alt="${uvCategoryData.category}" class="uv-icon">`;
            
            const hourlyData = await fetchHourlyUVIndex(lat, lon);
            displayHourlyUVIndex(hourlyData, 'specific-hourly-uv-index');

            const weatherData = await fetchWeather(lat, lon);
            displayTodayWeather(weatherData, 'specific-weather');
        } catch (error) {
            document.getElementById('specific-uv-index').textContent = `Error: ${error.message}`;
        }
    }
});

// 通知設定ボタンのイベントリスナー
document.getElementById('set-notification').addEventListener('click', () => {
    const minutes = parseInt(document.getElementById('notification-time').value, 10);
    setupNotification(minutes);
});

// ページ読み込み時に現在地の位置情報を取得
displayCurrentLocationData();








