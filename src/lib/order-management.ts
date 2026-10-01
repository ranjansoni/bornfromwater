export const fulfillmentStatuses = ['unfulfilled', 'packed', 'shipped', 'delivered', 'cancelled'] as const;
export type FulfillmentStatus = typeof fulfillmentStatuses[number];
export const statusLabels: Record<FulfillmentStatus, string> = {
  unfulfilled: 'To pack', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered',
  cancelled: 'Cancelled',
};
export type DeliveryContact = {
  name: string; email: string; phone: string; line1: string; line2: string;
  city: string; province: string; postalCode: string; country: string;
};
export type FulfillmentUpdate = {
  status: FulfillmentStatus; carrier: string; trackingNumber: string; trackingUrl: string;
  customer: DeliveryContact; internalNote: string; version: number;
};
export class OrderInputError extends Error {}

function field(value: unknown, label: string, max: number, required = false): string {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    throw new OrderInputError(`Please check ${label}.`);
  }
  const result = value.trim();
  if (required && !result) throw new OrderInputError(`Please enter ${label}.`);
  return result;
}
export function validateFulfillmentUpdate(input: unknown): FulfillmentUpdate {
  if (!input || typeof input !== 'object') throw new OrderInputError('Invalid order update.');
  const v = input as Record<string, unknown>;
  if (!fulfillmentStatuses.includes(v.status as FulfillmentStatus) || !Number.isSafeInteger(v.version) ||
      (v.version as number) < 0 || (v.version as number) > 2147483646) throw new OrderInputError('Invalid order update.');
  if (!v.customer || typeof v.customer !== 'object') throw new OrderInputError('Please check the delivery details.');
  const c = v.customer as Record<string, unknown>;
  const customer: DeliveryContact = {
    name: field(c.name, 'customer name', 160, true), email: field(c.email, 'customer email', 254, true),
    phone: field(c.phone, 'phone number', 40), line1: field(c.line1, 'street address', 200, true),
    line2: field(c.line2, 'address line 2', 200), city: field(c.city, 'city', 100, true),
    province: field(c.province, 'province', 50, true), postalCode: field(c.postalCode, 'postal code', 20, true),
    country: field(c.country, 'country', 2, true),
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) || customer.country !== 'CA') {
    throw new OrderInputError('Enter a valid email and a Canadian delivery address.');
  }
  const carrier = field(v.carrier, 'carrier', 80);
  const trackingNumber = field(v.trackingNumber, 'tracking number', 160);
  const trackingUrl = field(v.trackingUrl, 'tracking link', 1000);
  if (trackingUrl) {
    try {
      const url = new URL(trackingUrl);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    } catch { throw new OrderInputError('The tracking link must start with https://.'); }
  }
  const internalNote = field(v.internalNote, 'internal notes', 2000);
  if (v.status === 'cancelled' && !internalNote) {
    throw new OrderInputError('Add the cancellation reason in internal notes. Refunds are handled separately in Stripe.');
  }
  if (['shipped', 'delivered'].includes(v.status as string) && (!carrier || (!trackingNumber && !internalNote))) {
    throw new OrderInputError('Add the carrier and tracking number, or explain an untracked shipment in internal notes.');
  }
  return { status: v.status as FulfillmentStatus, carrier, trackingNumber, trackingUrl,
    customer, internalNote, version: v.version as number };
}
export function money(cents: number, currency = 'CAD') {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(cents / 100);
}
export function orderDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Vancouver' }).format(new Date(value));
}
