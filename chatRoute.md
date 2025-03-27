# Chat API Routes Documentation

## Base URL
```
/api/chat
```

## Authentication
Все маршруты требуют аутентификации. Используется middleware `session_web`.

## Chat List Routes

### Get Chat List
```http
GET /chats
```

Получает список всех чатов пользователя.

**Response:**
```json
{
    "status": "ok",
    "user": {
        "id": 1,
        "name": "User Name",
        "email": "user@example.com"
    },
    "chats": [
        {
            "id": 1,
            "userId": 1,
            "contactId": 2,
            "status": "accepted",
            "unreadCount": 0,
            "createdAt": "2024-03-27T12:00:00Z",
            "updatedAt": "2024-03-27T12:00:00Z",
            "contact": {
                "id": 2,
                "name": "Contact Name",
                "email": "contact@example.com"
            }
        }
    ]
}
```

### Create Chat
```http
POST /chats
```

Создает новый чат с пользователем.

**Request Body:**
```json
{
    "participantId": 2
}
```

**Response:**
```json
{
    "status": "ok",
    "chat": {
        "id": 1,
        "userId": 1,
        "contactId": 2,
        "status": "accepted",
        "unreadCount": 0,
        "createdAt": "2024-03-27T12:00:00Z",
        "updatedAt": "2024-03-27T12:00:00Z",
        "user": {
            "id": 1,
            "name": "User Name",
            "email": "user@example.com"
        },
        "contact": {
            "id": 2,
            "name": "Contact Name",
            "email": "contact@example.com"
        }
    }
}
```

### Delete Chat
```http
DELETE /chats/:chatId
```

Удаляет чат.

**URL Parameters:**
- `chatId`: ID чата (положительное число)

**Response:**
```json
{
    "status": "ok",
    "message": "Chat deleted successfully"
}
```

## Message Routes

### Get Messages
```http
GET /messages/:contactId
```

Получает сообщения с конкретным контактом.

**URL Parameters:**
- `contactId`: ID контакта (положительное число)

**Response:**
```json
{
    "status": "ok",
    "messages": [
        {
            "id": 1,
            "senderId": 1,
            "receiverId": 2,
            "type": "TEXT",
            "content": "Message content",
            "src": null,
            "isRead": false,
            "createdAt": "2024-03-27T12:00:00Z",
            "updatedAt": "2024-03-27T12:00:00Z",
            "sender": {
                "id": 1,
                "name": "Sender Name",
                "email": "sender@example.com"
            },
            "receiver": {
                "id": 2,
                "name": "Receiver Name",
                "email": "receiver@example.com"
            }
        }
    ]
}
```

### Send Message
```http
POST /messages
```

Отправляет новое сообщение.

**Request Body:**
```json
{
    "contactId": 2,
    "content": "Message content",
    "type": "TEXT", // Опционально: TEXT, IMAGE, VIDEO, AUDIO
    "src": "https://example.com/image.jpg" // Опционально: URL или путь к медиа-файлу
}
```

**Response:**
```json
{
    "status": "ok",
    "message": {
        "id": 1,
        "senderId": 1,
        "receiverId": 2,
        "type": "TEXT",
        "content": "Message content",
        "src": null,
        "isRead": false,
        "createdAt": "2024-03-27T12:00:00Z",
        "updatedAt": "2024-03-27T12:00:00Z",
        "sender": {
            "id": 1,
            "name": "Sender Name",
            "email": "sender@example.com"
        },
        "receiver": {
            "id": 2,
            "name": "Receiver Name",
            "email": "receiver@example.com"
        }
    }
}
```

### Delete Message
```http
DELETE /messages/:messageId
```

Удаляет сообщение.

**URL Parameters:**
- `messageId`: ID сообщения (положительное число)

**Response:**
```json
{
    "status": "ok",
    "message": "Message deleted successfully"
}
```

### Edit Message
```http
PUT /messages/:messageId
```

Редактирует существующее сообщение.

**URL Parameters:**
- `messageId`: ID сообщения (положительное число)

**Request Body:**
```json
{
    "content": "Updated message content"
}
```

**Response:**
```json
{
    "status": "ok",
    "message": {
        "id": 1,
        "senderId": 1,
        "receiverId": 2,
        "type": "TEXT",
        "content": "Updated message content",
        "src": null,
        "isRead": false,
        "createdAt": "2024-03-27T12:00:00Z",
        "updatedAt": "2024-03-27T12:00:00Z",
        "sender": {
            "id": 1,
            "name": "Sender Name",
            "email": "sender@example.com"
        },
        "receiver": {
            "id": 2,
            "name": "Receiver Name",
            "email": "receiver@example.com"
        }
    }
}
```

### Mark Message as Read
```http
PUT /messages/:messageId/read
```

Отмечает сообщение как прочитанное.

**URL Parameters:**
- `messageId`: ID сообщения (положительное число)

**Response:**
```json
{
    "status": "ok",
    "message": {
        "id": 1,
        "senderId": 1,
        "receiverId": 2,
        "type": "TEXT",
        "content": "Message content",
        "src": null,
        "isRead": true,
        "createdAt": "2024-03-27T12:00:00Z",
        "updatedAt": "2024-03-27T12:00:00Z",
        "sender": {
            "id": 1,
            "name": "Sender Name",
            "email": "sender@example.com"
        },
        "receiver": {
            "id": 2,
            "name": "Receiver Name",
            "email": "receiver@example.com"
        }
    }
}
```

## Error Responses
Все маршруты могут возвращать следующие ошибки:

```json
{
    "status": "error",
    "message": "Error message description"
}
```

Возможные сообщения об ошибках:
- "Session not found"
- "User ID not found"
- "Unauthorized"
- "Chat not found or access denied"
- "Message not found or access denied"
- "Contact not found or access denied"
- "Participant ID is required"
- "Chat ID is required"
- "Message ID is required"
- "Contact ID and content are required" 