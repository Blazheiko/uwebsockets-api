import { HttpContext } from '../../../vendor/types/types.js';
import Project from '../../models/Project.js';

export default {
    async getProjects(context: HttpContext) {
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
            logger.error('Error getting projects:', error);
            return { status: 'error', message: 'Failed to get projects' };
        }
    },

    async createProject(context: HttpContext) {
        const { httpData, auth, logger, responseData } = context;
        logger.info('createProject handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { title, description, color, startDate, endDate, dueDate } = httpData.payload;

        try {
            const project = await Project.create({
                title,
                description,
                color,
                userId: auth.getUserId(),
                startDate,
                endDate,
                dueDate
            });
            return { status: 'success', project };
        } catch (error) {
            logger.error('Error creating project:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to create project' };
        }
    },

    async getProject(context: HttpContext) {
        const { httpData, auth, logger, responseData } = context;
        logger.info('getProject handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string };

        try {
            const project = await Project.findById(parseInt(projectId), auth.getUserId());
            return { status: 'success', data: project };
        } catch (error) {
            logger.error('Error getting project:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to get project' };
        }
    },

    async updateProject(context: HttpContext) {
        const { httpData, auth, logger, responseData } = context;
        logger.info('updateProject handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string };
        const { title, description, color, startDate, endDate, dueDate, isActive, progress } = httpData.payload;

        try {
            const project = await Project.update(parseInt(projectId), auth.getUserId(), {
                title,
                description,
                color,
                startDate,
                endDate,
                dueDate,
                isActive,
                progress
            });

            return { status: 'success', project };
        } catch (error) {
            logger.error('Error updating project:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to update project' };
        }
    },

    async deleteProject(context: HttpContext) {
        const { httpData, auth, logger, responseData } = context;
        logger.info('deleteProject handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string };

        try {
            await Project.delete(parseInt(projectId), auth.getUserId());
            return { status: 'success', message: 'Project deleted successfully' };
        } catch (error) {
            logger.error('Error deleting project:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to delete project' };
        }
    },

    async getProjectTasks(context: HttpContext) {
        const { httpData, auth, logger, responseData } = context;
        logger.info('getProjectTasks handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string };

        try {
            const tasks = await Project.getProjectTasks(parseInt(projectId), auth.getUserId());
            return { status: 'success', data: tasks };
        } catch (error) {
            logger.error('Error getting project tasks:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to get project tasks' };
        }
    },

    async getProjectStatistics(context: HttpContext) {
        const { httpData, auth, logger, responseData } = context;
        logger.info('getProjectStatistics handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string };

        try {
            const data = await Project.getProjectStatistics(parseInt(projectId), auth.getUserId());
            return { status: 'success', data };
        } catch (error) {
            logger.error('Error getting project statistics:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to get project statistics' };
        }
    },

    async archiveProject(context: HttpContext) {
        const { httpData, auth, logger, responseData } = context;
        logger.info('archiveProject handler');

        if (!auth.check()) {
            responseData.status = 401;
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string };

        try {
            const archivedProject = await Project.archive(parseInt(projectId), auth.getUserId());
            return { status: 'success', data: archivedProject };
        } catch (error) {
            logger.error('Error archiving project:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to archive project' };
        }
    }
};
