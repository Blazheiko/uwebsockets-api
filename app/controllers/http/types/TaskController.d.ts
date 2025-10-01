/**
 * Response types for TaskController
 */

export interface Task {
    id: number;
    title: string;
    description?: string;
    status: string;
    progress: number;
    projectId?: number;
    parentTaskId?: number;
    userId: number;
    createdAt: string;
    updatedAt: string;
}

export interface GetTasksResponse {
    status: 'ok';
    tasks: Task[];
}

export interface CreateTaskResponse {
    status: 'ok' | 'error';
    message?: string;
    task?: Task;
}

export interface GetTaskResponse {
    status: 'ok' | 'error';
    message?: string;
    task?: Task;
}

export interface UpdateTaskResponse {
    status: 'ok' | 'error';
    message?: string;
    task?: Task;
}

export interface DeleteTaskResponse {
    status: 'ok' | 'error';
    message?: string;
}

export interface UpdateTaskStatusResponse {
    status: 'ok' | 'error';
    message?: string;
    task?: Task;
}

export interface UpdateTaskProgressResponse {
    status: 'ok' | 'error';
    message?: string;
    task?: Task;
}

export interface GetTasksByProjectResponse {
    status: 'ok';
    tasks: Task[];
    projectId: number;
}

export interface GetSubTasksResponse {
    status: 'ok';
    tasks: Task[];
    parentTaskId: number;
}
