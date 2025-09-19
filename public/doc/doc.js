// API Documentation JavaScript

// Route data from httpRoutes.ts
const routeGroups = [
    {
        group: [
            {
                url: '/register',
                method: 'post',
                handler: 'AuthController.register',
                validator: 'register',
                description: 'Register a new user',
            },
            {
                url: '/login',
                method: 'post',
                handler: 'AuthController.login',
                validator: 'login',
                description: 'Login a user',
            },
            {
                url: '/logout',
                method: 'post',
                handler: 'AuthController.logout',
                description: 'Logout a user',
            },
        ],
        description: 'Auth routes',
        middlewares: ['session_web'],
        prefix: 'api/auth',
    },
    {
        group: [
            {
                url: '/get-contact-list',
                method: 'post',
                handler: 'ChatListController.getContactList', 
                description: 'Get contact list',
            },
            {
                url: '/chats',
                method: 'post',
                handler: 'ChatListController.createChat',
                validator: 'createChat',
                description: 'Create a new chat',
            },
            {
                url: '/chats/:chatId',
                method: 'delete',
                handler: 'ChatListController.deleteChat',
                validator: 'deleteChat',
                description: 'Delete a chat',
            },
            {
                url: '/get-messages',
                method: 'post',
                handler: 'MessageController.getMessages',
                validator: 'getMessages',
                description: 'Get messages',
            },
            {
                url: '/send-chat-messages',
                method: 'post',
                handler: 'MessageController.sendMessage',
                validator: 'sendMessage',
                description: 'Send a message',
            },
            {
                url: '/messages/:messageId',
                method: 'delete',
                handler: 'MessageController.deleteMessage',
                validator: 'deleteMessage',
                description: 'Delete a message',
            },
            {
                url: '/messages/:messageId',
                method: 'put',
                handler: 'MessageController.editMessage',
                validator: 'editMessage',
                description: 'Edit a message',
            },
            {
                url: '/messages/:messageId/read',
                method: 'put',
                handler: 'MessageController.markAsRead',
                validator: 'markMessageAsRead',
                description: 'Mark a message as read',
            },
            {
                url: '/invitations',
                method: 'post',
                handler: 'InvitationController.createInvitation',
                validator: 'createInvitation',
                description: 'Create an invitation',
            },
            {
                url: '/invitations/user/:userId',
                method: 'get',
                handler: 'InvitationController.getUserInvitations',
                validator: 'getUserInvitations',
                description: 'Get user invitations',
            },
            {
                url: '/invitations/use',
                method: 'post',
                handler: 'InvitationController.useInvitation',
                validator: 'useInvitation',
                description: 'Use an invitation',
            },
        ],
        middlewares: ['session_web'],
        prefix: 'api/chat',
    },
    {
        group: [
            {
                url: '/init',
                method: 'get',
                handler: 'MainController.init',
                description: 'Initialize the main controller',
            },
            {
                url: '/test-header',
                method: 'get',
                handler: 'MainController.testHeaders',
                description: 'Test headers',
            },
            {
                url: '/test-cookie',
                method: 'get',
                handler: 'MainController.getSetCookies',
                description: 'Test cookies',
            },
            {
                url: '/test-session',
                method: 'get',
                handler: 'MainController.testSession',
                description: 'Test session',
            },
            {
                url: '/save-user',
                method: 'post',
                handler: 'MainController.saveUser',
                validator: 'register',
                description: 'Save a user',
            },
            {
                url: '/set-header-and-cookie',
                method: 'get',
                handler: 'MainController.setHeaderAndCookie',
                description: 'Set header and cookie',
            },
            {
                url: '/test-middleware',
                method: 'get',
                handler: 'MainController.testMiddleware',
                middlewares: ['test1'],
                description: 'Test middleware',
            },
        ],
        middlewares: ['session_web'],
        prefix: 'api',
    },
    {
        group: [
            {
                url: '/notes',
                method: 'get',
                handler: 'NotesController.getNotes',
                description: 'Get all notes',
            },
            {
                url: '/notes',
                method: 'post',
                handler: 'NotesController.createNote',
                validator: 'createNote',
                description: 'Create a new note',
            },
            {
                url: '/notes/:noteId',
                method: 'get',
                handler: 'NotesController.getNote',
                validator: 'getNote',
                description: 'Get a note by id',
            },
            {
                url: '/notes/:noteId',
                method: 'put',
                handler: 'NotesController.updateNote',
                validator: 'updateNote',
                description: 'Update a note by id',
            },
            {
                url: '/notes/:noteId',
                method: 'delete',
                handler: 'NotesController.deleteNote',
                validator: 'deleteNote',
                description: 'Delete a note by id',
            },
            {
                url: '/notes/:noteId/photos',
                method: 'post',
                handler: 'NotesController.addPhoto',
                validator: 'addNotePhoto',
                description: 'Add a photo to a note',
            },
            {
                url: '/notes/:noteId/photos/:photoId',
                method: 'delete',
                handler: 'NotesController.deletePhoto',
                validator: 'deleteNotePhoto',
                description: 'Delete a photo from a note',
            },
        ],
        middlewares: ['session_web'],
        prefix: 'api/notes',
    },
    {
        group: [
            {
                url: '/events',
                method: 'get',
                handler: 'CalendarController.getEvents',
                description: 'Get all events',
            },
            {
                url: '/events',
                method: 'post',
                handler: 'CalendarController.createEvent',
                validator: 'createEvent',
                description: 'Create a new event',
            },
            {
                url: '/events/:eventId',
                method: 'get',
                handler: 'CalendarController.getEvent',
                validator: 'getEvent',
                description: 'Get an event by id',
            },
            {
                url: '/events/:eventId',
                method: 'put',
                handler: 'CalendarController.updateEvent',
                validator: 'updateEvent',
                description: 'Update an event by id',
            },
            {
                url: '/events/:eventId',
                method: 'delete',
                handler: 'CalendarController.deleteEvent',
                validator: 'deleteEvent',
                description: 'Delete an event by id',
            },
            {
                url: '/events/date/:date',
                method: 'get',
                handler: 'CalendarController.getEventsByDate',
                validator: 'getEventsByDate',
                description: 'Get all events for a date',
            },
            {
                url: '/events/range',
                method: 'post',
                handler: 'CalendarController.getEventsByRange',
                validator: 'getEventsByRange',
                description: 'Get all events for a range of dates',
            },
        ],
        description: 'Calendar routes',
        middlewares: ['session_web'],
        prefix: 'api/calendar',
    },
    {
        group: [
            {
                url: '/tasks',
                method: 'get',
                handler: 'TaskController.getTasks',
                description: 'Get all tasks',
            },
            {
                url: '/tasks',
                method: 'post',
                handler: 'TaskController.createTask',
                validator: 'createTask',
                description: 'Create a new task',
            },
            {
                url: '/tasks/:taskId',
                method: 'get',
                handler: 'TaskController.getTask',
                validator: 'getTask',
                description: 'Get a task by id',
            },
            {
                url: '/tasks/:taskId',
                method: 'put',
                handler: 'TaskController.updateTask',
                validator: 'updateTask',
                description: 'Update a task by id',
            },
            {
                url: '/tasks/:taskId',
                method: 'delete',
                handler: 'TaskController.deleteTask',
                validator: 'deleteTask',
                description: 'Delete a task by id',
            },
            {
                url: '/tasks/:taskId/status',
                method: 'put',
                handler: 'TaskController.updateTaskStatus',
                validator: 'updateTaskStatus',
                description: 'Update a task status by id',
            },
            {
                url: '/tasks/:taskId/progress',
                method: 'put',
                handler: 'TaskController.updateTaskProgress',
                validator: 'updateTaskProgress',
                description: 'Update a task progress by id',
            },
            {
                url: '/tasks/project/:projectId',
                method: 'get',
                handler: 'TaskController.getTasksByProject',
                validator: 'getTasksByProject',
                description: 'Get all tasks for a project',
            },
            {
                url: '/tasks/:parentTaskId/subtasks',
                method: 'get',
                handler: 'TaskController.getSubTasks',
                validator: 'getSubTasks',
                description: 'Get all subtasks for a task',
            },
        ],
        description: 'Task routes',
        middlewares: ['session_web'],
        prefix: 'api',
    },
    {
        group: [
            {
                url: '/projects',
                method: 'get',
                handler: 'ProjectController.getProjects',
                description: 'Get all projects',
            },
            {
                url: '/projects/create',
                method: 'post',
                handler: 'ProjectController.createProject',
                validator: 'createProject',
                description: 'Create a new project',
            },
            {
                url: '/projects/:projectId',
                method: 'get',
                handler: 'ProjectController.getProject',
                validator: 'getProject',
                description: 'Get a project by id',
            },
            {
                url: '/projects/:projectId',
                method: 'put',
                handler: 'ProjectController.updateProject',
                validator: 'updateProject',
                description: 'Update a project by id',
            },
            {
                url: '/projects/:projectId',
                method: 'delete',
                handler: 'ProjectController.deleteProject',
                validator: 'deleteProject',
                description: 'Delete a project by id',
            },
            {
                url: '/projects/:projectId/tasks',
                method: 'get',
                handler: 'ProjectController.getProjectTasks',
                validator: 'getProjectTasks',
                description: 'Get all tasks for a project',
            },
            {
                url: '/projects/:projectId/statistics',
                method: 'get',
                handler: 'ProjectController.getProjectStatistics',
                validator: 'getProjectStatistics',
                description: 'Get statistics for a project',
            },
            {
                url: '/projects/:projectId/archive',
                method: 'put',
                handler: 'ProjectController.archiveProject',
                validator: 'archiveProject',
                description: 'Archive a project by id',
            },
        ],
        description: 'Project routes',
        middlewares: ['session_web'],
        prefix: 'api',
    },
    {
        group: [
            {
                url: '/push-subscriptions',
                method: 'get',
                handler: 'PushSubscriptionController.getSubscriptions',
            },
            {
                url: '/push-subscriptions',
                method: 'post',
                handler: 'PushSubscriptionController.createSubscription',
                validator: 'createPushSubscription',
            },
            {
                url: '/push-subscriptions/:subscriptionId',
                method: 'get',
                handler: 'PushSubscriptionController.getSubscription',
                validator: 'getPushSubscription',
            },
            {
                url: '/push-subscriptions/:subscriptionId',
                method: 'put',
                handler: 'PushSubscriptionController.updateSubscription',
                validator: 'updatePushSubscription',
            },
            {
                url: '/push-subscriptions/:subscriptionId',
                method: 'delete',
                handler: 'PushSubscriptionController.deleteSubscription',
                validator: 'deletePushSubscription',
            },
            {
                url: '/push-subscriptions/:subscriptionId/logs',
                method: 'get',
                handler: 'PushSubscriptionController.getSubscriptionLogs',
                validator: 'getPushSubscriptionLogs',
            },
            {
                url: '/push-subscriptions/:subscriptionId/statistics',
                method: 'get',
                handler: 'PushSubscriptionController.getSubscriptionStatistics',
                validator: 'getPushSubscriptionStatistics',
            },
            {
                url: '/push-subscriptions/:subscriptionId/deactivate',
                method: 'put',
                handler: 'PushSubscriptionController.deactivateSubscription',
                validator: 'deactivatePushSubscription',
            },
        ],
        description: 'Push Subscription routes',
        middlewares: ['session_web'],
        prefix: 'api',
    }
];

