import { resolve } from "path";
import ffmpeg from "fluent-ffmpeg";
import { path } from "@ffprobe-installer/ffprobe";

ffmpeg.setFfprobePath(path);

/**
 * @typedef AI_Data
 * @type {Object}
 * @property {string} text
 * @property {string} language
 * @property {Segment[]} segments
 */

/**
 * @typedef Segment
 * @type {Object}
 * @property {number} id
 * @property {number} seek
 * @property {number} start
 * @property {number} end
 * @property {string} text
 * @property {number[]} tokens
 * @property {number} temperature
 * @property {number} avg_logprob
 * @property {number} compression_ratio
 * @property {number} no_speech_prob
 * @property {number} confidence
 * @property {Word[]} words
 */

/**
 * @typedef Word
 * @type {Object}
 * @property {string} text
 * @property {number} start
 * @property {number} end
 * @property {number} confidence
 */

/**
 * @param {import("./fetchSurah.js").SurahData} surah
 * @param {AI_Data} data - Ai generated audio data
 * @param {string} audioFilePath
 * @param {number} [offset=0] - offset wordIndex if data is desynced
 * @returns {Promise<import("./fetchSurah.js").SurahData>}
 */
export default async function processAiData(surah, data, audioFilePath) {
  /** @type {import("./fetchSurah.js").SurahData} */
  const res = {
    id: surah.id,
    audio: await getAudioData(audioFilePath),
    ayat: [],
  };

  const surahText = normalizeArabicText(
    surah.ayat.map((a) => a.text).join(" "),
  );

  // process data segment by segment
  for (const segment of data.segments) {
    // find text in surah
    const target = normalizeArabicText(segment.text);
    const match = matchText(surahText, target);

    // find ayah and word index by matched text
    let ayahIndex = 0;
    let wordIndex = 0;

    while (match.wordIndex > 0)
      match.wordIndex -= normalizeArabicText(
        surah.ayat[ayahIndex++].text,
      ).split(" ").length;

    if (match.wordIndex < 0) {
      ayahIndex -= 1;
      wordIndex +=
        normalizeArabicText(surah.ayat[ayahIndex].text).split(" ").length +
        match.wordIndex;
    }

    let words = [];
    function pushAyah() {
      res.ayat.push({
        ...surah.ayat[ayahIndex++],
        words,
        start: words[0][1], // first word start
        end: words[words.length - 1][2], // last word end
      });
      words = [];
      wordIndex = 0;
    }

    // convert Ai generated timestamps to FetchSurah-like timestamps
    for (const segmentWord of segment.words) {
      // if the segment contains more than 1 ayah
      if (wordIndex + 1 > surah.ayat[ayahIndex].text.split(" ").length)
        pushAyah();

      words.push([
        wordIndex++,
        Math.round(segmentWord.start * 1000),
        Math.round(segmentWord.end * 1000),
      ]);
    }
    pushAyah();
  }

  // DISABLED
  // while it does give correct data
  // VideosGenerator module cannot handle this type of data
  // (mainly talking about stops in the middle of the ayah, they'd cause a desync)
  // disabling this splits the stop into 2 separate ayat
  // (both containing the full text, but different highlight indexes and timestamps)
  // which is something the VideosGenerator module can properly handle
  //
  //
  // // if multiple ayat exist with the same id (ie. an ayah is split into multiple segments), merge them
  // const firstId = res.ayat.sort((a, b) => a.id - b.id)[0].id;
  // const lastId = res.ayat.sort((a, b) => b.id - a.id)[0].id;
  // const finalAyat = [];
  // // find loop over ayat ids
  // for (let i = firstId; i <= lastId; i++) {
  //   // find all ayat with matching id
  //   const ayat = res.ayat.filter((a) => a.id === i);
  //   // merge all their words timestamps
  //   const words = [];
  //   for (const ayah of ayat) words.push(...ayah.words);
  //   words.sort((a, b) => a[0] - b[0]);
  //   // push result
  //   finalAyat.push({
  //     ...ayat[0],
  //     start: words[0][1], // first word start
  //     end: words[words.length - 1][2], // last word end
  //     words,
  //   });
  // }
  // res.ayat = finalAyat;
  //
  return res;
}

