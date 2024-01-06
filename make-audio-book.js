const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

// Custom sorting function for files
const sortFilesNumerically = (a, b) => {
  const numA = parseInt(a.match(/\d+/), 10);
  const numB = parseInt(b.match(/\d+/), 10);
  return numA - numB;
};

// Function to get the duration of an audio file
const getFileDuration = (file) => {
  return new Promise((resolve, reject) => {
    console.log(`Getting duration for file: ${file}`);
    ffmpeg.ffprobe(file, (err, metadata) => {
      if (err) {
        console.error(`Error getting duration for file ${file}:`, err);
        reject(err);
      } else {
        console.log(
          `Duration for file ${file}: ${metadata.format.duration} seconds`
        );
        resolve(metadata.format.duration);
      }
    });
  });
};

// Function to convert and concatenate audio files with chapters
const createAudiobook = async () => {
  try {
    const inputFolder = ".";
    const outputFile = "output.m4b";
    const tempFolder = "./temp";
    if (!fs.existsSync(tempFolder)) {
      console.log(`Creating temporary folder at ${tempFolder}`);
      fs.mkdirSync(tempFolder);
    }

    let files = fs
      .readdirSync(inputFolder)
      .filter((file) => file.endsWith(".mp3")); // Adjust the extension as needed
    files.sort(sortFilesNumerically); // Sort files numerically
    console.log(
      `Found ${files.length} files to process. Chapters will be in the following order:`
    );
    files.forEach((file) => console.log(file));

    let totalDuration = 0;
    let chapterMetadata = "";
    let intermediateFiles = [];
    let concatFileList = "concat_list.txt";

    for (const file of files) {
      const duration = await getFileDuration(path.join(inputFolder, file));
      const tempFile = path.join(tempFolder, `temp_${file}.m4a`);
      intermediateFiles.push(`file '${tempFile}'`);

      console.log(`Converting file ${file} to intermediate format.`);
      await new Promise((resolve, reject) => {
        ffmpeg(path.join(inputFolder, file))
          .output(tempFile)
          .audioCodec("aac")
          .audioBitrate("192k") // Consistent bitrate
          .on("end", () => {
            console.log(`Conversion complete for file ${file}`);
            resolve();
          })
          .on("error", (err) => {
            console.error(`Error converting file ${file}:`, err);
            reject(err);
          })
          .run();
      });

      chapterMetadata += `;FFMETADATA1\n[CHAPTER]\nTIMEBASE=1/1\nSTART=${Math.floor(
        totalDuration
      )}\nEND=${Math.floor(totalDuration + duration)}\ntitle=${file.replace(
        /\.[^/.]+$/,
        ""
      )}\n`;
      totalDuration += duration;
    }

    console.log(`Writing chapter metadata and file list for concatenation.`);
    fs.writeFileSync(concatFileList, intermediateFiles.join("\n"));
    fs.writeFileSync("metadata.txt", chapterMetadata);

    console.log(`Starting concatenation and final audiobook creation.`);
    ffmpeg()
      .input(concatFileList)
      .inputOptions(["-f concat", "-safe 0"])
      .addInput("metadata.txt")
      .outputOptions(["-map_metadata", "1", "-c copy"])
      .output(outputFile)
      .on("end", () => {
        console.log("Audiobook created successfully!");
        intermediateFiles.forEach((file) =>
          fs.unlinkSync(file.replace("file ", "").replace(/'/g, ""))
        );
        fs.unlinkSync(concatFileList);
        fs.rmdirSync(tempFolder);
      })
      .on("error", (err) => {
        console.error(
          "Error during concatenation and final audiobook creation:",
          err
        );
      })
      .run();
  } catch (error) {
    console.error("Error creating audiobook:", error);
  }
};

// Usage
createAudiobook();
