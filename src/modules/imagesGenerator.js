import nodeCanvas from "canvas";
import fetch from "./cachedFetch.js";

let isSurahNamesFontRegistered = false;
const surahNames = [
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
];

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
 * @property {string} highlightColor - Highlighted word color (default: #ffaa55)
 * @property {string} background - Image Background color (default: #000000)
 * @property {string} arFont - Font size and family used for rendering the Arabic ayah text
 * @property {number} fontFamilyIndex - The index of the font family name in arFont
 * @property {"v1"|"v2"} quranFontVersion
 * @property {string} enFont - Font size and family used for rendering the English translation text
 * @property {number} arLineMarginMultiplyer - multiplyer for Arabic ayah line margin (default: 1)
 * @property {number} enLineMarginMultiplyer - multiplyer for English translation line margin (default: 1)
 * @property {number} maxLines - max lines per image, current lines are selected based on highlight (default: Infinity)
 * @property {boolean} surahNameEnabled - whether to render surah name or not  (default: true)
 * @property {boolean} surahWordInSurahName - whether to add the word "surah" to surah name (default: true)
 * @property {number} surahNameTopMargin - extra pixels between surah name and the top of the image (default: 20)
 * @property {number} surahNameFontSize - surah name font size in pixels (default: 72)
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
  highlightColor: "#ffaa55",
  background: "#000000",
  arFont: "",
  fontFamilyIndex: 1,
  quranFontVersion: "v1",
  enFont: "",
  arLineMarginMultiplyer: 1,
  enLineMarginMultiplyer: 1,
  maxLines: Infinity,
  surahNameEnabled: true,
  surahWordInSurahName: true,
  surahNameTopMargin: 20,
  surahNameFontSize: 72,
};

/**
 * @typedef ImageOptions
 * @type {Object}
 * @property {string} text - Arabic ayah text
 * @property {(string,null)[]} fontOverwrites - Override specific part of the default arFont for this image
 * @property {number} highlight -  Index of the word that should be highlighted
 * @property {string} translation - English ayah translation text (default: "No translation provided")
 * @property {number|void} surahId - used to render surah name, if any (default: none)
 */

/**
 * @type {ImageOptions}
 */
const defaultImageOptions = {
  text: "",
  fontOverwrites: [],
  highlight: -1,
  translation: "No translation provided",
  surahId: undefined,
};

export default class imagesGenerator {
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

  /** @type {number} */
  #lastHighlightedText = "";

  /** @type {number} */
  #lastHighlightedWordLine = -1;

  /** @param {ImagesGeneratorOptions} options */
  constructor(options) {
    // assign default options
    this.#options = { ...defaultImagesGeneratorOptions, ...options };
    this.#initCanvas();
  }

  #initCanvas() {
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
   * @returns {Promise<Buffer>}
   */
  async generate(options) {
    // register surah_name font if needed
    if (this.#options.surahNameEnabled && !isSurahNamesFontRegistered) {
      const font = await fetch(
        "https://quran.com/fonts/quran/surah-names/v1/sura_names.ttf",
      );
      nodeCanvas.registerFont(font.path(), { family: "surahnames" });
      this.#initCanvas();
      isSurahNamesFontRegistered = true;
    }

    // assign default options
    const opt = Object.assign(defaultImageOptions, options);

    // apply fontOverrides
    const fontParams = this.#options.arFont.split(" ");
    for (const i in options.fontOverwrites)
      if (options.fontOverwrites[i]) fontParams[i] = options.fontOverwrites[i];
    const arFont = fontParams.join(" ");

    // set background
    this.#ctx.fillStyle = this.#options.background;
    this.#ctx.fillRect(0, 0, this.#options.width, this.#options.height);

    // text color
    this.#ctx.fillStyle = this.#options.color;

    // render surah name (if any)
    if (this.#options.surahNameEnabled && options.surahId)
      this.#renderSurahName(options.surahId);

    // render English translation
    this.#writeToImage({
      text: opt.translation,
      font: this.#options.enFont,
      maxWidth: this.#options.enMaxWidth,
      highlight: -1,
    });

    // render Arabic ayah
    this.#writeToImage({
      text: opt.text,
      font: arFont,
      maxWidth: this.#options.arMaxWidth,
      highlight: opt.highlight,
      up: true,
    });

    return this.#canvas.toBuffer(this.#options.format);
  }

  /**
   * @param {surahId} surahId
   */
  #renderSurahName(surahId) {
    let text = surahNames[surahId];
    if (this.#options.surahWordInSurahName) text += surahNames[0];
    this.#ctx.font = `${this.#options.surahNameFontSize}px surahnames`;
    this.#ctx.fillText(
      text,
      this.#centerX,
      this.#options.surahNameFontSize + this.#options.surahNameTopMargin,
    );
  }

  /**
   * @param {Object} options
   * @param {string} options.text
   * @param {string} options.font
   * @param {number} options.maxWidth
   * @param {number} options.highlight
   * @param {boolean} options.up
   *
   * @returns {void}
   */
  #writeToImage(options) {
    // setup ctx
    this.#ctx.font = options.font;

    // parse text into lines based on maxWidth, also get information about the highlight word
    let lines = [""];
    const words = options.text.split(" ");
    let l = 0;
    let highlightWord = {
      line: -1,
      start: -1,
      end: -1,
    };
    for (let j = 0; j < words.length; j++) {
      const word = words[j];
      if (this.#ctx.measureText(`${lines[l]}${word}`).width < options.maxWidth)
        lines[l] += `${word} `;
      else lines[++l] = `${word} `;
      if (j === options.highlight)
        highlightWord = {
          line: l,
          start: lines[l].length - word.length - 1,
          end: lines[l].length,
        };
    }

    // remove extra space from last line
    lines[l] = lines[l].slice(0, -1);

    // select lines based on maxLines option and highlightd word (if any)
    if (options.up && this.#options.maxLines !== Infinity) {
      if (highlightWord.line !== -1) {
        const start =
          Math.floor(highlightWord.line / this.#options.maxLines) *
          this.#options.maxLines;
        const end = start + this.#options.maxLines;
        lines = lines.slice(start, end);
        this.#lastHighlightedText = options.text;
        this.#lastHighlightedWordLine = highlightWord.line;
        highlightWord.line %= this.#options.maxLines;
      } else if (this.#lastHighlightedText === options.text) {
        const start =
          Math.floor(this.#lastHighlightedWordLine / this.#options.maxLines) *
          this.#options.maxLines;
        const end = start + this.#options.maxLines;
        lines = lines.slice(start, end);
      } else {
        lines = lines.slice(0, this.#options.maxLines);
      }
    }

    // TODO: find a better way to do this
    const baseLineHeight = parseInt(this.#ctx.font.match(/\d+/)[0], 10);
    const lineHeight =
      baseLineHeight *
      (options.up
        ? this.#options.arLineMarginMultiplyer
        : this.#options.enLineMarginMultiplyer);

    // render line by line
    for (let i = 0; i < lines.length; i++) {
      const lineY =
        this.#centerY +
        lineHeight * (options.up ? -lines.length + 1 : 1) +
        lineHeight * i +
        (this.#options.margin / 2) * (options.up ? -1 : 1);
      this.#ctx.fillText(lines[i], this.#centerX, lineY);
    }

    // highlight word
    if (highlightWord.line !== -1) {
      const line = lines[highlightWord.line];
      const lineY =
        this.#centerY +
        lineHeight * (options.up ? -lines.length + 1 : 1) +
        lineHeight * highlightWord.line +
        (this.#options.margin / 2) * (options.up ? -1 : 1);

      const preWord = line.slice(0, highlightWord.end);
      const word = line.slice(highlightWord.start, highlightWord.end);
      const rightMargin = this.#ctx.measureText(preWord).width;
      const wordWidth = this.#ctx.measureText(word).width;
      const lineWidth = this.#ctx.measureText(line).width;

      this.#ctx.fillStyle = this.#options.highlightColor;
      const wordX = this.#centerX + lineWidth / 2 - rightMargin + wordWidth / 2;
      this.#ctx.fillText(word, wordX, lineY);
    }
  }

  /**
   * ASSUMES THAT CACHED-FETCH IS ALREADY INITIALIZED
   * @param {import("./fetchSurah").Ayah} ayah
   * @param {number} highlight
   * @param {number} surahId
   * @returns {Promise<Buffer>}
   */
  async generateFromAyah(ayah, highlight, surahId) {
    const family = `p${ayah.page}${this.#options.quranFontVersion}`;
    const font = await fetch(
      `https://quran.com/fonts/quran/hafs/${this.#options.quranFontVersion}/ttf/p${ayah.page}.ttf`,
    );

    nodeCanvas.registerFont(font.path(), { family });
    this.#initCanvas();

    const fontOverwrites = [
      ...new Array(this.#options.fontFamilyIndex).fill(null),
      family,
    ];

    return /* await */ this.generate({
      text: ayah.quranText[this.#options.quranFontVersion],
      translation: ayah.translation,
      fontOverwrites,
      highlight,
      surahId,
    });
  }
}
