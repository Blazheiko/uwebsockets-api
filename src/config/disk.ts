import { env } from "node:process";
export default Object.freeze({
    s3Region: env['S3_REGION'],
    s3AccessKeyId: env['S3_ACCESS_KEY_ID'],
    s3SecretAccessKey: env['S3_SECRET_ACCESS_KEY'],
    s3Endpoint: env['S3_ENDPOINT'],
    s3Bucket: env['S3_BUCKET'],
    s3Prefix: env['S3_PREFIX'],
    s3StaticDataPrefix: env['S3_STATIC_DATA_PREFIX'],
    s3DynamicDataPrefix: env['S3_DYNAMIC_DATA_PREFIX'],
})
