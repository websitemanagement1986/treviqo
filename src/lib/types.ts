export interface ThemeConfig {
  primary: string;
  primaryDark: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  fontHeading: string;
  fontBody: string;
  borderRadius: string;
}

export interface SiteInfo {
  name: string;
  legalName: string;
  tagline: string;
  promoBar: string;
  freeShippingThreshold: number;
  deliveryCharge: number;
  contact: {
    person: string;
    email: string;
    phone: string;
    address: string;
  };
  social: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    pinterest?: string;
  };
}

export interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

export interface NavigationConfig {
  main: NavItem[];
  footer: {
    title: string;
    links: { label: string; href: string }[];
  }[];
}

export interface Category {
  slug: string;
  name: string;
  description: string;
  image: string;
  featured?: boolean;
}

export interface Brand {
  name: string;
  href: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  salePrice?: number;
  category: string;
  images: string[];
  colors: string[];
  sizes: string[];
  rating: number;
  reviewCount: number;
  featured?: boolean;
  deal?: boolean;
  shipping: string;
  returns: string;
  createdAt: string;
}

export interface HeroSlide {
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  image: string;
}

export interface PageContent {
  title: string;
  sections: { heading?: string; body: string }[];
}

export interface SiteConfig {
  siteId: string;
  site: SiteInfo;
  theme: ThemeConfig;
  navigation: NavigationConfig;
  categories: Category[];
  products: Product[];
  heroSlides: HeroSlide[];
  brands: Brand[];
  pages: Record<string, PageContent>;
}

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
}

export interface CheckoutFormData {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}
