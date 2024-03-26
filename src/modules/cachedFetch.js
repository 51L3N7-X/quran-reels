import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { resolve } from "path";

let inited = false;
let mapPath = "";
let cacheFolderPath = "";
let map = {};

/**
 * @param {string} path
 */
export function initCache(path) {
  if (!existsSync(path)) mkdirSync(path);

  const basePath = resolve(path, "fetch");
  if (!existsSync(basePath)) mkdirSync(basePath);

  cacheFolderPath = resolve(basePath, "files");
  if (!existsSync(cacheFolderPath)) mkdirSync(cacheFolderPath);

  mapPath = resolve(basePath, "map.json");
  if (!existsSync(mapPath)) {
    writeFileSync(mapPath, "{}");
    map = {};
  } else {
    map = JSON.parse(readFileSync(mapPath));
  }

  inited = true;
}

/**
 * @typedef cachedResponse
 * @type {Object}
 * @property {()=>Buffer} buffer
 * @property {()=>Object|Array} json
 * @property {()=>string} text
 * @property {()=>(string|void)} path - cached file path (if any)
 */

/**
 * @param {Buffer} buffer
 * @param {string|void} path
 * @returns {cachedResponse} res
 */
function mkResponse(buffer, path) {
  return {
    buffer: () => buffer,
    json: () => JSON.parse(buffer.toString()),
    text: () => buffer.toString(),
    path: () => path,
  };
}

/**
 * @returns {string}
 */
function mkFileHash() {
  for (;;) {
    const hash = Array(3)
      .fill(0)
      .map(() => Math.random().toString(36).slice(2))
      .join("")
      .slice(0, 30);
    if (!existsSync(resolve(cacheFolderPath, hash))) return hash;
  }
}

/**
 * @param {string} url
 * @param {Object} params
 * @returns {cachedResponse} response
 */
export default async function cachedFetch(url, params = {}) {
  const parsedParams = Object.entries(params)
    .map((p) => `${p[0]}=${p[1]}`)
    .join("&");
  const fullUrl = `${url}${parsedParams.length ? `?${parsedParams}` : ""}`;

  if (inited && map[fullUrl]) {
    const path = resolve(cacheFolderPath, map[fullUrl]);
    const buffer = readFileSync(path);
    return mkResponse(buffer, path);
  }

  const res = await fetch(fullUrl);
  const buffer = Buffer.from(await res.arrayBuffer());

  if (inited) {
    const hash = mkFileHash();
    const path = resolve(cacheFolderPath, hash);
    writeFileSync(path, buffer);
    map[fullUrl] = hash;
    writeFileSync(mapPath, JSON.stringify(map));
    return mkResponse(buffer, path);
  }

  return mkResponse(buffer);
}
