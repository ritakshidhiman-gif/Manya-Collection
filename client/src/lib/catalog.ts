/* Manya Collection: editable catalog vocabulary for categories, filters, and the Catalog Studio manager. */

export type CatalogProduct = {
  id: string;
  name: string;
  category: "Cotton" | "Festive" | "Designer" | "Winter";
  gender: "Women" | "Unisex";
  color: string;
  price: number;
  sizes: string[];
  image: string;
  badge?: string;
  description: string;
};

export const defaultProducts: CatalogProduct[] = [
  {
    id: "manya-001",
    name: "Meher Printed Suit",
    category: "Cotton",
    gender: "Women",
    color: "Mustard",
    price: 1890,
    sizes: ["S", "M", "L", "XL"],
    image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=1200&q=85",
    badge: "Bestseller",
    description: "A sun-warmed printed set with an easy kurta, straight trouser, and soft dupatta.",
  },
  {
    id: "manya-002",
    name: "Noor Embroidered Set",
    category: "Festive",
    gender: "Women",
    color: "Rose",
    price: 3290,
    sizes: ["S", "M", "L", "XL"],
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85",
    badge: "New arrival",
    description: "Fine embroidery and a graceful drape for celebrations that stay with you.",
  },
  {
    id: "manya-003",
    name: "Adaa Panelled Kurta",
    category: "Designer",
    gender: "Women",
    color: "Midnight",
    price: 2790,
    sizes: ["S", "M", "L"],
    image: "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=1200&q=85",
    description: "A fluid longline silhouette with contrast panels and a quietly modern finish.",
  },
  {
    id: "manya-004",
    name: "Gul Wool Blend Suit",
    category: "Winter",
    gender: "Women",
    color: "Emerald",
    price: 3590,
    sizes: ["M", "L", "XL"],
    image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1200&q=85",
    badge: "Limited",
    description: "A rich winter layer with a soft hand-feel, finished with floral threadwork.",
  },
  {
    id: "manya-005",
    name: "Riwaayat Linen Set",
    category: "Cotton",
    gender: "Women",
    color: "Ivory",
    price: 2190,
    sizes: ["S", "M", "L", "XL"],
    image: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=1200&q=85",
    description: "A breathable everyday set with a gently structured neckline and clean finish.",
  },
  {
    id: "manya-006",
    name: "Saanjh Velvet Kurta",
    category: "Festive",
    gender: "Women",
    color: "Plum",
    price: 3890,
    sizes: ["S", "M", "L"],
    image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85",
    description: "Deep velvet, delicate borders, and a silhouette made for evening gatherings.",
  },
];
