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
    setTimeout(async () => {
        try {
            const test = await WebSocketClient.api('test');
            console.log({ test });
        } catch (e) {
            console.error(e);
        }
    }, 4000);
    setTimeout(async () => {
        try {
            const test = await WebSocketClient.api('error');
            console.log({ test });
        } catch (e) {
            console.error(e);
        }
    }, 4000);
};

init();
