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
    tasks?: any[];
}

export interface GetTasksResponse {
    status: 'success' | 'error';
    message?: string;
    tasks?: Task[];
    projects?: any[];
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
