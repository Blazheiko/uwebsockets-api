import Project from '#app/models/Project.js';
import { HttpContext } from '../../../vendor/types/types.js';
import Task from '../../models/Task.js';

export default {
    async getTasks(context: HttpContext) {
        const { auth, logger } = context;
        logger.info('getTasks handler');
        
        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        try {
            const userId = auth.getUserId();
            const tasks = await Task.findByUserId(userId);
            const projects = await Project.getShortProjects(userId);
            return { status: 'success', tasks, projects };
        } catch (error) {
            logger.error('Error getting tasks:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to get tasks' };
        }
    },

    async createTask(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('createTask handler');
        
        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { 
            title, 
            description, 
            projectId, 
            status, 
            priority, 
            tags, 
            dueDate, 
            startDate, 
            estimatedHours,
            parentTaskId
        } = httpData.payload;

        try {
            const task = await Task.create({
                title,
                description,
                userId: auth.getUserId(),
                projectId,
                status,
                priority,
                tags,
                dueDate,
                startDate,
                estimatedHours,
                parentTaskId
            });
            return { status: 'success', task };
        } catch (error) {
            logger.error('Error creating task:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to create task' };
        }
    },

    async getTask(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('getTask handler');
        
        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { taskId } = httpData.params as { taskId: string };

        try {
            const task = await Task.findById(parseInt(taskId), auth.getUserId());
            return { status: 'success', task };
        } catch (error) {
            logger.error('Error getting task:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to get task' };
        }
    },

    async updateTask(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('updateTask handler');
        
        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { taskId } = httpData.params as { taskId: string };
        const { 
            title, 
            description, 
            projectId, 
            status, 
            priority, 
            progress,
            tags, 
            dueDate, 
            startDate, 
            estimatedHours,
            actualHours
        } = httpData.payload;

        try {
            const task = await Task.update(parseInt(taskId), auth.getUserId(), {
                title,
                description,
                projectId,
                status,
                priority,
                progress,
                tags,
                dueDate,
                startDate,
                estimatedHours,
                actualHours
            });

            return { status: 'success', task };
        } catch (error) {
            logger.error('Error updating task:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to update task' };
        }
    },

    async deleteTask(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('deleteTask handler');
        
        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { taskId } = httpData.params as { taskId: string };

        try {
            await Task.delete(parseInt(taskId), auth.getUserId());
            return { status: 'success', message: 'Task deleted successfully' };
        } catch (error) {
            logger.error('Error deleting task:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to delete task' };
        }
    },

    async updateTaskStatus(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('updateTaskStatus handler');
        
        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { taskId } = httpData.params as { taskId: string };
        const { status } = httpData.payload;

        try {
            const task = await Task.updateStatus(parseInt(taskId), auth.getUserId(), status);
            return { status: 'success', task };
        } catch (error) {
            logger.error('Error updating task status:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to update task status' };
        }
    },

    async updateTaskProgress(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('updateTaskProgress handler');
        
        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { taskId } = httpData.params as { taskId: string };
        const { progress } = httpData.payload;

        try {
            const task = await Task.updateProgress(parseInt(taskId), auth.getUserId(), parseInt(progress));
            return { status: 'success', task };
        } catch (error) {
            logger.error('Error updating task progress:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to update task progress' };
        }
    },

    async getTasksByProject(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('getTasksByProject handler');
        
        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string };

        try {
            const tasks = await Task.findByProjectId(parseInt(projectId), auth.getUserId());
            return { status: 'success', tasks };
        } catch (error) {
            logger.error('Error getting tasks by project:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to get tasks by project' };
        }
    },

    async getSubTasks(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('getSubTasks handler');
        
        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { parentTaskId } = httpData.params as { parentTaskId: string };

        try {
            const subTasks = await Task.findSubTasks(parseInt(parentTaskId), auth.getUserId());
            return { status: 'success', tasks: subTasks };
        } catch (error) {
            logger.error('Error getting subtasks:', error);
            return { status: 'error', message: error instanceof Error ? error.message : 'Failed to get subtasks' };
        }
    }
}; 