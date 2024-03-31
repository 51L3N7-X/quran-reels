import fs from "fs";
import { log } from "console";
import { initCache } from "./src/modules/cachedFetch.js";
import ImagesGenerator from "./src/modules/imagesGenerator.js";
import VideosGenerator from "./src/modules/videosGenerator.js";
import fetchSurah from "./src/modules/fetchSurah.js";
import S3 from "./src/modules/putToS3.js";
import toContainer, {
  getPermalink,
  publishContainer,
  uploadStatus,
} from "./src/modules/publishReel.js";

const sleep = (time) =>
  new Promise((r) => {
    setTimeout(r, time);
  });

const instagramAccountId = "17841444522965486";

async function main() {
  try {
    initCache(".cache");

    log("starting ...");

    const imagesGenerator = new ImagesGenerator({
      arFont: "48px Arial",
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
      id: 2, // Al-fatiha
      reciter: 173,
      translator: 131,
      from: 35, // from 2nd ayah
      to: 38, // to the last one
    });

    log("generating video ...");

    const video = await generator.generateFromSurah(surah);

    log("saving file ...");

    fs.writeFileSync("vid.mp4", video);

    const s3 = new S3();

    log("uploading...");
    const { Location: videoURL } = await s3.upload(video);

    const { id: containerId } = await toContainer({
      accessToken: process.env.LONG_TERM_ACCESS_TOKEN,
      instagramAccountId,
      videoURL,
    });

    let status = null;
    const now = Date.now();

    while (status !== "FINISHED") {
      if (Date.now() - now > 2 * 60 * 1000) {
        await s3.clear();
        throw new Error("Upload took longer than 2 minutes.");
      }

      const uploadStatuss = await uploadStatus(
        process.env.LONG_TERM_ACCESS_TOKEN,
        containerId,
      );
      console.log(uploadStatuss);
      status = uploadStatuss.status_code;
      await sleep(3000);
    }

    const { id: creationId } = await publishContainer(
      process.env.LONG_TERM_ACCESS_TOKEN,
      instagramAccountId,
      containerId,
    );

    const { permalink } = await getPermalink(
      process.env.LONG_TERM_ACCESS_TOKEN,
      creationId,
    );

    log(`Reel published successfully : ${permalink}`);

    log("clearing...");

    await s3.clear();

    log("done");
  } catch (e) {
    console.error(e);
    process.exit(2);
  }
}
main();
