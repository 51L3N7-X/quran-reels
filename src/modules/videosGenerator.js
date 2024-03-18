import stream from "stream";
import ffmpeg from "fluent-ffmpeg";
import { createSlideshow } from "slideshow-video";
import fetch from "./cachedFetch.js";

export default class VideosGenerator {
  /** @type {ImagesGenerator} */
  #imagesGenerator;

  /** @type {import("slideshow-video").FfmpegOptions} */
  #ffmpegOptions;

  /**
   * @param {import("./imagesGenerator.js").default} imagesGenerator
   * @param {number} fontFamilyIndex
   * @param {import("slideshow-video").FfmpegOptions} [ffmpegOptions={}]
   */
  constructor(imagesGenerator, ffmpegOptions) {
    this.#imagesGenerator = imagesGenerator;
    this.#ffmpegOptions = ffmpegOptions;
  }

  /**
   * @param {import("./fetchSurah.js").SurahData} surah
   * @returns {Buffer}
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
          word[0],
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
    );

    images.push({
      buffer: imageBuffer,
      duration: 1,
    });

    // workaround for a bug in slideshow-video input validation
    for (const img of images) img.filePath = process.env._;

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
        lastImageExtraDuration: 0,
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
      .duration((end - start) / 1000)
      .writeToStream(outputBufferStream);
  });
}
