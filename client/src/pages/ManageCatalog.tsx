/* Manya Collection: database-backed catalog management for authenticated admins. */
import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ImagePlus, LogIn, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { CatalogProduct } from "@/lib/catalog";
import { trpc } from "@/lib/trpc";

type ProductForm = Omit<CatalogProduct, "id">;

const emptyForm: ProductForm = {
  name: "",
  category: "Cotton",
  gender: "Women",
  color: "",
  price: 0,
  sizes: ["S", "M", "L", "XL"],
  image: "",
  badge: "",
  description: "",
};

export default function ManageCatalog() {
  const { user, loading: authLoading } = useAuth();
  const catalogQuery = trpc.catalog.list.useQuery();
  const utils = trpc.useUtils();
  const createProduct = trpc.catalog.create.useMutation({
    onSuccess: async () => {
      await utils.catalog.list.invalidate();
      setForm(emptyForm);
      toast.success("Design added to the catalog", { description: "The storefront now reads this design from the database." });
    },
    onError: (error) => toast.error("Could not add this design", { description: error.message }),
  });
  const uploadImage = trpc.catalog.uploadImage.useMutation({
    onSuccess: ({ url }) => {
      updateField("image", url);
      toast.success("Photo uploaded", { description: "The hosted image is ready to add to the catalog." });
    },
    onError: (error) => toast.error("Could not upload this photo", { description: error.message }),
  });
  const removeProduct = trpc.catalog.remove.useMutation({
    onSuccess: async () => {
      await utils.catalog.list.invalidate();
      toast.success("Design removed from the catalog");
    },
    onError: (error) => toast.error("Could not remove this design", { description: error.message }),
  });
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const catalog = catalogQuery.data ?? [];
  const isAdmin = user?.role === "admin" || user?.email?.trim().toLowerCase() === "ritakshidhiman@gmail.com";
  const ordersQuery = trpc.orders.list.useQuery(undefined, { enabled: isAdmin });
  const updateOrderStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: async () => {
      await ordersQuery.refetch();
      toast.success("Order status updated");
    },
    onError: (error) => toast.error("Could not update order status", { description: error.message }),
  });

  const updateField = <K extends keyof ProductForm>(field: K, value: ProductForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePhotoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Choose a JPG, PNG, WebP, or HEIC image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Please choose an image smaller than 8 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result.split(",")[1] : "";
      if (!result) return;
      uploadImage.mutate({ fileName: file.name, contentType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif", dataBase64: result });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createProduct.mutate({
      name: form.name.trim(),
      category: form.category,
      gender: form.gender,
      color: form.color.trim(),
      price: Number(form.price),
      sizes: form.sizes.length ? form.sizes : ["S", "M", "L", "XL"],
      image: form.image.trim(),
      badge: form.badge?.trim() || undefined,
      description: form.description.trim(),
    });
  };

  return (
    <div className="catalog-manager-page">
      <header className="manager-header">
        <Link href="/" className="manya-logo" aria-label="Back to Manya Collection">
          <span className="logo-monogram">M</span>
          <span><strong>Manya</strong><small>COLLECTION</small></span>
        </Link>
        <Link href="/" className="back-home-button"><ArrowLeft size={14} /> View storefront</Link>
      </header>
      <main className="manager-main">
        <div className="manager-heading">
          <div><span className="section-kicker">Manya Collection / Catalog Studio</span><h1>Add a new<br /><em>design.</em></h1></div>
          <p>Add suit photography and product details here. The storefront reads this catalog from the shared database, so changes are available across browsers and sessions.</p>
        </div>

        {!authLoading && !user && <div className="catalog-access-note"><strong>Admin sign-in required.</strong><span>Catalog Studio uses the secure owner/admin sign-in. Customer email OTP access cannot change the shared catalog.</span><button className="line-button" onClick={() => startLogin()}><LogIn size={15} /> Sign in as admin</button></div>}
        {!authLoading && user && !isAdmin && <div className="catalog-access-note"><strong>Catalog access is restricted.</strong><span>Your account is signed in, but only an admin can change the shared catalog.</span></div>}

        <div className="manager-layout">
          <section className="manager-card">
            <h2>New product</h2>
            <p>Use a hosted image URL so the design is available to every storefront visitor. Developers can also edit the default catalog entries in <strong>client/src/lib/catalog.ts</strong> before reseeding.</p>
            <form className="manager-form" onSubmit={handleSubmit}>
              <label>Product name<input required disabled={!isAdmin || createProduct.isPending} value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="e.g. Noor Embroidered Set" /></label>
              <div className="manager-form-two"><label>Category<select disabled={!isAdmin || createProduct.isPending} value={form.category} onChange={(event) => updateField("category", event.target.value as CatalogProduct["category"])}><option value="Cotton">Cotton</option><option value="Festive">Festive</option><option value="Designer">Designer</option><option value="Winter">Winter</option></select></label><label>Gender<select disabled={!isAdmin || createProduct.isPending} value={form.gender} onChange={(event) => updateField("gender", event.target.value as CatalogProduct["gender"])}><option value="Women">Women</option><option value="Unisex">Unisex</option></select></label></div>
              <div className="manager-form-two"><label>Price (₹)<input required disabled={!isAdmin || createProduct.isPending} type="number" min="0" value={form.price || ""} onChange={(event) => updateField("price", Number(event.target.value))} placeholder="2490" /></label><label>Color<input required disabled={!isAdmin || createProduct.isPending} value={form.color} onChange={(event) => updateField("color", event.target.value)} placeholder="Mustard" /></label></div>
              <label>Image URL<div className="image-url-field"><input required disabled={!isAdmin || createProduct.isPending || uploadImage.isPending} type="url" value={form.image} onChange={(event) => updateField("image", event.target.value)} placeholder="https://... or upload a photo" /><input ref={photoInputRef} className="visually-hidden-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" onChange={handlePhotoSelected} /><button className="image-upload-button" type="button" disabled={!isAdmin || createProduct.isPending || uploadImage.isPending} onClick={() => photoInputRef.current?.click()} title="Choose from camera or gallery" aria-label="Choose product photo from camera or gallery"><ImagePlus size={18} /> <span>{uploadImage.isPending ? "Uploading" : "Add photo"}</span></button></div></label>
              <label>Available sizes<input disabled={!isAdmin || createProduct.isPending} value={form.sizes.join(", ")} onChange={(event) => updateField("sizes", event.target.value.split(",").map((size) => size.trim().toUpperCase()).filter(Boolean))} placeholder="S, M, L, XL" /></label>
              <label>Badge <span className="optional-label">optional</span><input disabled={!isAdmin || createProduct.isPending} value={form.badge} onChange={(event) => updateField("badge", event.target.value)} placeholder="New arrival" /></label>
              <label>Description<textarea required disabled={!isAdmin || createProduct.isPending} value={form.description} onChange={(event) => updateField("description", event.target.value)} placeholder="A short note about the fabric, fit, or occasion." /></label>
              <button className="gold-button manager-save" disabled={!isAdmin || createProduct.isPending} type="submit"><Check size={16} /> {createProduct.isPending ? "Saving design..." : "Add design to catalog"}</button>
            </form>
            <div className="catalog-source-note"><strong>Persistent catalog.</strong> Product records are stored in the project database. Images remain hosted assets referenced by URL, keeping the database light and making the catalog portable.</div>
          </section>
          <section className="manager-card">
            <div className="manager-table-label"><span>Order flow / {ordersQuery.data?.length ?? 0} orders</span><button onClick={() => ordersQuery.refetch()} disabled={!isAdmin || ordersQuery.isFetching}><RefreshCw size={13} /> {ordersQuery.isFetching ? "Refreshing" : "Refresh orders"}</button></div>
            {!isAdmin ? <div className="manager-empty-state">Admin access is required to view customer orders.</div> : ordersQuery.isLoading ? <div className="manager-empty-state">Loading order statuses...</div> : ordersQuery.data?.length ? <div className="manager-order-list">{ordersQuery.data.map((order) => <div className="manager-order-row" key={order.id}><div><span className="product-category">{order.orderNumber} · {new Date(order.createdAt).toLocaleDateString()}</span><h3>{order.customerName}</h3><p>{order.customerEmail} · ₹{order.total.toLocaleString("en-IN")}</p></div><select value={order.status} disabled={updateOrderStatus.isPending} onChange={(event) => updateOrderStatus.mutate({ orderId: order.id, status: event.target.value as "pending_payment" | "processing" | "completed" | "failed" | "cancelled" })}><option value="pending_payment">Pending payment</option><option value="processing">Processing</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option></select></div>)}</div> : <div className="manager-empty-state">No orders have been created yet.</div>}
            <div className="manager-table-label"><span>Live catalog / {catalog.length} designs</span><button onClick={() => catalogQuery.refetch()} disabled={catalogQuery.isFetching}><RefreshCw size={13} /> {catalogQuery.isFetching ? "Refreshing" : "Refresh catalog"}</button></div>
            {catalogQuery.isLoading ? <div className="manager-empty-state">Loading the shared catalog...</div> : <div className="manager-product-list">{catalog.map((product) => <div className="manager-product-row" key={product.id}><img src={product.image} alt="" /><div><span className="product-category">{product.category} · {product.color}</span><h3>{product.name}</h3><p>{product.sizes.join(" · ")} · {product.gender}</p></div><div className="manager-product-actions"><strong className="manager-price">₹{product.price.toLocaleString("en-IN")}</strong><button disabled={!isAdmin || removeProduct.isPending} onClick={() => { if (window.confirm(`Remove ${product.name} from the shared catalog? This cannot be undone.`)) removeProduct.mutate({ id: Number(product.id) }); }}><Trash2 size={13} /> Remove</button></div></div>)}</div>}
            <Link href="/" className="text-arrow manager-storefront-link">Open storefront <ArrowRight size={16} /></Link>
          </section>
        </div>
      </main>
    </div>
  );
}
