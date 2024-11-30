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
    let advice = '';  // アドバイス用の変数を追加
    if (uvIndex <= 2) {
        return { category: '弱い', imagePath: 'images/無題 (9).png', advice: advice };
    } else if (uvIndex <= 5) {
        advice = '帽子や日傘を使用して、紫外線から肌を守りましょう。';  // アドバイス追加
        return { category: '中程度', imagePath: 'images/無題 (10).png', advice: advice };
    } else if (uvIndex <= 7) {
        advice = '帽子や日傘、長袖の服で肌をしっかり守りましょう。';
        return { category: '強い', imagePath: 'images/無題 (11).png', advice: advice };
    } else if (uvIndex <= 10) {
        advice = 'なるべく外出を控え、紫外線から肌を守るために帽子や日傘を使用しましょう。';
        return { category: '非常に強い', imagePath: 'images/無題 (12).png', advice: advice };
    } else {
        advice = '極力外出を避け、しっかりと紫外線対策を行いましょう。';
        return { category: '極端に強い', imagePath: 'images/無題 (13).png', advice: advice };
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
async function displayCurrentLocationData() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const uvData = await fetchUVIndex(lat, lon);
            const uvCategoryData = getUVCategory(uvData);

            // 天気情報を取得して市区町村名を取得
            const weatherData = await fetchWeather(lat, lon);
            const cityName = weatherData.city.name; // 市区町村名を取得

            // UV指数のカテゴリとアドバイスを表示
            document.getElementById('current-uv-index').innerHTML = 
                `${cityName}のUV指数: ${uvCategoryData.category}<br>
                 <img src="${uvCategoryData.imagePath}" alt="${uvCategoryData.category}" class="uv-icon">
                 <p>${uvCategoryData.advice}</p>`;
            
            // 今日の天気情報を表示
            displayTodayWeather(weatherData, 'current-weather');
            
            const hourlyData = await fetchHourlyUVIndex(lat, lon);
            displayHourlyUVIndex(hourlyData, 'hourly-uv-index');
        }, showError);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// 一時間ごとのUVインデックスを表示
function displayHourlyUVIndex(hourlyData, elementId) {
    let hourlyUVIndexHTML = '<table><tr><th>時間</th>';
    hourlyData.forEach(hourData => {
        const time = roundTimeToNearestHour(new Date(hourData.uv_time)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        hourlyUVIndexHTML += `<th>${time}</th>`; // 各時間をヘッダーに追加
    });
    hourlyUVIndexHTML += '</tr><tr><th>UV指数</th>';
    hourlyData.forEach(hourData => {
        const uvCategoryData = getUVCategory(hourData.uv);
        hourlyUVIndexHTML += `<td>${uvCategoryData.category}<img src="${uvCategoryData.imagePath}" alt="${uvCategoryData.category}" class="uv-icon"></td>`; // 各カテゴリを行に追加
    });
    hourlyUVIndexHTML += '</tr></table>';
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
        const weatherDesc = entry.weather[0].main;
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
        weatherIcon = 'images/sun.png';
    } else if (mostFrequentWeather === 'Clouds') {
        weatherIcon = 'images/cloudy.png';
    } else if (mostFrequentWeather === 'Rain') {
        weatherIcon = 'images/rain.png';
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
            document.getElementById('specific-uv-index').innerHTML = `${location}のUV指数: ${uvCategoryData.category}<br><img src="${uvCategoryData.imagePath}" alt="${uvCategoryData.category}" class="uv-icon">
            <p>${uvCategoryData.advice}</p>`;  // 追加部分

            const hourlyData = await fetchHourlyUVIndex(lat, lon);
            displayHourlyUVIndex(hourlyData, 'specific-hourly-uv-index');

            const weatherData = await fetchWeather(lat, lon);
            displayTodayWeather(weatherData, 'specific-weather');
        } catch (error) {
            document.getElementById('specific-uv-index').textContent = `Error: ${error.message}`;
        }
    }
});

// ページ読み込み時に現在地の位置情報を取得
displayCurrentLocationData();

// タイマー機能
document.getElementById('start-timer').addEventListener('click', function() {
    const timerSelect = document.getElementById('timer-select');
    const selectedMinutes = parseInt(timerSelect.value);
    const timerStatus = document.getElementById('timer-status');
    
    timerStatus.textContent = `${selectedMinutes}分のタイマーを開始しました。`;

    setTimeout(function() {
        alert(`${selectedMinutes}分が経過しました！`);
        timerStatus.textContent = `${selectedMinutes}分のタイマーが終了しました。`;
    }, selectedMinutes * 60 * 1000); // 分をミリ秒に変換
});












