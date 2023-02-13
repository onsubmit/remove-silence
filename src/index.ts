import fs from "fs";
import path from "path";
import { chunk } from "./chunk";
import AppConfig from "./Config";
import FFmpeg from "./ffmpeg";
import { TimeFrame } from "./TimeFrame";

const appConfig = new AppConfig().validate();

(async (): Promise<void> => {
  const videoDurationInSeconds = await FFmpeg.getVideoDurationInSeconds(appConfig.inputVideoPath);
  console.log(videoDurationInSeconds);

  const silenceTimestamps = await FFmpeg.getSilenceTimestamps(appConfig.inputVideoPath);
  if (!silenceTimestamps.length) {
    process.exit(0);
  }

  if (silenceTimestamps.length % 2 !== 0) {
    //
  }

  const silentTimeFrames: TimeFrame[] = chunk(silenceTimestamps, 2).map((c) => {
    return { start: c[0].value, end: c[1].value };
  });

  console.log(silentTimeFrames);

  const clipDirectory = path.join(path.dirname(appConfig.inputVideoPath), "clips");
  const clipListPath = path.join(clipDirectory, "clips.txt");
  const clipListPathStream = fs.createWriteStream(clipListPath, { flags: "w" });

  let counter = 0;
  if (silentTimeFrames[0].start !== 0) {
    await FFmpeg.writeTempClip(appConfig.inputVideoPath, counter++, 0, silentTimeFrames[0].start, clipListPathStream);
  }

  const { length } = silentTimeFrames;
  for (let i = 0; i < length - 1; i++) {
    await FFmpeg.writeTempClip(
      appConfig.inputVideoPath,
      counter++,
      silentTimeFrames[i].end,
      silentTimeFrames[i + 1].start,
      clipListPathStream
    );
  }

  if (silentTimeFrames[length - 1].end < videoDurationInSeconds) {
    await FFmpeg.writeTempClip(
      appConfig.inputVideoPath,
      counter++,
      silentTimeFrames[length - 1].end,
      videoDurationInSeconds,
      clipListPathStream
    );
  }

  clipListPathStream.end();

  await FFmpeg.combineTempClips(appConfig.inputVideoPath, clipListPath);
})();
