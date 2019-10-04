fetch('https://api.github.com/repos/simonarnell/edvininpolku/contents?ref=images')
  .then((response) => {
    console.debug(response)
    response.json().then((data) => {
      console.debug(data)
      if(Array.isArray(data)) {
        data.map(file => {
          fetch(file.download_url)
            .then((dlres) => console.debug(dlres))
            .catch((err) => console.error('error fetching imag :-S', err))
        })
      }
    })
  })
  .catch((err) => {
    console.log('error fetching images list :-S', err)
  })
