var images = [];
var count = 0;
var config
var map
var geoJSONMarkerLayer, geoJSONPathLayer;

var configured = fetch('assets/data/config.json')
  .then(response => response.json())
  .then(json => {
    config = json
  })

Promise.resolve(configured).then(() => {
  fetch(config.urls.imagesBranch)
    .then((response) => {
      response.json().then((data) => {
        if (Array.isArray(data)) {
          Promise.all(data.map(file => {
              return new Promise((resolve) => {
                fetch(file.download_url)
                  .then((response) => response.blob())
                  .then((blob) => {
                    var image = {
                      filename: file.name
                    };
                    var img = new Image();
                    img.src = URL.createObjectURL(blob);
                    image.img = img
                    var fileReader = new FileReader();
                    new Promise((resolve) => {
                        fileReader.onload = (event) => {
                          var buffer = event.target.result;
                          var webworker = new Worker('assets/js/exif-webworker.js');
                          webworker.onmessage = (event) => resolve(JSON.parse(event.data))
                          webworker.postMessage(buffer, [buffer])
                        }
                        fileReader.readAsArrayBuffer(blob);
                      })
                      .then((metadata) => {
                        image.metadata = metadata
                        image.metadata.geoJSON.properties.filename = file.name
                        image.jsonld = {
                          "@context": "http://schema.org",
                          "@type": "Sculpture",
                          "image": file.download_url,
                          "author": {
                            "@type": "Person",
                            "name": "Edvin Hevonkoski",
                            "sameAs": "https://en.wikipedia.org/wiki/Edvin_Hevonkoski"
                          },
                          "spatial": {
                            "@type": "Place",
                            "geo": {
                              "@type": "GeoCoordinates",
                              "latitude": image.metadata.geoJSON.geometry.coordinates[1],
                              "longitude": image.metadata.geoJSON.geometry.coordinates[0]
                            },
                            "containedInPlace": {
                              "@type": "Park",
                              "name": "Edvininpolku",
                              "alternateName": "Edvin's Art Park",
                              "address": {
                                "@type": "PostalAddress",
                                "addressCountry": {
                                  "@type": "Country",
                                  "name": "FI"
                                },
                                "addressLocality": "Asevelikylä",
                                "addressRegion": "Vaasa",
                                "postalCode": "65300",
                                "streetAddress": "Aleksis Kiventie 57"
                              },
                              "geo": {
                                "@type": "GeoCoordinates",
                                "latitude": "63.105246",
                                "longitude": "21.664820"
                              },
                              "sameAs": [
                                "https://fi.wikipedia.org/wiki/Edvininpolku",
                                "https://www.vaasa.fi/asu-ja-ela/vapaa-aika/puistot-ja-viheralueet/puistot/edvininpolun-puisto/"
                              ]
                            }
                          }
                        }
                        var scriptEl = document.createElement('script');
                        scriptEl.setAttribute('type', 'application/ld+json');
                        scriptEl.innerHTML = JSON.stringify(image.jsonld);
                        var bodyEl = document.getElementsByTagName('body')[0];
                        bodyEl.appendChild(scriptEl)
                        geoJSONMarkerLayer.addData(metadata.geoJSON)
                        map.fitBounds(geoJSONMarkerLayer.getBounds())
                        resolve(image)
                      })
                    images.push(image)
                    return image
                  })
                  .catch((err) => console.error('error fetching image :- ', err))
              })
            }))
            .then((images) => images.sort((a, b) => a.metadata.timestamp - b.metadata.timestamp))
            .then((images) => {
              this.images = images;
              return {
                type: "FeatureCollection",
                properties: {},
                features: [{
                  "type": "Feature",
                  "properties": {},
                  "geometry": {
                    "type": "LineString",
                    "coordinates": images.map(image => image.metadata.geoJSON.geometry.coordinates)
                  }
                }]
              }
            })
            .then((geoJSONPath) => {
              geoJSONPathLayer.addData(geoJSONPath)
            })
        }
      })
    })
})

document.ready = new Promise(
  (resolve) => document.addEventListener('DOMContentLoaded', resolve))

Promise.resolve(document.ready)
  .then(() => {
    setInterval(() => {
      var canvas = document.getElementById('canvas');
      var ctx = canvas.getContext('2d')
      var img = images[count].img
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
      geoJSONMarkerLayer.eachLayer((layer) => {
        if (layer.feature.properties.filename == images[count].filename)
          layer.setIcon(new L.Icon.Default())
        else
          layer.setIcon(greyIcon)
      })
      count = (count + 1) % images.length;
    }, 2000)
  })

Promise.all([document.ready, configured])
  .then(() => {
    map = L.map('map');
    map.setView([51, 0], 13);
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
      id: 'mapbox.streets',
      accessToken: config.apikeys.mapbox
    }).addTo(map);
    geoJSONMarkerLayer = L.geoJSON(null, {
      pointToLayer: (geoJsonPoint, latlng) => L.marker(latlng, {
        icon: greyIcon
      })
    }).addTo(map);
    geoJSONPathLayer = L.geoJSON(null, {
      style: function(feature) {
        return {
          stroke: true,
          color: "black",
          weight: 5
        };
      },
    }).addTo(map);
  })

var greyIcon = new L.Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});