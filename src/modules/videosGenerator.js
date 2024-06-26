import stream from "stream";
import { path } from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import { createSlideshow } from "slideshow-video";

import fetch from "./cachedFetch.js";

// https://stackoverflow.com/questions/45555960/nodejs-fluent-ffmpeg-cannot-find-ffmpeg
ffmpeg.setFfmpegPath(path);

export default class VideosGenerator {
  /** @type {import("./imagesGenerator.js").default} */
  #imagesGenerator;

  /** @type {import("slideshow-video").FfmpegOptions} */
  #ffmpegOptions;

  /** @type {boolean} */
  #highlightWords;

  /**
   * @param {import("./imagesGenerator.js").default} imagesGenerator
   * @param {import("slideshow-video").FfmpegOptions} [ffmpegOptions={}]
   * @param {boolean} [highlightWords=true]
   */
  constructor(imagesGenerator, ffmpegOptions = {}, highlightWords = true) {
    this.#imagesGenerator = imagesGenerator;
    this.#ffmpegOptions = ffmpegOptions;
    this.#highlightWords = highlightWords;
  }

  /**
   * @param {import("./fetchSurah.js").SurahData} surah
   * @returns {Promise<Buffer>}
   */
  async generateFromSurah(surah) {
    /** @type {import("slideshow-video").InputImage[]} */
    const images = [];

    for (let i = 0; i < surah.ayat.length; i++) {
      const ayah = surah.ayat[i];
      for (const word of ayah.words) {
        // generate images highlighting each word
        const imageBuffer = await this.#imagesGenerator.generateFromAyah(
          ayah,
          this.#highlightWords ? word[0] : -1,
          surah.id,
        );

        images.push({
          buffer: imageBuffer,
          duration: word[2] - word[1],
        });
      }

      // generate images highlighting nothing at the end of each ayah
      const imageBuffer = await this.#imagesGenerator.generateFromAyah(
        ayah,
        -1, // highlight nothing
        surah.id,
      );

      const nextAyah = surah.ayat[i + 1] || { start: ayah.end + 1000 / 25 };

      images.push({
        buffer: imageBuffer,
        duration: nextAyah.start - ayah.end,
      });
    }

    // generate extra frame idk it doesn't work without it
    const imageBuffer = await this.#imagesGenerator.generateFromAyah(
      surah.ayat[surah.ayat.length - 1],
      -1,
      surah.id,
    );

    images.push({
      buffer: imageBuffer,
      duration: 1,
    });

    // workaround for a bug in slideshow-video input validation
    // img.filePath = fileURLToPath(join(dirname(import.meta.url), "..", ".."));

    for (const img of images) img.filePath = "/";
    const audioData = await fetch(surah.audio.url);
    const audio = await trimAudio(
      audioData.buffer(),
      surah.ayat[0].start, // first ayah start
      surah.ayat[surah.ayat.length - 1].end, // last ayah end
    );

    const slideShow = await createSlideshow(images, audio, {
      ffmpegOptions: this.#ffmpegOptions,
      loopingOptions: {
        loopAudio: "never",
      },
      transitionOptions: {
        transitionDuration: 0,
        useTransitions: false,
      },
      imageOptions: {
        lastImageExtraDuration: 1000,
      },
    });

    return slideShow.buffer;
  }
}

/**
 *  @param {Buffer} buffer - Input audio buffer
 *  @param {number} start - Start time in milliseconds
 *  @param {number} end - End time in milliseconds
 *  @returns {Promise<Buffer>}
 */
function trimAudio(buffer, start, end) {
  return new Promise((res) => {
    const outputBufferStream = new stream.PassThrough();
    const buffers = [];

    outputBufferStream.on("data", (buf) => buffers.push(buf));
    outputBufferStream.on("end", () => res(Buffer.concat(buffers)));

    ffmpeg({ source: stream.Readable.from(buffer, { objectMode: false }) })
      .format("mp3")
      .seek(start / 1000)
      .duration((end + 1000 - start) / 1000)
      .writeToStream(outputBufferStream);
  });
}
