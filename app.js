const REPO = "liubiedi/AI-daily-news-for-cloud-professional-services";
const BRANCH = "main";
const API = `https://api.github.com/repos/${REPO}/contents/news?ref=${BRANCH}`;

const article = document.getElementById("article");
const statusEl = document.getElementById("status");
const dateSelect = document.getElementById("dateSelect");
const archiveList = document.getElementById("archiveList");
const latestBtn = document.getElementById("latestBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const rawLink = document.getElementById("rawLink");
const pager = document.getElementById("pager");
const newerBtn = document.getElementById("newerBtn");
const olderBtn = document.getElementById("olderBtn");

let dates = [];
let currentDate = null;

marked.setOptions({ gfm: true, breaks: false });

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00+08:00");
  return new Intl.DateTimeFormat("en-SG", {
    weekday:"short", day:"2-digit", month:"short", year:"numeric"
  }).format(d);
}

function linkFor(date) {
  const u = new URL(window.location.href);
  u.searchParams.set("date", date);
  return u.toString();
}

async function loadArchive() {
  const r = await fetch(API, { headers: { "Accept": "application/vnd.github+json" } });
  if (!r.ok) throw new Error("Could not load the news archive.");
  const items = await r.json();
  dates = items
    .filter(x => x.type === "file" && /^\d{4}-\d{2}-\d{2}\.md$/.test(x.name))
    .map(x => x.name.replace(".md",""))
    .sort()
    .reverse();

  dateSelect.innerHTML = "";
  archiveList.innerHTML = "";
  for (const d of dates) {
    const opt = document.createElement("option");
    opt.value = d; opt.textContent = formatDate(d);
    dateSelect.appendChild(opt);

    const a = document.createElement("a");
    a.href = `?date=${d}`;
    a.dataset.date = d;
    a.textContent = formatDate(d);
    archiveList.appendChild(a);
  }
}

async function loadEdition(date, pushState = false) {
  if (!dates.includes(date)) date = dates[0];
  currentDate = date;
  statusEl.hidden = false;
  statusEl.textContent = "Loading briefing…";
  article.innerHTML = "";

  const r = await fetch(`./news/${date}.md`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Could not load ${date}.`);
  const md = await r.text();
  const html = DOMPurify.sanitize(marked.parse(md), {
    ADD_ATTR: ["target", "rel"]
  });
  article.innerHTML = html;

  article.querySelectorAll("a").forEach(a => {
    if (a.hostname && a.hostname !== window.location.hostname) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
  });

  dateSelect.value = date;
  archiveList.querySelectorAll("a").forEach(a => a.classList.toggle("active", a.dataset.date === date));
  rawLink.href = `https://github.com/${REPO}/blob/${BRANCH}/news/${date}.md`;

  const i = dates.indexOf(date);
  newerBtn.disabled = i <= 0;
  olderBtn.disabled = i < 0 || i >= dates.length - 1;
  pager.hidden = false;

  document.title = `${formatDate(date)} — Enterprise AI Strategic Brief`;
  if (pushState) history.pushState({date}, "", `?date=${date}`);
  statusEl.hidden = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

dateSelect.addEventListener("change", () => loadEdition(dateSelect.value, true));
latestBtn.addEventListener("click", () => dates[0] && loadEdition(dates[0], true));
copyLinkBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(linkFor(currentDate));
  const old = copyLinkBtn.textContent;
  copyLinkBtn.textContent = "Copied";
  setTimeout(() => copyLinkBtn.textContent = old, 1200);
});
newerBtn.addEventListener("click", () => {
  const i = dates.indexOf(currentDate);
  if (i > 0) loadEdition(dates[i-1], true);
});
olderBtn.addEventListener("click", () => {
  const i = dates.indexOf(currentDate);
  if (i >= 0 && i < dates.length - 1) loadEdition(dates[i+1], true);
});
window.addEventListener("popstate", e => {
  const q = new URLSearchParams(location.search).get("date");
  if (q) loadEdition(q, false);
});

(async () => {
  try {
    await loadArchive();
    const requested = new URLSearchParams(location.search).get("date");
    await loadEdition(requested || dates[0], false);
  } catch (err) {
    statusEl.hidden = false;
    statusEl.textContent = err.message || "Unable to load the briefing.";
  }
})();
