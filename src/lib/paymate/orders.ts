import fs from "fs";
import path from "path";
import type { ValidatedLineItem } from "@/lib/validate-cart";

export interface PendingOrderCustomer {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface PendingOrder {
  customer: PendingOrderCustomer;
  items: ValidatedLineItem[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  returnUrl: string;
  paymentMethod: string;
  paymatePaymentMode: string;
  paymatePaymentType: string;
  status: "pending" | "paid" | "failed";
  createdAt: string;
  transactionId?: string;
  paymatePayload?: Record<string, unknown>;
  paidAt?: string;
  failureReason?: string;
  failedAt?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "paymate-pending-orders.json");

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, "{}", "utf8");
  }
}

function readStore(): Record<string, PendingOrder> {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8")) as Record<string, PendingOrder>;
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, PendingOrder>) {
  ensureStore();
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(store, null, 2), "utf8");
}

export function savePendingOrder(
  orderId: string,
  data: Omit<PendingOrder, "status" | "createdAt">
) {
  const store = readStore();
  store[orderId] = {
    ...data,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  writeStore(store);
}

export function getPendingOrder(orderId: string): PendingOrder | null {
  const store = readStore();
  return store[orderId] || null;
}

export function markOrderPaid(
  orderId: string,
  paymentData: { transactionId: string; paymatePayload?: Record<string, unknown> }
): PendingOrder | null {
  const store = readStore();
  if (!store[orderId]) return null;
  store[orderId] = {
    ...store[orderId],
    ...paymentData,
    status: "paid",
    paidAt: new Date().toISOString(),
  };
  writeStore(store);
  return store[orderId];
}

export function markOrderFailed(orderId: string, reason: string): PendingOrder | null {
  const store = readStore();
  if (!store[orderId]) return null;
  store[orderId] = {
    ...store[orderId],
    status: "failed",
    failureReason: reason,
    failedAt: new Date().toISOString(),
  };
  writeStore(store);
  return store[orderId];
}
