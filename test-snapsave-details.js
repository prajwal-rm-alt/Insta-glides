import { snapsave } from "snapsave-media-downloader";

async function run() {
  try {
    const res = await snapsave("https://www.instagram.com/reel/DawpSrFJOjL/?igsh=ZDg4M2oycG9lbDdo");
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
