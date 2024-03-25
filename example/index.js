const postcss = require("postcss");
const fs = require("fs");
const path = require("path");
const postcssPxToViewport = require('../dist/index')




const css = fs.readFileSync(path.resolve(__dirname, "./index.css"), "utf8");



const customUnit = {
  name: "nx", //单位名称
  
};

const pxToViewportOpts = {
  landscape: true,
  customUnit: customUnit,
};

const processedCss = postcss(postcssPxToViewport(pxToViewportOpts)).process(
  css,
  {
    from: path.resolve(__dirname, "./index.css"),
  }
).css;

fs.writeFile(
  path.resolve(__dirname, "./index-viewport.css"),
  processedCss,
  function (err) {
    if (err) {
      throw err;
    }
    console.log("File with viewport units written.");
  }
);


