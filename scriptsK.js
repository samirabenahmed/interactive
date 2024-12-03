// Initialisation des cartes
const mapBefore = L.map('mapBefore').setView([31.437, -8.565], 10);
const mapAfter = L.map('mapAfter').setView([31.437, -8.565], 10);

const lightTileLayer = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

const darkTileLayer = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';


let currentTheme = 'light'; // Mode par défaut

// Ajout des fonds de carte
const lightLayerBefore = L.tileLayer(lightTileLayer, { maxZoom: 18 }).addTo(mapBefore);
const lightLayerAfter = L.tileLayer(lightTileLayer, { maxZoom: 18 }).addTo(mapAfter);

const darkLayerBefore = L.tileLayer(darkTileLayer, { maxZoom: 18 });
const darkLayerAfter = L.tileLayer(darkTileLayer, { maxZoom: 18 });

function addPulsatingEffect(map, layer) {
    const center = layer.getBounds().getCenter();
    const pulsatingCircle = L.circle(center, {
        radius: 20,
        color: 'red',
        fillColor: 'orange',
        fillOpacity: 0.5
    }).addTo(map);

    let growing = true;
    setInterval(() => {
        const radius = pulsatingCircle.getRadius();
        if (growing) {
            pulsatingCircle.setRadius(radius + 2);
            if (radius >= 30) growing = false;
        } else {
            pulsatingCircle.setRadius(radius - 2);
            if (radius <= 20) growing = true;
        }
    }, 200);
}

let heatMapLayer, diffGeojsonLayer;

// Heatmap
fetch('apres_seisme.geojson')
    .then(response => response.json())
    .then(data => {
        const geojsonAfterLayer = L.geoJSON(data, {
            style: { color: 'red', weight: 2, fillOpacity: 0.4 },
            onEachFeature: (feature, layer) => {
                layer.bindPopup(`<b>ID:</b> ${feature.properties.fid}<br>
                                 <b>Dernière détection:</b> ${feature.properties.last_detection_date}`);
                addPulsatingEffect(mapAfter, layer);
            }
        }).addTo(mapAfter);

        mapAfter.fitBounds(geojsonAfterLayer.getBounds());

        const heatPoints = [];
        geojsonAfterLayer.eachLayer(layer => {
            const center = layer.getBounds().getCenter();
            heatPoints.push([center.lat, center.lng, 1]);
        });

        heatMapLayer = L.heatLayer(heatPoints, {
            radius: 25, blur: 15, maxZoom: 17,
            gradient: { 0.4: 'blue', 0.6: 'yellow', 0.8: 'orange', 1.0: 'red' }
        }).addTo(mapAfter);
    });

// Diff layer
fetch('diff.geojson')
    .then(response => response.json())
    .then(data => {
        diffGeojsonLayer = L.geoJSON(data, {
            style: { color: 'blue', weight: 2, fillOpacity: 0.4 },
            onEachFeature: (feature, layer) => {
                layer.bindPopup(`<b>Diff ID:</b> ${feature.properties.id}`);
            }
        }).addTo(mapAfter);

        mapAfter.fitBounds(diffGeojsonLayer.getBounds());
    });

// Carte avant séisme
fetch('avant_seisme.geojson')
    .then(response => response.json())
    .then(data => {
        const geojsonLayer = L.geoJSON(data, {
            style: { color: 'green', weight: 2, fillOpacity: 0.4 },
            onEachFeature: (feature, layer) => {
                layer.bindPopup(`<b>ID:</b> ${feature.properties.fid}`);
            }
        }).addTo(mapBefore);

        mapBefore.fitBounds(geojsonLayer.getBounds());
    });

// Synchroniser les zooms et déplacements entre les cartes
function syncMaps() {
    const center = mapBefore.getCenter();
    const zoom = mapBefore.getZoom();
    mapAfter.setView(center, zoom);
}

mapBefore.on('moveend', syncMaps);
mapBefore.on('zoomend', syncMaps);

// Heatmap toggle
document.getElementById('heatmapToggle').onclick = () => {
    if (mapAfter.hasLayer(heatMapLayer)) mapAfter.removeLayer(heatMapLayer);
    else mapAfter.addLayer(heatMapLayer);
};

// Diff toggle
document.getElementById('diffToggle').onclick = () => {
    if (mapAfter.hasLayer(diffGeojsonLayer)) mapAfter.removeLayer(diffGeojsonLayer);
    else mapAfter.addLayer(diffGeojsonLayer);
};

// Mode Black/Light
document.getElementById('themeToggle').onclick = () => {
    if (currentTheme === 'light') {
        lightLayerBefore.remove();
        lightLayerAfter.remove();
        darkLayerBefore.addTo(mapBefore);
        darkLayerAfter.addTo(mapAfter);
        currentTheme = 'dark';
    } else {
        darkLayerBefore.remove();
        darkLayerAfter.remove();
        lightLayerBefore.addTo(mapBefore);
        lightLayerAfter.addTo(mapAfter);
        currentTheme = 'light';
    }
};

// Fonctionnalité de recherche
const geocoder = L.Control.Geocoder.nominatim();
document.getElementById('searchInput').addEventListener('input', function(event) {
    const searchTerm = event.target.value.trim();
    if (searchTerm.length >= 3) {
        geocoder.geocode(searchTerm, function(results) {
            if (results.length > 0) {
                const latlng = results[0].center;
                mapBefore.setView(latlng, 12);
                mapAfter.setView(latlng, 12);

                L.marker(latlng).addTo(mapBefore).bindPopup(results[0].name).openPopup();
                L.marker(latlng).addTo(mapAfter).bindPopup(results[0].name).openPopup();
            }
        });
    }
});
