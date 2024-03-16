const axios = require("axios");

const fetch = async (path, params = {}) =>
  (
    await axios.get(
      `https://api.qurancdn.com/api/${path}?${Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join("&")}`,
    )
  ).data;

/**
 * @typedef AudioFile
 * @type {Object}
 * @property {number} size
 * @property {string} format
 * @property {string} url
 * @property {number} duration
 */

/**
 * @typedef Ayah
 * @type {Object}
 * @property {number} id - Ayah number
 * @property {string} text - Arabic ayah text
 * @property {string} translation - English ayah translation text
 * @property {number} start - Ayah start timestamp
 * @property {number} end - Ayah end timestamp
 * @property {[number, number, number]} words - An array of [index, start, end] collections
 */

/**
 * @typedef SurahData
 * @type {Object}
 * @property {number} id - Surah index
 * @property {AudioFile} audio
 * @property {Ayah[]} ayahs
 */

/**
 * @param {Object} options
 * @param {number} options.id - Surah number
 * @param {number} options.reciter - Reciter id
 * @param {number} options.translator - Trnaslator id
 * @param {number} options.from - First ayah index (1-indexed, 0 = last)
 * @param {number} options.to - Last ayah index (1-indexed, 0 = last)
 *
 * @returns {SurahData} surahData
 */
module.exports = async function fetchSurah(options) {
  const audioData = (
    await fetch(`qdc/audio/reciters/${options.reciter}/audio_files`, {
      chapter: options.id,
      regments: true,
    })
  ).audio_files[0];

  const verses = [];
  let page = 1;

  while (true) {
    const versesData = await fetch(`v4/verses/by_chapter/${options.id}`, {
      words: true,
      word_fields: ["text_uthmani"],
      translations: options.translator,
      per_page: 50,
      page: page++,
    });
    verses.push(...versesData.verses);
    if (versesData.pagination.next_page === null) break;
  }

  while (options.from <= 0) options.to += verses.length;
  while (options.to <= 0) options.to += verses.length;

  return {
    id: options.id,

    audio: {
      size: audioData.file_size,
      format: audioData.format,
      url: audioData.audio_url,
      duration: audioData.duration,
    },

    ayahs: verses
      .filter(
        (v) => v.verse_number >= options.from && v.verse_number <= options.to,
      )
      .map((v, i) => ({
        //
        id: v.verse_number,
        //
        text: v.words
          .filter((w) => w.char_type_name === "word")
          .map((w) => w.text_uthmani)
          .join(" "),
        translation: v.translations[0].text.replace(/<.*>/, ""),
        //
        start: audioData.verse_timings[i].timestamp_from,
        end: audioData.verse_timings[i].timestamp_to,
        //
        words: audioData.verse_timings[i].segments
          .filter((s) => s.length > 1)
          .map((s) => [s[0] - 1, s[1], s[2]]),
        //
      })),
  };
};
