onmessage = (event) => {
  self.importScripts('../vendor/js/exif-parser-0.1.12-min.js')
  var parser = self.ExifParser.create(event.data);
  try {
    var result = parser.parse();
    var position = {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Point",
        "coordinates": [result.tags.GPSLongitude, result.tags.GPSLatitude]
      }
    }
    self.postMessage(JSON.stringify(position))
  } catch (err) {
    console.log("exif parse error :-S", err) // got invalid data, handle error
  }
}