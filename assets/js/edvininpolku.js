var blobs = [];
var count = 0;
var geoJSON
var config

var configured = fetch('assets/data/config.json')
  .then(response => response.json())
  .then(json => {
    console.debug(json)
    config = json
  })

Promise.resolve(configured).then(() => {
  fetch(config.urls.imagesBranch)
    .then((response) => {
      console.debug(response)
      response.json().then((data) => {
        console.debug(data)
        if (Array.isArray(data)) {
          Promise.all(data.map(file => {
              return new Promise((resolve) => {
                fetch(file.download_url)
                  .then((response) => response.blob())
                  .then((blob) => {
                    blobs.push(blob)
                    var fileReader = new FileReader();
                    return new Promise((resolve) => {
                      fileReader.onload = (event) => {
                        var buffer = event.target.result;
                        var webworker = new Worker('assets/js/exif-webworker.js');
                        webworker.onmessage = (event) => resolve(JSON.parse(event.data))
                        webworker.postMessage(buffer, [buffer])
                      }
                      fileReader.readAsArrayBuffer(blob);
                    })
                  })
                  .then(exif => resolve(exif))
                  .catch((err) => console.error('error fetching image :-S', err))
              })
            }))
            .then((points) => {
              geoJSON = {
                "type": "FeatureCollection",
                "properties": {},
                "features": points.map(point => point)
              }
              console.debug(geoJSON)
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
      if (blobs.length > 0) {
        var canvas = document.getElementById('canvas');
        var img = new Image();
        img.onload = () => {
          var ctx = canvas.getContext('2d')
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
        }
        img.src = URL.createObjectURL(blobs[count]);
        count = (count + 1) % blobs.length;
      }
    }, 2000)
  })

Promise.all([document.ready, configured])
  .then(() => {
    var map = L.map('map');
    map.setView([51, 0], 13);
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
      id: 'mapbox.streets',
      accessToken: config.apikeys.mapbox
    }).addTo(map);
  })