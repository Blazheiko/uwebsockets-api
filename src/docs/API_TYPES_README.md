# API Response Types - Quick Start

API response type system for ensuring type-safety between backend and frontend.

## Quick Start

### 1. Define Response Type

`app/controllers/http/types/UserController.d.ts`:

```typescript
/**
 * Response types for UserController
 */
export interface CreateUserResponse {
    status: 'ok' | 'error';
    message?: string;
    user?: {
        id: number;
        name: string;
        email: string;
    };
}
```

## Naming Convention

**Important**: All controller response types must follow the naming convention:

```
Type Name = MethodName + "Response" (with capital first letter)
```

### Examples:

| Controller Method | Response Type Name       |
| ----------------- | ------------------------ |
| `createUser`      | `CreateUserResponse`     |
| `getUsers`        | `GetUsersResponse`       |
| `updateUser`      | `UpdateUserResponse`     |
| `deleteUser`      | `DeleteUserResponse`     |
| `getUserById`     | `GetUserByIdResponse`    |
| `getUserProfile`  | `GetUserProfileResponse` |

### Rules:

1. **Method name** → **Type name** with "Response" suffix
2. **First letter** must be **capitalized**
3. **CamelCase** preserved from method name
4. **Consistent** across all controllers

This ensures:

- ✅ Easy identification of response types
- ✅ Consistent naming across the codebase
- ✅ Better IDE autocomplete and navigation
- ✅ Clear relationship between methods and their response types

### 2. Use in Controller

`app/controllers/http/UserController.ts`:

```typescript
import type { CreateUserResponse } from './types/UserController.js';

export default {
    async createUser({ httpData }: HttpContext): Promise<CreateUserResponse> {
        const { name, email, password } = httpData.payload;

        try {
            const user = await User.create({ name, email, password });

            return {
                status: 'ok',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                },
            };
        } catch (error) {
            return {
                status: 'error',
                message: 'Failed to create user',
            };
        }
    },
};
```

### 3. Add Schema to Route

`app/routes/httpRoutes.ts`:

```typescript
{
    url: '/users',
    method: 'post',
    handler: UserController.createUser,
    description: 'Create a new user',
    requestBody: {
        description: 'User registration data',
        schema: {
            name: { type: 'string', required: true, example: 'John Doe' },
            email: { type: 'string', required: true, example: 'john@example.com' },
            password: { type: 'string', required: true, example: 'password123' },
        },
    },
    response: {
        type: 'CreateUserResponse',
        description: 'Returns created user or error',
        schema: {
            status: { type: 'string', required: true, example: 'ok' },
            user: {
                type: 'object',
                required: false,
                properties: {
                    id: { type: 'number', example: 1 },
                    name: { type: 'string', example: 'John Doe' },
                    email: { type: 'string', example: 'john@example.com' },
                },
            },
            message: { type: 'string', required: false, example: 'Failed to create user' },
        },
    },
}
```

### 4. Export Types for Frontend

```bash
npm run export-types
```

Or with custom path:

```bash
npm run export-types -- ./path/to/frontend/types/api.d.ts
```

### 5. Use on Frontend

```typescript
import type { CreateUserResponse } from '#app/controllers/http/types/index.js';

async function createUser(name: string, email: string, password: string) {
    const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
    });

    const data: CreateUserResponse = await response.json();

    if (data.status === 'ok' && data.user) {
        console.log('User created:', data.user.name); // ✓ TypeScript knows the structure
        return data.user;
    } else {
        console.error('Error:', data.message); // ✓ TypeScript knows about message
        throw new Error(data.message);
    }
}
```

## Type Structure

```
app/controllers/http/
├── types/                      # 📁 Types folder (NEW!)
│   ├── MainController.d.ts     # Main controller types
│   ├── AuthController.d.ts     # Authentication types
│   ├── ChatController.d.ts     # Chat types
│   ├── NotesController.d.ts    # Notes types
│   ├── TaskController.d.ts     # Task types
│   ├── ProjectController.d.ts  # Project types
│   ├── index.d.ts              # Central export for all types
│   └── README.md               # Structure documentation
├── MainController.ts
├── AuthController.ts
└── ...

vendor/types/
├── responses.d.ts       # @deprecated (for backward compatibility)
└── types.d.ts           # Base types (HttpContext, RouteItem)

scripts/
└── export-types.js      # Script for exporting types to frontend

docs/
├── API_TYPES_README.md          # This file (Quick Start)
└── RESPONSE_TYPES_GUIDE.md      # Complete guide
```

## Benefits

✓ **Type Safety**: TypeScript checks types at compile-time  
✓ **Autocomplete**: IDE suggests available fields  
✓ **Documentation**: Automatic generation in `/doc/doc.html`  
✓ **Single Source of Truth**: Types are synchronized between backend and frontend  
✓ **Easy Refactoring**: Changes are automatically tracked

## Usage Examples

### Simple Response

```typescript
// Type
export interface PingResponse {
  status: 'ok';
}

// Controller
async ping(): Promise<PingResponse> {
  return { status: 'ok' };
}
```

### Response with Data List

```typescript
// Type
export interface GetNotesResponse {
  status: 'ok';
  notes: Note[];
  pagination?: {
    page: number;
    total: number;
  };
}

// Controller
async getNotes(): Promise<GetNotesResponse> {
  const notes = await Note.findMany();

  return {
    status: 'ok',
    notes: notes.map(serializeNote),
    pagination: {
      page: 1,
      total: notes.length,
    }
  };
}
```

### Conditional Response with Different Statuses

```typescript
// Type
export interface LoginResponse {
  status: 'ok' | 'error' | 'unauthorized';
  message?: string;
  token?: string;
  user?: UserData;
}

// Controller
async login({ httpData }: HttpContext): Promise<LoginResponse> {
  const { email, password } = httpData.payload;

  const user = await User.findByEmail(email);

  if (!user) {
    return {
      status: 'error',
      message: 'User not found'
    };
  }

  const isValid = await verifyPassword(password, user.password);

  if (!isValid) {
    return {
      status: 'unauthorized',
      message: 'Invalid password'
    };
  }

  const token = generateToken(user.id);

  return {
    status: 'ok',
    token,
    user: serializeUser(user)
  };
}
```

## Documentation

All types are automatically displayed in the API documentation at:

```
http://localhost:3000/doc/doc.html
```

The documentation will show:

- Field types (string, number, object, array)
- Required/optional fields
- Example values
- Nested object structure

## Additional Resources

- [Complete Guide](./RESPONSE_TYPES_GUIDE.md) - detailed description of all capabilities
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - official TypeScript documentation
- `app/controllers/http/types/index.d.ts` - examples of all available types

## Support

If you have questions or issues:

1. Check examples in `app/controllers/http/types/index.d.ts`
2. Study existing controllers in `app/controllers/http/`
3. Read the [complete guide](./RESPONSE_TYPES_GUIDE.md)
4. View API documentation in browser

---

**Tip**: After any changes in `app/controllers/http/types/index.d.ts`, don't forget to run `npm run export-types` to update types on the frontend!
