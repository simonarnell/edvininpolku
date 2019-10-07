onmessage = (event) => {
  self.importScripts('../vendor/js/exif-parser-0.1.12-min.js')
  var parser = self.ExifParser.create(event.data);
  try {
    var result = parser.parse();
    self.postMessage(JSON.stringify({
      timestamp: new Date(result.tags.DateTimeOriginal * 1000),
      geoJSON: {
        "type": "Feature",
        "properties": {},
        "geometry": {
          "type": "Point",
          "coordinates": [result.tags.GPSLongitude, result.tags.GPSLatitude]
        }
      }
    }))
  } catch (err) {
    console.error("exif parse error :-S", err) // got invalid data, handle error
  }
}