const fs = require('fs');
const https = require('https');

const url = "https://github.com/googlefonts/cairo/raw/master/fonts/variable/Cairo%5Bslnt,wght%5D.ttf";
const dest = "src/fonts/Cairo-VariableFont.ttf";

https.get(url, (res) => {
  if (res.statusCode === 301 || res.statusCode === 302) {
    https.get(res.headers.location, (res2) => {
      const file = fs.createWriteStream(dest);
      res2.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log("Download complete");
      });
    });
  } else {
    const file = fs.createWriteStream(dest);
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log("Download complete");
    });
  }
}).on('error', (err) => {
  console.error("Error: ", err.message);
});
