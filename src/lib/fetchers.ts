import type { IndentSheet, MasterSheet, ReceivedSheet, Sheet } from '@/types';
import type { InventorySheet, PoMasterSheet, UserPermissions, Vendor } from '@/types/sheets';

export async function uploadFile(file: File, folderId: string, uploadType: 'upload' | 'email' = 'upload', email?: string): Promise<string> {
    const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64String = (reader.result as string)?.split(',')[1]; // Remove data:type;base64, prefix
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const form = new FormData();
    form.append('action', 'upload');
    form.append('fileName', file.name);
    form.append('mimeType', file.type);
    form.append('fileData', base64);
    form.append('folderId', folderId);
    form.append('uploadType', uploadType);
    if (uploadType === "email") {
        form.append('email', email!);
        form.append('emailSubject', "Purchase Order");
        form.append('emailBody', "Please find attached PO.");
    }

    const response = await fetch(import.meta.env.VITE_APP_SCRIPT_URL, {
        method: 'POST',
        body: form,
        redirect: 'follow',
    });

    console.log(response)
    if (!response.ok) throw new Error('Failed to upload file');
    const res = await response.json();
    console.log(res)
    if (!res.success) throw new Error('Failed to upload data');

    return res.fileUrl as string;
}

export async function fetchSheet(
    sheetName: Sheet
): Promise<MasterSheet | IndentSheet[] | ReceivedSheet[] | UserPermissions[] | PoMasterSheet[] | InventorySheet[]> {
    const url = `${import.meta.env.VITE_APP_SCRIPT_URL}?sheetName=${encodeURIComponent(sheetName)}`;
    const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
    });

    if (!response.ok) throw new Error('Failed to fetch data');
    const raw = await response.json();
    if (!raw.success) throw new Error('Something went wrong when parsing data');

    if (sheetName === 'MASTER') {
        const data = raw.options;

        // @ts-expect-error Assuming data is structured correctly
        const length = Math.max(...Object.values(data).map((arr) => arr.length));

        const vendors: Vendor[] = [];
        const groupHeads: Record<string, Set<string>> = {};
        const departments = new Set<string>();
        const paymentTerms = new Set<string>();
        const defaultTerms = new Set<string>();

        for (let i = 0; i < length; i++) {
            const vendorName = data.vendorName?.[i];
            const gstin = data.vendorGstin?.[i];
            const address = data.vendorAddress?.[i];
            const email = data.vendorEmail?.[i];
            if (vendorName && gstin && address) {
                vendors.push({ vendorName, gstin, address, email });
            }

            if (data.department?.[i]) departments.add(data.department[i]);
            if (data.paymentTerm?.[i]) paymentTerms.add(data.paymentTerm[i]);
            if (data.defaultTerms?.[i]) defaultTerms.add(data.defaultTerms[i])

            const group = data.groupHead?.[i];
            const item = data.itemName?.[i];
            if (group && item) {
                if (!groupHeads[group]) groupHeads[group] = new Set();
                groupHeads[group].add(item);
            }
        }

        return {
            vendors,
            departments: [...departments],
            paymentTerms: [...paymentTerms],
            groupHeads: Object.fromEntries(Object.entries(groupHeads).map(([k, v]) => [k, [...v]])),
            companyPan: data.companyPan,
            companyName: data.companyName,
            companyAddress: data.companyAddress,
            companyPhone: data.companyPhone,
            companyGstin: data.companyGstin,
            billingAddress: data.billingAddress,
            destinationAddress: data.destinationAddress,
            defaultTerms: [...defaultTerms]
        };
    }
    return raw.rows.filter((r: IndentSheet) => r.timestamp !== '');
}

export async function postToSheet(
    data:
        | Partial<IndentSheet>[]
        | Partial<ReceivedSheet>[]
        | Partial<UserPermissions>[]
        | Partial<PoMasterSheet>[]
        | Record<string, any>[],
    action: 'insert' | 'update' | 'delete' = 'insert',
    sheet: Sheet = 'INDENT'
) {
    // Use MASTER URL for VENDOR, PRODUCT, and PURCHASE sheet operations
    const scriptUrl = (sheet === 'VENDOR' || sheet === 'PRODUCT' || sheet === 'PURCHASE')
        ? import.meta.env.VITE_APP_SCRIPT_URL_MASTER
        : import.meta.env.VITE_APP_SCRIPT_URL;

    console.log(`Using URL for ${sheet}:`, scriptUrl);

    // Create URL with parameters for better Google Apps Script compatibility
    const params = new URLSearchParams();
    params.append('action', action);
    params.append('sheetName', sheet);
    params.append('rows', JSON.stringify(data));

    const url = `${scriptUrl}?${params.toString()}`;

    const response = await fetch(url, {
        method: 'POST',
        redirect: 'follow',
    });

    if (!response.ok) {
        console.error(`Error in fetch: ${response.status} - ${response.statusText}`);
        throw new Error(`Failed to ${action} data`)
    };
    const res = await response.json();
    if (!res.success) {
        console.error(`Error in response: ${res.message}`);
        throw new Error('Something went wrong in the API')
    };
}

// Separate function for Dashboard vendor/product submissions to Purchase sheet
export async function postToMasterSheet(
    data: Record<string, any>[],
    sheetType: 'VENDOR' | 'PRODUCT' | 'TRANSPORTER'
) {
    const scriptUrl = import.meta.env.VITE_APP_SCRIPT_URL_MASTER;

    console.log(`Submitting ${sheetType} to Purchase sheet using MASTER URL:`, scriptUrl);

    // Create URL with parameters - Using GET to avoid CORS/401 issues
    const params = new URLSearchParams();
    params.append('action', 'insert');
    params.append('sheetName', sheetType);
    params.append('rows', JSON.stringify(data));

    const url = `${scriptUrl}?${params.toString()}`;

    console.log('Request URL:', url);

    const response = await fetch(url, {
        method: 'GET', // Changed to GET to bypass CORS/401 issues
        redirect: 'follow',
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
        console.error(`Error in fetch: ${response.status} - ${response.statusText}`);
        throw new Error(`Failed to submit ${sheetType} data`)
    };

    const res = await response.json();
    console.log('Response data:', res);

    if (!res.success) {
        console.error(`Error in response: ${res.message}`);
        throw new Error('Something went wrong in the API')
    };
}
