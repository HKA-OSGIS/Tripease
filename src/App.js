import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-control-geocoder';
import osmtogeojson from 'osmtogeojson';
import './App.css';
import { getDistance } from 'geolib';

const RoutingApp = () => {
  const [startPoint, setStartPoint] = useState({lat: 0.0, lng: 0.0});
  const [endPoint, setEndPoint] = useState({lat: 0.0, lng: 0.0});
  const [cuisineType, setCuisineType] = useState("");
  const [departureTime, setDepartureTime] = useState(() => {
    const now = new Date();
    return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [whenToEat, setWhenToEat] = useState("");
  const [tripDetails, setTripDetails] = useState({ distance: "", time: "", arrive: "", diner: ""});
  const map = useRef(null);
  const routingControlRef = useRef(null);
  const restomarkerlist = useRef([]);
  const circlemarker = useRef(null);

  useEffect(() => {
    // Initialize the map
    map.current = L.map('map').setView([48.8566, 2.3522], 6);

    // Add OpenStreetMap tiles
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map.current);

    return () => {
      // Cleanup the map instance when component unmounts
      if (map.current) {
        map.current.remove();
      } 
    };
  }, []);

  const startIcon = L.icon({
    iconUrl: './startPoint.png',

    iconSize:     [50, 50], 
    iconAnchor:   [25, 37], 
  });

  const endIcon = L.icon({
    iconUrl: './endPoint.png',

    iconSize:     [50, 50], 
    iconAnchor:   [25, 37], 
  });

  const restaurantIcon = L.icon({
    iconUrl: './restaurant.png',

    iconSize:     [40, 40], 
    iconAnchor:   [20, 30], 
    popupAnchor:  [0, -20]
  });

  const dist = (feature, point) => {
    let x,y,x1,y1 = 0;
    if (feature.geometry.type === "Polygon"){
      x = feature.geometry.coordinates[0][0][1];
      y = feature.geometry.coordinates[0][0][0];
    } else {
      x = feature.geometry.coordinates[1];
      y = feature.geometry.coordinates[0];
    }
    x1 = point.lat
    y1 = point.lng
   return getDistance({ latitude: x, longitude: y}, {latitude: x1, longitude: y1});
  }

  async function closestRestaurant(point, x) {
    let url = new URL("https://overpass-api.de/api/interpreter");
    url.searchParams.append(
      "data",
      "[out:json];nwr[amenity=restaurant](around:2000," + point.lat + "," + point.lng + "); out;"
    );    
    let response = await fetch(url);
    let osmdata = await response.json();
    let geojson = osmtogeojson(osmdata);

    let filtered = [];
    geojson.features.forEach((e) => {
      if (typeof(e.properties.cuisine) === 'string') {
        if (e.properties.cuisine.includes(cuisineType)) {
          filtered.push(e);
        }
      }
    });

    restomarkerlist.current.forEach(e =>map.current.removeControl(e));
    restomarkerlist.current = [];

    filtered.sort(function(a, b){return (dist(a, point) - dist(b, point))})  //sort by ascending dist
    let closest = filtered.slice(0, x) //take the x first value
    closest.forEach((e) => {
      let x, y;
      if (e.geometry.type === "Polygon") {
        x = e.geometry.coordinates[0][0][1];
        y = e.geometry.coordinates[0][0][0];
      } else {
        x = e.geometry.coordinates[1];
        y = e.geometry.coordinates[0];
      }

      let restomarker = L.marker([x, y], { icon: restaurantIcon }).addTo(map.current);
      let info = "Restaurant name : " + e.properties.name + "</b><br> Distance : " + dist(e, point)/1000 + " km </b><br> Restaurant type : " + e.properties.cuisine
      restomarker.bindPopup(info);

      restomarkerlist.current.push(restomarker);
    });
    return closest;
  }

  const placeStartPointOnMap = () => {
    map.current.once('click', (e) => {
      const { lat, lng } = e.latlng;
      setStartPoint({lat: lat, lng: lng});
    });
  };

  const placeEndPointOnMap = () => {
    map.current.once('click', (e) => {
      const { lat, lng } = e.latlng;
      setEndPoint({lat: lat, lng: lng});
    });
  };

  const setDeviceLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, lngitude } = position.coords;
        setStartPoint({lat: latitude, lng: lngitude});
      });
    }
  };

  function timetoSecond(timeString) {
    const[hours,minutes] = timeString.split(':').map(Number)
    return hours*3600 + minutes*60
  }

  function addZero(number) {
    return "0"+number
  }

  function timeToHours(timeInSecond) {
    let totalSecondes = Math.floor(timeInSecond % 60)
    let totalMinutes = Math.floor(timeInSecond / 60) % 60
    let totalHours = Math.floor(timeInSecond/3600) % 24 //If the route is in  more tham 1 day
    if (totalSecondes < 10) {totalSecondes = addZero(totalSecondes)}
    if (totalMinutes < 10) {totalMinutes = addZero(totalMinutes)}
    if (totalHours < 10) {totalHours = addZero(totalHours)}
    return {hours : totalHours,
      minutes : totalMinutes,
      secondes : totalSecondes}
  }

  const initializeRoute = () => {
    if (startPoint.lat && endPoint.lat) {

      if (routingControlRef.current) {
        map.current.removeControl(routingControlRef.current);
      }

      const router = L.Routing.control({
        waypoints: [
          L.latLng(startPoint.lat, startPoint.lng),
          L.latLng(endPoint.lat, endPoint.lng)
        ],
        createMarker: function(i, wp, nWps) {
          if (i === 0) {
            const startmarker = L.marker(wp.latLng, {icon: startIcon })
            return startmarker;
          } else if (i === nWps - 1){
            const endmarker = L.marker(wp.latLng, {icon: endIcon })
            return endmarker;
          }
        },
        lineOptions: {
          styles: [{ color: 'blue', opacity: 0.7, weight: 4 }]
        }
      }).addTo(map.current);

      router.on('routesfound', (e) => {
        const route = e.routes[0];
        const summary = route.summary;
        setTripDetails({
          distance: (summary.totalDistance / 1000).toFixed(2),
          time: timeToHours(summary.totalTime),
          arrive: timeToHours(timetoSecond(departureTime) + summary.totalTime)
        });

        let time_travel = 0
        let distance_travel = 0
        let li_dist, li_time, t_resto, d_resto, dt_resto= 0
        if (timetoSecond(departureTime) < timetoSecond(whenToEat)) {

          route.instructions.forEach(function (instruction) {
            if (timetoSecond(departureTime) + time_travel >= timetoSecond(whenToEat)) {
              t_resto = time_travel - (timetoSecond(whenToEat) - (timetoSecond(departureTime)))
              d_resto = (li_dist * t_resto) / li_time // Calculate the exact distance to reach the point whenToEat
              dt_resto = d_resto + distance_travel
              return false
            }
            li_dist = instruction.distance
            li_time = instruction.time
            time_travel += li_time
            distance_travel += li_dist
            return true
          });

          let dist_coord = 0
          let old_coord = startPoint
          let new_coord = startPoint
          route.coordinates.forEach(function (coord) {
            if (dist_coord > dt_resto) {
              return false
            } 
            new_coord = coord
            dist_coord += getDistance({latitude: old_coord.lat, longitude: old_coord.lng},{latitude: new_coord.lat, longitude: new_coord.lng})
            old_coord = new_coord
            return true
          })
          if (circlemarker.current) {
          map.current.removeControl(circlemarker.current)
          }
          circlemarker.current = L.circle([new_coord.lat, new_coord.lng], { radius: 100}).addTo(map.current);

          let nearestaurant = closestRestaurant(new_coord, 3)
        } else {
          setTripDetails((oldDetails) => ({
            ...oldDetails,
            diner: "No restaurant search"
          }));
        }

        const routingContainer = document.querySelector('.leaflet-routing-container');
        if (routingContainer) {
          routingContainer.style.display = 'none';
        }
      });

      routingControlRef.current = router;
    }
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <div className="container">
        <div className="inputContainer">
          <label className="label">Start point</label>
          <input
            className="input"
            type="text"
            value={`${startPoint.lat}, ${startPoint.lng}`}
            onChange={(e) => {
              const lat = e.splitsplit(',')[0]
              const lng  = e.splitsplit(',')[1]
              setStartPoint({ lat: lat, lng: lng })
            }}
            placeholder="Enter start point"
          />
          <button onClick={placeStartPointOnMap}>Place on Map</button>
          <button onClick={setDeviceLocation}>Use Device Location</button>
        </div>

        <div className="inputContainer">
          <label className="label">End point</label>
          <input
            className="input"
            type="text"
            value={`${endPoint.lat}, ${endPoint.lng}`}
            onChange={(e) => {
              const lat = e.splitsplit(',')[0]
              const lng  = e.splitsplit(',')[1]
              setEndPoint({ lat: lat, lng: lng })
            }}
            placeholder="Enter end point"
          />
          <button onClick={placeEndPointOnMap}>Place on Map</button>
        </div>

        <div className="inputContainer">
          <label className="label">Cuisine type</label>
          <select
            className="input"
            value={cuisineType}
            onChange={(e) => setCuisineType(e.target.value)}
          >
            <option value="" disabled>No preference</option>
            <option value="regional">Regional</option>
            <option value="italian">Italian</option>
            <option value="chinese">Chinese</option>
            <option value="indian">Indian</option>
            <option value="german">German</option>
            <option value="french">French</option>
          </select>
        </div>

        <div className="inputContainer">
          <label className="label">Departure time</label>
          <input
            className="input"
            type="time"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
          />
        </div>

        <div className="inputContainer">
          <label className="label">When you want to eat</label>
          <input
            className="input"
            type="time"
            value={whenToEat}
            onChange={(e) => setWhenToEat(e.target.value)}
          />
        </div>

        <button className="goButton" onClick={initializeRoute}>
          GO
        </button>

        {tripDetails.distance && tripDetails.time && (
          <div className="tripDetails">
            <p>Distance: {tripDetails.distance} km</p>
            <p>Estimated time: {tripDetails.time.hours}:{tripDetails.time.minutes}:{tripDetails.time.secondes}s</p>
            <p>Estimated time of arrival: {tripDetails.arrive.hours}:{tripDetails.arrive.minutes}:{tripDetails.arrive.secondes}s</p>
            <p><b>{tripDetails.diner}</b></p>
          </div>
        )}
      </div>

      <div id="map" style={{ height: '100%' }}></div>
    </div>
  );
};

export default RoutingApp;
