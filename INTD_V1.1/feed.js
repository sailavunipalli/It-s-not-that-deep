// Sample dataset of flies for the home feed
const allFlies = [
  {
    id: "1",
    author: "FLY",
    date: "Posted 27 Sept 2026",
    claim: "Seasonal agricultural stubble burning in neighboring states is the primary cause of acute winter 'Severe+' AQI spikes in Delhi.",
    description: "Every November, air pollution in Delhi reaches hazardous levels. While urban transportation and industrial dust maintain a high baseline, satellite tracking proves agricultural fires drive seasonal surges.",
    image: "public/images/delhi-aqi.jpg",
    link: "fly.html?id=1"
  },
  {
    id: "2",
    author: "FLY",
    date: "Posted 27 Sept 2026",
    claim: "Citizens for Justice and Peace (CJP) public interest litigation highlights the necessity for strict, verified affidavit standards.",
    description: "CJP engaged in multi-year legal battles following the 2002 Gujarat riots, demonstrating the boundary between legal advocacy and formal rules of evidence.",
    image: "public/images/cjp.jpg",
    link: "fly.html?id=2"
  },
  {
    id: "3",
    author: "FLY",
    date: "Posted 27 Sept 2026",
    claim: "The 2008 Non-Prosecution Agreement granted to Jeffrey Epstein illegally bypassed victim rights guaranteed by federal statute.",
    description: "Federal scrutiny over the handling of confidential plea deals brought nationwide attention to prosecutorial transparency.",
    image: null,
    link: "fly.html?id=3"
  },
  {
    id: "4",
    author: "FLY",
    date: "Posted 27 Sept 2026",
    claim: "The August 2024 assault and murder of a trainee doctor at RG Kar Medical College exposed systemic institutional failures.",
    description: "Following the crime, nationwide medical strikes erupted across India, prompting the Supreme Court to mandate structural safety standards.",
    image: "public/images/rgkar.jpg",
    link: "fly.html?id=4"
  },
  {
    id: "5",
    author: "FLY",
    date: "Posted 25 Sept 2026",
    claim: "Bhavan's Vivekananda Degree College needs to stop locking the gate at 9:30 AM.",
    description: "Every single day, students are sprinting to make it before 9:30 because the gate shuts. The narrow approach road makes traffic impossible.",
    image: null,
    link: "fly.html?id=5"
  }
];

let currentIndex = 0;
const pageSize = 3;
const feedContainer = document.getElementById('feed-container');
const feedEnd = document.getElementById('feed-end');

function renderFlies() {
  if (!feedContainer) return;

  if (currentIndex >= allFlies.length) {
    if (feedEnd) feedEnd.style.display = 'block';
    return;
  }

  const nextBatch = allFlies.slice(currentIndex, currentIndex + pageSize);
  
  nextBatch.forEach(fly => {
    const card = document.createElement('article');
    card.className = 'feed-card';
    
    const imageHtml = fly.image 
      ? `<div class="feed-card-image"><img src="${fly.image}" alt="Case evidence: ${fly.claim}" loading="lazy" /></div>` 
      : '';

    card.innerHTML = `
      <a href="${fly.link}" class="feed-card-link">
        ${imageHtml}
        <div class="feed-card-content">
          <div class="feed-card-meta">
            <span>${fly.author}</span> • <span>${fly.date}</span>
          </div>
          <h2 class="feed-card-claim">${fly.claim}</h2>
          <p class="feed-card-description">${fly.description}</p>
          <span class="feed-card-read">View Case & Evidence →</span>
        </div>
      </a>
    `;
    
    feedContainer.appendChild(card);
  });

  currentIndex += pageSize;

  if (currentIndex >= allFlies.length && feedEnd) {
    feedEnd.style.display = 'block';
  }
}

// Initial load
renderFlies();

// Infinite scroll listener
window.addEventListener('scroll', () => {
  const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200;
  if (nearBottom && currentIndex < allFlies.length) {
    setTimeout(() => { renderFlies(); }, 300);
  }
});