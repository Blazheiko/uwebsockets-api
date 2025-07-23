import { HttpContext } from '../../../vendor/types/types.js';
import { prisma } from '#database/prisma.js';

export default {
    async getProjects(context: HttpContext) {
        const { auth, logger } = context;
        logger.info('getProjects handler');
        
        if (!auth.isAuthenticated()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        try {
            const projects = await prisma.project.findMany({
                where: { userId: auth.user.id },
                include: { 
                    tasks: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            progress: true,
                            isCompleted: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            return { status: 'success', data: projects };
        } catch (error) {
            logger.error('Error getting projects:', error);
            return { status: 'error', message: 'Failed to get projects' };
        }
    },

    async createProject(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('createProject handler');
        
        if (!auth.isAuthenticated()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { name, description, color, startDate, endDate } = httpData.payload;

        try {
            const project = await prisma.project.create({
                data: {
                    name,
                    description,
                    color,
                    userId: auth.user.id,
                    startDate: startDate ? new Date(startDate) : null,
                    endDate: endDate ? new Date(endDate) : null
                },
                include: { tasks: true }
            });
            return { status: 'success', data: project };
        } catch (error) {
            logger.error('Error creating project:', error);
            return { status: 'error', message: 'Failed to create project' };
        }
    },

    async getProject(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('getProject handler');
        
        if (!auth.isAuthenticated()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string };

        try {
            const project = await prisma.project.findFirst({
                where: { 
                    id: parseInt(projectId),
                    userId: auth.user.id 
                },
                include: { 
                    tasks: {
                        include: {
                            subTasks: true
                        }
                    }
                }
            });

            if (!project) {
                return { status: 'error', message: 'Project not found' };
            }

            return { status: 'success', data: project };
        } catch (error) {
            logger.error('Error getting project:', error);
            return { status: 'error', message: 'Failed to get project' };
        }
    },

    async updateProject(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('updateProject handler');
        
        if (!auth.isAuthenticated()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string };
        const { name, description, color, isActive, startDate, endDate } = httpData.payload;

        try {
            const updateData: any = {};
            if (name !== undefined) updateData.name = name;
            if (description !== undefined) updateData.description = description;
            if (color !== undefined) updateData.color = color;
            if (isActive !== undefined) updateData.isActive = isActive;
            if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
            if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

            const project = await prisma.project.updateMany({
                where: { 
                    id: parseInt(projectId),
                    userId: auth.user.id 
                },
                data: updateData
            });

            if (project.count === 0) {
                return { status: 'error', message: 'Project not found' };
            }

            const updatedProject = await prisma.project.findUnique({
                where: { id: parseInt(projectId) },
                include: { tasks: true }
            });

            return { status: 'success', data: updatedProject };
        } catch (error) {
            logger.error('Error updating project:', error);
            return { status: 'error', message: 'Failed to update project' };
        }
    },

    async deleteProject(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('deleteProject handler');
        
        if (!auth.isAuthenticated()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string };

        try {
            // First, update all tasks to remove project reference
            await prisma.task.updateMany({
                where: { 
                    projectId: parseInt(projectId),
                    userId: auth.user.id 
                },
                data: { projectId: null }
            });

            // Then delete the project
            const deleted = await prisma.project.deleteMany({
                where: { 
                    id: parseInt(projectId),
                    userId: auth.user.id 
                }
            });

            if (deleted.count === 0) {
                return { status: 'error', message: 'Project not found' };
            }

            return { status: 'success', message: 'Project deleted successfully' };
        } catch (error) {
            logger.error('Error deleting project:', error);
            return { status: 'error', message: 'Failed to delete project' };
        }
    },

    async getProjectTasks(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('getProjectTasks handler');
        
        if (!auth.isAuthenticated()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string };

        try {
            const tasks = await prisma.task.findMany({
                where: { 
                    projectId: parseInt(projectId),
                    userId: auth.user.id 
                },
                include: { 
                    subTasks: true,
                    parentTask: true
                },
                orderBy: { createdAt: 'desc' }
            });

            return { status: 'success', data: tasks };
        } catch (error) {
            logger.error('Error getting project tasks:', error);
            return { status: 'error', message: 'Failed to get project tasks' };
        }
    },

    async getProjectStatistics(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('getProjectStatistics handler');
        
        if (!auth.isAuthenticated()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string };

        try {
            const project = await prisma.project.findFirst({
                where: { 
                    id: parseInt(projectId),
                    userId: auth.user.id 
                },
                include: { tasks: true }
            });

            if (!project) {
                return { status: 'error', message: 'Project not found' };
            }

            const tasks = project.tasks;
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter(task => task.isCompleted).length;
            const inProgressTasks = tasks.filter(task => task.status === 'IN_PROGRESS').length;
            const todoTasks = tasks.filter(task => task.status === 'TODO').length;
            const onHoldTasks = tasks.filter(task => task.status === 'ON_HOLD').length;
            const cancelledTasks = tasks.filter(task => task.status === 'CANCELLED').length;

            const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
            const totalActualHours = tasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);
            const averageProgress = totalTasks > 0 ? tasks.reduce((sum, task) => sum + task.progress, 0) / totalTasks : 0;

            const overdueTasks = tasks.filter(task => 
                task.dueDate && new Date(task.dueDate) < new Date() && !task.isCompleted
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
                timeVariance: totalEstimatedHours > 0 ? ((totalActualHours - totalEstimatedHours) / totalEstimatedHours) * 100 : 0
            };

            return { status: 'success', data: { project, statistics } };
        } catch (error) {
            logger.error('Error getting project statistics:', error);
            return { status: 'error', message: 'Failed to get project statistics' };
        }
    },

    async archiveProject(context: HttpContext) {
        const { httpData, auth, logger } = context;
        logger.info('archiveProject handler');
        
        if (!auth.isAuthenticated()) {
            return { status: 'error', message: 'Unauthorized' };
        }

        const { projectId } = httpData.params as { projectId: string }  ;

        try {
            const project = await prisma.project.updateMany({
                where: { 
                    id: parseInt(projectId),
                    userId: auth.user.id 
                },
                data: { isActive: false }
            });

            if (project.count === 0) {
                return { status: 'error', message: 'Project not found' };
            }

            const archivedProject = await prisma.project.findUnique({
                where: { id: parseInt(projectId) },
                include: { tasks: true }
            });

            return { status: 'success', data: archivedProject };
        } catch (error) {
            logger.error('Error archiving project:', error);
            return { status: 'error', message: 'Failed to archive project' };
        }
    }
}; 