document.addEventListener('DOMContentLoaded', () => {
  const ctaBtn = document.getElementById('ctaBtn');
  const toast = document.getElementById('toast');
  let timeoutId = null;

  if (ctaBtn && toast) {
    ctaBtn.addEventListener('click', () => {
      // Provide immediate click feedback
      ctaBtn.textContent = 'Processing...';
      ctaBtn.disabled = true;

      // Show toast
      toast.classList.add('show');

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        toast.classList.remove('show');
        ctaBtn.textContent = 'Claim Offer Now →';
        ctaBtn.disabled = false;
      }, 3000);
    });
  }
});
