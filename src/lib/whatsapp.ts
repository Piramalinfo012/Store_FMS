import { fetchSheet, postToSheet } from './fetchers';

export interface WhatsAppRecipient {
    name: string;
    phone: string;
}

export interface MaytapiConfig {
    enabled: boolean;
    productId: string;
    phoneId: string;
    token: string;
    purchaseRecipients: WhatsAppRecipient[]; // 4 people for Purchase indents
    storeOutRecipients: WhatsAppRecipient[]; // 2 people for Store Out approval
}

const STORAGE_KEY = 'store-fms:maytapi-config';
const LOGS_STORAGE_KEY = 'store-fms:whatsapp-logs';

export function loadLocalWhatsAppLogs(): WhatsappLogRow[] {
    try {
        const raw = localStorage.getItem(LOGS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveLocalWhatsAppLogs(rows: WhatsappLogRow[]) {
    if (rows.length === 0) return;
    try {
        const existing = loadLocalWhatsAppLogs();
        const combined = [...rows, ...existing].slice(0, 500);
        localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(combined));
    } catch {
        // Ignore storage quota errors
    }
}

export function getDefaultMaytapiConfig(): MaytapiConfig {
    return {
        enabled: false,
        productId: '',
        phoneId: '',
        token: '',
        purchaseRecipients: [
            { name: '', phone: '' },
            { name: '', phone: '' },
            { name: '', phone: '' },
            { name: '', phone: '' },
        ],
        storeOutRecipients: [
            { name: '', phone: '' },
            { name: '', phone: '' },
        ],
    };
}

export function loadMaytapiConfig(): MaytapiConfig {
    const defaults = getDefaultMaytapiConfig();
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaults;
        const parsed = JSON.parse(raw) as Partial<MaytapiConfig>;
        return {
            enabled: Boolean(parsed.enabled),
            productId: String(parsed.productId || ''),
            phoneId: String(parsed.phoneId || ''),
            token: String(parsed.token || ''),
            purchaseRecipients: Array.from({ length: 4 }, (_, i) => ({
                name: String(parsed.purchaseRecipients?.[i]?.name || ''),
                phone: String(parsed.purchaseRecipients?.[i]?.phone || ''),
            })),
            storeOutRecipients: Array.from({ length: 2 }, (_, i) => ({
                name: String(parsed.storeOutRecipients?.[i]?.name || ''),
                phone: String(parsed.storeOutRecipients?.[i]?.phone || ''),
            })),
        };
    } catch {
        return defaults;
    }
}

export function saveMaytapiConfig(config: MaytapiConfig) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function normalizeParsedConfig(parsed: Partial<MaytapiConfig>): MaytapiConfig {
    return {
        enabled: Boolean(parsed.enabled),
        productId: String(parsed.productId || ''),
        phoneId: String(parsed.phoneId || ''),
        token: String(parsed.token || ''),
        purchaseRecipients: Array.from({ length: 4 }, (_, i) => ({
            name: String(parsed.purchaseRecipients?.[i]?.name || ''),
            phone: String(parsed.purchaseRecipients?.[i]?.phone || ''),
        })),
        storeOutRecipients: Array.from({ length: 2 }, (_, i) => ({
            name: String(parsed.storeOutRecipients?.[i]?.name || ''),
            phone: String(parsed.storeOutRecipients?.[i]?.phone || ''),
        })),
    };
}

export async function saveMaytapiConfigToSheet(config: MaytapiConfig): Promise<boolean> {
    saveMaytapiConfig(config);
    try {
        await postToSheet(
            [
                {
                    timestamp: new Date().toISOString(),
                    indentNo: 'CONFIG',
                    indentType: 'SYSTEM_CONFIG',
                    recipientName: 'Maytapi Config',
                    phone: '-',
                    message: 'WhatsApp settings updated',
                    status: config.enabled ? 'Active' : 'Inactive',
                    response: '-',
                    config: JSON.stringify(config),
                },
            ],
            'insert',
            'Whatsapp Log'
        );
        return true;
    } catch {
        return false;
    }
}

export async function loadMaytapiConfigFromSheet(): Promise<MaytapiConfig | null> {
    try {
        const rows = (await fetchSheet('Whatsapp Log')) as unknown as WhatsappLogRow[];
        if (!Array.isArray(rows)) return null;
        for (let i = rows.length - 1; i >= 0; i--) {
            const rawConfig = rows[i]?.config;
            if (typeof rawConfig === 'string' && rawConfig.trim().startsWith('{')) {
                const parsed = JSON.parse(rawConfig) as Partial<MaytapiConfig>;
                const normalized = normalizeParsedConfig(parsed);
                saveMaytapiConfig(normalized);
                return normalized;
            }
        }
        return null;
    } catch {
        return null;
    }
}

export async function getEffectiveMaytapiConfig(): Promise<MaytapiConfig> {
    const local = loadMaytapiConfig();
    if (local.enabled && local.productId.trim() && local.phoneId.trim() && local.token.trim()) {
        return local;
    }
    const remote = await loadMaytapiConfigFromSheet();
    return remote || local;
}

export function normalizeWhatsAppNumber(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) return `91${digits}`;
    return digits;
}

