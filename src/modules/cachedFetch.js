import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
} from "fs";
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
 * @returns {Promise<cachedResponse>} response
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

  // file urls don't get cached, but return path with the response
  if (url.startsWith("file://")) {
    const path = url.slice(7);
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

/**
 * @param {string|RegExp|(url: string)=>boolean|undefined|null} match
 * @returns {number} - delete count
 */
export function flush(match) {
  if (!inited) return 0;

  let deleteCount = 0;
  const del = (url) => {
    const path = resolve(cacheFolderPath, map[url]);
    unlinkSync(path);
    delete map[url];
    deleteCount++;
  };

  if (match instanceof RegExp) {
    for (const url of Object.keys(map)) if (match.test(url)) del(url);
  } else if (typeof match === "function") {
    for (const url of Object.keys(map)) if (match(url)) del(url);
  } else if (typeof match === "string") {
    for (const url of Object.keys(map)) if (match === url) del(url);
  } else if (match === undefined || match === null) {
    for (const url of Object.keys(map)) del(url);
  }

  writeFileSync(mapPath, JSON.stringify(map));
  return deleteCount;
}
