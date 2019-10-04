fetch('https://api.github.com/repos/simonarnell/edvininpolku/contents?ref=images')
  .then((response) => {
    console.debug(response)
    response.json().then((data) => {
      console.debug(data)
      if(Array.isArray(data)) {
        data.map(file => {
          console.debug(file.download_url)
        })
      }
    })
  })
  .catch((err) => {
    console.log('error fetching images list :-S', err)
  })
