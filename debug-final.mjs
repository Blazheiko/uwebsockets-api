import { getApiTypesForDocumentation } from './dist/vendor/utils/tooling/parse-types-from-dts.js';

// Test the parser with the types directory
const result = getApiTypesForDocumentation('./app/controllers/http/types');

// Check all fields of InitResponse
if (result.types['MainController.InitResponse']) {
    console.log('InitResponse all fields:');
    console.log(
        JSON.stringify(
            result.types['MainController.InitResponse'].fields,
            null,
            2,
        ),
    );
}
