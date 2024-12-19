import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { Client } = pkg;
const client = new Client({
  user: "postgres",
  host: "localhost",
  database: "sheetflow",
  password: process.env.db_password,
  port: 5432,
});

export default client;
