const init = async () => {
    const data = await Api.http('GET', '/api/init');
    connectWS(data.token);
    const res = await Api.http('GET', '/api/set-header-and-cookie');
    console.log({ res });
    const middleware = await Api.http('GET', '/api/test-middleware');
    console.log({ middleware });
    const user = await Api.http(
        'POST',
        '/api/save-user',
        JSON.stringify({
            name: 'New name',
            email: 'test@gmail.com',
            password: '123456789',
        }),
    );
    console.log({ user });
};

const api = {
    http: async (method, route, body = {}) => {
        try {
            const BASE_URL = 'http://127.0.0.1:8082';
            const init = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
            };
            if (method.toLowerCase() !== 'get') init.body = body;
            const response = await fetch(`${BASE_URL}${route}`, init);
            const result = await response.json();
            console.log(result);
            return result;
        } catch (error) {
            console.error('Error: ' + route);
            console.error(error);
            return null;
        }
    },
    ws: async (route, body = {}) => {
        if (!WebSocketClient) return null;
        try {
            const result = await WebSocketClient.api(route, body);
            console.log({ result });
            return result;
        } catch (e) {
            console.error(e);
            return null;
        }
    },
};

const errorHttpHandler = (error) => {
    alert('Error fech');
};
const errorWsHandler = (error) => {
    alert('Error ws');
};

let WebSocketClient = null;
const connectWS = (token) => {
    WebSocketClient = new WebsocketBase(
        `ws://127.0.0.1:8082/websocket/${token}`,
    );
    console.log(WebSocketClient);
    setTimeout(async () => {
        const wsUser = await Api.ws('save-user', {
            // name: 'WS name',
            email: 'test@gmail.com',
            password: '123456789',
        });
        console.log({ wsUser });
    }, 4000);
    // setTimeout(async () => {
    //     const error = await Api.ws('error');
    //     console.log({ error });
    // }, 5000);
};
window.Api = api;
init().then(() => {
    console.log('init success');
});
