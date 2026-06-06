import { neon } from 'https://cdn.jsdelivr.net/npm/@neondatabase/serverless@1.1.0/+esm';

const connectionString = 'postgresql://neondb_owner:npg_SjMo7p4tWdQV@ep-super-mouse-ab7uyr5w-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(connectionString, { disableWarningInBrowsers: true });

document.addEventListener('DOMContentLoaded', () => {
  // Sticky nav
  const nav = document.getElementById('mainNav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 80);
  });

  // Scroll reveal
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  reveals.forEach(el => observer.observe(el));

  // Mobile Navigation Toggle
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
  }

  // Fetch and display Events
  const eventsGrid = document.getElementById('eventsGrid');
  const loadEvents = async () => {
    const getNextOccurrence = (eventDate, recurringType, recurringDetails) => {
      const start = new Date(eventDate);
      const now = new Date();
      if (now < start) {
        return start;
      }
      if (!recurringType || recurringType === 'None') {
        return start;
      }
      
      let current = new Date(start.getTime());
      const maxSafety = 1000;
      let iterations = 0;
      
      if (recurringType === 'Daily') {
        while (current <= now && iterations < maxSafety) {
          current.setDate(current.getDate() + 1);
          iterations++;
        }
        return current;
      }
      
      if (recurringType === 'Weekly') {
        const allowedDays = (recurringDetails || '').split(', ').map(d => d.trim().toLowerCase());
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        while (current <= now && iterations < maxSafety) {
          current.setDate(current.getDate() + 1);
          const dayName = dayNames[current.getDay()];
          if (allowedDays.includes(dayName)) {
            iterations++;
          }
        }
        return current;
      }
      
      if (recurringType === 'Monthly') {
        const targetDate = parseInt(recurringDetails, 10);
        if (isNaN(targetDate)) return start;
        while (current <= now && iterations < maxSafety) {
          current.setDate(current.getDate() + 1);
          if (current.getDate() === targetDate) {
            iterations++;
          }
        }
        return current;
      }
      
      if (recurringType === 'LastSaturday') {
        while (current <= now && iterations < maxSafety) {
          current.setDate(current.getDate() + 1);
          if (current.getDay() === 6) { // Saturday
            const nextWeek = new Date(current.getTime());
            nextWeek.setDate(nextWeek.getDate() + 7);
            if (nextWeek.getMonth() !== current.getMonth()) {
              iterations++;
            }
          }
        }
        return current;
      }
      
      return start;
    };

    try {
      const events = await sql.query('SELECT * FROM events ORDER BY event_date ASC');
      
      if (events.length === 0) {
        eventsGrid.innerHTML = `
          <div class="no-events">
            <p>No upcoming events scheduled at this time. Please check back soon!</p>
          </div>
        `;
        return;
      }

      eventsGrid.innerHTML = events.map(event => {
        const nextOccurrence = getNextOccurrence(event.event_date, event.recurring_type, event.recurring_details);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const formattedDate = nextOccurrence.toLocaleDateString('en-GB', options);

        return `
          <div class="event-card reveal" style="padding: 0; overflow: hidden; display: flex; flex-direction: column;">
            ${event.image_data ? `
              <div class="event-card-img-container" style="width: 100%; height: 220px; overflow: hidden; border-bottom: 1px solid rgba(139, 26, 26, 0.08);">
                <img src="${event.image_data}" alt="${escapeHTML(event.title)}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease;">
              </div>
            ` : ''}
            <div style="padding: 2.5rem 3rem 3rem;">
              <div class="event-date">📅 ${formattedDate}</div>
              <h3 class="event-title" style="margin-top: 0.5rem;">${escapeHTML(event.title)}</h3>
              <p class="event-desc">${escapeHTML(event.description || '')}</p>
              ${event.location ? `<div class="event-loc">📍 ${escapeHTML(event.location)}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');

      // Add scroll reveal observers to dynamically added cards
      const newReveals = eventsGrid.querySelectorAll('.reveal');
      newReveals.forEach(el => observer.observe(el));

    } catch (err) {
      console.error(err);
      eventsGrid.innerHTML = `
        <div class="no-events">
          <p>Unable to load upcoming events. Please try again later.</p>
        </div>
      `;
    }
  };

  if (eventsGrid) {
    loadEvents();
  }

  // Submit Prayer Request
  const prayerForm = document.getElementById('prayerForm');
  const formMessage = document.getElementById('formMessage');

  if (prayerForm) {
    prayerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = prayerForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      const name = document.getElementById('prayerName').value.trim();
      const phone = document.getElementById('prayerPhone').value.trim();
      const address = document.getElementById('prayerAddress').value.trim();
      const request_text = document.getElementById('prayerText').value.trim();

      try {
        if (!name) {
          throw new Error('Name is required.');
        }
        if (name.length > 50) {
          throw new Error('Name cannot exceed 50 characters.');
        }
        if (!phone) {
          throw new Error('Phone number is required.');
        }
        const ukPhoneRegex = /^\s*(?:\+44|0)\s*(?:(?:\d\s*){9,10})\s*$/;
        if (!ukPhoneRegex.test(phone)) {
          throw new Error('Please enter a valid UK phone number.');
        }
        if (!address) {
          throw new Error('Address is required.');
        }
        if (address.length > 100) {
          throw new Error('Address cannot exceed 100 characters.');
        }
        if (!request_text) {
          throw new Error('Prayer request text is required.');
        }
        if (request_text.length > 1000) {
          throw new Error('Prayer request cannot exceed 1000 characters.');
        }

        await sql.query(
          'INSERT INTO prayer_requests (name, phone, address, request_text) VALUES ($1, $2, $3, $4)',
          [name, phone, address, request_text]
        );

        formMessage.className = 'form-message success';
        formMessage.textContent = 'Thank you. Your prayer request has been received. We will be praying for you.';
        prayerForm.reset();
      } catch (err) {
        console.error(err);
        formMessage.className = 'form-message error';
        formMessage.textContent = `Error: ${err.message}`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Prayer Request';
      }
    });
  }

  // Fetch and display Gallery Images
  const gallerySections = document.getElementById('gallerySections');
  
  window.galleryGroups = {};
  window.expandedSections = {};
  window.currentPages = {};
  window.gallerySectionKeys = [];
  const IMAGES_PER_PAGE = 4;

  window.expandGallerySection = (idx) => {
    const sectionName = window.gallerySectionKeys[idx];
    window.expandedSections[sectionName] = true;
    window.currentPages[sectionName] = 0;
    renderGallery();
  };

  window.collapseGallerySection = (idx) => {
    const sectionName = window.gallerySectionKeys[idx];
    window.expandedSections[sectionName] = false;
    renderGallery();
  };

  window.changeSectionPage = (idx, newPage) => {
    const sectionName = window.gallerySectionKeys[idx];
    window.currentPages[sectionName] = newPage;
    renderGallery();
  };

  const renderGallery = () => {
    if (window.gallerySectionKeys.length === 0) {
      gallerySections.innerHTML = `
        <div class="no-events" style="text-align: center; font-style: italic; color: var(--text-mid); padding: 3rem 0;">
          <p>No gallery images uploaded yet. Check back soon!</p>
        </div>
      `;
      return;
    }

    gallerySections.innerHTML = window.gallerySectionKeys.map((sectionName, idx) => {
      const sectionImages = window.galleryGroups[sectionName];
      const isExpanded = window.expandedSections[sectionName];
      const count = sectionImages.length;

      if (!isExpanded) {
        const img = sectionImages[0];
        return `
          <div class="gallery-section reveal" style="margin-bottom: 4rem;">
            <h3 class="gallery-section-title" style="font-family: 'Cinzel', serif; font-size: 1.5rem; color: var(--crimson-deep); margin-bottom: 1.5rem; border-bottom: 1px solid rgba(212,175,55,0.2); padding-bottom: 0.5rem; font-weight: 700; display: flex; justify-content: space-between; align-items: center;">
              <span>✦ ${escapeHTML(sectionName)}</span>
              <span style="font-size: 0.85rem; color: var(--gold); font-family: 'Outfit', sans-serif;">${count} Image${count > 1 ? 's' : ''}</span>
            </h3>
            <div style="max-width: 380px; margin: 0 auto;">
              <div class="gallery-item-card" onclick="expandGallerySection(${idx})" style="position: relative; overflow: hidden; border: 1px solid rgba(212,175,55,0.25); background: var(--warm-white); padding: 0.6rem; border-radius: 4px; box-shadow: var(--shadow-sm); cursor: pointer; transition: var(--transition);">
                <div style="width: 100%; height: 260px; overflow: hidden; border-radius: 2px; position: relative;">
                  <img src="${img.image_data}" alt="Gallery Cover" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease;">
                  ${count > 1 ? `
                    <div style="position: absolute; inset: 0; background: rgba(74, 14, 14, 0.45); display: flex; align-items: center; justify-content: center; color: var(--gold-light); font-family: 'Cinzel', serif; font-size: 1.25rem; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                      +${count - 1} More Image${count > 2 ? 's' : ''}
                    </div>
                  ` : ''}
                </div>
                <div style="text-align: center; margin-top: 0.8rem; font-family: 'Cinzel', serif; font-size: 0.8rem; letter-spacing: 0.1em; color: var(--crimson); font-weight: 600;">
                  ${count > 1 ? 'Click to View Gallery' : 'Click to View'}
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        const page = window.currentPages[sectionName] || 0;
        const startIdx = page * IMAGES_PER_PAGE;
        const endIdx = startIdx + IMAGES_PER_PAGE;
        const pageImages = sectionImages.slice(startIdx, endIdx);
        const totalPages = Math.ceil(sectionImages.length / IMAGES_PER_PAGE);

        return `
          <div class="gallery-section reveal" style="margin-bottom: 4rem;">
            <h3 class="gallery-section-title" style="font-family: 'Cinzel', serif; font-size: 1.5rem; color: var(--crimson-deep); margin-bottom: 1.5rem; border-bottom: 1px solid rgba(212,175,55,0.2); padding-bottom: 0.5rem; font-weight: 700; display: flex; justify-content: space-between; align-items: center;">
              <span>✦ ${escapeHTML(sectionName)}</span>
              <button onclick="collapseGallerySection(${idx})" style="background: none; border: 1px solid var(--crimson); color: var(--crimson); padding: 0.3rem 0.8rem; font-family: 'Cinzel', serif; font-size: 0.75rem; cursor: pointer; transition: all 0.3s; border-radius: 2px;">
                Back to Cover
              </button>
            </h3>
            <div class="gallery-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
              ${pageImages.map(img => `
                <div class="gallery-item-card" style="position: relative; overflow: hidden; border: 1px solid rgba(212,175,55,0.2); background: var(--warm-white); padding: 0.6rem; border-radius: 4px; box-shadow: var(--shadow-sm); transition: var(--transition);">
                  <div style="width: 100%; height: 200px; overflow: hidden; border-radius: 2px;">
                    <img src="${img.image_data}" alt="Gallery Image" style="width: 100%; height: 100%; object-fit: cover;">
                  </div>
                </div>
              `).join('')}
            </div>
            
            ${totalPages > 1 ? `
              <div style="display: flex; justify-content: center; align-items: center; gap: 1.5rem; margin-top: 1rem; font-family: 'Cinzel', serif; font-size: 0.85rem;">
                <button onclick="changeSectionPage(${idx}, ${page - 1})" ${page === 0 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : 'style="background: none; border: 1px solid var(--gold); color: var(--crimson-deep); padding: 0.4rem 1rem; cursor: pointer; font-weight: 600;"'}>
                  &larr; Prev
                </button>
                <span style="color: var(--text-mid); font-weight: 600;">Page ${page + 1} of ${totalPages}</span>
                <button onclick="changeSectionPage(${idx}, ${page + 1})" ${page >= totalPages - 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : 'style="background: none; border: 1px solid var(--gold); color: var(--crimson-deep); padding: 0.4rem 1rem; cursor: pointer; font-weight: 600;"'}>
                  Next &rarr;
                </button>
              </div>
            ` : ''}
          </div>
        `;
      }
    }).join('');
    
    // Trigger scroll reveal
    const reveals = gallerySections.querySelectorAll('.reveal');
    reveals.forEach(el => observer.observe(el));
  };

  const loadGallery = async () => {
    try {
      const images = await sql.query('SELECT * FROM gallery_images ORDER BY created_at DESC');
      
      window.galleryGroups = {};
      window.gallerySectionKeys = [];
      
      images.forEach(img => {
        if (!window.galleryGroups[img.section_name]) {
          window.galleryGroups[img.section_name] = [];
          window.gallerySectionKeys.push(img.section_name);
        }
        window.galleryGroups[img.section_name].push(img);
      });
      
      renderGallery();
    } catch (err) {
      console.error(err);
      gallerySections.innerHTML = `
        <div class="no-events" style="text-align: center; color: red; padding: 3rem 0;">
          <p>Failed to load gallery images.</p>
        </div>
      `;
    }
  };

  if (gallerySections) {
    loadGallery();
  }
});

// Helper function to prevent XSS
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
