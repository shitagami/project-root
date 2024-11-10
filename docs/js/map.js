// 地図の初期化
const map = L.map('map').setView([37.0, 135.0], 5);

// 白いタイルレイヤーを追加
L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors, &copy; CARTO'
}).addTo(map);

// スライダーと時間表示の要素を作成
const timeSliderContainer = document.createElement('div');
timeSliderContainer.id = 'timeSliderContainer';
timeSliderContainer.style.display = 'flex';
timeSliderContainer.style.alignItems = 'center';
timeSliderContainer.style.justifyContent = 'center';
timeSliderContainer.style.margin = '20px';

const timeSlider = document.createElement('input');
timeSlider.type = 'range';
timeSlider.id = 'timeSlider';
timeSlider.min = '6';
timeSlider.max = '18';
timeSlider.value = '6';
timeSlider.step = '1';

const timeDisplay = document.createElement('span');
timeDisplay.id = 'timeDisplay';
timeDisplay.textContent = '06:00';
timeDisplay.style.marginLeft = '15px';
timeDisplay.style.fontSize = '18px';
timeDisplay.style.fontWeight = 'bold';

timeSliderContainer.appendChild(timeSlider);
timeSliderContainer.appendChild(timeDisplay);
document.body.insertBefore(timeSliderContainer, document.getElementById('map'));

// グローバル変数
let geoJsonLayer = L.layerGroup().addTo(map);
let geoJsonData; // GeoJSONデータを格納

// GeoJSONデータを読み込み、グローバル変数に保存
fetch('prefectures.geojson')
    .then(response => response.json())
    .then(data => {
        geoJsonData = data; // グローバル変数に格納
        updateUVIndex();    // 初期表示を更新
    });

// UV指数を取得する関数
async function fetchUVIndex(lat, lng, alt, dt) {
    try {
        const response = await fetch(`https://api.openuv.io/api/v1/forecast?lat=${lat}&lng=${lng}&alt=${alt}&dt=${dt}`, {
            headers: {
                'x-access-token': 'openuv-xs7rlwtd859l-io' // APIキーを設定
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('UV指数の取得に失敗しました', error);
        return null;
    }
}

// UV指数に基づく色を取得する関数
function getColorByUVIndex(uvIndex) {
    if (uvIndex >= 11) return '#800080';  
    if (uvIndex >= 10) return '#FF0000';  
    if (uvIndex >= 9) return '#FF4500';   
    if (uvIndex >= 8) return '#FFA500';   
    if (uvIndex >= 7) return '#FFD700';   
    if (uvIndex >= 6) return '#FFFF00';   
    if (uvIndex >= 5) return '#ADFF2F';   
    if (uvIndex >= 4) return '#00FF00';   
    if (uvIndex >= 3) return '#00FFFF';   
    if (uvIndex >= 2) return '#0000FF';   
    if (uvIndex >= 1) return '#00008B';   
    return '#ADD8E6';                     
}

// UV指数の更新関数
async function updateUVIndex() {
    const selectedHour = timeSlider.value.padStart(2, '0');
    const selectedTime = `${selectedHour}:00`;
    timeDisplay.textContent = selectedTime;

    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

    geoJsonLayer.clearLayers();

    geoJsonData.features.forEach(async (feature) => {
        const { name } = feature.properties;
        const centroid = turf.centroid(feature);
        const [lng, lat] = centroid.geometry.coordinates;
        const uvData = await fetchUVIndex(lat, lng, 0, formattedDate);

        if (uvData && uvData.result) {
            const uvIndexData = uvData.result.find(item => {
                const uvTime = new Date(item.uv_time);
                uvTime.setHours(uvTime.getUTCHours() + 9);
                const uvDate = uvTime.toISOString().split('T')[0];
                return uvDate === formattedDate && uvTime.getHours() === parseInt(selectedHour);
            });
            const uvIndex = uvIndexData ? uvIndexData.uv : 0;

            const layer = L.geoJSON(feature, {
                style: function() {
                    return {
                        fillColor: getColorByUVIndex(uvIndex),
                        weight: 2,
                        color: 'white',
                        fillOpacity: 0.7
                    };
                },
                onEachFeature: function (feature, layer) {
                    layer.bindPopup(`${name}<br>UV指数: ${typeof uvIndex === 'number' ? uvIndex.toFixed(1) : uvIndex}`);
                }
            });
            geoJsonLayer.addLayer(layer);
        }
    });
}