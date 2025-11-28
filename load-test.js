import axios from "axios";

async function run() {
  const batch = [];
  for (let i = 0; i < 1000; i++) {
    batch.push({ value: Math.floor(Math.random() * 100) });
  }

  const res = await axios.post("http://localhost:3000/api/data/ingest", {
    key: "load",
    items: batch,
  });

  console.log("Queued:", res.data);
}

run();
