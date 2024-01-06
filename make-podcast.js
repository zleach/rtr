const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const xml2js = require("xml2js");

// Function to get the duration of an audio file
const getFileDuration = (file) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, metadata) => {
      if (err) {
        console.error(`Error getting duration for file ${file}:`, err);
        reject(err);
      } else {
        resolve(metadata.format.duration);
      }
    });
  });
};

// Function to format duration in HH:MM:SS
const formatDuration = (duration) => {
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);
  return [hours, minutes, seconds].map((v) => (v < 10 ? "0" + v : v)).join(":");
};

// Function to read episode description from a text file
const getEpisodeDescription = (filePath) => {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, "utf8");
  }
  return ""; // Return an empty string if the description file does not exist
};

// Function to create podcast XML
const createPodcastXML = async () => {
  try {
    const inputFolder = ".";
    const podcastTitle = "Your Podcast Title"; // Change this to your podcast title
    const podcastDescription = "Description of your podcast."; // Change this to your podcast description
    const podcastLink = "http://yourpodcastlink.com"; // Change this to your podcast link
    const podcastImageUrl = "http://linktoyourpodcastimage.jpg"; // Change this to your podcast image URL

    let files = fs
      .readdirSync(inputFolder)
      .filter((file) => file.endsWith(".mp3")); // Adjust the extension as needed
    files.sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );

    let episodes = [];

    for (let file of files) {
      const filePath = path.join(inputFolder, file);
      const fileSize = fs.statSync(filePath).size;
      const duration = await getFileDuration(filePath);
      const formattedDuration = formatDuration(duration);
      const episodeTitle = file.replace(/\.[^/.]+$/, ""); // Use filename as title
      const encodedFileName = encodeURIComponent(file);
      const episodeUrl = `https://github.com/zleach/rtr/raw/main/${encodedFileName}`; // URL for each episode

      const descriptionFilePath = path.join(inputFolder, episodeTitle + ".txt");
      const episodeDescription = getEpisodeDescription(descriptionFilePath);

      const pubDate = new Date(); // Just a placeholder, modify as needed

      episodes.push({
        item: {
          title: episodeTitle,
          "itunes:title": episodeTitle,
          "itunes:episode": episodes.length + 1,
          description: {
            $: {
              type: "html",
            },
            _: `<![CDATA[${episodeDescription}]]>`,
          },
          enclosure: {
            $: {
              url: episodeUrl,
              length: fileSize.toString(),
              type: "audio/mpeg",
            },
          },
          guid: episodeUrl,
          pubDate: pubDate.toUTCString(),
          "itunes:duration": formattedDuration,
        },
      });
    }

    const podcast = {
      rss: {
        $: {
          "xmlns:itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd",
          version: "2.0",
        },
        channel: [
          {
            title: podcastTitle,
            "itunes:title": podcastTitle,
            description: podcastDescription,
            link: podcastLink,
            "itunes:image": {
              $: {
                href: podcastImageUrl,
              },
            },
            item: episodes,
          },
        ],
      },
    };

    const builder = new xml2js.Builder();
    const xml = builder.buildObject(podcast);

    fs.writeFileSync("podcast.xml", xml);
    console.log("Podcast XML created successfully!");
  } catch (error) {
    console.error("Error creating podcast XML:", error);
  }
};

// Usage
createPodcastXML();
