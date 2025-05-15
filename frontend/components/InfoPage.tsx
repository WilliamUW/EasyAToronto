import { Card, CardContent } from "@/components/ui/card";

import { AccountInfo } from "@/components/AccountInfo";
import { MessageContent } from "@/components/MessageContent";
import { NetworkInfo } from "@/components/NetworkInfo";
import { TransferAPT } from "@/components/TransferAPT";
import { WalletDetails } from "@/components/WalletDetails";

export function InfoPage() {
  return (
    <div className="container max-w-screen-lg mx-auto px-4 py-8 pb-24">
      <h1 className="text-2xl font-bold mb-6">Account Information</h1>
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <WalletDetails />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <NetworkInfo />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <AccountInfo />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <TransferAPT />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <MessageContent />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 