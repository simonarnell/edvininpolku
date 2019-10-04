fetch('https://api.github.com/repos/simonarnell/edvininpolku/contents?ref=images')
  .then((response) => {
    console.log(response)
  })
  .catch((err) => {
    console.log('error fetching images list :-S', err)
  })