const arabicTextNormalizationTable = {
  ءآأإاٱٲٳٵٰ: "ا",
  بٻټڀٮپ: "ب",
  ت: "ت",
  ثٹٺٽٿ: "ث",
  جڃڄچڇڿ: "ج",
  خځڅڂ: "خ",
  دډڍڊ: "د",
  ذڋڈڌڎڏڐۮ: "ذ",
  رڑڒۯڔڕږ: "ر",
  زڗژڙ: "ز",
  سښڛ: "س",
  شڜ: "ش",
  صڝ: "ص",
  ضڞ: "ض",
  طڟ: "ط",
  غڠ: "غ",
  فڡڢڣڤڥڦ: "ف",
  قڧڨ: "ق",
  كػؼکڪګڬڭڮگڰڱڲڳڴ: "ك",
  لڵڶڷڸ: "ل",
  نڹںڻڼڽ: "ن",
  هة: "ه",
  وؤٯٶٷۄۅۆۇۈۉۊۋۏ: "و",
  ىيؠیۍێېۑؽؾؿئٸ: "ي",
  "٠١٢٣٤٥٦٧٨٩ حعظم": null,
};

/**
 * @param {string} str
 * @returns {string}
 */
export function normalizeArabicText(str) {
  return str
    .split("")
    .map((c) =>
      ((p) => (p ? p[1] ?? c : p))(
        Object.entries(arabicTextNormalizationTable).find(([k]) =>
          k.includes(c),
        ),
      ),
    )
    .filter((c) => c)
    .join("")
    .replaceAll(/ +/g, " ")
    .replaceAll(/^ +/g, "")
    .replaceAll(/ +$/g, "");
}

/**
 * @param {string} path
 * @returns {Promise<import("./fetchSurah.js").AudioFile>}
 */
function getAudioData(path) {
  const absPath = resolve(path);
  return new Promise((res, rej) => {
    ffmpeg.ffprobe(absPath, (err, metadata) => {
      if (err) rej(err);
      res({
        size: metadata.format.size ?? 0,
        format: metadata.format.format_name ?? "unknown",
        url: `file://${absPath}`,
        duration: Math.round((metadata.format.duration ?? 0) * 1000),
      });
    });
  });
}

/**
 *  @typedef MatchedTextResult
 *  @type {Object}
 *  @property {number} wordIndex - index by word
 *  @property {number} charIndex - index by charecter
 *  @property {number} accurecy - a number from 0 to 1
 *  @property {string} text - matched string
 */

/**
 * @param {string} source - full original text
 * @param {string} target - target text slice
 * @returns {MatchedTextResult} result
 */
export function matchText(source, target) {
  /** @type {{index: number, score: number}[]} */
  const results = [];

  // split strings into words
  const sw = source.split(" ");
  const tw = target.split(" ");

  // loop over every possible overlab index
  for (let i = 0; i < sw.length - tw.length + 1; i++) {
    let avg = 0;
    let sum = 0;
    const put = (n) => {
      avg = (avg * sum++ + n) / sum;
    };

    // loop over every word
    for (let j = 0; j < tw.length; j++) {
      const ow = sw[j + i];
      const iw = tw[j];
      // compare letter by letter
      for (let n = 0; n < Math.max(ow.length, iw.length); n++)
        put(
          ow[n] === iw[n]
            ? 5 / 5
            : ow[n] === iw[n + 1] || ow[n] === iw[n - 1]
              ? 4 / 5
              : ow[n] === iw[n + 2] || ow[n] === iw[n - 2]
                ? 2 / 5
                : 0 / 5,
        );
    }

    // store result
    results.push({ index: i, score: avg });
  }

  // pick best result based on score
  const best = results.sort((a, b) => b.score - a.score)[0];
  const value = sw.slice(best.index, best.index + tw.length).join(" ");
  return {
    wordIndex: best.index,
    charIndex:
      sw.slice(0, best.index).join(" ").length + Math.min(best.index, 1),
    accurecy: best.score,
    text: value,
  };
}
