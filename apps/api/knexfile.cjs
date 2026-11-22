const path = require("node:path");
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
  quiet: true,
});
module.exports = {
  client: "pg",
  connection:
    process.env.MIGRATION_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "postgresql://rms_ai:local_dev_only@127.0.0.1:55432/rms_ai",
  migrations: {
    directory: path.resolve(__dirname, "../../infra/migrations"),
    loadExtensions: [".cjs"],
  },
};
