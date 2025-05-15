// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

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

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat); // Convert lon/lat to Mapbox LngLat
  const { x, y } = map.project(point); // Project to pixel coordinates
  return { cx: x, cy: y }; // Return as object for use in SVG attributes
}


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


    let jsonData;
    let trips;
    try {
        const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
        const csvurl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv'
        // await JSON fetch
        const jsonData = await d3.json(jsonurl);
        const trips = await d3.csv(csvurl);

        let stations = jsonData.data.stations;
        // console.log('Stations Array:', stations);
        // console.log('Loaded CSV Data:', trips);

        const svg = d3.select('#map').select('svg');

        const circles = svg
        .selectAll('circle')
        .data(stations)
        .enter()
        .append('circle')
        .attr('r', 5) // Radius of the circle
        .attr('fill', 'steelblue') // Circle fill color
        .attr('stroke', 'white') // Circle border color
        .attr('stroke-width', 1) // Circle border thickness
        .attr('opacity', 0.8); // Circle opacity

        // Function to update circle positions when the map moves/zooms
        function updatePositions() {
        circles
            .attr('cx', (d) => getCoords(d).cx) // Set the x-position using projected coordinates
            .attr('cy', (d) => getCoords(d).cy); // Set the y-position using projected coordinates
        }

        // Initial position update when map loads
        updatePositions();

        map.on('move', updatePositions); // Update during map movement
        map.on('zoom', updatePositions); // Update during zooming
        map.on('resize', updatePositions); // Update on window resize
        map.on('moveend', updatePositions); // Final adjustment after movement ends

        const departures = d3.rollup(
        trips,
            (v) => v.length,
            (d) => d.start_station_id,
        );

        const arrivals = d3.rollup(
        trips,
            (v) => v.length,
            (d) => d.end_station_id,
        );

        stations = stations.map((station) => {
        let id = station.short_name;
        station.arrivals = arrivals.get(id) ?? 0;
        station.departures = departures.get(id) ?? 0;
        station.totalTraffic = station.arrivals + station.departures;

        return station;
        });

        console.log(stations);


    } catch (error) {
        console.error('Error loading JSON:', error); // Handle errors
    }
    
    
});