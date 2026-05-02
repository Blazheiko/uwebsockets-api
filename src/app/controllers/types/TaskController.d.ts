/**
 * Input types for TaskController
 */

export interface CreateTaskInput {
    title: string;
    description?: string;
    projectId?: number;
    status?: string;
    priority?: string;
    tags?: string[];
    dueDate?: string;
    startDate?: string;
    estimatedHours?: number;
    parentTaskId?: number;
}

export interface UpdateTaskInput {
    title?: string;
    description?: string;
    projectId?: number;
    status?: string;
    priority?: string;
    progress?: number;
    tags?: string[];
    dueDate?: string;
    startDate?: string;
    estimatedHours?: number;
    actualHours?: number;
}

export interface UpdateTaskStatusInput {
    status: string;
}

export interface UpdateTaskProgressInput {
    progress: string;
}

/**
 * Response types for TaskController
 */

export interface Task {
    id: number;
    title: string;
    description?: string;
    status: string;
    priority?: string;
    progress: number;
    projectId?: number;
    parentTaskId?: number;
    userId: number;
    tags?: string[];
    dueDate?: Date;
    startDate?: Date;
    estimatedHours?: number;
    actualHours?: number;
    createdAt: string;
    updatedAt: string;
}

export interface TestTasksResponse {
    status: 'ok' | 'error';
    tasks?: unknown[];
}

export interface GetTasksResponse {
    status: 'success' | 'error';
    message?: string;
    tasks?: Task[];
    projects?: unknown[];
}

export interface CreateTaskResponse {
    status: 'success' | 'error';
    message?: string;
    task?: Task;
}

export interface GetTaskResponse {
    status: 'success' | 'error';
    message?: string;
    task?: Task;
}

export interface UpdateTaskResponse {
    status: 'success' | 'error';
    message?: string;
    task?: Task;
}

export interface DeleteTaskResponse {
    status: 'success' | 'error';
    message?: string;
}

export interface UpdateTaskStatusResponse {
    status: 'success' | 'error';
    message?: string;
    task?: Task;
}

export interface UpdateTaskProgressResponse {
    status: 'success' | 'error';
    message?: string;
    task?: Task;
}

export interface GetTasksByProjectResponse {
    status: 'success' | 'error';
    message?: string;
    tasks?: Task[];
}

export interface GetSubTasksResponse {
    status: 'success' | 'error';
    message?: string;
    tasks?: Task[];
}
