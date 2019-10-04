var blobs = [];
var points = []
var count = 0;
var totalImages;
var featureCollection

fetch('https://api.github.com/repos/simonarnell/edvininpolku/contents?ref=images')
  .then((response) => {
    console.debug(response)
    response.json().then((data) => {
      console.debug(data)
      if(Array.isArray(data)) {
        totalImages = data.length
        data.map(file => {
          fetch(file.download_url)
            .then((dlres) => dlres.blob())
            .then((blob) => {
              blobs.push(blob)
              var fileReader = new FileReader();
              fileReader.onload = (event) => {
                var buffer = event.target.result;
                var webworker = new Worker('assets/js/exif-webworker.js');
                webworker.onmessage = (event) => {
                  points.push(JSON.parse(event.data))
                  if(totalImages == points.length) {
                    featureCollection = {
                      "type": "FeatureCollection",
                      "properties": {},
                      "features": points.map(point => point)
                    }
                    console.log(featureCollection)
                  }
                }
                webworker.postMessage(buffer, [buffer])
              };
              fileReader.readAsArrayBuffer(blobs[count]);
            })
            .catch((err) => console.error('error fetching imag :-S', err))
        })
      }
    })
  })
  .catch((err) => {
    console.log('error fetching images list :-S', err)
  })

document.addEventListener("DOMContentLoaded", function(event) {
  setInterval(() => {
    if(blobs.length > 0) {
      var canvas = document.getElementById('canvas');
      var img = new Image();
      img.onload = () => {
        var ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
      }
      img.src = URL.createObjectURL(blobs[count]);
      count = (count + 1) % blobs.length;
      console.log(points)
    }
  }, 2000)
});
