var templatePath = '/assets/data/templates/geoJSON/'

onmessage = (event) => {
  self.importScripts('../vendor/js/exif-parser-0.1.12-min.js')
  var parser = self.ExifParser.create(event.data);
  try {
    Promise.all(['feature.json', 'point.json'].map(filename => {
        return fetch(templatePath + filename)
          .then(response => response.json())
          .then(json => json)
      }))
      .then(jsons => {
        var geoJSONPoint = {
          ...jsons[0],
          geometry: jsons[1]
        }

        var {
          DateTimeOriginal,
          GPSLongitude,
          GPSLatitude
        } = parser.parse().tags;

        self.postMessage(JSON.stringify({
          timestamp: new Date(DateTimeOriginal * 1000),
          geoJSON: {
            ...geoJSONPoint,
            geometry: {
              ...geoJSONPoint.geometry,
              coordinates: [GPSLongitude, GPSLatitude]
            }
          }
        }))
      })
  } catch (err) {
    console.error("exif parse error :-S", err) // got invalid data, handle error
  }
}