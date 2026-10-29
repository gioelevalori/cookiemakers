export const environment = {
  production: true,
  githubPages: false,
  newsletterEndpoint: '',
  // PHP endpoint published with the site by scripts/package-aruba.ps1 (see api/README.md).
  stripe: { demo: false, checkoutEndpoint: '/api/checkout-session.php' }
};
