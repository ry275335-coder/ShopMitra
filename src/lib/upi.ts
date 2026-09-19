// ==============================================================================
// src/lib/upi.ts
// NPCI-Compliant Dynamic UPI Deep Link, QR Code & Thermal Bill Formatter
// ==============================================================================

export interface BillItem {
  id: string;
  productId: string;
  productName: string;
  variantName?: string;
  mrp: number;
  unitPrice: number;
  quantity: number;
  sku?: string;
}

export interface CounterBill {
  billNumber: string;
  shopId: string;
  shopName: string;
  shopAddress: string;
  shopGstin?: string;
  shopUpiId: string;
  customerMobile?: string;
  customerName?: string;
  items: BillItem[];
  subtotal: number;
  totalMrp: number;
  totalSavings: number;
  discountAmount: number;
  gstRate: number; // e.g. 0, 5, 12, 18
  gstAmount: number;
  netPayable: number;
  paymentMode: 'upi' | 'cash' | 'card';
  paymentStatus: 'pending' | 'received';
  createdAt: string;
}

/**
 * Builds standard NPCI Universal Payment Interface (UPI) deep link URI
 * Schema: upi://pay?pa={VPA}&pn={MerchantName}&am={Amount}&cu=INR&tn={Note}&tr={TransactionRef}
 */
export function buildUpiDeepLink({
  vpa,
  payeeName,
  amount,
  transactionNote,
  transactionRef,
}: {
  vpa: string;
  payeeName: string;
  amount: number;
  transactionNote: string;
  transactionRef?: string;
}): string {
  const cleanVpa = vpa.trim();
  const cleanName = payeeName.trim();
  const formattedAmount = amount.toFixed(2);
  const cleanNote = transactionNote.trim();
  const ref = transactionRef || `SM-${Date.now()}`;

  const params = new URLSearchParams({
    pa: cleanVpa,
    pn: cleanName,
    am: formattedAmount,
    cu: 'INR',
    tn: cleanNote,
    tr: ref,
  });

  return `upi://pay?${params.toString()}`;
}

/**
 * Generates an optimized QR Code image URL for scanning with GPay, PhonePe, Paytm, etc.
 */
export function getUpiQrCodeUrl(upiUrl: string, size: number = 240): string {
  const encoded = encodeURIComponent(upiUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encoded}`;
}

/**
 * Formats a Counter Bill as an itemized ASCII receipt suitable for WhatsApp sharing & thermal printing
 */
export function formatReceiptForWhatsApp(bill: CounterBill): string {
  const line = '--------------------------------';
  const doubleLine = '================================';

  let text = `*${bill.shopName.toUpperCase()}*\n`;
  text += `${bill.shopAddress}\n`;
  if (bill.shopGstin) text += `GSTIN: ${bill.shopGstin}\n`;
  text += `${doubleLine}\n`;
  text += `Bill No: *${bill.billNumber}*\n`;
  text += `Date: ${new Date(bill.createdAt).toLocaleString('en-IN')}\n`;
  if (bill.customerName) text += `Customer: ${bill.customerName}\n`;
  text += `${line}\n`;

  // Item lines
  text += `*ITEMS PURCHASED:*\n`;
  bill.items.forEach((item, idx) => {
    const total = item.unitPrice * item.quantity;
    text += `${idx + 1}. *${item.productName}*\n`;
    text += `   ${item.quantity} x ₹${item.unitPrice} = *₹${total}* (MRP: ₹${item.mrp})\n`;
  });

  text += `${line}\n`;
  text += `Total MRP: ₹${bill.totalMrp}\n`;
  if (bill.discountAmount > 0) {
    text += `Counter Discount: -₹${bill.discountAmount}\n`;
  }
  if (bill.gstAmount > 0) {
    text += `GST (${bill.gstRate}%): +₹${bill.gstAmount.toFixed(2)}\n`;
  }
  text += `${doubleLine}\n`;
  text += `*NET PAYABLE: ₹${bill.netPayable}*\n`;
  text += `*YOU SAVED: ₹${bill.totalSavings} (${Math.round((bill.totalSavings / (bill.totalMrp || 1)) * 100)}%)*\n`;
  text += `${doubleLine}\n`;
  text += `Payment: *${bill.paymentMode.toUpperCase()}* (${bill.paymentStatus.toUpperCase()})\n`;
  text += `\n_Powered by ShopMitra • Support Local Stores_`;

  return text;
}

/**
 * Generates an instant WhatsApp Web link with pre-filled receipt message
 */
export function getWhatsAppReceiptUrl(mobile: string, bill: CounterBill): string {
  const cleanMobile = mobile.replace(/\D/g, '').replace(/^0+/, '');
  const recipient = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;
  const receiptText = formatReceiptForWhatsApp(bill);
  return `https://wa.me/${recipient}?text=${encodeURIComponent(receiptText)}`;
}
