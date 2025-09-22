// API Documentation JavaScript

// Global route data - will be populated from API
let httpRouteGroups = [];
let wsRouteGroups = [];

// Global state variables
let currentRouteType = 'http'; // 'http' or 'ws'
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
    // For WebSocket routes, handle URL differently
    const isWebSocket = currentRouteType === 'ws';
    let fullUrl;
    
    if (isWebSocket) {
        // WebSocket routes don't have leading slash and use different prefix format
        fullUrl = route.url;
    } else {
        // HTTP routes
        const cleanUrl = route.url.startsWith('/') ? route.url : `/${route.url}`;
        fullUrl = cleanUrl;
    }
    
    const parameters = extractParameters(route.url);
    const responseFormats = getResponseFormat(route.handler);
    
    // Handle case where handler might be a function reference or string
    const handlerName = typeof route.handler === 'string' ? route.handler : 
                       (route.handler && route.handler.name ? route.handler.name : 'Unknown handler');
    
    // For WebSocket routes, show different method badge
    const methodDisplay = isWebSocket ? 'WS' : route.method.toUpperCase();
    const methodClass = isWebSocket ? 'method-ws' : getMethodClass(route.method);
    
    return `
        <div class="route-item border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 transition-shadow duration-200 fade-in" data-method="${isWebSocket ? 'ws' : route.method}">
            <!-- Collapsed Header -->
            <div class="route-collapsed p-4" onclick="toggleRoute('${routeId}')">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3 flex-1 min-w-0">
                        <span class="px-3 py-1 text-xs font-semibold rounded-full border ${methodClass} flex-shrink-0">
                            ${methodDisplay}
                        </span>
                        <code class="text-sm font-mono text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded truncate">${fullUrl}</code>
                        <span class="text-gray-600 dark:text-gray-300 text-sm truncate">${route.description || 'No description available'}</span>
                    </div>
                    <div class="flex items-center space-x-2 flex-shrink-0">
                        ${route.validator ? '<span class="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">Validated</span>' : ''}
                        ${route.middleware ? '<span class="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full">Middleware</span>' : ''}
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
                                <div><span class="font-medium text-gray-700 dark:text-gray-300">Handler:</span> <code class="text-blue-600 dark:text-blue-400">${handlerName}</code></div>
                                ${route.validator ? `<div><span class="font-medium text-gray-700 dark:text-gray-300">Validator:</span> <code class="text-purple-600 dark:text-purple-400">${route.validator}</code></div>` : ''}
                                ${route.middleware ? `<div><span class="font-medium text-gray-700 dark:text-gray-300">Middleware:</span> <code class="text-orange-600 dark:text-orange-400">${route.middleware}</code></div>` : ''}
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
    // Select the appropriate route groups based on current type
    const routeGroups = currentRouteType === 'http' ? httpRouteGroups : wsRouteGroups;
    
    const filteredGroups = routeGroups.map(group => {
        if (currentFilter === 'all' && !searchTerm) return group;
        
        const filteredRoutes = group.group.filter(route => {
            // For WebSocket routes, we don't filter by method since they don't have HTTP methods
            const matchesFilter = currentRouteType === 'ws' || currentFilter === 'all' || 
                (route.method && route.method.toLowerCase() === currentFilter);
            
            const matchesSearch = !searchTerm || 
                route.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (route.description && route.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (typeof route.handler === 'string' && route.handler.toLowerCase().includes(searchTerm.toLowerCase()));
            
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
// function filterByMethod(method) {
//     currentFilter = method;
    
//     // Update active button
//     document.querySelectorAll('.filter-btn').forEach(btn => {
//         btn.classList.remove('active', 'bg-primary-500', 'text-white');
//         btn.classList.add('bg-white', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300');
//     });
//     event.target.classList.add('active', 'bg-primary-500', 'text-white');
//     event.target.classList.remove('bg-white', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300');
    
//     renderDocumentation();
// }

function filterByType(type) {
    currentRouteType = type;
    
    // Update active button
    updateActiveFilterButton(type);
    
    renderDocumentation();
}

function updateActiveFilterButton(activeType) {
    // Remove active classes from all filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-primary-500', 'text-white');
        btn.classList.add('bg-white', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300', 'border', 'border-gray-300', 'dark:border-gray-600');
    });
    
    // Add active classes to the selected button
    const activeButton = document.querySelector(`button[onclick="filterByType('${activeType}')"]`);
    if (activeButton) {
        activeButton.classList.add('active', 'bg-primary-500', 'text-white');
        activeButton.classList.remove('bg-white', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300', 'border', 'border-gray-300', 'dark:border-gray-600');
    }
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

// API functions
async function fetchRouteData() {
    try {
        const response = await fetch('/api/doc/routes');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log({ data });
        
        // Set both HTTP and WebSocket routes
        httpRouteGroups = data.httpRoutes || [];
        wsRouteGroups = data.wsRoutes || [];
        
        return { httpRoutes: httpRouteGroups, wsRoutes: wsRouteGroups };
    } catch (error) {
        console.error('Error fetching route data:', error);
        console.log('Calling showError function...');
        showError('Failed to load API documentation. Please refresh the page.');
        return { httpRoutes: [], wsRoutes: [] };
    }
}

function showError(message) {
    console.log('showError called with message:', message);
    const apiGroupsContainer = document.getElementById('apiGroups');
    console.log('apiGroupsContainer found:', !!apiGroupsContainer);
    if (apiGroupsContainer) {
        console.log('Setting error HTML...');
        apiGroupsContainer.innerHTML = `
            <div class="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                <div class="text-red-800 dark:text-red-200">
                    <svg class="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h3 class="text-lg font-semibold mb-2">Error Loading Documentation</h3>
                    <p class="text-sm">${message}</p>
                    <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                        Refresh Page
                    </button>
                </div>
            </div>
        `;
    } else {
        console.error('apiGroups container not found in DOM');
        // Fallback: create error message in body if container not found
        document.body.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div class="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center max-w-md">
                    <div class="text-red-800 dark:text-red-200">
                        <h3 class="text-lg font-semibold mb-2">Error Loading Documentation</h3>
                        <p class="text-sm">${message}</p>
                        <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                            Refresh Page
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
}

function showLoading() {
    const apiGroupsContainer = document.getElementById('apiGroups');
    if (apiGroupsContainer) {
        apiGroupsContainer.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p class="text-gray-600 dark:text-gray-400">Loading API documentation...</p>
            </div>
        `;
    }
}

// Initialize the documentation
document.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    setupThemeToggle();
    setupSearch();
    
    // Show loading state
    showLoading();
    
    // Fetch route data from API
    await fetchRouteData();
    
    // Initialize with HTTP routes by default
    updateActiveFilterButton('http');
    
    // Render documentation with fetched data
    renderDocumentation();
});
