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
    }
  }, 2000)
});
