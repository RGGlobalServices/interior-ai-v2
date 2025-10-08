// Base script for the application
document.addEventListener('DOMContentLoaded', function() {
  console.log('Application initialized');
  
  // Navigation buttons
  const navButtons = document.querySelectorAll('.nav-btn-3d');
  navButtons.forEach(button => {
    button.addEventListener('click', function() {
      const page = this.getAttribute('data-page');
      window.location.href = `/${page}`;
    });
  });
});