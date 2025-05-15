import { ArrowDown, ArrowUp, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { API_BASE_URL } from '../config';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { aptosClient } from "@/utils/aptosClient";
import { companyDescriptions } from "@/lib/companyDescriptions";
import { earnBBT } from "@/entry-functions/earnBBT";
import { getAllInterviewQuestions } from "@/view-functions/getAllInterviewQuestions";
import { getInterviewHistory } from "@/view-functions/getInterviewHistory";
// Internal components
import { toast } from "@/components/ui/use-toast";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

interface InterviewQuestion {
  company_name: string;
  interview_question: string;
  timestamp: string;
  user_address: string;
}

const PLACEHOLDER_BANNERS = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=1200&q=80",
];

const PLACEHOLDER_USER_PROFILES = [
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/men/65.jpg",
  "https://randomuser.me/api/portraits/women/68.jpg",
];

export function MessageBoard() {
  const { account, signAndSubmitTransaction } = useWallet();
  const queryClient = useQueryClient();
  const [companyName, setCompanyName] = useState<string>("");
  const [interviewQuestion, setInterviewQuestion] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"overview" | "questions" | "add" | "reviews" | "jobs" | "salaries" | "benefits" | "photos" | "diversity">("overview");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [voteState, setVoteState] = useState<Record<string, number>>({});
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyQuestion, setNewCompanyQuestion] = useState("");
  const [interviewEmailPreview, setInterviewEmailPreview] = useState<string | null>(null);
  const interviewEmailFileInputRef = useRef<HTMLInputElement>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyResponse, setVerifyResponse] = useState<string | null>(null);
  const handleInterviewEmailDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = ev => setInterviewEmailPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };
  const handleInterviewEmailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => setInterviewEmailPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const { data: interviewHistory } = useQuery({
    queryKey: ["interview-history", account?.address],
    refetchInterval: 10_000,
    queryFn: async () => {
      if (!account?.address) return [];
      try {
        return await getInterviewHistory(account.address.toString());
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error,
        });
        return [];
      }
    },
    enabled: !!account?.address,
  });

  const { data: allInterviewQuestions } = useQuery({
    queryKey: ["all-interview-questions"],
    refetchInterval: 10_000,
    queryFn: async () => {
      try {
        return await getAllInterviewQuestions();
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error,
        });
        return [];
      }
    },
  });

  // State for company descriptions
  const [companyDescriptionsState] = useState<Record<string, string>>(companyDescriptions);

  // Dynamically extract companies from questions
  const companies = useMemo(() => {
    if (!allInterviewQuestions || allInterviewQuestions.length === 0) return [];
    const unique = Array.from(
      new Set(allInterviewQuestions.map((q: InterviewQuestion) => q.company_name))
    );
    return unique.map((name, idx) => {
      // Try to get a domain from the company name (simple heuristic)
      const domain = name.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
      const logo = `https://logo.clearbit.com/${domain}`;
      // Get description from our shared descriptions
      const description = companyDescriptionsState[name] || "No description available.";
      return {
        name,
        banner: PLACEHOLDER_BANNERS[idx % PLACEHOLDER_BANNERS.length],
        profile: logo,
        description,
        stats: {
          reviews: Math.floor(Math.random() * 100) + "K",
          jobs: Math.floor(Math.random() * 10) + "K",
          salaries: Math.floor(Math.random() * 200) + "K",
          interviews: Math.floor(Math.random() * 30) + "K",
        },
      };
    });
  }, [allInterviewQuestions, companyDescriptionsState]);

  // Set default selected company when companies list changes
  useEffect(() => {
    if (companies.length > 0 && (!selectedCompany || !companies.find(c => c.name === selectedCompany.name))) {
      setSelectedCompany(companies[0]);
      setActiveTab("overview");
    }
  }, [companies]);

  const onClickEarnBBTButton = async () => {
    if (!account || !companyName || !interviewQuestion) {
      return;
    }
    try {
      const committedTransaction = await signAndSubmitTransaction(
        earnBBT({ companyName, interviewQuestion })
      );
      const executedTransaction = await aptosClient().waitForTransaction({
        transactionHash: committedTransaction.hash,
      });
      queryClient.invalidateQueries({
        queryKey: ["interview-history", "all-interview-questions"],
      });
      toast({
        title: "Success",
        description: `Earned 1 BBT! Transaction hash: ${executedTransaction.hash}`,
      });
      setCompanyName("");
      setInterviewQuestion("");
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to earn BBT",
      });
    }
  };

  const groupQuestionsByCompany = (questions: InterviewQuestion[]) => {
    return questions.reduce((acc, question) => {
      const company = question.company_name;
      if (!acc[company]) {
        acc[company] = [];
      }
      acc[company].push(question);
      return acc;
    }, {} as Record<string, InterviewQuestion[]>);
  };

  // Only show questions for the selected company
  const companyQuestions = allInterviewQuestions && selectedCompany
    ? groupQuestionsByCompany(allInterviewQuestions)[selectedCompany.name] || []
    : [];

  // Helper to get a deterministic profile pic for a user address
  function getUserProfilePic(address: string) {
    if (!address) return PLACEHOLDER_USER_PROFILES[0];
    const idx =
      address
        .split("")
        .map((c) => c.charCodeAt(0))
        .reduce((a, b) => a + b, 0) % PLACEHOLDER_USER_PROFILES.length;
    return PLACEHOLDER_USER_PROFILES[idx];
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden mt-8">
      {/* Company Selector */}
      <div className="flex gap-6 px-8 pt-8 pb-4 overflow-x-auto border-b bg-gray-50 items-center">
        {companies.map((company) => (
          <button
            key={company.name}
            className={`flex flex-col items-center min-w-[100px] w-[100px] focus:outline-none ${selectedCompany && selectedCompany.name === company.name ? "font-bold text-blue-600" : "text-gray-600"}`}
            onClick={() => {
              setSelectedCompany(company);
              setActiveTab("overview");
            }}
          >
            <img src={company.profile} alt={company.name} className={`w-12 h-12 rounded-full border-2 ${selectedCompany && selectedCompany.name === company.name ? "border-blue-600" : "border-gray-300"}`} />
            <span className="mt-2 text-sm">{company.name}</span>
          </button>
        ))}
        {/* + Button */}
        <button
          className="flex flex-col items-center min-w-[100px] w-[100px] focus:outline-none justify-center"
          onClick={() => setShowAddCompany(true)}
          title="Add new company"
        >
          <span className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-dashed border-gray-300 text-3xl text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition">+</span>
          <span className="mt-2 text-sm text-gray-500">Add Other</span>
        </button>
      </div>
      {/* Add Company Dialog */}
      <Dialog open={showAddCompany} onOpenChange={setShowAddCompany}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Interview Question for a New Company</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <Input
              placeholder="Company Name"
              value={newCompanyName}
              onChange={e => setNewCompanyName(e.target.value)}
              className="max-w-md"
            />
            <Input
              placeholder="Interview Question"
              value={newCompanyQuestion}
              onChange={e => setNewCompanyQuestion(e.target.value)}
              className="max-w-md"
            />
            <Button
              disabled={!account || !newCompanyName || !newCompanyQuestion}
              onClick={async () => {
                // Call earnBBT directly with newCompanyName and newCompanyQuestion
                if (!account || !newCompanyName || !newCompanyQuestion) return;
                try {
                  const committedTransaction = await signAndSubmitTransaction(
                    earnBBT({ companyName: newCompanyName, interviewQuestion: newCompanyQuestion })
                  );
                  const executedTransaction = await aptosClient().waitForTransaction({
                    transactionHash: committedTransaction.hash,
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["interview-history", "all-interview-questions"],
                  });
                  toast({
                    title: "Success",
                    description: `Earned 1 BBT! Transaction hash: ${executedTransaction.hash}`,
                  });
                  setShowAddCompany(false);
                  setNewCompanyName("");
                  setNewCompanyQuestion("");
                } catch (error) {
                  console.error(error);
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to earn BBT",
                  });
                }
              }}
              className="max-w-md bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Earn 1 BBT
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Banner */}
      {selectedCompany && (
        <>
          <div className="relative h-48 bg-gray-200">
            <img src={selectedCompany.banner} alt="Company Banner" className="object-cover w-full h-full" />
            {/* Profile Pic */}
            <div className="absolute left-8 -bottom-12">
              <img
                src={selectedCompany.profile}
                alt="Company Logo"
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
              />
            </div>
          </div>
          {/* Company Info */}
          <div className="pt-16 px-8 pb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">{selectedCompany.name}</h2>
              <Badge variant="outline" className="text-sm">
                {account ? "Connected" : "Not Connected"}
              </Badge>
            </div>
            <p className="text-gray-500">{selectedCompany.description}</p>
          </div>
          {/* Tabs */}
          <div className="border-b px-8">
            <nav className="flex gap-8">
              <button className={`py-2 ${activeTab === "overview" ? "font-bold border-b-2 border-blue-600" : "text-gray-500"}`} onClick={() => setActiveTab("overview")}>Overview</button>
              <button className={`py-2 ${activeTab === "questions" ? "font-bold border-b-2 border-blue-600" : "text-gray-500"}`} onClick={() => setActiveTab("questions")}>Interview Questions</button>
              <button className={`py-2 ${activeTab === "add" ? "font-bold border-b-2 border-blue-600" : "text-gray-500"}`} onClick={() => setActiveTab("add")}>Add Your Interview Question</button>
              <button className={`py-2 ${activeTab === "reviews" ? "font-bold border-b-2 border-blue-600" : "text-gray-500"}`} onClick={() => setActiveTab("reviews")}>Reviews</button>
              <button className={`py-2 ${activeTab === "jobs" ? "font-bold border-b-2 border-blue-600" : "text-gray-500"}`} onClick={() => setActiveTab("jobs")}>Jobs</button>
              <button className={`py-2 ${activeTab === "salaries" ? "font-bold border-b-2 border-blue-600" : "text-gray-500"}`} onClick={() => setActiveTab("salaries")}>Salaries</button>
              <button className={`py-2 ${activeTab === "benefits" ? "font-bold border-b-2 border-blue-600" : "text-gray-500"}`} onClick={() => setActiveTab("benefits")}>Benefits</button>
              <button className={`py-2 ${activeTab === "photos" ? "font-bold border-b-2 border-blue-600" : "text-gray-500"}`} onClick={() => setActiveTab("photos")}>Photos</button>
            </nav>
          </div>
          {/* Tab Content */}
          <div className="p-8">
            {activeTab === "overview" && (
              <div>
                <div className="mb-2 text-gray-600">{selectedCompany.description}</div>
                <div className="flex gap-8 text-sm text-gray-600">
                  <div><span className="font-bold">{selectedCompany.stats.reviews}</span> Reviews</div>
                  <div><span className="font-bold">{selectedCompany.stats.jobs}</span> Jobs</div>
                  <div><span className="font-bold">{selectedCompany.stats.salaries}</span> Salaries</div>
                  <div><span className="font-bold">{selectedCompany.stats.interviews}</span> Interviews</div>
                </div>
              </div>
            )}
            {activeTab === "questions" && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">Interview Questions for {selectedCompany.name}</h2>
                <ScrollArea className="h-[400px] rounded-md p-4">
                  <div className="grid gap-6">
                    {companyQuestions.length > 0 ? (
                      companyQuestions.map((interview, index) => {
                        const voteKey = interview.interview_question + interview.user_address;
                        const vote = voteState[voteKey] || 0;
                        return (
                          <Card key={index} className="shadow-md hover:shadow-lg transition-shadow">
                            <div className="flex gap-4 p-4 items-start">
                              {/* Profile pic and address */}
                              <div className="flex flex-col items-center min-w-[60px]">
                                <img
                                  src={getUserProfilePic(interview.user_address)}
                                  alt="User"
                                  className="w-10 h-10 rounded-full border mb-2"
                                />
                                <span className="text-xs text-muted-foreground break-all">
                                  {interview.user_address.slice(0, 6)}...{interview.user_address.slice(-4)}
                                </span>
                              </div>
                              {/* Question and actions */}
                              <div className="flex-1">
                                <div className="flex justify-between items-center">
                                  <p className="text-base font-medium mb-1">{interview.interview_question}</p>
                                  <div className="flex items-center gap-2">
                                    <button
                                      className="p-1 rounded hover:bg-accent"
                                      onClick={() => {
                                        navigator.clipboard.writeText(window.location.href + "#" + interview.interview_question);
                                        toast({ title: "Link copied!" });
                                      }}
                                      title="Share"
                                    >
                                      <Share2 className="w-4 h-4 text-gray-500" />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 mt-2">
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(Number(interview.timestamp) * 1000).toLocaleString()}
                                  </span>
                                  <div className="flex items-center gap-1 ml-auto">
                                    <button
                                      className={`p-1 rounded-full hover:bg-blue-100 ${vote === 1 ? "text-blue-600" : "text-gray-400"}`}
                                      onClick={() => setVoteState((prev) => ({ ...prev, [voteKey]: vote === 1 ? 0 : 1 }))}
                                      title="Upvote"
                                    >
                                      <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <span className="text-xs font-semibold w-4 text-center">{vote === 1 ? 1 : vote === -1 ? -1 : 0}</span>
                                    <button
                                      className={`p-1 rounded-full hover:bg-red-100 ${vote === -1 ? "text-red-600" : "text-gray-400"}`}
                                      onClick={() => setVoteState((prev) => ({ ...prev, [voteKey]: vote === -1 ? 0 : -1 }))}
                                      title="Downvote"
                                    >
                                      <ArrowDown className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })
                    ) : (
                      <div className="text-gray-500">No interview questions found for {selectedCompany.name}.</div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
            {activeTab === "add" && (
              <>
                <Card className="shadow-lg max-w-xl mx-auto">
                  <CardHeader>
                    <CardTitle className="text-xl">Submit New Question for {selectedCompany.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      {/* Upload Interview Email Proof - Drag and Drop UI */}
                      <div>
                        <label className="block font-medium mb-1">Upload Interview Email (Proof)</label>
                        <div
                          className="flex flex-col items-center justify-center border-2 border-dashed border-gray-400 rounded-lg p-6 cursor-pointer bg-gray-50 hover:bg-gray-100 transition min-h-[120px]"
                          onClick={() => interviewEmailFileInputRef.current?.click()}
                          onDrop={handleInterviewEmailDrop}
                          onDragOver={e => e.preventDefault()}
                        >
                          {interviewEmailPreview ? (
                            <img src={interviewEmailPreview} alt="Preview" className="max-h-32 rounded border" />
                          ) : (
                            <span className="text-gray-500">Click or drag image here to upload your interview email proof</span>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            ref={interviewEmailFileInputRef}
                            onChange={handleInterviewEmailFileChange}
                            className="hidden"
                          />
                        </div>
                        {/* Verify Interview Button */}
                        {interviewEmailPreview && (
                          <div className="mt-2 flex flex-col gap-2">
                            <button
                              className={`px-4 py-2 rounded bg-blue-600 text-white font-semibold ${verifying ? 'opacity-60 cursor-not-allowed' : ''}`}
                              disabled={verifying || verified}
                              onClick={async (e) => {
                                e.preventDefault();
                                setVerifying(true);
                                setVerifyError(null);
                                setVerifyResponse(null);
                                setVerified(false);
                                try {
                                  const prompt = `Is this an interview email from ${companyName}? Return Yes or No and provide a brief explanation.`;
                                  const res = await fetch(`${API_BASE_URL}/api/verify-interview-email`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      prompt,
                                      imageBase64: interviewEmailPreview,
                                    }),
                                  });
                                  const data = await res.json();
                                  setVerifyResponse(data.response);
                                  if (data.verified) {
                                    setVerified(true);
                                  } else {
                                    setVerifyError(data.response || 'Verification failed.');
                                  }
                                } catch (err) {
                                  setVerifyError('Verification failed. Please try again.');
                                } finally {
                                  setVerifying(false);
                                }
                              }}
                            >
                              {verifying ? 'Verifying...' : verified ? 'Verified!' : 'Verify Interview'}
                            </button>
                            {verifyResponse && (
                              <div className={`text-sm ${verified ? 'text-green-600' : 'text-gray-600'}`}>{verifyResponse}</div>
                            )}
                            {verifyError && (
                              <div className="text-sm text-red-600">{verifyError}</div>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Only show the interview question input and Earn 1 BBT after verification */}
                      {verified && (
                        <>
                          <Input 
                            disabled={!account} 
                            placeholder="Interview Question" 
                            value={interviewQuestion}
                            onChange={(e) => setInterviewQuestion(e.target.value)} 
                            className="max-w-md"
                          />
                          <Button
                            disabled={!account || !interviewQuestion || !verified}
                            onClick={() => {
                              setCompanyName(selectedCompany.name);
                              onClickEarnBBTButton();
                            }}
                            className="max-w-md bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          >
                            Earn 1 BBT
                          </Button>
                        </>
                      )}
                      {!verified && (
                        <div className="text-sm text-gray-500">Verify interview first to earn BBT.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                {/* Recent Submissions for this company only */}
                {interviewHistory && interviewHistory.length > 0 && (
                  <div className="px-8 pb-8 mt-8">
                    <h2 className="text-2xl font-semibold mb-2">Your Recent Submissions for {selectedCompany.name}</h2>
                    <div className="grid gap-4">
                      {interviewHistory.filter((interview) => interview.company_name === selectedCompany.name).length > 0 ? (
                        interviewHistory
                          .filter((interview) => interview.company_name === selectedCompany.name)
                          .map((interview, index) => (
                            <Card key={index} className="shadow-md">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium">{interview.company_name}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{interview.interview_question}</p>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {new Date(Number(interview.timestamp) * 1000).toLocaleString()}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                      ) : (
                        <div className="text-gray-500">No recent submissions for {selectedCompany.name}.</div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            {activeTab === "reviews" && (
              <div className="space-y-6">
                {/* Add Review Form Collapsible */}
                <details className="max-w-2xl mx-auto mb-6">
                  <summary className="cursor-pointer font-semibold text-lg px-6 py-4 bg-gray-100 rounded-t">Add your Review</summary>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-2">
                        <input className="border rounded px-3 py-2" placeholder="Job Title" />
                        <input className="border rounded px-3 py-2" placeholder="Location" />
                        <select className="border rounded px-3 py-2">
                          <option>Rating</option>
                          <option>5 - Excellent</option>
                          <option>4 - Good</option>
                          <option>3 - Average</option>
                          <option>2 - Poor</option>
                          <option>1 - Terrible</option>
                        </select>
                        <input className="border rounded px-3 py-2" placeholder="Review Title" />
                        <textarea className="border rounded px-3 py-2" placeholder="Pros" />
                        <textarea className="border rounded px-3 py-2" placeholder="Cons" />
                        <button className="mt-2 bg-blue-600 text-white px-4 py-2 rounded cursor-not-allowed opacity-60" disabled>Submit</button>
                      </div>
                    </CardContent>
                  </Card>
                </details>
                {/* Review Card 1 */}
                <Card className="max-w-2xl mx-auto">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl font-bold">5.0</span>
                      <span className="text-yellow-400">★★★★★</span>
                      <span className="ml-auto text-gray-400 text-sm">May 1, 2025</span>
                    </div>
                    <div className="font-semibold text-lg mb-1">Awesome place to work</div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                      <span>Software engineer</span>
                      <span>•</span>
                      <span>Current employee, more than 1 year</span>
                      <span>•</span>
                      <span>Waterloo, ON</span>
                    </div>
                    <div className="flex gap-4 mb-2 text-green-700 text-xs">
                      <span>✔️ Recommend</span>
                      <span>✔️ CEO approval</span>
                    </div>
                    <div className="mb-1">
                      <span className="font-semibold text-green-700">Pros</span>: Good benefits, health insurance, good salary, stock options, and all the famous perks.
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold text-red-700">Cons</span>: There are restrictions in terms of your publications and participation in hackathons.
                    </div>
                    <div className="flex gap-4 text-xs text-gray-400">
                      <span>Helpful</span>
                      <span>Share</span>
                    </div>
                  </CardContent>
                </Card>
                {/* Review Card 2 */}
                <Card className="max-w-2xl mx-auto">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl font-bold">4.0</span>
                      <span className="text-yellow-400">★★★★☆</span>
                      <span className="ml-auto text-gray-400 text-sm">Feb 14, 2025</span>
                    </div>
                    <div className="font-semibold text-lg mb-1">Overall positive, with the major caveat I was laid off!</div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                      <span>Software engineer (swe ii)</span>
                      <span>•</span>
                      <span>Former employee, more than 1 year</span>
                      <span>•</span>
                      <span>Kitchener, ON</span>
                    </div>
                    <div className="flex gap-4 mb-2 text-green-700 text-xs">
                      <span>✔️ Recommend</span>
                    </div>
                    <div className="mb-1">
                      <span className="font-semibold text-green-700">Pros</span>: Great team, interesting projects, flexible hours.
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold text-red-700">Cons</span>: Layoffs can happen suddenly.
                    </div>
                    <div className="flex gap-4 text-xs text-gray-400">
                      <span>Helpful</span>
                      <span>Share</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            {activeTab === "jobs" && (
              <div className="space-y-4 max-w-2xl mx-auto">
                {/* Add Job Form Collapsible */}
                <details className="mb-6">
                  <summary className="cursor-pointer font-semibold text-lg px-6 py-4 bg-gray-100 rounded-t">Add a Job Posting</summary>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-2">
                        <input className="border rounded px-3 py-2" placeholder="Job Title" />
                        <input className="border rounded px-3 py-2" placeholder="Location" />
                        <input className="border rounded px-3 py-2" placeholder="Salary or Pay (optional)" />
                        <input className="border rounded px-3 py-2" placeholder="Job Description" />
                        <button className="mt-2 bg-blue-600 text-white px-4 py-2 rounded cursor-not-allowed opacity-60" disabled>Submit</button>
                      </div>
                    </CardContent>
                  </Card>
                </details>
                <div className="flex flex-col gap-2">
                  <div className="font-semibold text-lg">Customer and Partner Solutions Developer, Conversational Agents</div>
                  <div className="flex items-center text-gray-500 text-sm gap-2">
                    <span>Waterloo</span>
                    <span>•</span>
                    <span>6d</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="font-semibold text-lg">construction electrician helper</div>
                  <div className="flex items-center text-gray-500 text-sm gap-2">
                    <span>Saskatoon</span>
                    <span>•</span>
                    <span>$32.50 Per hour [Employer Est.]</span>
                    <span>•</span>
                    <span>30d+</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="font-semibold text-lg">Software Developer III, Google Workspace</div>
                  <div className="flex items-center text-gray-500 text-sm gap-2">
                    <span>Waterloo</span>
                    <span>•</span>
                    <span>6d</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="font-semibold text-lg">Senior Account Manager, Large Customer Sales</div>
                  <div className="flex items-center text-gray-500 text-sm gap-2">
                    <span>Toronto</span>
                    <span>•</span>
                    <span>6d</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="font-semibold text-lg">Senior Software Developer, Machine Learning, Google Ads</div>
                  <div className="flex items-center text-gray-500 text-sm gap-2">
                    <span>Toronto</span>
                    <span>•</span>
                    <span>24h</span>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "salaries" && (
              <div className="max-w-2xl mx-auto">
                {/* Add Salary Form Collapsible */}
                <details className="mb-6">
                  <summary className="cursor-pointer font-semibold text-lg px-6 py-4 bg-gray-100 rounded-t">Add your Salary</summary>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-2">
                        <input className="border rounded px-3 py-2" placeholder="Job Title" />
                        <input className="border rounded px-3 py-2" placeholder="Location" />
                        <input className="border rounded px-3 py-2" placeholder="Base Pay (e.g. $120,000)" />
                        <input className="border rounded px-3 py-2" placeholder="Years of Experience" />
                        <button className="mt-2 bg-blue-600 text-white px-4 py-2 rounded cursor-not-allowed opacity-60" disabled>Submit</button>
                      </div>
                    </CardContent>
                  </Card>
                </details>
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-semibold">1184 job titles</span>
                  <span className="ml-auto text-sm text-gray-500">Sort by <span className="font-bold">most salaries submitted</span></span>
                </div>
                <div className="divide-y">
                  <div className="py-4 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Software Engineer</span>
                      <span className="text-green-700 font-bold">$110K - $150K/yr</span>
                    </div>
                    <div className="text-sm text-gray-500">688 salaries submitted • 43 open jobs</div>
                    <div className="text-xs text-green-700">base pay</div>
                  </div>
                  <div className="py-4 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Software Developer</span>
                      <span className="text-green-700 font-bold">$100K - $135K/yr</span>
                    </div>
                    <div className="text-sm text-gray-500">192 salaries submitted • 43 open jobs</div>
                    <div className="text-xs text-green-700">base pay</div>
                  </div>
                  <div className="py-4 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Senior Software Engineer</span>
                      <span className="text-green-700 font-bold">$135K - $180K/yr</span>
                    </div>
                    <div className="text-sm text-gray-500">88 salaries submitted • 43 open jobs</div>
                    <div className="text-xs text-green-700">base pay</div>
                  </div>
                  <div className="py-4 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Software Engineer</span>
                      <span className="text-green-700 font-bold">$66K - $84K/yr</span>
                    </div>
                    <div className="text-sm text-gray-500">68 salaries submitted • 43 open jobs</div>
                    <div className="text-xs text-green-700">base pay</div>
                  </div>
                  <div className="py-4 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Account Manager</span>
                      <span className="text-green-700 font-bold">$73K - $100K/yr</span>
                    </div>
                    <div className="text-sm text-gray-500">42 salaries submitted • 13 open jobs</div>
                    <div className="text-xs text-green-700">base pay</div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "benefits" && (
              <div className="max-w-2xl mx-auto">
                {/* Add Benefits Form Collapsible */}
                <details className="mb-6">
                  <summary className="cursor-pointer font-semibold text-lg px-6 py-4 bg-gray-100 rounded-t">Add a Benefit</summary>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-2">
                        <input className="border rounded px-3 py-2" placeholder="Benefit Category (e.g. Health, Vacation)" />
                        <input className="border rounded px-3 py-2" placeholder="Benefit Description" />
                        <button className="mt-2 bg-blue-600 text-white px-4 py-2 rounded cursor-not-allowed opacity-60" disabled>Submit</button>
                      </div>
                    </CardContent>
                  </Card>
                </details>
                <div className="mb-4">
                  <div className="font-semibold text-lg mb-1">Reported benefits</div>
                  <div className="text-gray-500 text-sm mb-2">The following list contains benefits that have been reported by current and former employees or have been verified by the company. This list may not be complete.</div>
                </div>
                <div className="divide-y">
                  <details className="py-3">
                    <summary className="font-semibold cursor-pointer">Insurance, Health & Wellness</summary>
                    <ul className="ml-4 mt-2 list-disc text-sm text-gray-700">
                      <li>Health insurance</li>
                      <li>Dental insurance</li>
                      <li>Vision insurance</li>
                    </ul>
                  </details>
                  <details className="py-3">
                    <summary className="font-semibold cursor-pointer">Financial & Retirement</summary>
                    <ul className="ml-4 mt-2 list-disc text-sm text-gray-700">
                      <li>401(k) plan</li>
                      <li>Stock options</li>
                    </ul>
                  </details>
                  <details className="py-3">
                    <summary className="font-semibold cursor-pointer">Family & Parenting</summary>
                    <ul className="ml-4 mt-2 list-disc text-sm text-gray-700">
                      <li>Paid parental leave</li>
                      <li>Adoption assistance</li>
                    </ul>
                  </details>
                  <details className="py-3">
                    <summary className="font-semibold cursor-pointer">Vacation & Time Off</summary>
                    <ul className="ml-4 mt-2 list-disc text-sm text-gray-700">
                      <li>Paid time off</li>
                      <li>Paid holidays</li>
                    </ul>
                  </details>
                  <details className="py-3">
                    <summary className="font-semibold cursor-pointer">Perks & Benefits</summary>
                    <ul className="ml-4 mt-2 list-disc text-sm text-gray-700">
                      <li>Free snacks and drinks</li>
                      <li>On-site gym</li>
                    </ul>
                  </details>
                  <details className="py-3">
                    <summary className="font-semibold cursor-pointer">Professional Support</summary>
                    <ul className="ml-4 mt-2 list-disc text-sm text-gray-700">
                      <li>Tuition reimbursement</li>
                      <li>Mentorship programs</li>
                    </ul>
                  </details>
                </div>
              </div>
            )}
            {activeTab === "photos" && (
              <div className="max-w-3xl mx-auto">
                {/* Add Photo Form Collapsible */}
                <details className="mb-6">
                  <summary className="cursor-pointer font-semibold text-lg px-6 py-4 bg-gray-100 rounded-t">Add an Office Photo</summary>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-2">
                        <input className="border rounded px-3 py-2" placeholder="Photo URL" />
                        <input className="border rounded px-3 py-2" placeholder="Caption (optional)" />
                        <button className="mt-2 bg-blue-600 text-white px-4 py-2 rounded cursor-not-allowed opacity-60" disabled>Submit</button>
                      </div>
                    </CardContent>
                  </Card>
                </details>
                <div className="font-semibold text-lg mb-4">Office Photos</div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg overflow-hidden"><img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80" alt="Office 1" className="object-cover w-full h-32" /></div>
                  <div className="rounded-lg overflow-hidden"><img src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=400&q=80" alt="Office 2" className="object-cover w-full h-32" /></div>
                  <div className="rounded-lg overflow-hidden"><img src="https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80" alt="Office 3" className="object-cover w-full h-32" /></div>
                  <div className="rounded-lg overflow-hidden"><img src="https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=400&q=80" alt="Office 4" className="object-cover w-full h-32" /></div>
                  <div className="rounded-lg overflow-hidden"><img src="https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?auto=format&fit=crop&w=400&q=80" alt="Office 5" className="object-cover w-full h-32" /></div>
                  <div className="rounded-lg overflow-hidden"><img src="https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80" alt="Office 6" className="object-cover w-full h-32" /></div>
                </div>
                <div className="mt-2 text-right text-blue-600 cursor-pointer">Add photos &rarr;</div>
              </div>
            )}
            {activeTab === "diversity" && (
              <div className="max-w-2xl mx-auto flex flex-col items-center justify-center h-48 text-gray-500">
                {/* Add Diversity Story Form Collapsible */}
                <details className="mb-6">
                  <summary className="cursor-pointer font-semibold text-lg px-6 py-4 bg-gray-100 rounded-t">Share a Diversity Story</summary>
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-2">
                        <input className="border rounded px-3 py-2" placeholder="Title" />
                        <textarea className="border rounded px-3 py-2" placeholder="Your Story" />
                        <button className="mt-2 bg-blue-600 text-white px-4 py-2 rounded cursor-not-allowed opacity-60" disabled>Submit</button>
                      </div>
                    </CardContent>
                  </Card>
                </details>
                <span className="text-2xl font-semibold mb-2">Diversity & Inclusion</span>
                <span className="mb-2">We're working on surfacing real stories and stats about diversity, equity, and inclusion at this company.</span>
                <span className="italic text-blue-600">Coming Soon!</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
