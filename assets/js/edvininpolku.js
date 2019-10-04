var blobs = [];
var count = 0;

fetch('https://api.github.com/repos/simonarnell/edvininpolku/contents?ref=images')
  .then((response) => {
    console.debug(response)
    response.json().then((data) => {
      console.debug(data)
      if(Array.isArray(data)) {
        data.map(file => {
          fetch(file.download_url)
            .then((dlres) => dlres.blob())
            .then((blob) => blobs.push(blob))
            .catch((err) => console.error('error fetching imag :-S', err))
        })
      }
    })
  })
  .catch((err) => {
    console.log('error fetching images list :-S', err)
  })

var webworker = new Worker('assets/js/webworker.js');
webworker.onmessage = (event) => {
  console.log('received :-S', event.data)
}
webworker.postMessage("ping")
console.log("pinging webworker")

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
      var fileReader = new FileReader();
      fileReader.onload = (event) => {
        var buffer = event.target.result;
        var parser = window.ExifParser.create(buffer);
        try {
          var result = parser.parse();
          console.log(result.tags)
        } catch(err) {
          console.log("exif parse error :-S", err)// got invalid data, handle error
        }
      };
      fileReader.readAsArrayBuffer(blobs[count]);
      count = (count + 1) % blobs.length;
    }
  }, 2000)
});
