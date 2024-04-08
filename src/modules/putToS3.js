import "dotenv/config";

import {
  S3Client,
  ListObjectsCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { v4 as uuid } from "uuid";

export default class S3 {
  #client;

  #id;

  /**
   * @param {Object} data - AWS S3 Settings and Credentials
   * @param {string=} data.id - AWS Access Key Id
   * @param {string=} data.secret - AWS Secret Access Key
   * @param {string=} data.region - AWs Region
   */
  constructor({
    accessId = process.env.AWS_ACCESS_KEY_ID,
    secret = process.env.AWS_SECRET_ACCESS_KEY,
    region = "eu-north-1",
  }) {
    this.#client = new S3Client({
      credentials: {
        accessKeyId: accessId,
        secretAccessKey: secret,
      },
      region,
    });
    this.#id = uuid();
    this.clear();
  }

  async upload(video) {
    const upload = new Upload({
      client: this.#client,
      params: {
        Bucket: process.env.BUCKET_NAME,
        Key: `${this.#id}.mp4`,
        Body: video,
      },
    });

    upload.on("httpUploadProgress", (progress) => {
      console.log(progress);
    });

    const data = await upload.done();

    return data;
  }

  async list() {
    const command = new ListObjectsCommand({ Bucket: process.env.BUCKET_NAME });

    const { Contents } = await this.#client.send(command);

    return Contents;
  }

  async clear() {
    const objects = await this.list();
    if (objects?.length > 0) {
      const command = new DeleteObjectsCommand({
        Bucket: process.env.BUCKET_NAME,
        Delete: {
          Objects: objects.map(({ Key }) => ({ Key })),
        },
      });

      await this.#client.send(command);
    }
  }
}
