const init = async () => {
    toggleLoader(true);
    let data = await Api.http('GET', '/api/init');
    toggleLoader(false);
    // const res = await Api.http('GET', '/api/set-header-and-cookie');
    // console.log({ res });
    // const middleware = await Api.http('GET', '/api/test-middleware');
    // console.log({ middleware });
    // data = await Api.http(
    //     'POST',
    //     '/auth/login',
    //     {
    //         email: 'test2@email.com',
    //         password: '123456789',
    //     },
    // );

    console.log(data);
    if(!data){
        toggleConnectionStatus(false); // Показать сообщение об отсутствии соединения
    }else if(data.status === 'ok'){
        if(data.token) connectWS(data.token);
    }else if(data.status === 'unauthorized'){
        switchModal('register-modal', 'login-modal');
    }
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
                init.body = JSON.stringify(body);
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



const showModal = (modalId) => {
    document.getElementById(modalId).classList.add('show');
}

const closeModal = (modalId) => {
    document.getElementById(modalId).classList.remove('show');
}

const switchModal = (currentModalId, nextModalId) => {
    closeModal(currentModalId);
    showModal(nextModalId);
}


// Показать индикатор печатания
const showTypingIndicator = () => {
    document.querySelector('.typing-indicator').style.display = 'flex';
}

// Скрыть индикатор печатания
const hideTypingIndicator = () => {
    document.querySelector('.typing-indicator').style.display = 'none';
}

// Функция для показа/скрытия лоадера
const toggleLoader = (show) => {
    const loader = document.querySelector('.loader-overlay');
    if (!loader) {
        console.warn('Loader element not found');
        return;
    }
    
    const body = document.body;
    
    if (show) {
        loader.classList.add('show');
        body.classList.add('loading');
        setTimeout(() => {
            loader.style.opacity = '1';
        }, 10);
    } else {
        loader.style.opacity = '0';
        body.classList.remove('loading');
        setTimeout(() => {
            loader.classList.remove('show');
        }, 300);
    }
}

// Функция для показа/скрытия статуса соединения
const toggleConnectionStatus = (online) => {
    const status = document.querySelector('.connection-status');
    if (!status) {
        console.warn('Connection status element not found');
        return;
    }
    
    if (!online) {
        status.classList.add('offline');
    } else {
        status.classList.remove('offline');
    }
}

let user = null;

const saveUser = (user) => {
    user;
}

// Функции для авторизации
const loginUser = async (email, password) => {
    try {
        toggleLoader(true);
        
        const data = await Api.http(
            'POST',
            '/auth/login',
            {
                email,
                password
            }
        );
        
        
        if (data && data.status === 'success') {
            // Сохраняем информацию о пользователе
            user = data.user;
            
            // Закрываем модальное окно
            closeModal('login-modal');
            
            // Обновляем UI для авторизованного пользователя
            updateAuthUI(true, data.user.name);
            
            // Подключаем WebSocket если есть токен
            if (data.token) connectWS(data.token);
            
        } else {
            // showError(data?.message || 'Login failed');
            // return ;
        }
    } catch (error) {
        console.error('Login failed: ' + error.message);
        console.error( error );
        // showError('Login failed: ' + error.message);
        // return ;
    } finally {
        toggleLoader(false);
    }
};

const registerUser = async (name, email, password) => {
    try {
        toggleLoader(true);
        
        const data = await Api.http(
            'POST',
            '/auth/register',
            {
                name,
                email,
                password
            }
        );
        
        if (data && data.status === 'success') {
            // Сохраняем информацию о пользователе
            // localStorage.setItem('user', JSON.stringify(data.user));
            user = data.user;
            // Закрываем модальное окно
            closeModal('register-modal');
            
            // Обновляем UI для авторизованного пользователя
            updateAuthUI(true, data.user.name);
            
            // Подключаем WebSocket если есть токен
            if (data.token) connectWS(data.token);
            
            // return data;
        } else {
            showError(data?.message || 'Registration failed');
            // return null;
        }
    } catch (error) {
        console.error('Registration failed: ' + error.message);
        console.error( error );
        // showError('Registration failed: ' + error.message);
        // return null;
    } finally {
        toggleLoader(false);
    }
};

// Функция для отображения ошибок
const showError = (message) => {
    alert(message); // Можно заменить на более красивое уведомление
};

// Функция для обновления UI после авторизации
const updateAuthUI = (isLoggedIn, userName = '') => {
    const authButton = document.querySelector('.auth-header-button');
    
    if (isLoggedIn) {
        authButton.textContent = `Sign Out (${userName})`;
        authButton.onclick = logout;
    } else {
        authButton.textContent = 'Sign In';
        authButton.onclick = () => showModal('login-modal');
    }
};

// Функция для выхода из аккаунта
const logout = async () => {
    try {
        toggleLoader(true);
        
        // Очищаем локальное хранилище
        localStorage.removeItem('user');
        
        // Отправляем запрос на выход (если требуется на бэкенде)
        await Api.http('POST', '/auth/logout', null);
        
        // Отключаем WebSocket
        WebSocketClient = null;
        
        // Обновляем UI
        updateAuthUI(false);
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        toggleLoader(false);
    }
};

// Проверка статуса авторизации при загрузке страницы
// const checkAuthStatus = () => {
//     const userData = localStorage.getItem('user');
    
//     if (userData) {
//         try {
//             const user = JSON.parse(userData);
//             updateAuthUI(true, user.name);
//         } catch (e) {
//             localStorage.removeItem('user');
//         }
//     }
// };

// Ждем загрузки DOM перед добавлением обработчиков событий
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем наличие необходимых элементов в DOM
    const loader = document.querySelector('.loader-overlay');
    const status = document.querySelector('.connection-status');
    const retryButton = document.querySelector('.retry-button');
    const toggleButton = document.querySelector('.toggle-contacts');
    const contactsList = document.querySelector('.contacts');

    if (!loader) {
        console.error('Loader overlay element is missing. Please add the following HTML:');
    }

    if (!status) {
        console.error('Connection status element is missing. Please add the following HTML:');
    }

    // Обработчик для кнопки повторного подключения
    if (retryButton) {
        retryButton.addEventListener('click', () => {
            toggleLoader(true);
            // Имитация переподключения
            setTimeout(() => {
                toggleLoader(false);
                toggleConnectionStatus(true);
            }, 2000);
        });
    }

    toggleButton.addEventListener('click', () => {
        contactsList.classList.toggle('show');
    });

    // Закрываем список контактов при клике на чат в мобильной версии
    document.querySelector('.chat-area').addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            contactsList.classList.remove('show');
        }
    });
    // Закрытие модального окна при клике вне его области
    document.addEventListener('click', (event) =>{
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            if (event.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });

    window.Api = api;
    init().then(() => {
        console.log('init success');
    });

    // Проверяем статус авторизации
    // checkAuthStatus();
    
    // Обработчик формы логина
    const loginForm = document.querySelector('#login-modal form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            if (!email || !password) {
                showError('Please fill in all fields');
                return;
            }
            
            await loginUser(email, password);
        });
    }
    
    // Обработчик формы регистрации
    const registerForm = document.querySelector('#register-modal form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-password-confirm').value;
            
            if (!name || !email || !password || !confirmPassword) {
                showError('Please fill in all fields');
                return;
            }
            
            if (password !== confirmPassword) {
                showError('Passwords do not match');
                return;
            }
            
            await registerUser(name, email, password);
        });
    }
});

// toggleConnectionStatus(true); // Скрыть сообщение об отсутствии соединения
