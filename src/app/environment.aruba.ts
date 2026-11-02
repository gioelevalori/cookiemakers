export const environment = {
  production: true,
  githubPages: false,
  newsletterEndpoint: '',
  // PHP endpoint published with the site by scripts/package-aruba.ps1; the publishable key is public by design (see api/README.md).
  stripe: { demo: false, paymentEndpoint: '/api/create-payment.php', publishableKey: '' }
};