// Global state variables
let currentFilter = 'all';
let searchTerm = '';

// Utility functions
function getMethodClass(method) {
    return `method-${method.toLowerCase()}`;
}

function extractParameters(url) {
    const params = [];
    const matches = url.match(/:([^/]+)/g);
    if (matches) {
        matches.forEach(match => {
            params.push({
                name: match.substring(1),
                type: 'path',
                required: true
            });
        });
    }
    return params;
}

function getResponseFormat(handler) {
    // Mock response formats based on handler patterns
    const responseFormats = {
        'get': {
            success: {
                status: 200,
                data: "Object or Array depending on endpoint"
            },
            error: {
                status: 404,
                message: "Resource not found"
            }
        },
        'post': {
            success: {
                status: 201,
                data: "Created resource object",
                message: "Resource created successfully"
            },
            error: {
                status: 400,
                message: "Validation error"
            }
        },
        'put': {
            success: {
                status: 200,
                data: "Updated resource object",
                message: "Resource updated successfully"
            },
            error: {
                status: 404,
                message: "Resource not found"
            }
        },
        'delete': {
            success: {
                status: 200,
                message: "Resource deleted successfully"
            },
            error: {
                status: 404,
                message: "Resource not found"
            }
        }
    };
    return responseFormats;
}

// Rendering functions
function renderRoute(route, prefix, routeId) {
    const fullUrl = `/${prefix}${route.url}`;
    const parameters = extractParameters(route.url);
    const responseFormats = getResponseFormat(route.handler);
    
    return `
        <div class="route-item border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 transition-shadow duration-200 fade-in" data-method="${route.method}">
            <!-- Collapsed Header -->
            <div class="route-collapsed p-4" onclick="toggleRoute('${routeId}')">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3 flex-1 min-w-0">
                        <span class="px-3 py-1 text-xs font-semibold rounded-full border ${getMethodClass(route.method)} flex-shrink-0">
                            ${route.method.toUpperCase()}
                        </span>
                        <code class="text-sm font-mono text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded truncate">${fullUrl}</code>
                        <span class="text-gray-600 dark:text-gray-300 text-sm truncate">${route.description || 'No description available'}</span>
                    </div>
                    <div class="flex items-center space-x-2 flex-shrink-0">
                        ${route.validator ? '<span class="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">Validated</span>' : ''}
                        <svg class="expand-icon h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                </div>
            </div>
            
            <!-- Expanded Details -->
            <div class="route-details" id="details-${routeId}">
                <div class="px-4 pb-4">
                    <div class="grid md:grid-cols-2 gap-4">
                        <div>
                            <h5 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Details</h5>
                            <div class="space-y-1 text-sm">
                                <div><span class="font-medium text-gray-700 dark:text-gray-300">Handler:</span> <code class="text-blue-600 dark:text-blue-400">${route.handler}</code></div>
                                ${route.validator ? `<div><span class="font-medium text-gray-700 dark:text-gray-300">Validator:</span> <code class="text-purple-600 dark:text-purple-400">${route.validator}</code></div>` : ''}
                                ${route.middlewares ? `<div><span class="font-medium text-gray-700 dark:text-gray-300">Middlewares:</span> <code class="text-orange-600 dark:text-orange-400">${route.middlewares.join(', ')}</code></div>` : ''}
                            </div>
                            
                            ${parameters.length > 0 ? `
                                <h5 class="font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2">Parameters</h5>
                                <div class="space-y-2">
                                    ${parameters.map(param => `
                                        <div class="flex items-center space-x-2 text-sm">
                                            <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-mono">${param.name}</span>
                                            <span class="text-gray-500 dark:text-gray-400">${param.type}</span>
                                            ${param.required ? '<span class="text-red-500 dark:text-red-400 text-xs">required</span>' : '<span class="text-gray-400 dark:text-gray-500 text-xs">optional</span>'}
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                        
                        <div>
                            <h5 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Response Format</h5>
                            <div class="space-y-3">
                                <div>
                                    <h6 class="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Success Response</h6>
                                    <pre class="text-xs bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-2 rounded border dark:border-gray-600 overflow-x-auto"><code>${JSON.stringify(responseFormats[route.method]?.success || {status: 200, data: "Success"}, null, 2)}</code></pre>
                                </div>
                                <div>
                                    <h6 class="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Error Response</h6>
                                    <pre class="text-xs bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-2 rounded border dark:border-gray-600 overflow-x-auto"><code>${JSON.stringify(responseFormats[route.method]?.error || {status: 400, message: "Error"}, null, 2)}</code></pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderGroup(group, index) {
    const groupName = group.description || `Group ${index + 1}`;
    const routes = group.group || [];
    
    return `
        <div class="group-item bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden fade-in">
            <div class="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-b dark:border-gray-600">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-xl font-bold text-gray-900 dark:text-white">${groupName}</h3>
                        <div class="flex items-center space-x-4 mt-2">
                            <span class="text-sm text-gray-600 dark:text-gray-300">
                                <span class="font-medium">Prefix:</span> 
                                <code class="bg-white dark:bg-gray-800 px-2 py-1 rounded text-primary-700 dark:text-primary-400">/${group.prefix}</code>
                            </span>
                            ${group.middlewares ? `
                                <span class="text-sm text-gray-600 dark:text-gray-300">
                                    <span class="font-medium">Middlewares:</span> 
                                    <code class="bg-white dark:bg-gray-800 px-2 py-1 rounded text-orange-700 dark:text-orange-400">${group.middlewares.join(', ')}</code>
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold text-primary-600 dark:text-primary-400">${routes.length}</div>
                        <div class="text-sm text-gray-600 dark:text-gray-300">endpoints</div>
                    </div>
                </div>
            </div>
            
            <div class="p-6">
                <div class="space-y-4">
                    ${routes.map((route, routeIndex) => {
                        const routeId = `route-${index}-${routeIndex}`;
                        return renderRoute(route, group.prefix, routeId);
                    }).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderDocumentation() {
    const filteredGroups = routeGroups.map(group => {
        if (currentFilter === 'all' && !searchTerm) return group;
        
        const filteredRoutes = group.group.filter(route => {
            const matchesFilter = currentFilter === 'all' || route.method.toLowerCase() === currentFilter;
            const matchesSearch = !searchTerm || 
                route.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (route.description && route.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                route.handler.toLowerCase().includes(searchTerm.toLowerCase());
            
            return matchesFilter && matchesSearch;
        });
        
        return { ...group, group: filteredRoutes };
    }).filter(group => group.group.length > 0);

    const apiGroupsContainer = document.getElementById('apiGroups');
    apiGroupsContainer.innerHTML = filteredGroups.map((group, index) => renderGroup(group, index)).join('');
    
    // updateStats(filteredGroups);
}

// function updateStats(groups) {
//     const totalEndpoints = groups.reduce((sum, group) => sum + group.group.length, 0);
//     const protectedRoutes = groups.reduce((sum, group) => 
//         sum + group.group.filter(route => group.middlewares && group.middlewares.length > 0).length, 0
//     );
//     const validatedRoutes = groups.reduce((sum, group) => 
//         sum + group.group.filter(route => route.validator).length, 0
//     );

//     document.getElementById('groupCount').textContent = groups.length;
//     document.getElementById('endpointCount').textContent = totalEndpoints;
//     document.getElementById('protectedCount').textContent = protectedRoutes;
//     document.getElementById('validatedCount').textContent = validatedRoutes;
// }

// Event handlers
function filterByMethod(method) {
    currentFilter = method;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-primary-500', 'text-white');
        btn.classList.add('bg-white', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300');
    });
    event.target.classList.add('active', 'bg-primary-500', 'text-white');
    event.target.classList.remove('bg-white', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300');
    
    renderDocumentation();
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderDocumentation();
    });
}

function toggleRoute(routeId) {
    const detailsElement = document.getElementById(`details-${routeId}`);
    const expandIcon = detailsElement.parentElement.querySelector('.expand-icon');
    
    if (detailsElement.classList.contains('expanded')) {
        detailsElement.classList.remove('expanded');
        expandIcon.classList.remove('rotated');
    } else {
        detailsElement.classList.add('expanded');
        expandIcon.classList.add('rotated');
    }
}

function expandAll() {
    const allDetails = document.querySelectorAll('.route-details');
    const allIcons = document.querySelectorAll('.expand-icon');
    
    allDetails.forEach(detail => detail.classList.add('expanded'));
    allIcons.forEach(icon => icon.classList.add('rotated'));
}

function collapseAll() {
    const allDetails = document.querySelectorAll('.route-details');
    const allIcons = document.querySelectorAll('.expand-icon');
    
    allDetails.forEach(detail => detail.classList.remove('expanded'));
    allIcons.forEach(icon => icon.classList.remove('rotated'));
}

// Theme management functions
function initializeTheme() {
    // Check for saved theme in localStorage or default to light theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function setupThemeToggle() {
    const themeToggleButton = document.getElementById('themeToggle');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    }
}

// Initialize the documentation
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    setupThemeToggle();
    renderDocumentation();
    setupSearch();
});
