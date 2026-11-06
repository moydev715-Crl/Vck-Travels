const DATA_URL = "travel_recommendation_api.json";
const FALLBACK_IMAGE = "logo-agencia-viajes.png";

const CATEGORY_KEYWORDS = {
    beaches: ["beach", "beaches"],
    temples: ["temple", "temples"],
    countries: ["country", "countries"]
};

let travelData = null;

function normalize(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

async function loadData() {
    if (travelData) {
        return travelData;
    }

    const response = await fetch(DATA_URL);

    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }

    travelData = await response.json();
    return travelData;
}

function findResults(data, keyword, rawKeyword) {
    const countries = data.countries ?? [];
    const temples = data.temples ?? [];
    const beaches = data.beaches ?? [];

    if (CATEGORY_KEYWORDS.beaches.includes(keyword)) {
        return {
            title: "Beaches", items: beaches
        };
    }

    if (CATEGORY_KEYWORDS.temples.includes(keyword)) {
        return {
            title: "Temples", items: temples
        };
    }

    if (CATEGORY_KEYWORDS.countries.includes(keyword)) {
        return {
            title: "Countries",
            items: countries.flatMap((country) => country.cities)
        };
    }

    // 2. Búsqueda libre por nombre de ciudad, país o lugar
    const matches = [];

    countries.forEach((country) => {
        const countryMatches = normalize(country.name).includes(keyword);

        country.cities.forEach((city) => {
            if (countryMatches || normalize(city.name).includes(keyword)) {
                matches.push(city);
            }
        });
    });

    [...temples, ...beaches].forEach((place) => {
        if (normalize(place.name).includes(keyword)) {
            matches.push(place);
        }
    });

    const unique = [...new Map(matches.map((place) => [place.name, place])).values()];

    return { title: `Results for "${rawKeyword}"`, items: unique };
}

function getResultsSection() {
    let section = document.getElementById("results");

    if (!section) {
        section = document.createElement("section");
        section.id = "results";
        section.className = "results-section";
        section.setAttribute("aria-live", "polite");
        document.querySelector("header").after(section);
    }

    return section;
}

function createPlaceCard(place) {
    const card = document.createElement("article");
    card.className = "place-card";

    const img = document.createElement("img");
    img.alt = place.name;
    img.loading = "lazy";
    img.addEventListener("error", () => {
            img.src = FALLBACK_IMAGE;
            img.classList.add("img-fallback");
        },
        { once: true }
    );
    img.src = place.imageUrl;

    const body = document.createElement("div");
    body.className = "place-info";

    const name = document.createElement("h3");
    name.textContent = place.name;

    const description = document.createElement("p");
    description.textContent = place.description;

    body.append(name, description);
    card.append(img, body);

    return card;
}

function renderResults(title, items) {
    const section = getResultsSection();
    section.replaceChildren();

    const heading = document.createElement("h2");
    heading.className = "results-title";
    heading.textContent = title;
    section.append(heading);

    if (items.length === 0) {
        const message = document.createElement("p");
        message.className = "results-message";
        message.textContent = "No destinations found. Try beach, temple, country or a city name.";
        section.append(message);

    } else {
        const grid = document.createElement("div");
        grid.className = "results-grid";
        items.forEach((place) => grid.append(createPlaceCard(place)));
        section.append(grid);
    }

    section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showMessage(text) {
    const section = getResultsSection();
    section.replaceChildren();

    const message = document.createElement("p");
    message.className = "results-message";
    message.textContent = text;
    section.append(message);

}
function toggleContactForm(show) {
    const form = document.querySelector(".card-form");

    if (form) {
        form.hidden = !show;
    }
}

async function search() {
    const input = document.getElementById("searchIn");
    const rawKeyword = input.value.trim();
    const keyword = normalize(rawKeyword);

    if (!keyword) {
        showMessage("Please enter a keyword such as beach, temple or country.");
        return;
    }

    toggleContactForm(false); 

    try {
        const data = await loadData();
        const { title, items } = findResults(data, keyword, rawKeyword);
        renderResults(title, items);

    } catch (error) {
        console.error("Could not load the travel data:", error);
        showMessage("We couldn't load the destinations. Please try again later.");

    }
}

function clearSearch() {
    const input = document.getElementById("searchIn");
    input.value = "";
    document.getElementById("results")?.remove();
    toggleContactForm(true);
    input.focus();
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("searchIn")?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            search();
        }
    });
});