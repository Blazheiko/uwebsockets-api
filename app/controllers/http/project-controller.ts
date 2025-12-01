import { HttpContext } from '../../../vendor/types/types.js';
import Project from '#app/models/Project.js';
import type {
    GetProjectsResponse,
    CreateProjectResponse,
    GetProjectResponse,
    UpdateProjectResponse,
    DeleteProjectResponse,
    GetProjectTasksResponse,
    GetProjectStatisticsResponse,
    ArchiveProjectResponse,
} from '../types/ProjectController.js';

export default {
    async getProjects(context: HttpContext): Promise<GetProjectsResponse> {
        const { auth, logger, responseData } = context;
        logger.info('getProjects handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        try {
            const userId = auth.getUserId();
            const projects = await Project.findByUserId(userId);
            return { status: 'success', projects };
        } catch (error) {
            logger.error({ err: error }, 'Error getting projects:');
            return { status: 'error', message: 'Failed to get projects' };
        }
    },

    async createProject(context: HttpContext): Promise<CreateProjectResponse> {
        const { httpData, auth, logger, responseData } = context;
        logger.info('createProject handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { title, description, color, startDate, endDate, dueDate } =
            httpData.payload;

        try {
            const project = await Project.create({
                title,
                description,
                color,
                userId: auth.getUserId(),
                startDate,
                endDate,
                dueDate,
            });
            return { status: 'success', project };
        } catch (error) {
            logger.error({ err: error }, 'Error creating project:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to create project',
            };
        }
    },

    async getProject(context: HttpContext): Promise<GetProjectResponse> {
        const { httpData, auth, logger, responseData } = context;
        logger.info('getProject handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string };

        try {
            const project = await Project.findById(
                BigInt(projectId),
                auth.getUserId(),
            );
            return { status: 'success', data: project };
        } catch (error) {
            logger.error({ err: error }, 'Error getting project:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to get project',
            };
        }
    },

    async updateProject(context: HttpContext): Promise<UpdateProjectResponse> {
        const { httpData, auth, logger, responseData } = context;
        logger.info('updateProject handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string };
        const {
            title,
            description,
            color,
            startDate,
            endDate,
            dueDate,
            isActive,
            progress,
        } = httpData.payload;

        try {
            const project = await Project.update(
                BigInt(projectId),
                auth.getUserId(),
                {
                    title,
                    description,
                    color,
                    startDate,
                    endDate,
                    dueDate,
                    isActive,
                    progress,
                },
            );

            return { status: 'success', project };
        } catch (error) {
            logger.error({ err: error }, 'Error updating project:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to update project',
            };
        }
    },

    async deleteProject(context: HttpContext): Promise<DeleteProjectResponse> {
        const { httpData, auth, logger, responseData } = context;
        logger.info('deleteProject handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string };

        try {
            await Project.delete(BigInt(projectId), auth.getUserId());
            return {
                status: 'success',
                message: 'Project deleted successfully',
            };
        } catch (error) {
            logger.error({ err: error }, 'Error deleting project:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to delete project',
            };
        }
    },

    async getProjectTasks(
        context: HttpContext,
    ): Promise<GetProjectTasksResponse> {
        const { httpData, auth, logger, responseData } = context;
        logger.info('getProjectTasks handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string };

        try {
            const tasks = await Project.getProjectTasks(
                BigInt(projectId),
                auth.getUserId(),
            );
            return { status: 'success', data: tasks };
        } catch (error) {
            logger.error({ err: error }, 'Error getting project tasks:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to get project tasks',
            };
        }
    },

    async getProjectStatistics(
        context: HttpContext,
    ): Promise<GetProjectStatisticsResponse> {
        const { httpData, auth, logger, responseData } = context;
        logger.info('getProjectStatistics handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string };

        try {
            const data = await Project.getProjectStatistics(
                BigInt(projectId),
                auth.getUserId(),
            );
            return { status: 'success', data };
        } catch (error) {
            logger.error({ err: error }, 'Error getting project statistics:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to get project statistics',
            };
        }
    },

    async archiveProject(
        context: HttpContext,
    ): Promise<ArchiveProjectResponse> {
        const { httpData, auth, logger, responseData } = context;
        logger.info('archiveProject handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string };

        try {
            const archivedProject = await Project.archive(
                BigInt(projectId),
                auth.getUserId(),
            );
            return { status: 'success', data: archivedProject };
        } catch (error) {
            logger.error({ err: error }, 'Error archiving project:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to archive project',
            };
        }
    },
};
