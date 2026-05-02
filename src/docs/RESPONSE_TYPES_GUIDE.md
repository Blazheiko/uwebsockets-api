# API Response Types Guide

This guide describes how to use the API response types system to ensure TypeScript type safety and automatic documentation generation.

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Creating Response Types](#creating-response-types)
3. [Using in Controllers](#using-in-controllers)
4. [Adding to Routes](#adding-to-routes)
5. [Using on Frontend](#using-on-frontend)
6. [Naming Conventions](#naming-conventions)
7. [Examples](#examples)

## Core Concepts

The response types system consists of three main parts:

1. **Response Types** (`app/controllers/http/types/index.d.ts`) - TypeScript interfaces for API responses
2. **Typed Controllers** - controllers with explicit return types
3. **Route Schemas** - response structure descriptions for documentation

## Creating Response Types

### Step 1: Define Response Interface

In the file `app/controllers/http/types/index.d.ts`:

```typescript
// Example of simple response
export interface PingResponse {
    status: 'ok';
}

// Example of response with data
export interface GetUserResponse {
    status: 'ok' | 'error';
    message?: string;
    user?: {
        id: number;
        name: string;
        email: string;
    };
}

// Example of response with list
export interface GetNotesResponse {
    status: 'ok';
    notes: Note[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
    };
}
```

### Step 2: Add Type to Registry

```typescript
export type ResponseTypeRegistry = {
    ping: PingResponse;
    getUser: GetUserResponse;
    getNotes: GetNotesResponse;
    // ... other types
};
```

## Using in Controllers

### Import Types

```typescript
import type {
    PingResponse,
    GetUserResponse,
    GetNotesResponse,
} from '#app/controllers/http/types/index.js';
```

### Type Controller Methods

```typescript
export default {
    // Simple response
    async ping(): Promise<PingResponse> {
        return { status: 'ok' };
    },

    // Response with conditional logic
    async getUser({ httpData }: HttpContext): Promise<GetUserResponse> {
        const { userId } = httpData.params;

        const user = await User.findById(userId);

        if (!user) {
            return {
                status: 'error',
                message: 'User not found',
            };
        }

        return {
            status: 'ok',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        };
    },

    // Response with data list
    async getNotes({ session }: HttpContext): Promise<GetNotesResponse> {
        const userId = session?.sessionInfo?.data?.userId;

        const notes = await Note.findMany({
            where: { userId },
        });

        return {
            status: 'ok',
            notes: notes.map((note) => ({
                id: note.id,
                title: note.title,
                content: note.content,
                userId: note.userId,
                createdAt: note.createdAt.toISOString(),
                updatedAt: note.updatedAt.toISOString(),
            })),
        };
    },
};
```

## Adding to Routes

In the file `app/routes/httpRoutes.ts` add type descriptions for documentation:

```typescript
{
    url: '/users/:userId',
    method: 'get',
    handler: UserController.getUser,
    description: 'Get user by ID',
    response: {
        type: 'GetUserResponse',
        description: 'Returns user data or error',
        schema: {
            status: {
                type: 'string',
                required: true,
                example: 'ok'
            },
            user: {
                type: 'object',
                required: false,
                properties: {
                    id: { type: 'number', example: 1 },
                    name: { type: 'string', example: 'John Doe' },
                    email: { type: 'string', example: 'john@example.com' },
                },
            },
            message: {
                type: 'string',
                required: false,
                example: 'User not found'
            },
        },
    },
    // Optional: request body description
    requestBody: {
        description: 'User data to update',
        schema: {
            name: { type: 'string', required: false, example: 'John Doe' },
            email: { type: 'string', required: false, example: 'john@example.com' },
        },
    },
}
```

## Using on Frontend

### Export Types

Create a script to export types (can be placed in `scripts/export-types.ts`):

```typescript
import fs from 'fs';
import path from 'path';

// Copy types file to frontend directory
const sourceFile = path.join(
    __dirname,
    '../app/controllers/http/types/index.d.ts',
);
const targetFile = path.join(
    __dirname,
    '../frontend/src/types/api-responses.d.ts',
);

fs.copyFileSync(sourceFile, targetFile);

console.log('Types exported successfully!');
```

### Using in Vue/React

```typescript
// frontend/src/api/users.ts
import type {
    GetUserResponse,
    GetNotesResponse,
} from '#app/controllers/http/types/index.js';

export async function getUser(userId: number): Promise<GetUserResponse> {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
}

export async function getNotes(): Promise<GetNotesResponse> {
    const response = await fetch(`/api/notes`);
    return response.json();
}

// Using in component
async function loadUser() {
    const result = await getUser(1);

    if (result.status === 'ok' && result.user) {
        // TypeScript knows the structure of result.user
        console.log(result.user.name);
    } else {
        // TypeScript knows that message can be here
        console.error(result.message);
    }
}
```

## Naming Conventions

**Important**: All controller response types must follow the naming convention:

```
Type Name = MethodName + "Response" (with capital first letter)
```

### Response Type Naming Rules

1. **Base Pattern**: `{Action}{Entity}Response`

    - `GetUserResponse` - for getting a single user
    - `GetUsersResponse` - for getting multiple users
    - `CreateUserResponse` - for creating a user
    - `UpdateUserResponse` - for updating a user
    - `DeleteUserResponse` - for deleting a user

2. **Action Prefixes**:

    - `Get` - for retrieving data (single or multiple)
    - `Create` - for creating new resources
    - `Update` - for updating existing resources
    - `Delete` - for removing resources
    - `Search` - for searching/filtering data
    - `Validate` - for validation operations
    - `Login` - for authentication
    - `Logout` - for deauthentication
    - `Register` - for user registration

3. **Entity Naming**:

    - Use singular form for single item responses
    - Use plural form for list responses
    - Use PascalCase for entity names
    - Examples: `User`, `Users`, `Note`, `Notes`, `Project`, `Projects`

4. **Special Response Types**:

    - `PingResponse` - for health checks
    - `InitResponse` - for initialization
    - `TestResponse` - for testing endpoints
    - `ErrorResponse` - for error responses
    - `SuccessResponse` - for generic success responses

5. **Status Field Values**:

    - `'ok'` - for successful operations
    - `'error'` - for failed operations
    - `'unauthorized'` - for authentication errors
    - `'forbidden'` - for authorization errors
    - `'not_found'` - for resource not found
    - `'validation_error'` - for validation failures

6. **Optional Fields**:
    - Use `?` for fields that may not be present
    - Always make `message` optional in error responses
    - Make data fields optional when they depend on success status

### Examples of Good Naming

```typescript
// ✅ Good naming examples
export interface GetUserResponse {
    status: 'ok' | 'error';
    message?: string;
    user?: User;
}

export interface GetUsersResponse {
    status: 'ok';
    users: User[];
    pagination?: PaginationInfo;
}

export interface CreateProjectResponse {
    status: 'ok' | 'error';
    message?: string;
    project?: Project;
}

export interface SearchNotesResponse {
    status: 'ok';
    notes: Note[];
    totalCount: number;
    filters: SearchFilters;
}

export interface ValidateEmailResponse {
    status: 'ok' | 'error';
    message?: string;
    isValid: boolean;
    suggestions?: string[];
}

// ❌ Bad naming examples
export interface UserData {
    // Too generic
    status: string;
    data: any;
}

export interface GetUserDataResponse {
    // Redundant "Data"
    status: string;
    user: User;
}

export interface UserResponse {
    // Missing action prefix
    status: string;
    user: User;
}
```

## Examples

### Example 1: CRUD Operations for Notes

```typescript
// app/controllers/http/types/index.d.ts
export interface Note {
    id: number;
    title: string;
    content: string;
    userId: number;
    createdAt: string;
    updatedAt: string;
}

export interface GetNotesResponse {
    status: 'ok';
    notes: Note[];
}

export interface GetNoteResponse {
    status: 'ok' | 'error';
    message?: string;
    note?: Note;
}

export interface CreateNoteResponse {
    status: 'ok' | 'error';
    message?: string;
    note?: Note;
}

export interface UpdateNoteResponse {
    status: 'ok' | 'error';
    message?: string;
    note?: Note;
}

export interface DeleteNoteResponse {
    status: 'ok' | 'error';
    message?: string;
}

// app/controllers/http/NotesController.ts
import type {
    GetNotesResponse,
    GetNoteResponse,
    CreateNoteResponse,
    UpdateNoteResponse,
    DeleteNoteResponse,
} from '#app/controllers/http/types/index.js';

export default {
    async getNotes({ session }: HttpContext): Promise<GetNotesResponse> {
        const userId = session?.sessionInfo?.data?.userId;
        const notes = await Note.findMany({ where: { userId } });

        return {
            status: 'ok',
            notes: notes.map(serializeNote),
        };
    },

    async getNote({
        httpData,
        session,
    }: HttpContext): Promise<GetNoteResponse> {
        const userId = session?.sessionInfo?.data?.userId;
        const { noteId } = httpData.params;

        const note = await Note.findFirst({
            where: { id: noteId, userId },
        });

        if (!note) {
            return {
                status: 'error',
                message: 'Note not found',
            };
        }

        return {
            status: 'ok',
            note: serializeNote(note),
        };
    },

    async createNote({
        httpData,
        session,
    }: HttpContext): Promise<CreateNoteResponse> {
        const userId = session?.sessionInfo?.data?.userId;
        const { title, content } = httpData.payload;

        try {
            const note = await Note.create({
                title,
                content,
                userId,
            });

            return {
                status: 'ok',
                note: serializeNote(note),
            };
        } catch (error) {
            return {
                status: 'error',
                message: 'Failed to create note',
            };
        }
    },

    async updateNote({
        httpData,
        session,
    }: HttpContext): Promise<UpdateNoteResponse> {
        const userId = session?.sessionInfo?.data?.userId;
        const { noteId } = httpData.params;
        const { title, content } = httpData.payload;

        const note = await Note.findFirst({
            where: { id: noteId, userId },
        });

        if (!note) {
            return {
                status: 'error',
                message: 'Note not found',
            };
        }

        const updatedNote = await Note.update({
            where: { id: noteId },
            data: { title, content },
        });

        return {
            status: 'ok',
            note: serializeNote(updatedNote),
        };
    },

    async deleteNote({
        httpData,
        session,
    }: HttpContext): Promise<DeleteNoteResponse> {
        const userId = session?.sessionInfo?.data?.userId;
        const { noteId } = httpData.params;

        const note = await Note.findFirst({
            where: { id: noteId, userId },
        });

        if (!note) {
            return {
                status: 'error',
                message: 'Note not found',
            };
        }

        await Note.delete({ where: { id: noteId } });

        return {
            status: 'ok',
        };
    },
};

function serializeNote(note: any): Note {
    return {
        id: note.id,
        title: note.title,
        content: note.content,
        userId: note.userId,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
    };
}
```

### Example 2: Using on Frontend with Vue 3

```typescript
// frontend/src/composables/useNotes.ts
import { ref, computed } from 'vue';
import type {
    Note,
    GetNotesResponse,
    CreateNoteResponse,
} from '@/types/api-responses';

export function useNotes() {
    const notes = ref<Note[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    async function loadNotes() {
        loading.value = true;
        error.value = null;

        try {
            const response = await fetch('/api/notes');
            const data: GetNotesResponse = await response.json();

            if (data.status === 'ok') {
                notes.value = data.notes;
            }
        } catch (err) {
            error.value = 'Failed to load notes';
        } finally {
            loading.value = false;
        }
    }

    async function createNote(title: string, content: string) {
        loading.value = true;
        error.value = null;

        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content }),
            });

            const data: CreateNoteResponse = await response.json();

            if (data.status === 'ok' && data.note) {
                notes.value.push(data.note);
                return true;
            } else {
                error.value = data.message || 'Failed to create note';
                return false;
            }
        } catch (err) {
            error.value = 'Network error';
            return false;
        } finally {
            loading.value = false;
        }
    }

    return {
        notes,
        loading,
        error,
        loadNotes,
        createNote,
    };
}
```

## Benefits

1. **Type Safety**: TypeScript checks that returned data matches defined types
2. **Autocomplete**: IDE provides autocomplete for response fields
3. **Documentation**: Automatic API documentation generation based on types
4. **Consistency**: Single source of truth for types on backend and frontend
5. **Refactoring**: Easy detection of mismatches when changing data structure

## Best Practices

1. Always specify return types for controller methods
2. Use union types for different response statuses (`'ok' | 'error'`)
3. Make fields optional (`?`) when they may be absent
4. Group related types together
5. Use base interfaces for common patterns
6. Update route documentation when changing types
7. Follow consistent naming conventions
8. Use descriptive action prefixes
9. Make error messages optional but always include them in error responses
10. Use specific status values instead of generic strings

## Conclusion

This type system ensures reliability and development convenience both on the backend and frontend, creating a unified language for describing APIs with clear, consistent naming conventions.
