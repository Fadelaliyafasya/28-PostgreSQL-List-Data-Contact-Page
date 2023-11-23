const Pool = require("pg").Pool;

const pool = new Pool({
  user: "postgres",
  password: "2904",
  database: "contact_app",
  host: "localhost",
  port: 5432,
});

module.exports = pool;
