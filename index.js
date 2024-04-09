/* eslint-disable indent */
import inquirer from "inquirer";
import gradient from "gradient-string";
import chalk from "chalk";
import fs from "fs";
import ora from "ora";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import yaml from "yaml";
import processAiData from "./src/modules/AiDataProcessor.js";
import fetchSurah from "./src/modules/fetchSurah.js";
import ImagesGenerator from "./src/modules/imagesGenerator.js";
import VideosGenerator from "./src/modules/videosGenerator.js";
import { initCache } from "./src/modules/cachedFetch.js";
import S3 from "./src/modules/putToS3.js";
import Reel from "./src/modules/publishReel.js";

const settings = yaml.parse(fs.readFileSync("./settings.yaml", "utf8"));

function choices() {
  return inquirer.prompt({
    type: "list",
    name: "choice",
    message: "Choose what to do?",
    choices: [
      "Create and upload video from API (quran.com)",
      "Create and upload video from AI data",
      "Upload exist video (preview.mp4)",
    ],
  });
}

async function main() {
  greeting();
  initCache(".cache");

  const answer = await choices();
  if (answer.choice === "Create and upload video from AI data") {
    const video = await AIChose();

    console.log(
      gradient.passion("Preview video:"),
      chalk.blueBright(
        pathToFileURL(
          fileURLToPath(join(dirname(import.meta.url), "preview.mp4")),
        ),
      ),
    );

    const publishAnswer = await inquirer.prompt({
      type: "confirm",
      message: "Publish Video?",
      name: "confirm",
    });

    if (publishAnswer.confirm) {
      await publish(video);
    }
  } else if (answer.choice === "Create and upload video from API (quran.com)") {
    const video = await APIChose();

    console.log(
      gradient.passion("Preview video:"),
      chalk.blueBright(
        pathToFileURL(
          fileURLToPath(join(dirname(import.meta.url), "preview.mp4")),
        ),
      ),
    );

    const publishAnswer = await inquirer.prompt({
      type: "confirm",
      message: "Publish Video?",
      name: "confirm",
    });

    if (publishAnswer.confirm) {
      await publish(video);
    }
  } else {
    await publish(fs.readFileSync("preview.mp4"));
  }
}

main();

function greeting() {
  console.log(
    gradient.retro.multiline(`
     ...    *    .   _  .   
*  .  *     .   * (_)   *
  .      |*  ..   *   ..
   .  * \\|  *  ___  . . *
*   \\/   |/ \\/{o,o}     .
  _\\_\\   |  / /)  )* _/_ *
      \\ \\| /,--"-"---  ..
_-----\`  |(,__,__/__/_ .
       \\ ||      ..
        ||| .            *
        |||
        |||
  , -=-~' .-^- _
  `),
  );
  console.log(
    `\x1b[1m\n${gradient.instagram("  WELCOME TO QURAN-REELS")}\n\n\x1b[22m`,
  );
}

async function AIChose() {
  const answers = await questions("AI");

  const imagesGenerator = new ImagesGenerator({
    ...settings.image,
    ...answers,
  });

  const surahSpinner = await ora(
    gradient.cristal("Getting Surah data"),
  ).start();

  const surahData = await fetchSurah({
    ...settings.fetch,
    ...answers,
  });

  await surahSpinner.stop();

  const surah = await processAiData(
    surahData,
    JSON.parse(fs.readFileSync("./data/data.json")),
    "./video.mp3",
  );

  const generator = new VideosGenerator(
    imagesGenerator,
    {
      x264Preset: "ultrafast",
    },
    answers.highlightWords || settings.video.highlightWords,
  );

  console.log(gradient.morning("Video processing"));

  const videoData = await generator.generateFromSurah(surah);

  fs.writeFileSync("preview.mp4", videoData);

  return videoData;
}

