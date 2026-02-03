export const neonMapStyle = [
  // 1. GLOBAL RESET: Make everything black by default
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#000000"
      }
    ]
  },
  // 2. BUILDINGS ONLY (Override black with Neon Purple)
  {
    "featureType": "landscape.man_made",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#852eff"
      }
    ]
  },
  {
    "featureType": "landscape.man_made",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#000000"
      },
      {
        "weight": 3
      }
    ]
  },
  // 3. POIs (Business, etc) - Ensure they inherit purple or are specific
  {
    "featureType": "poi",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#852eff"
      }
    ]
  },
  
  // 4. LABELS & TEXT
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#00ffff"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#000000"
      },
      {
        "weight": 4
      }
    ]
  },
  // 5. PARKS & WATER (Specific colors)
  {
    "featureType": "poi.park",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#00ff00"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#000055"
      }
    ]
  },
  // 6. ROADS
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#000000"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#00ffff"
      },
      {
        "weight": 1
      }
    ]
  }
];
