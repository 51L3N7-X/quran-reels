import "dotenv/config";
import axios from "axios";
import sleep from "../utils/sleep";

/**
 * @typedef containerData
 * @type {Object}
 * @property {string} id - Container id
 */

/**
 * @typedef permalinkData
 * @type {Object}
 * @property {string} id - Reel id
 * @property {string} permalink - Reel URL
 */

/**
 * @typedef uploadStatusData
 * @type {Object}
 * @property {"EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED"} status_code - Status code of container
 * @property {string} status - Status of container
 * @property {string} id - Container id
 */

export default class Reel {
  #accessToken;

  #instagramAccountId;

  /**
   * @param {Object} data - Main data
   * @param {string} data.accessToken - Facebook App access token
   * @param {string} data.instagramAccountId - Instagram account id
   * @param {number} data.version - Graph Version Number
   */
  constructor({ accessToken, instagramAccountId, version }) {
    this.#accessToken = accessToken || process.env.LONG_TERM_ACCESS_TOKEN;
    this.#instagramAccountId =
      instagramAccountId || process.env.INSTAGRAM_ACCOUNT_ID;

    this.version = `$v${version}.0` || "v19.0";
    if (!this.#accessToken) throw new Error("Facebook Access Token not found.");
  }

  /**
   * @param {string} containerId - Instagram container id
   * @returns {Promise<uploadStatusData>}
   */
  async uploadStatus(containerId) {
    const response = await axios.get(
      `https://graph.facebook.com/${this.version}/${containerId}`,
      {
        params: {
          access_token: this.#accessToken,
          fields: "status,status_code",
        },
      },
    );

    return response.data;
  }

  /**
   * @param {string} creationId
   * @returns {Promise<containerData>}
   */
  async publishContainer(creationId) {
    const response = await axios.post(
      `https://graph.facebook.com/${this.version}/${this.#instagramAccountId}/media_publish`,
      { access_token: this.#accessToken, creation_id: creationId },
    );

    return response.data;
  }

  /**
   * @param {string} mediaId
   * @returns {Promise<permalinkData>}
   */
  async getPermalink(mediaId) {
    const response = await axios.get(
      `https://graph.facebook.com/${this.version}/${mediaId}`,
      { params: { access_token: this.#accessToken, fields: "permalink" } },
    );

    return response.data;
  }

  /**
   * @param {Object} data - Main data
   * @param {string=} data.caption - Reel caption
   * @param {string} data.videoURL - Video url to upload
   * @param {string=} data.coverURL - Video cover image url
   * @returns {Promise<containerData>}
   */
  async toContainer({ caption, videoURL, coverURL }) {
    const response = await axios.post(
      `https://graph.facebook.com/${this.version}/${this.#instagramAccountId}/media`,
      {
        access_token: this.#accessToken,
        media_type: "REELS",
        video_url: videoURL,
        ...(caption ? { caption } : {}),
        ...(coverURL ? { cover_url: coverURL } : {}),
      },
    );
    return response.data;
  }

  /**
   * @param {Object} data - Main Data
   * @param {string=} data.caption - Reel caption
   * @param {string} data.videoURL - Video URL to upload
   * @param {string=} data.coverURL - Video cover image URL
   * @return {string} - Reel Link
   */

  async post({ caption, videoURL, coverURL }) {
    if (!videoURL) throw new Error("VideoURL not found, Please insert it.");

    const { id: containerId } = await this.toContainer({
      videoURL,
      caption,
      coverURL,
    });

    let code = null;
    const now = Date.now();

    while (code !== "FINISHED") {
      if (Date.now() - now > 2 * 60 * 1000) {
        throw new Error("Upload took longer than 2 minutes.");
      }

      const status = await this.uploadStatus(containerId);
      code = status.status_code;
      await sleep(3000);
    }

    const { id: creationId } = await this.publishContainer(containerId);

    const { permalink } = await this.getPermalink(creationId);

    return permalink;
  }
}
