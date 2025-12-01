import { db } from '#database/db.js';
import { tasks, projects } from '#database/schema.js';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { serializeModel } from '#vendor/utils/serialization/serialize-model.js';
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

const taskStatuses = ['TODO', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const;
const taskPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

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

        const now = new Date();
        const [task] = await db.insert(tasks).values({
            title: payload.title,
            description: payload.description || null,
            userId: BigInt(payload.userId),
            projectId: payload.projectId ? BigInt(payload.projectId) : null,
            status: payload.status || 'TODO',
            priority: payload.priority || 'MEDIUM',
            tags: payload.tags || null,
            dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
            startDate: payload.startDate ? new Date(payload.startDate) : null,
            estimatedHours: payload.estimatedHours ? parseFloat(payload.estimatedHours) : null,
            parentTaskId: payload.parentTaskId ? BigInt(payload.parentTaskId) : null,
            progress: payload.progress || 0,
            isCompleted: payload.isCompleted || false,
            createdAt: now,
            updatedAt: now,
        });

        const createdTask = await db.select()
            .from(tasks)
            .where(eq(tasks.id, BigInt(task.insertId)))
            .limit(1);

        return serializeModel(createdTask[0], schema, hidden);
    },

    async findById(id: bigint, userId: bigint) {
        logger.info(`find task by id: ${id} for user: ${userId}`);

        const task = await db.select()
            .from(tasks)
            .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
            .limit(1);

        if (task.length === 0) {
            throw new Error(`Task with id ${id} not found`);
        }

        // Get project info if exists
        let project = null;
        if (task[0].projectId) {
            const projectData = await db.select()
                .from(projects)
                .where(eq(projects.id, task[0].projectId))
                .limit(1);
            project = projectData[0] || null;
        }

        // Get subtasks
        const subTasks = await db.select()
            .from(tasks)
            .where(eq(tasks.parentTaskId, id));

        return serializeModel({ ...task[0], project, subTasks }, schema, hidden);
    },

    async findByUserId(userId: bigint) {
        logger.info(`find all tasks for user: ${userId}`);

        const tasksData = await db.select()
            .from(tasks)
            .where(eq(tasks.userId, userId))
            .orderBy(desc(tasks.createdAt));

        // Get related data for each task
        const tasksWithRelations = await Promise.all(
            tasksData.map(async (task) => {
                let project = null;
                if (task.projectId) {
                    const projectData = await db.select()
                        .from(projects)
                        .where(eq(projects.id, task.projectId))
                        .limit(1);
                    project = projectData[0] || null;
                }

                const subTasks = await db.select()
                    .from(tasks)
                    .where(eq(tasks.parentTaskId, task.id));

                return { ...task, project, subTasks };
            })
        );

        return this.serializeArray(tasksWithRelations);
    },

    async findByProjectId(projectId: bigint, userId: bigint) {
        logger.info(`find tasks for project: ${projectId} and user: ${userId}`);

        const tasksData = await db.select()
            .from(tasks)
            .where(and(eq(tasks.projectId, projectId), eq(tasks.userId, userId)))
            .orderBy(desc(tasks.createdAt));

        // Get related data for each task
        const tasksWithRelations = await Promise.all(
            tasksData.map(async (task) => {
                const project = await db.select()
                    .from(projects)
                    .where(eq(projects.id, projectId))
                    .limit(1);

                const subTasks = await db.select()
                    .from(tasks)
                    .where(eq(tasks.parentTaskId, task.id));

                return { ...task, project: project[0], subTasks };
            })
        );

        return this.serializeArray(tasksWithRelations);
    },

    async findSubTasks(parentTaskId: bigint, userId: bigint) {
        logger.info(`find subtasks for parent task: ${parentTaskId} and user: ${userId}`);

        const subTasks = await db.select()
            .from(tasks)
            .where(and(eq(tasks.parentTaskId, parentTaskId), eq(tasks.userId, userId)))
            .orderBy(desc(tasks.createdAt));

        return this.serializeArray(subTasks);
    },

    async update(id: bigint, userId: bigint, payload: any) {
        logger.info(`update task id: ${id} for user: ${userId}`);

        const updateData: any = {
            updatedAt: new Date(),
        };

        if (payload.title !== undefined) updateData.title = payload.title;
        if (payload.description !== undefined) updateData.description = payload.description;
        if (payload.projectId !== undefined) {
            updateData.projectId = payload.projectId ? BigInt(payload.projectId) : null;
        }
        if (payload.status !== undefined) updateData.status = payload.status;
        if (payload.priority !== undefined) updateData.priority = payload.priority;
        if (payload.progress !== undefined) {
            updateData.progress = parseInt(payload.progress);
            updateData.isCompleted = parseInt(payload.progress) === 100;
        }
        if (payload.tags !== undefined) updateData.tags = payload.tags;
        if (payload.dueDate !== undefined) {
            updateData.dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
        }
        if (payload.startDate !== undefined) {
            updateData.startDate = payload.startDate ? new Date(payload.startDate) : null;
        }
        if (payload.estimatedHours !== undefined) {
            updateData.estimatedHours = payload.estimatedHours ? parseFloat(payload.estimatedHours) : null;
        }
        if (payload.actualHours !== undefined) {
            updateData.actualHours = payload.actualHours ? parseFloat(payload.actualHours) : null;
        }

        await db.update(tasks)
            .set(updateData)
            .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

        const updatedTask = await db.select()
            .from(tasks)
            .where(eq(tasks.id, id))
            .limit(1);

        if (updatedTask.length === 0) {
            throw new Error('Task not found or access denied');
        }

        // Get project info if exists
        let project = null;
        if (updatedTask[0].projectId) {
            const projectData = await db.select()
                .from(projects)
                .where(eq(projects.id, updatedTask[0].projectId))
                .limit(1);
            project = projectData[0] || null;
        }

        // Get subtasks
        const subTasks = await db.select()
            .from(tasks)
            .where(eq(tasks.parentTaskId, id));

        return serializeModel({ ...updatedTask[0], project, subTasks }, schema, hidden);
    },

    async updateStatus(id: bigint, userId: bigint, status: 'TODO' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED') {
        logger.info(`update task status id: ${id} for user: ${userId} to: ${status}`);

        const updateData: Record<string, any> = {
            isCompleted: status === 'COMPLETED',
            updatedAt: new Date(),
        };
        
        // Set status explicitly with correct type
        (updateData as any).status = status;

        if (status === 'COMPLETED') {
            updateData.progress = 100;
        }

        await db.update(tasks)
            .set(updateData)
            .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

        const updatedTask = await db.select()
            .from(tasks)
            .where(eq(tasks.id, id))
            .limit(1);

        if (updatedTask.length === 0) {
            throw new Error('Task not found or access denied');
        }

        // Get project info if exists
        let project = null;
        if (updatedTask[0].projectId) {
            const projectData = await db.select()
                .from(projects)
                .where(eq(projects.id, updatedTask[0].projectId))
                .limit(1);
            project = projectData[0] || null;
        }

        return serializeModel({ ...updatedTask[0], project }, schema, hidden);
    },

    async updateProgress(id: bigint, userId: bigint, progress: number) {
        logger.info(`update task progress id: ${id} for user: ${userId} to: ${progress}%`);

        const progressValue = parseInt(progress.toString());
        let status: 'TODO' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' = 'TODO';

        if (progressValue === 100) {
            status = 'COMPLETED' as const;
        } else if (progressValue > 0) {
            status = 'IN_PROGRESS' as const;
        }

        await db.update(tasks)
            .set({
                progress: progressValue,
                isCompleted: progressValue === 100,
                status: status as any,
                updatedAt: new Date(),
            })
            .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

        const updatedTask = await db.select()
            .from(tasks)
            .where(eq(tasks.id, id))
            .limit(1);

        if (updatedTask.length === 0) {
            throw new Error('Task not found or access denied');
        }

        // Get project info if exists
        let project = null;
        if (updatedTask[0].projectId) {
            const projectData = await db.select()
                .from(projects)
                .where(eq(projects.id, updatedTask[0].projectId))
                .limit(1);
            project = projectData[0] || null;
        }

        return serializeModel({ ...updatedTask[0], project }, schema, hidden);
    },

    async delete(id: bigint, userId: bigint) {
        logger.info(`delete task id: ${id} for user: ${userId}`);

        // First, check if task has subtasks and update them
        await db.update(tasks)
            .set({ parentTaskId: null })
            .where(and(eq(tasks.parentTaskId, id), eq(tasks.userId, userId)));

        // Then delete the task
        const deleted = await db.delete(tasks)
            .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

        const checkDeleted = await db.select({ count: sql<number>`count(*)` })
            .from(tasks)
            .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
        
        if (checkDeleted[0]?.count === 0) {
            throw new Error('Task not found or access denied');
        }

        return deleted;
    },

    async getTaskStatistics(userId: bigint) {
        logger.info(`get task statistics for user: ${userId}`);

        const tasksData = await db.select()
            .from(tasks)
            .where(eq(tasks.userId, userId));

        const totalTasks = tasksData.length;
        const completedTasks = tasksData.filter((task: any) => task.isCompleted).length;
        const inProgressTasks = tasksData.filter((task: any) => task.status === 'IN_PROGRESS').length;
        const todoTasks = tasksData.filter((task: any) => task.status === 'TODO').length;
        const onHoldTasks = tasksData.filter((task: any) => task.status === 'ON_HOLD').length;
        const cancelledTasks = tasksData.filter((task: any) => task.status === 'CANCELLED').length;

        const totalEstimatedHours = tasksData.reduce(
            (sum: number, task: any) => sum + (Number(task.estimatedHours) || 0),
            0,
        );
        const totalActualHours = tasksData.reduce(
            (sum: number, task: any) => sum + (Number(task.actualHours) || 0),
            0,
        );
        const averageProgress =
            totalTasks > 0
                ? tasksData.reduce((sum: number, task: any) => sum + Number(task.progress), 0) / totalTasks
                : 0;

        const overdueTasks = tasksData.filter(
            (task: any) =>
                task.dueDate &&
                new Date(task.dueDate) < new Date() &&
                !task.isCompleted,
        ).length;

        const highPriorityTasks = tasksData.filter((task: any) => task.priority === 'HIGH').length;
        const mediumPriorityTasks = tasksData.filter((task: any) => task.priority === 'MEDIUM').length;
        const lowPriorityTasks = tasksData.filter((task: any) => task.priority === 'LOW').length;

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
            completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
            averageProgress: Math.round(averageProgress),
            totalEstimatedHours,
            totalActualHours,
            timeVariance:
                totalEstimatedHours > 0
                    ? ((totalActualHours - totalEstimatedHours) / totalEstimatedHours) * 100
                    : 0,
        };
    },

    query() {
        return db.select().from(tasks);
    },

    serialize(task: any) {
        return serializeModel(task, schema, hidden);
    },

    serializeArray(tasksData: any) {
        return tasksData.map((task: any) => serializeModel(task, schema, hidden));
    },
};
