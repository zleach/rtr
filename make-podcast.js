const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

// Function to sort files numerically based on chapter number
const sortFilesNumerically = (a, b) => {
  const numA = parseInt(a.match(/\d+/), 10);
  const numB = parseInt(b.match(/\d+/), 10);
  return numA - numB;
};

// Function to get the duration of an audio file
const getFileDuration = (file) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, metadata) => {
      if (err) {
        console.error(`Error getting duration for file ${file}:`, err);
        reject(err);
      } else {
        const durationSec = metadata.format.duration;
        const hours = Math.floor(durationSec / 3600);
        const minutes = Math.floor((durationSec % 3600) / 60);
        const seconds = Math.floor(durationSec % 60);
        const formattedDuration = `${hours
          .toString()
          .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`;
        resolve(formattedDuration);
      }
    });
  });
};

// Function to create XML for podcast episodes
const createPodcastXML = async () => {
  const inputFolder = ".";
  const files = fs
    .readdirSync(inputFolder)
    .filter((file) => file.endsWith(".mp3"));
  files.sort(sortFilesNumerically); // Sort files numerically

  let podcastItems = "";

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const chapterNumber = index + 1;
    const episodeTitle = `Chapter ${chapterNumber}`;
    const pubDate = new Date(); // Placeholder date, you can adjust
    pubDate.setDate(pubDate.getDate() + chapterNumber); // Increment date for each chapter
    const duration = await getFileDuration(path.join(inputFolder, file));

    podcastItems += `
    <item>
        <title><![CDATA[${episodeTitle}]]></title>
        <description><![CDATA[${episodeTitle}]]></description>
        <pubDate>${pubDate.toUTCString()}</pubDate>
        <link>https://zachleach.substack.com/episode${chapterNumber}</link>
        <guid isPermaLink="false">episode${chapterNumber}@zachleach.substack.com</guid>
        <enclosure url="https://zachleach.substack.com/audio/episode${chapterNumber}.mp3" type="audio/mpeg" length="12345678"/> <!-- Adjust length -->
        <itunes:duration>${duration}</itunes:duration>
        <itunes:explicit>yes</itunes:explicit>
        <itunes:episode>${chapterNumber}</itunes:episode>
        <itunes:season>1</itunes:season>
    </item>`;
  }

  const podcastXML = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <!-- Existing channel elements here -->
    ${podcastItems}
  </channel>
</rss>`;

  fs.writeFileSync("podcast.xml", podcastXML);
  console.log("Podcast XML file created successfully.");
};

// Usage
createPodcastXML();
