// prisma.config.js
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, ".env") });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: "c:/Users/ali59/Desktop/REDC/.env" });
}

console.log("DATABASE_URL from JS config:", process.env.DATABASE_URL ? "RESOLVED" : "UNDEFINED");

module.exports = {
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
