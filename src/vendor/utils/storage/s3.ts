import * as Minio from "minio";
import diskConfig from "#config/disk.js";
import logger from "#logger";

const endpoint = (diskConfig.s3Endpoint ?? "").replace(/^https?:\/\//, "");

logger.info(
  { endpoint, bucket: diskConfig.s3Bucket, region: diskConfig.s3Region },
  "S3 config (minio)",
);

const minioClient = new Minio.Client({
  endPoint: endpoint,
  useSSL: diskConfig.s3Endpoint?.startsWith("http://") !== true,
  accessKey: diskConfig.s3AccessKeyId ?? "",
  secretKey: diskConfig.s3SecretAccessKey ?? "",
  region: diskConfig.s3Region ?? "us-east-1",
});

export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const bucket = diskConfig.s3Bucket ?? "";
  logger.info(
    { bucket, key, contentType, size: body.length },
    "Uploading to S3",
  );
  const s3DynamicDataPrefix = (
    diskConfig.s3DynamicDataPrefix ?? "uploads"
  ).replace(/^\/+|\/+$/g, "");
  const prefix = (diskConfig.s3Prefix ?? "app").replace(/^\/+|\/+$/g, "");

  const finalKey = `${prefix}/${s3DynamicDataPrefix}/${key}`;

  await minioClient.putObject(bucket, finalKey, body, body.length, {
    "Content-Type": contentType,
  });
}

export async function deleteFromS3(key: string): Promise<void> {
  const bucket = diskConfig.s3Bucket ?? "";
  logger.info({ bucket, key }, "Deleting object from S3");

  await minioClient.removeObject(bucket, key);
}

export async function presignUrl(key: string, expirySeconds = 3600): Promise<string> {
  const bucket = diskConfig.s3Bucket ?? "";
  const prefix = (diskConfig.s3Prefix ?? "app").replace(/^\/+|\/+$/g, "");
  const s3DynamicDataPrefix = (
    diskConfig.s3DynamicDataPrefix ?? "uploads"
  ).replace(/^\/+|\/+$/g, "");

  const finalKey = `${prefix}/${s3DynamicDataPrefix}/${key}`;
  return minioClient.presignedGetObject(bucket, finalKey, expirySeconds);
}

export async function downloadFromS3(
  key: string,
): Promise<{ data: Buffer; contentType: string | null }> {
  const bucket = diskConfig.s3Bucket ?? "";
  const prefix = (diskConfig.s3Prefix ?? "app").replace(/^\/+|\/+$/g, "");
  const s3DynamicDataPrefix = (
    diskConfig.s3DynamicDataPrefix ?? "uploads"
  ).replace(/^\/+|\/+$/g, "");

  const finalKey = `${prefix}/${s3DynamicDataPrefix}/${key}`;
  logger.info({ bucket, key: finalKey }, "Downloading from S3");

  const [stat, stream] = await Promise.all([
    minioClient.statObject(bucket, finalKey),
    minioClient.getObject(bucket, finalKey),
  ]);

  const contentType = (stat.metaData["content-type"] as string | undefined) ?? null;

  const data = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => { chunks.push(chunk); });
    stream.on("end", () => { resolve(Buffer.concat(chunks)); });
    stream.on("error", reject);
  });

  return { data, contentType };
}
