// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

console.log('Mapbox GL JS Loaded:', mapboxgl);
mapboxgl.accessToken = 'pk.eyJ1IjoicmRld2FuZ2FuIiwiYSI6ImNtYXBtc3J3ZTAwYWoycm9zOG5zZDFyZG4ifQ.vxhdaB8Vl99zB7Lsqomt0Q';

const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18, // Maximum allowed zoom
});




map.on('load', async () => {

    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
    });

    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
    });

    map.addLayer({
        id: 'boston-lanes',
        type: 'line',
        source: 'boston_route',
        paint: {
        'line-color': '#DA3E52',  // A red
        'line-width': 3,          // Thicker lines
        'line-opacity': 0.4       // Slightly less transparent
        }
    });
    
    map.addLayer({
        id: 'cambridge-lanes',
        type: 'line',
        source: 'cambridge_route',
        paint: {
        'line-color': '#3B9C9C',  // A teal using hex code
        'line-width': 3,          // Thicker lines
        'line-opacity': 0.4       // Slightly less transparent
        }
    });
});