export interface WhatsappLogRow {
    timestamp: string;
    indentNo: string;
    indentType: string;
    recipientName: string;
    phone: string;
    message: string;
    status: string;
    response: string;
    config?: string;
}

export async function logWhatsAppToSheet(rows: WhatsappLogRow[]) {
    if (rows.length === 0) return;
    saveLocalWhatsAppLogs(rows);
    try {
        await postToSheet(rows, 'insert', 'Whatsapp Log');
    } catch {
        // Ignore if Whatsapp Log sheet headers are not yet configured
    }
}

export async function sendMaytapiMessage(
    config: MaytapiConfig,
    toNumber: string,
    message: string
): Promise<{ ok: boolean; detail: string }> {
    const cleanNumber = normalizeWhatsAppNumber(toNumber);
    if (!cleanNumber) {
        return { ok: false, detail: 'Empty phone number' };
    }
    const url = `https://api.maytapi.com/api/${encodeURIComponent(config.productId.trim())}/${encodeURIComponent(config.phoneId.trim())}/sendMessage`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-maytapi-key': config.token.trim(),
        },
        body: JSON.stringify({
            to_number: cleanNumber,
            type: 'text',
            message,
        }),
    });
    const text = await res.text();
    if (!res.ok) {
        return { ok: false, detail: `HTTP ${res.status}: ${text}` };
    }
    return { ok: true, detail: text };
}

async function dispatchToRecipients(params: {
    config: MaytapiConfig;
    recipients: WhatsAppRecipient[];
    indentNumber: string;
    indentType: string;
    message: string;
}): Promise<{ sent: number; failed: number; skipped: boolean }> {
    const validRecipients = params.recipients.filter(
        (r) => normalizeWhatsAppNumber(r.phone) !== ''
    );
    if (validRecipients.length === 0) {
        return { sent: 0, failed: 0, skipped: true };
    }

    const now = new Date().toISOString();
    let sent = 0;
    let failed = 0;
    const logRows: WhatsappLogRow[] = [];

    await Promise.all(
        validRecipients.map(async (recipient) => {
            const cleanPhone = normalizeWhatsAppNumber(recipient.phone);
            try {
                const result = await sendMaytapiMessage(params.config, cleanPhone, params.message);
                if (result.ok) sent++;
                else failed++;

                logRows.push({
                    timestamp: now,
                    indentNo: params.indentNumber,
                    indentType: params.indentType,
                    recipientName: recipient.name || '-',
                    phone: cleanPhone,
                    message: params.message,
                    status: result.ok ? 'Sent' : 'Failed',
                    response: result.detail.slice(0, 250),
                });
            } catch (err) {
                failed++;
                logRows.push({
                    timestamp: now,
                    indentNo: params.indentNumber,
                    indentType: params.indentType,
                    recipientName: recipient.name || '-',
                    phone: cleanPhone,
                    message: params.message,
                    status: 'Error',
                    response: err instanceof Error ? err.message : 'Network error',
                });
            }
        })
    );

    await logWhatsAppToSheet(logRows);

    return { sent, failed, skipped: false };
}

