# uWebSockets API

`uWebSockets-api` — This wrapper simplifies the usage of [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) by offering more convenient tools for handling WebSockets and HTTP routing.Supports Node 22 versions.

## Basics

This wrapper simplifies the usage of `uWebSockets.js` by offering more convenient tools for handling WebSockets and HTTP routing.

## Architecture and Separation of Concerns

The project follows a clear separation of responsibilities pattern:

### 🔀 Router & Controllers (Transport Layer)

- **Responsibility**: Handle HTTP/WebSocket transport and request/response formatting
- **Location**: `app/routes/` and `app/controllers/`
- **Contains**: Transport-specific code (request parsing, response formatting, status codes, headers, cookies)
- **Rules**:
    - Controllers should NOT contain database queries
    - Controllers should NOT contain business logic
    - Controllers delegate to Models or Services

### 💾 Models (Data Access Layer)

- **Responsibility**: Database operations and data access
- **Location**: `app/models/`
- **Contains**: CRUD operations, queries, data validation at DB level
- **Rules**:
    - All database interactions should go through Models
    - Models provide clean API for data access
    - Models can use Drizzle ORM for queries

### ⚙️ Services (Business Logic Layer)

- **Responsibility**: Business logic and complex operations
- **Location**: `app/servises/`
- **Contains**: Business rules, data transformation, orchestration between multiple models
- **Rules**:
    - Services implement business logic
    - Services can use multiple Models
    - Services are reusable across different controllers

### Architecture Flow

```
Request → Router → Controller → Service/Model → Database
                       ↓
Response ← Controller ← Service/Model ← Database
```

**Example:**

```typescript
// ❌ Bad: Database query in controller
async login(context: HttpContext) {
    const user = await db.select().from(users).where(eq(users.email, email));
}

// ✅ Good: Using Model
async login(context: HttpContext) {
    const user = await User.findByEmail(email);
}

// ✅ Good: Using Service for complex logic
async register(context: HttpContext) {
    const user = await AuthService.registerUser(name, email, password);
}
```

## Project Structure

```
uwebsockets-api/
├── app/                          # Main application folder
│   ├── controllers/              # Controllers
│   │   ├── http/                 # HTTP controllers
│   │   │   ├── auth-controller.ts
│   │   │   ├── calendar-controller.ts
│   │   │   ├── chat-list-controller.ts
│   │   │   ├── invitation-controller.ts
│   │   │   ├── main-controller.ts
│   │   │   ├── message-controller.ts
│   │   │   ├── notes-controller.ts
│   │   │   ├── project-controller.ts
│   │   │   ├── push-subscription-controller.ts
│   │   │   └── task-controller.ts
│   │   ├── types/                # Controller types
│   │   │   ├── AuthController.d.ts
│   │   │   ├── CalendarController.d.ts
│   │   │   ├── ChatListController.d.ts
│   │   │   ├── InvitationController.d.ts
│   │   │   ├── MainController.d.ts
│   │   │   ├── NotesController.d.ts
│   │   │   ├── ProjectController.d.ts
│   │   │   ├── PushSubscriptionController.d.ts
│   │   │   ├── TaskController.d.ts
│   │   │   └── index.d.ts
│   │   └── ws/                   # WebSocket controllers
│   │       └── ws-api-controller.ts
│   ├── middlewares/              # Middleware functions
│   │   ├── kernel.ts
│   │   ├── test-middleware.ts
│   │   └── test-middleware-2.ts
│   ├── models/                   # Data models
│   │   ├── contact-list.ts
│   │   ├── Message.ts
│   │   ├── notes-photo.ts
│   │   ├── Notes.ts
│   │   ├── Project.ts
│   │   ├── Task.ts
│   │   └── User.ts
│   ├── routes/                   # Routes
│   │   ├── http-routes.ts
│   │   └── ws-routes.ts
│   ├── servises/                 # Services
│   │   ├── chat/
│   │   │   ├── get-chat-messages.ts
│   │   │   └── send-message.ts
│   │   ├── generate-ws-token.ts
│   │   └── invention-accept.ts
│   ├── state/                    # Application state
│   │   ├── state.ts
│   │   └── user-storage.ts
│   └── validate/                 # Validation
│       └── schemas/
│           └── schemas.ts
├── config/                       # Configuration
│   ├── app.ts
│   ├── cookies.ts
│   ├── cors.ts
│   ├── csp.ts
│   ├── database.ts
│   ├── redis.ts
│   └── session.ts
├── database/                     # Database
│   ├── db.ts                     # Drizzle database connection
│   ├── schema.ts                 # Drizzle schema definitions
│   └── redis.ts                  # Redis connection
├── dist/                         # Compiled files
├── docs/                         # Documentation
│   ├── API_TYPES_README.md
│   ├── RESPONSE_TYPES_GUIDE.md
│   └── SESSION_SECURITY.md
├── drizzle/                      # Drizzle migrations
│   ├── meta/
│   └── *.sql                     # Migration files
├── frontend/                     # Frontend part
│   └── src/
│       └── types/
├── public/                       # Public files
│   ├── assets/
│   ├── index.html
│   ├── 404.html
│   ├── favicon.ico
│   └── websocket-base.js
├── scripts/                      # Scripts
│   └── export-types.js
├── vendor/                       # External libraries and utilities
│   ├── start/
│   │   ├── router.ts
│   │   ├── server.ts
│   │   ├── staticServer.ts
│   │   └── validators.ts
│   ├── types/
│   │   └── types.d.ts
│   └── utils/
│       ├── context/
│       ├── middlewares/
│       ├── network/
│       ├── rate-limit/
│       ├── routing/
│       ├── serialization/
│       ├── session/
│       └── tooling/
├── docker-compose.yml
├── Dockerfile
├── drizzle.config.ts             # Drizzle Kit configuration
├── index.ts                      # Entry point
├── logger.ts                     # Logger
├── nodemon.json
├── package.json
├── tsconfig.json
└── README.md
```

