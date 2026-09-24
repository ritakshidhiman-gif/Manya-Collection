# Razorpay payment-method notes

Razorpay’s official payment gateway page states that the gateway supports cards, net banking, UPI, and wallets. Razorpay’s official Checkout display-configuration documentation states that the `display` configuration can be passed in Checkout options and supports `blocks`, `sequence`, `preferences`, and `hide` instruments. The Manya storefront currently requests a standard Razorpay Checkout instance without a display configuration, so the account’s default payment-method screen is currently shown. The account must also have UPI enabled in Razorpay Dashboard payment configuration; client-side display settings cannot activate a disabled merchant method.

References:
- https://razorpay.com/payment-gateway/
- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/configure-payment-methods/display-configuration/?preferred-country=IN
- https://www.shopify.com/in/payment-gateways
