/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_SCRIPT_URL: string
    readonly VITE_APP_SCRIPT_URL_MASTER: string
    readonly VITE_IDENT_ATTACHMENT_FOLDER: string
    readonly VITE_COMPARISON_SHEET_FOLDER: string
    readonly VITE_PURCHASE_ORDERS_FOLDER: string
    readonly VITE_BILL_PHOTO_FOLDER: string
    readonly VITE_PRODUCT_PHOTO_FOLDER: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
