import Project from '#app/models/Project.js';
import { HttpContext } from '../../../vendor/types/types.js';
import taskModel from '#app/models/Task.js';
import type {
    GetTasksResponse,
    CreateTaskResponse,
    GetTaskResponse,
    UpdateTaskResponse,
    DeleteTaskResponse,
    UpdateTaskStatusResponse,
    UpdateTaskProgressResponse,
    GetTasksByProjectResponse,
    GetSubTasksResponse,
    TestTasksResponse,
} from '../types/TaskController.js';

export default {
    async testTasks(context: HttpContext): Promise<TestTasksResponse> {
        const allTasks = await taskModel.query();
        return { status: 'ok', tasks: allTasks };
    },
    async getTasks(context: HttpContext): Promise<GetTasksResponse> {
        const { auth, logger } = context;
        logger.info('getTasks handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        try {
            const userId = auth.getUserId();
            const tasks = await taskModel.findByUserId(userId);
            const projects = await Project.getShortProjects(userId);
            return { status: 'success', tasks, projects };
        } catch (error) {
            logger.error({ err: error }, 'Error getting tasks:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to get tasks',
            };
        }
    },

    async createTask(context: HttpContext): Promise<CreateTaskResponse> {
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
            parentTaskId,
        } = httpData.payload;

        try {
            const task = await taskModel.create({
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
                parentTaskId,
            });
            return { status: 'success', task };
        } catch (error) {
            logger.error({ err: error }, 'Error creating task:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to create task',
            };
        }
    },

    async getTask(context: HttpContext): Promise<GetTaskResponse> {
        const { httpData, auth, logger } = context;
        logger.info('getTask handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { taskId } = httpData.params as { taskId: string };

        try {
            const task = await taskModel.findById(BigInt(taskId), auth.getUserId());
            return { status: 'success', task };
        } catch (error) {
            logger.error({ err: error }, 'Error getting task:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to get task',
            };
        }
    },

    async updateTask(context: HttpContext): Promise<UpdateTaskResponse> {
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
            actualHours,
        } = httpData.payload;

        try {
            const task = await taskModel.update(BigInt(taskId), auth.getUserId(), {
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
                actualHours,
            });

            return { status: 'success', task };
        } catch (error) {
            logger.error({ err: error }, 'Error updating task:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to update task',
            };
        }
    },

    async deleteTask(context: HttpContext): Promise<DeleteTaskResponse> {
        const { httpData, auth, logger } = context;
        logger.info('deleteTask handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { taskId } = httpData.params as { taskId: string };

        try {
            await taskModel.delete(BigInt(taskId), auth.getUserId());
            return { status: 'success', message: 'Task deleted successfully' };
        } catch (error) {
            logger.error({ err: error }, 'Error deleting task:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to delete task',
            };
        }
    },

    async updateTaskStatus(
        context: HttpContext,
    ): Promise<UpdateTaskStatusResponse> {
        const { httpData, auth, logger } = context;
        logger.info('updateTaskStatus handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { taskId } = httpData.params as { taskId: string };
        const { status } = httpData.payload;

        try {
            const task = await taskModel.updateStatus(
                BigInt(taskId),
                auth.getUserId(),
                status,
            );
            return { status: 'success', task };
        } catch (error) {
            logger.error({ err: error }, 'Error updating task status:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to update task status',
            };
        }
    },

    async updateTaskProgress(
        context: HttpContext,
    ): Promise<UpdateTaskProgressResponse> {
        const { httpData, auth, logger } = context;
        logger.info('updateTaskProgress handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { taskId } = httpData.params as { taskId: string };
        const { progress } = httpData.payload;

        try {
            const task = await taskModel.updateProgress(
                BigInt(taskId),
                auth.getUserId(),
                parseInt(progress),
            );
            return { status: 'success', task };
        } catch (error) {
            logger.error({ err: error }, 'Error updating task progress:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to update task progress',
            };
        }
    },

    async getTasksByProject(
        context: HttpContext,
    ): Promise<GetTasksByProjectResponse> {
        const { httpData, auth, logger } = context;
        logger.info('getTasksByProject handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string };

        try {
            const tasks = await taskModel.findByProjectId(
                BigInt(projectId),
                auth.getUserId(),
            );
            return { status: 'success', tasks };
        } catch (error) {
            logger.error({ err: error }, 'Error getting tasks by project:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to get tasks by project',
            };
        }
    },

    async getSubTasks(context: HttpContext): Promise<GetSubTasksResponse> {
        const { httpData, auth, logger } = context;
        logger.info('getSubTasks handler');

        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { parentTaskId } = httpData.params as { parentTaskId: string };

        try {
            const subTasks = await taskModel.findSubTasks(
                BigInt(parentTaskId),
                auth.getUserId(),
            );
            return { status: 'success', tasks: subTasks };
        } catch (error) {
            logger.error({ err: error }, 'Error getting subtasks:');
            return {
                status: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Failed to get subtasks',
            };
        }
    },
};
