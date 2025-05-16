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

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes); // Set hours & minutes
  return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
}

function computeStationTraffic(stations, trips) {
  // Compute departures
  const departures = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.start_station_id,
  );

  // Computed arrivals as you did in step 4.2
  const arrivals = d3.rollup(
    trips,
    v => v.length,
    d => d.end_station_id
  );
  // Update each station..
  return stations.map((station) => {
    let id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}


function filterTripsByTime(trips, timeFilter) {
  return timeFilter === -1
    ? trips
    : trips.filter((trip) => {
        const startedMinutes = minutesSinceMidnight(trip.started_at);
        const endedMinutes = minutesSinceMidnight(trip.ended_at);
        return (
          Math.abs(startedMinutes - timeFilter) <= 60 ||
          Math.abs(endedMinutes - timeFilter) <= 60
        );
      });
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
        jsonData = await d3.json(jsonurl);
        trips = await d3.csv(
            'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
            trip => {
                trip.started_at = new Date(trip.started_at);
                trip.ended_at = new Date(trip.ended_at);
                return trip;
            }
        );

        let stations = jsonData.data.stations;

        // Compute traffic
        // const departures = d3.rollup(
        // trips,
        // (v) => v.length,
        // (d) => d.start_station_id,
        // );

        // const arrivals = d3.rollup(
        // trips,
        // (v) => v.length,
        // (d) => d.end_station_id,
        // );

        // stations = stations.map((station) => {
        // let id = station.short_name;
        // station.arrivals = arrivals.get(id) ?? 0;
        // station.departures = departures.get(id) ?? 0;
        // station.totalTraffic = station.arrivals + station.departures;
        // return station;
        // });

        stations = computeStationTraffic(stations, trips);

        // console.log(stations);

        // Create scale for circle radius
        const radiusScale = d3
        .scaleSqrt()
        .domain([0, d3.max(stations, d => d.totalTraffic)])
        .range([0, 25]);

        // Create circles *after* data is enriched
        const svg = d3.select('#map').select('svg');

        const circles = svg
        .selectAll('circle')
        .data(stations, (d) => d.short_name)
        .enter()
        .append('circle')
        .attr('fill', 'steelblue')
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8)
        .attr('r', d => radiusScale(d.totalTraffic));

        // Add tooltips
        circles.each(function (d) {
        d3.select(this)
            .append('title')
            .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
        });

        // Position circles
        function updatePositions() {
        circles
            .attr('cx', (d) => getCoords(d).cx)
            .attr('cy', (d) => getCoords(d).cy);
        }
        updatePositions();

        map.on('move', updatePositions);
        map.on('zoom', updatePositions);
        map.on('resize', updatePositions);
        map.on('moveend', updatePositions);

        const timeSlider = document.getElementById('time-slider');
        const selectedTime = document.getElementById('selected-time');
        const anyTimeLabel = document.getElementById('any-time');

        let timeFilter = -1;

        function updateTimeDisplay() {
            timeFilter = Number(timeSlider.value);

            if (timeFilter === -1) {
                selectedTime.textContent = '';
                anyTimeLabel.style.display = 'block';
            } else {
                selectedTime.textContent = formatTime(timeFilter);
                anyTimeLabel.style.display = 'none';
            }

            // TODO: trigger filtering logic based on timeFilter
            updateScatterPlot(timeFilter);
        }

        function updateScatterPlot(timeFilter) {
            // Step 1: Filter the trips
            const filteredTrips = filterTripsByTime(trips, timeFilter);

            // Step 2: Recompute traffic
            const filteredStations = computeStationTraffic(stations, filteredTrips);

            // ✅ Step 3: Adjust circle size scale dynamically
            if (timeFilter === -1) {
                radiusScale.range([0, 25]);
            } else {
                radiusScale.range([3, 50]);
            }

            // Step 4: Update circle sizes with key tracking
            circles
                .data(filteredStations, d => d.short_name)
                .join('circle')
                .transition()
                .duration(100)
                .attr('r', d => radiusScale(d.totalTraffic));
        }

        timeSlider.addEventListener('input', updateTimeDisplay);
        updateTimeDisplay();


    } catch (error) {
        console.error('Error loading JSON:', error); // Handle errors
    }
    
    
});