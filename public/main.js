const init = () => {
    fetch('http://127.0.0.1:8082/api/init')
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            console.log(data);
            connectWS(data.token);
        });
};
const connectWS = (token) => {
    const WebSocketClient = new WebsocketBase(
        `ws://127.0.0.1:8082/websocket/${token}`,
    );
    console.log(WebSocketClient);
};

init();
