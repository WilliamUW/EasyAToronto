import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { MODULE_ADDRESS } from "@/constants";

export type EarnBBTArguments = {
  companyName: string;
  interviewQuestion: string;
};

export const earnBBT = (args: EarnBBTArguments): InputTransactionData => {
  const { companyName, interviewQuestion } = args;
  return {
    data: {
      function: `${MODULE_ADDRESS}::message_board::earnBBT`,
      functionArguments: [companyName, interviewQuestion],
    },
  };
}; 