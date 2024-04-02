import cliProgress from "cli-progress";
import colors from "ansi-colors";
import formatBytes from "./formatBytes.js";

const downloadProgressBar = (text) => {
  const downloadProgress = new cliProgress.SingleBar({
    // eslint-disable-next-line max-len
    format: `${text} | ${colors.cyan("{bar}")} | {percentage}% || {loaded}/{all} MB || Speed: {speed}`,
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true,
  });

  return (progress) => {
    if (progress.total) {
      downloadProgress.start(progress.total, progress.loaded, {
        speed: `${formatBytes(progress.rate, 1)}KB/s` || "N/A",
        loaded: formatBytes(progress.loaded, 2) || "??",
        all: formatBytes(progress.total, 2) || "??",
      });
      downloadProgress.update(progress.loaded, {
        speed: `${formatBytes(progress.rate) || "??"}KB/S`,
        loaded: formatBytes(progress.loaded) || "??",
        all: formatBytes(progress.total) || "??",
      });
    }
  };
};

export default downloadProgressBar;
