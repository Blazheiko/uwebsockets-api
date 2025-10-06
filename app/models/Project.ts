import { prisma } from '#database/prisma.js';
import { DateTime } from 'luxon';
import { serializeModel } from '#vendor/utils/serialization/serialize-model.js';
import { ProjectStatus } from '@prisma/client';
import logger from '#logger';

const schema = {
    created_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
    updated_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
    startDate: (value: Date | null) =>
        value ? DateTime.fromJSDate(value).toISO() : null,
    endDate: (value: Date | null) =>
        value ? DateTime.fromJSDate(value).toISO() : null,
    dueDate: (value: Date | null) =>
        value ? DateTime.fromJSDate(value).toISO() : null,
};

const required = ['title', 'userId'];
const hidden: string[] = [];

export default {
    async create(payload: any) {
        logger.info('create project');

        if (!payload || typeof payload !== 'object') {
            throw new Error('Payload must be object');
        }

        const keys = Object.keys(payload);
        for (let field of required) {
            if (!keys.includes(field)) {
                throw new Error(`Field ${field} required`);
            }
        }

        const project = await prisma.project.create({
            data: {
                title: payload.title,
                description: payload.description,
                color: payload.color,
                userId: payload.userId,
                status: payload.status || ProjectStatus.planning,
                dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
                startDate: payload.startDate
                    ? new Date(payload.startDate)
                    : null,
                endDate: payload.endDate ? new Date(payload.endDate) : null,
                progress: payload.progress || 0,
                isActive:
                    payload.isActive !== undefined ? payload.isActive : true,
            },
            include: {
                tasks: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        progress: true,
                        isCompleted: true,
                    },
                },
            },
        });

        return serializeModel(project, schema, hidden);
    },

    async findById(id: number, userId: number) {
        logger.info(`find project by id: ${id} for user: ${userId}`);

        const project = await prisma.project.findFirst({
            where: {
                id,
                userId,
            },
            include: {
                tasks: {
                    include: {
                        subTasks: true,
                    },
                },
            },
        });

        if (!project) {
            throw new Error(`Project with id ${id} not found`);
        }

        return serializeModel(project, schema, hidden);
    },

    async getShortProjects(userId: number) {
        logger.info(`get projects for user: ${userId}`);

        const projects = await prisma.project.findMany({
            where: { userId, isActive: true },
            select: {
                id: true,
                title: true,
                isActive: true,
            },
        });

        return projects;
    },

    async findByUserId(userId: number) {
        logger.info(`find all projects for user: ${userId}`);

        const projects = await prisma.project.findMany({
            where: { userId },
            include: {
                tasks: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        progress: true,
                        isCompleted: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return this.serializeArray(projects);
    },

    async update(id: number, userId: number, payload: any) {
        logger.info(`update project id: ${id} for user: ${userId}`);

        const updateData: any = {
            updatedAt: DateTime.now().toISO(),
        };

        if (payload.title !== undefined) updateData.title = payload.title;
        if (payload.description !== undefined)
            updateData.description = payload.description;
        if (payload.color !== undefined) updateData.color = payload.color;
        if (payload.progress !== undefined)
            updateData.progress = payload.progress;
        if (payload.isActive !== undefined)
            updateData.isActive = payload.isActive;
        if (payload.status !== undefined) updateData.status = payload.status;
        if (payload.startDate !== undefined)
            updateData.startDate = payload.startDate
                ? new Date(payload.startDate)
                : null;
        if (payload.endDate !== undefined)
            updateData.endDate = payload.endDate
                ? new Date(payload.endDate)
                : null;
        if (payload.dueDate !== undefined)
            updateData.dueDate = payload.dueDate
                ? new Date(payload.dueDate)
                : null;

        const result = await prisma.project.updateMany({
            where: {
                id,
                userId,
            },
            data: updateData,
        });

        if (result.count === 0) {
            throw new Error('Project not found or access denied');
        }

        const updatedProject = await prisma.project.findUnique({
            where: { id },
            include: {
                tasks: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        progress: true,
                        isCompleted: true,
                    },
                },
            },
        });

        return serializeModel(updatedProject, schema, hidden);
    },

    async delete(id: number, userId: number) {
        logger.info(`delete project id: ${id} for user: ${userId}`);

        // Start transaction to handle tasks and project deletion
        const result = await prisma.$transaction(async (prisma) => {
            // First, update all tasks to remove project reference
            await prisma.task.updateMany({
                where: {
                    projectId: id,
                    userId: userId,
                },
                data: { projectId: null },
            });

            // Then delete the project
            const deleted = await prisma.project.deleteMany({
                where: {
                    id,
                    userId,
                },
            });

            if (deleted.count === 0) {
                throw new Error('Project not found or access denied');
            }

            return deleted;
        });

        return result;
    },

    async archive(id: number, userId: number) {
        logger.info(`archive project id: ${id} for user: ${userId}`);

        const result = await prisma.project.updateMany({
            where: {
                id,
                userId,
            },
            data: {
                status: ProjectStatus.archived,
                isActive: false,
                endDate: new Date(),
                updatedAt: DateTime.now().toISO(),
            },
        });

        if (result.count === 0) {
            throw new Error('Project not found or access denied');
        }

        const archivedProject = await prisma.project.findUnique({
            where: { id },
            include: {
                tasks: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        progress: true,
                        isCompleted: true,
                    },
                },
            },
        });

        return serializeModel(archivedProject, schema, hidden);
    },

    async getProjectTasks(id: number, userId: number) {
        logger.info(`get tasks for project id: ${id} for user: ${userId}`);

        // First verify project belongs to user
        const project = await prisma.project.findFirst({
            where: { id, userId },
        });

        if (!project) {
            throw new Error('Project not found or access denied');
        }

        const tasks = await prisma.task.findMany({
            where: {
                projectId: id,
                userId: userId,
            },
            include: {
                subTasks: true,
                parentTask: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return tasks;
    },

    async getProjectStatistics(id: number, userId: number) {
        logger.info(`get statistics for project id: ${id} for user: ${userId}`);

        const project = await prisma.project.findFirst({
            where: {
                id,
                userId,
            },
            include: { tasks: true },
        });

        if (!project) {
            throw new Error('Project not found or access denied');
        }

        const tasks = project.tasks;
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((task) => task.isCompleted).length;
        const inProgressTasks = tasks.filter(
            (task) => task.status === 'IN_PROGRESS',
        ).length;
        const todoTasks = tasks.filter((task) => task.status === 'TODO').length;
        const onHoldTasks = tasks.filter(
            (task) => task.status === 'ON_HOLD',
        ).length;
        const cancelledTasks = tasks.filter(
            (task) => task.status === 'CANCELLED',
        ).length;

        const totalEstimatedHours = tasks.reduce(
            (sum, task) => sum + (task.estimatedHours || 0),
            0,
        );
        const totalActualHours = tasks.reduce(
            (sum, task) => sum + (task.actualHours || 0),
            0,
        );
        const averageProgress =
            totalTasks > 0
                ? tasks.reduce((sum, task) => sum + task.progress, 0) /
                  totalTasks
                : 0;

        const overdueTasks = tasks.filter(
            (task) =>
                task.dueDate &&
                new Date(task.dueDate) < new Date() &&
                !task.isCompleted,
        ).length;

        const statistics = {
            totalTasks,
            completedTasks,
            inProgressTasks,
            todoTasks,
            onHoldTasks,
            cancelledTasks,
            overdueTasks,
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

        return {
            project: serializeModel(project, schema, hidden),
            statistics,
        };
    },

    query() {
        return prisma.project;
    },

    serialize(project: any) {
        return serializeModel(project, schema, hidden);
    },

    serializeArray(projects: any) {
        return projects.map((project: any) =>
            serializeModel(project, schema, hidden),
        );
    },
};
