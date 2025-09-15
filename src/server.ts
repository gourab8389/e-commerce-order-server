import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || "3002";

const app = express();

app.use(cors());

app.get("/", () => {
  console.log("Server is running");
});

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
