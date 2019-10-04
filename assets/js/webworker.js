onmessage = (event) => {
  console.log('received :-S', event.data)
  postMessage('pong')
}
