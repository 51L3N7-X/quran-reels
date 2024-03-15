const nodeCanvas = require("canvas");

/**
 * @typedef ImagesGeneratorOptions
 * @type {Object}
 * @property {number} width - Image width (default: 1080)
 * @property {number} height - Image height (default: 1920)
 * @property {"image/png"|"image/jpeg"} format - Returned image buffer format (default: "image/jpeg")
 * @property {number} arMaxWidth - Arabic ayah text max width used to warp words (default: 1080)
 * @property {number} enMaxWidth - English translation text max width used to warp words (default: 540)
 * @property {number} margin - Amount of spacing between the Arabic text and English translation (default: 30)
 * @property {string} color - Text color (default: #ffffff)
 * @property {string} background - Image Background color (default: #000000)
 * @property {string} arFont - Font size and family used for rendering the Arabic ayah text
 * @property {string} enFont - Font size and family used for rendering the English translation text
 */

/**
 * @type {ImagesGeneratorOptions}
 */
const defaultImagesGeneratorOptions = {
  width: 1080,
  height: 1920,
  format: "image/jpeg",
  arMaxWidth: 1080,
  enMaxWidth: 540,
  margin: 30,
  color: "#ffffff",
  background: "#000000",
  arFont: "",
  enFont: "",
};

/**
 * @typedef ImageOptions
 * @type {Object}
 * @property {string} text - Arabic ayah text
 * @property {string} translation - English ayah translation text (default: "No translation provided")
 */

/**
 * @type {ImageOptions}
 */
const defaultImageOptions = {
  text: "",
  translation: "No translation provided",
};

module.exports = class imagesGenerator {
  /** @type {ImagesGeneratorOptions} */
  #options;

  /** @type {nodeCanvas.Canvas} */
  #canvas;

  /** @type {nodeCanvas.CanvasRenderingContext2D} */
  #ctx;

  /** @type {number} */
  #centerX;

  /** @type {number} */
  #centerY;

  /** @param {ImagesGeneratorOptions} options */
  constructor(options) {
    // assign default options
    this.#options = { ...defaultImagesGeneratorOptions, ...options };

    // setup canvas and ctx
    this.#canvas = nodeCanvas.createCanvas(
      this.#options.width,
      this.#options.height,
    );
    this.#ctx = this.#canvas.getContext("2d");
    this.#ctx.textAlign = "center";
    this.#ctx.textBaseline = "middle";
    this.#centerX = this.#canvas.width / 2;
    this.#centerY = this.#canvas.height / 2;
  }

  /**
   * @param {ImageOptions} options
   * @returns {Buffer}
   */
  generate(options) {
    // assign default options
    const opt = { ...defaultImageOptions, ...options };

    // set background
    this.#ctx.fillStyle = this.#options.background;
    this.#ctx.fillRect(0, 0, this.#options.width, this.#options.height);

    // text color
    this.#ctx.fillStyle = this.#options.color;

    // render English translation
    this.#writeToImage({
      text: opt.translation,
      font: this.#options.enFont,
      maxWidth: this.#options.enMaxWidth,
    });

    // render Arabic ayah
    this.#writeToImage({
      text: opt.text,
      font: this.#options.arFont,
      maxWidth: this.#options.arMaxWidth,
      up: true,
    });

    return this.#canvas.toBuffer(this.#options.format);
  }

  /**
   * @param {Object} options
   * @param {string} options.text
   * @param {string} options.font
   * @param {number} options.maxWidth
   * @param {boolean} options.up
   *
   * @returns {void}
   */
  #writeToImage(options) {
    // setup ctx
    this.#ctx.font = options.font;

    // parse text into lines based on maxWidth
    const lines = [""];
    const words = options.text.split(" ");
    let l = 0;
    for (let j = 0; j < words.length; j++) {
      const word = words[j];
      if (this.#ctx.measureText(`${lines[l]}${word}`).width < options.maxWidth)
        lines[l] += `${word} `;
      else lines[++l] = `${word} `;
    }

    // remove extra space from last line
    lines[l] = lines[l].slice(0, -1);

    // TODO: find a better way to do this
    const lineHeight = parseInt(this.#ctx.font.match(/\d+/)[0], 10);

    // render line by line
    for (let i = 0; i < lines.length; i++) {
      const lineY =
        this.#centerY +
        lineHeight * (options.up ? -lines.length + 1 : 1) +
        lineHeight * i +
        (this.#options.margin / 2) * (options.up ? -1 : 1);
      this.#ctx.fillText(lines[i], this.#centerX, lineY);
    }
  }
};
