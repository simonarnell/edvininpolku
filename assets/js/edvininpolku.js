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
  updateProgress('0', 'Querying GitHub API')
  fetch(config.urls.imagesBranch)
    .then((response) => {
      response.json().then((data) => {
        if (Array.isArray(data)) {
          var imagesDownloaded = 0
          var imagesProcessed = 0
          Promise.all(data.map(file => {
              return new Promise((resolve) => {
                updateProgress('5', 'Fetching image set')
                fetch(file.download_url)
                  .then((response) => response.blob())
                  .then((blob) => {
                    imagesDownloaded++;
                    var numericProgress = () => (5 + (90 * ((imagesDownloaded + imagesProcessed) / (data.length * 2)))).toFixed(1);
                    var textualProgress = () => `${imagesDownloaded}/${data.length} downloaded; ${imagesProcessed}/${data.length} processed`
                    updateProgress(numericProgress(), textualProgress())
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
                        var templatePath = 'assets/data/templates/jSONLD/'
                        fetch(templatePath + 'object.json')
                          .then(response => response.json())
                          .then(objectJsonLDTemplate => {
                            Promise.all(['objectAuthor.json', 'location.json'].map(filename => {
                                return fetch(templatePath + filename)
                                  .then(response => response.json())
                                  .then(json => json)
                              }))
                              .then(jsons => {
                                image.jsonld = {
                                  ...objectJsonLDTemplate,
                                  image: file.download_url,
                                  author: jsons[0],
                                  spatial: {
                                    ...objectJsonLDTemplate.spatial,
                                    geo: {
                                      ...objectJsonLDTemplate.spatial.geo,
                                      latitude: image.metadata.geoJSON.geometry.coordinates[1],
                                      longitude: image.metadata.geoJSON.geometry.coordinates[0]
                                    },
                                    containedInPlace: jsons[1]
                                  }
                                }
                              })
                          })
                        geoJSONMarkerLayer.addData(metadata.geoJSON)
                        map.fitBounds(geoJSONMarkerLayer.getBounds())
                        imagesProcessed++;
                        updateProgress(numericProgress(), textualProgress())
                        resolve(image)
                      })
                    images.push(image)
                    return image
                  })
                  .catch((err) => console.error('error fetching image :- ', err))
              })
            }))
            .then((images) => {
              updateProgress(97.5, 'sorting images chronologically')
              var sortedImages = images.sort((a, b) => a.metadata.timestamp - b.metadata.timestamp)
              sortedImages.forEach((image) => {
                var scriptEl = document.createElement('script');
                scriptEl.setAttribute('type', 'application/ld+json');
                scriptEl.innerHTML = JSON.stringify(image.jsonld);
                var bodyEl = document.getElementsByTagName('body')[0];
                bodyEl.appendChild(scriptEl)
                var sectionEl = document.createElement('section');
                sectionEl.setAttribute('id', image.filename)
                sectionEl.setAttribute('class', 'sculpture');
                sectionEl.appendChild(image.img)
                var collectionEl = document.getElementsByClassName('collection')[0]
                collectionEl.appendChild(sectionEl)
                var imageEl = sectionEl.firstElementChild
                var observer = new IntersectionObserver((entries, observer) => {
                  var mostVisible = entries.reduce((max, entry) => entry.intersectionRatio > max.intersectionRatio ? entry : max)
                  geoJSONMarkerLayer.eachLayer((layer) => {
                    if (layer.feature.properties.filename == mostVisible.target.parentElement.getAttribute('id'))
                      layer.setIcon(new L.Icon.Default())
                    else
                      layer.setIcon(greyIcon)
                  })
                }, {
                  root: null,
                  rootMargin: '0px',
                  threshold: 0.60
                });
                observer.observe(imageEl);
              })
              return sortedImages;
            })
            .then((images) => {
              this.images = images;
              var templatePath = "/assets/data/templates/geoJSON/"
              Promise.all(['featureCollection.json', 'feature.json', 'lineString.json'].map(filename => {
                  return fetch(templatePath + filename)
                    .then(response => response.json())
                    .then(json => json)
                }))
                .then(jsons => {
                  return {
                    ...jsons[0],
                    features: [{
                      ...jsons[1],
                      geometry: {
                        ...jsons[2],
                        coordinates: images.map(image => image.metadata.geoJSON.geometry.coordinates)
                      }
                    }]
                  }
                })
                .then(geoJSONFeatureCollection => {
                  updateProgress(100, 'rendering path')
                  geoJSONPathLayer.addData(geoJSONFeatureCollection)
                })
            })
        }
      })
    })
})

document.ready = new Promise(
  (resolve) => document.addEventListener('DOMContentLoaded', resolve))

Promise.resolve(document.ready)
  .then(() => {
    var templatePath = 'assets/data/templates/jSONLD/'
    fetch(templatePath + 'website.json')
      .then(response => response.json())
      .then(websiteJsonLDTemplate => {
        Promise.all(['websiteAuthor.json', 'location.json', 'objectAuthor.json'].map(filename => {
            return fetch(templatePath + filename)
              .then(response => response.json())
              .then(json => json)
          }))
          .then(jsons => {
            var websiteJsonLD = {
              ...websiteJsonLDTemplate,
              author: jsons[0],
              about: jsons[1],
              mentions: jsons[2]
            }
            var scriptEl = document.createElement('script')
            scriptEl.setAttribute('type', 'application/ld+json')
            scriptEl.innerHTML = JSON.stringify(websiteJsonLD)
            document.head.appendChild(scriptEl)
            console.log("here")
          })
      })
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
    }).addTo(map).on('click', (event) => {
      document.getElementById(event.layer.feature.properties.filename).scrollIntoView();
    });
    geoJSONPathLayer = L.geoJSON(null, {
      style: function(feature) {
        return {
          stroke: true,
          color: "black",
          weight: 5
        };
      }
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

function updateProgress(percent, text) {
  var barEl = document.getElementById('progress-graphic')
  barEl.style.width = `${percent}%`
  var progressTextEl = document.getElementById('progress-text')
  progressTextEl.innerHTML = `${text} - ${percent}%`
  if (percent == 100) {
    document.getElementById('sidebar-progress-bar').style.opacity = 0;
    setTimeout(() => {
      var sidebarEl = document.getElementById('sidebar-progress-bar')
      sidebarEl.parentNode.removeChild(sidebarEl)
    }, 1000)
  }
}