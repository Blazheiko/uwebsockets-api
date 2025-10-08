import fs from 'fs';
import path from 'path';

interface TypeField {
    type: string;
    required: boolean;
    description?: string;
    example?: any;
    properties?: Record<string, TypeField>;
}

interface ParsedType {
    name: string;
    module: string;
    fields: Record<string, TypeField>;
    description?: string;
}

interface TypesRegistry {
    [typeName: string]: ParsedType;
}

/**
 * Simple TypeScript .d.ts parser to extract interface definitions
 * and convert them to JSON schema format for API documentation
 */
export function parseTypesFromDtsFiles(typesDirectory: string): TypesRegistry {
    const registry: TypesRegistry = {};

    // Check if directory exists
    if (!fs.existsSync(typesDirectory)) {
        console.warn(`Types directory does not exist: ${typesDirectory}`);
        return registry;
    }

    // Read all .d.ts files except index.d.ts
    const files = fs
        .readdirSync(typesDirectory)
        .filter((file) => file.endsWith('.d.ts') && file !== 'index.d.ts');

    for (const file of files) {
        try {
            const filePath = path.join(typesDirectory, file);
            const content = fs.readFileSync(filePath, 'utf-8');

            // Parse interfaces from file
            const moduleName = file.replace('.d.ts', '');
            const interfaces = parseInterfaces(content, moduleName);
            Object.assign(registry, interfaces);
        } catch (error) {
            console.warn(`Failed to parse types from ${file}:`, error);
        }
    }

    return registry;
}

/**
 * Parse TypeScript interfaces from file content
 */
function parseInterfaces(content: string, moduleName: string): TypesRegistry {
    const registry: TypesRegistry = {};

    // Match interface definitions with better handling of nested braces
    const interfaceRegex =
        /export\s+interface\s+(\w+)(?:\s+extends\s+[\w<>, ]+)?\s*\{/g;
    let match;

    while ((match = interfaceRegex.exec(content)) !== null) {
        const interfaceName = match[1];
        const startPos = match.index + match[0].length;

        // Find the matching closing brace
        let braceCount = 1;
        let endPos = startPos;

        while (endPos < content.length && braceCount > 0) {
            const char = content[endPos];
            if (char === '{') braceCount++;
            else if (char === '}') braceCount--;
            endPos++;
        }

        if (braceCount === 0) {
            const interfaceBody = content.slice(startPos, endPos - 1);

            registry[`${moduleName}.${interfaceName}`] = {
                name: interfaceName,
                module: moduleName,
                fields: parseFields(interfaceBody),
            };
        }
    }

    return registry;
}

/**
 * Parse fields from interface body
 */
function parseFields(body: string): Record<string, TypeField> {
    const fields: Record<string, TypeField> = {};

    // Split by lines and process each line
    const lines = body
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line);

    for (const line of lines) {
        // Match field definition with optional comment: fieldName?: type; // comment
        const fieldMatch = line.match(
            /^(\w+)(\?)?:\s*([^;]+?)(?:\s*;\s*\/\/\s*(.+))?;?$/,
        );
        if (!fieldMatch) continue;

        const fieldName = fieldMatch[1];
        const isOptional = fieldMatch[2] === '?';
        const fieldType = fieldMatch[3].trim();
        const comment = fieldMatch[4]?.trim();

        // Skip if it's just a closing brace or empty
        if (fieldType === '}' || !fieldType) continue;

        const field = parseFieldType(fieldType, !isOptional);

        // If there's a comment, use it as example
        if (comment) {
            field.example = comment;
        }

        fields[fieldName] = field;
    }

    return fields;
}

/**
 * Parse field type and convert to schema format
 */
function parseFieldType(typeString: string, required: boolean): TypeField {
    const field: TypeField = {
        type: 'unknown',
        required,
    };

    // Clean up type string
    const cleanType = typeString.trim();

    // Handle array types
    if (cleanType.endsWith('[]')) {
        const itemType = cleanType.slice(0, -2).trim();
        field.type = 'array';
        field.properties = {
            items: parseFieldType(itemType, false),
        };
        return field;
    }

    // Handle union types (e.g., 'ok' | 'error')
    if (cleanType.includes('|')) {
        const types = cleanType
            .split('|')
            .map((t) => t.trim().replace(/['"]/g, ''));
        field.type = 'enum';
        // Store the full enum definition as example
        field.example = cleanType;
        return field;
    }

    // Handle object types with properties
    if (cleanType.startsWith('{') && cleanType.endsWith('}')) {
        field.type = 'object';
        field.description = 'Object with properties';
        return field;
    }

    // Handle Array<Type> syntax
    const arrayMatch = cleanType.match(/^Array<(.+)>$/);
    if (arrayMatch) {
        field.type = 'array';
        field.properties = {
            items: parseFieldType(arrayMatch[1], false),
        };
        return field;
    }

    // Handle primitive types
    const lowerType = cleanType.toLowerCase();

    if (lowerType === 'string') {
        field.type = 'string';
        field.example = 'example';
    } else if (lowerType === 'number') {
        field.type = 'number';
        field.example = Math.floor(Math.random() * 100);
    } else if (lowerType === 'boolean') {
        field.type = 'boolean';
        field.example = true;
    } else if (lowerType === 'date') {
        field.type = 'string';
        field.example = new Date().toISOString();
    } else if (lowerType === 'any') {
        field.type = 'any';
        field.example = null;
    } else if (lowerType === 'null') {
        field.type = 'null';
        field.example = null;
    } else if (lowerType === 'undefined') {
        field.type = 'undefined';
        field.example = undefined;
    } else {
        // Assume it's an object/interface reference
        field.type = 'object';
        field.description = `Reference to ${cleanType}`;
    }

    return field;
}

/**
 * Get handler name from function reference
 * Example: AuthController.register -> register
 */
export function getHandlerMethodName(handler: Function): string {
    if (!handler || !handler.name) return 'unknown';
    return handler.name;
}

/**
 * Build a mapping between route handlers and their response types
 * Based on naming convention: methodName -> MethodNameResponse
 */
// export function buildHandlerToTypeMapping(
//     registry: TypesRegistry,
//     routes: any[],
// ): Record<string, string> {
//     const mapping: Record<string, string> = {};

//     for (const routeGroup of routes) {
//         if (!routeGroup.group) continue;

//         for (const route of routeGroup.group) {
//             if (!route.handler) continue;

//             const methodName = getHandlerMethodName(route.handler);
//             if (methodName === 'unknown') continue;

//             // Try to find matching response type
//             // Convention: methodName -> MethodNameResponse
//             const possibleTypeNames = [
//                 // Exact match
//                 `${capitalize(methodName)}Response`,
//                 // Without prefix (e.g., getUsers -> UsersResponse)
//                 `${capitalize(methodName.replace(/^(get|create|update|delete|send)/, ''))}Response`,
//             ];

//             for (const typeName of possibleTypeNames) {
//                 if (registry[typeName]) {
//                     mapping[methodName] = typeName;
//                     break;
//                 }
//             }
//         }
//     }

//     return mapping;
// }

/**
 * Capitalize first letter of string
 */
// function capitalize(str: string): string {
//     if (!str) return '';
//     return str.charAt(0).toUpperCase() + str.slice(1);
// }

/**
 * Export main function for use in server
 */
export function getApiTypesForDocumentation(
    typesDirectory: string,
    // routes: any[],
): {
    types: TypesRegistry;
} {
    const types = parseTypesFromDtsFiles(typesDirectory);
    // const mapping = buildHandlerToTypeMapping(types, routes);

    return { types };
}