### Startup Handlers (app/start/)

You can register initialization logic that runs when the application starts.

- **Location**: place your startup handlers under `app/start/` (for example, `app/start/listeners/`).
- **Registration**: import your handler files inside `app/start/index.ts` so they are executed on boot.

Example:

```ts
// app/start/listeners/my-startup-handler.ts
import logger from '#logger';

// Perform any boot-time wiring or subscriptions here
logger.info('My startup handler initialized');
```

```ts
// app/start/index.ts
// Import your startup handlers so they run on application boot
import '#app/start/listeners/ws-event.js';
import '#app/start/listeners/my-startup-handler.js';
```

All files imported by `app/start/index.ts` will be executed once at application startup.

### Description of main folders:

- **`app/`** - Main application folder with controllers, models, routes and services
    - **`controllers/`** - Transport layer: handle HTTP/WebSocket requests and responses
    - **`models/`** - Data access layer: database operations and queries
    - **`servises/`** - Business logic layer: complex operations and business rules
    - **`routes/`** - Route definitions
    - **`middlewares/`** - Middleware functions
    - **`validate/`** - Validation schemas
- **`config/`** - Configuration files for various system components
- **`database/`** - Database settings, connections and Drizzle schema
- **`drizzle/`** - Database migrations generated by Drizzle Kit
- **`vendor/`** - External libraries and utilities for working with uWebSockets
- **`public/`** - Static files for frontend
- **`docs/`** - Project documentation

## Installation

You can install `uWebSockets-api` clone project https://github.com/Blazheiko/uwebsockets-api.git

Install dependencies `npm install`

Create `.env` file following the `.env.example`

Start server `npm run start`

Starting the server in development mode `npm run dev`

Starting the server in manual test mode `npm run manual:test` - This command starts the server with `APP_ENV=manual-test` environment variable. You can manually test your API in the playground by navigating to http://127.0.0.1:8088

## Database Management

### Available Database Commands

- `npm run db:generate` - Generate migration files from schema changes
- `npm run db:migrate` - Run pending migrations
- `npm run db:push` - Push schema changes directly to database (development only)
- `npm run db:studio` - Open Drizzle Studio (visual database browser)
- `npm run db:introspect` - Introspect existing database and generate schema

### Working with Drizzle ORM

The project uses Drizzle ORM for database operations. The schema is defined in `database/schema.ts`.

#### Basic Query Examples in Models

**Important:** Direct database queries should only be used inside Models, not in Controllers.

model example `app/models/User.ts`

```ts
import { db } from '#database/db.js';
import { users } from '#database/schema.js';
import { eq } from 'drizzle-orm';

export default {
    // Model method encapsulates database query
    async findByEmail(email: string) {
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
        return user;
    },

    async findById(id: bigint) {
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);
        return user;
    },

    async create(data: { name: string; email: string; password: string }) {
        const [result] = await db.insert(users).values(data);
        return this.findById(result.insertId);
    },

    async update(id: bigint, data: Partial<{ name: string; email: string }>) {
        await db.update(users).set(data).where(eq(users.id, id));
        return this.findById(id);
    },

    async delete(id: bigint) {
        await db.delete(users).where(eq(users.id, id));
    },

    // Serialize method for safe data output
    serialize(user: any) {
        return {
            id: user.id.toString(),
            name: user.name,
            email: user.email,
            // Never expose password
        };
    },
};
```

