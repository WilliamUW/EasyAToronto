import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aptosClient } from "@/utils/aptosClient";
import { getMessageContent } from "@/view-functions/getMessageContent";
import { toast } from "@/components/ui/use-toast";
import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { writeMessage } from "@/entry-functions/writeMessage";

export function MessageContent() {
  const { account, signAndSubmitTransaction } = useWallet();
  const queryClient = useQueryClient();
  const [newMessageContent, setNewMessageContent] = useState<string>();

  const { data } = useQuery({
    queryKey: ["message-content"],
    refetchInterval: 10_000,
    queryFn: async () => {
      try {
        const content = await getMessageContent();
        return {
          content,
        };
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error,
        });
        return {
          content: "",
        };
      }
    },
  });

  const onClickButton = async () => {
    if (!account || !newMessageContent) {
      return;
    }

    try {
      const committedTransaction = await signAndSubmitTransaction(
        writeMessage({
          content: newMessageContent,
        }),
      );
      const executedTransaction = await aptosClient().waitForTransaction({
        transactionHash: committedTransaction.hash,
      });
      queryClient.invalidateQueries({
        queryKey: ["message-content"],
      });
      toast({
        title: "Success",
        description: `Transaction succeeded, hash: ${executedTransaction.hash}`,
      });
      setNewMessageContent("");
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to write message",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Message Board</h2>
      <div className="text-sm text-muted-foreground">
        Current message: {data?.content || "No message"}
      </div>
      <div className="flex flex-col gap-2">
        <Input 
          disabled={!account} 
          placeholder="Enter new message" 
          value={newMessageContent}
          onChange={(e) => setNewMessageContent(e.target.value)} 
        />
        <Button
          disabled={!account || !newMessageContent || newMessageContent.length === 0 || newMessageContent.length > 100}
          onClick={onClickButton}
        >
          Write Message
        </Button>
      </div>
    </div>
  );
} 