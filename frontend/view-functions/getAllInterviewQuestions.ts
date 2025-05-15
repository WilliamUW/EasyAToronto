import { aptosClient } from "@/utils/aptosClient";
import { MODULE_ADDRESS } from "@/constants";
import { type InterviewData } from "./getInterviewHistory";

export const getAllInterviewQuestions = async (): Promise<InterviewData[]> => {
  try {
    const response = await aptosClient().view<[InterviewData[]]>({
      payload: {
        function: `${MODULE_ADDRESS}::message_board::get_all_interview_questions`,
      },
    });

    return response[0];
  } catch (error) {
    console.error("Error fetching all interview questions:", error);
    return [];
  }
}; 