**Note:** Drizzle uses `bigint` type for auto-increment IDs. Always convert numbers to BigInt when querying by ID.

## Usage Example

Inspired by the frameworks `Laravel` and `AdonisJs`, `uWebSockets-api` aims to provide a similar experience in organizing project structure and route descriptions.

routing http `app/routes/http-routes.ts`

```ts
import AuthController from '#app/controllers/http/auth-controller.ts';

export default [
    {
        group: [
            {
                url: '/register',
                method: 'post',
                handler: AuthController.register,
                validator: 'register',
                rateLimit: {
                    windowMs: 1 * 60 * 1000,
                    maxRequests: 10,
                },
                description: 'Register a new user',
            },
            {
                url: '/login',
                method: 'post',
                handler: AuthController.login,
                validator: 'login',
                rateLimit: {
                    windowMs: 1 * 60 * 1000,
                    maxRequests: 10,
                },
                description: 'Login a user',
            },
            {
                url: '/logout',
                method: 'post',
                handler: AuthController.logout,
                description: 'Logout a user',
            },
        ],
        description: 'Auth routes',
        middlewares: ['session_web'],
        prefix: 'api/auth',
        rateLimit: {
            windowMs: 15 * 60 * 1000,
            maxRequests: 100,
        },
    },
];
```

routing ws `app/routes/ws-routes.ts`

```ts
import WSApiController from '#app/controllers/ws/ws-api-controller.js';

export default [
    {
        group: [
            {
                url: 'event_typing',
                handler: WSApiController.eventTyping,
                typeResponse: 'WSApiController.EventTypingResponse',
                description: 'Handle typing events',
                rateLimit: {
                    windowMs: 1 * 60 * 1000, // 1 minute
                    maxRequests: 30, // Max 30 typing events per minute
                },
            },
            {
                url: 'test-ws',
                handler: WSApiController.testWs,
                typeResponse: 'WSApiController.TestWsResponse',
                description: 'Test WebSocket',
            },
            {
                url: 'save-user',
                handler: WSApiController.saveUser,
                typeResponse: 'WSApiController.SaveUserResponse',
                validator: 'register',
                description: 'Save user data',
                rateLimit: {
                    windowMs: 5 * 60 * 1000, // 5 minutes
                    maxRequests: 5, // Max 5 user save operations per 5 minutes
                },
            },
        ],
        prefix: 'main',
        description: 'Main routes',
        rateLimit: {
            windowMs: 1 * 60 * 1000, // 1 minute
            maxRequests: 600, // Max 600 requests per minute for the whole group
        },
    },
];
```

http controller `app/controllers/http/auth-controller.ts`

This example demonstrates proper separation of concerns:

- Controller handles transport (request/response)
- Model handles database operations
- Password hashing and validation in business logic

```ts
import logger from '#logger';
import User from '#app/models/User.js';
import { HttpContext } from '../../../vendor/types/types.js';
import { hashPassword, validatePassword } from 'metautil';

export default {
    // Controller focuses on transport layer
    async register(context: HttpContext) {
        logger.info('register handler');
        const { httpData, auth, session } = context;
        const { name, email, password } = httpData.payload;

        // Hash password (could be moved to Service)
        const hash = await hashPassword(password);

        // Use Model for database operations
        const user = await User.create({
            name: name,
            email: email,
            password: hash,
        });

        // Handle session and auth (transport-specific)
        await session.destroySession();
        const res = await auth.login(user);

        // Return formatted response (transport layer)
        return {
            status: res ? 'success' : 'error',
            user: User.serialize(user),
        };
    },

    async login(context: HttpContext) {
        logger.info('login handler');
        const { httpData, responseData, auth } = context;
        const { email, password } = httpData.payload;

        // Use Model to fetch user from database
        const user = await User.findByEmail(email);

        if (user) {
            // Validate password (business logic)
            const valid = await validatePassword(password, user.password);
            if (valid) {
                // Handle auth (transport-specific)
                const res = await auth.login(user);
                return {
                    status: res ? 'success' : 'error',
                    user: User.serialize(user),
                };
            }
        }

        // Set HTTP status (transport layer)
        responseData.status = 401;
        return 'unauthorized';
    },

    async logout(context: HttpContext) {
        logger.info('logout handler');
        const { auth } = context;

        // Handle auth logout (transport-specific)
        const res = await auth.logout();
        return { status: res ? 'success' : 'error' };
    },
};
```

