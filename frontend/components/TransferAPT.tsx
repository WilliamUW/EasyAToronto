import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aptosClient } from "@/utils/aptosClient";
import { getAccountAPTBalance } from "@/view-functions/getAccountBalance";
// Internal components
import { toast } from "@/components/ui/use-toast";
import { transferAPT } from "@/entry-functions/transferAPT";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

interface TransferAPTProps {
  recipient?: string;
  amount?: number;
  onSuccess?: () => void;
}

export function TransferAPT({ recipient: initialRecipient, amount: initialAmount, onSuccess }: TransferAPTProps) {
  const { account, signAndSubmitTransaction } = useWallet();
  const queryClient = useQueryClient();

  const [aptBalance, setAptBalance] = useState<number>(0);
  const [recipient, setRecipient] = useState<string>(initialRecipient || "");
  const [transferAmount, setTransferAmount] = useState<number>(initialAmount || 0);

  const { data } = useQuery({
    queryKey: ["apt-balance", account?.address],
    refetchInterval: 10_000,
    queryFn: async () => {
      try {
        if (account === null) {
          console.error("Account not available");
        }

        const balance = await getAccountAPTBalance({ accountAddress: account!.address.toStringLong() });

        return {
          balance,
        };
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error,
        });
        return {
          balance: 0,
        };
      }
    },
  });

  const onClickButton = async () => {
    if (!account || !recipient || !transferAmount) {
      return;
    }

    try {
      const committedTransaction = await signAndSubmitTransaction(
        transferAPT({
          to: recipient,
          // APT is 8 decimal places
          amount: Math.pow(10, 8) * transferAmount,
        }),
      );
      const executedTransaction = await aptosClient().waitForTransaction({
        transactionHash: committedTransaction.hash,
      });
      queryClient.invalidateQueries();
      toast({
        title: "Success",
        description: `Transaction succeeded, hash: ${executedTransaction.hash}`,
      });
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to transfer APT",
      });
    }
  };

  useEffect(() => {
    if (data) {
      setAptBalance(data.balance);
    }
  }, [data]);

  return (
    <div className="flex flex-col gap-6">
      <h4 className="text-lg font-medium">APT balance: {aptBalance / Math.pow(10, 8)}</h4>
      Recipient <Input 
        disabled={!account || !!initialRecipient} 
        placeholder="0x1" 
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)} 
      />
      Amount{" "}
      <Input 
        disabled={!account || !!initialAmount} 
        placeholder="100" 
        value={transferAmount || ""}
        onChange={(e) => setTransferAmount(parseFloat(e.target.value))} 
      />
      <Button
        disabled={!account || !recipient || !transferAmount || transferAmount > aptBalance || transferAmount <= 0}
        onClick={onClickButton}
      >
        Transfer
      </Button>
    </div>
  );
}
