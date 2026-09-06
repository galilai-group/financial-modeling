"use strict";
const el = id => document.getElementById(id);
(async () => {
  try {
    const [config, data] = await Promise.all(["challenge.json", "leaderboard.json"].map(async url => {
      const r = await fetch(url, {cache: "no-cache"}); if (!r.ok) throw new Error("Unavailable"); return r.json();
    }));
    document.title = config.title; el("title").textContent = config.title;
    el("description").textContent = config.description;
    const url = config.submit_url ? new URL(config.submit_url) : new URL("/submit", config.service_url);
    if (url.protocol !== "https:" && url.hostname !== "localhost") throw new Error("Invalid service URL");
    url.searchParams.set("challenge", config.slug);
    el("submit").href = url.href; el("submit").hidden = false;
    el("details").textContent = config.accepting_submissions === false ? "Submissions are closed" : config.closes_at ? `Deadline: ${new Date(config.closes_at).toLocaleString()}` : "Open for submissions";
    el("metric").textContent = `${config.metric} ${config.direction === "maximize" ? "↑" : "↓"}`;
    el("policy").textContent = `Best successful submission per participant · Earlier submission wins ties · Evaluation ${data.evaluator_version}`;
    function render() {
      el("rows").replaceChildren();
      const rows = data.rows.filter(row => row.participant.includes(el("search").value.toLowerCase()));
      for (const row of rows) {
        const tr = document.createElement("tr");
        for (const value of [row.rank, row.participant, row.score, new Date(row.submitted_at).toLocaleString()]) {
          const td = document.createElement("td"); td.textContent = String(value); tr.appendChild(td);
        }
        el("rows").appendChild(tr);
      }
      el("status").textContent = rows.length ? "" : (data.rows.length ? "No matching participants." : "No evaluated submissions yet.");
    }
    el("search").addEventListener("input", render); render();
  } catch { el("status").textContent = "Scores are temporarily unavailable. Please reload shortly."; }
})();
