// contact.js — Contact form saved to Firestore
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';

export function initContact() {
  const submitBtn = document.getElementById('contactSubmit');
  if (!submitBtn) return;

  submitBtn.addEventListener('click', async () => {
    // Grab all inputs from the contact form area
    const inputs   = document.querySelectorAll('.contact-form-side input, .contact-form-side textarea, .contact-form-side select');
    const firstName = inputs[0]?.value.trim();
    const lastName  = inputs[1]?.value.trim();
    const email     = inputs[2]?.value.trim();
    const phone     = inputs[3]?.value.trim();
    // subject / message may be the 4th and 5th fields — grab any remaining textarea
    const subject   = inputs[4]?.value.trim() || '';
    const message   = inputs[5]?.value.trim() || inputs[4]?.value.trim() || '';

    // Basic validation
    if (!firstName || !email || !message) {
      showFeedback(submitBtn, '⚠ Please fill in all required fields.', '#e53935');
      return;
    }

    submitBtn.disabled    = true;
    submitBtn.textContent = 'SENDING…';

    try {
      await addDoc(collection(db, 'contactMessages'), {
        firstName,
        lastName,
        email,
        phone,
        subject,
        message,
        sentAt: serverTimestamp(),
      });

      showFeedback(submitBtn, '✓ MESSAGE SENT!', '#2a7d4f');

      // Clear the form
      inputs.forEach(el => (el.value = ''));

      setTimeout(() => {
        submitBtn.disabled    = false;
        submitBtn.textContent = 'SEND MESSAGE';
        submitBtn.style.background   = '';
        submitBtn.style.borderColor  = '';
        submitBtn.style.color        = '';
      }, 3000);

    } catch (err) {
      console.error('Contact form error:', err);
      showFeedback(submitBtn, '✗ SEND FAILED — TRY AGAIN', '#e53935');
      setTimeout(() => {
        submitBtn.disabled    = false;
        submitBtn.textContent = 'SEND MESSAGE';
        submitBtn.style.background  = '';
        submitBtn.style.borderColor = '';
        submitBtn.style.color       = '';
      }, 3000);
    }
  });
}

function showFeedback(btn, text, color) {
  btn.textContent         = text;
  btn.style.background    = color;
  btn.style.borderColor   = color;
  btn.style.color         = '#fff';
}
