const { createCanvas } = require("canvas");
const canvas = createCanvas(200, 200);
const ctx = canvas.getContext("2d");
ctx.fillText("Test", 10, 50);
console.log("Canvas works!");