/**
 * Input types for ProjectController
 */

export interface CreateProjectInput {
    title: string;
    description?: string;
    color?: string;
    startDate?: string;
    endDate?: string;
    dueDate?: string;
}

export interface UpdateProjectInput {
    title?: string;
    description?: string;
    color?: string;
    startDate?: string;
    endDate?: string;
    dueDate?: string;
    isActive?: boolean;
    progress?: number;
}

/**
 * Response types for ProjectController
 */

export interface Project {
    id: number;
    title: string;
    description?: string;
    color?: string;
    userId: number;
    isActive: boolean;
    isArchived: boolean;
    progress: number;
    startDate?: Date;
    endDate?: Date;
    dueDate?: Date;
    createdAt: string;
    updatedAt: string;
}

export interface GetProjectsResponse {
    status: 'success' | 'error';
    message?: string;
    projects?: Project[];
}

export interface CreateProjectResponse {
    status: 'success' | 'error';
    message?: string;
    project?: Project;
}

export interface GetProjectResponse {
    status: 'success' | 'error';
    message?: string;
    data?: Project;
}

export interface UpdateProjectResponse {
    status: 'success' | 'error';
    message?: string;
    project?: Project;
}

export interface DeleteProjectResponse {
    status: 'success' | 'error';
    message?: string;
}

export interface GetProjectTasksResponse {
    status: 'success' | 'error';
    message?: string;
    data?: any[];
}

export interface GetProjectStatisticsResponse {
    status: 'success' | 'error';
    message?: string;
    data?: any;
}

export interface ArchiveProjectResponse {
    status: 'success' | 'error';
    message?: string;
    data?: Project;
}
