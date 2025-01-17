# Tripease

Tripease is a road planning application. The application calculates the optimal route to connect the two locations, including a lunch break at a predefined time in a restaurant of your choice.

## Features

- Calculate optimal routes between two locations.
- Interactive map interface for visualizing routes.
- Time estimation for travel and restaurant stop.
- Restaurant preferences.

## Installation

1. Open a terminal
2. `git clone https://github.com/HKA-OSGIS/Tripease.git` Clone the github repository in your computer
3. `cd Tripease` Open the project folder
4. `npm install` Install dependencies
5. `npm start` Start the serveur
6. Inside a browser type *http://localhost:3000* to access the serveur

## Main library used

- **Leaflet** : Used for rendering the map
- **Leaflet-routing-machine** : Used for calculating and rendering the route
- **Overpass API** : Used for retrieving OpenStreetMap data for restaurants
- **geolib** : Used to calculate distances between 2 coordinates

## What the code does

The application enables users to select a starting point, arrival time, and desired eating time. It then calculates the optimal route between these points using Leaflet and displays the route on the map. Next, it queries the Overpass API to find restaurants in the vicinity that align with the specified eating time. Finally, the three closest restaurants that meet the user's criteria are displayed along the route on the map.

## Team member

- PRATS Kentin
- SORIN Gabriel
- KLEIN Quillian