http controller `app/controllers/http/main-controller.ts`

Example demonstrating transport-specific operations (headers, cookies, sessions):

```ts
import logger from '#logger';
import {
    HttpContext,
    HttpData,
    ResponseData,
} from './../../../vendor/types/types.js';

export default {
    // Controller handles transport-specific operations
    async setHeaderAndCookie({ responseData }: HttpContext): Promise<any> {
        logger.info('set-header-and-cookie');

        // Setting headers (transport layer)
        responseData.headers.push({ name: 'test-header', value: 'test' });

        // Setting cookies (transport layer)
        responseData.cookies.push({
            name: 'cookieTest',
            value: 'test',
            path: '/',
            httpOnly: true,
            secure: true,
            maxAge: 3600,
        });
        responseData.setCookie('cookieTest', 'test');

        return { status: 'ok' };
    },

    async testSession({ session, httpData }: HttpContext): Promise<any> {
        logger.info('testSession');

        // Reading cookies (transport layer)
        const cookies: any[] = [];
        httpData.cookies.forEach((value, key) => {
            cookies.push({ key, value });
        });

        // Session info (transport layer)
        const sessionInfo = session?.sessionInfo;

        return { status: 'ok', cookies, sessionInfo };
    },
};
```

service example `app/servises/chat/send-message.ts`

Example of Service with business logic that uses multiple Models:

```ts
import Message from '#app/models/Message.js';
import User from '#app/models/User.js';
import ContactList from '#app/models/contact-list.js';

// Service handles business logic and orchestrates Models
export async function sendMessage(
    senderId: bigint,
    recipientId: bigint,
    content: string,
    type: 'text' | 'file' = 'text',
) {
    // Business logic: verify users are contacts
    const areContacts = await ContactList.areUsersContacts(
        senderId,
        recipientId,
    );
    if (!areContacts) {
        throw new Error('Users are not contacts');
    }

    // Business logic: validate message content
    if (!content || content.trim().length === 0) {
        throw new Error('Message content cannot be empty');
    }

    // Use Model to save message
    const message = await Message.create({
        senderId,
        recipientId,
        content: content.trim(),
        type,
        isRead: false,
    });

    // Business logic: update last message timestamp in contact list
    await ContactList.updateLastMessageTime(senderId, recipientId);

    return message;
}
```

ws controller `app/controllers/ws/ws-api-controller.ts`

WebSocket controller also follows the same pattern - handles WebSocket transport and delegates to Models:

```ts
import logger from '#logger';
import User from '#app/models/User.js';
import {
    WsContext,
    WsData,
    WsResponseData,
} from '../../../vendor/types/types.js';

export default {
    // Simple WebSocket response
    test({ responseData }: WsContext) {
        logger.info('ws test');

        // Format WebSocket response (transport layer)
        responseData.payload = { test: true };
        return responseData;
    },

    // WebSocket handler using Model
    async saveUser({ wsData, responseData }: WsContext) {
        logger.info('ws saveUser');
        const { payload } = wsData;

        // Use Model for database operations
        const user = await User.create({
            name: payload.name,
            email: payload.email,
            password: payload.password,
        });

        // Format WebSocket response (transport layer)
        responseData.payload = { status: 'ok', user: User.serialize(user) };
        return responseData;
    },
};
```

## Context Objects

### HttpContext

The `HttpContext` object is passed to HTTP controller methods and contains all the necessary data and utilities for handling HTTP requests.

```typescript
interface HttpContext {
    requestId: string; // Unique request identifier
    logger: Logger; // Pino logger instance with request context
    httpData: HttpData; // Incoming request data
    responseData: ResponseData; // Response configuration object
    session: Session; // Session management utilities
    auth: any; // Authentication utilities
}
```

#### HttpData Structure

```typescript
interface HttpData {
    ip: string | null | undefined; // Client IP address
    params: any; // Route parameters
    payload: any; // Request body data
    query: URLSearchParams; // URL query parameters
    headers: Map<string, string>; // Request headers
    contentType: string | undefined; // Content-Type header
    cookies: Map<string, string>; // Request cookies
    isJson: boolean; // Whether request is JSON
}
```

