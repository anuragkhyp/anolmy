const fetch = require('node-fetch');
const url = "https://instagram120.p.rapidapi.com/api/instagram/highlights";
const options = {
  method: 'POST',
  headers: {
    'x-rapidapi-key': 'f2a97f0d4fmsh3f12358e8168654p190e98jsn798748b183c4',
    'x-rapidapi-host': 'instagram120.p.rapidapi.com',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ username: "kyliejenner" })
};
fetch(url, options).then(res => res.json()).then(data => console.log(JSON.stringify(data).substring(0, 500))).catch(console.error);
