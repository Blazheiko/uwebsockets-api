import { prisma } from '#database/prisma.js';
import { DateTime } from 'luxon';
import { serializeModel } from '#vendor/utils/serialization/serialize-model.js';
import { Prisma, TaskStatus, TaskPriority } from '@prisma/client';
import logger from '#logger';

const schema = {
    created_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
    updated_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
    startDate: (value: Date | null) =>
        value ? DateTime.fromJSDate(value).toISO() : null,
    dueDate: (value: Date | null) =>
        value ? DateTime.fromJSDate(value).toISO() : null,
};

const required = ['title', 'userId'];
const hidden: string[] = [];

export default {
    async create(payload: any) {
        logger.info('create task');

        if (!payload || typeof payload !== 'object') {
            throw new Error('Payload must be object');
        }

        const keys = Object.keys(payload);
        for (let field of required) {
            if (!keys.includes(field)) {
                throw new Error(`Field ${field} required`);
            }
        }

        const task = await prisma.task.create({
            data: {
                title: payload.title,
                description: payload.description,
                userId: payload.userId,
                projectId: payload.projectId
                    ? parseInt(payload.projectId)
                    : null,
                status: payload.status || TaskStatus.TODO,
                priority: payload.priority || TaskPriority.MEDIUM,
                tags: payload.tags,
                dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
                startDate: payload.startDate
                    ? new Date(payload.startDate)
                    : null,
                estimatedHours: payload.estimatedHours
                    ? parseFloat(payload.estimatedHours)
                    : null,
                parentTaskId: payload.parentTaskId
                    ? parseInt(payload.parentTaskId)
                    : null,
                progress: payload.progress || 0,
                isCompleted: payload.isCompleted || false,
            },
            include: {
                project: true,
                subTasks: true,
                parentTask: true,
            },
        });

        return serializeModel(task, schema, hidden);
    },

    async findById(id: number, userId: number) {
        logger.info(`find task by id: ${id} for user: ${userId}`);

        const task = await prisma.task.findFirst({
            where: {
                id,
                userId,
            },
            include: {
                project: true,
                subTasks: true,
                parentTask: true,
            },
        });

        if (!task) {
            throw new Error(`Task with id ${id} not found`);
        }

        return serializeModel(task, schema, hidden);
    },

    async findByUserId(userId: number) {
        logger.info(`find all tasks for user: ${userId}`);

        const tasks = await prisma.task.findMany({
            where: { userId },
            include: {
                project: true,
                subTasks: true,
                parentTask: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return this.serializeArray(tasks);
    },

    async findByProjectId(projectId: number, userId: number) {
        logger.info(`find tasks for project: ${projectId} and user: ${userId}`);

        const tasks = await prisma.task.findMany({
            where: {
                projectId,
                userId,
            },
            include: {
                project: true,
                subTasks: true,
                parentTask: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return this.serializeArray(tasks);
    },

    async findSubTasks(parentTaskId: number, userId: number) {
        logger.info(
            `find subtasks for parent task: ${parentTaskId} and user: ${userId}`,
        );

        const subTasks = await prisma.task.findMany({
            where: {
                parentTaskId,
                userId,
            },
            include: {
                project: true,
                subTasks: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return this.serializeArray(subTasks);
    },

    async update(id: number, userId: number, payload: any) {
        logger.info(`update task id: ${id} for user: ${userId}`);

        const updateData: any = {
            updatedAt: DateTime.now().toISO(),
        };

        if (payload.title !== undefined) updateData.title = payload.title;
        if (payload.description !== undefined)
            updateData.description = payload.description;
        if (payload.projectId !== undefined)
            updateData.projectId = payload.projectId
                ? parseInt(payload.projectId)
                : null;
        if (payload.status !== undefined) updateData.status = payload.status;
        if (payload.priority !== undefined)
            updateData.priority = payload.priority;
        if (payload.progress !== undefined) {
            updateData.progress = parseInt(payload.progress);
            updateData.isCompleted = parseInt(payload.progress) === 100;
        }
        if (payload.tags !== undefined) updateData.tags = payload.tags;
        if (payload.dueDate !== undefined)
            updateData.dueDate = payload.dueDate
                ? new Date(payload.dueDate)
                : null;
        if (payload.startDate !== undefined)
            updateData.startDate = payload.startDate
                ? new Date(payload.startDate)
                : null;
        if (payload.estimatedHours !== undefined)
            updateData.estimatedHours = payload.estimatedHours
                ? parseFloat(payload.estimatedHours)
                : null;
        if (payload.actualHours !== undefined)
            updateData.actualHours = payload.actualHours
                ? parseFloat(payload.actualHours)
                : null;

        const result = await prisma.task.updateMany({
            where: {
                id,
                userId,
            },
            data: updateData,
        });

        if (result.count === 0) {
            throw new Error('Task not found or access denied');
        }

        const updatedTask = await prisma.task.findUnique({
            where: { id },
            include: {
                project: true,
                subTasks: true,
                parentTask: true,
            },
        });

        return serializeModel(updatedTask, schema, hidden);
    },

    async updateStatus(id: number, userId: number, status: TaskStatus) {
        logger.info(
            `update task status id: ${id} for user: ${userId} to: ${status}`,
        );

        const result = await prisma.task.updateMany({
            where: {
                id,
                userId,
            },
            data: {
                status,
                isCompleted: status === TaskStatus.COMPLETED,
                progress: status === TaskStatus.COMPLETED ? 100 : undefined,
                updatedAt: DateTime.now().toISO(),
            },
        });

        if (result.count === 0) {
            throw new Error('Task not found or access denied');
        }

        const updatedTask = await prisma.task.findUnique({
            where: { id },
            include: { project: true },
        });

        return serializeModel(updatedTask, schema, hidden);
    },

    async updateProgress(id: number, userId: number, progress: number) {
        logger.info(
            `update task progress id: ${id} for user: ${userId} to: ${progress}%`,
        );

        const progressValue = parseInt(progress.toString());
        let status: TaskStatus = TaskStatus.TODO;

        if (progressValue === 100) {
            status = TaskStatus.COMPLETED;
        } else if (progressValue > 0) {
            status = TaskStatus.IN_PROGRESS;
        }

        const result = await prisma.task.updateMany({
            where: {
                id,
                userId,
            },
            data: {
                progress: progressValue,
                isCompleted: progressValue === 100,
                status: status,
                updatedAt: DateTime.now().toISO(),
            },
        });

        if (result.count === 0) {
            throw new Error('Task not found or access denied');
        }

        const updatedTask = await prisma.task.findUnique({
            where: { id },
            include: { project: true },
        });

        return serializeModel(updatedTask, schema, hidden);
    },

    async delete(id: number, userId: number) {
        logger.info(`delete task id: ${id} for user: ${userId}`);

        // Start transaction to handle subtasks and parent task deletion
        const result = await prisma.$transaction(async (prisma: any) => {
            // First, check if task has subtasks and update them
            await prisma.task.updateMany({
                where: {
                    parentTaskId: id,
                    userId: userId,
                },
                data: { parentTaskId: null },
            });

            // Then delete the task
            const deleted = await prisma.task.deleteMany({
                where: {
                    id,
                    userId,
                },
            });

            if (deleted.count === 0) {
                throw new Error('Task not found or access denied');
            }

            return deleted;
        });

        return result;
    },

    async getTaskStatistics(userId: number) {
        logger.info(`get task statistics for user: ${userId}`);

        const tasks = await prisma.task.findMany({
            where: { userId },
        });

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((task: any) => task.isCompleted).length;
        const inProgressTasks = tasks.filter(
            (task: any) => task.status === TaskStatus.IN_PROGRESS,
        ).length;
        const todoTasks = tasks.filter(
            (task: any) => task.status === TaskStatus.TODO,
        ).length;
        const onHoldTasks = tasks.filter(
            (task: any) => task.status === TaskStatus.ON_HOLD,
        ).length;
        const cancelledTasks = tasks.filter(
            (task: any) => task.status === TaskStatus.CANCELLED,
        ).length;

        const totalEstimatedHours = tasks.reduce(
            (sum: number, task: any) => sum + (task.estimatedHours || 0),
            0,
        );
        const totalActualHours = tasks.reduce(
            (sum: number, task: any) => sum + (task.actualHours || 0),
            0,
        );
        const averageProgress =
            totalTasks > 0
                ? tasks.reduce((sum: number, task: any) => sum + task.progress, 0) /
                  totalTasks
                : 0;

        const overdueTasks = tasks.filter(
            (task: any) =>
                task.dueDate &&
                new Date(task.dueDate) < new Date() &&
                !task.isCompleted,
        ).length;

        const highPriorityTasks = tasks.filter(
            (task: any) => task.priority === TaskPriority.HIGH,
        ).length;
        const mediumPriorityTasks = tasks.filter(
            (task: any) => task.priority === TaskPriority.MEDIUM,
        ).length;
        const lowPriorityTasks = tasks.filter(
            (task: any) => task.priority === TaskPriority.LOW,
        ).length;

        return {
            totalTasks,
            completedTasks,
            inProgressTasks,
            todoTasks,
            onHoldTasks,
            cancelledTasks,
            overdueTasks,
            highPriorityTasks,
            mediumPriorityTasks,
            lowPriorityTasks,
            completionRate:
                totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
            averageProgress: Math.round(averageProgress),
            totalEstimatedHours,
            totalActualHours,
            timeVariance:
                totalEstimatedHours > 0
                    ? ((totalActualHours - totalEstimatedHours) /
                          totalEstimatedHours) *
                      100
                    : 0,
        };
    },

    query() {
        return prisma.task;
    },

    serialize(task: any) {
        return serializeModel(task, schema, hidden);
    },

    serializeArray(tasks: any) {
        return tasks.map((task: any) => serializeModel(task, schema, hidden));
    },
};
