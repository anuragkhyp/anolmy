import fetch from "node-fetch";

fetch("http://127.0.0.1:3000/api/proxy?url=https://www.w3schools.com/html/mov_bbb.mp4", {
  headers: {
    Range: "bytes=0-100"
  }
}).then(async (res) => {
  console.log(res.status);
  console.log(await res.text());
});
