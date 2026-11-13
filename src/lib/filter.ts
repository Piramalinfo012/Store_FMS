import type { IndentSheet, ReceivedSheet } from '@/types';

type Filters = {
    startDate?: string; // ISO date string
    endDate?: string; // ISO date string
    vendors?: string[];
    products?: string[];
};

export function analyzeData(
    {
        indentSheet,
        receivedSheet,
    }: {
        indentSheet: IndentSheet[];
        receivedSheet: ReceivedSheet[];
    },
    filters: Filters = {}
) {
    const start = filters.startDate ? new Date(filters.startDate) : null;
    const end = filters.endDate ? new Date(filters.endDate) : null;
    start?.setHours(0, 0, 0, 0);
    end?.setHours(23, 59, 59, 999);

    const normalize = (value?: string) => (value ?? '').trim().toLowerCase();
    const vendorSet = new Set((filters.vendors ?? []).map(normalize));
    const productSet = new Set((filters.products ?? []).map(normalize));

    const isWithinDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toString() !== 'Invalid Date' && (!start || d >= start) && (!end || d <= end);
    };

    const isVendorMatch = (name: string) => vendorSet.size === 0 || vendorSet.has(normalize(name));
    const isProductMatch = (name: string) => productSet.size === 0 || productSet.has(normalize(name));

    // Map from indentNumber to productName
    const indentProductMap = new Map<string, string>();
    for (const indent of indentSheet) {
        indentProductMap.set(indent.indentNumber, indent.productName);
    }

    // -------------------------------
    // Approved Indents
    const approvedIndents = indentSheet.filter(
        (i) =>
            ["three party", "regular", "regular vendor", "new vendor"].includes(normalize(i.vendorType)) &&
            isWithinDate(i.actual1 || i.timestamp) &&
            isVendorMatch(i.approvedVendorName) &&
            isProductMatch(i.productName)
    );

    const totalApprovedQuantity = approvedIndents.reduce(
        (sum, i) => sum + (i.approvedQuantity ?? 0),
        0
    );

    // -------------------------------
    // Purchases
    const receivedPurchases = receivedSheet.filter((r) => {
        const productName = indentProductMap.get(r.indentNumber);
        return (
            isWithinDate(r.timestamp) &&
            isVendorMatch(r.vendor) &&
            isProductMatch(productName ?? '')
        );
    });

    const totalPurchasedQuantity = receivedPurchases.reduce(
        (sum, r) => sum + (r.receivedQuantity ?? 0),
        0
    );

    // -------------------------------
    // Issued Items
    const issuedIndents = indentSheet.filter(
        (i) =>
            ['issued', 'approved'].includes(normalize(i.issueStatus)) &&
            isWithinDate(i.actual6 || i.timestamp) &&
            isVendorMatch(i.approvedVendorName) &&
            isProductMatch(i.productName)
    );

    const totalIssuedQuantity = issuedIndents.reduce(
        (sum, i) => sum + (i.issuedQuantity ?? 0),
        0
    );

    // -------------------------------
    // Top 10 Products
    const productFrequencyMap = new Map<string, { freq: number; quantity: number }>();

    for (const r of receivedPurchases) {
        const productName = indentProductMap.get(r.indentNumber);
        if (!productName || !isProductMatch(productName)) continue;

        if (!productFrequencyMap.has(productName)) {
            productFrequencyMap.set(productName, { freq: 0, quantity: 0 });
        }
        const entry = productFrequencyMap.get(productName)!;
        entry.freq += 1;
        entry.quantity += r.receivedQuantity;
    }

    const topProducts = [...productFrequencyMap.entries()]
        .sort((a, b) => b[1].freq - a[1].freq)
        .slice(0, 10)
        .map(([name, data]) => ({ name, ...data }));

    // -------------------------------
    // Top 10 Vendors
    const vendorMap = new Map<string, { orders: number; quantity: number }>();

    for (const r of receivedPurchases) {

        if (!vendorMap.has(r.vendor)) {
            vendorMap.set(r.vendor, { orders: 0, quantity: 0 });
        }
        const entry = vendorMap.get(r.vendor)!;
        entry.orders += 1;
        entry.quantity += r.receivedQuantity;
    }

    const topVendors = [...vendorMap.entries()]
        .sort((a, b) => b[1].orders - a[1].orders)
        .slice(0, 10)
        .map(([name, data]) => ({ name, ...data }));

    const indentMap = new Map(indentSheet.map((indent) => [indent.indentNumber, indent]));
    const groups = new Map<string, { quantity: number; products: Map<string, number> }>();
    for (const receipt of receivedPurchases) {
        const indent = indentMap.get(receipt.indentNumber);
        const name = indent?.groupHead?.trim() || 'Unassigned';
        const product = indent?.productName?.trim() || 'Unknown product';
        const quantity = Number(receipt.receivedQuantity) || 0;
        if (quantity <= 0) continue;
        if (!groups.has(name)) groups.set(name, { quantity: 0, products: new Map() });
        const group = groups.get(name)!;
        group.quantity += quantity;
        group.products.set(product, (group.products.get(product) ?? 0) + quantity);
    }
    const groupHeads = [...groups].map(([name, group]) => ({
        name, quantity: group.quantity,
        products: [...group.products].map(([name, quantity]) => ({ name, quantity })),
    })).sort((a, b) => b.quantity - a.quantity);

    // -------------------------------
    return {
        approvedIndentCount: approvedIndents.length,
        totalApprovedQuantity,
        receivedPurchaseCount: receivedPurchases.length,
        totalPurchasedQuantity,
        issuedIndentCount: issuedIndents.length,
        totalIssuedQuantity,
        topProducts,
        topVendors,
        groupHeads,
    };
}
