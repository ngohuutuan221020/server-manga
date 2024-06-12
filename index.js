const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Express on Vercel"));

app.get("/api", (req, res) => {
  res.json({
    success: true,
    data: [
      {
        name: "Tuan",
        age: 24,
      },
    ],
  });
});

app.listen(3000, () => console.log("Server ready on port 3000."));
