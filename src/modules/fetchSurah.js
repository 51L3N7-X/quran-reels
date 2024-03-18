import cachedFetch from "./cachedFetch.js";

const fetch = async (path, params = {}) =>
  (await cachedFetch(`https://api.qurancdn.com/api/${path}`, params)).json();

/**
 * @typedef AudioFile
 * @type {Object}
 * @property {number} size
 * @property {string} format
 * @property {string} url
 * @property {number} duration
 */

/**
 * @typedef QuranText
 * @type {Object}
 * @property {string} v1
 * @property {string} v2
 */

/**
 * @typedef Ayah
 * @type {Object}
 * @property {number} id - Ayah number
 * @property {string} text - Arabic ayah text
 * @property {QuranText} quranText - An array of [wrod, font] pairs
 * @property {number} page - The number of the page that contains this ayah
 * @property {string} translation - English ayah translation text
 * @property {number} start - Ayah start timestamp
 * @property {number} end - Ayah end timestamp
 * @property {[number, number, number][]} words - An array of [index, start, end] collections
 */

/**
 * @typedef SurahData
 * @type {Object}
 * @property {number} id - Surah index
 * @property {AudioFile} audio
 * @property {Ayah[]} ayat
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
export default async function fetchSurah(options) {
  const audioData = (
    await fetch(`qdc/audio/reciters/${options.reciter}/audio_files`, {
      chapter: options.id,
      segments: true,
    })
  ).audio_files[0];

  const verses = [];
  let page = 1;

  while (true) {
    const versesData = await fetch(`v4/verses/by_chapter/${options.id}`, {
      words: true,
      word_fields: ["text_uthmani", "code_v1", "code_v2"],
      translations: options.translator,
      per_page: 50,
      page: page++,
    });
    verses.push(...versesData.verses);
    if (versesData.pagination.next_page === null) break;
  }

  while (options.from <= 0) options.from += verses.length;
  while (options.to <= 0) options.to += verses.length;

  return {
    id: options.id,

    audio: {
      size: audioData.file_size,
      format: audioData.format,
      url: audioData.audio_url,
      duration: audioData.duration,
    },

    ayat: verses
      .filter(
        (v) => v.verse_number >= options.from && v.verse_number <= options.to,
      )
      .map((v) => ({
        //
        id: v.verse_number,
        //
        text: v.words
          .filter((w) => w.char_type_name === "word")
          .map((w) => w.text_uthmani)
          .join(" "),
        quranText: {
          v1: v.words.map((w) => w.code_v1).join(" "),
          v2: v.words.map((w) => w.code_v2).join(" "),
        },
        page: v.words[0].page_number,
        translation: v.translations[0].text.replace(/<.*>/, ""),
        //
        start: audioData.verse_timings[v.verse_number - 1].timestamp_from,
        end: audioData.verse_timings[v.verse_number - 1].timestamp_to,
        //
        words: audioData.verse_timings[v.verse_number - 1].segments
          .filter((s) => s.length > 2)
          .map((s) => [s[0] - 1, s[1], s[2]]),
        //
      })),
  };
}
