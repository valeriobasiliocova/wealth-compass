import { useFinance } from '@/contexts/FinanceContext';
import { CryptoTable } from '@/components/dashboard/CryptoTable';

export default function CryptoPage() {
    const finance = useFinance();

    return (
        <div className="min-h-screen bg-background dark p-6 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gradient">Crypto Assets</h1>
                <p className="text-muted-foreground">Manage your cryptocurrency holdings</p>
            </div>

            <CryptoTable
                holdings={finance.data.crypto}
                onAdd={finance.addCrypto}
                onUpdate={finance.updateCrypto}
                onDelete={finance.deleteCrypto}
            />
        </div>
    );
}
