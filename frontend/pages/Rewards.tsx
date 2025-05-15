import { BookOpen, Building2, Crown, MessageSquare, Video } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { getAccountBBTBalance } from "@/view-functions/getAccountBalance";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

interface Reward {
  id: string;
  title: string;
  description: string;
  cost: number;
  icon: React.ReactNode;
  gradient: string;
}

const rewards: Reward[] = [
  {
    id: "premium",
    title: "BehavioralBuddy Premium",
    description: "Unlock unlimited AI-generated answers, company-specific insights, tone/style variations, and more.",
    cost: 100,
    icon: <Crown className="h-8 w-8" />,
    gradient: "from-yellow-400 to-yellow-600",
  },
  {
    id: "mock-interviews",
    title: "Mock Interviews",
    description: "Redeem BBT for live mock interviews with mentors or AI avatars (video/chat).",
    cost: 50,
    icon: <Video className="h-8 w-8" />,
    gradient: "from-blue-400 to-blue-600",
  },
  {
    id: "question-packs",
    title: "Question Packs",
    description: "Access premium packs of real interview questions (sorted by company, role, difficulty).",
    cost: 30,
    icon: <BookOpen className="h-8 w-8" />,
    gradient: "from-green-400 to-green-600",
  },
  {
    id: "feedback",
    title: "Personalized Feedback",
    description: "Upload your answer and get feedback from AI or vetted reviewers.",
    cost: 25,
    icon: <MessageSquare className="h-8 w-8" />,
    gradient: "from-purple-400 to-purple-600",
  },
  {
    id: "company-guides",
    title: "Company Guides",
    description: "Redeem for detailed prep guides per company based on crowdsourced data.",
    cost: 40,
    icon: <Building2 className="h-8 w-8" />,
    gradient: "from-red-400 to-red-600",
  },
];

export default function Rewards() {
  const { account } = useWallet();

  const { data: bbtBalance } = useQuery({
    queryKey: ["bbt-balance", account?.address],
    refetchInterval: 10_000,
    queryFn: async () => {
      if (!account) return 0;
      try {
        const balance = await getAccountBBTBalance({ accountAddress: account.address.toStringLong() });
        return balance;
      } catch (error) {
        console.error("Error fetching BBT balance:", error);
        return 0;
      }
    },
  });

  const handleRedeem = (reward: Reward) => {
    if (!bbtBalance || bbtBalance < reward.cost) {
      toast.error("Insufficient BBT balance");
      return;
    }
    // TODO: Implement redemption logic
    toast.success(`Successfully redeemed ${reward.title}!`);
  };

  return (
    <div className="container max-w-screen-lg mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Rewards Center</h1>
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-4 py-2 rounded-full">
            <span className="font-medium">BBT Balance: {bbtBalance || 0}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rewards.map((reward) => (
          <motion.div
            key={reward.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`bg-gradient-to-r ${reward.gradient} p-3 rounded-lg text-white`}>
                    {reward.icon}
                  </div>
                  <div>
                    <CardTitle>{reward.title}</CardTitle>
                    <CardDescription>{reward.cost} BBT</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{reward.description}</p>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700"
                  onClick={() => handleRedeem(reward)}
                  disabled={!bbtBalance || bbtBalance < reward.cost}
                >
                  {!bbtBalance || bbtBalance < reward.cost ? "Insufficient BBT" : "Redeem"}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
} 