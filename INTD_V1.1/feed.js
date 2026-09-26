// Sample dataset of your flies (or fetch from your backend/API)
const allFlies = [
  {
    author: "FLY",
    date: "Posted 27 Sept 2026",
    claim: "Seasonal agricultural stubble burning in neighboring states is the primary cause of acute winter 'Severe+' AQI spikes in Delhi.",
    description: "Every November, air pollution in Delhi reaches hazardous levels. While urban transportation and industrial dust maintain a high baseline, satellite tracking proves agricultural fires drive seasonal surges.",
    image: "public/images/delhi-aqi.jpg",
    link: "fly-detail.html?id=1"
  },
  {
    author: "FLY",
    date: "Posted 27 Sept 2026",
    claim: "Citizens for Justice and Peace (CJP) public interest litigation highlights the necessity for strict, verified affidavit standards.",
    description: "CJP engaged in multi-year legal battles following the 2002 Gujarat riots, demonstrating the boundary between legal advocacy and formal rules of evidence.",
    image: "public/images/cjp.jpg",
    link: "fly-detail.html?id=2"
  },
  {
    author: "FLY",
    date: "Posted 27 Sept 2026",
    claim: "The 2008 Non-Prosecution Agreement granted to Jeffrey Epstein illegally bypassed victim rights guaranteed by federal statute.",
    description: "Federal scrutiny over the handling of confidential plea deals brought nationwide attention to prosecutorial transparency.",
    image: null,
    link: "fly-detail.html?id=3"
  },
  {
    author: "FLY",
    date: "Posted 27 Sept 2026",
    claim: "The August 2024 assault and murder of a trainee doctor at RG Kar Medical College exposed systemic institutional failures.",
    description: "Following the crime, nationwide medical strikes erupted across India, prompting the Supreme Court to mandate structural safety standards.",
    image: "public/images/rgkar.jpg",
    link: "fly-detail.html?id=4"
  },
  {
    author: "FLY",
    date: "Posted 25 Sept 2026",
    claim: "Bhavan's Vivekananda Degree College needs to stop locking the gate at 9:30 AM.",
    description: "Every single day, students are sprinting to make it before 9:30 because the gate just shuts. The narrow approach road makes traffic impossible.",
    image: null,
    link: "fly-detail.html?id=5"
  }
];

let currentIndex = 0;
const pageSize = 3; // Load 3 flies initially and per scroll batch
const feedContainer = document.getElementById('feed-container');
const feedEnd = document.getElementById('feed-end');

function renderFlies() {
  if (currentIndex >= allFlies.length) {
    feedEnd.style.display = 'block';
    return;
  }

  const nextBatch = allFlies.slice(currentIndex, currentIndex + pageSize);
  
  nextBatch.forEach(fly => {
    const card = document.createElement('article');
    card.className = 'recent-fly-card';
    
    card.innerHTML = `
      <div class="recent-fly-card-link" style="padding: 24px; display: flex; flex-direction: column; height: 100%;">
        <div class="recent-fly-card-meta">
          <span>${fly.author} • ${fly.date}</span>
        </div>
        <h3><a href="${fly.link}" style="color: inherit; text-decoration: none;">${fly.claim}</a></h3>
        <p>${fly.description}</p>
        ${fly.image ? `<img src="${fly.image}" alt="Case evidence" style="width:100%; border-radius:4px; margin-bottom:16px; object-fit:cover; max-height:300px;">` : ''}
        <div style="margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border);">
          <a href="${fly.link}" class="section-link" style="font-weight: 600;">View Case & Evidence →</a>
        </div>
      </div>
    `;
    
    feedContainer.appendChild(card);
  });

  currentIndex += pageSize;

  if (currentIndex >= allFlies.length) {
    feedEnd.style.display = 'block';
  }
}

// Initial load (Loads first 3)
renderFlies();

// Infinite scroll listener
window.addEventListener('scroll', () => {
  const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200;
  
  if (nearBottom && currentIndex < allFlies.length) {
    // Small artificial delay to simulate smooth network fetching
    setTimeout(() => {
      renderFlies();
    }, 300);
  }
});