import { HttpContext } from '../../../vendor/types/types.js';
import { prisma } from '#database/prisma.js';

export default {
    async getTasks(context: HttpContext) {
        const { auth, logger } = context;
        logger.info('getTasks handler');
        
        if (!auth.check()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        try {
            const tasks = await prisma.task.findMany({
                where: { userId: auth.getUserId() },
                include: { 
                    project: true,
                    subTasks: true,
                    parentTask: true
                },
                orderBy: { createdAt: 'desc' }
            });
            return { status: 'success', tasks };
        } catch (error) {
            logger.error('Error getting tasks:', error);
            return { status: 'error', message: 'Failed to get tasks' };
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
            const task = await prisma.task.create({
                data: {
                    title,
                    description,
                    userId: auth.getUserId(),
                    projectId: projectId ? parseInt(projectId) : null,
                    status: status || 'TODO',
                    priority: priority || 'MEDIUM',
                    tags,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    startDate: startDate ? new Date(startDate) : null,
                    estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
                    parentTaskId: parentTaskId ? parseInt(parentTaskId) : null
                },
                include: { 
                    project: true,
                    subTasks: true,
                    parentTask: true
                }
            });
            return { status: 'success', task };
        } catch (error) {
            logger.error('Error creating task:', error);
            return { status: 'error', message: 'Failed to create task' };
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
            const task = await prisma.task.findFirst({
                where: { 
                    id: parseInt(taskId),
                    userId: auth.getUserId()
                },
                include: { 
                    project: true,
                    subTasks: true,
                    parentTask: true
                }
            });

            if (!task) {
                return { status: 'error', message: 'Task not found' };
            }

            return { status: 'success', task };
        } catch (error) {
            logger.error('Error getting task:', error);
            return { status: 'error', message: 'Failed to get task' };
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
            const updateData: any = {};
            if (title !== undefined) updateData.title = title;
            if (description !== undefined) updateData.description = description;
            if (projectId !== undefined) updateData.projectId = projectId ? parseInt(projectId) : null;
            if (status !== undefined) updateData.status = status;
            if (priority !== undefined) updateData.priority = priority;
            if (progress !== undefined) {
                updateData.progress = parseInt(progress);
                updateData.isCompleted = parseInt(progress) === 100;
            }
            if (tags !== undefined) updateData.tags = tags;
            if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
            if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
            if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours ? parseFloat(estimatedHours) : null;
            if (actualHours !== undefined) updateData.actualHours = actualHours ? parseFloat(actualHours) : null;

            const task = await prisma.task.updateMany({
                where: { 
                    id: parseInt(taskId),
                    userId: auth.getUserId()
                },
                data: updateData
            });

            if (task.count === 0) {
                return { status: 'error', message: 'Task not found' };
            }

            const updatedTask = await prisma.task.findUnique({
                where: { id: parseInt(taskId) },
                include: { 
                    project: true,
                    subTasks: true,
                    parentTask: true
                }
            });

            return { status: 'success', task: updatedTask };
        } catch (error) {
            logger.error('Error updating task:', error);
            return { status: 'error', message: 'Failed to update task' };
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
            const deleted = await prisma.task.deleteMany({
                where: { 
                    id: parseInt(taskId),
                    userId: auth.getUserId()
                }
            });

            if (deleted.count === 0) {
                return { status: 'error', message: 'Task not found' };
            }

            return { status: 'success', message: 'Task deleted successfully' };
        } catch (error) {
            logger.error('Error deleting task:', error);
            return { status: 'error', message: 'Failed to delete task' };
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
            const task = await prisma.task.updateMany({
                where: { 
                    id: parseInt(taskId),
                    userId: auth.getUserId()
                },
                data: { 
                    status,
                    isCompleted: status === 'COMPLETED',
                    progress: status === 'COMPLETED' ? 100 : undefined
                }
            });

            if (task.count === 0) {
                return { status: 'error', message: 'Task not found' };
            }

            const updatedTask = await prisma.task.findUnique({
                where: { id: parseInt(taskId) },
                include: { project: true }
            });

            return { status: 'success', task: updatedTask };
        } catch (error) {
            logger.error('Error updating task status:', error);
            return { status: 'error', message: 'Failed to update task status' };
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
            const progressValue = parseInt(progress);
            const task = await prisma.task.updateMany({
                where: { 
                    id: parseInt(taskId),
                    userId: auth.getUserId()
                },
                data: { 
                    progress: progressValue,
                    isCompleted: progressValue === 100,
                    status: progressValue === 100 ? 'COMPLETED' : progressValue > 0 ? 'IN_PROGRESS' : 'TODO'
                }
            });

            if (task.count === 0) {
                return { status: 'error', message: 'Task not found' };
            }

            const updatedTask = await prisma.task.findUnique({
                where: { id: parseInt(taskId) },
                include: { project: true }
            });

            return { status: 'success', task: updatedTask };
        } catch (error) {
            logger.error('Error updating task progress:', error);
            return { status: 'error', message: 'Failed to update task progress' };
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
            const tasks = await prisma.task.findMany({
                where: { 
                    projectId: parseInt(projectId),
                    userId: auth.getUserId()
                },
                include: { 
                    project: true,
                    subTasks: true,
                    parentTask: true
                },
                orderBy: { createdAt: 'desc' }
            });

            return { status: 'success', tasks };
        } catch (error) {
            logger.error('Error getting tasks by project:', error);
            return { status: 'error', message: 'Failed to get tasks by project' };
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
            const subTasks = await prisma.task.findMany({
                where: { 
                    parentTaskId: parseInt(parentTaskId),
                    userId: auth.getUserId()
                },
                include: { 
                    project: true,
                    subTasks: true
                },
                orderBy: { createdAt: 'desc' }
            });

            return { status: 'success', tasks: subTasks };
        } catch (error) {
            logger.error('Error getting subtasks:', error);
            return { status: 'error', message: 'Failed to get subtasks' };
        }
    }
}; 