import fs from "fs";
import { log } from "console";
import { initCache } from "./src/modules/cachedFetch.js";
import ImagesGenerator from "./src/modules/imagesGenerator.js";
import VideosGenerator from "./src/modules/videosGenerator.js";
import fetchSurah from "./src/modules/fetchSurah.js";

async function main() {
  initCache(".cache");

  log("starting ...");

  const imagesGenerator = new ImagesGenerator({
    arFont: "64px Arial",
    margin: 64,
    enFont: "32px Arial",
    width: 720,
    height: 1280,
    arMaxWidth: 650,
    enMaxWidth: 400,
    // eslint-disable-next-line max-len
    fontFamilyIndex: 1, // 0: 64px   1: Arial    we want to replace "Arial" with the special font so set it to 1
    quranFontVersion: "v2",
  });

  const generator = new VideosGenerator(imagesGenerator, {
    x264Preset: "ultrafast",
  });

  log("fetching surah data ...");

  const surah = await fetchSurah({
    id: 1, // Al-fatiha
    reciter: 7,
    translator: 131,
    from: 2, // from 2nd ayah
    to: 0, // to the last one
  });

  log("generating video ...");

  const video = await generator.generateFromSurah(surah);

  log("saving file ...");

  fs.writeFileSync("vid.mp4", video);

  log("done");
}
main();
