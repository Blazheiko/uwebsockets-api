const init = async () => {
    // let data = await Api.http('GET', '/api/init');

    const res = await Api.http('GET', '/api/set-header-and-cookie');
    console.log({ res });
    const middleware = await Api.http('GET', '/api/test-middleware');
    console.log({ middleware });
    data = await Api.http(
        'POST',
        '/auth/login',
        JSON.stringify({
            email: 'test2@email.com',
            password: '123456789',
        }),
    );

    console.log(data);
    if(data.token) connectWS(data.token);
};

const api = {
    http: async (method, route, body = {}) => {
        try {
            const BASE_URL = 'http://127.0.0.1:8088';
            const init = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
            };
            if (
                method.toLowerCase() !== 'get' &&
                method.toLowerCase() !== 'delete'
            )
                init.body = body;
            const response = await fetch(`${BASE_URL}${route}`, init);

            if (!response.ok && response.status === 422) {
                console.log('!response.ok && response.status === 422');
                const errorData = await response.json();
                console.log({ errorData });
                return errorData;
            }
            if (!response.ok) {
                console.log('!response.ok');
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            console.log({ data });
            return data;
        } catch (error) {
            console.error('Error: ' + route);
            console.error({ error });
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
    console.log('connectWS token: '+ token);
    WebSocketClient = new WebsocketBase(
        `ws://127.0.0.1:8088/websocket/${token}`,
    );
    console.log(WebSocketClient);
    // setTimeout(async () => {
    //     const wsUser = await Api.ws('save-user', {
    //         names: 'WS name',
    //         email: 'testWS@gmail.com',
    //         password: '123456789',
    //     });
    //     console.log({ wsUser });
    // }, 4000);
    // setTimeout(async () => {
    //     const error = await Api.ws('error');
    //     console.log({ error });
    // }, 5000);
};
window.Api = api;
init().then(() => {
    console.log('init success');
});

document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.querySelector('.toggle-contacts');
    const contactsList = document.querySelector('.contacts');

    toggleButton.addEventListener('click', function() {
        contactsList.classList.toggle('show');
    });

    // Закрываем список контактов при клике на чат в мобильной версии
    document.querySelector('.chat-area').addEventListener('click', function() {
        if (window.innerWidth <= 768) {
            contactsList.classList.remove('show');
        }
    });
});

function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function switchModal(currentModalId, nextModalId) {
    closeModal(currentModalId);
    showModal(nextModalId);
}

// Закрытие модального окна при клике вне его области
document.addEventListener('click', function(event) {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    });
});
// Показать индикатор печатания
function showTypingIndicator() {
    document.querySelector('.typing-indicator').style.display = 'flex';
}

// Скрыть индикатор печатания
function hideTypingIndicator() {
    document.querySelector('.typing-indicator').style.display = 'none';
}
