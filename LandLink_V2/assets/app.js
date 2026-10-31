(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const read = (k, d = []) => {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? d;
    } catch {
      return d;
    }
  };
  const money = (n) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(Number(n) || 0);
  const seeds = [
    {
      id: "seed-101",
      title: "500 sqm Residential Lot",
      location: "Matina, Davao City",
      price: 2500000,
      area_sqm: 500,
      listing_kind: "sale",
      land_type: "Residential",
      description:
        "A residential lot in a convenient Davao City location. Contact the owner to confirm boundaries, title documents, and viewing availability.",
      details: {
        legal_status: "Clean title (sample information)",
        title_type: "Transfer Certificate of Title (TCT)",
        payment_reference: "Bank transfer / subject to agreement",
      },
      status: "approved",
      image: "",
      owner_name: "LandLink Demo",
    },
    {
      id: "seed-102",
      title: "2 Hectare Farm Land",
      location: "Calinan, Davao City",
      price: 15000,
      area_sqm: 20000,
      listing_kind: "lease",
      land_type: "Agricultural",
      description:
        "Spacious agricultural property suitable for farming projects. Confirm lease terms and site access with the owner.",
      details: {
        lease_min_duration: "12 months",
        lease_max_duration: "60 months",
        lease_rate: "15000",
        lease_rate_period: "month",
        lease_payment: "Monthly, payable in advance",
        permitted_land_use: "Agriculture",
        tenant_can_build: "Negotiable",
        construction_type: "Temporary structures only",
        security_deposit: "30000",
        advance_lease: "15000",
      },
      status: "approved",
      image: "",
      owner_name: "LandLink Demo",
    },
    {
      id: "seed-103",
      title: "Commercial Lot Along Highway",
      location: "Toril, Davao City",
      price: 40000,
      area_sqm: 300,
      listing_kind: "rent",
      land_type: "Commercial",
      description:
        "Commercial lot along a major road with potential for a business site. Arrange an inspection before making an offer.",
      details: {
        rental_rate_month: "40000",
        rental_period: "Minimum 12 months",
        allowed_uses: "Retail, office, food business",
      },
      status: "approved",
      image: "",
      owner_name: "LandLink Demo",
    },
  ];
  let dbListings = [];
  function listings() {
    const live = dbListings.filter((x) => x.status === "approved");
    return live.length ? live : seeds;
  }
  function mapsLink(x) {
    const raw = String(x.map_url || "").trim();
    if (
      /^https:\/\/(www\.)?(google\.[^/]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(
        raw,
      )
    )
      return raw;
    return (
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(x.location || x.title || "Davao City")
    );
  }
  function mapEmbed(x) {
    const key = window.LANDLINK_CONFIG?.GOOGLE_MAPS_API_KEY || "";
    const query = encodeURIComponent(x.location || x.title || "Davao City");
    return key
      ? "https://www.google.com/maps/embed/v1/place?key=" +
          encodeURIComponent(key) +
          "&q=" +
          query
      : "https://www.google.com/maps?q=" + query + "&output=embed";
  }
  function extraDetails(x) {
    x = { ...x, ...(x.details || {}) };
    const rows = [];
    const add = (label, value) => {
      if (value !== undefined && value !== null && String(value).trim() !== "")
        rows.push(
          `<div><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`,
        );
    };
    if (x.listing_kind === "sale") {
      add("Legal status", x.legal_status);
      add("Title type", x.title_type);
      add("Payment reference", x.payment_reference);
    } else if (x.listing_kind === "lease") {
      add("Minimum lease term", x.lease_min_duration);
      add("Maximum lease term", x.lease_max_duration);
      add(
        "Lease rate",
        x.lease_rate
          ? money(x.lease_rate) + " " + (x.lease_rate_period || "per month")
          : "",
      );
      add("Payment terms", x.lease_payment);
      add("Permitted land use", x.permitted_land_use);
      add("Can tenant build?", x.tenant_can_build);
      add("Construction", x.construction_type);
      add(
        "Security deposit",
        x.security_deposit !== "" && x.security_deposit != null
          ? money(x.security_deposit)
          : "",
      );
      add("Advance lease", x.advance_lease ? money(x.advance_lease) : "");
    } else if (x.listing_kind === "rent") {
      add(
        "Rental rate per month",
        x.rental_rate_month ? money(x.rental_rate_month) : "",
      );
      add("Rental period", x.rental_period);
      add("Allowed uses", x.allowed_uses);
    }
    return rows.length
      ? `<h3>Additional Information</h3><div class="detail-info extra-info">${rows.join("")}</div>`
      : "";
  }
  function imageMarkup(x) {
    const photo = x.image_url || x.image;
    return photo
      ? `<img src="${esc(photo)}" alt="${esc(x.title)} property photo">`
      : `<div class="image-placeholder"><span class="land-art">⌂</span><strong>LandLink Property</strong><small>Photo coming soon</small></div>`;
  }
  function card(x) {
    const kind =
      { sale: "For Sale", lease: "For Lease", rent: "For Rent" }[
        x.listing_kind
      ] || x.listing_kind;
    return `<article class="property-card"><div class="property-image">${imageMarkup(x)}<span class="type-badge">${esc(kind)}</span></div><div class="property-content"><h3>${esc(x.title)}</h3><a class="property-location map-link" href="${esc(mapsLink(x))}" target="_blank" rel="noopener noreferrer" title="Open property location in Google Maps">⌖ ${esc(x.location)} <span>↗</span></a><div class="property-meta">${Number(x.area_sqm || 0).toLocaleString()} sqm · ${esc(x.land_type || "Land")}</div><div class="property-price">${money(x.price)}</div><div class="property-actions"><button class="button outline" data-details="${esc(x.id)}">View Details</button><button class="button" data-inquire="${esc(x.id)}">Inquire</button></div></div></article>`;
  }
  function render() {
    const q = ($("#search-input")?.value || "").trim().toLowerCase(),
      kind = $("#kind-filter")?.value || "",
      land = $("#land-filter")?.value || "";
    const items = listings().filter(
      (x) =>
        (!q ||
          `${x.title} ${x.location} ${x.description}`
            .toLowerCase()
            .includes(q)) &&
        (!kind || x.listing_kind === kind) &&
        (!land || x.land_type === land),
    );
    $("#property-grid").innerHTML = items.map(card).join("");
    $("#result-count").textContent =
      `${items.length} propert${items.length === 1 ? "y" : "ies"}`;
    $("#empty-state").classList.toggle("hidden", items.length > 0);
  }
  function openDetails(id, inquire = false) {
    const x = listings().find((p) => String(p.id) === String(id));
    if (!x) return;
    $("#detail-content").innerHTML =
      `<span class="eyebrow green">PROPERTY DETAILS</span>${x.image_url || x.image ? `<img class="detail-image" src="${esc(x.image_url || x.image)}" alt="${esc(x.title)}">` : `<div class="property-image detail-image">${imageMarkup(x)}</div>`}<span class="type-badge">${esc({ sale: "For Sale", lease: "For Lease", rent: "For Rent" }[x.listing_kind] || x.listing_kind)}</span><h2>${esc(x.title)}</h2><a class="detail-location map-link" href="${esc(mapsLink(x))}" target="_blank" rel="noopener noreferrer">⌖ ${esc(x.location)} · Open in Google Maps ↗</a><div class="detail-price">${money(x.price)}</div><div class="detail-info"><div><small>Land area</small><strong>${Number(x.area_sqm || 0).toLocaleString()} sqm</strong></div><div><small>Land type</small><strong>${esc(x.land_type || "Land")}</strong></div><div><small>Listing type</small><strong>${esc({ sale: "For Sale", lease: "For Lease", rent: "For Rent" }[x.listing_kind] || x.listing_kind)}</strong></div><div><small>Listed by</small><strong>${esc(x.owner_name || "LandLink member")}</strong></div></div>${extraDetails(x)}<h3>Property location</h3><div class="map-frame"><iframe title="Google Map showing ${esc(x.location)}" src="${esc(mapEmbed(x))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div><p class="map-note">Map location is based on the address provided. Use the Google Maps link above to check or correct the exact pin.</p><h3>About this property</h3><p>${esc(x.description || "Contact the listing owner for more information.")}</p><div class="detail-contact"><h3>Interested in this property?</h3><p>Send an inquiry to ask about availability, documents, or a site visit.</p><button class="button full" id="detail-inquire">Send an Inquiry</button><p class="inline-status" id="detail-status" role="status"></p></div>`;
    $("#detail-panel").classList.add("open");
    $("#detail-panel").setAttribute("aria-hidden", "false");
    $("#detail-backdrop").classList.remove("hidden");
    document.body.style.overflow = "hidden";
    $("#detail-inquire").addEventListener("click", async () => {
      // Require login before allowing an inquiry to be submitted
      if (!window.llReady) {
        $("#detail-status").textContent = "Connect Supabase to send inquiries.";
        return;
      }
      const { data: session } = await sb.auth.getUser();
      if (!session?.user) {
        // Redirect to login, then return to the inquiry page after auth
        const returnPath = `inquiry.html?${new URLSearchParams({
          listing_id: x.id,
          listing_title: x.title,
        }).toString()}`;
        localStorage.setItem("landlink_return_after_login", returnPath);
        window.location.href = "login.html";
        return;
      }
      // Already logged in — go straight to the inquiry page
      const params = new URLSearchParams({
        listing_id: x.id,
        listing_title: x.title,
      });
      window.location.href = `inquiry.html?${params.toString()}`;
    });
  }
  function closeDetails() {
    $("#detail-panel").classList.remove("open");
    $("#detail-panel").setAttribute("aria-hidden", "true");
    $("#detail-backdrop").classList.add("hidden");
    document.body.style.overflow = "";
  }
  document.addEventListener("DOMContentLoaded", async () => {
    if (window.llReady) {
      const { data, error } = await sb
        .from("listings")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (!error) dbListings = data || [];
    }
    render();
    $("#search-form").addEventListener("submit", (e) => {
      e.preventDefault();
      render();
      $("#listings").scrollIntoView({ behavior: "smooth" });
    });
    $("#property-grid").addEventListener("click", (e) => {
      const b = e.target.closest("[data-details],[data-inquire]");
      if (b)
        openDetails(
          b.dataset.details || b.dataset.inquire,
          b.hasAttribute("data-inquire"),
        );
    });
    $("#close-details").addEventListener("click", closeDetails);
    $("#detail-backdrop").addEventListener("click", closeDetails);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDetails();
    });
  });
})();