export async function sendIndentApprovedWhatsAppNotifications(params: {
    indentNumber: string;
    indenterName: string;
    department: string;
    productName: string;
    approvedQuantity: number;
    unit: string;
    approvedBy?: string;
    remark?: string;
}): Promise<{ sent: number; failed: number; skipped: boolean }> {
    const config = await getEffectiveMaytapiConfig();
    if (!config.enabled || !config.productId.trim() || !config.phoneId.trim() || !config.token.trim()) {
        return { sent: 0, failed: 0, skipped: true };
    }

    const message = [
        '✅ *Purchase Indent Approved*',
        `*Indent No:* ${params.indentNumber}`,
        `*Indenter:* ${params.indenterName}`,
        `*Department:* ${params.department}`,
        `*Product:* ${params.productName}`,
        `*Approved Qty:* ${params.approvedQuantity} ${params.unit}`,
        ...(params.approvedBy ? [`*Approved By:* ${params.approvedBy}`] : []),
        ...(params.remark ? [`*Remark:* ${params.remark}`] : []),
        '',
        'Ready for *Initiate Purchase* / *Receive Items*.',
    ].join('\n');

    const combinedRecipients: WhatsAppRecipient[] = [];
    const seenPhones = new Set<string>();
    for (const recipient of [...config.purchaseRecipients, ...config.storeOutRecipients]) {
        const cleanPhone = normalizeWhatsAppNumber(recipient.phone);
        if (!cleanPhone || seenPhones.has(cleanPhone)) continue;
        seenPhones.add(cleanPhone);
        combinedRecipients.push(recipient);
    }

    return dispatchToRecipients({
        config,
        recipients: combinedRecipients,
        indentNumber: params.indentNumber,
        indentType: 'Purchase Approved',
        message,
    });
}

export async function sendIndentWhatsAppNotifications(params: {
    indentNumber: string;
    indentType: 'Purchase' | 'Store Out';
    indenterName: string;
    indentApprovedBy: string;
    products: {
        department: string;
        groupHead: string;
        productName: string;
        quantity: number;
        uom: string;
        areaOfUse: string;
    }[];
}): Promise<{ sent: number; failed: number; skipped: boolean }> {
    const config = await getEffectiveMaytapiConfig();
    if (!config.enabled || !config.productId.trim() || !config.phoneId.trim() || !config.token.trim()) {
        return { sent: 0, failed: 0, skipped: true };
    }

    const recipients =
        params.indentType === 'Purchase' ? config.purchaseRecipients : config.storeOutRecipients;

    const itemLines = params.products
        .map(
            (p, idx) =>
                `${idx + 1}. *${p.productName}* — ${p.quantity} ${p.uom} (${p.department} | ${p.areaOfUse})`
        )
        .join('\n');

    const title =
        params.indentType === 'Purchase'
            ? '🛒 *New Purchase Indent Raised*'
            : '📦 *New Store Out Approval Request*';

    const approvalLink =
        params.indentType === 'Store Out' && typeof window !== 'undefined'
            ? `${window.location.origin}/store-out-approval?indent=${encodeURIComponent(params.indentNumber)}`
            : '';

    const actionHint =
        params.indentType === 'Purchase'
            ? 'Please review in *Approve Indent*.'
            : approvalLink
              ? `Please review & approve here:\n${approvalLink}`
              : 'Please review in *Store Out Approval*.';

    const message = [
        title,
        `*Indent No:* ${params.indentNumber}`,
        `*Indenter:* ${params.indenterName}`,
        `*Approved By:* ${params.indentApprovedBy}`,
        `*Items:*`,
        itemLines,
        '',
        actionHint,
    ].join('\n');

    return dispatchToRecipients({
        config,
        recipients,
        indentNumber: params.indentNumber,
        indentType: params.indentType,
        message,
    });
}