#### ResponseData Structure

```typescript
interface ResponseData {
    aborted: boolean; // Whether response was aborted
    payload: object; // Response payload
    middlewareData: any; // Data from middlewares
    headers: Header[]; // Response headers
    cookies: Record<string, Cookie>; // Response cookies
    status: number; // HTTP status code
    deleteCookie: Function; // Delete cookie method
    setCookie: Function; // Set cookie method
    setHeader: Function; // Set header method
}
```

#### Session Structure

```typescript
interface Session {
    sessionInfo: SessionInfo | null; // Session data
    updateSessionData: Function; // Update or add session data
    changeSessionData: Function; // Change session data
    destroySession: Function; // Destroy session
}

interface SessionInfo {
    id: string; // Session ID
    data: SessionData; // Session data object
    createdAt: string; // Creation timestamp
    updatedAt?: string; // Last update timestamp
}
```

### WsContext

The `WsContext` object is passed to WebSocket controller methods and contains all the necessary data and utilities for handling WebSocket connections.

```typescript
interface WsContext {
    requestId: string; // Unique request identifier
    wsData: WsData; // Incoming WebSocket data
    responseData: WsResponseData; // Response configuration object
    session: Session | null; // Session management utilities (nullable)
    auth: any; // Authentication utilities
    logger: Logger; // Pino logger instance with request context
}
```

#### WsData Structure

```typescript
interface WsData {
    middlewareData: any; // Data from middlewares
    status: string; // WebSocket status
    payload?: any; // Message payload (optional)
}
```

#### WsResponseData Structure

```typescript
interface WsResponseData {
    payload: any; // Response payload
    event: string; // WebSocket event name
    status: number; // Response status code
}
```

#### Auth Structure

```typescript
interface Auth {
    getUserId: Function; // Get current user ID
    check: Function; // Check authentication status
    login: Function; // Login user
    logout: Function; // Logout user
    logoutAll: Function; // Logout from all sessions
}
```

## Route Configuration

### Route Fields

Each route can be configured with the following fields:

- **`url`** - The route path (required)
- **`method`** - HTTP method for HTTP routes (required for HTTP routes)
- **`handler`** - Controller method to handle the request (required)
- **`validator`** - Validation schema name (optional)
- **`middlewares`** - Array of middlewares for HTTP || WebSocket routes (optional)
- **`description`** - Human-readable description of the route (optional)
- **`rateLimit`** - Rate limiting configuration (optional)

### Rate Limiting

Rate limiting can be configured at both route and group levels:

```ts
{
  url: '/api/endpoint',
  method: 'post',
  handler: Controller.method,
  rateLimit: {
    windowMs: 1 * 60 * 1000, // Time window in milliseconds
    maxRequests: 10,          // Maximum requests per window
  },
}
```

**Rate Limit Fields:**

- **`windowMs`** - Time window in milliseconds
- **`maxRequests`** - Maximum number of requests allowed in the time window

### Route Groups

Route groups support additional configuration:

- **`prefix`** - URL prefix for all routes in the group
- **`middlewares`** - Middlewares applied to all routes in the group
- **`description`** - Description for the entire group
- **`rateLimit`** - Rate limiting applied to all routes in the group

## Best Practices

### Controllers

- Keep controllers thin - they should only handle request/response
- Always use Models or Services, never write direct database queries
- Handle transport-specific concerns (headers, cookies, status codes)
- Return properly formatted responses

### Models

- Encapsulate all database operations
- Provide clean, reusable methods for data access
- Use Drizzle ORM for type-safe queries
- Handle data serialization

### Services

- Implement complex business logic
- Coordinate multiple Models when needed
- Keep code reusable and testable
- Independent of transport layer

## Modules used

**ORM:** `database/db.ts` and `database/schema.ts` - [Drizzle ORM](https://orm.drizzle.team/)

**Redis client:** `database/redis.ts` - [ioredis](https://github.com/redis/ioredis)

**Validator:** `app/validate/schemas/schemas.ts` - [VineJS](https://vinejs.dev/docs/introduction)

**Logger:** `logger.ts` - [pino](https://github.com/pinojs/pino)

**Date/Time library:** [Luxon](https://github.com/moment/luxon#readme)

**Utils:** [Metarhia utilities](https://github.com/metarhia/metautil)

## License

`uWebSockets-api` is released under the MIT License.

## Support and Contribution

If you have questions or suggestions, please create an issue in our GitHub repository. We also welcome your pull requests with improvements and corrections.
