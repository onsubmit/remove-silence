import fs from "fs";
import path from "path";
import { chunk } from "./chunk";
import AppConfig from "./Config";
import FFmpeg from "./ffmpeg";
import { TimeFrame } from "./TimeFrame";

const appConfig = new AppConfig().validate();

(async (): Promise<void> => {
  const videoDurationInSeconds = await FFmpeg.getVideoDurationInSeconds(appConfig.inputVideoPath);
  const silenceTimestamps = await FFmpeg.getSilenceTimestamps(
    appConfig.inputVideoPath,
    appConfig.noiseTolerance,
    appConfig.minNoiseDurationInSeconds
  );

  if (!silenceTimestamps.length) {
    process.exit(0);
  }

  if (silenceTimestamps.length % 2 !== 0) {
    //
  }

  const silentTimeFrames: TimeFrame[] = chunk(silenceTimestamps, 2).map((c) => {
    return { start: c[0].value, end: c[1].value };
  });

  const clipDirectory = path.join(path.dirname(appConfig.inputVideoPath), "clips");
  const clipListPath = path.join(clipDirectory, "clips.txt");
  const clipListPathStream = fs.createWriteStream(clipListPath, { flags: "w" });

  let counter = 0;
  if (silentTimeFrames[0].start !== 0) {
    await FFmpeg.writeTempClip(
      appConfig.inputVideoPath,
      counter++,
      0,
      silentTimeFrames[0].start + appConfig.bufferAfterInSeconds,
      clipListPathStream
    );
  }

  const { length } = silentTimeFrames;
  for (let i = 0; i < length - 1; i++) {
    await FFmpeg.writeTempClip(
      appConfig.inputVideoPath,
      counter++,
      silentTimeFrames[i].end - appConfig.bufferBeforeInSeconds,
      silentTimeFrames[i + 1].start + appConfig.bufferAfterInSeconds,
      clipListPathStream
    );
  }

  if (silentTimeFrames[length - 1].end < videoDurationInSeconds) {
    await FFmpeg.writeTempClip(
      appConfig.inputVideoPath,
      counter++,
      silentTimeFrames[length - 1].end - appConfig.bufferBeforeInSeconds,
      videoDurationInSeconds,
      clipListPathStream
    );
  }

  clipListPathStream.end();

  await FFmpeg.combineTempClips(appConfig.inputVideoPath, clipListPath);
})();
