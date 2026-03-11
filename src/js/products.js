
export function initProducts() {
  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('mousedown', function() {
      this.style.transform = 'scale(0.985)';
    });
    card.addEventListener('mouseup', function() {
      this.style.transform = '';
    });
    card.addEventListener('mouseleave', function() {
      this.style.transform = '';
    });
  });
}
