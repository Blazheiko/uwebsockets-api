
/**
 * Serializes routes by converting handler function references to their names
 * Supports unlimited nesting of groups within routes
 *
 * @param routes - Array of route groups or individual routes
 * @returns Serialized routes without handler names
 */
export function serializeRoutes(routes: any[]): any[] {
    return routes.map((item: any) => {
        // If item has a 'group' property, it's a group container
        if (item.group && Array.isArray(item.group)) {
            return {
                ...item,
                group: serializeRoutes(item.group), // Recursively process nested groups
            };
        }

        // If item is an individual route, serialize its handler
        if (item.handler) {
            return {
                ...item,
                handler: null,
            };
        }

        // If item doesn't have handler or group, return as is
        return item;
    });
}
