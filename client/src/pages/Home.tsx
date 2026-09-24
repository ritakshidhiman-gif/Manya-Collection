/* Manya Collection: traditional fashion retail, warm ivory surfaces, deep ink/navy accents, and practical catalog browsing. */
import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Heart,
  Plus,
  Menu,
  MessageCircle,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { CatalogProduct, defaultProducts } from "@/lib/catalog";
import { trpc } from "@/lib/trpc";

const categories = [
  { name: "Cotton", count: "Easy everyday" },
  { name: "Festive", count: "For the celebrations" },
  { name: "Designer", count: "Statement detail" },
  { name: "Winter", count: "Warm layers" },
];

const heroImage = "/manya-cotton-hero-2.png";

const categoryImages: Record<string, string> = {
  Cotton: "/manya-category-cotton.png",
  Festive: "/manya-category-collection-festive.jpeg",
  Designer: "/manya-category-designer.jpeg",
  Winter: "/manya-category-winter.jpeg",
};

function formatPrice(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export default function Home() {
  const { user, loading: authLoading, logout, refresh } = useAuth();
  const isOwnerAdmin = user?.role === "admin" || user?.email?.trim().toLowerCase() === "ritakshidhiman@gmail.com";
  const requestEmailOtp = trpc.auth.requestEmailOtp.useMutation();
  const verifyEmailOtp = trpc.auth.verifyEmailOtp.useMutation();
  const { data: remoteCatalog } = trpc.catalog.list.useQuery();
  
  const catalog: CatalogProduct[] = remoteCatalog?.map((product) => ({
    ...product,
    id: String(product.id),
    badge: product.badge ?? undefined,
  })) ?? defaultProducts;

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedGender, setSelectedGender] = useState("All");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [sortBy, setSortBy] = useState("featured");
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [bagItems, setBagItems] = useState<CatalogProduct[]>([]);
  const [bagSelections, setBagSelections] = useState<Record<string, string>>({});
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [liked, setLiked] = useState<string[]>([]);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginStep, setLoginStep] = useState<"details" | "code">("details");
  const [loginName, setLoginName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [checkoutDetails, setCheckoutDetails] = useState({ 
    customerName: "", 
    customerEmail: "", 
    customerPhone: "", 
    addressLine1: "", 
    city: "", 
    state: "", 
    postalCode: "" 
  });

  const openWhatsApp = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const phone = "919871049488";
    const text = encodeURIComponent("Hello! I have a query about Manya Collection.");
    const url = `https://wa.me/${phone}?text=${text}`;
    const newWindow = window.open(url, "_blank");
    if (!newWindow) {
      window.location.href = url;
    }
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    catalog.forEach((product) => {
      const catName = product.category;
      counts[catName] = (counts[catName] || 0) + 1;
    });
    return counts;
  }, [catalog]);

  const filteredProducts = useMemo(() => {
    const next = catalog.filter((product) => {
      const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
      const matchesGender = selectedGender === "All" || product.gender === selectedGender;
      const matchesColor = selectedColors.length === 0 || selectedColors.includes(product.color);
      const matchesSize = selectedSizes.length === 0 || selectedSizes.some((size) => product.sizes.includes(size));
      const matchesPrice = product.price >= minPrice && product.price <= maxPrice;
      return matchesCategory && matchesGender && matchesColor && matchesSize && matchesPrice;
    });

    if (sortBy === "price-low") return [...next].sort((a, b) => a.price - b.price);
    if (sortBy === "price-high") return [...next].sort((a, b) => b.price - a.price);
    if (sortBy === "name") return [...next].sort((a, b) => a.name.localeCompare(b.name));
    return next;
  }, [catalog, maxPrice, minPrice, selectedCategory, selectedColors, selectedGender, selectedSizes, sortBy]);

  const filterCount = selectedColors.length + selectedSizes.length + (selectedCategory !== "All" ? 1 : 0) + (selectedGender !== "All" ? 1 : 0) + (minPrice > 0 || maxPrice < 5000 ? 1 : 0);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  };

  const toggleListValue = (value: string, values: string[], setter: (next: string[]) => void) => {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  const openProduct = (product: CatalogProduct) => {
    setSelectedProduct(product);
    setSelectedSize(product.sizes[0] ?? "");
  };

  const addToBag = (product: CatalogProduct, size = selectedSize || product.sizes[0] || "") => {
    setBagSelections((current) => ({ ...current, [product.id]: size }));
    setBagItems((current) => [...current, product]);
    setSelectedProduct(null);
    toast.success(`${product.name} added to your bag`, { description: `${size ? `Size ${size} · ` : ""}Your selection is ready whenever you are.` });
  };

  const clearFilters = () => {
    setSelectedCategory("All");
    setSelectedGender("All");
    setSelectedColors([]);
    setSelectedSizes([]);
    setMinPrice(0);
    setMaxPrice(5000);
  };

  const openLogin = () => {
    setLoginOpen(true);
    setLoginStep("details");
    setLoginCode("");
  };

  const closeLogin = () => {
    if (requestEmailOtp.isPending || verifyEmailOtp.isPending) return;
    setLoginOpen(false);
  };

  const submitLoginDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await requestEmailOtp.mutateAsync({ name: loginName, email: loginEmail });
      setLoginStep("code");
      toast.success("Verification code sent", { description: `Check ${loginEmail.trim().toLowerCase()}.` });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not send your code.");
    }
  };

  const submitLoginCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await verifyEmailOtp.mutateAsync({ email: loginEmail, code: loginCode });
      await refresh();
      setLoginOpen(false);
      setLoginCode("");
      toast.success("Welcome to Manya Collection", { description: "Your account is now signed in." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That code could not be verified.");
    }
  };

  const updateCheckoutDetail = (field: keyof typeof checkoutDetails, value: string) => {
    setCheckoutDetails((current) => ({ ...current, [field]: value }));
  };

  // Direct Custom Payment Modal Logic (Bypassing Razorpay Errors)
  const submitCheckout = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCheckoutOpen(false);
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = () => {
    setShowPaymentModal(false);
    setBagItems([]);
    toast.success("Payment Received Successfully!", {
      description: "Thank you for your order. We will ship your Manya designs soon."
    });
  };

  const submitNewsletter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newsletterEmail) return;
    setSubscribed(true);
    toast.success("You’re on the Manya list", { description: "We’ll send you new designs and collection notes." });
  };

  return (
    <div className="manya-site">
      <div className="top-strip" style={{ display: "flex", justifyContent: "space-between", padding: "0 1rem" }}>
        <span>Free shipping on orders above ₹2,999</span>
        <span>One stop for your festive wardrobe</span>
        {user ? <button onClick={() => logout()}>Sign out</button> : <button onClick={openLogin}>Sign in</button>}
      </div>

      <header className="manya-header">
        <div className="header-main">
          <button className="mobile-menu-trigger" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
          <button className="manya-logo" onClick={() => scrollTo("home")} aria-label="Manya Collection home">
            <span className="logo-monogram">M</span>
            <span><strong>Manya</strong><small>COLLECTION</small></span>
          </button>
          <nav className="manya-nav" aria-label="Main navigation">
            <button onClick={() => scrollTo("shop")}>Shop all</button>
            <button onClick={() => { setSelectedCategory("Cotton"); scrollTo("shop"); }}>Cotton</button>
            <button onClick={() => { setSelectedCategory("Festive"); scrollTo("shop"); }}>Festive</button>
            <button onClick={() => { setSelectedCategory("Designer"); scrollTo("shop"); }}>Designer</button>
            <button onClick={() => scrollTo("categories")}>Collections <ChevronDown size={14} /></button>
          </nav>
          <div className="header-tools">
            <a 
              href="https://wa.me/919871049488" 
              onClick={openWhatsApp}
              className="header-tool"
              style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "#25D366", fontWeight: 600, textDecoration: "none" }}
            >
              <MessageCircle size={19} />
              <span>WhatsApp us</span>
            </a>
            <button className="header-tool search-tool" onClick={() => setSearchOpen(true)}><Search size={19} /><span>Search</span></button>
            <button className="header-tool" aria-label={user ? "Signed in account" : "Sign in"} onClick={() => { if (user) { toast(`Signed in as ${user.name || user.email || "Manya customer"}`); } else { openLogin(); } }}><UserRound size={19} /><span className="account-tool-label">{user ? "Account" : "Sign in"}</span></button>{!authLoading && isOwnerAdmin && <button className="header-tool admin-add-tool" aria-label="Add a new suit" title="Add a new suit" onClick={() => window.location.assign("/manage-catalog")}><Plus size={19} /><span>Add suit</span></button>}
            <button className="header-tool bag-tool" aria-label={`Open bag with ${bagItems.length} items`} onClick={() => setBagOpen(true)}><ShoppingBag size={19} /><span>Bag</span><b>{String(bagItems.length).padStart(2, "0")}</b></button>
          </div>
        </div>
        <div className="header-subnav"><button onClick={() => scrollTo("categories")}>Shop by category</button><span>New designs added every week</span><button onClick={() => scrollTo("about")}>Our story <ArrowRight size={14} /></button></div>
      </header>

      {menuOpen && <div className="manya-overlay" role="dialog" aria-modal="true" aria-label="Navigation menu"><div className="manya-mobile-menu"><div className="mobile-menu-head"><span className="mini-label">MANYA COLLECTION</span><button onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={22} /></button></div><nav>{["Shop all", "Cotton", "Festive", "Designer", "Winter", "Our story"].map((item, index) => <button key={item} onClick={() => { if (["Cotton", "Festive", "Designer", "Winter"].includes(item)) setSelectedCategory(item); scrollTo(item === "Our story" ? "about" : item === "Shop all" ? "shop" : "shop"); }}><span>0{index + 1}</span>{item}<ArrowRight size={17} /></button>)}</nav><div className="mobile-menu-foot"><span>Jawalamukhi · Himachal Pradesh</span><span>Est. 2026</span></div></div></div>}

      {searchOpen && <div className="manya-overlay search-overlay" role="dialog" aria-modal="true" aria-label="Search"><div className="search-modal"><div className="modal-head"><span className="mini-label">SEARCH THE COLLECTION</span><button onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={22} /></button></div><div className="search-field"><Search size={21} /><input autoFocus placeholder="Search suits, colors, occasions..." /><span>ESC</span></div><p>Try “cotton”, “festive”, or “mustard”.</p><button className="text-arrow" onClick={() => { setSearchOpen(false); scrollTo("shop"); }}>Browse all designs <ArrowRight size={16} /></button></div></div>}

      {loginOpen && <div className="manya-overlay login-overlay" role="dialog" aria-modal="true" aria-labelledby="login-title"><div className="login-modal"><div className="modal-head"><div><span className="mini-label">MANYA CUSTOMER ACCOUNT</span><h2 id="login-title">{loginStep === "details" ? "Welcome in." : "Check your inbox."}</h2></div><button onClick={closeLogin} aria-label="Close sign in"><X size={22} /></button></div>{loginStep === "details" ? <form className="login-form" onSubmit={submitLoginDetails}><p>Sign in with your own email address. We’ll send a one-time verification code to confirm it’s you.</p><label>Your name<input required minLength={2} value={loginName} onChange={(event) => setLoginName(event.target.value)} placeholder="Enter your name" /></label><label>Email address<input required type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="you@example.com" /></label><button className="gold-button" type="submit" disabled={requestEmailOtp.isPending}>{requestEmailOtp.isPending ? "Sending code…" : "Send verification code"} <ArrowRight size={16} /></button></form> : <form className="login-form" onSubmit={submitLoginCode}><p>Enter the six-digit code we sent to <strong>{loginEmail}</strong>.</p><label>Verification code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={loginCode} onChange={(event) => setLoginCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" autoFocus /></label><button className="gold-button" type="submit" disabled={verifyEmailOtp.isPending}>{verifyEmailOtp.isPending ? "Checking code…" : "Confirm email"} <Check size={16} /></button><button className="login-back-button" type="button" onClick={() => setLoginStep("details")}>Use a different email</button></form>}</div></div>}

      <main id="home">
        <section className="manya-hero">
          <div className="hero-image-holder"><img src={heroImage} alt="Indian woman wearing a traditional cotton salwar suit from Manya Collection" /><div className="hero-image-overlay" /><div className="hero-caption"><span>NEW SEASON / 2026</span><span>Festive · Cotton · Designer</span></div></div>
          <div className="hero-copy-block"><span className="eyebrow-gold">The new Manya edit</span><h1>Tradition,<br /><em>beautifully</em><br />made.</h1><p>Discover thoughtful Indian silhouettes, joyful color, and details made for the moments you’ll remember.</p><div className="hero-ctas"><button className="gold-button" onClick={() => scrollTo("shop")}>Shop new designs <ArrowRight size={16} /></button><button className="line-button" onClick={() => scrollTo("categories")}>Explore collections <ChevronDown size={15} /></button></div><div className="hero-detail"><span className="hero-detail-number">01</span><span>Made for celebrations<br />and every day in between.</span></div></div>
        </section>

        <section className="trust-row"><div><Sparkles size={19} /><span><strong>Thoughtful designs</strong><small>Made for your wardrobe</small></span></div><div><Check size={19} /><span><strong>Easy exchanges</strong><small>Simple and stress-free</small></span></div><div><Heart size={19} /><span><strong>Made with care</strong><small>Quality in every detail</small></span></div><div><ShoppingBag size={19} /><span><strong>Secure shopping</strong><small>Safe checkout experience</small></span></div></section>

        <section className="category-section" id="categories">
          <div className="section-intro">
            <div>
              <span className="section-kicker">Find your occasion</span>
              <h2>Shop by<br /><em>category</em></h2>
            </div>
            <p>From soft cottons for everyday ease to ornate festive sets, find a silhouette that feels like you.</p>
          </div>
          <div className="category-grid">
            {categories.map((category, index) => {
              const currentCount = categoryCounts[category.name] ?? 0;
              return (
                <button
                  className="category-tile"
                  key={category.name}
                  onClick={() => {
                    setSelectedCategory(category.name);
                    scrollTo("shop");
                  }}
                >
                  <img src={categoryImages[category.name]} alt={`${category.name} collection`} />
                  <span className="category-shade" />
                  <span className="category-number">0{index + 1}</span>
                  <span className="category-copy">
                    <strong style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                      {category.name}
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: "1.35rem",
                          height: "1.35rem",
                          padding: "0 0.3rem",
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                          borderRadius: "9999px",
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          color: "#111",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                          lineHeight: 1
                        }}
                      >
                        {currentCount}
                      </span>
                    </strong>
                    <small>{category.count}</small>
                  </span>
                  <ArrowRight className="category-arrow" size={19} />
                </button>
              );
            })}
          </div>
        </section>

        <section className="catalog-section" id="shop"><div className="catalog-title-row"><div><span className="section-kicker">Manya Collection</span><h2>Products <em>for you</em></h2></div><span className="catalog-count">{filteredProducts.length} designs</span></div><div className="catalog-toolbar"><button onClick={() => setSortBy(sortBy === "featured" ? "price-low" : "featured")}><SlidersHorizontal size={18} /> Sort {sortBy === "price-low" ? "· Price low to high" : ""}</button><button onClick={() => setSelectedCategory(selectedCategory === "All" ? "Cotton" : "All")}>Category <ChevronDown size={18} /></button><button onClick={() => setSelectedGender(selectedGender === "All" ? "Women" : "All")}>Gender <ChevronDown size={18} /></button><button className="toolbar-filter" onClick={() => setFilterOpen(true)}><Filter size={18} /> Filters {filterCount > 0 && <b>{filterCount}</b>}</button></div><div className="active-filter-row">{selectedCategory !== "All" && <button onClick={() => setSelectedCategory("All")}>{selectedCategory} <X size={13} /></button>}{selectedColors.map((color) => <button key={color} onClick={() => toggleListValue(color, selectedColors, setSelectedColors)}>{color} <X size={13} /></button>)}{selectedSizes.map((size) => <button key={size} onClick={() => toggleListValue(size, selectedSizes, setSelectedSizes)}>{size} <X size={13} /></button>)}{filterCount > 0 && <button className="clear-filter" onClick={clearFilters}>Clear all</button>}</div><div className="product-grid">{filteredProducts.map((product) => <article className="manya-product-card" key={product.id}><div className="product-photo" onClick={() => openProduct(product)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openProduct(product); }}><img src={product.image} alt={product.name} /><div className="product-photo-shade" />{product.badge && <span className="product-badge">{product.badge}</span>}<button className={`wishlist ${liked.includes(product.id) ? "liked" : ""}`} aria-label={`Save ${product.name}`} onClick={() => setLiked((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id])}><Heart size={18} fill={liked.includes(product.id) ? "currentColor" : "none"} /></button><button className="product-quick-add" onClick={() => addToBag(product)}>Quick add <ArrowRight size={15} /></button></div><div className="product-info"><div><span className="product-category">{product.category} · {product.color}</span><h3>{product.name}</h3><p>{product.description}</p></div><strong>{formatPrice(product.price)}</strong></div><button className="product-detail-button" onClick={() => openProduct(product)}>View details <ArrowRight size={15} /></button></article>)}</div>{filteredProducts.length === 0 && <div className="empty-results"><div><Filter size={23} /></div><h3>No designs match those filters.</h3><p>Try widening your price range or clearing one of the selections.</p><button className="gold-button" onClick={clearFilters}>Clear filters <X size={15} /></button></div>}<button className="view-all-button" onClick={clearFilters}>View all designs <ArrowRight size={16} /></button></section>

        <section className="about-section" id="about"><div className="about-image"><img src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=85" alt="Traditional textile detail" /><span>CRAFT / DETAIL / 001</span></div><div className="about-copy"><span className="section-kicker">The Manya promise</span><h2>Made to be<br /><em>remembered.</em></h2><p>We believe getting dressed should feel personal. Manya brings together joyful Indian craft, easy silhouettes, and honest quality — so your favorite pieces stay in rotation long after the occasion.</p><div className="about-stats"><div><strong>01</strong><span>Color with<br />intention</span></div><div><strong>02</strong><span>Details worth<br />noticing</span></div><div><strong>03</strong><span>Ease in every<br />silhouette</span></div></div><button className="line-button" onClick={() => toast("The Manya story is coming soon")}>Read our story <ArrowRight size={16} /></button></div></section>

        <section className="newsletter-section"><div><span className="section-kicker">A little note from Manya</span><h2>Keep in<br /><em>touch.</em></h2></div><div className="newsletter-copy"><p>Be the first to know about new suit designs, festive edits, and stories from our studio near Mandir Gate No. 3, Kohala.</p>{subscribed ? <div className="subscribed-state"><Check size={18} /> You’re on the list. See you soon.</div> : <form onSubmit={submitNewsletter}><input type="email" required value={newsletterEmail} onChange={(event) => setNewsletterEmail(event.target.value)} placeholder="Your email address" aria-label="Email address" /><button type="submit" aria-label="Subscribe"><ArrowRight size={18} /></button></form>}<small>By subscribing, you agree to receive Manya Collection notes.</small></div></section>
      </main>

      <footer className="manya-footer">
        <div className="footer-brand">
          <button className="manya-logo footer-logo" onClick={() => scrollTo("home")}><span className="logo-monogram">M</span><span><strong>Manya</strong><small>COLLECTION</small></span></button>
          <p>Traditional silhouettes.<br />A modern way to wear them.</p>
          <div className="footer-socials">
            <button onClick={() => toast("Instagram is coming soon")}>Instagram</button>
            <button onClick={() => toast("Facebook is coming soon")}>Facebook</button>
            <a 
              href="https://wa.me/919871049488" 
              onClick={openWhatsApp}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              WhatsApp
            </a>
          </div>
        </div>
        <div className="footer-columns">
          <div><span>Shop</span><button onClick={() => scrollTo("shop")}>All designs</button><button onClick={() => { setSelectedCategory("Cotton"); scrollTo("shop"); }}>Cotton</button><button onClick={() => { setSelectedCategory("Festive"); scrollTo("shop"); }}>Festive</button><button onClick={() => { setSelectedCategory("Winter"); scrollTo("shop"); }}>Winter</button></div>
          <div><span>Help</span><button onClick={() => toast("Shipping information is coming soon")}>Shipping & returns</button><button onClick={() => toast("Size guide is coming soon")}>Size guide</button><button onClick={() => toast("Contact us at hello@manya.collection")}>Contact us</button><button onClick={() => toast("FAQ is coming soon")}>FAQs</button>{!authLoading && isOwnerAdmin && <button onClick={() => window.location.assign("/manage-catalog")}>Catalog Studio</button>}</div>
          <div><span>Visit</span><p>Mandir Gate No. 3, Near Om Hotel<br />Kohala, Jawalamukhi, Himachal Pradesh 176031<br />India</p><p>amit1988rajput@gmail.com<br />+91 9871049488</p></div>
          <div><span>Support on</span><p>amit1988rajput@gmail.com</p></div>
        </div>
        <div className="footer-bottom"><span>© 2026 Manya Collection</span><span>Made for your moments</span><button onClick={() => scrollTo("home")}>Back to top <ChevronRight size={14} className="back-top-icon" /></button></div>
      </footer>

      {/* Bag Drawer */}
      {bagOpen && (
        <div className="manya-overlay search-overlay" role="dialog" aria-modal="true">
          <div className="login-modal" style={{ maxWidth: "450px", width: "100%" }}>
            <div className="modal-head">
              <div>
                <span className="mini-label">YOUR BAG</span>
                <h2>Shopping Bag ({bagItems.length})</h2>
              </div>
              <button onClick={() => setBagOpen(false)} aria-label="Close bag"><X size={22} /></button>
            </div>

            {bagItems.length === 0 ? (
              <div style={{ padding: "2rem 0", textAlign: "center" }}>
                <p>Your shopping bag is empty.</p>
                <button className="gold-button" style={{ marginTop: "1rem" }} onClick={() => setBagOpen(false)}>
                  Start shopping
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {bagItems.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "1rem", borderBottom: "1px solid #eee", paddingBottom: "0.75rem" }}>
                      <img src={item.image} alt={item.name} style={{ width: "60px", height: "75px", objectFit: "cover", borderRadius: "4px" }} />
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: "0.95rem" }}>{item.name}</h4>
                        <p style={{ margin: "0.25rem 0", fontSize: "0.8rem", color: "#666" }}>
                          Size: {bagSelections[item.id] || item.sizes[0] || "Standard"}
                        </p>
                        <strong>{formatPrice(item.price)}</strong>
                      </div>
                      <button 
                        onClick={() => setBagItems((prev) => prev.filter((_, i) => i !== idx))}
                        style={{ border: "none", background: "none", cursor: "pointer", color: "#888" }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ paddingTop: "1rem", borderTop: "1px solid #ddd" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontWeight: "bold" }}>
                    <span>Total Amount</span>
                    <span>
                      {formatPrice(bagItems.reduce((acc, curr) => acc + curr.price, 0))}
                    </span>
                  </div>
                  <button 
                    className="gold-button" 
                    style={{ width: "100%" }}
                    onClick={() => {
                      setBagOpen(false);
                      setCheckoutOpen(true);
                    }}
                  >
                    Proceed to Checkout <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedProduct && <div className="manya-overlay product-detail-overlay" role="dialog" aria-modal="true" aria-labelledby="product-detail-title"><div className="product-detail-modal"><button className="product-detail-close" onClick={() => setSelectedProduct(null)} aria-label="Close product details"><X size={22} /></button><div className="product-detail-image"><img src={selectedProduct.image} alt={selectedProduct.name} /><span>{selectedProduct.category} · {selectedProduct.color}</span></div><div className="product-detail-copy"><span className="mini-label">MANYA COLLECTION / {selectedProduct.badge ?? "SIGNATURE EDIT"}</span><h2 id="product-detail-title">{selectedProduct.name}</h2><strong className="product-detail-price">{formatPrice(selectedProduct.price)}</strong><p className="product-detail-description">{selectedProduct.description} Crafted for graceful movement, with considered details that make the silhouette easy to wear from morning plans to celebratory evenings.</p><div className="review-empty-state"><span className="detail-label">Customer notes</span><p>Reviews will appear here after verified customers share their experience.</p><small>No reviews yet.</small></div><div className="detail-rule" /><div className="detail-section"><span className="detail-label">Choose your size</span><div className="detail-size-options">{selectedProduct.sizes.map((size) => <button key={size} className={selectedSize === size ? "selected" : ""} onClick={() => setSelectedSize(size)}>{size}</button>)}</div><small>Between sizes? Choose the larger size for an easier, more comfortable fit.</small></div><div className="delivery-note"><Check size={17} /><div><strong>Expected delivery</strong><span>3–7 working days across India · Easy exchanges available</span></div></div><button className="gold-button detail-add-button" disabled={selectedProduct.sizes.length > 0 && !selectedSize} onClick={() => addToBag(selectedProduct)}>Add size to bag <ArrowRight size={16} /></button></div><div className="related-designs"><div><span className="mini-label">YOU MAY ALSO LIKE</span><h3>More from this edit</h3></div><div className="related-grid">{catalog.filter((product) => product.id !== selectedProduct.id && (product.category === selectedProduct.category || product.color === selectedProduct.color)).slice(0, 3).map((product) => <button key={product.id} className="related-card" onClick={() => openProduct(product)}><img src={product.image} alt={product.name} /><span>{product.name}</span><small>{formatPrice(product.price)}</small></button>)}</div></div></div></div>}

      {/* Customer Delivery Details Form */}
      {checkoutOpen && (
        <div className="manya-overlay login-overlay" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
          <div className="login-modal checkout-modal">
            <div className="modal-head">
              <div>
                <span className="mini-label">SECURE CHECKOUT</span>
                <h2 id="checkout-title">Your details.</h2>
              </div>
              <button onClick={() => setCheckoutOpen(false)} aria-label="Close checkout"><X size={22} /></button>
            </div>
            <form className="login-form checkout-form" onSubmit={submitCheckout}>
              <p>Enter your delivery details to proceed to payment.</p>
              <div className="checkout-field-grid">
                <label>Name<input required minLength={2} value={checkoutDetails.customerName} onChange={(event) => updateCheckoutDetail("customerName", event.target.value)} /></label>
                <label>Email<input required type="email" value={checkoutDetails.customerEmail} onChange={(event) => updateCheckoutDetail("customerEmail", event.target.value)} /></label>
                <label>Phone<input required minLength={7} value={checkoutDetails.customerPhone} onChange={(event) => updateCheckoutDetail("customerPhone", event.target.value)} /></label>
                <label>Address<input required minLength={3} value={checkoutDetails.addressLine1} onChange={(event) => updateCheckoutDetail("addressLine1", event.target.value)} /></label>
                <label>City<input required minLength={2} value={checkoutDetails.city} onChange={(event) => updateCheckoutDetail("city", event.target.value)} /></label>
                <label>State<input required minLength={2} value={checkoutDetails.state} onChange={(event) => updateCheckoutDetail("state", event.target.value)} /></label>
                <label>PIN code<input required minLength={3} value={checkoutDetails.postalCode} onChange={(event) => updateCheckoutDetail("postalCode", event.target.value)} /></label>
              </div>
              <button className="gold-button" type="submit">Proceed to Payment <ArrowRight size={16} /></button>
            </form>
          </div>
        </div>
      )}

      {/* Custom Clean QR & UPI Payment Modal (Replaces Razorpay Window) */}
      {showPaymentModal && (
        <div className="manya-overlay login-overlay" role="dialog" aria-modal="true">
          <div className="login-modal" style={{ maxWidth: "420px", textAlign: "center", position: "relative", padding: "2rem 1.5rem" }}>
            <button 
              onClick={() => setShowPaymentModal(false)} 
              aria-label="Close payment modal"
              style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer" }}
            >
              <X size={22} />
            </button>

            <span className="mini-label" style={{ letterSpacing: "1px", color: "#b07c24", fontWeight: "bold" }}>
              PAYMENT METHOD
            </span>
            <h2 style={{ margin: "0.5rem 0 0.25rem 0", fontSize: "1.5rem" }}>Scan & Pay via UPI</h2>
            <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "1.25rem" }}>
              Google Pay, PhonePe, Paytm, BHIM & NetBanking Supported
            </p>

            <div style={{ background: "#fcf8f2", border: "1px solid #e8d7be", padding: "1.25rem", borderRadius: "12px", display: "inline-block", marginBottom: "1.25rem" }}>
              <img 
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=9871049488@upi&pn=ManyaCollection" 
                alt="UPI QR Code" 
                style={{ width: "160px", height: "160px", borderRadius: "8px", margin: "0 auto", display: "block" }}
              />
              <p style={{ fontSize: "0.8rem", fontFamily: "monospace", marginTop: "0.75rem", fontWeight: "600", color: "#7a5518" }}>
                UPI ID: 9871049488@upi
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem", fontSize: "0.75rem", fontWeight: "600", color: "#555" }}>
              <span style={{ background: "#eee", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>Google Pay</span>
              <span style={{ background: "#eee", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>PhonePe</span>
              <span style={{ background: "#eee", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>Paytm</span>
              <span style={{ background: "#eee", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>BHIM</span>
              <span style={{ background: "#eee", padding: "0.25rem 0.5rem", borderRadius: "4px" }}>NetBanking</span>
            </div>

            <button 
              className="gold-button" 
              style={{ width: "100%", padding: "0.85rem" }}
              onClick={handlePaymentConfirm}
            >
              I Have Made the Payment <Check size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}