class WebsocketBase {
    constructor(url, options = {}) {
        this.reconnectDelay = options.reconnectDelay || 5000;
        this.wsConnection = {};
        this.initConnect(url);
    }

    isConnected() {
        return (
            this.wsConnection.ws &&
            this.wsConnection.ws.readyState === WebSocket.OPEN
        );
    }
    initConnect(url) {
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
            console.log(`Websocket message:`);
            console.log(JSON.parse(message.data));
            if (message.data && message.data.event === 'service:pong') {
                if (this.timerClose) clearTimeout(this.timerClose);
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
        console.log('Send PING to the Websocket Server');
        this.send({ event: 'service:ping' });
        if (this.timerClose) clearTimeout(this.timerClose);
        this.timerClose = setTimeout(() => {
            this.disconnect();
        }, 10000);
    }

    send(payload) {
        if (!this.isConnected()) {
            console.warn('Send only can be sent when connection is ready.');
            return;
        }
        this.wsConnection.ws.send(JSON.stringify(payload));
    }
}
