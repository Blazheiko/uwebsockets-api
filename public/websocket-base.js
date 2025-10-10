class WebsocketBase {
    constructor(url, options = {}) {
        this.reconnectDelay = options.reconnectDelay || 5000;
        this.wsConnection = {};
        this.apiResolve = {};
        this.connectionEstablished = false;
        this.initConnect(url);
    }

    isConnected() {
        return (
            this.wsConnection.ws &&
            this.wsConnection.ws.readyState === WebSocket.OPEN
        );
    }
    initConnect(url) {
        console.log(`Sending Websocket connection to: ${url}`);
        const ws = new WebSocket(url);
        console.log(`Sending Websocket connection to: ${url}`);
        this.wsConnection.ws = ws;
        this.wsConnection.closeInitiated = false;

        ws.onopen = () => {
            console.log(`Connected to the Websocket Server: ${url}`);
            this.wsConnection.timerPing = setInterval(() => {
                this.pingServer();
            }, 5000);
        };

        // handle data message. Pass the data to the call back method from user
        // It could be useful to store the original messages from server for debug
        ws.onmessage = (message) => {
            // console.log(`Websocket api:`);
            const data = JSON.parse(message.data);
            // console.log(data);
            if (!data || !data.event) {
                console.log('return');
                return;
            }
            // console.log(`Websocket event:${data.event}`);
            if (data.event.includes('service:')) this.service(data);
            else if (data.event.includes('api:')) {
                this.messageHandler(data);
            }
        };

        ws.onerror = (err) => {
            console.error('Received error from server');
            console.error(err);
        };

        ws.onclose = (closeEventCode, reason) => {
            if (!this.wsConnection.closeInitiated) {
                console.warn(
                    `Connection close due to ${closeEventCode}: ${reason}.`,
                );
                setTimeout(() => {
                    console.warn('Reconnect to the server.');
                    this.initConnect(url);
                }, this.reconnectDelay);
            } else {
                this.wsConnection.closeInitiated = false;
            }
        };
    }

    /**
     * Unsubscribe the stream <br>
     *
     */
    disconnect() {
        if (!this.isConnected()) console.warn('No connection to close.');
        else {
            this.wsConnection.closeInitiated = true;
            this.wsConnection.ws.close();
            if (this.wsConnection?.timerPing)
                clearInterval(this.wsConnection.timerPing);

            console.log('Disconnected with Binance Websocket Server');
        }
    }

    /**
     * Send Ping message to the Websocket Server <br>
     *
     */
    pingServer() {
        if (!this.isConnected()) {
            console.warn('Ping only can be sent when connection is ready.');
            return;
        }
        // console.log('Send PING to the Websocket Server');
        this.send({ event: 'service:ping' });
    }

    send(payload) {
        if (!this.isConnected()) {
            console.warn('Send only can be sent when connection is ready.');
            return;
        }
        if (this.timerClose) clearTimeout(this.timerClose);
        this.timerClose = setTimeout(() => {
            this.disconnect();
        }, 10000);
        this.wsConnection.ws.send(JSON.stringify(payload));
    }
    async api(route, payload = {}) {
        return new Promise((resolve, reject) => {
            if (this.apiResolve[route]) reject();
            this.send({
                event: `api:${route}`,
                payload,
            });
            this.apiResolve[route] = {
                resolve,
                reject,
                timeout: setTimeout(() => {
                    reject();
                }, 5000),
            };
        });
    }

    service(data) {
        const service = {
            // 'service:pong'
            pong: () => clearTimeout(this.timerClose),
            connection_established: () => (this.connectionEstablished = true),
        };
        if (data && data.event) {
            const arr = data.event.split(':');
            if (arr.length < 2) return;
            const handler = service[arr[1]];
            handler();
        }
    }
    messageHandler(data) {
        console.log('message handler');
        const arr = data.event.split(':');
        if (arr.length < 2) return;
        const route = arr[1];
        const cb = this.apiResolve[route];
        if (!cb) return;
        clearTimeout(cb.timeout);
        delete this.apiResolve[route];
        if (data.status === 200 && cb.resolve) cb.resolve(data);
        else if (cb.reject)
            cb.reject({
                status: data?.status,
                message: data?.payload?.message,
                messages: data?.payload?.messages,
            });
    }
}
