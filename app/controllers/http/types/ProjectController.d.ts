/**
 * Response types for ProjectController
 */

export interface Project {
    id: number;
    name: string;
    description?: string;
    userId: number;
    isArchived: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface GetProjectsResponse {
    status: 'ok';
    projects: Project[];
}

export interface CreateProjectResponse {
    status: 'ok' | 'error';
    message?: string;
    project?: Project;
}

export interface GetProjectResponse {
    status: 'ok' | 'error';
    message?: string;
    project?: Project;
}

export interface UpdateProjectResponse {
    status: 'ok' | 'error';
    message?: string;
    project?: Project;
}

export interface DeleteProjectResponse {
    status: 'ok' | 'error';
    message?: string;
}

export interface GetProjectTasksResponse {
    status: 'ok';
    tasks: Array<{
        id: number;
        title: string;
        status: string;
        progress: number;
    }>;
    projectId: number;
}

export interface GetProjectStatisticsResponse {
    status: 'ok';
    statistics: {
        totalTasks: number;
        completedTasks: number;
        inProgressTasks: number;
        pendingTasks: number;
    };
}

export interface ArchiveProjectResponse {
    status: 'ok' | 'error';
    message?: string;
    project?: Project;
}
