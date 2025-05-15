import { MODULE_ADDRESS } from "@/constants";
import { aptosClient } from "@/utils/aptosClient";

export type InterviewData = {
  user_address: string;
  company_name: string;
  interview_question: string;
  timestamp: string;
};

export const getInterviewHistory = async (userAddress: string): Promise<InterviewData[]> => {
  try {
    const response = await aptosClient().view<[InterviewData[]]>({
      payload: {
        function: `${MODULE_ADDRESS}::message_board::get_interview_history`,
        functionArguments: [userAddress],
      },
    });

    return response[0];
  } catch (error) {
    console.error("Error fetching interview history:", error);
    return [];
  }
}; 