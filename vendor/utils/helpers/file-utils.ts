/**
 * File utilities
 * 
 * Helper functions for file operations and type detection
 */

import { BINARY_EXTENSIONS } from '#vendor/constants/index.js';

/**
 * Check if a file extension represents a binary file
 * @param extension - File extension (without dot)
 * @returns true if the file should be treated as binary
 */
export function isBinaryExtension(extension: string): boolean {
    return BINARY_EXTENSIONS.includes(extension.toLowerCase());
}

/**
 * Get file extension from a file path
 * @param filePath - Path to the file
 * @returns File extension without the dot, in lowercase
 */
export function getFileExtension(filePath: string): string {
    const lastDotIndex = filePath.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === filePath.length - 1) {
        return '';
    }
    return filePath.substring(lastDotIndex + 1).toLowerCase();
}

/**
 * Check if a file path represents a binary file
 * @param filePath - Path to the file
 * @returns true if the file should be treated as binary
 */
export function isBinaryFile(filePath: string): boolean {
    const extension = getFileExtension(filePath);
    return isBinaryExtension(extension);
}