async function APIChose() {
  const answers = await questions("API");

  const imagesGenerator = new ImagesGenerator({
    ...settings.image,
    ...answers,
  });

  const surahSpinner = await ora(
    gradient.cristal("Getting Surah data"),
  ).start();

  const surahData = await fetchSurah({
    ...settings.fetch,
    ...answers,
  });

  await surahSpinner.stop();

  const generator = new VideosGenerator(
    imagesGenerator,
    {
      x264Preset: "ultrafast",
    },
    answers.highlightWords || settings.video.highlightWords,
  );

  console.log(gradient.morning("Video processing"));

  const videoData = await generator.generateFromSurah(surahData);

  fs.writeFileSync("preview.mp4", videoData);

  return videoData;
}

async function publish(video) {
  const s3 = new S3({
    accessId: process.env.AWS_ACCESS_KEY_ID,
    secret: process.env.AWS_SECRET_ACCESS_KEY,
    region: "eu-north-1",
  });

  const { caption } = await inquirer.prompt({
    type: "input",
    default: null,
    message: "What is the Reel caption?",
    name: "caption",
  });

  const uploadingSpinner = ora(gradient.rainbow("Uploading Video")).start();

  const { Location: videoURL } = await s3.upload(video);

  uploadingSpinner.stopAndPersist();

  const publishSpinner = ora(
    gradient.instagram("Publishing Video to Instagram"),
  ).start();

  const reel = new Reel({
    accessToken: process.env.LONG_TERM_ACCESS_TOKEN,
    instagramAccountId: process.env.INSTAGRAM_ACCOUNT_ID,
  });

  const reelURL = await reel.post({
    videoURL,
    ...(caption ? { caption } : {}),
  });

  publishSpinner.stop();

  console.log(gradient.retro(`Published successfully: ${reelURL}`));
}

async function questions(type) {
  const validate = (value) => {
    if (!+value) return "Please enter a valid number";
    return true;
  };
  let answers = await inquirer.prompt([
    {
      type: "input",
      name: "id",
      message: "What is the number of Surah (1-114)?",
      validate(value) {
        if (!+value || value > 114 || value <= 0)
          return "Please enter a valid number";
        return true;
      },
    },
    ...(type === "API"
      ? [
          {
            type: "input",
            name: "reciter",
            message: "What is the reciter id?",
            default: settings.fetch.reciter,
          },
        ]
      : []),
    {
      type: "input",
      name: "translator",
      message: "What is the translator id?",
      default: settings.fetch.translator,
    },
    {
      type: "input",
      name: "from",
      message: "From which Ayah does the data begin?",
      validate,
    },
    {
      type: "input",
      name: "to",
      message: "What Ayah does the data end with?",
      validate,
    },
    {
      type: "input",
      name: "background",
      message: "What is the background color? (#<hex number only>)",
      default: "#000000",
      validate(value) {
        const regex = /^#[0-9A-Fa-f]{6}$/i; // Regex for valid hex color code
        if (!regex.test(value)) {
          return "Please enter a valid hex color code (e.g., #FFFFFF)";
        }
        return true;
      },
    },
    {
      type: "confirm",
      message: "Want to add highlight?",
      name: "highlightWords",
    },
  ]);

  if (answers.highlightWords) {
    const plusQues = await inquirer.prompt({
      type: "input",
      message: "What is the color of highlight text?",
      default: "#ffaa55",
      name: "highlightColor",
      validate(value) {
        const regex = /^#[0-9A-Fa-f]{6}$/i; // Regex for valid hex color code
        if (!regex.test(value)) {
          return "Please enter a valid hex color code (e.g., #FFFFFF)";
        }
        return true;
      },
    });
    answers = { ...answers, ...plusQues };
  }

  const additionalQues = await inquirer.prompt([
    {
      type: "confirm",
      message: "Add Surah name?",
      name: "surahNameEnabled",
    },
  ]);

  return { ...answers, ...additionalQues };
}
