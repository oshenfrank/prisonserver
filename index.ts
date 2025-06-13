import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import searchRoute from "./search";

const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/api", searchRoute);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
