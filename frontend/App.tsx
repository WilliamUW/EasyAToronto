// Internal Components
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { InfoPage } from "@/components/InfoPage";
import { MessageBoard } from "@/components/MessageBoard";
import Preparation from "@/pages/Preparation";
import Rewards from "@/pages/Rewards";
import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

function App() {
  const { connected } = useWallet();
  const [currentPage, setCurrentPage] = useState<"home" | "preparation" | "rewards" | "info">("home");

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <MessageBoard />;
      case "preparation":
        return <Preparation />;
      case "rewards":
        return <Rewards />;
      case "info":
        return <InfoPage />;
      default:
        return <MessageBoard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* <TopBanner /> */}
      <Header />
      
      {connected ? (
        <div className="container max-w-screen-lg mx-auto px-4 py-8 pb-24">
          {renderPage()}
        </div>
      ) : (
        <div className="container max-w-screen-lg mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Connect a wallet to get started</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {connected && <BottomNav currentPage={currentPage} onPageChange={setCurrentPage} />}
    </div>
  );
}

export default App;
