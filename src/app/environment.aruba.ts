export const environment = {
  production: true,
  githubPages: false,
  newsletterEndpoint: '',
  // PHP endpoint published with the site by scripts/package-aruba.ps1; the publishable key is public by design (see api/README.md).
  stripe: { demo: false, paymentEndpoint: '/api/create-payment.php', publishableKey: 'pk_test_51UUr2aRx7LxS9QzE61RoJh6kvcRu9up0wwW4QgMiBO46oExRxrZcDnCoGt8hLTRxgS25EulZ9TRn2wYCDAj4U6ku00OCQyFxV5' }
};
