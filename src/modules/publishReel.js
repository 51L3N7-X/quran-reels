import "dotenv/config";
import axios from "axios";

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

/**
 * @param {string} accessToken - Facebook App access token
 * @param {string} containerId - Instagram container id
 * @returns {Promise<uploadStatusData>}
 */
export const uploadStatus = async (accessToken, containerId) => {
  const response = await axios.get(
    `https://graph.facebook.com/v19.0/${containerId}`,
    {
      params: {
        access_token: accessToken,
        fields: "status,status_code",
      },
    },
  );

  return response.data;
};

/**
 *
 * @param {string} accessToken
 * @param {string} instagramAccountId
 * @param {string} creationId
 * @returns {Promise<containerData>}
 */
export const publishContainer = async (
  accessToken,
  instagramAccountId,
  creationId,
) => {
  const response = await axios.post(
    `https://graph.facebook.com/v19.0/${instagramAccountId}/media_publish`,
    { access_token: accessToken, creation_id: creationId },
  );

  return response.data;
};

/**
 *
 * @param {string} accessToken
 * @param {string} mediaId
 * @returns {Promise<permalinkData>}
 */
export const getPermalink = async (accessToken, mediaId) => {
  const response = await axios.get(
    `https://graph.facebook.com/v19.0/${mediaId}`,
    { params: { access_token: accessToken, fields: "permalink" } },
  );

  return response.data;
};
/**
 *
 * @param {Object} data - Main data
 * @param {string} data.accessToken - Facebook App access token
 * @param {string} data.instagramAccountId - Instagram account id
 * @param {string=} data.caption - Reel caption
 * @param {string} data.videoURL - Video url to upload
 * @param {string=} data.coverURL - Video cover image url
 * @returns {Promise<containerData>}
 */

export default async function toContainer({
  accessToken,
  instagramAccountId,
  caption,
  videoURL,
  coverURL,
}) {
  const response = await axios.post(
    `https://graph.facebook.com/v19.0/${instagramAccountId}/media`,
    {
      access_token: accessToken,
      media_type: "REELS",
      video_url: videoURL,
      ...(caption ? { caption } : {}),
      ...(coverURL ? { cover_url: coverURL } : {}),
    },
  );
  return response.data;
}
