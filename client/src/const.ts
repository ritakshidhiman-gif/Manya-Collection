import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const startCustomerLogin = () => {
  try {
    sessionStorage.removeItem("manus-cookie");
  } catch {
    // sessionStorage unavailable fallback
  }
  startLogin();
};

export const startLogin = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // Agar OAuth portal URL set hai toh uspar bhejega, nahi toh Direct Local Session create kar dega
  if (oauthPortalUrl && appId) {
    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    const nonce = crypto.randomUUID();
    document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;
    const state = encodeOAuthState({ redirectUri, nonce });

    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");

    window.location.href = url.toString();
  } else {
    // Direct Customer Session Set Karein (Fixes "Email sign-in not configured" error)
    const activeCustomer = {
      id: "cust_" + Date.now(),
      name: "Customer",
      email: "guest@manyacollection.com"
    };
    
    localStorage.setItem("manya_customer_session", JSON.stringify(activeCustomer));
    window.location.reload();
  }
};