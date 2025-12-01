import { db } from '#database/db.js';
import { projects, tasks } from '#database/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { serializeModel } from '#vendor/utils/serialization/serialize-model.js';
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

const projectStatuses = ['planning', 'in_progress', 'on_hold', 'completed', 'archived'] as const;

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

        const now = new Date();
        const [project] = await db.insert(projects).values({
            title: payload.title,
            description: payload.description || null,
            color: payload.color || null,
            userId: BigInt(payload.userId),
            status: payload.status || 'planning',
            dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
            startDate: payload.startDate ? new Date(payload.startDate) : null,
            endDate: payload.endDate ? new Date(payload.endDate) : null,
            progress: payload.progress || 0,
            isActive: payload.isActive !== undefined ? payload.isActive : true,
            createdAt: now,
            updatedAt: now,
        });

        const createdProject = await db.select()
            .from(projects)
            .where(eq(projects.id, BigInt(project.insertId)))
            .limit(1);

        return serializeModel(createdProject[0], schema, hidden);
    },

    async findById(id: bigint, userId: bigint) {
        logger.info(`find project by id: ${id} for user: ${userId}`);

        const project = await db.select()
            .from(projects)
            .where(and(eq(projects.id, id), eq(projects.userId, userId)))
            .limit(1);

        if (project.length === 0) {
            throw new Error(`Project with id ${id} not found`);
        }

        // Get tasks for the project
        const projectTasks = await db.select()
            .from(tasks)
            .where(eq(tasks.projectId, id));

        return serializeModel({ ...project[0], tasks: projectTasks }, schema, hidden);
    },

    async getShortProjects(userId: bigint) {
        logger.info(`get projects for user: ${userId}`);

        const projectsData = await db.select({
            id: projects.id,
            title: projects.title,
            isActive: projects.isActive,
        })
            .from(projects)
            .where(and(eq(projects.userId, userId), eq(projects.isActive, true)));

        return projectsData;
    },

    async findByUserId(userId: bigint) {
        logger.info(`find all projects for user: ${userId}`);

        const projectsData = await db.select()
            .from(projects)
            .where(eq(projects.userId, userId))
            .orderBy(desc(projects.createdAt));

        // Get tasks for each project
        const projectsWithTasks = await Promise.all(
            projectsData.map(async (project) => {
                const projectTasks = await db.select({
                    id: tasks.id,
                    title: tasks.title,
                    status: tasks.status,
                    progress: tasks.progress,
                    isCompleted: tasks.isCompleted,
                })
                    .from(tasks)
                    .where(eq(tasks.projectId, project.id));
                return { ...project, tasks: projectTasks };
            })
        );

        return this.serializeArray(projectsWithTasks);
    },

    async update(id: bigint, userId: bigint, payload: any) {
        logger.info(`update project id: ${id} for user: ${userId}`);

        const updateData: any = {
            updatedAt: new Date(),
        };

        if (payload.title !== undefined) updateData.title = payload.title;
        if (payload.description !== undefined) updateData.description = payload.description;
        if (payload.color !== undefined) updateData.color = payload.color;
        if (payload.progress !== undefined) updateData.progress = payload.progress;
        if (payload.isActive !== undefined) updateData.isActive = payload.isActive;
        if (payload.status !== undefined) updateData.status = payload.status;
        if (payload.startDate !== undefined) {
            updateData.startDate = payload.startDate ? new Date(payload.startDate) : null;
        }
        if (payload.endDate !== undefined) {
            updateData.endDate = payload.endDate ? new Date(payload.endDate) : null;
        }
        if (payload.dueDate !== undefined) {
            updateData.dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
        }

        await db.update(projects)
            .set(updateData)
            .where(and(eq(projects.id, id), eq(projects.userId, userId)));

        const updatedProject = await db.select()
            .from(projects)
            .where(eq(projects.id, id))
            .limit(1);

        if (updatedProject.length === 0) {
            throw new Error('Project not found or access denied');
        }

        // Get tasks for the project
        const projectTasks = await db.select({
            id: tasks.id,
            title: tasks.title,
            status: tasks.status,
            progress: tasks.progress,
            isCompleted: tasks.isCompleted,
        })
            .from(tasks)
            .where(eq(tasks.projectId, id));

        return serializeModel({ ...updatedProject[0], tasks: projectTasks }, schema, hidden);
    },

    async delete(id: bigint, userId: bigint) {
        logger.info(`delete project id: ${id} for user: ${userId}`);

        // First, update all tasks to remove project reference
        await db.update(tasks)
            .set({ projectId: null })
            .where(and(eq(tasks.projectId, id), eq(tasks.userId, userId)));

        // Then delete the project
        const deleted = await db.delete(projects)
            .where(and(eq(projects.id, id), eq(projects.userId, userId)));

        const checkDeleted = await db.select({ count: sql<number>`count(*)` })
            .from(projects)
            .where(and(eq(projects.id, id), eq(projects.userId, userId)));
        
        if (checkDeleted[0]?.count === 0) {
            throw new Error('Project not found or access denied');
        }

        return deleted;
    },

    async archive(id: bigint, userId: bigint) {
        logger.info(`archive project id: ${id} for user: ${userId}`);

        await db.update(projects)
            .set({
                status: 'archived',
                isActive: false,
                endDate: new Date(),
                updatedAt: new Date(),
            })
            .where(and(eq(projects.id, id), eq(projects.userId, userId)));

        const archivedProject = await db.select()
            .from(projects)
            .where(eq(projects.id, id))
            .limit(1);

        if (archivedProject.length === 0) {
            throw new Error('Project not found or access denied');
        }

        // Get tasks for the project
        const projectTasks = await db.select({
            id: tasks.id,
            title: tasks.title,
            status: tasks.status,
            progress: tasks.progress,
            isCompleted: tasks.isCompleted,
        })
            .from(tasks)
            .where(eq(tasks.projectId, id));

        return serializeModel({ ...archivedProject[0], tasks: projectTasks }, schema, hidden);
    },

    async getProjectTasks(id: bigint, userId: bigint) {
        logger.info(`get tasks for project id: ${id} for user: ${userId}`);

        // First verify project belongs to user
        const project = await db.select()
            .from(projects)
            .where(and(eq(projects.id, id), eq(projects.userId, userId)))
            .limit(1);

        if (project.length === 0) {
            throw new Error('Project not found or access denied');
        }

        const projectTasks = await db.select()
            .from(tasks)
            .where(and(eq(tasks.projectId, id), eq(tasks.userId, userId)))
            .orderBy(desc(tasks.createdAt));

        return projectTasks;
    },

    async getProjectStatistics(id: bigint, userId: bigint) {
        logger.info(`get statistics for project id: ${id} for user: ${userId}`);

        const project = await db.select()
            .from(projects)
            .where(and(eq(projects.id, id), eq(projects.userId, userId)))
            .limit(1);

        if (project.length === 0) {
            throw new Error('Project not found or access denied');
        }

        const projectTasks = await db.select()
            .from(tasks)
            .where(eq(tasks.projectId, id));

        const totalTasks = projectTasks.length;
        const completedTasks = projectTasks.filter((task: any) => task.isCompleted).length;
        const inProgressTasks = projectTasks.filter((task: any) => task.status === 'IN_PROGRESS').length;
        const todoTasks = projectTasks.filter((task: any) => task.status === 'TODO').length;
        const onHoldTasks = projectTasks.filter((task: any) => task.status === 'ON_HOLD').length;
        const cancelledTasks = projectTasks.filter((task: any) => task.status === 'CANCELLED').length;

        const totalEstimatedHours = projectTasks.reduce(
            (sum: number, task: any) => sum + (Number(task.estimatedHours) || 0),
            0,
        );
        const totalActualHours = projectTasks.reduce(
            (sum: number, task: any) => sum + (Number(task.actualHours) || 0),
            0,
        );
        const averageProgress =
            totalTasks > 0
                ? projectTasks.reduce((sum: number, task: any) => sum + Number(task.progress), 0) / totalTasks
                : 0;

        const overdueTasks = projectTasks.filter(
            (task: any) =>
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
            completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
            averageProgress: Math.round(averageProgress),
            totalEstimatedHours,
            totalActualHours,
            timeVariance:
                totalEstimatedHours > 0
                    ? ((totalActualHours - totalEstimatedHours) / totalEstimatedHours) * 100
                    : 0,
        };

        return {
            project: serializeModel(project[0], schema, hidden),
            statistics,
        };
    },

    query() {
        return db.select().from(projects);
    },

    serialize(project: any) {
        return serializeModel(project, schema, hidden);
    },

    serializeArray(projectsData: any) {
        return projectsData.map((project: any) =>
            serializeModel(project, schema, hidden),
        );
    },
};
