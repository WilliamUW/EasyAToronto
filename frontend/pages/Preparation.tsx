import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useEffect, useMemo, useState } from "react";

import { API_BASE_URL } from '../config';
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { companyDescriptions } from "@/lib/companyDescriptions";
import { getAllInterviewQuestions } from "@/view-functions/getAllInterviewQuestions";

interface InterviewData {
  user_address: string;
  company_name: string;
  interview_question: string;
  timestamp: string;
}

export default function Preparation() {
  const [personalInfo, setPersonalInfo] = useState("");
  const [companyInfo, setCompanyInfo] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedAnswer, setGeneratedAnswer] = useState<{ questions: Array<{ question: string; answer: string }> } | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewData[]>([]);

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
  
  return (
    <div className="container max-w-screen-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Interview Preparation</h1>
      
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
            <h2 className="font-semibold mb-2">Generated Questions and Answers</h2>
            {generatedAnswer.questions.map((qa, index) => (
              <div key={index} className="p-4 border rounded bg-gray-50">
                <h3 className="font-medium text-blue-600 mb-2">Q: {qa.question}</h3>
                <p className="text-gray-700">A: {qa.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 