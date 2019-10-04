fetch('https://api.github.com/repos/simonarnell/edvininpolku/contents?ref=images')
  .then((response) => {
    console.debug(response)
  })
  .catch((err) => {
    console.log('error fetching images list :-S', err)
  })
