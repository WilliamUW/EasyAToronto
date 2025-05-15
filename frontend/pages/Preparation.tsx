import { AnimatePresence, motion } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useMemo, useState } from "react";

import { API_BASE_URL } from '../config';
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { TransferAPT } from "@/components/TransferAPT";
import { cn } from "@/lib/utils";
import { companyDescriptions } from "@/lib/companyDescriptions";
import { getAllInterviewQuestions } from "@/view-functions/getAllInterviewQuestions";
import { toast } from "sonner";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

interface InterviewData {
  user_address: string;
  company_name: string;
  interview_question: string;
  timestamp: string;
}

interface QAPair {
  question: string;
  answer: string;
  feedback?: string;
  isRegenerating?: boolean;
}

const FREE_TIER_LIMIT = 50;
const PREMIUM_RECIPIENT = "0x1";
const PREMIUM_AMOUNT = 0.01;

export default function Preparation() {
  const [personalInfo, setPersonalInfo] = useState("");
  const [companyInfo, setCompanyInfo] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedAnswer, setGeneratedAnswer] = useState<{ questions: QAPair[] } | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewData[]>([]);
  const [feedbackOpen, setFeedbackOpen] = useState<{ [key: number]: boolean }>({});
  const [customQuestion, setCustomQuestion] = useState("");
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { account } = useWallet();

  // Get unique companies from questions
  const companies = useMemo(() => {
    const uniqueCompanies = Array.from(new Set(interviewQuestions.map(q => q.company_name)));
    return uniqueCompanies.map(name => ({
      value: name.toLowerCase().replace(/[^a-z0-9]/g, ""),
      label: name,
      logo: `https://logo.clearbit.com/${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`
    }));
  }, [interviewQuestions]);
  
  const selectedCompanyData = companies.find(c => c.label === selectedCompany);
  
  useEffect(() => {
    const fetchInterviewQuestions = async () => {
      try {
        const questions = await getAllInterviewQuestions();
        console.log('Fetched questions:', questions);
        setInterviewQuestions(questions);
      } catch (error) {
        console.error('Error fetching interview questions:', error);
      }
    };

    fetchInterviewQuestions();
  }, []);
  
  const filteredQuestions = interviewQuestions.filter(
    q => q.company_name.toLowerCase() === selectedCompany.toLowerCase()
  );
  
  console.log('Selected company:', selectedCompany);
  console.log('All questions:', interviewQuestions);
  console.log('Filtered questions:', filteredQuestions);
  
  const handleGenerateAnswers = async () => {
    setLoading(true);
    setGeneratedAnswer(null);
    try {
      const prompt = `Personal Info: ${personalInfo}\nCompany Info: ${companyInfo}\nCompany: ${selectedCompany}\nGenerate interview questions and answers based on this information. Return ONLY a raw JSON object in the following format, without any markdown formatting or code blocks:
{
  "questions": [
    {
      "question": "Question text here",
      "answer": "Answer text here"
    }
  ]
}`;
      const response = await fetch(`${API_BASE_URL}/api/generate-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      // Remove markdown code block formatting if present and extract only the JSON object
      const cleanAnswer = data.answer
        .replace(/^```json\n?/, '')  // Remove opening ```json
        .replace(/```.*$/, '')       // Remove closing ``` and anything after it
        .trim();                     // Remove any extra whitespace
      
      // Find the first { and last } to extract just the JSON object
      const firstBrace = cleanAnswer.indexOf('{');
      const lastBrace = cleanAnswer.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error('Invalid JSON response format');
      }
      const jsonString = cleanAnswer.slice(firstBrace, lastBrace + 1);
      
      const parsedAnswer = JSON.parse(jsonString);
      setGeneratedAnswer(parsedAnswer);
    } catch (error) {
      console.error('Error generating answers:', error);
      setGeneratedAnswer(null);
    }
    setLoading(false);
  };
  
  const handleRegenerateAnswer = async (index: number) => {
    if (!generatedAnswer) return;
    
    const qa = generatedAnswer.questions[index];
    const newGeneratedAnswer = { ...generatedAnswer };
    newGeneratedAnswer.questions[index] = { ...qa, isRegenerating: true };
    setGeneratedAnswer(newGeneratedAnswer);

    try {
      const prompt = `Personal Info: ${personalInfo}\nCompany Info: ${companyInfo}\nCompany: ${selectedCompany}\nQuestion: ${qa.question}\nPrevious Answer: ${qa.answer}\nFeedback: ${qa.feedback}\nGenerate a new answer for this question. Return ONLY a raw JSON object in the following format, without any markdown formatting or code blocks:
{
  "questions": [
    {
      "question": "${qa.question}",
      "answer": "New answer text here"
    }
  ]
}`;

      const response = await fetch(`${API_BASE_URL}/api/generate-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.answer) {
        throw new Error('No answer received from API');
      }

      const cleanAnswer = data.answer
        .replace(/^```json\n?/, '')
        .replace(/```.*$/, '')
        .trim();
      
      const firstBrace = cleanAnswer.indexOf('{');
      const lastBrace = cleanAnswer.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error('Invalid JSON response format');
      }
      const jsonString = cleanAnswer.slice(firstBrace, lastBrace + 1);
      
      const parsedAnswer = JSON.parse(jsonString);
      if (!parsedAnswer.questions?.[0]?.answer) {
        throw new Error('Invalid answer format in response');
      }

      const newAnswer = parsedAnswer.questions[0].answer;
      
      setGeneratedAnswer(prev => {
        if (!prev) return null;
        const updatedQuestions = [...prev.questions];
        updatedQuestions[index] = {
          ...qa,
          answer: newAnswer,
          isRegenerating: false
        };
        return { ...prev, questions: updatedQuestions };
      });
    } catch (error) {
      console.error('Error regenerating answer:', error);
      setGeneratedAnswer(prev => {
        if (!prev) return null;
        const updatedQuestions = [...prev.questions];
        updatedQuestions[index] = {
          ...qa,
          isRegenerating: false
        };
        return { ...prev, questions: updatedQuestions };
      });
    }
  };

  const handleFeedbackChange = (index: number, feedback: string) => {
    if (!generatedAnswer) return;
    const newGeneratedAnswer = { ...generatedAnswer };
    newGeneratedAnswer.questions[index] = {
      ...newGeneratedAnswer.questions[index],
      feedback
    };
    setGeneratedAnswer(newGeneratedAnswer);
  };

  const handleGenerateCustomAnswer = async () => {
    if (!customQuestion.trim() || !selectedCompany) return;
    
    setIsGeneratingCustom(true);
    try {
      const prompt = `Personal Info: ${personalInfo}\nCompany Info: ${companyInfo}\nCompany: ${selectedCompany}\nQuestion: ${customQuestion}\nGenerate an answer for this question. Return ONLY a raw JSON object in the following format, without any markdown formatting or code blocks:
{
  "questions": [
    {
      "question": "${customQuestion}",
      "answer": "Answer text here"
    }
  ]
}`;

      const response = await fetch(`${API_BASE_URL}/api/generate-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.answer) {
        throw new Error('No answer received from API');
      }

      const cleanAnswer = data.answer
        .replace(/^```json\n?/, '')
        .replace(/```.*$/, '')
        .trim();
      
      const firstBrace = cleanAnswer.indexOf('{');
      const lastBrace = cleanAnswer.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error('Invalid JSON response format');
      }
      const jsonString = cleanAnswer.slice(firstBrace, lastBrace + 1);
      
      const parsedAnswer = JSON.parse(jsonString);
      if (!parsedAnswer.questions?.[0]?.answer) {
        throw new Error('Invalid answer format in response');
      }

      const newQAPair = parsedAnswer.questions[0];
      
      setGeneratedAnswer(prev => {
        if (!prev) {
          return { questions: [newQAPair] };
        }
        return {
          questions: [...prev.questions, newQAPair]
        };
      });

      setCustomQuestion("");
    } catch (error) {
      console.error('Error generating custom answer:', error);
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  const handleUpgradeToPremium = () => {
    setShowUpgradeModal(true);
  };

  const handleUpgradeSuccess = () => {
    setIsPremium(true);
    setShowUpgradeModal(false);
    toast.success("Welcome to Behavioral Buddy Premium! 🎉");
  };

  const canGenerateMore = isPremium || !generatedAnswer || generatedAnswer.questions.length < FREE_TIER_LIMIT;

  return (
    <div className="container max-w-screen-lg mx-auto px-4 py-8">
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Interview Preparation</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {generatedAnswer?.questions.length || 0}{isPremium ? "/∞" : `/${FREE_TIER_LIMIT}`} Questions
            </span>
            {!isPremium && (
              <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${((generatedAnswer?.questions.length || 0) / FREE_TIER_LIMIT) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {!isPremium ? (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Get Behavioral Buddy Premium</h3>
                  <p className="text-sm opacity-90">Unlock unlimited question generations</p>
                </div>
                <Button
                  onClick={handleUpgradeToPremium}
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
                  Upgrade for 0.01 APT
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <div>
                    <h3 className="font-semibold text-lg">Premium Member</h3>
                    <p className="text-sm opacity-90">Thank you for supporting Behavioral Buddy!</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Unlimited Access</span>
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showUpgradeModal && (
        <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upgrade to Premium</DialogTitle>
              <DialogDescription>
                Transfer 0.01 APT to unlock unlimited questions and premium features.
              </DialogDescription>
            </DialogHeader>
            <TransferAPT 
              recipient={PREMIUM_RECIPIENT}
              amount={PREMIUM_AMOUNT}
              onSuccess={handleUpgradeSuccess}
            />
          </DialogContent>
        </Dialog>
      )}

      <div className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="personal-info" className="text-sm font-medium">
            Personal Information
          </label>
          <Textarea
            id="personal-info"
            placeholder="Copy and paste in your resume, linkedin, personal bio, etc."
            value={personalInfo}
            onChange={(e) => setPersonalInfo(e.target.value)}
            className="min-h-[200px]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="company-select">Select Company</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {companies.map((company) => (
              <button
                key={company.value}
                type="button"
                className={cn(
                  "flex items-center px-4 py-2 rounded-full border transition-colors",
                  selectedCompany === company.label ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-800 hover:bg-blue-100"
                )}
                onClick={() => setSelectedCompany(company.label)}
              >
                <img
                  src={company.logo}
                  alt={`${company.label} logo`}
                  className="w-7 h-7 rounded-full mr-2 object-contain bg-white"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${company.label}&background=random`;
                  }}
                />
                {company.label}
              </button>
            ))}
          </div>
          <input
            id="company-select"
            type="text"
            placeholder="Enter company name..."
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {selectedCompany && companyDescriptions[selectedCompany] && (
            <p className="text-sm text-gray-600 mt-2">
              {companyDescriptions[selectedCompany]}
            </p>
          )}
        </div>

        {selectedCompanyData && filteredQuestions.length > 0 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              <span className="font-medium">Common {selectedCompanyData.label} Interview Questions</span>
              <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen ? "transform rotate-180" : "")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 py-2 space-y-2">
              {filteredQuestions.map((question, index) => (
                <div key={index} className="p-3 bg-white border rounded-lg">
                  <p className="text-gray-700">{question.interview_question}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Added {new Date(parseInt(question.timestamp) * 1000).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="space-y-2">
          <label htmlFor="company-info" className="text-sm font-medium">
            Company Information
          </label>
          <Textarea
            id="company-info"
            placeholder="Copy and paste in company-specific information, job requirements, and interview context..."
            value={companyInfo}
            onChange={(e) => setCompanyInfo(e.target.value)}
            className="min-h-[200px]"
          />
        </div>

        <Button onClick={handleGenerateAnswers} className="w-full" disabled={loading}>
          {loading ? "Generating..." : "Generate Answers"}
        </Button>
        {loading && (
          <div className="w-full flex justify-center mt-4">
            <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></span>
            <span className="ml-2 text-blue-500">Generating answer...</span>
          </div>
        )}
        {generatedAnswer?.questions && !loading && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Generated Questions and Answers</h2>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {generatedAnswer.questions.length} {generatedAnswer.questions.length === 1 ? 'Question' : 'Questions'}
              </span>
            </div>
            {generatedAnswer.questions.map((qa, index) => (
              <div key={index} className="p-4 border rounded bg-gray-50">
                <h3 className="font-medium text-blue-600 mb-2">Q: {qa.question}</h3>
                <p className="text-gray-700">A: {qa.answer}</p>
                
                <Collapsible
                  open={feedbackOpen[index]}
                  onOpenChange={(open) => setFeedbackOpen({ ...feedbackOpen, [index]: open })}
                  className="mt-4"
                >
                  <CollapsibleTrigger className="flex items-center text-sm text-gray-500 hover:text-gray-700">
                    <ChevronDown className={cn("h-4 w-4 mr-1 transition-transform", feedbackOpen[index] ? "transform rotate-180" : "")} />
                    Provide Feedback
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    <Textarea
                      placeholder="Enter feedback for the AI (e.g., Focus more on xyz experience)"
                      value={qa.feedback || ""}
                      onChange={(e) => handleFeedbackChange(index, e.target.value)}
                      className="min-h-[100px]"
                    />
                    <Button
                      onClick={() => handleRegenerateAnswer(index)}
                      disabled={qa.isRegenerating}
                      className="w-full"
                    >
                      {qa.isRegenerating ? "Regenerating..." : "Regenerate Answer"}
                    </Button>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 border rounded-lg bg-gray-50">
          <h2 className="font-semibold mb-4">Ask a Custom Question</h2>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter your custom interview question..."
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              className="min-h-[100px]"
            />
            <Button
              onClick={handleGenerateCustomAnswer}
              disabled={isGeneratingCustom || !customQuestion.trim() || !selectedCompany}
              className="w-full"
            >
              {isGeneratingCustom ? "Generating Answer..." : "Generate Answer"}
            </Button>
            {!selectedCompany && (
              <p className="text-sm text-red-500">
                Please select a company first
              </p>
            )}
          </div>
        </div>

        {!canGenerateMore && !isPremium && (
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-2">You've reached the free tier limit of {FREE_TIER_LIMIT} questions</p>
            <Button
              onClick={handleUpgradeToPremium}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              Upgrade to Premium
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 