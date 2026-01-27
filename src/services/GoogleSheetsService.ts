
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const SHEET_NAME = 'FinTracker_Data';

// Data types matching our app
export interface Transaction {
    id: string;
    amount: number;
    type: 'EXPENSE' | 'INCOME';
    category: string;
    description: string;
    date: string;
    paymentMethod: string;
}

export const GoogleSheetsService = {
    spreadsheetId: null as string | null,
    accessToken: null as string | null,

    // Initialize: Find or Create Spreadsheet
    init: async () => {
        try {
            const tokens = await GoogleSignin.getTokens();
            console.log('Got tokens:', tokens);
            GoogleSheetsService.accessToken = tokens.accessToken;
            // Persist token for Headless Task
            await AsyncStorage.setItem('googleAccessToken', tokens.accessToken);

            // 1. Search for existing sheet
            const searchUrl = `${DRIVE_API_URL}?q=name='${SHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
            console.log('Searching for sheet...');
            const searchRes = await fetch(searchUrl, {
                headers: { Authorization: `Bearer ${tokens.accessToken}` }
            });

            if (!searchRes.ok) {
                const text = await searchRes.text();
                throw new Error(`Drive Search Failed: ${searchRes.status} ${text}`);
            }

            const searchData = await searchRes.json();
            console.log('Search result:', searchData);

            if (searchData.files && searchData.files.length > 0) {
                console.log('Found existing spreadsheet:', searchData.files[0].id);
                GoogleSheetsService.spreadsheetId = searchData.files[0].id;
                await AsyncStorage.setItem('userSpreadsheetId', searchData.files[0].id);
            } else {
                console.log('Creating new spreadsheet...');
                await GoogleSheetsService.createSpreadsheet();
            }
        } catch (error) {
            console.error('GoogleSheetsService Init Error:', error);
            throw error;
        }
    },

    setAuth: (accessToken: string, spreadsheetId: string) => {
        GoogleSheetsService.accessToken = accessToken;
        GoogleSheetsService.spreadsheetId = spreadsheetId;
    },

    createSpreadsheet: async () => {
        if (!GoogleSheetsService.accessToken) throw new Error("No Access Token");

        const createRes = await fetch(SHEETS_API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${GoogleSheetsService.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                properties: { title: SHEET_NAME },
                sheets: [{ properties: { title: 'Transactions' } }]
            })
        });

        if (!createRes.ok) {
            const text = await createRes.text();
            throw new Error(`Create Sheet Failed: ${createRes.status} ${text}`);
        }

        const data = await createRes.json();
        GoogleSheetsService.spreadsheetId = data.spreadsheetId;
        await AsyncStorage.setItem('userSpreadsheetId', data.spreadsheetId);
        console.log('Created spreadsheet:', data.spreadsheetId);

        // Add headers
        await GoogleSheetsService.appendRow('Transactions', ['ID', 'Date', 'Amount', 'Type', 'Category', 'Description', 'Method']);
    },

    appendRow: async (sheetTitle: string, values: any[]) => {
        if (!GoogleSheetsService.spreadsheetId || !GoogleSheetsService.accessToken) {
            await GoogleSheetsService.init();
        }

        const url = `${SHEETS_API_URL}/${GoogleSheetsService.spreadsheetId}/values/${sheetTitle}!A1:append?valueInputOption=USER_ENTERED`;

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${GoogleSheetsService.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [values]
            })
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Append Row Failed: ${res.status} ${text}`);
        }
        console.log('Row appended successfully');
    },

    // --- Transactions ---

    createTransaction: async (data: Transaction) => {
        console.log('Creating transaction in Sheets...', data);
        // ID, Date, Amount, Type, Category, Description, Method
        const row = [
            data.id || Date.now().toString(),
            data.date,
            data.amount,
            data.type,
            data.category,
            data.description,
            data.paymentMethod
        ];
        await GoogleSheetsService.appendRow('Transactions', row);
        return { ...data, id: row[0] }; // Return created transaction
    },

    // Helper for safe number parsing
    parseAmount: (value: any): number => {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        // Remove currency symbols, commas, and spaces. Keep minus sign and dot.
        // Example: "₹ 1,200.50" -> "1200.50"
        const clean = value.toString().replace(/[^0-9.-]+/g, '');
        const parsed = parseFloat(clean);
        return isNaN(parsed) ? 0 : parsed;
    },

    getTransactions: async () => {
        if (!GoogleSheetsService.spreadsheetId) await GoogleSheetsService.init();

        const url = `${SHEETS_API_URL}/${GoogleSheetsService.spreadsheetId}/values/Transactions!A2:G`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${GoogleSheetsService.accessToken}` }
        });

        if (!res.ok) {
            const text = await res.text();
            console.error(`Fetch Transactions Failed: ${res.status} ${text}`);
            return []; // Return empty on fail for now to avoid crashing UI loop
        }

        const json = await res.json();

        if (!json.values) return [];

        return json.values.map((row: any[]) => ({
            id: row[0],
            date: row[1],
            amount: GoogleSheetsService.parseAmount(row[2]),
            type: row[3],
            category: row[4],
            description: row[5],
            paymentMethod: row[6]
        }));
    },

    // Delete transaction by ID - finds row and deletes it
    deleteTransaction: async (id: string) => {
        if (!GoogleSheetsService.spreadsheetId) await GoogleSheetsService.init();

        // First, get all transactions to find the row index
        const url = `${SHEETS_API_URL}/${GoogleSheetsService.spreadsheetId}/values/Transactions!A:A`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${GoogleSheetsService.accessToken}` }
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch transactions for delete: ${res.status}`);
        }

        const json = await res.json();
        const values = json.values || [];

        // Find row index (0-indexed, but row 1 is header so we add 1)
        let rowIndex = -1;
        for (let i = 0; i < values.length; i++) {
            if (values[i][0] === id) {
                rowIndex = i;
                break;
            }
        }

        if (rowIndex === -1) {
            console.warn(`Transaction ${id} not found in sheet`);
            return false;
        }

        // Get the sheet ID first
        const sheetMetaUrl = `${SHEETS_API_URL}/${GoogleSheetsService.spreadsheetId}?fields=sheets.properties`;
        const metaRes = await fetch(sheetMetaUrl, {
            headers: { Authorization: `Bearer ${GoogleSheetsService.accessToken}` }
        });
        const metaJson = await metaRes.json();
        const transactionsSheet = metaJson.sheets?.find((s: any) => s.properties.title === 'Transactions');
        const sheetId = transactionsSheet?.properties?.sheetId || 0;

        // Delete the row using batchUpdate
        const deleteUrl = `${SHEETS_API_URL}/${GoogleSheetsService.spreadsheetId}:batchUpdate`;
        const deleteRes = await fetch(deleteUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${GoogleSheetsService.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex,
                            endIndex: rowIndex + 1
                        }
                    }
                }]
            })
        });

        if (!deleteRes.ok) {
            const text = await deleteRes.text();
            throw new Error(`Delete transaction failed: ${deleteRes.status} ${text}`);
        }

        console.log(`Transaction ${id} deleted from sheet (row ${rowIndex + 1})`);
        return true;
    },

    // Update transaction by ID - finds row and updates specific columns
    updateTransaction: async (id: string, updates: Partial<Transaction>) => {
        if (!GoogleSheetsService.spreadsheetId) await GoogleSheetsService.init();

        // Get all transactions to find the row
        const url = `${SHEETS_API_URL}/${GoogleSheetsService.spreadsheetId}/values/Transactions!A:G`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${GoogleSheetsService.accessToken}` }
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch transactions for update: ${res.status}`);
        }

        const json = await res.json();
        const values = json.values || [];

        // Find row index
        let rowIndex = -1;
        let currentRow: any[] = [];
        for (let i = 0; i < values.length; i++) {
            if (values[i][0] === id) {
                rowIndex = i + 1; // 1-indexed for A1 notation
                currentRow = values[i];
                break;
            }
        }

        if (rowIndex === -1) {
            console.warn(`Transaction ${id} not found for update`);
            return false;
        }

        // Build updated row: ID, Date, Amount, Type, Category, Description, Method
        const updatedRow = [
            currentRow[0], // ID (unchanged)
            updates.date || currentRow[1],
            updates.amount !== undefined ? updates.amount : currentRow[2],
            updates.type || currentRow[3],
            updates.category !== undefined ? updates.category : currentRow[4],
            updates.description || currentRow[5],
            updates.paymentMethod || currentRow[6]
        ];

        // Update the row
        const updateUrl = `${SHEETS_API_URL}/${GoogleSheetsService.spreadsheetId}/values/Transactions!A${rowIndex}:G${rowIndex}?valueInputOption=USER_ENTERED`;
        const updateRes = await fetch(updateUrl, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${GoogleSheetsService.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [updatedRow]
            })
        });

        if (!updateRes.ok) {
            const text = await updateRes.text();
            throw new Error(`Update transaction failed: ${updateRes.status} ${text}`);
        }

        console.log(`Transaction ${id} updated in sheet (row ${rowIndex})`);
        return true;
    },
    getActionItems: async () => {
        if (!GoogleSheetsService.spreadsheetId) await GoogleSheetsService.init();

        // First, check if ActionItems sheet exists
        const url = `${SHEETS_API_URL}/${GoogleSheetsService.spreadsheetId}/values/ActionItems!A2:D`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${GoogleSheetsService.accessToken}` }
        });

        if (!res.ok) {
            // Sheet might not exist, create it
            console.log('ActionItems sheet not found, creating...');
            await GoogleSheetsService.addSheet('ActionItems');
            await GoogleSheetsService.appendRow('ActionItems', ['ID', 'Title', 'Description', 'Done']);
            return [];
        }

        const json = await res.json();
        if (!json.values) return [];

        return json.values.map((row: any[]) => ({
            id: row[0],
            title: row[1],
            description: row[2],
            done: row[3] === 'true'
        }));
    },

    createActionItem: async (data: { title: string; description?: string }) => {
        const row = [
            Date.now().toString(),
            data.title,
            data.description || '',
            'false'
        ];
        await GoogleSheetsService.appendRow('ActionItems', row);
        return { id: row[0], title: data.title, description: data.description, done: false };
    },

    addSheet: async (sheetName: string) => {
        if (!GoogleSheetsService.spreadsheetId) return;

        const url = `${SHEETS_API_URL}/${GoogleSheetsService.spreadsheetId}:batchUpdate`;
        await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${GoogleSheetsService.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requests: [{ addSheet: { properties: { title: sheetName } } }]
            })
        });
    },

    // --- Seed Dummy Data (DISABLED) ---
    seedDummyData: async () => {
        console.log('Dummy seeding is disabled.');
    },

    // --- Budgets ---
    getBudgets: async () => {
        if (!GoogleSheetsService.spreadsheetId) await GoogleSheetsService.init();

        const url = `${SHEETS_API_URL}/${GoogleSheetsService.spreadsheetId}/values/Budgets!A2:C`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${GoogleSheetsService.accessToken}` }
        });

        if (!res.ok) return [];

        const json = await res.json();
        if (!json.values) return [];

        return json.values.map((row: any[]) => ({
            category: row[0],
            limit: parseFloat(row[1]) || 0,
            spent: parseFloat(row[2]) || 0
        }));
    },

    // --- Categories ---
    getCategories: async () => {
        if (!GoogleSheetsService.spreadsheetId) await GoogleSheetsService.init();

        const url = `${SHEETS_API_URL}/${GoogleSheetsService.spreadsheetId}/values/Categories!A2:F`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${GoogleSheetsService.accessToken}` }
        });

        if (!res.ok) {
            console.log('Categories sheet not found, creating...');
            await GoogleSheetsService.addSheet('Categories');
            await GoogleSheetsService.appendRow('Categories', ['ID', 'Key', 'Label', 'Icon', 'Color', 'IsDefault']);
            return [];
        }

        const json = await res.json();
        if (!json.values) return [];

        return json.values.map((row: any[]) => ({
            id: parseInt(row[0]) || 0,
            key: row[1],
            label: row[2],
            icon: row[3],
            color: row[4],
            isDefault: row[5] === 'true'
        }));
    },

    // --- Bank Accounts ---
    getBankAccounts: async () => {
        if (!GoogleSheetsService.spreadsheetId) await GoogleSheetsService.init();

        const url = `${SHEETS_API_URL}/${GoogleSheetsService.spreadsheetId}/values/BankAccounts!A2:E`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${GoogleSheetsService.accessToken}` }
        });

        if (!res.ok) {
            // Sheet might not exist, create it
            console.log('BankAccounts sheet not found, creating...');
            await GoogleSheetsService.addSheet('BankAccounts');
            await GoogleSheetsService.appendRow('BankAccounts', ['ID', 'Name', 'Type', 'Icon', 'Balance']);
            return [];
        }

        const json = await res.json();
        if (!json.values) return [];

        return json.values.map((row: any[]) => ({
            id: row[0],
            name: row[1],
            type: row[2]?.toLowerCase() || 'bank',
            icon: row[3],
            balance: parseFloat(row[4]) || 0
        }));
    },

    createBankAccount: async (data: { name: string; type: string; icon: string; balance: number }) => {
        // Check for duplicate name
        const existing = await GoogleSheetsService.getBankAccounts();
        const duplicate = existing.find((a: any) => a.name.toLowerCase() === data.name.toLowerCase());
        if (duplicate) {
            throw new Error(`Bank account "${data.name}" already exists`);
        }

        const id = Date.now().toString();
        await GoogleSheetsService.appendRow('BankAccounts', [
            id, data.name, data.type.toUpperCase(), data.icon, data.balance
        ]);
        return { id, ...data };
    },

    updateBankAccount: async (id: string, data: Partial<{ name: string; type: string; icon: string; balance: number }>) => {
        if (!GoogleSheetsService.spreadsheetId) await GoogleSheetsService.init();

        // Get current accounts to find row index
        const accounts = await GoogleSheetsService.getBankAccounts();
        const existingIndex = accounts.findIndex((a: any) => a.id === id);

        if (existingIndex >= 0) {
            const oldAccount = accounts[existingIndex];
            const updated = {
                id,
                name: data.name ?? oldAccount.name,
                type: data.type ?? oldAccount.type,
                icon: data.icon ?? oldAccount.icon,
                balance: data.balance ?? oldAccount.balance,
            };

            // Update row (row index = existingIndex + 2 because of header and 1-indexing)
            const rowNum = existingIndex + 2;
            const url = `${SHEETS_API_URL}/${GoogleSheetsService.spreadsheetId}/values/BankAccounts!A${rowNum}:E${rowNum}?valueInputOption=USER_ENTERED`;

            await fetch(url, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${GoogleSheetsService.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values: [[updated.id, updated.name, updated.type?.toUpperCase(), updated.icon, updated.balance]]
                })
            });
        }
    },

    deleteBankAccount: async (id: string) => {
        if (!GoogleSheetsService.spreadsheetId) await GoogleSheetsService.init();

        // Get current accounts to find row index
        const accounts = await GoogleSheetsService.getBankAccounts();
        const existingIndex = accounts.findIndex((a: any) => a.id === id);

        if (existingIndex >= 0) {
            // Row index = existingIndex + 1 (0-indexed with header row considered)
            const rowIndex = existingIndex + 1; // +1 for header row

            // Get sheet ID for BankAccounts
            const metaUrl = `${SHEETS_API_URL}/${GoogleSheetsService.spreadsheetId}?fields=sheets(properties)`;
            const metaRes = await fetch(metaUrl, {
                headers: { Authorization: `Bearer ${GoogleSheetsService.accessToken}` }
            });
            const metaData = await metaRes.json();
            const sheet = metaData.sheets?.find((s: any) => s.properties.title === 'BankAccounts');

            if (sheet) {
                const sheetId = sheet.properties.sheetId;

                // Delete the row using batchUpdate
                const batchUrl = `${SHEETS_API_URL}/${GoogleSheetsService.spreadsheetId}:batchUpdate`;
                await fetch(batchUrl, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${GoogleSheetsService.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        requests: [{
                            deleteDimension: {
                                range: {
                                    sheetId: sheetId,
                                    dimension: 'ROWS',
                                    startIndex: rowIndex,
                                    endIndex: rowIndex + 1
                                }
                            }
                        }]
                    })
                });
                console.log('Bank account deleted successfully');
            }
        }
    },

    // --- Update Budget ---
    updateBudget: async (category: string, limit: number) => {
        if (!GoogleSheetsService.spreadsheetId) await GoogleSheetsService.init();

        // Get current budgets to find row index
        const budgets = await GoogleSheetsService.getBudgets();
        const existingIndex = budgets.findIndex((b: any) => b.category.toLowerCase() === category.toLowerCase());

        if (existingIndex >= 0) {
            // Update existing row (row index = existingIndex + 2 because of header and 1-indexing)
            const rowNum = existingIndex + 2;
            const url = `${SHEETS_API_URL}/${GoogleSheetsService.spreadsheetId}/values/Budgets!A${rowNum}:C${rowNum}?valueInputOption=USER_ENTERED`;

            await fetch(url, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${GoogleSheetsService.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values: [[category, limit, budgets[existingIndex].spent]]
                })
            });
        } else {
            // Add new budget
            await GoogleSheetsService.appendRow('Budgets', [category, limit, 0]);
        }
    },

    // --- Needs Review Transactions (uncategorized) ---
    getNeedsReviewTransactions: async () => {
        const allTx = await GoogleSheetsService.getTransactions();
        return allTx.filter((t: any) => !t.category || t.category === 'uncategorized' || t.category === '');
    }
};
