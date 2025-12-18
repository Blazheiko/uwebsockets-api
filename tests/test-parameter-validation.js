#!/usr/bin/env node

/**
 * Simple test script to verify parameter validation works correctly
 */

import {
    ParameterValidationError,
    validateParameter,
} from '../dist/app/validate/checkers/parameter-checker.js';

console.log('🧪 Testing Parameter Validation...\n');

// Test 1: Valid parameters should not throw
console.log('Test 1: Valid parameters');
try {
    validateParameter('valid-param', 'testParam');
    validateParameter('123', 'numericParam');
    validateParameter('test_param.value/path', 'complexParam');
    console.log('✅ Valid parameters passed');
} catch (error) {
    console.log('❌ Valid parameters failed:', error.message);
}

// Test 2: Invalid characters should throw ParameterValidationError
console.log('\nTest 2: Invalid characters');
try {
    validateParameter('invalid@param', 'emailParam');
    console.log('❌ Should have thrown error for invalid characters');
} catch (error) {
    if (error instanceof ParameterValidationError) {
        console.log(
            '✅ Correctly threw ParameterValidationError:',
            error.message,
        );
        console.log('   Parameter name:', error.parameterName);
        console.log('   Parameter value:', error.parameterValue);
        console.log('   Error code:', error.code);
    } else {
        console.log('❌ Threw wrong error type:', error.constructor.name);
    }
}

// Test 3: Too long parameter should throw ParameterValidationError
console.log('\nTest 3: Parameter too long');
try {
    const longParam = 'a'.repeat(300); // Exceeds MAX_PARAMETER_LENGTH (256)
    validateParameter(longParam, 'longParam');
    console.log('❌ Should have thrown error for parameter too long');
} catch (error) {
    if (error instanceof ParameterValidationError) {
        console.log(
            '✅ Correctly threw ParameterValidationError for long parameter',
        );
        console.log('   Error message:', error.message);
    } else {
        console.log('❌ Threw wrong error type:', error.constructor.name);
    }
}

// Test 4: Empty/null parameters should be allowed
console.log('\nTest 4: Empty/null parameters');
try {
    validateParameter('', 'emptyParam');
    validateParameter(null, 'nullParam');
    validateParameter(undefined, 'undefinedParam');
    console.log('✅ Empty/null parameters correctly allowed');
} catch (error) {
    console.log('❌ Empty/null parameters failed:', error.message);
}

console.log('\n🎉 Parameter validation tests completed!');
